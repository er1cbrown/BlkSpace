/**
 * Handle-based secure messaging (ethical, med-school aware).
 *
 * - Identity = existing BlkSpace handle (same as rest of app).
 * - Requires No-PHI + ethics ack before send.
 * - Blocks supported. Not a hospital EMR / not HIPAA covered entity.
 * - Persistence: localStorage web; Tauri table when available.
 */
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri-api";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";
import { hasEthicsAck, loadInstitutionalClaim } from "@/lib/identity-ethics";

export interface SecureDmMessage {
  id: string;
  threadId: string;
  fromHandle: string;
  toHandle: string;
  body: string;
  phiAck: boolean;
  ethicalAck: boolean;
  createdAt: string;
}

export interface SecureDmThread {
  threadId: string;
  peerHandle: string;
  lastBody: string;
  lastAt: string;
  unread: number;
}

const STORE = "blkspace_secure_dms_v1";
const BLOCKS = "blkspace_dm_blocks_v1";

type Store = {
  messages: SecureDmMessage[];
  nextId: number;
};

function load(): Store {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    /* ignore */
  }
  return { messages: [], nextId: 1 };
}

function save(s: Store) {
  localStorage.setItem(
    STORE,
    JSON.stringify({
      messages: s.messages.slice(0, 500),
      nextId: s.nextId,
    }),
  );
}

function loadBlocks(): string[] {
  try {
    return JSON.parse(localStorage.getItem(BLOCKS) || "[]") as string[];
  } catch {
    return [];
  }
}

function saveBlocks(b: string[]) {
  localStorage.setItem(BLOCKS, JSON.stringify(b));
}

export function threadIdFor(a: string, b: string): string {
  return [a, b]
    .map((x) => x.toLowerCase())
    .sort()
    .join("::");
}

export function isBlocked(peer: string): boolean {
  const me = getCurrentHandle();
  if (!me) return false;
  const blocks = loadBlocks();
  return blocks.includes(`${me}->${peer}`) || blocks.includes(`${peer}->${me}`);
}

export function blockHandle(peer: string) {
  const me = getCurrentHandle();
  if (!me || !peer) return;
  const b = loadBlocks();
  const key = `${me}->${peer}`;
  if (!b.includes(key)) b.push(key);
  saveBlocks(b);
}

export function canSendSecureDm(): { ok: boolean; reason?: string } {
  if (!getCurrentHandle())
    return { ok: false, reason: "Sign in with your handle" };
  if (!hasEthicsAck() && !loadInstitutionalClaim()?.ethicalAck) {
    return {
      ok: false,
      reason:
        "Acknowledge No-PHI + ethical principles (Faculty Desk or Messages)",
    };
  }
  return { ok: true };
}

/** Red-flag heuristic — not a medical filter, educational blocklist. */
export function looksLikePhiRisk(text: string): boolean {
  const t = text.toLowerCase();
  const hits = [
    "mrn",
    "patient name",
    "date of birth",
    "dob:",
    "ssn",
    "social security",
    "diagnosed with",
    "prescription",
    "hipaa",
    "medical record",
    "room number",
  ];
  return hits.some((h) => t.includes(h));
}

export async function listThreads(): Promise<SecureDmThread[]> {
  const me = getCurrentHandle();
  if (!me) return [];
  if (isTauri()) {
    try {
      return await invoke("list_secure_dm_threads", {
        sessionToken: getSessionToken() || "",
      });
    } catch {
      /* fall through web */
    }
  }
  const s = load();
  const map = new Map<string, SecureDmThread>();
  for (const m of s.messages) {
    if (m.fromHandle !== me && m.toHandle !== me) continue;
    const peer = m.fromHandle === me ? m.toHandle : m.fromHandle;
    if (isBlocked(peer)) continue;
    const tid = m.threadId;
    const prev = map.get(tid);
    if (!prev || prev.lastAt < m.createdAt) {
      map.set(tid, {
        threadId: tid,
        peerHandle: peer,
        lastBody: m.body.slice(0, 120),
        lastAt: m.createdAt,
        unread: 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    b.lastAt.localeCompare(a.lastAt),
  );
}

export async function listThreadMessages(
  peerHandle: string,
): Promise<SecureDmMessage[]> {
  const me = getCurrentHandle();
  if (!me) return [];
  if (isTauri()) {
    try {
      return await invoke("list_secure_dm_messages", {
        sessionToken: getSessionToken() || "",
        peerHandle,
      });
    } catch {
      /* fall through */
    }
  }
  const tid = threadIdFor(me, peerHandle);
  return load()
    .messages.filter((m) => m.threadId === tid)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function sendSecureDm(input: {
  toHandle: string;
  body: string;
  phiAck: boolean;
  ethicalAck: boolean;
}): Promise<SecureDmMessage> {
  const me = getCurrentHandle();
  if (!me) throw new Error("Sign in required");
  const gate = canSendSecureDm();
  if (!gate.ok) throw new Error(gate.reason || "Cannot send");
  if (!input.phiAck || !input.ethicalAck) {
    throw new Error("Acknowledge No-PHI and ethical use before messaging");
  }
  const to = input.toHandle.trim().replace(/^@/, "");
  if (!to || to === me) throw new Error("Invalid recipient handle");
  if (isBlocked(to)) throw new Error("This conversation is blocked");
  const body = input.body.trim();
  if (!body) throw new Error("Message empty");
  if (body.length > 2000) throw new Error("Message too long (max 2000)");
  if (looksLikePhiRisk(body)) {
    throw new Error(
      "Message blocked: looks like clinical/PHI-sensitive content. Use official hospital systems.",
    );
  }

  if (isTauri()) {
    try {
      return await invoke("send_secure_dm", {
        sessionToken: getSessionToken() || "",
        toHandle: to,
        body,
        phiAck: true,
        ethicalAck: true,
      });
    } catch (e) {
      // If command missing, fall through to local
      if (String(e).includes("not found") || String(e).includes("Command")) {
        /* web path */
      } else {
        throw e;
      }
    }
  }

  const s = load();
  const msg: SecureDmMessage = {
    id: `dm_${s.nextId++}`,
    threadId: threadIdFor(me, to),
    fromHandle: me,
    toHandle: to,
    body,
    phiAck: true,
    ethicalAck: true,
    createdAt: new Date().toISOString(),
  };
  s.messages.push(msg);
  save(s);
  // Soft notify peer (web)
  try {
    const key = "blkspace_web_notifications_v1";
    const prev = JSON.parse(localStorage.getItem(key) || "[]") as unknown[];
    prev.unshift({
      id: Date.now(),
      userHandle: to,
      notificationType: "secure_dm",
      fromHandle: me,
      message: `@${me} sent you a secure handle message (no PHI)`,
      unread: true,
      createdAt: msg.createdAt,
    });
    localStorage.setItem(key, JSON.stringify(prev.slice(0, 50)));
  } catch {
    /* ignore */
  }
  return msg;
}
