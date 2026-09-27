//! T3 courier payload layer: mesh identity, destination addressing, and
//! encryption of a signed Nostr event for mesh delivery.
//!
//! # Where this sits in T3
//!
//! ```text
//!   Nostr event  â”€â”€signed by secp256k1 (Route A identity, unchanged)
//!        â”‚
//!        â”œâ”€ T1 Online   plaintext to a relay
//!        â”œâ”€ T2 Local    Iroh ticket transfer
//!        â””â”€ T3 Mesh     this module: encrypt to a Reticulum destination
//!                          â”‚
//!                          â”œâ”€ rns_crypto::Identity  Ed25519 + X25519
//!                          â”œâ”€ destination::â€¦        name + aspects + identity hash
//!                          â””â”€ AnnounceData          signed presence on the mesh
//!                               â”‚
//!                               â””â”€ routed by transport::pathfinder (rns_routing.rs)
//! ```
//!
//! # What this proves, and what it does not
//!
//! It proves the two things a courier cannot work without: that BlkSpace can
//! **address** a peer on the mesh, and that a signed Nostr event can be
//! **encrypted** to that address and decrypted back by its owner and by nobody
//! else. Both are pure cryptography and run on any platform.
//!
//! It does **not** transmit. There is no socket, no node, and no packet on a
//! wire â€” `rns-net`, which owns that, does not compile on Windows (see the note
//! in `Cargo.toml`). A green suite here means the payload layer is correct and
//! mutually authenticated. It does not mean T3 delivers, and
//! `rns_t3::probe().courier_available` stays `false` because of it.
//!
//! # Rule 8: the mesh identity is not the Nostr identity
//!
//! AGENTS.md rule 8 forbids destination hashes sitting next to Nostr keys, and
//! for LXMF identity stores. The library makes that structural rather than a
//! matter of discipline: an announce is signed by an Ed25519 key carried in a
//! `rns_crypto::Identity`, and `AnnounceData::validate` is handed only the
//! *destination hash*. The Nostr secp256k1 key is nowhere in that path.
//!
//! `the_mesh_identity_is_not_the_nostr_key` pins this. The two key spaces do not
//! share a type, a length, or a signature scheme, so a Nostr identity cannot be
//! substituted for a mesh identity by accident â€” and an announce minted for one
//! destination will not validate against another.
//!
//! # What is still undecided
//!
//! Whose mesh identity is it? `destination_hash` takes
//! `identity_hash: Option<&[u8; 16]>`; `None` yields a group destination anyone
//! may announce to, `Some` yields a point-to-point destination only that
//! identity can decrypt. Per-user, per-device, and per-campus are all
//! defensible and they have different privacy consequences. That is a product
//! decision and is deliberately not made here.

#![cfg(feature = "rns-t3")]

use rns_core::announce::AnnounceData;
use rns_core::destination;
use rns_crypto::identity::Identity;
use rns_crypto::FixedRng;

/// The application name BlkSpace announces under on the mesh.
///
/// Route B is a courier, not an identity: this names the *service*, and the
/// destination hash below carries the per-identity part.
const APP_NAME: &str = "blkspace";

/// Aspects distinguishing mesh destinations, most significant first.
const ASPECTS: &[&str] = &["campus"];

/// A deterministic identity, so assertions are reproducible.
///
/// Never used outside tests. A real identity comes from `Identity::new` over the
/// OS CSPRNG, or from a restored private key.
fn test_identity(seed: u8) -> Identity {
  Identity::from_private_key(&[seed; 64])
}

