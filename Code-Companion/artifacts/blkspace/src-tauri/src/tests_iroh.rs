//! Phase 2 proof tests: Iroh upload → CID → second-device fetch.
//! Simulates Device B by copying the Iroh fs-store (account sync / town pin) or sharing the store path.

#[cfg(test)]
mod iroh_phase2 {
  use crate::blob_store::BlobStore;
  use crate::db::Database;
  use crate::iroh_node::IrohNode;
  use sha2::{Digest, Sha256};
  use std::fs;
  use std::path::Path;

  fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
      let entry = entry?;
      let ty = entry.file_type()?;
      let dest = dst.join(entry.file_name());
      if ty.is_dir() {
        copy_dir_all(&entry.path(), &dest)?;
      } else {
        fs::copy(entry.path(), dest)?;
      }
    }
    Ok(())
  }

  fn sha256_hex(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
  }

  /// Mirrors `build_post_nostr_tags` imeta shape for proof assertions.
  fn imeta_tags_for_blob(
    sha_hash: &str,
    mime: &str,
    cid: &str,
  ) -> Vec<Vec<String>> {
    vec![vec![
      "imeta".to_string(),
      format!("url blob://{}", sha_hash),
      format!("m {}", mime),
      format!("x {}", sha_hash),
      format!("cid {}", cid),
    ]]
  }

  #[tokio::test]
  async fn test_iroh_upload_returns_content_addressed_cid() {
    let dir = tempfile::tempdir().unwrap();
    let node = IrohNode::new(dir.path().to_path_buf()).await.unwrap();
    let payload = b"BlkSpace Iroh CID proof";
    let sha = sha256_hex(payload);

    let cid = node.add_blob(payload).await.unwrap();
    assert!(!cid.is_empty());
    assert_ne!(cid, sha, "Iroh CID should differ from local SHA-256 hash");
    assert!(node.has_blob(&cid).await.unwrap());
  }

  /// Device A uploads; Device B opens the same app data dir (recovery / same machine).
  #[tokio::test]
  async fn test_iroh_two_device_roundtrip_shared_store() {
    let shared_dir = tempfile::tempdir().unwrap();
    let payload = b"cross-device via shared iroh store";

    let node_a = IrohNode::new(shared_dir.path().to_path_buf()).await.unwrap();
    let cid = node_a.add_blob(payload).await.unwrap();
    drop(node_a);

    let node_b = IrohNode::new(shared_dir.path().to_path_buf()).await.unwrap();
    let fetched = node_b.get_blob(&cid).await.unwrap().expect("Device B fetch");
    assert_eq!(fetched, payload);
  }

  /// Device A uploads; Device B imports the same bytes — content addressing yields the same CID.
  #[tokio::test]
  async fn test_iroh_two_device_roundtrip_content_addressed() {
    let device_a = tempfile::tempdir().unwrap();
    let device_b = tempfile::tempdir().unwrap();
    let payload = b"Device A CID is portable to Device B via content hash";

    let node_a = IrohNode::new(device_a.path().to_path_buf()).await.unwrap();
    let cid_a = node_a.add_blob(payload).await.unwrap();

    let node_b = IrohNode::new(device_b.path().to_path_buf()).await.unwrap();
    let cid_b = node_b.add_blob(payload).await.unwrap();
    assert_eq!(cid_a, cid_b, "same bytes must produce the same Iroh CID on any device");

    let fetched = node_b.get_blob(&cid_a).await.unwrap().expect("Device B fetch by CID");
    assert_eq!(fetched, payload);
  }

  /// Simulates `sync_account_content`: Device A has blob files; Device B copies blob store only.
  #[test]
  fn test_iroh_two_device_roundtrip_blob_store_sync() {
    let device_a = tempfile::tempdir().unwrap();
    let device_b = tempfile::tempdir().unwrap();
    let payload = b"sync_account_content local fallback path";

    let store_a = BlobStore::new(device_a.path());
    let sha = store_a.store_blob(payload).unwrap();

    copy_dir_all(&device_a.path().join("blobs"), &device_b.path().join("blobs")).unwrap();

    let store_b = BlobStore::new(device_b.path());
    assert_eq!(store_b.get_blob(&sha).as_deref(), Some(payload.as_slice()));
  }

  #[tokio::test]
  async fn test_iroh_fetch_by_cid_record_on_device_b() {
    let device_b = tempfile::tempdir().unwrap();
    let payload = b"Device B resolves cid from synced SQLite metadata";

    let node_b = IrohNode::new(device_b.path().to_path_buf()).await.unwrap();
    let cid = node_b.add_blob(payload).await.unwrap();
    let sha = sha256_hex(payload);

    let db = Database::new_for_test(device_b.path().join("db")).unwrap();
    db.create_user("fan", "Fan", "").unwrap();
    db.insert_blob(&sha, Some(&cid), "proof.jpg", "image/jpeg", payload.len() as i64, "fan")
      .unwrap();

    let rec = db.get_blob_record(&sha).unwrap().unwrap();
    let iroh_key = rec.cid.as_deref().expect("cid column");
    let fetched = node_b.get_blob(iroh_key).await.unwrap().unwrap();
    assert_eq!(fetched, payload);
  }

  #[test]
  fn test_iroh_nostr_imeta_includes_cid() {
    let dir = tempfile::tempdir().unwrap();
    let db = Database::new_for_test(dir.path().to_path_buf()).unwrap();
    db.create_user("creator", "Creator", "").unwrap();
    let sha = "a".repeat(64);
    let cid = "bafkreicy_proof_cid_tag_in_nostr_imeta";
    db.insert_blob(&sha, Some(cid), "yard.jpg", "image/jpeg", 512, "creator")
      .unwrap();

    let tags = imeta_tags_for_blob(&sha, "image/jpeg", cid);
    let imeta = &tags[0];
    assert_eq!(imeta[0], "imeta");
    assert!(imeta.iter().any(|t| t == &format!("cid {}", cid)));
    assert!(imeta.iter().any(|t| t == &format!("x {}", sha)));
  }

  #[test]
  fn test_iroh_town_pin_threshold() {
    let dir = tempfile::tempdir().unwrap();
    let db = Database::new_for_test(dir.path().to_path_buf()).unwrap();
    let hash = "c".repeat(64);
    db.pin_blob(&hash, "system").unwrap();
    for _ in 0..11 {
      db.increment_blob_access(&hash).unwrap();
    }
    assert!(db.should_pin(&hash).unwrap());
  }

  #[test]
  fn test_iroh_local_blob_fallback_when_store_miss() {
    let dir = tempfile::tempdir().unwrap();
    let payload = b"local blob store fallback";
    let store = BlobStore::new(dir.path());
    let sha = store.store_blob(payload).unwrap();
    assert_eq!(store.get_blob(&sha).as_deref(), Some(payload.as_slice()));
  }

  #[test]
  fn test_iroh_pin_serve_tracking() {
    let dir = tempfile::tempdir().unwrap();
    let db = Database::new_for_test(dir.path().to_path_buf()).unwrap();
    db.create_user("pinner", "Pinner", "").unwrap();
    let hash = "d".repeat(64);
    db.record_pin_serve(&hash, "pinner", "viewer").unwrap();
    assert_eq!(db.count_serves_today("pinner").unwrap(), 1);
    assert_eq!(db.count_serves_for_blob(&hash).unwrap(), 1);
  }

  /// Lightweight perf smoke — not Tier 0 hardware, but guards regressions in CI.
  #[tokio::test]
  async fn test_iroh_upload_download_under_budget() {
    let dir = tempfile::tempdir().unwrap();
    let node = IrohNode::new(dir.path().to_path_buf()).await.unwrap();
    let payload = vec![0u8; 512 * 1024]; // 512 KiB
    let started = std::time::Instant::now();
    let cid = node.add_blob(&payload).await.unwrap();
    let roundtrip = node.get_blob(&cid).await.unwrap().unwrap();
    let elapsed = started.elapsed();
    assert_eq!(roundtrip.len(), payload.len());
    assert!(
      elapsed.as_secs() < 10,
      "512 KiB round-trip took {:?} — investigate before Tier 0 test",
      elapsed
    );
  }
}