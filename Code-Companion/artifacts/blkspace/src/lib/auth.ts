import {
  isTauri,
  tauriStoreKey,
  tauriGetKey,
  tauriHasKey,
  tauriGetChallenge,
  tauriLogin,
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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export const HANDLE_KEY = "blkspace_handle";
export const DISPLAY_KEY = "blkspace_display_name";
export const SESSION_KEY = "blkspace_session";
export const PUBKEY_KEY = "blkspace_pubkey";
export const FIRST_RUN_KEY = "blkspace_first_run_complete";
const SECRET_KEY = "blkspace_nsec";
const LEGACY_SECRET_KEY = "blkspace_key";

/** Web preview only — sessionStorage clears when the tab closes. Tauri uses Rust key store. */
function webSecretStorage(): Storage {
  return sessionStorage;
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
  let sk: Uint8Array;
  if (key.startsWith("nsec1")) {
    const decoded = nip19.decode(key);
    sk = decoded.data as Uint8Array;
  } else {
    sk = hexToBytes(key);
  }
  return getPublicKey(sk);
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

export async function getStoredNsec(
  sessionToken: string,
  handle: string,
): Promise<string | null> {
  if (isTauri()) {
    return await tauriGetKey(sessionToken, handle);
  }
  return webSecretStorage().getItem(SECRET_KEY);
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
    tauriLogout(token).catch(() => {});
  }
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(PUBKEY_KEY);
}

// ─── Login Flow ─────────────────────────────────────────

export async function authenticateWithNostr(
  handle: string,
  nsecHex: string,
): Promise<string> {
  // 1. Get challenge from server
  const challenge = isTauri()
    ? await tauriGetChallenge(handle)
    : "web_challenge";

  // 2. Sign auth event
  const { authEvent, pubkey } = await signAuthEvent(nsecHex, challenge);

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

// ─── Current User ───────────────────────────────────────

export async function getIdentity(): Promise<{
  handle: string;
  displayName: string;
  hasKey: boolean;
}> {
  const handle = localStorage.getItem(HANDLE_KEY) || "demo_user";
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
  return localStorage.getItem(HANDLE_KEY) || "demo_user";
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
}
