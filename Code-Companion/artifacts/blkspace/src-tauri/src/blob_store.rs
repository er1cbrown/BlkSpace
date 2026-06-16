use sha2::{Sha256, Digest};
use std::path::{Path, PathBuf};
use std::fs;
use serde::Serialize;

fn validate_hash(hash: &str) -> bool {
  hash.len() == 64 && hash.chars().all(|c| matches!(c, '0'..='9' | 'a'..='f'))
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BlobInfo {
  pub hash: String,
  pub cid: Option<String>,
  pub filename: String,
  pub mime_type: String,
  pub file_size: i64,
  pub uploader_handle: String,
  pub created_at: String,
}

pub struct BlobStore {
  dir: PathBuf,
}

impl BlobStore {
  pub fn new(base_dir: &Path) -> Self {
    let dir = base_dir.join("blobs");
    fs::create_dir_all(&dir).ok();
    BlobStore { dir }
  }

  pub fn hash_data(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
  }

  pub fn store_blob(&self, data: &[u8]) -> Result<String, String> {
    let hash = Self::hash_data(data);
    let path = self.dir.join(&hash);
    if !path.exists() {
      fs::write(&path, data).map_err(|e| format!("Failed to write blob to disk: {}", e))?;
    }
    Ok(hash)
  }

  pub fn blob_path(&self, hash: &str) -> PathBuf {
    // Hash should be validated before reaching here
    self.dir.join(hash)
  }

  pub fn get_blob(&self, hash: &str) -> Option<Vec<u8>> {
    if !validate_hash(hash) { return None; }
    let path = self.dir.join(hash);
    fs::read(&path).ok()
  }

  pub fn blob_exists(&self, hash: &str) -> bool {
    if !validate_hash(hash) { return false; }
    self.dir.join(hash).exists()
  }

  pub fn delete_blob(&self, hash: &str) -> bool {
    if !validate_hash(hash) { return false; }
    fs::remove_file(&self.dir.join(hash)).is_ok()
  }
}
