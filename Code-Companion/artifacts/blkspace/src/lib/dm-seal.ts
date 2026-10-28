/**
 * Yard direct messages sealed on the device.
 * P-256 agreement, then AES-GCM. The yard stores the sealed note, not the words.
 * The private key stays in this browser.
 */

export const DM_PREFIX = "blkspace-dm.v1.";
const KEY_STORE = "blkspace_dm_ecdh_v1";

export interface DmPublicJwk {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
}

interface SealedEnvelope {
  v: 1;
  iv: string;
  ct: string;
  fromPub: DmPublicJwk;
  toPub: DmPublicJwk;
}

function bytesToB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64UrlToBytes(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function textToB64Url(value: string): string {
  return bytesToB64Url(new TextEncoder().encode(value));
}

function b64UrlToText(value: string): string {
  return new TextDecoder().decode(b64UrlToBytes(value));
}

function aad(from: string, to: string): BufferSource {
  return view(new TextEncoder().encode(`${from}\n${to}`));
}

function view(bytes: Uint8Array): BufferSource {
  return new Uint8Array(bytes);
}

export function publicJwkOf(value: unknown): DmPublicJwk | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.kty !== "EC" || row.crv !== "P-256") return null;
  if (typeof row.x !== "string" || typeof row.y !== "string") return null;
  if (typeof row.d === "string") return null;
  return { kty: "EC", crv: "P-256", x: row.x, y: row.y };
}

function readPrivate(): JsonWebKey | null {
  try {
    const raw = localStorage.getItem(KEY_STORE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JsonWebKey;
    if (parsed.kty !== "EC" || parsed.crv !== "P-256" || !parsed.d || !parsed.x || !parsed.y) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function dmPublicFromPrivate(priv: JsonWebKey): DmPublicJwk {
  return { kty: "EC", crv: "P-256", x: String(priv.x), y: String(priv.y) };
}

/** Create the device key if this browser does not have one. Returns the public half. */
export async function ensureDmKey(): Promise<DmPublicJwk> {
  const existing = readPrivate();
  if (existing) return dmPublicFromPrivate(existing);
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"],
  );
  const priv = await crypto.subtle.exportKey("jwk", pair.privateKey);
  localStorage.setItem(KEY_STORE, JSON.stringify(priv));
  return dmPublicFromPrivate(priv);
}

async function derive(myPriv: JsonWebKey, theirPub: DmPublicJwk, usage: "encrypt" | "decrypt") {
  const mine = await crypto.subtle.importKey(
    "jwk",
    myPriv,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey"],
  );
  const theirs = await crypto.subtle.importKey(
    "jwk",
    theirPub,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: theirs },
    mine,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

export async function sealDm(input: {
  text: string;
  from: string;
  to: string;
  toPub: DmPublicJwk;
}): Promise<string> {
  const priv = readPrivate();
  if (!priv?.d) throw new Error("Open Messages on this device before sending.");
  const fromPub = dmPublicFromPrivate(priv);
  const key = await derive(priv, input.toPub, "encrypt");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: view(iv), additionalData: aad(input.from, input.to) },
      key,
      new TextEncoder().encode(input.text),
    ),
  );
  const envelope: SealedEnvelope = {
    v: 1,
    iv: bytesToB64Url(iv),
    ct: bytesToB64Url(ct),
    fromPub,
    toPub: input.toPub,
  };
  return DM_PREFIX + textToB64Url(JSON.stringify(envelope));
}

export function parseSealedEnvelope(raw: string): SealedEnvelope {
  const text = raw.trim();
  if (!text.startsWith(DM_PREFIX)) throw new Error("That message is not sealed.");
  if (text.length > 12000) throw new Error("That message is too long.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(b64UrlToText(text.slice(DM_PREFIX.length)));
  } catch {
    throw new Error("That sealed message is not valid.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("That sealed message is not valid.");
  }
  const row = parsed as Record<string, unknown>;
  const fromPub = publicJwkOf(row.fromPub);
  const toPub = publicJwkOf(row.toPub);
  if (row.v !== 1 || typeof row.iv !== "string" || typeof row.ct !== "string" || !fromPub || !toPub) {
    throw new Error("That sealed message is not valid.");
  }
  if (row.iv.length > 32 || row.ct.length > 8000) {
    throw new Error("That sealed message is not valid.");
  }
  return { v: 1, iv: row.iv, ct: row.ct, fromPub, toPub };
}

/** Shape check for the yard desk. It does not open the note. */
export function assertSealedEnvelope(raw: string): string {
  parseSealedEnvelope(raw);
  return raw.trim();
}

export async function openDm(
  sealed: string,
  from: string,
  to: string,
  me: string,
): Promise<string> {
  const env = parseSealedEnvelope(sealed);
  const priv = readPrivate();
  if (!priv) throw new Error("This message is sealed for another device.");
  const theirPub = me === from ? env.toPub : me === to ? env.fromPub : null;
  if (!theirPub) throw new Error("This message is sealed for another device.");
  const key = await derive(priv, theirPub, "decrypt");
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: view(b64UrlToBytes(env.iv)),
      additionalData: aad(from, to),
    },
    key,
    view(b64UrlToBytes(env.ct)),
  );
  return new TextDecoder().decode(plain);
}
