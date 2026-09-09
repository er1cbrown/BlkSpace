//! Optional Reticulum (RNS) Route B — bundled native `rns`/`rnsd` only.
//!
//! Policy (do not regress):
//! - No Python sidecar (`pip install rns`, `python -m RNS`, `.py` launchers).
//! - No LXMF identity store.
//! - No RNode serial / BLE interface.
//! - No destination hashes persisted next to Nostr keys (`{app_dir}/keys`).
//!
//! Yard (`--no-default-features`) stays usable with rnsd absent.
//! Full may drop native `rnsd`/`rns` next to the app or under `rns/`.

use serde::Serialize;
use serde_json::{json, Value};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

pub const SPOOL_DIR: &str = "rns";
pub const SPOOL_FILE: &str = "spool.jsonl";
pub const KEYS_DIR: &str = "keys";
pub const INSTALL_HINT: &str =
  "Full: drop native rnsd/rns next to the app (or set BLKSPACE_RNSD). Do not pip install rns.";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReticulumStatus {
  pub ok: bool,
  pub available: bool,
  pub reason: String,
  pub detail: String,
  pub rnsd: Option<String>,
  pub rns: Option<String>,
  pub bundled: bool,
  pub lxmf: bool,
  pub rnode: bool,
  pub python_sidecar: bool,
  pub spool_dir: String,
  pub keys_dir: String,
  pub install: Option<String>,
}

#[derive(Debug, Clone)]
pub struct BundledBins {
  pub rnsd: Option<PathBuf>,
  pub rns: Option<PathBuf>,
}

pub fn keys_dir(app_dir: &Path) -> PathBuf {
  app_dir.join(KEYS_DIR)
}

pub fn rns_dir(app_dir: &Path) -> PathBuf {
  app_dir.join(SPOOL_DIR)
}

pub fn spool_path(app_dir: &Path) -> PathBuf {
  rns_dir(app_dir).join(SPOOL_FILE)
}

/// Refuse any RNS artifact that would sit beside Nostr keys.
pub fn rns_path_touches_keys(app_dir: &Path, path: &Path) -> bool {
  let keys = keys_dir(app_dir);
  path.starts_with(&keys)
    || keys.starts_with(path) && path != app_dir
}

pub fn is_python_sidecar(path: &Path) -> bool {
  let name = path
    .file_name()
    .and_then(|s| s.to_str())
    .unwrap_or("")
    .to_ascii_lowercase();
  if name.starts_with("python")
    || name == "py"
    || name == "py.exe"
    || name.ends_with(".py")
    || name.ends_with(".pyw")
    || name.contains("python")
  {
    return true;
  }
  if let Ok(bytes) = fs::read(path) {
    let n = bytes.len().min(160);
    let head = String::from_utf8_lossy(&bytes[..n]);
    if head.starts_with("#!")
      && (head.contains("python") || head.contains("python3") || head.contains("py.exe"))
    {
      return true;
    }
  }
  false
}

fn bin_names(stem: &str) -> Vec<String> {
  let mut names = vec![stem.to_string()];
  if cfg!(windows) {
    names.insert(0, format!("{stem}.exe"));
  }
  names
}

fn accept_native_bin(path: &Path) -> Option<PathBuf> {
  if !path.is_file() {
    return None;
  }
  if is_python_sidecar(path) {
    return None;
  }
  Some(path.to_path_buf())
}

fn env_bin(var: &str) -> Option<PathBuf> {
  let raw = std::env::var(var).ok()?;
  let path = PathBuf::from(raw.trim());
  if path.as_os_str().is_empty() {
    return None;
  }
  accept_native_bin(&path)
}

fn search_stem(stem: &str, dirs: &[PathBuf]) -> Option<PathBuf> {
  for dir in dirs {
    for name in bin_names(stem) {
      if let Some(found) = accept_native_bin(&dir.join(&name)) {
        return Some(found);
      }
    }
  }
  None
}

fn bundled_dirs() -> Vec<PathBuf> {
  let mut dirs = Vec::new();
  if let Ok(exe) = std::env::current_exe() {
    if let Some(parent) = exe.parent() {
      dirs.push(parent.to_path_buf());
      dirs.push(parent.join("rns"));
      dirs.push(parent.join("resources").join("rns"));
      if let Some(grand) = parent.parent() {
        dirs.push(grand.join("rns"));
        dirs.push(grand.join("resources").join("rns"));
      }
    }
  }
  dirs
}

/// Bundled / env native binaries only. Never PATH (pip `rnsd` lives there).
pub fn discover_bundled_bins() -> BundledBins {
  let dirs = bundled_dirs();
  BundledBins {
    rnsd: env_bin("BLKSPACE_RNSD").or_else(|| search_stem("rnsd", &dirs)),
    rns: env_bin("BLKSPACE_RNS").or_else(|| search_stem("rns", &dirs)),
  }
}

