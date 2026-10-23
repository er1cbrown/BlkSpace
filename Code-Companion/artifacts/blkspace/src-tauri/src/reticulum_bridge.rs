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

// ─── Spool bounds (Phase 0) ────────────────────────────────
// The spool is append-only, so without a bound it grows forever and a repeated
// announce becomes a permanent duplicate. These bounds are deliberately
// transport-independent, so they stay correct whether or not Route B is built.

/// Hard ceiling on `spool.jsonl`. Exceeding it drops the oldest records.
pub const SPOOL_MAX_BYTES: u64 = 256 * 1024;

/// Records older than this are dropped on compaction.
pub const SPOOL_MAX_AGE_SECS: i64 = 7 * 24 * 60 * 60;

/// Newest records retained after compaction.
pub const SPOOL_MAX_RECORDS: usize = 500;

/// How many times a due note is handed to the socket before we stop.
/// Stopping is not a receipt. There is no `delivered` state.
pub const DRAIN_MAX_ATTEMPTS: u32 = 5;

/// Wait before the same signed event is eligible again.
pub const DRAIN_BACKOFF_SECS: i64 = 60;

/// One parsed spool line. Malformed lines are dropped, never trusted.
#[derive(Debug, Clone, PartialEq)]
struct SpoolRecord {
  kind: String,
  yard: String,
  handle: String,
  text: String,
  at: i64,
  state: String,
  attempts: u32,
  next_attempt_at: i64,
  event_json: String,
  last_error: String,
}

/// Parse a spool line, or `None` if it is not a usable record.
fn parse_spool_line(line: &str) -> Option<SpoolRecord> {
  let value: Value = serde_json::from_str(line).ok()?;
  // A record must at least identify what it is and who sent it.
  let kind = value.get("kind")?.as_str()?.to_string();
  let yard = value.get("yard")?.as_str()?.to_string();
  let handle = value.get("handle")?.as_str()?.to_string();
  let text = value
    .get("text")
    .and_then(|t| t.as_str())
    .unwrap_or("")
    .to_string();
  let at = value.get("at").and_then(|t| t.as_i64()).unwrap_or(0);
  // A line that claims delivery is lying. Reticulum has no end-to-end receipt.
  let state = match value.get("state").and_then(|t| t.as_str()).unwrap_or("queued") {
    "failed" => "failed",
    _ => "queued",
  };
  let attempts = value
    .get("attempts")
    .and_then(|t| t.as_u64())
    .unwrap_or(0)
    .min(u32::MAX as u64) as u32;
  let next_attempt_at = value
    .get("next_attempt_at")
    .and_then(|t| t.as_i64())
    .unwrap_or(0);
  let event_json = value
    .get("event_json")
    .and_then(|t| t.as_str())
    .unwrap_or("")
    .to_string();
  let last_error = value
    .get("last_error")
    .and_then(|t| t.as_str())
    .unwrap_or("")
    .to_string();
  Some(SpoolRecord {
    kind,
    yard,
    handle,
    text,
    at,
    state: state.to_string(),
    attempts,
    next_attempt_at,
    event_json,
    last_error,
  })
}

fn record_line(record: &SpoolRecord) -> String {
  let state = if record.state == "failed" {
    "failed"
  } else {
    "queued"
  };
  json!({
    "v": 1,
    "kind": record.kind,
    "yard": record.yard,
    "handle": record.handle,
    "text": record.text,
    "at": record.at,
    "state": state,
    "attempts": record.attempts,
    "next_attempt_at": record.next_attempt_at,
    "event_json": record.event_json,
    "last_error": record.last_error,
    "lxmf": false,
    "rnode": false,
  })
  .to_string()
}

/// Identity used for deduplication: repeated identical announces collapse.
fn dedup_key(kind: &str, yard: &str, handle: &str, text: &str) -> String {
  format!("{kind}\u{1f}{yard}\u{1f}{handle}\u{1f}{text}")
}

