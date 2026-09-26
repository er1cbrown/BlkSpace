import "@/lib/buffer-polyfill";
import {
  isTauri,
  tauriStoreKey,
  tauriExportRecoveryKey,
  tauriHasKey,
  tauriGetChallenge,
  tauriLogin,
  tauriLoginWithStoredKey,
  tauriGetUser,
  tauriLogout,
  tauriVerifySession,
} from "@/lib/tauri-api";
import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
  nip19,
} from "nostr-tools";
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from "bip39";
import { sha256 } from "@noble/hashes/sha2.js";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("Invalid secret key — expected 64 hex characters");
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export const HANDLE_KEY = "blkspace_handle";
export const DISPLAY_KEY = "blkspace_display_name";
export const SESSION_KEY = "blkspace_session";
export const PUBKEY_KEY = "blkspace_pubkey";
export const FIRST_RUN_KEY = "blkspace_first_run_complete";
export const GUEST_KEY = "blkspace_guest_mode";
const SECRET_KEY = "blkspace_nsec";
const LEGACY_SECRET_KEY = "blkspace_key";

/** Dispatch so GuestModeProvider can react to login/logout without re-mounting. */
function notifyIdentityChange() {
  try {
    window.dispatchEvent(new CustomEvent("blkspace:identity"));
  } catch {
    // jsdom / non-browser — no-op
  }
}

/** Web preview only — sessionStorage clears when the tab closes. Tauri uses Rust key store. */
function webSecretStorage(): Storage {
  return sessionStorage;
}

/** Sign a NIP-98 HTTP proof. The private key stays in the current browser. */
export function createHttpAuthHeader(
  url: string,
  method: string,
  body: string,
): string {
  const secret = webSecretStorage().getItem(SECRET_KEY);
  if (!secret) throw new Error("Sign in again to save posts or upload media.");
  const event = finalizeEvent(
    {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      content: "",
      tags: [
        ["u", new URL(url, window.location.origin).href],
        ["method", method],
        ["payload", bytesToHex(sha256(new TextEncoder().encode(body)))],
      ],
    },
    hexToBytes(secret),
  );
  return `Nostr ${btoa(JSON.stringify(event))}`;
}

// ─── First Run Check ─────────────────────────────────────

export function isFirstRun(): boolean {
  return !localStorage.getItem(FIRST_RUN_KEY);
}

export function markFirstRunComplete() {
  localStorage.setItem(FIRST_RUN_KEY, "true");
}

// ─── Key Generation ─────────────────────────────────────

export function createNostrIdentity(): { nsecHex: string; pubkey: string } {
  const sk = generateSecretKey();
  const pubkey = getPublicKey(sk);
  return { nsecHex: bytesToHex(sk), pubkey };
}

export function derivePubkey(key: string): string {
  const nsecHex = normalizeSecretKey(key);
  return getPublicKey(hexToBytes(nsecHex));
}

/**
 * Accept mnemonic (12/24 words), nsec1 bech32, or 64-char hex.
 * Always returns lowercase 64-char hex for storage and signing.
 */
export function normalizeSecretKey(input: string): string {
  const raw = input.trim();
  if (!raw) {
    throw new Error("Secret key is empty");
  }
  // BIP39 mnemonic (spaces between words)
  if (/\s/.test(raw) || raw.split(/\s+/).length >= 12) {
    return mnemonicToNsec(raw).toLowerCase();
  }
  if (raw.toLowerCase().startsWith("nsec1")) {
    const decoded = nip19.decode(raw);
    if (decoded.type !== "nsec") {
      throw new Error("Invalid nsec — expected nsec1 bech32 secret");
    }
    return bytesToHex(decoded.data as Uint8Array);
  }
  const hex = raw.toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error(
      "Invalid key — use your 24-word recovery phrase, nsec1…, or 64-char hex",
    );
  }
  return hex;
}

// ─── BIP39 Mnemonic (Key Recovery) ─────────────────────

export function nsecToMnemonic(nsecHex: string): string {
  return entropyToMnemonic(hexToBytes(nsecHex) as any);
}

export function mnemonicToNsec(mnemonic: string): string {
  const cleaned = mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
  if (!validateMnemonic(cleaned)) {
    throw new Error("Invalid recovery phrase — check your words and try again");
  }
  return mnemonicToEntropy(cleaned);
}

