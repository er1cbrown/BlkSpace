//! Sendme-inspired content tickets for BlkSpace.
//!
//! [n0-computer/sendme](https://github.com/n0-computer/sendme) is a CLI that spins up a temporary
//! iroh endpoint, imports a file/dir into iroh-blobs, and prints a `BlobTicket` for `sendme receive`.
//! That stack is **iroh 1.x + iroh-blobs 0.103**. Yard builds omit networking;
//! Full builds use the same generation of Iroh crates rather than vendoring the
//! sendme binary.
//!
//! BlkSpace therefore implements:
//! 1. **`blkspace1.` tickets** — portable content-addressed share strings with
//!    authenticated v2 metadata and a legacy unsigned v1 compatibility path.
//! 2. **Local / Iroh materialize** — receiver pulls from local blob_store or Iroh fs-store when present.
//! 3. **CLI bridge** — detect `sendme` on PATH and expose exact shell commands for true P2P hole-punch.
//!
//! Do not depend on the `sendme` crate (pulls iroh 1.0). Students use tickets in-app; operators install
//! `cargo install sendme` for campus LAN / relay P2P file drops.

use base64::Engine;
use bitcoin::secp256k1::{Message, Secp256k1, XOnlyPublicKey};
use nostr_sdk::prelude::{Keys, Signature};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::process::Command;

pub const TICKET_PREFIX: &str = "blkspace1.";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BlobSharePayload {
  pub v: u8,
  pub hash: String,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub cid: Option<String>,
  pub name: String,
  pub mime: String,
  pub size: i64,
  #[serde(default = "default_src")]
  pub src: String,
  #[serde(default)]
  pub issued_at: i64,
  #[serde(default)]
  pub expires_at: i64,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub issuer: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub signature: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub p2p_ticket: Option<String>,
}

pub fn sha256_hex(bytes: &[u8]) -> String {
  hex::encode(Sha256::digest(bytes))
}

#[derive(Serialize)]
struct BlobShareSigningMaterial<'a> {
  v: u8,
  hash: &'a str,
  cid: Option<&'a str>,
  name: &'a str,
  mime: &'a str,
  size: i64,
  src: &'a str,
  issued_at: i64,
  expires_at: i64,
  p2p_ticket: Option<&'a str>,
}

fn signing_message(payload: &BlobSharePayload) -> Result<Message, String> {
  let material = BlobShareSigningMaterial {
    v: payload.v,
    hash: &payload.hash,
    cid: payload.cid.as_deref(),
    name: &payload.name,
    mime: &payload.mime,
    size: payload.size,
    src: &payload.src,
    issued_at: payload.issued_at,
    expires_at: payload.expires_at,
    p2p_ticket: payload.p2p_ticket.as_deref(),
  };
  let encoded =
    serde_json::to_vec(&material).map_err(|e| format!("ticket signing material: {e}"))?;
  let digest = Sha256::digest(encoded);
  Message::from_digest_slice(&digest).map_err(|e| format!("ticket signing message: {e}"))
}

/// Stamp issuer + expiry and attach a real Schnorr signature over every
/// security-relevant ticket field. The private key never leaves `Keys`.
pub fn sign_payload(
  mut payload: BlobSharePayload,
  keys: &Keys,
  ttl_secs: u64,
) -> Result<BlobSharePayload, String> {
  let now = chrono::Utc::now().timestamp();
  payload.v = 2;
  payload.issued_at = now;
  payload.expires_at = now.saturating_add(i64::try_from(ttl_secs).unwrap_or(86_400));
  payload.issuer = Some(keys.public_key().to_hex());
  payload.signature = None;
  let message = signing_message(&payload)?;
  let signature = keys.sign_schnorr(&message);
  payload.signature = Some(hex::encode(signature.serialize()));
  Ok(payload)
}

