/**
 * Password-wrapped nsec backup for campus users who will not save 24 words.
 * Ciphertext only — BlkSpace cannot reset a forgotten password.
 */
import { derivePubkey } from "@/lib/auth";

export const BACKUP_STORAGE_KEY = "blkspace_account_backup_v1";
export const BACKUP_KIND = "blkspace-nsec-backup" as const;
export const BACKUP_ITERATIONS = 120_000;
export const MIN_BACKUP_PASSWORD = 8;

export type AccountBackupV1 = {
  v: 1;
  kind: typeof BACKUP_KIND;
  handle: string;
  pubkey: string;
  kdf: "pbkdf2-sha256";
  iter: number;
  salt: string;
  iv: string;
  ct: string;
};

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function requireSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("This browser cannot encrypt a backup (no Web Crypto)");
  }
  return subtle;
}

async function keyFromPassword(
  password: string,
  salt: Uint8Array,
  iter: number,
): Promise<CryptoKey> {
  const subtle = requireSubtle();
  const base = await subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: iter,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function assertBackupPassword(password: string): void {
  if (password.length < MIN_BACKUP_PASSWORD) {
    throw new Error(`Password must be at least ${MIN_BACKUP_PASSWORD} characters`);
  }
}

export async function createPasswordBackup(opts: {
  nsecHex: string;
  handle: string;
  password: string;
}): Promise<AccountBackupV1> {
  assertBackupPassword(opts.password);
  const handle = opts.handle.trim();
  if (!handle) throw new Error("Handle is required");
  const nsecHex = opts.nsecHex.trim().toLowerCase();
  const pubkey = derivePubkey(nsecHex);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFromPassword(opts.password, salt, BACKUP_ITERATIONS);
  const ct = await requireSubtle().encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(nsecHex),
  );
  return {
    v: 1,
    kind: BACKUP_KIND,
    handle,
    pubkey,
    kdf: "pbkdf2-sha256",
    iter: BACKUP_ITERATIONS,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    ct: bytesToB64(new Uint8Array(ct)),
  };
}

export function parseBackupJson(raw: string): AccountBackupV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That file is not a BlkSpace backup");
  }
  const b = parsed as Partial<AccountBackupV1>;
  if (
    b.v !== 1 ||
    b.kind !== BACKUP_KIND ||
    typeof b.handle !== "string" ||
    typeof b.pubkey !== "string" ||
    b.kdf !== "pbkdf2-sha256" ||
    typeof b.iter !== "number" ||
    typeof b.salt !== "string" ||
    typeof b.iv !== "string" ||
    typeof b.ct !== "string"
  ) {
    throw new Error("That file is not a BlkSpace backup");
  }
  return b as AccountBackupV1;
}

export async function restorePasswordBackup(
  backup: AccountBackupV1 | string,
  password: string,
): Promise<{ nsecHex: string; handle: string; pubkey: string }> {
  const b = typeof backup === "string" ? parseBackupJson(backup) : backup;
  const key = await keyFromPassword(
    password,
    b64ToBytes(b.salt),
    b.iter || BACKUP_ITERATIONS,
  );
  let plain: ArrayBuffer;
  try {
    plain = await requireSubtle().decrypt(
      { name: "AES-GCM", iv: b64ToBytes(b.iv) as BufferSource },
      key,
      b64ToBytes(b.ct) as BufferSource,
    );
  } catch {
    throw new Error("Wrong password or damaged backup");
  }
  const nsecHex = new TextDecoder().decode(plain).trim().toLowerCase();
  const pubkey = derivePubkey(nsecHex);
  if (pubkey !== b.pubkey) {
    throw new Error("Backup does not match this account");
  }
  return { nsecHex, handle: b.handle, pubkey };
}

export function persistBackupLocally(backup: AccountBackupV1): void {
  localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backup));
}

export function loadLocalBackup(): AccountBackupV1 | null {
  const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
  if (!raw) return null;
  try {
    return parseBackupJson(raw);
  } catch {
    return null;
  }
}

export function downloadBackupFile(backup: AccountBackupV1): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `blkspace-backup-${backup.handle}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
