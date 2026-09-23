/**
 * BKSPC identity: one @handle inside the app, and handle@bkspc.app as the address.
 * Other social accounts attach to this handle later.
 */

const HANDLE_RE = /^[A-Za-z][A-Za-z0-9]{2,19}$/;

export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export function handleError(raw: string): string | null {
  const handle = normalizeHandle(raw);
  if (!handle) return "Pick a handle.";
  if (!HANDLE_RE.test(handle)) {
    return "Handle is 3–20 characters, Latin letters and digits 0–9, starting with a letter.";
  }
  return null;
}

export function bkspcAddress(handle: string): string {
  return `${normalizeHandle(handle)}@bkspc.app`;
}

/** Latin letters, digits 0–9, and symbols. No other scripts or numeral systems. */
export function passwordError(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (![...password].every((ch) => ch.charCodeAt(0) >= 33 && ch.charCodeAt(0) <= 126)) {
    return "Use only Latin letters, digits 0–9, and symbols.";
  }
  if (!/[a-z]/.test(password)) return "Include at least one lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Include at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Include at least one digit 0–9.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Include at least one symbol.";
  return null;
}
