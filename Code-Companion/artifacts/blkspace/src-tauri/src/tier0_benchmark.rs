use crate::blob_store::BlobStore;
use crate::db::Database;
use serde::Serialize;
use std::sync::OnceLock;
use std::time::Instant;

/// Product shell target: Tauri window path ready (setup complete) under 3s.
pub const SHELL_READY_TARGET_MS: u64 = 3_000;
/// Product shell target: first `/feed` interactive mark under 3s from process start.
pub const FEED_INTERACTIVE_TARGET_MS: u64 = 3_000;

static PROCESS_START: OnceLock<Instant> = OnceLock::new();
static SHELL_READY_MS: OnceLock<u64> = OnceLock::new();
static FEED_INTERACTIVE_MS: OnceLock<u64> = OnceLock::new();
static DB_OPEN_MS: OnceLock<u64> = OnceLock::new();

/// Call at the very start of `run()` (before DB open / heavy init).
pub fn mark_process_start() {
  let _ = PROCESS_START.set(Instant::now());
}

/// Record time from process start through SQLite/Turso open (diagnostic).
pub fn mark_db_open_complete() {
  if let Some(start) = PROCESS_START.get() {
    let _ = DB_OPEN_MS.set(start.elapsed().as_millis() as u64);
  }
}

/// Call when Tauri `setup` finishes — window show path is unblocked.
pub fn mark_shell_ready() {
  if let Some(start) = PROCESS_START.get() {
    let _ = SHELL_READY_MS.set(start.elapsed().as_millis() as u64);
  }
}

/// Milliseconds from process start to now, if process start was marked.
pub fn process_elapsed_ms() -> Option<u64> {
  PROCESS_START
    .get()
    .map(|start| start.elapsed().as_millis() as u64)
}

/// Frontend calls once when `/feed` first becomes interactive (posts query settled).
/// Returns the recorded process-start → interactive duration in ms.
pub fn mark_feed_interactive() -> Option<u64> {
  let ms = process_elapsed_ms()?;
  let _ = FEED_INTERACTIVE_MS.set(ms);
  Some(ms)
}

pub fn shell_ready_ms() -> Option<u64> {
  SHELL_READY_MS.get().copied()
}

pub fn feed_interactive_ms() -> Option<u64> {
  FEED_INTERACTIVE_MS.get().copied()
}

pub fn db_open_ms() -> Option<u64> {
  DB_OPEN_MS.get().copied()
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tier0BenchmarkMetric {
  pub name: String,
  pub duration_ms: u64,
  pub target_ms: u64,
  pub pass: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tier0BenchmarkReport {
  pub metrics: Vec<Tier0BenchmarkMetric>,
  pub all_pass: bool,
  pub device_note: String,
  /// Process start → setup complete (window path). Present in live Tauri only.
  pub shell_ready_ms: Option<u64>,
  /// Process start → first `/feed` interactive mark. None until feed paints once.
  pub feed_interactive_ms: Option<u64>,
  /// Process start → DB open complete (diagnostic).
  pub db_open_ms: Option<u64>,
}

fn push_metric(metrics: &mut Vec<Tier0BenchmarkMetric>, name: &str, duration_ms: u64, target_ms: u64) {
  metrics.push(Tier0BenchmarkMetric {
    name: name.to_string(),
    duration_ms,
    target_ms,
    pass: duration_ms < target_ms,
  });
}

/// Append cold-start shell metrics when process marks were recorded (live Tauri).
fn append_boot_metrics(metrics: &mut Vec<Tier0BenchmarkMetric>) {
  if let Some(ms) = db_open_ms() {
    // Soft diagnostic — 1.5s budget; does not replace shell-ready gate.
    push_metric(metrics, "DB open (process)", ms, 1_500);
  }
  if let Some(ms) = shell_ready_ms() {
    push_metric(
      metrics,
      "Tauri shell ready (process)",
      ms,
      SHELL_READY_TARGET_MS,
    );
  }
  if let Some(ms) = feed_interactive_ms() {
    push_metric(
      metrics,
      "Feed interactive (process)",
      ms,
      FEED_INTERACTIVE_TARGET_MS,
    );
  }
}

pub fn run_tier0_benchmarks(db: &Database, blob_store: &BlobStore) -> Tier0BenchmarkReport {
  let mut metrics = Vec::new();

  // Cold-start marks first so the report always surfaces shell gates when available.
  append_boot_metrics(&mut metrics);

  // Seed 50 posts for feed load test
  let _ = db.create_user("bench_user", "Bench User", "");
  for i in 0..50 {
    let _ = db.create_post(
      "bench_user",
      &format!("Benchmark post #{i}"),
      "tsu",
      "",
      &[],
    );
  }

  let feed_start = Instant::now();
  let _ = db
    .list_posts(None, Some("bench_user"), None, None)
    .unwrap();
  let feed_ms = feed_start.elapsed().as_millis() as u64;
  push_metric(&mut metrics, "Feed load (50 posts)", feed_ms, 2_000);

  let post_start = Instant::now();
  let _ = db
    .create_post("bench_user", "Benchmark single post", "tsu", "", &[])
    .unwrap();
  let post_ms = post_start.elapsed().as_millis() as u64;
  push_metric(&mut metrics, "Post creation", post_ms, 1_000);

  let payload: Vec<u8> = (0..512 * 1024).map(|i| (i % 256) as u8).collect();
  let blob_start = Instant::now();
  let hash = blob_store.store_blob(&payload).unwrap();
  let _ = blob_store.get_blob(&hash).unwrap();
  let blob_ms = blob_start.elapsed().as_millis() as u64;
  push_metric(
    &mut metrics,
    "Blob store round-trip (512 KiB)",
    blob_ms,
    30_000,
  );

  let all_pass = metrics.iter().all(|m| m.pass);
  let shell = shell_ready_ms();
  let feed_ix = feed_interactive_ms();
  let db_ms = db_open_ms();

  let mut note = String::from(
    "Run on Tier 0 hardware (4GB RAM / i3). Shell targets: Tauri shell ready <3s, /feed interactive <3s (process clock). SQLite/blob gates: feed <2s, post <1s, blob <30s. See DEVICE_MESH_TESTING.md §4.1 and YARD_RELEASE_CHECKLIST A4.",
  );
  if shell.is_none() {
    note.push_str(
      " Note: process boot marks absent (cargo test / headless) — shell metrics only appear in live Tauri.",
    );
  } else if feed_ix.is_none() {
    note.push_str(
      " Note: open /feed once this session so Feed interactive (process) is recorded before re-running the bench.",
    );
  }

  Tier0BenchmarkReport {
    metrics,
    all_pass,
    device_note: note,
    shell_ready_ms: shell,
    feed_interactive_ms: feed_ix,
    db_open_ms: db_ms,
  }
}

#[cfg(test)]
mod boot_mark_tests {
  use super::*;

  #[test]
  fn mark_process_and_shell_ready_records_ms() {
    // Isolated process for cargo test: marks may already be set if other tests ran.
    // Only assert API shape when unset → set path works once.
    if PROCESS_START.get().is_none() {
      mark_process_start();
      mark_db_open_complete();
      mark_shell_ready();
      assert!(db_open_ms().is_some());
      assert!(shell_ready_ms().is_some());
      let feed = mark_feed_interactive();
      assert!(feed.is_some());
      assert_eq!(feed_interactive_ms(), feed);
    }
  }
}
