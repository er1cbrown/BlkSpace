import "@/lib/buffer-polyfill";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import {
  applyUiPrefsToDocument,
  isTauriRuntime,
  loadUiPrefs,
} from "@/lib/ui-prefs";

// Desktop boot: paint saved chrome (terminal / density) before React mounts.
if (isTauriRuntime()) {
  applyUiPrefsToDocument(loadUiPrefs());
}

createRoot(document.getElementById("root")!).render(<App />);