/**
 * Explicit recovery export only (Settings "Show Recovery Phrase").
 * Does not load the key for routine app operations — signing stays in Rust.
 */
export async function exportRecoveryNsec(
  sessionToken: string,
  handle: string,
): Promise<string | null> {
  if (isTauri()) {
    return await tauriExportRecoveryKey(sessionToken, handle);
  }
  return webSecretStorage().getItem(SECRET_KEY);
}

/** @deprecated Use exportRecoveryNsec for explicit backup reveal only. */
export async function getStoredNsec(
  sessionToken: string,
  handle: string,
): Promise<string | null> {
  return exportRecoveryNsec(sessionToken, handle);
}

// ─── Auth Event Signing ─────────────────────────────────

export async function signAuthEvent(
  nsecHex: string,
  challenge: string,
): Promise<{ authEvent: string; pubkey: string }> {
  const sk = hexToBytes(nsecHex);
  const pubkey = getPublicKey(sk);

  const event = {
    kind: 22242,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["challenge", challenge],
      ["relay", "blkspace"],
    ],
    content: "",
    pubkey,
  };

  const signed = finalizeEvent(event, sk);
  return { authEvent: JSON.stringify(signed), pubkey };
}

// ─── Identity Storage ───────────────────────────────────

function webStore(handle: string, nsecHex: string, displayName: string) {
  purgeLegacyWebSecrets();
  webSecretStorage().setItem(SECRET_KEY, nsecHex);
  localStorage.setItem(HANDLE_KEY, handle);
  localStorage.setItem(DISPLAY_KEY, displayName);
}

export async function storeIdentity(
  sessionToken: string,
  handle: string,
  nsecHex: string,
  displayName: string,
) {
  if (isTauri()) {
    await tauriStoreKey(sessionToken, handle, nsecHex);
    localStorage.setItem(HANDLE_KEY, handle);
    localStorage.setItem(DISPLAY_KEY, displayName);
    purgeLegacyWebSecrets();
  } else {
    webStore(handle, nsecHex, displayName);
  }
}

export function storeSession(token: string, pubkey: string) {
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(PUBKEY_KEY, pubkey);
  localStorage.removeItem(GUEST_KEY);
  notifyIdentityChange();
}

export function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function getStoredPubkey(): string | null {
  return localStorage.getItem(PUBKEY_KEY);
}

export function clearSession() {
  const token = localStorage.getItem(SESSION_KEY);
  if (token && isTauri()) {
    // Local state is cleared below either way, so the user is never stuck
    // signed in. But a swallowed failure here means the server may still
    // consider this token live while the UI shows signed out — so log it
    // rather than discard it. Revocation should ideally be retried, which is
    // why this is surfaced instead of silenced.
    tauriLogout(token).catch((err) => {
      console.error(
        "[auth] server logout failed; local session cleared but the token may still be valid:",
        err,
      );
    });
  }
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(PUBKEY_KEY);
  notifyIdentityChange();
}

// ─── Login Flow ─────────────────────────────────────────

export async function authenticateWithNostr(
  handle: string,
  nsecHex: string,
): Promise<string> {
  const secret = normalizeSecretKey(nsecHex);

  // 1. Get challenge from server
  const challenge = isTauri()
    ? await tauriGetChallenge(handle)
    : "web_challenge";

  // 2. Sign auth event
  const { authEvent, pubkey } = await signAuthEvent(secret, challenge);

  // 3. Send login request
  const token = isTauri()
    ? await tauriLogin(handle, pubkey, challenge, authEvent)
    : "web_session_token";

  // 4. Store session
  storeSession(token, pubkey);
  localStorage.setItem(HANDLE_KEY, handle);
  localStorage.setItem(DISPLAY_KEY, handle);

  return token;
}

/**
 * Re-authenticate a native account using the key already held by Rust KeyStore.
 * The key never crosses the Tauri boundary; JavaScript receives only a session token.
 */