/// Rewrite the spool keeping only recent, unique records within the bounds.
///
/// Best-effort by design: a read or write problem returns 0 rather than an
/// error, because compaction must never be the reason a spool write fails.
fn compact_spool(path: &Path, now: i64) -> usize {
  let Ok(contents) = fs::read_to_string(path) else {
    return 0;
  };

  // Newest first, so the retention window keeps the most recent records.
  let mut lines: Vec<&str> = contents.lines().filter(|l| !l.trim().is_empty()).collect();
  lines.reverse();

  let mut seen: Vec<String> = Vec::new();
  let mut kept: Vec<String> = Vec::new();
  for line in lines {
    let Some(record) = parse_spool_line(line) else {
      continue; // drop malformed rather than carry it forward
    };
    if now - record.at > SPOOL_MAX_AGE_SECS {
      continue; // expired
    }
    let key = dedup_key(&record.kind, &record.yard, &record.handle, &record.text);
    if seen.contains(&key) {
      continue; // duplicate of a newer copy
    }
    if kept.len() >= SPOOL_MAX_RECORDS {
      break;
    }
    seen.push(key);
    kept.push(line.to_string());
  }

  // Restore chronological order to preserve append-only semantics.
  kept.reverse();

  // Byte ceiling is the backstop against unusually large individual lines; the
  // record count above is the primary bound.
  while kept.len() > 1 {
    let size: u64 = kept.iter().map(|l| l.len() as u64 + 1).sum();
    if size <= SPOOL_MAX_BYTES {
      break;
    }
    kept.remove(0);
  }

  let body = kept.iter().fold(String::new(), |mut acc, l| {
    acc.push_str(l);
    acc.push('\n');
    acc
  });
  if fs::write(path, body).is_ok() {
    kept.len()
  } else {
    0
  }
}

/// Counts for the UI, so spool state is visible rather than inferred.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpoolStats {
  pub records: usize,
  pub bytes: u64,
  /// Ceiling the spool is currently held to, in bytes.
  pub max_bytes: u64,
}

