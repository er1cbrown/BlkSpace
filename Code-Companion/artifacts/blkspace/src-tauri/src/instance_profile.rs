//! Per-instance data directory resolution.
//!
//! # Why this exists
//!
//! `run()` hardcoded its data directory to `<data_local_dir>/com.blkspace.app`.
//! Every process therefore opened the same `blkspace.db` and the same blob
//! store. Two copies of BlkSpace on one machine were not two devices: they were
//! two windows onto one database, which is worse than useless for a multi-device
//! test because it looks like shared state while silently sharing everything,
//! including identity.
//!
//! This module resolves the directory instead, from two environment variables.
//! It follows the pattern already used elsewhere in the codebase
//! (`BLKSPACE_DB_CACHE_KIB`, `BLKSPACE_FULL_MESH`, `BLKSPACE_API_URL`).
//!
//! # Precedence
//!
//! ```text
//! BLKSPACE_DATA_DIR   absolute or relative path, used verbatim
//!        │            highest precedence; for CI and scripted runs
//!        ▼
//! BLKSPACE_PROFILE    <base>/com.blkspace.app/profiles/<name>
//!        │            a label: `alpha`, `beta`, `gamma`
//!        ▼
//! (unset)             <base>/com.blkspace.app
//! ```
//!
//! # What this does NOT isolate
//!
//! The directory covers the SQLite database and the blob store. It does **not**
//! cover two other places state lives, and a multi-instance run that ignores
//! them is a split brain rather than a set of devices:
//!
//! 1. **Webview `localStorage`** — the handle, display name, pubkey and session
//!    token (`src/lib/auth.ts`). On Windows this lives in the WebView2 user data
//!    folder, which is keyed to the Tauri identifier `com.blkspace.app`, *not*
//!    to this directory. Two instances share it. Set
//!    `WEBVIEW2_USER_DATA_FOLDER` per instance to separate it.
//! 2. **The OS keyring** — `src-tauri/src/key_store.rs` stores the Nostr secret
//!    through the `keyring` crate, i.e. Windows Credential Manager, keyed by
//!    service name plus handle. This one is already safe: once the handles
//!    differ, the entries differ. No extra isolation needed.
//!
//! `scripts/run-instances.mjs` sets all three together, because setting only
//! this one produces two devices that share an identity.
//!
//! # Safety of the profile name
//!
//! `BLKSPACE_PROFILE` becomes a path segment, so it is validated rather than
//! concatenated. Path separators, `..`, empty names and absolute paths are
//! rejected. A profile name must not be able to choose where BlkSpace writes.

use std::path::{Path, PathBuf};

/// Directory name used under the platform data directory.
pub const APP_DIR_NAME: &str = "com.blkspace.app";

/// Subdirectory holding named profiles.
pub const PROFILES_DIR_NAME: &str = "profiles";

/// Reject anything that could escape the profiles directory.
///
/// A profile name is a label, not a path. Allowing a separator would let an
/// environment variable redirect the database anywhere on disk.
fn validate_profile(name: &str) -> Result<(), String> {
  if name.is_empty() {
    return Err("BLKSPACE_PROFILE is empty; use a name like alpha, beta, gamma".into());
  }
  if name == "." || name == ".." {
    return Err(format!("BLKSPACE_PROFILE {name:?} is not a usable profile name"));
  }
  if name.contains('/') || name.contains('\\') {
    return Err(format!(
      "BLKSPACE_PROFILE {name:?} must not contain a path separator; it is a label, not a path"
    ));
  }
  if Path::new(name).is_absolute() {
    return Err(format!("BLKSPACE_PROFILE {name:?} must not be an absolute path"));
  }
  if name.contains(':') {
    return Err(format!("BLKSPACE_PROFILE {name:?} must not contain a drive separator"));
  }
  Ok(())
}