fn env_points_at_python() -> bool {
  for var in ["BLKSPACE_RNSD", "BLKSPACE_RNS"] {
    if let Ok(raw) = std::env::var(var) {
      let path = PathBuf::from(raw.trim());
      if !path.as_os_str().is_empty() && is_python_sidecar(&path) {
        return true;
      }
    }
  }
  false
}

pub fn reticulum_status(app_dir: &Path) -> ReticulumStatus {
  let bins = discover_bundled_bins();
  let python_refused = env_points_at_python();
  let available = bins.rnsd.is_some();
  let (reason, detail) = if python_refused && !available {
    (
      "python_sidecar_refused".to_string(),
      "BLKSPACE_RNSD/RNS pointed at a Python sidecar. Route B only accepts native rnsd/rns.".to_string(),
    )
  } else if available {
    (
      "bundled".to_string(),
      "Native rnsd is bundled. TCP-only Route B. No LXMF store, no RNode, keys stay on Route A."
        .to_string(),
    )
  } else {
    (
      "not_bundled".to_string(),
      "Reticulum is optional. Tier 0 Yard works without rnsd. Full may ship native rnsd — not pip."
        .to_string(),
    )
  };

  ReticulumStatus {
    ok: true,
    available,
    reason,
    detail,
    rnsd: bins.rnsd.as_ref().map(|p| p.display().to_string()),
    rns: bins.rns.as_ref().map(|p| p.display().to_string()),
    bundled: available,
    lxmf: false,
    rnode: false,
    python_sidecar: false,
    spool_dir: rns_dir(app_dir).display().to_string(),
    keys_dir: keys_dir(app_dir).display().to_string(),
    install: if available {
      None
    } else {
      Some(INSTALL_HINT.into())
    },
  }
}

fn validate_yard(yard: &str) -> Result<(), String> {
  let t = yard.trim();
  if t.is_empty() || t.len() > 48 {
    return Err("yard must be 1–48 characters".into());
  }
  Ok(())
}

fn validate_handle(handle: &str) -> Result<(), String> {
  let t = handle.trim();
  if t.is_empty() || t.len() > 30 {
    return Err("handle must be 1–30 characters".into());
  }
  Ok(())
}

fn validate_note(text: &str) -> Result<(), String> {
  let t = text.trim();
  if t.is_empty() {
    return Err("note is empty".into());
  }
  if t.len() > 500 {
    return Err("note too long (max 500)".into());
  }
  Ok(())
}

/// Yard announce / note spool. No dest hash, no LXMF, never writes under `keys/`.
pub fn spool_event(
  app_dir: &Path,
  kind: &str,
  yard: &str,
  handle: &str,
  text: &str,
) -> Result<Value, String> {
  validate_yard(yard)?;
  validate_handle(handle)?;
  if kind == "yard_note" {
    validate_note(text)?;
  }

  let dir = rns_dir(app_dir);
  if rns_path_touches_keys(app_dir, &dir) {
    return Err("refusing to spool RNS data next to Nostr keys".into());
  }
  fs::create_dir_all(&dir).map_err(|e| format!("rns spool dir: {e}"))?;

  let path = spool_path(app_dir);
  if rns_path_touches_keys(app_dir, &path) {
    return Err("refusing to persist RNS spool next to Nostr keys".into());
  }

  let record = json!({
    "v": 1,
    "kind": kind,
    "yard": yard.trim(),
    "handle": handle.trim(),
    "text": text.trim(),
    "at": chrono::Utc::now().timestamp(),
    "lxmf": false,
    "rnode": false,
  });
  // Destination hashes belong on the RNS node, never in this spool or keys/.
  debug_assert!(record.get("destination").is_none());
  debug_assert!(record.get("destHash").is_none());
  debug_assert!(record.get("destination_hash").is_none());

  let mut file = OpenOptions::new()
    .create(true)
    .append(true)
    .open(&path)
    .map_err(|e| format!("rns spool: {e}"))?;
  writeln!(file, "{record}").map_err(|e| format!("rns spool write: {e}"))?;

  let status = reticulum_status(app_dir);
  Ok(json!({
    "ok": true,
    "queued": true,
    "available": status.available,
    "kind": kind,
    "spool": path.display().to_string(),
    "lxmf": false,
    "rnode": false,
    "pythonSidecar": false,
  }))
}

pub fn reticulum_announce_yard(
  app_dir: &Path,
  yard: &str,
  handle: &str,
) -> Result<Value, String> {
  spool_event(app_dir, "yard_announce", yard, handle, "")
}

