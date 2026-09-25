//! Delivery tier detection — which delivery regime the device is currently in.
//!
//! Implements the tier contract from
//! `docs/implementation/DELIVERY_TIER_CONCEPT.md`:
//!
//! | Tier | Regime            | Transport     | Carries                        |
//! |------|-------------------|---------------|--------------------------------|
//! | T1   | Online            | Nostr relays  | social graph, posts, replies   |
//! | T2   | No uplink, LAN    | Iroh / Sendme | blobs, media, account sync     |
//! | T3   | No uplink, no LAN | Reticulum     | text only (not yet proven live) |
//! |  —   | nothing available | —            | local only                     |
//!
//! The rules this module exists to enforce:
//!
//! 1. No overlap — each transport owns one regime, and no two compete.
//! 2. The app always knows its tier, so it can be shown honestly.
//! 3. Delivery is never overstated — a mesh send is `queued`, never `sent`.
//!
//! [`classify`] is deliberately a pure function over [`TierInputs`]. Network
//! probing is a separate concern that fills those inputs, which keeps the
//! precedence rules exhaustively testable without touching a socket.

use serde::Serialize;

/// The delivery regime the device can currently use.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DeliveryTier {
  /// T1 — a Nostr relay is connected.
  Online,
  /// T2 — no relay, but a local network path is available.
  Local,
  /// T3 — no relay and no LAN. Degraded, text-only courier.
  Mesh,
  /// Nothing is available; content stays local-only.
  Offline,
}

impl DeliveryTier {
  /// Stable identifier for persistence, logging, and device-sync records.
  #[allow(dead_code)] // consumed by the Tauri surface and tests; see classify docs
  pub fn as_str(self) -> &'static str {
    match self {
      DeliveryTier::Online => "online",
      DeliveryTier::Local => "local",
      DeliveryTier::Mesh => "mesh",
      DeliveryTier::Offline => "offline",
    }
  }

  /// What the current tier can actually carry right now.
  ///
  /// This is the "visible capability downgrade" rule: shedding capability must
  /// be visible, so a media post is never silently truncated into the mesh tier.
  pub fn can_carry_media(self) -> bool {
    matches!(self, DeliveryTier::Online | DeliveryTier::Local)
  }

  /// Whether a social post can leave the device at all in this tier.
  pub fn can_publish_social(self) -> bool {
    !matches!(self, DeliveryTier::Offline)
  }

  /// Whether the tier reaches beyond this device's local network.
  pub fn is_remote(self) -> bool {
    matches!(self, DeliveryTier::Online)
  }
}

/// Observed connectivity, supplied by the caller.
///
/// Kept separate from detection so the precedence rules can be tested directly.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct TierInputs {
  /// Number of connected Nostr relays. Greater than zero means T1.
  pub relays_connected: usize,
  /// Whether a local-network path is available (Iroh LAN, AutoInterface, ...).
  pub lan_available: bool,
  /// Whether a mesh peer has been observed (T3). Always false until the Reticulum
  /// courier is proven live — the tier must not claim a transport that is dark.
  pub mesh_peer_observed: bool,
  /// Whether the Reticulum courier is compiled in and able to attempt a send.
  pub mesh_transport_available: bool,
}

/// Resolve the active tier from observed connectivity.
///
/// Precedence is most-capable-first and never optimistic:
///
/// 1. Any connected relay wins. It is the only tier that reaches globally.
/// 2. Otherwise a local path wins over the mesh — LAN has real bandwidth and
///    can carry media, the mesh cannot.
/// 3. The mesh is reported only when a courier is available *and* a peer has
///    actually been observed. A compiled-but-unproven transport must degrade to
///    `Offline`, never to `Mesh`, so the UI cannot imply T3 works.
/// 4. Otherwise nothing is available.
pub fn classify(inputs: TierInputs) -> DeliveryTier {
  if inputs.relays_connected > 0 {
    return DeliveryTier::Online;
  }
  if inputs.lan_available {
    return DeliveryTier::Local;
  }
  if inputs.mesh_transport_available && inputs.mesh_peer_observed {
    return DeliveryTier::Mesh;
  }
  DeliveryTier::Offline
}

/// Whether the mesh tier can be claimed by this build at all.
///
/// Separate from [`classify`] so the UI can say "not available in this build"
/// instead of silently reporting `Offline`, which is indistinguishable from
/// "available but nobody is there".
#[allow(dead_code)] // wired to the UI once the mesh tier is user-visible
pub fn mesh_available(mesh_transport_available: bool) -> bool {
  mesh_transport_available
}

/// Snapshot for the UI and for device-sync records.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TierStatus {
  pub tier: DeliveryTier,
  pub relays_connected: usize,
  pub lan_available: bool,
  pub mesh_transport_available: bool,
  pub mesh_peer_observed: bool,
  /// What this tier can carry, stated plainly rather than implied.
  pub can_carry_media: bool,
  pub can_publish_social: bool,
}

