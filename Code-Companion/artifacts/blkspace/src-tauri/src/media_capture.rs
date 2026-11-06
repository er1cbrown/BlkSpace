//! Turn on `navigator.mediaDevices.getUserMedia` inside the macOS webview.
//!
//! WKWebView leaves camera and microphone APIs off unless these private
//! preference keys are set. The usage strings live in `Info.plist`.

use tauri::Manager;

pub fn enable(app: &tauri::App) {
  for window in app.webview_windows().into_values() {
    if let Err(err) = window.with_webview(|webview| unsafe {
      use objc2::msg_send;
      use objc2_foundation::{NSNumber, NSString};
      use objc2_web_kit::WKWebView;

      let view: &WKWebView = &*webview.inner().cast();
      let prefs = view.configuration().preferences();
      let prefs_ptr = objc2::rc::Retained::as_ptr(&prefs) as *mut objc2::runtime::AnyObject;
      // The last key lets getUserMedia run on the `tauri://localhost` origin.
      let keys = [
        ("mediaDevicesEnabled", true),
        ("mediaStreamEnabled", true),
        ("peerConnectionEnabled", true),
        ("screenCaptureEnabled", true),
        ("mediaCaptureRequiresSecureConnection", false),
      ];
      for (name, on) in keys {
        let set = objc2::exception::catch(std::panic::AssertUnwindSafe(|| {
          let key = NSString::from_str(name);
          let value = NSNumber::numberWithBool(on);
          let _: *mut objc2::runtime::AnyObject =
            msg_send![prefs_ptr, setValue: &*value, forKey: &*key];
        }));
        if set.is_err() {
          log::warn!("webview refused media preference {name}");
        }
      }
    }) {
      log::warn!("could not enable getUserMedia: {err}");
      continue;
    }
    if let Err(err) = window.reload() {
      log::warn!("could not reload webview after enabling getUserMedia: {err}");
    }
  }
}
