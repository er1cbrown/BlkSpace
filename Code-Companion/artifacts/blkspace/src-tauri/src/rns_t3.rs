//! Reticulum (Route B / tier T3) capability probe.
//!
//! **This is still not a transport.** It reports what the linked build can
//! support and stops there. No packet is sent, no node is spawned, and the mesh
//! tier stays `Offline` until a live courier is proven end to end. See
//! `docs/implementation/DELIVERY_TIER_CONCEPT.md` for the phase plan.
//!
//! The module is behind the `rns-t3` feature, which is deliberately not in
//! `default`, so a Yard build never links `rns-core` at all.
//!
//! How the capabilities are established
//! ----------------------------------
//! The `use … as _` imports inside [`linked`] are **compile-time existence
//! proofs**. Each one names a real item in the linked `rns-core`. If a future
//! release removes or renames any of them, this file stops compiling instead of
//! continuing to advertise a capability the build does not have.
//!
//! This replaces an earlier version of this module that returned six hardcoded
//! `true` literals. Nothing in it read `rns-core`, so it reported `receipts` and
//! `proof_of_work` as available on the strength of the author having typed
//! `true` — and the accompanying test asserted those same literals, making it
//! circular. A capability the probe cannot substantiate is not a capability.
//!
//! What this is *not*: none of these flags are runtime observations. They say
//! "this build links a library exposing this API", not "a node was started and
//! an announce was received". [`MeshProbe::verification`] carries that
//! distinction into the UI so the distinction is not lost in translation.
//!
//! Licence note: the upstream project ships a custom, non-OSI "Reticulum
//! License" with use restrictions. It is under review, which is why the
//! dependency is optional, pinned, and feature-gated. The Reticulum *protocol*
//! was dedicated to the public domain in 2016, so this restriction attaches to
//! the reference implementation and this crate, not to the wire format. See
//! `docs/implementation/RNS_LICENSE_REVIEW.md`.

use serde::Serialize;

/// Exact crate version this build was compiled against.
#[allow(dead_code)] // only read on rns-t3 builds; see Cargo.toml pin
pub const RNS_CORE_VERSION: &str = "0.1.17";

/// The T3 capabilities the linked `rns-core` build exposes.
///
/// Each flag is backed by a named item in [`linked`]. These describe the
/// *library surface*, not working BlkSpace behaviour: a capability is only
/// meaningful once a courier is implemented on top of it, which has not
/// happened yet.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MeshCapabilities {
  /// `rns_core::announce::AnnounceData` — announce handling, the T3 core.
  pub announce: bool,
  /// `rns_core::packet::RawPacket` — packet send/receive (HMU packets).
  pub packets: bool,
  /// `rns_core::transport::TransportEngine` — **routing**, path tables, rate
  /// tables. This is the type a T3 courier drives; its presence is what makes
  /// in-process node embedding possible.
  pub transport: bool,
  /// `rns_core::link::LinkEngine` — link establishment and the link registry.
  /// Previously omitted from this list despite being required for any
  /// request/response exchange.
  pub links: bool,
  /// `rns_core::channel::Channel` — reliable multiplexed streams over a link.
  /// Also previously omitted.
  pub channels: bool,
  /// `rns_core::resource` — resource advertisements. Claimed at module level
  /// only: its public API is submodule-based and nothing in BlkSpace exercises a
  /// specific item yet, so this flag is deliberately the weakest of the set.
  pub resources: bool,
  /// `rns_core::receipt::validate_proof` — delivery-receipt validation.
  pub receipts: bool,
  /// `rns_core::stamp::stamp_workblock` — proof-of-work, for announce
  /// rate limiting.
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
  /// How these capabilities were established, in words the UI can render.
  /// "compile-time link check, not a runtime observation" on linked builds.
  pub verification: String,
  /// Human-readable reason, so the UI never has to infer state.
  pub reason: String,
}

#[allow(dead_code)] // only used on rns-t3 builds
const COURIER_REASON: &str =
  "rns-core is linked, but no mesh courier is implemented: no node is spawned and no packet is sent.";

