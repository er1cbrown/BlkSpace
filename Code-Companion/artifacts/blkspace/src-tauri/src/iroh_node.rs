//! Full-build Iroh node: fs store + Endpoint + blobs protocol (sendme-compatible).
//!
//! Same crates sendme 0.36 uses (iroh 1 + iroh-blobs 0.103). We do **not** depend on
//! the sendme CLI crate. Yard builds omit this module (`--no-default-features`).

use iroh::endpoint::presets;
use iroh::protocol::Router;
use iroh::Endpoint;
use iroh_blobs::store::fs::FsStore;
use iroh_blobs::ticket::BlobTicket;
use iroh_blobs::{BlobFormat, BlobsProtocol, Hash};
use std::path::PathBuf;
use std::str::FromStr;
use tokio::io::AsyncReadExt;

pub struct IrohNode {
    store: FsStore,
    endpoint: Endpoint,
    /// Keeps ALPN accept loop alive so peers can fetch while the app is open.
    _router: Router,
}

impl IrohNode {
    pub async fn new(data_dir: PathBuf) -> Result<Self, String> {
        let store_path = data_dir.join("iroh");
        let store = FsStore::load(&store_path)
            .await
            .map_err(|e| format!("Failed to load Iroh store: {e}"))?;
        let endpoint = Endpoint::bind(presets::N0)
            .await
            .map_err(|e| format!("Failed to bind Iroh endpoint: {e}"))?;
        let blobs = BlobsProtocol::new(store.as_ref(), None);
        let router = Router::builder(endpoint.clone())
            .accept(iroh_blobs::ALPN, blobs)
            .spawn();
        // Address must be in the ticket or peers only have a node id (download fails locally).
        let _ = tokio::time::timeout(std::time::Duration::from_secs(8), endpoint.online()).await;
        Ok(Self {
            store,
            endpoint,
            _router: router,
        })
    }

    pub async fn add_blob(&self, data: &[u8]) -> Result<String, String> {
        let tag = self
            .store
            .blobs()
            .add_slice(data)
            .await
            .map_err(|e| format!("Failed to import blob to Iroh: {e}"))?;
        // Temp tags die with `tag`; persist so GC cannot drop the blob while the app runs.
        let name = format!("bkspc-{}", tag.hash);
        self.store
            .tags()
            .set(name, tag.hash)
            .await
            .map_err(|e| format!("Failed to persist Iroh tag: {e}"))?;
        let _ = self.store.sync_db().await;
        Ok(tag.hash.to_string())
    }

    pub async fn shutdown(self) -> Result<(), String> {
        let _ = self.store.sync_db().await;
        self._router
            .shutdown()
            .await
            .map_err(|e| format!("Iroh router shutdown: {e}"))?;
        self.endpoint.close().await;
        Ok(())
    }

    pub async fn get_blob(&self, hash_str: &str) -> Result<Option<Vec<u8>>, String> {
        let hash = parse_hash(hash_str)?;
        match self.store.blobs().has(hash).await {
            Ok(true) => {}
            Ok(false) => return Ok(None),
            Err(e) => return Err(format!("Store has error: {e}")),
        }
        match self.store.blobs().get_bytes(hash).await {
            Ok(bytes) => Ok(Some(bytes.to_vec())),
            Err(_) => {
                // Partial / large: stream via reader
                let mut reader = self.store.blobs().reader(hash);
                let mut buf = Vec::new();
                reader
                    .read_to_end(&mut buf)
                    .await
                    .map_err(|e| format!("Failed to read blob data: {e}"))?;
                Ok(Some(buf))
            }
        }
    }

    pub async fn has_blob(&self, hash_str: &str) -> Result<bool, String> {
        let hash = match parse_hash(hash_str) {
            Ok(h) => h,
            Err(_) => return Ok(false),
        };
        self.store
            .blobs()
            .has(hash)
            .await
            .map_err(|e| format!("Store has error: {e}"))
    }

    pub async fn ticket_for_hash(&self, hash_str: &str) -> Result<String, String> {
        let hash = parse_hash(hash_str)?;
        let _ = tokio::time::timeout(std::time::Duration::from_secs(5), self.endpoint.online()).await;
        let ticket = BlobTicket::new(self.endpoint.addr(), hash, BlobFormat::Raw);
        Ok(ticket.to_string())
    }

    /// Fetch bytes from a sendme/iroh BlobTicket (hole-punch + n0 relay fallback).
    pub async fn download_ticket(&self, ticket_str: &str) -> Result<Vec<u8>, String> {
        let ticket: BlobTicket = ticket_str
            .parse()
            .map_err(|e| format!("Invalid BlobTicket: {e}"))?;
        let downloader = self.store.downloader(&self.endpoint);
        downloader
            .download(ticket.hash(), Some(ticket.addr().id))
            .await
            .map_err(|e| format!("Iroh P2P download failed: {e}"))?;
        let bytes = self
            .store
            .blobs()
            .get_bytes(ticket.hash())
            .await
            .map_err(|e| format!("Failed to read downloaded blob: {e}"))?;
        Ok(bytes.to_vec())
    }

    #[allow(dead_code)]
    pub async fn export_blob(&self, hash_str: &str, target_path: PathBuf) -> Result<(), String> {
        let hash = parse_hash(hash_str)?;
        self.store
            .blobs()
            .export(hash, target_path)
            .await
            .map_err(|e| format!("Failed to export blob: {e}"))?;
        Ok(())
    }
}

fn parse_hash(hash_str: &str) -> Result<Hash, String> {
    // Hash::from_str panics on some short garbage (data-encoding length assert).
    if hash_str.len() < 52 {
        return Err("Invalid Iroh hash".into());
    }
    Hash::from_str(hash_str).map_err(|e| format!("Invalid Iroh hash: {e}"))
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

    #[tokio::test]
    async fn test_ticket_roundtrip_same_node() {
        let dir = tempdir().unwrap();
        let node = IrohNode::new(dir.path().to_path_buf()).await.unwrap();
        let data = b"ticket local";
        let hash = node.add_blob(data).await.unwrap();
        let ticket = node.ticket_for_hash(&hash).await.unwrap();
        assert!(!ticket.is_empty());
        // Same-node fetch is local store; live P2P is tests_iroh::test_iroh_p2p_ticket_two_nodes.
        let again = node.get_blob(&hash).await.unwrap();
        assert_eq!(again, Some(data.to_vec()));
    }
}
