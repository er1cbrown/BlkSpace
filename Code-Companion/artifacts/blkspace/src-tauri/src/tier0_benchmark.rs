use crate::blob_store::BlobStore;
use crate::db::Database;
use serde::Serialize;
use std::time::Instant;

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
}

pub fn run_tier0_benchmarks(db: &Database, blob_store: &BlobStore) -> Tier0BenchmarkReport {
  let mut metrics = Vec::new();

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
  let _ = db.list_posts(None, Some("bench_user")).unwrap();
  let feed_ms = feed_start.elapsed().as_millis() as u64;
  metrics.push(Tier0BenchmarkMetric {
    name: "Feed load (50 posts)".to_string(),
    duration_ms: feed_ms,
    target_ms: 2000,
    pass: feed_ms < 2000,
  });

  let post_start = Instant::now();
  let _ = db
    .create_post("bench_user", "Benchmark single post", "tsu", "", &[])
    .unwrap();
  let post_ms = post_start.elapsed().as_millis() as u64;
  metrics.push(Tier0BenchmarkMetric {
    name: "Post creation".to_string(),
    duration_ms: post_ms,
    target_ms: 1000,
    pass: post_ms < 1000,
  });

  let payload: Vec<u8> = (0..512 * 1024).map(|i| (i % 256) as u8).collect();
  let blob_start = Instant::now();
  let hash = blob_store.store_blob(&payload).unwrap();
  let _ = blob_store.get_blob(&hash).unwrap();
  let blob_ms = blob_start.elapsed().as_millis() as u64;
  metrics.push(Tier0BenchmarkMetric {
    name: "Blob store round-trip (512 KiB)".to_string(),
    duration_ms: blob_ms,
    target_ms: 30_000,
    pass: blob_ms < 30_000,
  });

  let all_pass = metrics.iter().all(|m| m.pass);
  Tier0BenchmarkReport {
        metrics,
        all_pass,
        device_note: "Run on Tier 0 hardware (4GB RAM / i3) and compare targets in DEVICE_MESH_TESTING.md §4.1".to_string(),
      }
}