pub fn reticulum_send_yard_note(
  app_dir: &Path,
  yard: &str,
  handle: &str,
  text: &str,
) -> Result<Value, String> {
  spool_event(app_dir, "yard_note", yard, handle, text)
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::io::Write;
  use std::sync::Mutex;

  static ENV_LOCK: Mutex<()> = Mutex::new(());

  fn temp_app() -> (tempfile::TempDir, PathBuf) {
    let dir = tempfile::tempdir().unwrap();
    let app = dir.path().to_path_buf();
    (dir, app)
  }

  #[test]
  fn python_sidecar_is_rejected() {
    let dir = tempfile::tempdir().unwrap();
    let py = dir.path().join("rnsd.py");
    fs::write(&py, "#!/usr/bin/env python3\nprint('nope')\n").unwrap();
    assert!(is_python_sidecar(&py));
    assert!(accept_native_bin(&py).is_none());

    let sh = dir.path().join("rnsd");
    {
      let mut f = fs::File::create(&sh).unwrap();
      writeln!(f, "#!/usr/bin/env python3").unwrap();
    }
    assert!(is_python_sidecar(&sh));
  }

  #[test]
  fn status_never_recommends_pip_or_lxmf() {
    let _g = ENV_LOCK.lock().unwrap();
    let (_keep, app) = temp_app();
    let st = reticulum_status(&app);
    assert!(st.ok);
    assert!(!st.lxmf);
    assert!(!st.rnode);
    assert!(!st.python_sidecar);
    assert!(st.keys_dir.ends_with(KEYS_DIR) || st.keys_dir.contains("keys"));
    assert!(st.spool_dir.ends_with(SPOOL_DIR) || st.spool_dir.contains("rns"));
    if let Some(install) = &st.install {
      assert!(
        install.to_ascii_lowercase().contains("do not pip"),
        "install hint must forbid pip, got {install}"
      );
    }
  }

  #[test]
  fn spool_does_not_touch_keys_and_has_no_dest_hash() {
    let _g = ENV_LOCK.lock().unwrap();
    let (_keep, app) = temp_app();
    let keys = keys_dir(&app);
    fs::create_dir_all(&keys).unwrap();
    let before: Vec<_> = fs::read_dir(&keys).unwrap().map(|e| e.unwrap().path()).collect();

    let out = reticulum_send_yard_note(&app, "tsu", "demo_user", "lab note").unwrap();
    assert_eq!(out["ok"], true);
    assert_eq!(out["queued"], true);
    assert_eq!(out["lxmf"], false);
    assert_eq!(out["rnode"], false);

    let spool = fs::read_to_string(spool_path(&app)).unwrap();
    let line: Value = serde_json::from_str(spool.lines().next().unwrap()).unwrap();
    assert_eq!(line["kind"], "yard_note");
    assert_eq!(line["yard"], "tsu");
    assert!(line.get("destination").is_none());
    assert!(line.get("destHash").is_none());
    assert!(line.get("destination_hash").is_none());
    assert!(line.get("hash").is_none());
    assert!(!spool.to_ascii_lowercase().contains("lxmf identity"));

    let after: Vec<_> = fs::read_dir(&keys).unwrap().map(|e| e.unwrap().path()).collect();
    assert_eq!(before, after);
    assert!(!spool_path(&app).starts_with(&keys));
    assert!(!rns_path_touches_keys(&app, &spool_path(&app)));
  }

  #[test]
  fn announce_spools_without_rnsd() {
    let _g = ENV_LOCK.lock().unwrap();
    let (_keep, app) = temp_app();
    let out = reticulum_announce_yard(&app, "howard", "demo_user").unwrap();
    assert_eq!(out["queued"], true);
    let spool = fs::read_to_string(spool_path(&app)).unwrap();
    assert!(spool.contains("yard_announce"));
    assert!(!keys_dir(&app).exists());
  }

  #[test]
  fn env_python_rnsd_does_not_become_available() {
    let _g = ENV_LOCK.lock().unwrap();
    let dir = tempfile::tempdir().unwrap();
    let py = dir.path().join("rnsd.py");
    fs::write(&py, "#!/usr/bin/env python3\n").unwrap();
    let prev = std::env::var("BLKSPACE_RNSD").ok();
    std::env::set_var("BLKSPACE_RNSD", &py);
    let bins = discover_bundled_bins();
    assert!(bins.rnsd.is_none());
    match prev {
      Some(v) => std::env::set_var("BLKSPACE_RNSD", v),
      None => std::env::remove_var("BLKSPACE_RNSD"),
    }
  }
}
