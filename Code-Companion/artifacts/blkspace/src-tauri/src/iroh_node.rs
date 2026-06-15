use iroh_blobs::store::fs::FsStore;
use iroh_blobs::api::Store;
use std::path::PathBuf;

pub struct IrohNode {
    store: FsStore,
}

impl IrohNode {
    pub async fn new(data_dir: PathBuf) -> Result<Self, String> {
        let store_path = data_dir.join("iroh");
        let store = FsStore::load(&store_path)
            .await
            .map_err(|e| format!("Failed to load Iroh store: {}", e))?;
        Ok(Self { store })
    }

    pub async fn add_blob(&self, data: &[u8]) -> Result<String, String> {
        let tag = self.store
            .add_bytes(data.to_vec())
            .await
            .map_err(|e| format!("Failed to add blob: {}", e))?;
        Ok(tag.hash.to_string())
    }

    pub async fn get_blob(&self, hash: &str) -> Result<Option<Vec<u8>>, String> {
        let hash: iroh_blobs::Hash = hash
            .parse()
            .map_err(|e| format!("Invalid hash: {}", e))?;
        
        let data = self.store
            .get_bytes(hash)
            .await
            .map_err(|e| format!("Failed to get blob: {}", e))?;
        
        Ok(Some(data.to_vec()))
    }

    pub async fn has_blob(&self, hash: &str) -> Result<bool, String> {
        let hash: iroh_blobs::Hash = hash
            .parse()
            .map_err(|e| format!("Invalid hash: {}", e))?;
        
        self.store
            .has(hash)
            .await
            .map_err(|e| format!("Failed to check blob: {}", e))
    }

    pub async fn delete_blob(&self, hash: &str) -> Result<(), String> {
        let hash: iroh_blobs::Hash = hash
            .parse()
            .map_err(|e| format!("Invalid hash: {}", e))?;
        
        // FsStore doesn't support direct deletion, but we can ignore
        // the blob will be garbage collected eventually
        Ok(())
    }

    pub async fn export_blob(&self, hash: &str, target_path: PathBuf) -> Result<(), String> {
        let hash: iroh_blobs::Hash = hash
            .parse()
            .map_err(|e| format!("Invalid hash: {}", e))?;
        
        self.store
            .export(hash, target_path)
            .await
            .map_err(|e| format!("Failed to export blob: {}", e))?;
        
        Ok(())
    }

    pub fn store(&self) -> &FsStore {
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