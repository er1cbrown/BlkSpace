//! Sendme-inspired content tickets for BlkSpace.
//!
//! [n0-computer/sendme](https://github.com/n0-computer/sendme) is a CLI that spins up a temporary
//! iroh endpoint, imports a file/dir into iroh-blobs, and prints a `BlobTicket` for `sendme receive`.
//! That stack is **iroh 1.x + iroh-blobs 0.103** — not wire-compatible with BlkSpace's optional
//! iroh-blobs **0.35 store-only** node (Yard builds omit networking entirely).
//!
//! BlkSpace therefore implements:
//! 1. **`blkspace1.` tickets** — portable content-addressed share strings (hash + optional CID + meta).
//! 2. **Local / Iroh materialize** — receiver pulls from local blob_store or Iroh fs-store when present.
//! 3. **CLI bridge** — detect `sendme` on PATH and expose exact shell commands for true P2P hole-punch.
//!
//! Do not depend on the `sendme` crate (pulls iroh 1.0). Students use tickets in-app; operators install
//! `cargo install sendme` for campus LAN / relay P2P file drops.

use base64::Engine;
use serde::{Deserialize, Serialize};
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
      if payload.v != 1 {
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
}
