import { authenticate, createWriteLimiter } from "./auth.mjs";
import { HttpError, json, readJson } from "./http.mjs";
import { uploadTarget } from "./media.mjs";
import { createPortfolio } from "./portfolio.mjs";

const interactionRoutes = new Map([
  // Canonical interaction routes.
  ["/api/portfolio/interactions/like", "like"],
  ["/api/portfolio/interactions/like/set", "like"],
  ["/api/portfolio/interactions/repost", "repost"],
  ["/api/portfolio/interactions/repost/set", "repost"],
  ["/api/portfolio/interactions/reply", "reply"],
  ["/api/portfolio/interactions/follow", "follow"],
  ["/api/portfolio/interactions/follow/set", "follow"],
  // Singular/plural and legacy /api/portfolio aliases keep the contract easy
  // to adopt for clients that already group portfolio mutations together.
  ["/api/portfolio/interactions/likes", "like"],
  ["/api/portfolio/interactions/reposts", "repost"],
  ["/api/portfolio/interactions/replies", "reply"],
  ["/api/portfolio/interactions/follows", "follow"],
  ["/api/portfolio/like", "like"],
  ["/api/portfolio/likes", "like"],
  ["/api/portfolio/repost", "repost"],
  ["/api/portfolio/reposts", "repost"],
  ["/api/portfolio/reply", "reply"],
  ["/api/portfolio/replies", "reply"],
  ["/api/portfolio/follow", "follow"],
  ["/api/portfolio/follows", "follow"],
  ["/api/portfolio/interaction", "dispatch"],
  ["/api/portfolio/interactions", "dispatch"],
  ["/api/portfolio/interaction/like", "like"],
  ["/api/portfolio/interaction/repost", "repost"],
  ["/api/portfolio/interaction/reply", "reply"],
  ["/api/portfolio/interaction/follow", "follow"],
]);

const followingListRoutes = new Set([
  "/api/portfolio/following",
  "/api/portfolio/interactions/following",
]);

const identityRoutes = new Set([
  "/api/portfolio/identity",
  "/api/portfolio/identities",
]);

const replyListRoutes = new Set([
  "/api/portfolio/replies",
  "/api/portfolio/interactions/replies",
]);

const notificationListRoutes = new Set([
  "/api/portfolio/notifications",
  "/api/portfolio/interactions/notifications",
  "/api/portfolio/notification",
]);

const notificationReadRoutes = new Set([
  "/api/portfolio/notifications/read",
  "/api/portfolio/notifications/mark-read",
  "/api/portfolio/notifications/markRead",
  "/api/portfolio/interactions/notifications/read",
  "/api/portfolio/interactions/notifications/mark-read",
  "/api/portfolio/notification/read",
]);

function withoutTrailingSlash(path) {
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function notificationItemRoute(path) {
  const match = path.match(
    /^\/api\/portfolio\/(?:interactions\/)?notifications\/([^/]+)\/read$/,
  );
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    throw new HttpError(400, "Invalid notification ID.");
  }
}

function dispatchInteraction(type, portfolio, body, pubkey) {
  switch (type) {
    case "like":
      return portfolio.setLike(body, pubkey);
    case "repost":
      return portfolio.setRepost(body, pubkey);
    case "reply":
      return portfolio.createReply(body, pubkey);
    case "follow":
      return portfolio.setFollow(body, pubkey);
    default:
      throw new HttpError(400, "Unknown portfolio interaction type.");
  }
}

function notificationOptions(url, body = {}) {
  const source = body || {};
  return {
    limit: url.searchParams.get("limit") ?? source.limit ?? undefined,
    cursor: url.searchParams.get("cursor") ?? source.cursor ?? "",
    unreadOnly:
      url.searchParams.get("unreadOnly") ??
      url.searchParams.get("unread") ??
      source.unreadOnly ??
      source.unread ??
      false,
  };
}