pub fn verify_payload(payload: &BlobSharePayload) -> Result<(), String> {
  if payload.expires_at > 0 && chrono::Utc::now().timestamp() > payload.expires_at {
    return Err("Share ticket expired".into());
  }

  // v1 tickets predate authenticated tickets. Bare metadata remains readable,
  // but a legacy issuer/checksum must not be presented as a signature.
  if payload.v == 1 {
    if payload.issuer.is_some() || payload.signature.is_some() {
      return Err("Legacy ticket checksum is not sender-authenticated; create a v2 ticket".into());
    }
    return Ok(());
  }
  if payload.v != 2 {
    return Err(format!("Unsupported ticket version {}", payload.v));
  }

  let issuer = payload
    .issuer
    .as_ref()
    .ok_or_else(|| "Signed ticket missing issuer".to_string())?;
  let sig = payload
    .signature
    .as_ref()
    .ok_or_else(|| "Signed ticket missing signature".to_string())?;
  let public_key = XOnlyPublicKey::from_slice(
    &hex::decode(issuer).map_err(|_| "Invalid ticket issuer".to_string())?,
  )
  .map_err(|_| "Invalid ticket issuer".to_string())?;
  let signature = Signature::from_slice(
    &hex::decode(sig).map_err(|_| "Invalid ticket signature encoding".to_string())?,
  )
  .map_err(|_| "Invalid ticket signature encoding".to_string())?;
  let message = signing_message(payload)?;
  Secp256k1::new()
    .verify_schnorr(&signature, &message, &public_key)
    .map_err(|_| "Share ticket signature mismatch".to_string())
}

