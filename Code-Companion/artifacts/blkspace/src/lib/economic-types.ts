/** Shared types + finite status machines for Fast + Transparent economic UX. */

export type TipStatus = "pending" | "confirmed" | "settled" | "failed";

export type EscrowStatus =
  | "listed"
  | "matched"
  | "funds_locked"
  | "delivered"
  | "released"
  | "dispute";

/** Extra terminal state kept for existing refunds. */
export type EscrowStatusExtended = EscrowStatus | "refunded";

export interface TipRecord {
  id: string;
  fromPubkey: string;
  toPubkey: string;
  amount: number;
  fee: number;
  message?: string;
  status: TipStatus;
  createdAt: number;
  settledAt?: number;
  nostrEventId?: string;
}

export interface EscrowEvent {
  status: string;
  at: number;
  by: string;
  note?: string;
}

export interface EscrowRecord {
  id: string;
  listingId: string;
  buyerPubkey: string;
  sellerPubkey: string;
  amount: number;
  fee: number;
  status: EscrowStatusExtended;
  createdAt: number;
  updatedAt: number;
  deliveryProof?: string;
  disputeReason?: string;
  events: EscrowEvent[];
}

export type HistoryKind = "tip" | "escrow";

export interface HistoryItem {
  id: string;
  kind: HistoryKind;
  title: string;
  description: string;
  amount: number;
  fee?: number;
  status: string;
  createdAt: number;
  counterparty?: string;
  nostrEventId?: string;
  solanaSignature?: string;
  yardCredDelta?: number;
}

export const TIP_TRANSITIONS: Record<TipStatus, TipStatus[]> = {
  pending: ["confirmed", "failed"],
  confirmed: ["settled", "failed"],
  settled: [],
  failed: [],
};

export const ESCROW_TRANSITIONS: Record<EscrowStatusExtended, EscrowStatusExtended[]> =
  {
    listed: ["matched"],
    matched: ["funds_locked"],
    funds_locked: ["delivered", "dispute", "released", "refunded"],
    delivered: ["released", "dispute", "refunded"],
    dispute: ["delivered", "released", "refunded"],
    released: [],
    refunded: [],
  };

export function canTransitionTip(from: TipStatus, to: TipStatus): boolean {
  return TIP_TRANSITIONS[from].includes(to);
}

export function canTransitionEscrow(
  from: EscrowStatusExtended,
  to: EscrowStatusExtended,
): boolean {
  return ESCROW_TRANSITIONS[from].includes(to);
}

export function assertEscrowTransition(
  from: EscrowStatusExtended,
  to: EscrowStatusExtended,
): void {
  if (!canTransitionEscrow(from, to)) {
    throw new Error(`Illegal escrow transition '${from}' → '${to}'`);
  }
}

/** Map existing marketplace / Tauri statuses onto the shared machine. */
export function toCanonicalEscrowStatus(status: string): EscrowStatusExtended {
  switch (status) {
    case "funded":
      return "funds_locked";
    case "disputed":
      return "dispute";
    case "listed":
    case "matched":
    case "funds_locked":
    case "delivered":
    case "released":
    case "dispute":
    case "refunded":
      return status;
    default:
      return "listed";
  }
}

export const ESCROW_STATUS_LABEL: Record<EscrowStatusExtended, string> = {
  listed: "Listed",
  matched: "Matched",
  funds_locked: "Funds Locked",
  delivered: "Delivered",
  released: "Released",
  dispute: "Dispute",
  refunded: "Refunded",
};

export const TIP_STATUS_LABEL: Record<TipStatus, string> = {
  pending: "Pending",
  confirmed: "Settling",
  settled: "Settled",
  failed: "Failed",
};

export type EconomicBadgeStatus =
  | TipStatus
  | EscrowStatusExtended
  | "idle"
  | "submitting"
  | "optimistic"
  | "settling";
