import { authenticate, createWriteLimiter } from "./auth.mjs";
import { HttpError, json, readJson } from "./http.mjs";
import { uploadTarget } from "./media.mjs";
import { createPortfolio } from "./portfolio.mjs";

export function createApiHandler(env, { origins, development = false } = {}) {
  const portfolio = createPortfolio(env);
  const limit = createWriteLimiter();
  const uploadLimit = createWriteLimiter(10);
  return async (req, res) => {
    try {
      const url = new URL(req.url, "http://internal");
      const path = url.pathname;
      if (req.method === "GET" && path === "/api/health") {
        return json(res, 200, {
          ok: true,
          service: "blkspace",
          version: env.BLKSPACE_REVISION || "development",
          storage: "cloud",
        });
      }
      if (req.method === "GET" && path === "/api/portfolio/posts")
        return json(res, 200, await portfolio.posts());
      if (req.method === "GET" && path === "/api/portfolio/blob")
        return json(res, 200, await portfolio.blob(url.searchParams.get("id")));
      if (
        req.method !== "POST" ||
        !["/api/portfolio/post", "/api/media/upload-target"].includes(path)
      ) {
        throw new HttpError(404, "API route not found.");
      }
      const { raw, body } = await readJson(req);
      const allowed =
        origins || (development ? [`http://${req.headers.host}`] : []);
      const pubkey = authenticate(req, raw, allowed);
      limit(`pub:${pubkey}`);
      if (path === "/api/portfolio/post")
        return json(res, 200, await portfolio.savePost(body, pubkey));
      uploadLimit(pubkey);
      return json(res, 200, { ok: true, ...(await uploadTarget(env, body)) });
    } catch (err) {
      // Never expose upstream response bodies, credentials or database URLs.
      json(res, err instanceof HttpError ? err.status : 502, {
        ok: false,
        error:
          err instanceof HttpError
            ? err.message
            : "Cloud service unavailable. Please retry.",
      });
    }
  };
}