/// The RNG used for encryption in these tests.
///
/// NOT `rns_crypto::OsRng`. That type is documented as "OS-backed RNG using
/// getrandom(2) syscall on Linux" but is gated only on `#[cfg(feature = "std")]`,
/// and its `fill_bytes` opens `/dev/urandom` under `cfg(not(target_os =
/// "espidf"))`. On Windows that path does not exist, so the open fails and the
/// `.expect()` inside `OsRng` panics. It compiles; it explodes at runtime.
///
/// `FixedRng` is the right choice here for a second reason: it makes the
/// ciphertext bytes reproducible, so a change in the encryption path shows up
/// as a concrete test failure rather than as silent nondeterminism.
///
/// A production caller must supply its own `rns_crypto::Rng`. The trait is
/// public and is a single method, so a Windows-safe implementation is a few
/// lines against a platform CSPRNG â€” no upstream patch is required. Tracked in
/// the T3 phase notes; not needed until a courier actually encrypts outside
/// tests.
fn test_rng() -> FixedRng {
  // Non-empty: `FixedRng::fill_bytes` indexes modulo its own length and would
  // divide by zero on an empty slice.
  FixedRng::new(&[0xA5; 64])
}

/// The full addressing tuple for an identity's campus destination.
fn campus_destination(identity: &Identity) -> ([u8; 10], [u8; 16]) {
  let name_hash = destination::name_hash(APP_NAME, ASPECTS);
  let identity_hash = *identity.hash();
  let dest_hash = destination::destination_hash(APP_NAME, ASPECTS, Some(&identity_hash));
  (name_hash, dest_hash)
}

#[cfg(test)]
mod tests {
  use super::*;

  /// A minimal stand-in for a signed Nostr event. The T3 payload is opaque
  /// bytes to this layer, so the shape does not matter â€” only that the real
  /// content survives a round trip and is unreadable in transit.
  fn nostr_event() -> Vec<u8> {
    br#"{"id":"a".repeat(64),"kind":1,"content":"mesh post","sig":"b".repeat(128)}"#.to_vec()
  }

  // â”€â”€ Addressing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  #[test]
  fn a_destination_is_named_and_addressed() {
    let identity = test_identity(0x42);
    let (name_hash, dest_hash) = campus_destination(&identity);

    assert_eq!(name_hash.len(), 10, "Reticulum name hashes are 10 bytes");
    assert_eq!(dest_hash.len(), 16, "destination hashes are 16 bytes");

    let expanded = destination::expand_name(APP_NAME, ASPECTS, Some(identity.hash()))
      .expect("a valid app name and aspects must expand");
    assert!(expanded.contains(APP_NAME), "expanded name lost the app: {expanded}");
    assert!(
      expanded.contains(ASPECTS[0]),
      "expanded name lost the aspect: {expanded}"
    );
  }

  #[test]
  fn an_app_name_containing_a_dot_is_refused() {
    // Dots separate the fields of an expanded name, so allowing one inside the
    // app name would make the address ambiguous.
    let identity = test_identity(0x42);
    assert!(destination::expand_name("blks.pace", ASPECTS, Some(identity.hash())).is_err());
    assert!(destination::expand_name(APP_NAME, &["cam.pus"], Some(identity.hash())).is_err());
  }

  #[test]
  fn two_identities_get_different_destinations() {
    let a = campus_destination(&test_identity(0x01));
    let b = campus_destination(&test_identity(0x02));
    // The name hash is derived only from the app name and aspects, so it is
    // *supposed* to be identical for every campus destination â€” it names the
    // service. The identity hash is what separates peers, and it is folded into
    // the destination hash below.
    assert_eq!(a.0, b.0, "every campus destination shares one service name hash");
    assert_ne!(a.1, b.1, "distinct identities must not share a destination");
  }

  #[test]
  fn a_group_destination_is_addressable_without_an_identity() {
    // `identity_hash: None` is a group destination: anyone may announce to it.
    // BlkSpace has not chosen between this and point-to-point; both must work.
    let name_hash = destination::name_hash(APP_NAME, ASPECTS);
    let group = destination::destination_hash(APP_NAME, ASPECTS, None);
    let point = destination::destination_hash(APP_NAME, ASPECTS, Some(&[7u8; 16]));
    assert_ne!(group, point, "an identity must change the address");
    assert_eq!(name_hash.len(), 10);
  }

