use bytes::Bytes;
use iroh_blobs::store::fs::Store;
use iroh_blobs::store::{Map as _, MapEntry as _, Store as _};
use iroh_blobs::{BlobFormat, Hash};
use iroh_io::AsyncSliceReader;
use std::path::PathBuf;

pub struct IrohNode {
    store: Store,
}

impl IrohNode {
    pub async fn new(data_dir: PathBuf) -> Result<Self, String> {
        let store_path = data_dir.join("iroh");
        let store = Store::load(&store_path)
            .await
            .map_err(|e| format!("Failed to load Iroh store: {}", e))?;
        Ok(Self { store })
    }

    pub async fn add_blob(&self, data: &[u8]) -> Result<String, String> {
        // Bring Store trait methods via the use above
        let tag = self.store
            .import_bytes(Bytes::from(data.to_vec()), BlobFormat::Raw)
            .await
            .map_err(|e| format!("Failed to import blob to Iroh: {}", e))?;
        Ok(tag.hash().to_string())
    }

    pub async fn get_blob(&self, hash_str: &str) -> Result<Option<Vec<u8>>, String> {
        let hash: Hash = hash_str
            .parse()
            .map_err(|e| format!("Invalid Iroh hash: {}", e))?;
        
        match self.store.get(&hash).await.map_err(|e| format!("Store get error: {}", e))? {
            Some(entry) => {
                let size = entry.size().value() as usize;
                // data_reader() on the concrete fs entry is sync (returns the reader impl directly);
                // the async version in MapEntry trait just wraps it. Use inherent for simplicity.
                let mut reader = entry.data_reader();
                // read_at(offset, len) -> Bytes (not fill-in-place)
                let data: bytes::Bytes = reader
                    .read_at(0, size)
                    .await
                    .map_err(|e| format!("Failed to read blob data: {}", e))?;
                Ok(Some(data.to_vec()))
            }
            None => Ok(None),
        }
    }

    #[allow(dead_code)]
    pub async fn has_blob(&self, hash_str: &str) -> Result<bool, String> {
        let hash: Hash = hash_str
            .parse()
            .map_err(|e| format!("Invalid Iroh hash: {}", e))?;
        
        let entry = self.store.get(&hash).await.map_err(|e| format!("Store get error: {}", e))?;
        Ok(entry.is_some())
    }

    #[allow(dead_code)]
    pub async fn delete_blob(&self, _hash: &str) -> Result<(), String> {
        // Deletion is best-effort; rely on GC or higher-level unpin for now.
        // Full impl would use store.delete(vec![hash]).await
        Ok(())
    }

    #[allow(dead_code)]
    pub async fn export_blob(&self, hash_str: &str, target_path: PathBuf) -> Result<(), String> {
        // Simple export: read via our get_blob then write file (small media only)
        if let Some(data) = self.get_blob(hash_str).await? {
            std::fs::write(&target_path, data)
                .map_err(|e| format!("Failed to write export file: {}", e))?;
            return Ok(());
        }
        Err("Blob not found for export".to_string())
    }

    #[allow(dead_code)]
    pub fn store(&self) -> &Store {
        &self.store
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_add_and_get_blob() {
        let dir = tempdir().unwrap();
        let node = IrohNode::new(dir.path().to_path_buf()).await.unwrap();
        
        let data = b"Hello, Iroh!";
        let hash = node.add_blob(data).await.unwrap();
        
        assert!(!hash.is_empty());
        
        let retrieved = node.get_blob(&hash).await.unwrap();
        assert_eq!(retrieved, Some(data.to_vec()));
    }

    #[tokio::test]
    async fn test_has_blob() {
        let dir = tempdir().unwrap();
        let node = IrohNode::new(dir.path().to_path_buf()).await.unwrap();
        
        let data = b"Test data";
        let hash = node.add_blob(data).await.unwrap();
        
        assert!(node.has_blob(&hash).await.unwrap());
        assert!(!node.has_blob("invalid_hash").await.unwrap_or(false));
    }
}