import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Standalone test config — do not merge vite.config.ts (requires PORT/BASE_PATH).
  root: rootDir,
  // Vitest sets NODE_ENV=test; React 19 CJS interop needs development for react-dom/client.
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
  },
  test: {
    exclude: ["**/node_modules/**", "**/e2e/**"],
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    pool: "threads",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/test/"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
});
