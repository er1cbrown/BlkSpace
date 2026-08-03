/**
 * Sendme-inspired share tickets (client helpers).
 * @see https://github.com/n0-computer/sendme
 * @see docs/features/sendme-iroh-transfer.md
 */

export const BLKSPACE_TICKET_PREFIX = "blkspace1.";

export function isBlkspaceTicket(s: string): boolean {
  return s.trim().startsWith(BLKSPACE_TICKET_PREFIX);
}

/** Best-effort: long single-token paste that is not ours → treat as external sendme ticket. */
export function looksLikeExternalSendmeTicket(s: string): boolean {
  const t = s.trim();
  return (
    t.length > 32 &&
    !t.includes(" ") &&
    !t.startsWith(BLKSPACE_TICKET_PREFIX) &&
    !t.startsWith("{")
  );
}

export const SENDME_DOCS = "https://github.com/n0-computer/sendme";
export const SENDME_INSTALL = "cargo install sendme";
