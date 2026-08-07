import type { Request, Response, NextFunction } from "express";

/**
 * api-server is a local demo / mock surface, not the product auth path (Tauri IPC is).
 *
 * Mutations are locked unless explicitly opened:
 *   API_SERVER_ALLOW_WRITES=1
 *
 * Optional shared secret for writes when open:
 *   API_SERVER_TOKEN=<token>  → require Authorization: Bearer <token>
 */
export function requireDemoWrites(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (process.env.API_SERVER_ALLOW_WRITES !== "1") {
    res.status(403).json({
      error:
        "api-server writes are disabled. Set API_SERVER_ALLOW_WRITES=1 for local demo only.",
    });
    return;
  }

  const expected = process.env.API_SERVER_TOKEN;
  if (expected) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (token !== expected) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  next();
}
