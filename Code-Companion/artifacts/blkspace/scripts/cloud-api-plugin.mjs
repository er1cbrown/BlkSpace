import { loadEnv } from "vite";
import { createApiHandler } from "../server/api.mjs";

/** Same API in development, preview, and the standalone cloud server. */
export function cloudApiPlugin() {
  function install(server) {
    const env = loadEnv(server.config.mode, server.config.envDir, "");
    const api = createApiHandler(env, { development: true });
    server.middlewares.use((req, res, next) => {
      if (req.url?.startsWith("/api/")) return api(req, res);
      next();
    });
  }
  return {
    name: "blkspace-cloud-api",
    configureServer: install,
    configurePreviewServer: install,
  };
}