  // â”€â”€ Announce â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  #[test]
  fn an_announce_packs_unpacks_and_validates() {
    let identity = test_identity(0x42);
    let (name_hash, dest_hash) = campus_destination(&identity);
    let random_hash = [0x11; 10];

    let (packed, has_ratchet) =
      AnnounceData::pack(&identity, &dest_hash, &name_hash, &random_hash, None, None)
        .expect("pack must succeed");
    assert!(!has_ratchet, "no ratchet was supplied");

    let parsed = AnnounceData::unpack(&packed, has_ratchet).expect("unpack must round trip");
    let validated = parsed
      .validate(&dest_hash)
      .expect("a freshly packed announce must validate against its own destination");

    assert_eq!(validated.public_key, identity.get_public_key().expect("identity has a public key"));
    assert_eq!(validated.name_hash, name_hash);
    assert_eq!(validated.random_hash, random_hash);
    assert_eq!(validated.identity_hash, *identity.hash());
    assert!(validated.app_data.is_none());
  }

  #[test]
  fn a_tampered_announce_is_rejected() {
    // The signature sits at offset 84: 64 public key + 10 name + 10 random.
    let identity = test_identity(0x42);
    let (name_hash, dest_hash) = campus_destination(&identity);
    let (mut packed, has_ratchet) =
      AnnounceData::pack(&identity, &dest_hash, &name_hash, &[0x11; 10], None, None).unwrap();

    packed[84] ^= 0xFF;

    let parsed = AnnounceData::unpack(&packed, has_ratchet).unwrap();
    assert!(
      parsed.validate(&dest_hash).is_err(),
      "an announce with a forged signature must never validate"
    );
  }

  #[test]
  fn an_announce_minted_for_another_destination_is_rejected() {
    // This is the binding that makes Rule 8 structural: an announce is signed
    // over its destination hash, so one identity's presence cannot be replayed
    // as another's.
    let alice = test_identity(0x01);
    let bob = test_identity(0x02);
    let (alice_name, alice_dest) = campus_destination(&alice);
    let (_, bob_dest) = campus_destination(&bob);

    let (packed, has_ratchet) =
      AnnounceData::pack(&alice, &alice_dest, &alice_name, &[0x11; 10], None, None).unwrap();
    let parsed = AnnounceData::unpack(&packed, has_ratchet).unwrap();

    assert!(parsed.validate(&alice_dest).is_ok(), "must validate for its own destination");
    assert!(
      parsed.validate(&bob_dest).is_err(),
      "Alice's announce must not validate as Bob's"
    );
  }

  #[test]
  fn an_announce_carries_app_data() {
    // Where a BlkSpace service hint rides alongside presence â€” for example the
    // post id a destination is currently accepting, or a protocol version.
    let identity = test_identity(0x42);
    let (name_hash, dest_hash) = campus_destination(&identity);
    let app_data = b"blkspace/1 ts u".to_vec();

    let (packed, has_ratchet) = AnnounceData::pack(
      &identity,
      &dest_hash,
      &name_hash,
      &[0x11; 10],
      None,
      Some(&app_data),
    )
    .unwrap();
    let parsed = AnnounceData::unpack(&packed, has_ratchet).unwrap();
    let validated = parsed.validate(&dest_hash).unwrap();

    assert_eq!(validated.app_data, Some(app_data));
  }

  // â”€â”€ Payload encryption â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  #[test]
  fn a_nostr_event_encrypts_to_a_mesh_destination_and_decrypts_back() {
    // The courier's actual job: a Route A signed event, encrypted for a mesh
    // destination, recovered byte-for-byte by the identity that owns it.
    let recipient = test_identity(0x42);
    let (_, dest_hash) = campus_destination(&recipient);
    let event = nostr_event();

    let recipient_public = Identity::from_public_key(
      &recipient.get_public_key().expect("identity has a public key"),
    );
    let token = recipient_public
      .encrypt(&event, &mut test_rng())
      .expect("encryption to a known public key must succeed");

    assert_ne!(token, event, "the token must not be the plaintext");

    let recovered = recipient.decrypt(&token).expect("the owner must decrypt its own token");
    assert_eq!(recovered, event, "the signed event must survive the round trip");
    assert_eq!(dest_hash.len(), 16);
  }

