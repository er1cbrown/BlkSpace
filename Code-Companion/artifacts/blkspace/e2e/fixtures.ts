import { createTauriTest } from "@srsholmes/tauri-playwright";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const MCP_SOCKET = "/tmp/blkspace-playwright.sock";

export const { test, expect } = createTauriTest({
  devUrl: "http://127.0.0.1:24442",
  mcpSocket: MCP_SOCKET,
  tauriCwd: rootDir,
});