/// Resolve the data directory from explicit inputs.
///
/// Split from the environment-reading wrapper so it can be tested without
/// mutating process-global state, which would race across parallel test
/// threads. `app_dir` performs the environment read and calls this.
pub fn resolve(
  base: &Path,
  data_dir: Option<&str>,
  profile: Option<&str>,
) -> Result<PathBuf, String> {
  // Highest precedence: an explicit directory, used verbatim.
  if let Some(raw) = data_dir.map(str::trim).filter(|s| !s.is_empty()) {
    return Ok(PathBuf::from(raw));
  }

  let app_root = base.join(APP_DIR_NAME);

  // Otherwise a named profile sits beside the default data, not inside it, so
  // removing a profile directory cannot take the default install with it.
  match profile.map(str::trim).filter(|s| !s.is_empty()) {
    Some(name) => {
      validate_profile(name)?;
      Ok(app_root.join(PROFILES_DIR_NAME).join(name))
    }
    None => Ok(app_root),
  }
}

/// Resolve the data directory from the environment, falling back to the default
/// on any problem.
///
/// A malformed profile must not stop the app from starting, so an invalid value
/// degrades to the default directory and says so. That is visible rather than
/// silent: two runs that meant to be separate would land in the same place, and
/// the warning is the only signal that happened.
pub fn app_dir_from_env() -> PathBuf {
  let base = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
  let data_dir = std::env::var("BLKSPACE_DATA_DIR").ok();
  let profile = std::env::var("BLKSPACE_PROFILE").ok();

  match resolve(&base, data_dir.as_deref(), profile.as_deref()) {
    Ok(dir) => dir,
    Err(reason) => {
      eprintln!("[blkspace] {reason}; falling back to the default data directory.");
      base.join(APP_DIR_NAME)
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  fn base() -> PathBuf {
    PathBuf::from("/data")
  }

  #[test]
  fn with_nothing_set_it_uses_the_default_directory() {
    let dir = resolve(&base(), None, None).unwrap();
    assert_eq!(dir, PathBuf::from("/data/com.blkspace.app"));
  }

  #[test]
  fn a_profile_gets_its_own_directory() {
    let dir = resolve(&base(), None, Some("alpha")).unwrap();
    assert_eq!(dir, PathBuf::from("/data/com.blkspace.app/profiles/alpha"));
  }

  #[test]
  fn two_profiles_never_share_a_directory() {
    let a = resolve(&base(), None, Some("alpha")).unwrap();
    let b = resolve(&base(), None, Some("beta")).unwrap();
    assert_ne!(a, b, "two profiles must not land in one directory");
  }

  #[test]
  fn a_profile_does_not_overwrite_the_default_install() {
    // The profile lives under profiles/, so deleting it cannot take the default
    // database with it.
    let default = resolve(&base(), None, None).unwrap();
    let profile = resolve(&base(), None, Some("alpha")).unwrap();
    assert!(!profile.starts_with(&default.join("blkspace.db")));
    assert!(profile.starts_with(&default));
    assert_ne!(profile, default);
  }

  #[test]
  fn an_explicit_data_dir_wins_over_a_profile() {
    let dir = resolve(&base(), Some("/tmp/custom"), Some("alpha")).unwrap();
    assert_eq!(dir, PathBuf::from("/tmp/custom"));
  }

  #[test]
  fn blank_values_are_treated_as_unset() {
    // An env var set to "" is a common accident and must not produce a
    // directory named "" or a path ending in a separator.
    assert_eq!(
      resolve(&base(), Some(""), None).unwrap(),
      resolve(&base(), None, None).unwrap()
    );
    assert_eq!(
      resolve(&base(), None, Some("   ")).unwrap(),
      resolve(&base(), None, None).unwrap()
    );
  }

  #[test]
  fn a_profile_cannot_escape_the_profiles_directory() {
    for hostile in ["../evil", "..\\evil", "a/b", "a\\b", "..", ".", "C:evil"] {
      assert!(
        resolve(&base(), None, Some(hostile)).is_err(),
        "profile {hostile:?} should have been rejected"
      );
    }
  }

  #[test]
  fn a_rejected_profile_names_the_variable_and_the_reason() {
    // The message is the only signal a user gets, so it has to say which
    // variable is wrong and why, not just "invalid".
    let err = resolve(&base(), None, Some("../evil")).unwrap_err();
    assert!(err.contains("BLKSPACE_PROFILE"), "unhelpful message: {err}");
    assert!(err.contains("path separator"), "unhelpful message: {err}");
  }
}