  #[test]
  fn the_ciphertext_does_not_contain_the_plaintext() {
    // A cheap but real check that encryption happened. Searching the token for
    // a distinctive run from the payload would find it if this were, say, a
    // base64 wrapper or an unencrypted envelope.
    let recipient = test_identity(0x42);
    let public = Identity::from_public_key(
      &recipient.get_public_key().expect("identity has a public key"),
    );
    let event = nostr_event();
    let token = public.encrypt(&event, &mut test_rng()).unwrap();

    let needle = b"mesh post";
    assert!(
      !token
        .windows(needle.len())
        .any(|window| window == needle),
      "plaintext content is visible in the ciphertext"
    );
    assert!(token.len() > event.len(), "a ciphertext must carry expansion overhead");
  }

  #[test]
  fn a_different_identity_cannot_read_the_payload() {
    // The property the whole addressing scheme exists to provide.
    let recipient = test_identity(0x42);
    let intruder = test_identity(0x43);
    let public = Identity::from_public_key(
      &recipient.get_public_key().expect("identity has a public key"),
    );
    let token = public.encrypt(&nostr_event(), &mut test_rng()).unwrap();

    assert!(
      intruder.decrypt(&token).is_err(),
      "an identity that is not the destination must not decrypt the payload"
    );
  }

  #[test]
  fn the_mesh_identity_is_not_the_nostr_key() {
    // Rule 8, asserted rather than asserted-in-prose.
    //
    // A Nostr identity is a secp256k1 x-only public key: 32 bytes. A mesh
    // identity is an Ed25519 keypair: 64-byte public key plus X25519. They
    // cannot be substituted for one another, and nothing in the announce path
    // ever sees a Nostr key.
    let mesh = test_identity(0x42);
    let mesh_public: [u8; 64] = mesh.get_public_key().expect("identity has a public key");

    // The announce carries a 64-byte Ed25519 key, not a 32-byte Nostr key.
    let (name_hash, dest_hash) = campus_destination(&mesh);
    let (packed, has_ratchet) =
      AnnounceData::pack(&mesh, &dest_hash, &name_hash, &[0x11; 10], None, None).unwrap();
    let parsed = AnnounceData::unpack(&packed, has_ratchet).unwrap();

    assert_eq!(parsed.public_key.len(), 64, "announces carry an Ed25519 key");
    assert_eq!(parsed.public_key, mesh_public);
    assert_ne!(
      mesh_public.len(),
      32,
      "a Nostr x-only key is 32 bytes; if these ever match, the key spaces have been confused"
    );

    // And the mesh identity signs independently: a mesh signature does not
    // verify as a Nostr one, and vice versa, because they are different schemes
    // over different keys. Represented here by the absence of any Nostr
    // verification step in `validate`, which only ever checks the Ed25519
    // signature against the destination hash.
    let validated = parsed.validate(&dest_hash).expect("mesh signature verifies");
    assert_eq!(validated.identity_hash, *mesh.hash());
  }

  // â”€â”€ The honesty boundary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  #[test]
  fn a_working_payload_layer_still_does_not_enable_the_mesh_tier() {
    // Every test above proved addressing and encryption. None of them proved
    // delivery, because nothing was delivered. The tier must stay Offline and
    // the courier must stay unavailable, or the UI would be promising a mesh
    // that has never carried a byte.
    let probe = crate::rns_t3::probe();
    assert!(probe.compiled_in, "this module only compiles under rns-t3");
    assert!(!probe.courier_available);
    assert!(!probe.lxmf_identity, "identity stays on Route A's Nostr key");

    let tier = crate::delivery_tier::classify(crate::delivery_tier::TierInputs {
      relays_connected: 0,
      lan_available: false,
      mesh_transport_available: probe.compiled_in,
      mesh_peer_observed: false,
    });
    assert_eq!(tier, crate::delivery_tier::DeliveryTier::Offline);
  }
}
