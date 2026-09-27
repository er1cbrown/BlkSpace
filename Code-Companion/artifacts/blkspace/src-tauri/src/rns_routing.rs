//! T3 routing proof: the Reticulum path decision logic, exercised directly.
//!
//! # What this proves, and what it does not
//!
//! This module drives `rns_core::transport::pathfinder` and
//! `rns_core::transport::tables` — the code that decides **where** a packet
//! should go — and asserts the decisions it returns. Those functions are pure:
//! given a known path state and an incoming announce, they return
//! `Add`/`Reject` or `ReplacePrimary`/`AddAlternative`/`Reject`.
//!
//! It does **not** open a socket, start a node, or move a packet. Those need
//! `rns-net`, which does not compile on Windows (see the note in `Cargo.toml`).
//! So this is a proof about the routing *decision layer*, and
//! `rns_t3::probe().courier_available` stays `false` because of it. A green
//! suite here means "BlkSpace's understanding of Reticulum routing matches the
//! library's", not "T3 works".
//!
//! # Why these assertions are shaped the way they are
//!
//! `PathEntry::random_blobs` is a list of announce blobs, and a path's
//! *timebase* is the maximum timestamp decoded from them. Tests that need a
//! known timebase use an **empty** blob list, which decodes to `0` by
//! construction. Tests that need "newer than anything" use `u64::MAX`, which is
//! `>=` any decoded timebase. Neither depends on how a blob encodes a
//! timestamp, so these assertions cannot silently drift if that encoding
//! changes upstream. Tests that need *equality* pair an empty blob list with an
//! emission timestamp of `0`.
//!
//! The rules under test, in the order `should_update_path` applies them:
//!
//!  1. Hop limit. `announce_hops > PATHFINDER_M` rejects, before any other
//!     consideration — this is what stops an announce looping forever.
//!  2. An unknown destination is always added.
//!  3. A strictly shorter path wins, when shorter paths are preferred.
//!  4. Otherwise a same-or-fewer-hops announce is accepted only if its blob is
//!     new *and* its emission is newer than the path's timebase.
//!  5. An unresponsive path is replaced at equal emission, for recovery.
//!  6. A longer path is accepted only if the current one has expired, or the
//!     announce is strictly newer with a new blob.
//!
//! Gated behind the `rns-t3` feature, like the rest of the T3 surface.

#![cfg(feature = "rns-t3")]

use rns_core::constants::PATHFINDER_M;
use rns_core::transport::pathfinder::{
  decide_announce_multipath, should_update_path, MultiPathDecision, PathDecision,
};
use rns_core::transport::types::InterfaceId;
use rns_core::transport::tables::{PathEntry, PathSet};

/// Emission timestamp that is newer than any decodable timebase.
const NEWEST: u64 = u64::MAX;
/// Emission timestamp equal to the timebase of an entry with no blobs.
const TIMEBASE_ZERO: u64 = 0;

/// A next-hop transport id.
fn hop(n: u8) -> [u8; 16] {
  let mut h = [0u8; 16];
  h[0] = n;
  h
}

/// Build a path entry.
///
/// `blobs` empty means the entry's timebase is 0, per the module comment.
/// `expires_at` is an absolute `now` value so expiry tests read clearly.
fn entry(next_hop: u8, hops: u8, blobs: Vec<[u8; 10]>, expires_at: f64) -> PathEntry {
  PathEntry {
    timestamp: 0.0,
    next_hop: hop(next_hop),
    hops,
    expires: expires_at,
    random_blobs: blobs,
    receiving_interface: InterfaceId(1),
    packet_hash: [0; 32],
    announce_raw: None,
  }
}

/// A live entry, far from expiry.
fn live(next_hop: u8, hops: u8, blobs: Vec<[u8; 10]>) -> PathEntry {
  entry(next_hop, hops, blobs, 10_000.0)
}

fn blob(n: u8) -> [u8; 10] {
  [n; 10]
}

#[cfg(test)]
mod tests {
  use super::*;

  // ── Hop limit ────────────────────────────────────────────────────────────