#[allow(dead_code)] // only used on rns-t3 builds
const VERIFICATION: &str = "compile-time link check, not a runtime observation";

#[cfg(feature = "rns-t3")]
mod linked {
  //! Compile-time existence proofs against the pinned `rns-core`.
  //!
  //! Every import below is load-bearing. Removing an item upstream turns one of
  //! these into a compile error, which is the intended failure mode: the build
  //! should stop rather than quietly advertise something it no longer has.
  //!
  //! "Unused" is therefore the expected state of these imports — they exist to
  //! be resolved, not to be called. `cargo check` on the pinned toolchain still
  //! reports them as unused despite the `as _` form, so the lint is silenced
  //! here rather than worked around by inventing dummy uses.
  #![allow(unused_imports)]

  // Routing. `TransportEngine` drives path tables and rate tables.
  pub use rns_core::transport::TransportEngine as _;
  // Request/response. `LinkEngine` and `Channel` are both required for any
  // bidirectional exchange and were missing from the earlier capability list.
  pub use rns_core::link::LinkEngine as _;
  pub use rns_core::channel::Channel as _;
  // Announce handling and raw packet I/O.
  pub use rns_core::announce::AnnounceData as _;
  pub use rns_core::packet::RawPacket as _;
  // Delivery receipts: validation of a receipt proof against a packet hash.
  pub use rns_core::receipt::validate_proof as _;
  // Proof-of-work, for announce rate limiting and spam resistance.
  pub use rns_core::stamp::stamp_workblock as _;
  // Resource advertisements. Module-level claim only; see `MeshCapabilities`.
  pub use rns_core::resource as _;
}

/// Probe the mesh capability surface for this build.
///
/// `compiled_in` is decided by the feature gate itself, so the UI can tell
/// "not available in this build" apart from "available but idle".
pub fn probe() -> MeshProbe {
  #[cfg(feature = "rns-t3")]
  {
    // Reaching this line at all means every import in `linked` resolved. The
    // flags are therefore true by construction rather than by assertion.
    MeshProbe {
      compiled_in: true,
      rns_core_version: RNS_CORE_VERSION.to_string(),
      capabilities: Some(MeshCapabilities {
        announce: true,
        packets: true,
        transport: true,
        links: true,
        channels: true,
        resources: true,
        receipts: true,
        proof_of_work: true,
      }),
      // Deliberately false: a linked library is not a working courier.
      courier_available: false,
      lxmf_identity: false,
      verification: VERIFICATION.to_string(),
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
      verification: "not linked in this build".to_string(),
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
      // Previously unasserted because previously unreported.
      assert!(caps.links);
      assert!(caps.channels);
      assert!(caps.resources);
      assert!(caps.receipts);
      assert!(caps.proof_of_work);
      assert_eq!(probe.rns_core_version, RNS_CORE_VERSION);
    } else {
      assert!(probe.capabilities.is_none());
      assert!(probe.rns_core_version.is_empty());
    }
  }

  /// A linked build must not present compile-time facts as runtime ones.
  ///
  /// This is the honesty property the earlier hardcoded version could not
  /// express, because it had no way to distinguish the two.
  #[test]
  fn linked_probe_labels_itself_as_compile_time_only() {
    let probe = probe();
    if probe.compiled_in {
      assert_eq!(probe.verification, VERIFICATION);
      assert!(
        probe.verification.contains("not a runtime observation"),
        "verification text must disclaim runtime observation: got {:?}",
        probe.verification
      );
    } else {
      assert_eq!(probe.verification, "not linked in this build");
    }
  }

  /// The two claims must never be conflated, whatever the build.
  #[test]
  fn capabilities_never_imply_a_courier() {
    let probe = probe();
    if let Some(caps) = probe.capabilities {
      // Every capability may be true while the courier is still absent: that
      // combination is the whole point of the tier gate.
      assert!(caps.transport);
      assert!(!probe.courier_available);
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
