//! Optional Reticulum (RNS) bridge. HEAD imported this module but the file
//! was not in origin/main — stub keeps Yard `--no-default-features` building.

use serde::Serialize;
use serde_json::json;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReticulumStatus {
  pub ok: bool,
  pub available: bool,
  pub reason: String,
  pub detail: String,
  pub python: Option<String>,
  pub install: Option<String>,
}

pub fn reticulum_status() -> ReticulumStatus {
  ReticulumStatus {
    ok: true,
    available: false,
    reason: "not_installed".into(),
    detail: "Reticulum is optional. Tier 0 Yard works without rns.".into(),
    python: None,
    install: Some("pip install rns".into()),
  }
}

pub fn reticulum_announce_yard(_yard: &str, _handle: &str) -> Result<serde_json::Value, String> {
  Err("rns not installed (optional Route B)".into())
}

pub fn reticulum_send_yard_note(
  _yard: &str,
  _handle: &str,
  _text: &str,
) -> Result<serde_json::Value, String> {
  let _ = json!({});
  Err("rns not installed (optional Route B)".into())
}
