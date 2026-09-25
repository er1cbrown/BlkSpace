//! Reticulum (Route B / tier T3) capability probe.
//!
//! **This is not a transport.** It reports what the linked build can support and
//! stops there. No packet is sent, no node is spawned, and the mesh tier stays
//! `Offline` until a live courier is proven end to end. See
//! `docs/implementation/DELIVERY_TIER_CONCEPT.md` for the phase plan and the
//! open items that gate an actual courier.
//!
//! The module is behind the `rns-t3` feature, which is deliberately not in
//! `default`, so a Yard build never links `rns-core` at all.
//!
//! Licence note: the upstream project ships a custom, non-OSI "Reticulum
//! License" with use restrictions. It is under review, which is why the
//! dependency is optional, pinned, and feature-gated. See Cargo.toml.

use serde::Serialize;

/// Exact crate version this build was compiled against.
#[allow(dead_code)] // only read on rns-t3 builds; see Cargo.toml pin
pub const RNS_CORE_VERSION: &str = "0.1.17";

/// The T3 capabilities the linked `rns-core` build exposes.
///
/// These describe the *library surface*, not working BlkSpace behaviour. A
/// capability is only meaningful once a courier is implemented on top of it,
/// which has not happened yet.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MeshCapabilities {
  /// `rns_core::announce` — announce / propagate. The T3 courier's core.
  pub announce: bool,
  /// `rns_core::packet` + `msgpack` — packet send/receive (HMU packets).
  pub packets: bool,
  /// `rns_core::transport` + `destination` + `link` — routing and peers.
  pub transport: bool,
  /// `rns_core::resource` — resource advertisements.
  pub resources: bool,
  /// `rns_core::receipt` — delivery receipts. Better than this concept assumed.
  pub receipts: bool,
  /// `rns_core::stamp` — proof-of-work, for announce rate limiting.
  pub proof_of_work: bool,
}

/// What this build can currently do on the mesh tier.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MeshProbe {
  /// Whether the `rns-t3` feature was compiled in at all.
  pub compiled_in: bool,
  /// Version of `rns-core` this build expects.
  pub rns_core_version: String,
  /// Library surface available to a future courier.
  pub capabilities: Option<MeshCapabilities>,
  /// Always false. No courier exists yet, so the mesh tier must not be claimed.
  pub courier_available: bool,
  /// Whether an LXMF identity store is in play. Must stay false: Route B is a
  /// courier, and identity stays on Route A's Nostr key.
  pub lxmf_identity: bool,
  /// Human-readable reason, so the UI never has to infer state.
  pub reason: String,
}

#[allow(dead_code)] // only used on rns-t3 builds
const COURIER_REASON: &str =
  "rns-core is linked, but no mesh courier is implemented: no node is spawned and no packet is sent.";

/// Probe the mesh capability surface for this build.
///
/// `compiled_in` is decided by the feature gate itself, so the UI can tell
/// "not available in this build" apart from "available but idle".
pub fn probe() -> MeshProbe {
  #[cfg(feature = "rns-t3")]
  {
    MeshProbe {
      compiled_in: true,
      rns_core_version: RNS_CORE_VERSION.to_string(),
      capabilities: Some(MeshCapabilities {
        announce: true,
        packets: true,
        transport: true,
        resources: true,
        receipts: true,
        proof_of_work: true,
      }),
      // Deliberately false: a linked library is not a working courier.
      courier_available: false,
      lxmf_identity: false,
      reason: COURIER_REASON.to_string(),
    }
  }
  #[cfg(not(feature = "rns-t3"))]
  {
    MeshProbe {
      compiled_in: false,
      rns_core_version: String::new(),
      capabilities: None,
      courier_available: false,
      lxmf_identity: false,
      reason: "This build does not include the rns-t3 feature.".to_string(),
    }
  }
}

/// Whether a mesh transport could be attempted in this build.
///
/// Distinct from [`probe`].`courier_available`: this reports *compilation*, and
/// must be fed into `delivery_tier::classify` only alongside a genuinely
/// observed peer, so an idle or absent mesh can never be reported as tier T3.
pub fn transport_compiled_in() -> bool {
  cfg!(feature = "rns-t3")
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn probe_never_claims_a_working_courier() {
    let probe = probe();
    assert!(!probe.courier_available);
    assert!(!probe.lxmf_identity);
  }

  #[test]
  fn probe_agrees_with_the_feature_gate() {
    assert_eq!(probe().compiled_in, transport_compiled_in());
    assert_eq!(probe().compiled_in, cfg!(feature = "rns-t3"));
  }

  #[test]
  fn capabilities_are_only_reported_when_linked() {
    let probe = probe();
    if probe.compiled_in {
      let caps = probe.capabilities.expect("linked build must report capabilities");
      assert!(caps.announce);
      assert!(caps.packets);
      assert!(caps.transport);
      assert!(caps.receipts);
      assert!(caps.proof_of_work);
      assert_eq!(probe.rns_core_version, RNS_CORE_VERSION);
    } else {
      assert!(probe.capabilities.is_none());
      assert!(probe.rns_core_version.is_empty());
    }
  }

  #[test]
  fn linked_courier_is_still_not_a_tier_upgrade() {
    // The critical honesty property: linking the library must not by itself let
    // the app report tier T3.
    let tier = crate::delivery_tier::classify(crate::delivery_tier::TierInputs {
      relays_connected: 0,
      lan_available: false,
      mesh_transport_available: transport_compiled_in(),
      mesh_peer_observed: false,
    });
    assert_eq!(tier, crate::delivery_tier::DeliveryTier::Offline);
  }
}