export function createApiHandler(env, { origins, development = false } = {}) {
  const portfolio = createPortfolio(env);
  const limit = createWriteLimiter();
  const uploadLimit = createWriteLimiter(10);
  return async (req, res) => {
    try {
      const url = new URL(req.url, "http://internal");
      const path = withoutTrailingSlash(url.pathname);
      const allowed =
        origins || (development ? [`http://${req.headers.host}`] : []);

      if (req.method === "GET" && path === "/api/health") {
        return json(res, 200, {
          ok: true,
          service: "blkspace",
          version: env.BLKSPACE_REVISION || "development",
          storage: "cloud",
        });
      }

      if (req.method === "GET" && path === "/api/portfolio/posts") {
        // Reads stay public. If a caller supplies a proof, validate it and
        // include viewer-specific like/repost state without changing the
        // legacy unauthenticated response.
        let viewerPubkey = "";
        if (req.headers.authorization) {
          viewerPubkey = authenticate(req, "", allowed);
        }
        return json(
          res,
          200,
          await portfolio.posts({
            town: url.searchParams.get("town") || "",
            limit: url.searchParams.get("limit") || undefined,
            cursor: url.searchParams.get("cursor") || "",
            viewerPubkey,
          }),
        );
      }
      if (req.method === "GET" && followingListRoutes.has(path)) {
        const pubkey = authenticate(req, "", allowed);
        return json(res, 200, await portfolio.following(pubkey));
      }
      if (req.method === "GET" && replyListRoutes.has(path)) {
        return json(
          res,
          200,
          await portfolio.replies(url.searchParams.get("postUid"), {
            limit: url.searchParams.get("limit") || undefined,
            cursor: url.searchParams.get("cursor") || "",
          }),
        );
      }
      if (req.method === "GET" && path === "/api/portfolio/blob")
        return json(res, 200, await portfolio.blob(url.searchParams.get("id")));

      // Notification listing is intentionally authenticated even though the
      // older post/blob reads are public. NIP-98 binds a GET proof to the
      // empty body and the exact path (including its query string).
      if (req.method === "GET" && notificationListRoutes.has(path)) {
        const pubkey = authenticate(req, "", allowed);
        return json(
          res,
          200,
          await portfolio.notifications(pubkey, notificationOptions(url)),
        );
      }

      const routeKind = interactionRoutes.get(path);
      const isNotificationRead = notificationReadRoutes.has(path);
      const notificationId = notificationItemRoute(path);
      const isSocialMutation =
        routeKind ||
        notificationListRoutes.has(path) ||
        identityRoutes.has(path) ||
        isNotificationRead ||
        notificationId !== null;
      const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(
        req.method,
      );

      if (!isWriteMethod || !isSocialMutation) {
        if (
          req.method !== "POST" ||
          !["/api/portfolio/post", "/api/media/upload-target"].includes(path)
        ) {
          throw new HttpError(404, "API route not found.");
        }
      }

      // A POST notification-list alias is useful for clients that can only
      // sign request bodies, while the canonical contract remains GET.
      if (isWriteMethod && notificationListRoutes.has(path)) {
        const { raw, body } = await readJson(req);
        const pubkey = authenticate(req, raw, allowed);
        return json(
          res,
          200,
          await portfolio.notifications(pubkey, notificationOptions(url, body)),
        );
      }

      const { raw, body } = await readJson(req);
      const pubkey = authenticate(req, raw, allowed);
      limit(`pub:${pubkey}`);

      if (isNotificationRead || notificationId !== null) {
        const readBody = notificationId ? { ...body, notificationId } : body;
        return json(
          res,
          200,
          await portfolio.markNotificationsRead(readBody, pubkey),
        );
      }

      if (identityRoutes.has(path)) {
        return json(res, 200, await portfolio.registerIdentity(body, pubkey));
      }

      if (routeKind) {
        if (routeKind === "dispatch") {
          const type = body.type || body.action || body.kind;
          if (typeof type !== "string") {
            throw new HttpError(400, "Interaction type is required.");
          }
          return json(
            res,
            200,
            await dispatchInteraction(type, portfolio, body, pubkey),
          );
        }
        return json(
          res,
          200,
          await dispatchInteraction(routeKind, portfolio, body, pubkey),
        );
      }

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
