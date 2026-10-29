import { randomBytes } from "node:crypto";
import { HttpError } from "./http.mjs";

/** A session description or ICE line. The yard never stores the picture. */
const SDP_MAX = 20_000;
const CANDIDATE_MAX = 1_500;
const MAX_SESSIONS = 12;
const MAX_VIEWERS = 8;
const MAX_CANDIDATES = 40;
const TTL_MS = 2 * 60 * 60 * 1000;

function handleOf(value) {
  const handle = String(value || "")
    .trim()
    .replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{1,32}$/.test(handle)) return "member";
  return handle;
}

function yardOf(value) {
  const yard = String(value || "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9_-]{1,32}$/.test(yard)) {
    throw new HttpError(400, "Pick a yard.");
  }
  return yard;
}

function sdpOf(value) {
  const sdp = String(value || "").trim();
  if (!sdp.startsWith("v=0") || sdp.length > SDP_MAX) {
    throw new HttpError(400, "That connection note is not a session description.");
  }
  return sdp;
}

function candidateOf(value) {
  const candidate = String(value || "").trim();
  if (!candidate.startsWith("{") || candidate.length > CANDIDATE_MAX) {
    throw new HttpError(400, "That connection note is not an ICE candidate.");
  }
  return candidate;
}

function idOf(prefix) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function publicViewer(viewer) {
  return {
    id: viewer.id,
    handle: viewer.handle,
    offer: viewer.offer,
    answer: viewer.answer,
    hostCandidates: viewer.hostCandidates,
    viewerCandidates: viewer.viewerCandidates,
  };
}

function publicSession(session) {
  return {
    id: session.id,
    yardId: session.yardId,
    hostHandle: session.hostHandle,
    title: session.title,
    createdAt: session.createdAt,
    viewers: session.viewers.map(publicViewer),
  };
}

/**
 * In-memory camera signaling for one yard process.
 * The picture moves browser to browser. This object only holds SDP and ICE.
 */
export function createYardLive() {
  const sessions = new Map();

  function prune() {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - Date.parse(session.createdAt) > TTL_MS) sessions.delete(id);
    }
  }

  function sessionOf(id) {
    prune();
    const session = sessions.get(String(id || ""));
    if (!session) throw new HttpError(404, "That live camera has ended.");
    return session;
  }

  function viewerOf(session, viewerId) {
    const viewer = session.viewers.find((row) => row.id === viewerId);
    if (!viewer) throw new HttpError(404, "Join the camera before connecting.");
    return viewer;
  }

  return {
    list(yardId) {
      prune();
      const yard = yardOf(yardId);
      return [...sessions.values()]
        .filter((session) => session.yardId === yard)
        .map(publicSession);
    },

    read(id) {
      return publicSession(sessionOf(id));
    },

    start(body, pubkey) {
      prune();
      if (sessions.size >= MAX_SESSIONS) {
        throw new HttpError(429, "This yard already has enough live cameras.");
      }
      const title = String(body.title || "Live camera").trim().slice(0, 80);
      if (!title) throw new HttpError(400, "Name the camera.");
      const session = {
        id: idOf("live"),
        yardId: yardOf(body.yardId || body.yard_id),
        hostPubkey: pubkey,
        hostHandle: handleOf(body.handle),
        title,
        createdAt: new Date().toISOString(),
        viewers: [],
      };
      sessions.set(session.id, session);
      return publicSession(session);
    },

    join(body, pubkey) {
      const session = sessionOf(body.sessionId || body.session_id);
      const existing = session.viewers.find((row) => row.pubkey === pubkey);
      if (existing) return publicViewer(existing);
      if (session.viewers.length >= MAX_VIEWERS) {
        throw new HttpError(429, "That camera is full.");
      }
      const viewer = {
        id: idOf("view"),
        pubkey,
        handle: handleOf(body.handle),
        offer: null,
        answer: null,
        hostCandidates: [],
        viewerCandidates: [],
      };
      session.viewers.push(viewer);
      return publicViewer(viewer);
    },

    offer(body, pubkey) {
      const session = sessionOf(body.sessionId || body.session_id);
      if (session.hostPubkey !== pubkey) {
        throw new HttpError(403, "Only the camera host can send the offer.");
      }
      const viewer = viewerOf(session, String(body.viewerId || body.viewer_id || ""));
      if (viewer.offer) return publicViewer(viewer);
      viewer.offer = sdpOf(body.sdp);
      return publicViewer(viewer);
    },

    answer(body, pubkey) {
      const session = sessionOf(body.sessionId || body.session_id);
      const viewer = viewerOf(session, String(body.viewerId || body.viewer_id || ""));
      if (viewer.pubkey !== pubkey) {
        throw new HttpError(403, "Only the joined member can answer.");
      }
      if (!viewer.offer) {
        throw new HttpError(400, "Wait for the host offer.");
      }
      if (viewer.answer) return publicViewer(viewer);
      viewer.answer = sdpOf(body.sdp);
      return publicViewer(viewer);
    },

    candidate(body, pubkey) {
      const session = sessionOf(body.sessionId || body.session_id);
      const viewer = viewerOf(session, String(body.viewerId || body.viewer_id || ""));
      const from = body.from === "host" ? "host" : "viewer";
      if (from === "host" && session.hostPubkey !== pubkey) {
        throw new HttpError(403, "Only the camera host can send that note.");
      }
      if (from === "viewer" && viewer.pubkey !== pubkey) {
        throw new HttpError(403, "Only the joined member can send that note.");
      }
      const list = from === "host" ? viewer.hostCandidates : viewer.viewerCandidates;
      if (list.length >= MAX_CANDIDATES) return publicViewer(viewer);
      const candidate = candidateOf(body.candidate);
      if (!list.includes(candidate)) list.push(candidate);
      return publicViewer(viewer);
    },

    end(body, pubkey) {
      const session = sessionOf(body.sessionId || body.session_id);
      if (session.hostPubkey !== pubkey) {
        throw new HttpError(403, "Only the camera host can end it.");
      }
      sessions.delete(session.id);
      return { id: session.id, ended: true };
    },
  };
}
