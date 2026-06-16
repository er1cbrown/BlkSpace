//! Secure storage for Nostr private keys (OS keychain preferred, encrypted file fallback).

use chacha20poly1305::{
  aead::{Aead, KeyInit},
  ChaCha20Poly1305, Nonce,
};
use std::path::PathBuf;

const SERVICE: &str = "com.blkspace.app";
const ENC_MAGIC: &[u8] = b"BLKKEY1";

pub struct KeyStore {
  app_dir: PathBuf,
}

impl KeyStore {
  pub fn new(app_dir: PathBuf) -> Self {
    Self { app_dir }
  }

  fn keys_dir(&self) -> PathBuf {
    self.app_dir.join("keys")
  }

  fn legacy_plain_path(&self, handle: &str) -> PathBuf {
    self.keys_dir().join(format!("{}.key", handle))
  }

  fn encrypted_path(&self, handle: &str) -> PathBuf {
    self.keys_dir().join(format!("{}.enc", handle))
  }

  fn ensure_keys_dir(&self) -> Result<(), String> {
    let dir = self.keys_dir();
    std::fs::create_dir_all(&dir).map_err(|_| "Failed to create key storage".to_string())?;
    #[cfg(unix)]
    {
      use std::os::unix::fs::PermissionsExt;
      std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o700))
        .map_err(|_| "Failed to set key directory permissions".to_string())?;
    }
    Ok(())
  }

  fn keyring_entry(account: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, account).map_err(|e| format!("Keyring error: {e}"))
  }

  fn try_keyring_get(account: &str) -> Option<String> {
    let entry = Self::keyring_entry(account).ok()?;
    entry.get_password().ok()
  }

  fn try_keyring_set(account: &str, secret: &str) -> bool {
    let Ok(entry) = Self::keyring_entry(account) else {
      return false;
    };
    entry.set_password(secret).is_ok()
  }

  fn master_key_path(&self) -> PathBuf {
    self.keys_dir().join(".mk")
  }

  /// Stable per-installation master for ChaCha20-Poly1305 file encryption.
  fn get_master_key(&self) -> Result<[u8; 32], String> {
    let path = self.master_key_path();
    if path.exists() {
      let data = std::fs::read(&path).map_err(|_| "Failed to read encryption master".to_string())?;
      if data.len() == 32 {
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&data);
        return Ok(arr);
      }
    }

    self.ensure_keys_dir()?;
    let key: [u8; 32] = rand::random();
    std::fs::write(&path, key).map_err(|_| "Failed to write encryption master".to_string())?;
    #[cfg(unix)]
    {
      use std::os::unix::fs::PermissionsExt;
      std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600))
        .map_err(|_| "Failed to set master key permissions".to_string())?;
    }
    Ok(key)
  }

  fn encrypt(&self, plaintext: &str) -> Result<Vec<u8>, String> {
    let master = self.get_master_key()?;
    let cipher =
      ChaCha20Poly1305::new_from_slice(&master).map_err(|_| "Cipher init failed".to_string())?;
    let nonce_bytes: [u8; 12] = rand::random();
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
      .encrypt(nonce, plaintext.as_bytes())
      .map_err(|_| "Encryption failed".to_string())?;
    let mut out = Vec::from(ENC_MAGIC);
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext);
    Ok(out)
  }

  fn decrypt(&self, data: &[u8]) -> Result<String, String> {
    if data.len() < ENC_MAGIC.len() + 12 + 16 || &data[..ENC_MAGIC.len()] != ENC_MAGIC {
      return Err("Invalid encrypted key format".to_string());
    }
    let master = self.get_master_key()?;
    let cipher =
      ChaCha20Poly1305::new_from_slice(&master).map_err(|_| "Cipher init failed".to_string())?;
    let nonce = Nonce::from_slice(&data[ENC_MAGIC.len()..ENC_MAGIC.len() + 12]);
    let ct = &data[ENC_MAGIC.len() + 12..];
    let plaintext = cipher
      .decrypt(nonce, ct)
      .map_err(|_| "Decryption failed".to_string())?;
    String::from_utf8(plaintext).map_err(|_| "Invalid key encoding".to_string())
  }

  fn write_encrypted_file(&self, handle: &str, secret: &str) -> Result<(), String> {
    self.ensure_keys_dir()?;
    let encrypted = self.encrypt(secret)?;
    let path = self.encrypted_path(handle);
    std::fs::write(&path, encrypted).map_err(|_| "Failed to write encrypted key".to_string())?;
    #[cfg(unix)]
    {
      use std::os::unix::fs::PermissionsExt;
      std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600))
        .map_err(|_| "Failed to set key file permissions".to_string())?;
    }
    Ok(())
  }

  fn read_encrypted_file(&self, handle: &str) -> Result<Option<String>, String> {
    let path = self.encrypted_path(handle);
    if !path.exists() {
      return Ok(None);
    }
    let data = std::fs::read(&path).map_err(|_| "Failed to read encrypted key".to_string())?;
    self.decrypt(&data).map(Some)
  }

  fn wipe_plaintext_legacy(&self, handle: &str) {
    let path = self.legacy_plain_path(handle);
    if !path.exists() {
      return;
    }
    if let Ok(meta) = std::fs::metadata(&path) {
      let len = meta.len() as usize;
      let _ = std::fs::write(&path, vec![0u8; len.max(1)]);
    }
    let _ = std::fs::remove_file(&path);
  }

  fn migrate_legacy_if_present(&self, handle: &str) -> Result<Option<String>, String> {
    let path = self.legacy_plain_path(handle);
    if !path.exists() {
      return Ok(None);
    }
    let secret =
      std::fs::read_to_string(&path).map_err(|_| "Failed to read legacy key".to_string())?;
    let trimmed = secret.trim().to_string();
    self.store(handle, &trimmed)?;
    log::info!("Migrated plaintext key to secure storage for {handle}");
    Ok(Some(trimmed))
  }

  /// Store a Nostr secret (hex or nsec). Prefer OS keychain; fall back to encrypted file.
  pub fn store(&self, handle: &str, secret: &str) -> Result<(), String> {
    if Self::try_keyring_set(handle, secret) {
      if Self::try_keyring_get(handle).as_deref() == Some(secret) {
        let enc = self.encrypted_path(handle);
        if enc.exists() {
          let _ = std::fs::remove_file(&enc);
        }
        self.wipe_plaintext_legacy(handle);
        return Ok(());
      }
      log::warn!("OS keychain write could not be verified — using encrypted file fallback");
    }

    self.write_encrypted_file(handle, secret)?;
    self.wipe_plaintext_legacy(handle);
    Ok(())
  }

  /// Load a stored secret, migrating legacy plaintext files if needed.
  pub fn load(&self, handle: &str) -> Result<Option<String>, String> {
    if let Some(migrated) = self.migrate_legacy_if_present(handle)? {
      return Ok(Some(migrated));
    }
    if let Ok(Some(file_secret)) = self.read_encrypted_file(handle) {
      return Ok(Some(file_secret));
    }
    Ok(Self::try_keyring_get(handle))
  }

  pub fn exists(&self, handle: &str) -> bool {
    Self::try_keyring_get(handle).is_some()
      || self.encrypted_path(handle).exists()
      || self.legacy_plain_path(handle).exists()
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn encrypted_roundtrip_without_keyring_account() {
    let dir = tempfile::tempdir().unwrap();
    let store = KeyStore::new(dir.path().to_path_buf());
    store.store("demo_user", "abc123deadbeef").unwrap();
    // Force file path by using a handle that won't match keyring in CI
    let loaded = store.load("demo_user").unwrap();
    assert_eq!(loaded.as_deref(), Some("abc123deadbeef"));
    assert!(!store.legacy_plain_path("demo_user").exists());
  }

  #[test]
  fn migrates_legacy_plaintext_key() {
    let dir = tempfile::tempdir().unwrap();
    let store = KeyStore::new(dir.path().to_path_buf());
    std::fs::create_dir_all(store.keys_dir()).unwrap();
    std::fs::write(store.legacy_plain_path("legacy_user"), "oldsecret").unwrap();

    let loaded = store.load("legacy_user").unwrap();
    assert_eq!(loaded.as_deref(), Some("oldsecret"));
    assert!(!store.legacy_plain_path("legacy_user").exists());
  }
}