fn default_src() -> String {
  "blkspace".to_string()
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BlobShareTicket {
  pub ticket: String,
  pub payload: BlobSharePayload,
  /// True when bytes are available on this device (local store and/or Iroh).
  pub bytes_available: bool,
  /// Hint for cross-device P2P when only metadata is shared.
  pub p2p_hint: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceiveShareResult {
  pub hash: String,
  pub cid: Option<String>,
  pub filename: String,
  pub mime_type: String,
  pub file_size: i64,
  pub source: String,
  pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SendmeCliInfo {
  pub installed: bool,
  pub path: Option<String>,
  pub version: Option<String>,
  pub send_example: String,
  pub receive_example: String,
  pub install_hint: String,
  pub note: String,
}

impl BlobSharePayload {
  pub fn encode_ticket(&self) -> Result<String, String> {
    let json = serde_json::to_vec(self).map_err(|e| format!("ticket encode: {e}"))?;
    let b64 = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(json);
    Ok(format!("{TICKET_PREFIX}{b64}"))
  }

  pub fn decode_ticket(ticket: &str) -> Result<Self, String> {
    let raw = ticket.trim();
    if raw.is_empty() {
      return Err("Empty ticket".to_string());
    }
    // Native BlkSpace tickets
    if let Some(rest) = raw.strip_prefix(TICKET_PREFIX) {
      let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(rest.trim())
        .or_else(|_| base64::engine::general_purpose::URL_SAFE.decode(rest.trim()))
        .map_err(|_| "Invalid blkspace1 ticket encoding".to_string())?;
      let payload: BlobSharePayload =
        serde_json::from_slice(&bytes).map_err(|e| format!("Invalid ticket JSON: {e}"))?;
      if payload.v != 1 && payload.v != 2 {
        return Err(format!("Unsupported ticket version {}", payload.v));
      }
      if payload.hash.is_empty() && payload.cid.as_ref().map(|c| c.is_empty()).unwrap_or(true) {
        return Err("Ticket missing content hash/cid".to_string());
      }
      return Ok(payload);
    }
    // Plain JSON (debug / paste)
    if raw.starts_with('{') {
      let payload: BlobSharePayload =
        serde_json::from_str(raw).map_err(|e| format!("Invalid ticket JSON: {e}"))?;
      return Ok(payload);
    }
    // Looks like an iroh/sendme BlobTicket — not parseable as BlkSpace payload
    Err(
      "This looks like an external sendme/iroh BlobTicket. \
       Use `sendme receive <ticket>` (CLI) or paste a blkspace1. ticket from BlkSpace Share."
        .to_string(),
    )
  }
}

pub fn looks_like_external_blob_ticket(s: &str) -> bool {
  let t = s.trim();
  !t.is_empty()
    && !t.starts_with(TICKET_PREFIX)
    && !t.starts_with('{')
    && t.len() > 32
    && !t.contains(' ')
}

pub fn detect_sendme_cli() -> SendmeCliInfo {
  let install_hint = "cargo install sendme".to_string();
  let send_example = "sendme send ./photo.jpg".to_string();
  let receive_example = "sendme receive <ticket>".to_string();
  let note = "sendme (n0) uses iroh 1.x for hole-punch P2P. BlkSpace Yard uses content tickets + local/Iroh store; install sendme for live endpoint tickets."
    .to_string();

  let which = if cfg!(windows) {
    Command::new("where").arg("sendme").output()
  } else {
    Command::new("which").arg("sendme").output()
  };

  let path = which.ok().and_then(|o| {
    if o.status.success() {
      let s = String::from_utf8_lossy(&o.stdout);
      s.lines().next().map(|l| l.trim().to_string()).filter(|p| !p.is_empty())
    } else {
      None
    }
  });

  let version = path.as_ref().and_then(|p| {
    Command::new(p)
      .arg("--version")
      .output()
      .ok()
      .and_then(|o| {
        if o.status.success() {
          Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
        } else {
          // some CLIs put version on stderr
          let e = String::from_utf8_lossy(&o.stderr).trim().to_string();
          if e.is_empty() {
            None
          } else {
            Some(e)
          }
        }
      })
  });

  SendmeCliInfo {
    installed: path.is_some(),
    path,
    version,
    send_example,
    receive_example,
    install_hint,
    note,
  }
}

pub fn sendme_send_command(path: &str) -> String {
  format!("sendme send \"{}\"", path.replace('"', ""))
}

pub fn sendme_receive_command(ticket: &str) -> String {
  format!("sendme receive {}", ticket.trim())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn roundtrip_ticket() {
    let p = BlobSharePayload {
      v: 1,
      hash: "a".repeat(64),
      cid: Some("b".repeat(64)),
      name: "syllabus.pdf".into(),
      mime: "application/pdf".into(),
      size: 1200,
      src: "blkspace".into(),
      issued_at: 0,
      expires_at: 0,
      issuer: None,
      signature: None,
      p2p_ticket: None,
    };
    let t = p.encode_ticket().unwrap();
    assert!(t.starts_with(TICKET_PREFIX));
    let back = BlobSharePayload::decode_ticket(&t).unwrap();
    assert_eq!(back, p);
  }

  #[test]
  fn reject_empty() {
    assert!(BlobSharePayload::decode_ticket("").is_err());
  }

  #[test]
  fn external_ticket_message() {
    let err = BlobSharePayload::decode_ticket(&"x".repeat(80)).unwrap_err();
    assert!(err.contains("sendme"));
  }

  fn sample_payload() -> BlobSharePayload {
    BlobSharePayload {
      v: 1,
      hash: "a".repeat(64),
      cid: Some("b".repeat(64)),
      name: "syllabus.pdf".into(),
      mime: "application/pdf".into(),
      size: 1200,
      src: "blkspace".into(),
      issued_at: 0,
      expires_at: 0,
      issuer: None,
      signature: None,
      p2p_ticket: None,
    }
  }

  #[test]
  fn signs_and_verifies_all_ticket_fields() {
    let keys = Keys::generate();
    let signed = sign_payload(sample_payload(), &keys, 3600).unwrap();
    assert_eq!(signed.v, 2);
    assert!(signed.signature.is_some());
    assert!(verify_payload(&signed).is_ok());

    let encoded = signed.encode_ticket().unwrap();
    let decoded = BlobSharePayload::decode_ticket(&encoded).unwrap();
    assert!(verify_payload(&decoded).is_ok());
  }

  #[test]
  fn rejects_tampering_after_signing() {
    let keys = Keys::generate();
    let mut signed = sign_payload(sample_payload(), &keys, 3600).unwrap();
    signed.mime = "text/html".into();
    assert!(verify_payload(&signed).is_err());

    let mut signed = sign_payload(sample_payload(), &keys, 3600).unwrap();
    signed.p2p_ticket = Some("ticket-from-another-source".into());
    assert!(verify_payload(&signed).is_err());
  }

  #[test]
  fn rejects_a_signature_from_a_different_issuer() {
    let signer = Keys::generate();
    let other = Keys::generate();
    let mut signed = sign_payload(sample_payload(), &signer, 3600).unwrap();
    signed.issuer = Some(other.public_key().to_hex());
    assert!(verify_payload(&signed).is_err());
  }

  #[test]
  fn rejects_legacy_checksum_as_authentication() {
    let mut legacy = sample_payload();
    legacy.issuer = Some("issuer".into());
    legacy.signature = Some(sha256_hex(b"not-a-schnorr-signature"));
    assert!(verify_payload(&legacy).is_err());
  }

  #[test]
  fn accepts_bare_legacy_metadata_without_claiming_authentication() {
    let legacy = sample_payload();
    assert!(verify_payload(&legacy).is_ok());
  }
}