impl TierStatus {
  pub fn from_inputs(inputs: TierInputs) -> Self {
    let tier = classify(inputs);
    TierStatus {
      tier,
      relays_connected: inputs.relays_connected,
      lan_available: inputs.lan_available,
      mesh_transport_available: inputs.mesh_transport_available,
      mesh_peer_observed: inputs.mesh_peer_observed,
      can_carry_media: tier.can_carry_media(),
      can_publish_social: tier.can_publish_social(),
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  fn all_clear() -> TierInputs {
    TierInputs {
      relays_connected: 3,
      lan_available: true,
      mesh_transport_available: true,
      mesh_peer_observed: true,
    }
  }

  #[test]
  fn any_relay_wins_over_everything() {
    assert_eq!(classify(all_clear()), DeliveryTier::Online);
    let mut no_mesh = all_clear();
    no_mesh.mesh_transport_available = false;
    no_mesh.mesh_peer_observed = false;
    assert_eq!(classify(no_mesh), DeliveryTier::Online);
  }

  #[test]
  fn one_relay_is_enough() {
    let mut inputs = all_clear();
    inputs.relays_connected = 1;
    assert_eq!(classify(inputs), DeliveryTier::Online);
  }

  #[test]
  fn lan_wins_over_mesh_when_there_is_no_relay() {
    let mut inputs = all_clear();
    inputs.relays_connected = 0;
    assert_eq!(classify(inputs), DeliveryTier::Local);
  }

  #[test]
  fn mesh_requires_both_a_transport_and_an_observed_peer() {
    let mut inputs = all_clear();
    inputs.relays_connected = 0;
    inputs.lan_available = false;

    // Transport compiled in, but nobody on the mesh yet.
    inputs.mesh_peer_observed = false;
    assert_eq!(classify(inputs), DeliveryTier::Offline);

    // Peer seen, but no transport to reach it.
    inputs.mesh_peer_observed = true;
    inputs.mesh_transport_available = false;
    assert_eq!(classify(inputs), DeliveryTier::Offline);

    // Both present.
    inputs.mesh_peer_observed = true;
    inputs.mesh_transport_available = true;
    assert_eq!(classify(inputs), DeliveryTier::Mesh);
  }

  #[test]
  fn nothing_available_is_offline() {
    let empty = TierInputs::default();
    assert_eq!(classify(empty), DeliveryTier::Offline);
    assert!(!empty.lan_available);
    assert!(!empty.mesh_transport_available);
    assert!(!empty.mesh_peer_observed);
  }

  #[test]
  fn mesh_tier_is_text_only_and_does_not_reach_remotely() {
    assert!(!DeliveryTier::Mesh.can_carry_media());
    assert!(DeliveryTier::Mesh.can_publish_social());
    assert!(!DeliveryTier::Mesh.is_remote());
  }

  #[test]
  fn online_and_local_carry_media_but_offline_cannot_publish() {
    assert!(DeliveryTier::Online.can_carry_media());
    assert!(DeliveryTier::Local.can_carry_media());
    assert!(DeliveryTier::Offline.can_carry_media() == false);
    assert!(!DeliveryTier::Offline.can_publish_social());
    // Only T1 leaves the local network.
    assert!(DeliveryTier::Online.is_remote());
    assert!(!DeliveryTier::Local.is_remote());
    assert!(!DeliveryTier::Mesh.is_remote());
  }

  #[test]
  fn tier_identifiers_are_stable() {
    assert_eq!(DeliveryTier::Online.as_str(), "online");
    assert_eq!(DeliveryTier::Local.as_str(), "local");
    assert_eq!(DeliveryTier::Mesh.as_str(), "mesh");
    assert_eq!(DeliveryTier::Offline.as_str(), "offline");
  }

  #[test]
  fn status_reports_capability_without_overstating_it() {
    let mut inputs = all_clear();
    inputs.relays_connected = 0;
    inputs.lan_available = false;
    let status = TierStatus::from_inputs(inputs);
    assert_eq!(status.tier, DeliveryTier::Mesh);
    assert!(!status.can_carry_media);
    assert!(status.can_publish_social);

    // A build with no mesh support must be distinguishable from an idle mesh.
    let mut unsupported = inputs;
    unsupported.mesh_transport_available = false;
    let status = TierStatus::from_inputs(unsupported);
    assert_eq!(status.tier, DeliveryTier::Offline);
    assert!(!status.mesh_transport_available);
    assert!(!mesh_available(status.mesh_transport_available));
  }

  #[test]
  fn mesh_availability_is_reported_independently_of_activity() {
    // Compiled in, nobody home: available is true, tier is still Offline.
    assert!(mesh_available(true));
    // Not compiled in: available is false.
    assert!(!mesh_available(false));
  }
}