  #[test]
  fn an_unknown_destination_is_always_added() {
    let d = should_update_path(None, 1, NEWEST, &blob(1), false, 0.0, true);
    assert_eq!(d, PathDecision::Add);
  }

  #[test]
  fn the_hop_limit_is_checked_before_anything_else() {
    // Even with no existing path, an over-long announce is refused. If the hop
    // check were ordered after the unknown-destination case, this would Add.
    let d = should_update_path(None, PATHFINDER_M + 1, NEWEST, &blob(1), false, 0.0, true);
    assert_eq!(d, PathDecision::Reject);
  }

  #[test]
  fn the_hop_limit_boundary_is_inclusive() {
    // The rule is `>`, so exactly PATHFINDER_M hops is still routable.
    let d = should_update_path(None, PATHFINDER_M, NEWEST, &blob(1), false, 0.0, true);
    assert_eq!(d, PathDecision::Add);
  }

  // ── Path preference ──────────────────────────────────────────────────────

  #[test]
  fn a_strictly_shorter_path_wins_when_shorter_is_preferred() {
    let existing = live(1, 4, vec![]);
    let d = should_update_path(Some(&existing), 2, TIMEBASE_ZERO, &blob(9), false, 0.0, true);
    assert_eq!(d, PathDecision::Add, "2 hops should replace 4 when preferred");
  }

  #[test]
  fn a_same_hop_path_with_a_newer_announce_is_accepted() {
    let existing = live(1, 2, vec![]);
    let d = should_update_path(Some(&existing), 2, NEWEST, &blob(9), false, 0.0, true);
    assert_eq!(d, PathDecision::Add);
  }

  // ── Loop and duplicate prevention ───────────────────────────────────────

  #[test]
  fn a_repeated_blob_at_the_same_emission_is_rejected() {
    // This is the announce-loop guard: the same blob coming back must not
    // refresh a path it already learned, or two nodes could keep each other
    // alive indefinitely.
    let existing = live(1, 2, vec![blob(7)]);
    let d = should_update_path(Some(&existing), 2, TIMEBASE_ZERO, &blob(7), false, 0.0, true);
    assert_eq!(d, PathDecision::Reject, "a replayed blob must not refresh a path");
  }

  #[test]
  fn an_unresponsive_path_is_replaced_at_equal_emission() {
    // Recovery: same announce, same timebase, but the path is not answering,
    // so it must be replaced rather than kept.
    let existing = live(1, 2, vec![]);
    let d = should_update_path(Some(&existing), 2, TIMEBASE_ZERO, &blob(7), true, 0.0, true);
    assert_eq!(d, PathDecision::Add, "a dead path must be re-routable");
  }

  // ── Longer paths and expiry ──────────────────────────────────────────────

  #[test]
  fn a_longer_path_is_rejected_while_the_current_one_is_live() {
    let existing = live(1, 2, vec![]);
    let d = should_update_path(Some(&existing), 5, TIMEBASE_ZERO, &blob(9), false, 0.0, true);
    assert_eq!(d, PathDecision::Reject, "must not trade a 2-hop path for a 5-hop one");
  }

  #[test]
  fn an_expired_path_admits_a_longer_route() {
    // The recovery case that justifies the rejection above: once the short path
    // has expired, a longer one is better than nothing.
    let existing = entry(1, 2, vec![], 100.0);
    let d = should_update_path(Some(&existing), 5, TIMEBASE_ZERO, &blob(9), false, 200.0, true);
    assert_eq!(d, PathDecision::Add, "a dead 2-hop path should yield to a live 5-hop one");
  }

  // ── Multipath ────────────────────────────────────────────────────────────

  #[test]
  fn an_unknown_destination_becomes_the_primary_path() {
    let d = decide_announce_multipath(
      None,
      1,
      NEWEST,
      &blob(1),
      &hop(1),
      false,
      0.0,
      true,
    );
    assert_eq!(d, MultiPathDecision::ReplacePrimary);
  }

  #[test]
  fn the_hop_limit_also_applies_to_multipath() {
    let d = decide_announce_multipath(
      None,
      PATHFINDER_M + 1,
      NEWEST,
      &blob(1),
      &hop(1),
      false,
      0.0,
      true,
    );
    assert_eq!(d, MultiPathDecision::Reject);
  }