/// Report current spool size. Read-only, and never touches the keys directory.
pub fn spool_stats(app_dir: &Path) -> SpoolStats {
  let path = spool_path(app_dir);
  let bytes = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
  let records = fs::read_to_string(&path)
    .map(|c| c.lines().filter(|l| !l.trim().is_empty()).count())
    .unwrap_or(0);
  SpoolStats {
    records,
    bytes,
    max_bytes: SPOOL_MAX_BYTES,
  }
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
    "state": "queued",
    "attempts": 0,
    "next_attempt_at": 0,
    "event_json": "",
    "last_error": "",
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
  drop(file);

  // Bound the spool after appending. A failure here must not fail the write that
  // already succeeded, so compaction is best-effort by design.
  let _ = compact_spool(&path, chrono::Utc::now().timestamp());

  let stats = spool_stats(app_dir);
  let status = reticulum_status(app_dir);
  Ok(json!({
    "ok": true,
    "queued": true,
    "available": status.available,
    "kind": kind,
    "spool": path.display().to_string(),
    "records": stats.records,
    "bytes": stats.bytes,
    "maxBytes": stats.max_bytes,
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

/// Counts after one drain pass. `handed_off` is how many notes the socket
/// accepted this call. That is not a delivery receipt.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DrainReport {
  pub handed_off: usize,
  pub still_queued: usize,
  pub failed: usize,
}

fn sign_yard_note(keys: &nostr_sdk::prelude::Keys, text: &str) -> Result<String, String> {
  use nostr_sdk::prelude::EventBuilder;
  let event = EventBuilder::text_note(text)
    .sign_with_keys(keys)
    .map_err(|err| format!("sign yard note: {err}"))?;
  serde_json::to_string(&event).map_err(|err| format!("encode yard note: {err}"))
}

fn note_is_due(record: &SpoolRecord, now: i64) -> bool {
  record.kind == "yard_note"
    && record.state != "failed"
    && record.attempts < DRAIN_MAX_ATTEMPTS
    && record.next_attempt_at <= now
    && !record.text.is_empty()
}

fn read_spool_records(path: &Path) -> Vec<SpoolRecord> {
  let Ok(body) = fs::read_to_string(path) else {
    return Vec::new();
  };
  body.lines().filter_map(parse_spool_line).collect()
}

fn write_spool_records(path: &Path, records: &[SpoolRecord]) -> Result<(), String> {
  let mut body = String::new();
  for record in records {
    let line = record_line(record);
    let lower = line.to_ascii_lowercase();
    if lower.contains("delivered")
      || lower.contains("destination")
      || lower.contains("desthash")
    {
      return Err("refusing to persist a delivery receipt or a destination hash".into());
    }
    body.push_str(&line);
    body.push('\n');
  }
  fs::write(path, body).map_err(|err| format!("rns spool rewrite: {err}"))
}

/// Hand due yard notes to `sender`.
///
/// The first attempt signs the note. Later attempts resend that same event.
/// A socket accept leaves the note `queued` and moves `next_attempt_at`
/// forward. The retry cap on errors sets `failed`. Neither result is
/// `delivered`.
pub fn drain_due_notes(
  app_dir: &Path,
  now: i64,
  keys: &nostr_sdk::prelude::Keys,
  sender: &mut dyn FnMut(&str) -> Result<(), String>,
) -> Result<DrainReport, String> {
  let path = spool_path(app_dir);
  if rns_path_touches_keys(app_dir, &path) {
    return Err("refusing to drain RNS data next to Nostr keys".into());
  }
  if !path.exists() {
    return Ok(DrainReport {
      handed_off: 0,
      still_queued: 0,
      failed: 0,
    });
  }

  let mut records = read_spool_records(&path);
  let mut handed_off = 0usize;
  for record in &mut records {
    if !note_is_due(record, now) {
      continue;
    }
    if record.event_json.is_empty() {
      match sign_yard_note(keys, &record.text) {
        Ok(event_json) => record.event_json = event_json,
        Err(err) => {
          record.attempts = record.attempts.saturating_add(1);
          record.last_error = err.chars().take(200).collect();
          record.next_attempt_at = now.saturating_add(DRAIN_BACKOFF_SECS);
          if record.attempts >= DRAIN_MAX_ATTEMPTS {
            record.state = "failed".into();
          }
          continue;
        }
      }
    }
    let event_json = record.event_json.clone();
    match sender(&event_json) {
      Ok(()) => {
        handed_off += 1;
        record.attempts = record.attempts.saturating_add(1);
        record.last_error.clear();
        record.state = "queued".into();
        record.next_attempt_at = now.saturating_add(DRAIN_BACKOFF_SECS);
        record.event_json = event_json;
      }
      Err(err) => {
        record.attempts = record.attempts.saturating_add(1);
        record.last_error = err.chars().take(200).collect();
        record.event_json = event_json;
        record.next_attempt_at = now.saturating_add(DRAIN_BACKOFF_SECS);
        if record.attempts >= DRAIN_MAX_ATTEMPTS {
          record.state = "failed".into();
        } else {
          record.state = "queued".into();
        }
      }
    }
  }

  write_spool_records(&path, &records)?;
  Ok(DrainReport {
    handed_off,
    still_queued: records.iter().filter(|r| r.state == "queued").count(),
    failed: records.iter().filter(|r| r.state == "failed").count(),
  })
}

#[cfg(test)]
mod tests {
  use super::*;
  use nostr_sdk::prelude::Keys;
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

  // ─── Spool bounds (Phase 0) ────────────────────────────

  fn write_spool(app: &Path, rows: &[Value]) {
    let path = spool_path(app);
    if let Some(parent) = path.parent() {
      fs::create_dir_all(parent).unwrap();
    }
    let body = rows
      .iter()
      .map(|r| format!("{r}\n"))
      .collect::<String>();
    fs::write(&path, body).unwrap();
  }

  fn row(kind: &str, handle: &str, text: &str, at: i64) -> Value {
    json!({
      "v": 1,
      "kind": kind,
      "yard": "tsu",
      "handle": handle,
      "text": text,
      "at": at,
      "lxmf": false,
      "rnode": false,
    })
  }

  #[test]
  fn compaction_drops_duplicate_records() {
    let (_keep, app) = temp_app();
    let now = 1_000_000i64;
    write_spool(
      &app,
      &[
        row("yard_announce", "demo_user", "", now - 10),
        row("yard_announce", "demo_user", "", now - 9), // identical
        row("yard_announce", "demo_user", "", now - 8), // identical
        row("yard_note", "demo_user", "hello", now - 7), // different kind
      ],
    );

    let kept = compact_spool(&spool_path(&app), now);
    assert_eq!(kept, 2, "three identical announces must collapse to one");

    let body = fs::read_to_string(spool_path(&app)).unwrap();
    assert_eq!(body.lines().filter(|l| !l.trim().is_empty()).count(), 2);
  }

  #[test]
  fn compaction_drops_expired_records() {
    let (_keep, app) = temp_app();
    let now = 10_000_000i64;
    write_spool(
      &app,
      &[
        row("yard_note", "demo_user", "old", now - SPOOL_MAX_AGE_SECS - 1),
        row("yard_note", "demo_user", "fresh", now - 10),
      ],
    );

    let kept = compact_spool(&spool_path(&app), now);
    assert_eq!(kept, 1);
    let body = fs::read_to_string(spool_path(&app)).unwrap();
    assert!(body.contains("fresh"));
    assert!(!body.contains("\"old\""));
  }

  #[test]
  fn compaction_enforces_the_record_ceiling() {
    let (_keep, app) = temp_app();
    let now = 1_000_000i64;
    let rows: Vec<Value> = (0..SPOOL_MAX_RECORDS + 50)
      .map(|i| row("yard_note", "demo_user", &format!("note-{i}"), now - 1))
      .collect();
    write_spool(&app, &rows);

    let kept = compact_spool(&spool_path(&app), now);
    assert_eq!(kept, SPOOL_MAX_RECORDS, "record count must be capped");
  }

  #[test]
  fn compaction_enforces_the_byte_ceiling() {
    let (_keep, app) = temp_app();
    let now = 1_000_000i64;
    // A few records that together exceed the byte ceiling.
    let big = "x".repeat(SPOOL_MAX_BYTES as usize / 2);
    write_spool(
      &app,
      &[
        row("yard_note", "demo_user", &big, now - 3),
        row("yard_note", "demo_user", &big, now - 2),
        row("yard_note", "demo_user", &big, now - 1),
      ],
    );

    let kept = compact_spool(&spool_path(&app), now);
    assert!(kept >= 1, "at least the newest record must survive");
    let size = fs::metadata(spool_path(&app)).unwrap().len();
    assert!(
      size <= SPOOL_MAX_BYTES,
      "spool must respect the byte ceiling, got {size}"
    );
  }

  #[test]
  fn compaction_preserves_chronological_order() {
    let (_keep, app) = temp_app();
    let now = 1_000_000i64;
    write_spool(
      &app,
      &[
        row("yard_note", "demo_user", "first", now - 30),
        row("yard_note", "demo_user", "second", now - 20),
        row("yard_note", "demo_user", "third", now - 10),
      ],
    );

    compact_spool(&spool_path(&app), now);
    let body = fs::read_to_string(spool_path(&app)).unwrap();
    let order: Vec<&str> = vec!["first", "second", "third"];
    let mut cursor = 0usize;
    for want in order {
      let at = body[cursor..].find(want).expect("record must survive") + cursor;
      cursor = at;
    }
  }

  #[test]
  fn compaction_drops_malformed_lines() {
    let (_keep, app) = temp_app();
    let now = 1_000_000i64;
    let path = spool_path(&app);
    if let Some(parent) = path.parent() {
      fs::create_dir_all(parent).unwrap();
    }
    let body = format!(
      "not json at all\n{}\n{}\n",
      row("yard_note", "demo_user", "good", now - 5),
      "{\"kind\":\"missing_fields\"}\n"
    );
    fs::write(&path, body).unwrap();

    let kept = compact_spool(&path, now);
    assert_eq!(kept, 1, "only the well-formed, complete record survives");
    let out = fs::read_to_string(&path).unwrap();
    assert!(!out.contains("not json"));
    assert!(!out.contains("missing_fields"));
    assert!(out.contains("good"));
  }

  #[test]
  fn spool_stays_bounded_across_repeated_writes() {
    let (_keep, app) = temp_app();
    // The exact pattern that used to grow forever: the same announce repeated.
    for _ in 0..25 {
      reticulum_announce_yard(&app, "howard", "demo_user").unwrap();
    }
    let stats = spool_stats(&app);
    assert_eq!(stats.records, 1, "repeated identical announces collapse");
    assert!(stats.bytes <= stats.max_bytes);
  }

  #[test]
  fn spool_stats_on_a_missing_spool_are_zero_not_an_error() {
    let (_keep, app) = temp_app();
    let stats = spool_stats(&app);
    assert_eq!(stats.records, 0);
    assert_eq!(stats.bytes, 0);
    assert_eq!(stats.max_bytes, SPOOL_MAX_BYTES);
  }

  #[test]
  fn spool_never_persists_a_destination_hash() {
    // Regression guard for the policy that motivated these bounds.
    let (_keep, app) = temp_app();
    let out = reticulum_send_yard_note(&app, "tsu", "demo_user", "note").unwrap();
    assert_eq!(out["ok"], true);
    assert_eq!(out["maxBytes"], SPOOL_MAX_BYTES);
    let spool = fs::read_to_string(spool_path(&app)).unwrap().to_lowercase();
    for banned in ["destination", "desthash", "destination_hash", "lxmf_identity"] {
      assert!(!spool.contains(banned), "spool must not contain {banned}");
    }
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

  fn assert_no_receipt(app: &Path) {
    let spool = fs::read_to_string(spool_path(app)).unwrap();
    let lower = spool.to_ascii_lowercase();
    for banned in ["delivered", "destination", "desthash"] {
      assert!(!lower.contains(banned), "spool contains {banned}");
    }
  }

  fn one_record(app: &Path) -> SpoolRecord {
    let records = read_spool_records(&spool_path(app));
    assert_eq!(records.len(), 1, "expected one spool record");
    records.into_iter().next().unwrap()
  }

  #[test]
  fn drain_of_a_missing_spool_reports_zero_and_creates_nothing() {
    let (_keep, app) = temp_app();
    let keys = Keys::generate();
    let report = drain_due_notes(&app, 1_000, &keys, &mut |_| {
      panic!("a missing spool must not send");
    })
    .unwrap();
    assert_eq!(
      report,
      DrainReport {
        handed_off: 0,
        still_queued: 0,
        failed: 0,
      }
    );
    assert!(!spool_path(&app).exists());
  }

  #[test]
  fn drain_signs_once_resends_that_event_and_stays_queued() {
    let (_keep, app) = temp_app();
    reticulum_send_yard_note(&app, "tsu", "demo_user", "yard note").unwrap();
    let keys = Keys::generate();
    let secret = keys.secret_key().to_secret_hex();
    let now = 1_700_000_000i64;

    let mut sent = Vec::new();
    let report = drain_due_notes(&app, now, &keys, &mut |event| {
      sent.push(event.to_string());
      Ok(())
    })
    .unwrap();
    assert_eq!(report.handed_off, 1);
    assert_eq!(report.still_queued, 1);
    assert_eq!(report.failed, 0);
    assert_eq!(sent.len(), 1);

    let record = one_record(&app);
    assert_eq!(record.state, "queued");
    assert_eq!(record.attempts, 1);
    assert_eq!(record.event_json, sent[0]);
    assert_eq!(record.next_attempt_at, now + DRAIN_BACKOFF_SECS);
    assert!(record.last_error.is_empty());
    let event: Value = serde_json::from_str(&record.event_json).unwrap();
    assert_eq!(event["content"], "yard note");
    assert_eq!(event["kind"], 1);
    let verified = crate::verify_nostr_event_detail(&record.event_json);
    assert!(verified.valid, "{:?}", verified.message);
    let spool = fs::read_to_string(spool_path(&app)).unwrap();
    assert!(!spool.to_ascii_lowercase().contains(&secret.to_ascii_lowercase()));
    assert_no_receipt(&app);

    let quiet = drain_due_notes(&app, now + DRAIN_BACKOFF_SECS - 1, &keys, &mut |_| {
      panic!("backoff has not elapsed");
    })
    .unwrap();
    assert_eq!(quiet.handed_off, 0);
    let again = one_record(&app);
    assert_eq!(again.event_json, sent[0]);
    assert_eq!(again.attempts, 1);
    assert_eq!(again.state, "queued");

    // A later attempt must resend the stored event. Replacing it with a
    // marker proves the drain did not sign a second time.
    let marker = r#"{"content":"yard note","id":"already-signed"}"#;
    let mut line: Value = serde_json::from_str(
      fs::read_to_string(spool_path(&app))
        .unwrap()
        .lines()
        .next()
        .unwrap(),
    )
    .unwrap();
    line["event_json"] = json!(marker);
    line["next_attempt_at"] = json!(0);
    fs::write(spool_path(&app), format!("{line}\n")).unwrap();

    let mut resent = Vec::new();
    let again_report = drain_due_notes(&app, now + DRAIN_BACKOFF_SECS, &keys, &mut |event| {
      resent.push(event.to_string());
      Ok(())
    })
    .unwrap();
    assert_eq!(again_report.handed_off, 1);
    assert_eq!(resent, vec![marker.to_string()]);
    let stored = one_record(&app);
    assert_eq!(stored.event_json, marker);
    assert_eq!(stored.attempts, 2);
    assert_eq!(stored.state, "queued");
    assert_no_receipt(&app);
  }

  #[test]
  fn drain_fails_a_note_after_five_errors_and_then_stops() {
    let (_keep, app) = temp_app();
    reticulum_send_yard_note(&app, "tsu", "demo_user", "yard note").unwrap();
    let keys = Keys::generate();
    let mut calls = 0usize;
    let mut signed = String::new();
    let mut now = 1_700_000_000i64;

    for n in 1..=DRAIN_MAX_ATTEMPTS {
      let report = drain_due_notes(&app, now, &keys, &mut |event| {
        calls += 1;
        if signed.is_empty() {
          signed = event.to_string();
        } else {
          assert_eq!(event, signed, "a retry must resend the same event");
        }
        Err("socket down".into())
      })
      .unwrap();
      assert_eq!(report.handed_off, 0);
      let record = one_record(&app);
      assert_eq!(record.attempts, n);
      assert_eq!(record.event_json, signed);
      assert_eq!(record.last_error, "socket down");
      assert_eq!(record.next_attempt_at, now + DRAIN_BACKOFF_SECS);
      if n < DRAIN_MAX_ATTEMPTS {
        assert_eq!(record.state, "queued");
        assert_eq!(report.still_queued, 1);
        assert_eq!(report.failed, 0);
      } else {
        assert_eq!(record.state, "failed");
        assert_eq!(report.still_queued, 0);
        assert_eq!(report.failed, 1);
      }

      let early = drain_due_notes(&app, now, &keys, &mut |_| {
        calls += 1;
        Ok(())
      })
      .unwrap();
      assert_eq!(early.handed_off, 0);
      assert_eq!(calls, n as usize);
      now += DRAIN_BACKOFF_SECS;
    }

    let stopped = drain_due_notes(&app, now, &keys, &mut |_| {
      calls += 1;
      Ok(())
    })
    .unwrap();
    assert_eq!(stopped.handed_off, 0);
    assert_eq!(stopped.failed, 1);
    assert_eq!(calls, DRAIN_MAX_ATTEMPTS as usize);
    assert_eq!(one_record(&app).state, "failed");
    assert_no_receipt(&app);
  }

  #[test]
  fn drain_stops_after_five_handoffs_and_stays_queued() {
    let (_keep, app) = temp_app();
    reticulum_send_yard_note(&app, "tsu", "demo_user", "yard note").unwrap();
    let keys = Keys::generate();
    let mut calls = 0usize;
    let mut signed = String::new();
    let mut now = 1_700_000_000i64;

    for n in 1..=DRAIN_MAX_ATTEMPTS {
      let report = drain_due_notes(&app, now, &keys, &mut |event| {
        calls += 1;
        if signed.is_empty() {
          signed = event.to_string();
        } else {
          assert_eq!(event, signed);
        }
        Ok(())
      })
      .unwrap();
      assert_eq!(report.handed_off, 1);
      assert_eq!(report.still_queued, 1);
      assert_eq!(report.failed, 0);
      let record = one_record(&app);
      assert_eq!(record.state, "queued");
      assert_eq!(record.attempts, n);
      assert_eq!(record.event_json, signed);
      assert!(record.last_error.is_empty());
      now += DRAIN_BACKOFF_SECS;
    }

    let stopped = drain_due_notes(&app, now, &keys, &mut |_| {
      calls += 1;
      Ok(())
    })
    .unwrap();
    assert_eq!(stopped.handed_off, 0);
    assert_eq!(stopped.still_queued, 1);
    assert_eq!(stopped.failed, 0);
    assert_eq!(calls, DRAIN_MAX_ATTEMPTS as usize);
    let record = one_record(&app);
    assert_eq!(record.state, "queued");
    assert_eq!(record.attempts, DRAIN_MAX_ATTEMPTS);
    assert_eq!(record.event_json, signed);
    assert_no_receipt(&app);
  }

  #[test]
  fn drain_skips_announces() {
    let (_keep, app) = temp_app();
    reticulum_announce_yard(&app, "tsu", "demo_user").unwrap();
    reticulum_send_yard_note(&app, "tsu", "demo_user", "yard note").unwrap();
    let keys = Keys::generate();
    let mut sent = Vec::new();
    let report = drain_due_notes(&app, 1_700_000_000, &keys, &mut |event| {
      sent.push(event.to_string());
      Ok(())
    })
    .unwrap();
    assert_eq!(sent.len(), 1);
    assert_eq!(report.handed_off, 1);
    assert_eq!(report.still_queued, 2);
    assert_eq!(report.failed, 0);

    let records = read_spool_records(&spool_path(&app));
    assert_eq!(records.len(), 2);
    assert_eq!(records[0].kind, "yard_announce");
    assert_eq!(records[0].attempts, 0);
    assert!(records[0].event_json.is_empty());
    assert_eq!(records[1].kind, "yard_note");
    assert_eq!(records[1].attempts, 1);
    assert_eq!(records[1].event_json, sent[0]);
    assert_no_receipt(&app);
  }

  #[test]
  fn drain_accepts_an_older_spool_line_that_has_no_attempt_fields() {
    let (_keep, app) = temp_app();
    write_spool(&app, &[row("yard_note", "demo_user", "yard note", 1_000)]);
    let keys = Keys::generate();
    let report = drain_due_notes(&app, 1_700_000_000, &keys, &mut |_| Ok(())).unwrap();
    assert_eq!(report.handed_off, 1);
    let record = one_record(&app);
    assert_eq!(record.state, "queued");
    assert_eq!(record.attempts, 1);
    assert!(!record.event_json.is_empty());
    let verified = crate::verify_nostr_event_detail(&record.event_json);
    assert!(verified.valid, "{:?}", verified.message);
    assert_no_receipt(&app);
  }

  #[test]
  fn drain_drops_a_forged_receipt_and_any_destination_hash() {
    let (_keep, app) = temp_app();
    let path = spool_path(&app);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(
      &path,
      concat!(
        r#"{"v":1,"kind":"yard_note","yard":"tsu","handle":"demo_user","text":"yard note","at":1,"state":"delivered","destination":"abcdef","attempts":0,"next_attempt_at":0,"event_json":"","last_error":""}"#,
        "\n",
      ),
    )
    .unwrap();
    let keys = Keys::generate();
    let mut sent = Vec::new();
    let report = drain_due_notes(&app, 1_700_000_000, &keys, &mut |event| {
      sent.push(event.to_string());
      Ok(())
    })
    .unwrap();
    assert_eq!(report.handed_off, 1);
    assert_eq!(report.still_queued, 1);
    assert_eq!(report.failed, 0);
    let record = one_record(&app);
    assert_eq!(record.state, "queued");
    assert_eq!(record.attempts, 1);
    assert_eq!(record.event_json, sent[0]);
    assert_no_receipt(&app);
  }

  #[test]
  fn drain_truncates_a_long_send_error() {
    let (_keep, app) = temp_app();
    reticulum_send_yard_note(&app, "tsu", "demo_user", "yard note").unwrap();
    let keys = Keys::generate();
    let err = "x".repeat(400);
    let report = drain_due_notes(&app, 1_700_000_000, &keys, &mut |_| Err(err.clone())).unwrap();
    assert_eq!(report.handed_off, 0);
    assert_eq!(report.still_queued, 1);
    assert_eq!(report.failed, 0);
    let record = one_record(&app);
    assert_eq!(record.state, "queued");
    assert_eq!(record.attempts, 1);
    assert_eq!(record.last_error.chars().count(), 200);
    assert!(err.starts_with(&record.last_error));
    assert_no_receipt(&app);
  }
}