export async function authenticateWithStoredKey(
  handle: string,
): Promise<string> {
  if (!isTauri()) {
    throw new Error(
      "Saved-device sign-in is only available in the desktop app.",
    );
  }
  const cleanHandle = handle.trim();
  if (!cleanHandle) {
    throw new Error("Enter your handle to continue.");
  }
  let token: string;
  try {
    token = await tauriLoginWithStoredKey(cleanHandle);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/no user nostr key|no key/i.test(message)) {
      throw new Error(
        "No saved key was found on this device. Use your recovery phrase or backup file instead.",
      );
    }
    throw error;
  }
  const user = await tauriGetUser(cleanHandle);
  if (!user) {
    throw new Error("This handle is no longer available on the server.");
  }
  storeSession(token, user.pubkey);
  localStorage.setItem(HANDLE_KEY, cleanHandle);
  localStorage.setItem(DISPLAY_KEY, user.displayName || cleanHandle);
  return token;
}

/**
 * On app boot: drop stale sessions and web sessions with no secret.
 * Call once at startup (App mount).
 */
export async function verifySessionOnBoot(): Promise<void> {
  const token = getSessionToken();
  if (!token) return;

  if (isTauri()) {
    try {
      // Returns handle on success; throws / rejects when session is invalid.
      await tauriVerifySession(token);
    } catch {
      // Keep the non-secret handle/display name so the native login screen can
      // offer "sign in on this device" without asking for a backup file.
      clearSession();
    }
    return;
  }

  // Web: durable session without tab-scoped secret is unusable — force re-auth
  const secret = webSecretStorage().getItem(SECRET_KEY);
  if (!secret) {
    clearSession();
  }
}

// ─── Current User ───────────────────────────────────────

/**
 * Placeholder handle used when no identity is stored.
 *
 * This is the ONE place a shared "demo" identity is permitted, because the
 * browser build has no session and the return type is non-nullable. It is a
 * local-only label for signed-out UI, never an authenticated identity, and it
 * must never be sent to a backend as an actor. Every other site that used
 * `getCurrentHandle() || "demo_user"` was dead code and has been removed.
 */
export const ANONYMOUS_HANDLE = "demo_user";

export async function getIdentity(): Promise<{
  handle: string;
  displayName: string;
  hasKey: boolean;
}> {
  const handle = localStorage.getItem(HANDLE_KEY) || ANONYMOUS_HANDLE;
  const displayName = localStorage.getItem(DISPLAY_KEY) || "Demo User";

  if (isTauri()) {
    const token = getSessionToken();
    if (!token) return { handle, displayName, hasKey: false };
    const stored = await tauriHasKey(token, handle);
    return { handle, displayName, hasKey: stored };
  }
  const hasKey = !!(
    webSecretStorage().getItem(SECRET_KEY) ||
    webSecretStorage().getItem(LEGACY_SECRET_KEY)
  );
  return { handle, displayName, hasKey };
}

export function getCurrentHandle(): string {
  return localStorage.getItem(HANDLE_KEY) || ANONYMOUS_HANDLE;
}

export function getCurrentDisplayName(): string {
  return localStorage.getItem(DISPLAY_KEY) || "Demo User";
}

function purgeLegacyWebSecrets() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(SECRET_KEY);
    storage.removeItem(LEGACY_SECRET_KEY);
  }
}

export function clearIdentity() {
  clearSession();
  purgeLegacyWebSecrets();
  localStorage.removeItem(HANDLE_KEY);
  localStorage.removeItem(DISPLAY_KEY);
  notifyIdentityChange();
}

// ─── Guest Mode (anonymous browse) ──────────────────────

/**
 * A user "has an identity" when a session token exists from the welcome wizard
 * or login. Guests (no token) can browse but not write.
 */
export function hasIdentity(): boolean {
  return !!getSessionToken();
}

export function isGuest(): boolean {
  return !hasIdentity();
}

/**
 * Mark first-run complete and flag guest mode so the app routes to /feed
 * without requiring key generation. Does NOT create a Nostr identity.
 */
export function enterGuestMode() {
  markFirstRunComplete();
  localStorage.setItem(GUEST_KEY, "true");
  notifyIdentityChange();
}

/** Clear the guest flag (called when the user creates an account or signs in). */
export function exitGuestMode() {
  localStorage.removeItem(GUEST_KEY);
  notifyIdentityChange();
}