  #[test]
  fn the_same_next_hop_defers_to_the_single_path_rules() {
    // Re-announcing over the next hop we already use is an update, never a
    // second alternative route.
    let set = PathSet::from_single(live(1, 2, vec![]), 4);
    let d = decide_announce_multipath(
      Some(&set),
      2,
      NEWEST,
      &blob(9),
      &hop(1),
      false,
      0.0,
      true,
    );
    assert_eq!(d, MultiPathDecision::ReplacePrimary);
  }

  #[test]
  fn a_known_next_hop_replaying_a_blob_is_rejected() {
    let set = PathSet::from_single(live(1, 2, vec![blob(7)]), 4);
    let d = decide_announce_multipath(
      Some(&set),
      2,
      TIMEBASE_ZERO,
      &blob(7),
      &hop(1),
      false,
      0.0,
      true,
    );
    assert_eq!(d, MultiPathDecision::Reject);
  }

  #[test]
  fn a_new_next_hop_with_a_genuinely_new_blob_becomes_an_alternative() {
    // The multipath payoff: a second route to the same destination.
    let set = PathSet::from_single(live(1, 2, vec![blob(7)]), 4);
    let d = decide_announce_multipath(
      Some(&set),
      3,
      NEWEST,
      &blob(8),
      &hop(2),
      false,
      0.0,
      true,
    );
    assert_eq!(d, MultiPathDecision::AddAlternative);
  }

  #[test]
  fn a_new_next_hop_reusing_a_known_blob_is_rejected() {
    // Cross-path loop guard: a blob we have already seen on *any* path must not
    // be able to graft a new next hop onto the set.
    let set = PathSet::from_single(live(1, 2, vec![blob(7)]), 4);
    let d = decide_announce_multipath(
      Some(&set),
      3,
      NEWEST,
      &blob(7),
      &hop(2),
      false,
      0.0,
      true,
    );
    assert_eq!(d, MultiPathDecision::Reject, "a known blob must not create a new route");
  }

  // ── Path table ───────────────────────────────────────────────────────────

  #[test]
  fn a_path_set_resolves_a_next_hop() {
    // The lookup a sender actually performs before transmitting.
    let set = PathSet::from_single(live(1, 2, vec![]), 4);
    assert!(!set.is_empty());
    assert_eq!(set.len(), 1);
    let found = set.find_by_next_hop(&hop(1)).expect("route via hop 1");
    assert_eq!(found.hops, 2);
    assert!(set.find_by_next_hop(&hop(2)).is_none(), "must not invent a route");
  }

  #[test]
  fn culling_drops_paths_that_have_expired() {
    let set = PathSet::from_single(entry(1, 2, vec![], 100.0), 4);
    let mut live_set = set;
    live_set.cull(50.0, |_| true);
    assert_eq!(live_set.len(), 1, "a path inside its lifetime must survive a cull");

    let mut stale = PathSet::from_single(entry(1, 2, vec![], 100.0), 4);
    stale.cull(200.0, |_| true);
    assert!(stale.is_empty(), "an expired path must be culled");
  }

  // ── The honesty boundary ─────────────────────────────────────────────────

  #[test]
  fn proving_the_routing_layer_does_not_enable_the_mesh_tier() {
    // Every assertion above is about decisions, not delivery. Nothing here
    // started a node or moved a packet, so the courier must remain unavailable
    // and the delivery tier must remain Offline. If this ever fails, something
    // has started claiming T3 on the strength of a logic test.
    let probe = crate::rns_t3::probe();
    assert!(probe.compiled_in, "this module only compiles under rns-t3");
    assert!(!probe.courier_available);

    let tier = crate::delivery_tier::classify(crate::delivery_tier::TierInputs {
      relays_connected: 0,
      lan_available: false,
      mesh_transport_available: probe.compiled_in,
      // No peer has been observed, because nothing was transmitted.
      mesh_peer_observed: false,
    });
    assert_eq!(tier, crate::delivery_tier::DeliveryTier::Offline);
  }
}
