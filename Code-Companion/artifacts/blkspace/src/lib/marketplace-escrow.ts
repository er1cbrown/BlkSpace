/**
 * Yard Sale + 2-party escrow client.
 * Tauri when available; localStorage demo store for web promo demos.
 */
import { isTauri } from "@/lib/tauri-api";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";
import { invoke } from "@tauri-apps/api/core";
import { ESCROW_DEFAULT_TYPES } from "@/lib/myyard-catalog";
import {
  assertEscrowTransition,
  ESCROW_STATUS_LABEL,
  toCanonicalEscrowStatus,
  type EscrowEvent,
  type EscrowStatusExtended,
} from "@/lib/economic-types";
import { applyBalanceDelta, pushHistory } from "@/lib/economic-store";
import { YARD_CRED_RELEASE_DELTA } from "@/lib/yard-cred-privileges";

export type FulfillmentMode = "instant" | "escrow";

export interface MarketplaceListing {
  id: number;
  sellerHandle: string;
  itemType: string;
  itemRef?: string | null;
  price: number;
  title: string;
  description?: string | null;
  isNft?: boolean;
  nftMint?: string | null;
  townTag?: string | null;
  fulfillmentMode?: FulfillmentMode | string;
  orgId?: string | null;
  orgName?: string | null;
  orgSplitBps?: number;
  deliveryHint?: string | null;
  soldTo?: string | null;
  createdAt?: string;
}

export interface EscrowTrade {
  id: number;
  listingId: number;
  buyerHandle: string;
  sellerHandle: string;
  amount: number;
  platformFee: number;
  orgFee: number;
  sellerNet: number;
  orgId?: string | null;
  orgName?: string | null;
  status: string;
  deliveryRef?: string | null;
  deliveryNote?: string | null;
  disputeReason?: string | null;
  events?: EscrowEvent[];
  receiptJson?: string | null;
  listingTitle: string;
  itemType: string;
  townTag: string;
  createdAt: string;
  updatedAt: string;
}

const STORE_KEY = "blkspace_marketplace_escrow_v1";
const FEE_BPS = 500;

type DemoStore = {
  listings: MarketplaceListing[];
  escrows: EscrowTrade[];
  nextListingId: number;
  nextEscrowId: number;
  /** handle → WB balance delta from escrow activity (demo only) */
  balances: Record<string, number>;
};

function defaultStore(): DemoStore {
  return {
    listings: [
      {
        id: 1,
        sellerHandle: "campus_king",
        itemType: "mockup",
        itemRef: "fashion:mockup:homecoming-tee",
        price: 45,
        title: "Homecoming Tee Mockup (front/back)",
        description:
          "Print-ready mockup pack for TSU homecoming. Escrow: deliver PSD/PNG after pay.",
        isNft: false,
        townTag: "tsu",
        fulfillmentMode: "escrow",
        orgId: "org_fashion_tsu",
        orgName: "TSU Fashion Collective",
        orgSplitBps: 1000,
        deliveryHint: "CID or link to PSD",
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        sellerHandle: "campus_king",
        itemType: "blueprint",
        itemRef: "fashion:techpack:hoodie-v1",
        price: 80,
        title: "Street Hoodie Tech Pack v1",
        description:
          "Full tech pack: measurements, BOM, stitch notes. 10% to Fashion Collective.",
        isNft: false,
        townTag: "tsu",
        fulfillmentMode: "escrow",
        orgId: "org_fashion_tsu",
        orgName: "TSU Fashion Collective",
        orgSplitBps: 1000,
        deliveryHint: "PDF tech pack CID",
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        sellerHandle: "hbcustudent",
        itemType: "art",
        itemRef: "fashion:art:lookbook-01",
        price: 35,
        title: "Lookbook Illustration — Night Market",
        description: "Original digital art for collab lookbooks.",
        isNft: false,
        townTag: "howard",
        fulfillmentMode: "escrow",
        orgId: "org_fashion_howard",
        orgName: "Howard Style Lab",
        orgSplitBps: 800,
        deliveryHint: "PNG/SVG CID",
        createdAt: new Date().toISOString(),
      },
      {
        id: 4,
        sellerHandle: "hbcustudent",
        itemType: "merch-digital",
        itemRef: "fashion:merch:sticker-pack",
        price: 15,
        title: "Yard Sticker Pack (digital)",
        description: "6 PNG stickers for campus brands.",
        isNft: false,
        townTag: "howard",
        fulfillmentMode: "escrow",
        orgId: "org_fashion_howard",
        orgName: "Howard Style Lab",
        orgSplitBps: 500,
        deliveryHint: "ZIP of PNGs",
        createdAt: new Date().toISOString(),
      },
      {
        id: 5,
        sellerHandle: "jane_doe",
        itemType: "fashion",
        itemRef: "fashion:drop:atelier-ss",
        price: 60,
        title: "Atelier SS Capsule Concept",
        description:
          "Capsule concept board + fabric notes. Spelman Atelier · 12% club split.",
        isNft: false,
        townTag: "spelman",
        fulfillmentMode: "escrow",
        orgId: "org_fashion_spelman",
        orgName: "Spelman Atelier",
        orgSplitBps: 1200,
        deliveryHint: "Concept board CID",
        createdAt: new Date().toISOString(),
      },
      {
        id: 6,
        sellerHandle: "demo_user",
        itemType: "theme",
        itemRef: "theme:vibrant",
        price: 20,
        title: "Vibrant Yard Theme",
        description: "Instant apply to MyYard.",
        isNft: false,
        townTag: "tsu",
        fulfillmentMode: "instant",
        orgSplitBps: 0,
        createdAt: new Date().toISOString(),
      },
    ],
    escrows: [],
    nextListingId: 7,
    nextEscrowId: 1,
    balances: {},
  };
}

function load(): DemoStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as DemoStore;
  } catch {
    /* ignore */
  }
  const s = defaultStore();
  save(s);
  return s;
}

function save(s: DemoStore) {
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
}

function feeOf(amount: number, bps: number) {
  if (amount <= 0 || bps <= 0) return 0;
  return Math.floor((amount * bps) / 10000);
}

function defaultMode(itemType: string): FulfillmentMode {
  return (ESCROW_DEFAULT_TYPES as readonly string[]).includes(itemType)
    ? "escrow"
    : "instant";
}

function nowMs() {
  return Date.now();
}

function pushEvent(
  e: EscrowTrade,
  status: EscrowStatusExtended,
  by: string,
  note?: string,
) {
  const from = toCanonicalEscrowStatus(e.status);
  if (from !== status) assertEscrowTransition(from, status);
  e.status = status;
  e.updatedAt = new Date().toISOString();
  e.events = e.events || [];
  e.events.push({ status, at: nowMs(), by, note });
}

function recordEscrowHistory(
  e: EscrowTrade,
  amount: number,
  actor: string,
) {
  const canonical = toCanonicalEscrowStatus(e.status);
  pushHistory({
    id: `hist_escrow_${e.id}_${canonical}`,
    kind: "escrow",
    title: e.listingTitle,
    description: `${ESCROW_STATUS_LABEL[canonical]} · @${actor}`,
    amount,
    fee: e.platformFee,
    status: canonical,
    createdAt: nowMs(),
    counterparty:
      actor === e.buyerHandle ? e.sellerHandle : e.buyerHandle,
    nostrEventId: `local:escrow:${e.id}:${canonical}`,
    yardCredDelta:
      canonical === "released" ? YARD_CRED_RELEASE_DELTA : undefined,
  });
}

// ─── Public API ──────────────────────────────────────────

export async function listMarketplace(): Promise<MarketplaceListing[]> {
  if (isTauri()) {
    const token = getSessionToken() || "";
    return invoke("list_marketplace", { sessionToken: token });
  }
  return load().listings.filter((l) => !l.soldTo);
}

export async function createMarketplaceListing(args: {
  itemType: string;
  itemRef: string | null;
  price: number;
  title: string;
  description: string | null;
  isNft: boolean;
  townTag?: string | null;
  fulfillmentMode?: FulfillmentMode | null;
  orgId?: string | null;
  orgSplitBps?: number | null;
  deliveryHint?: string | null;
}): Promise<number> {
  if (isTauri()) {
    return invoke("create_marketplace_listing", {
      sessionToken: getSessionToken() || "",
      itemType: args.itemType,
      itemRef: args.itemRef,
      price: args.price,
      title: args.title,
      description: args.description,
      isNft: args.isNft,
      townTag: args.townTag ?? null,
      fulfillmentMode: args.fulfillmentMode ?? null,
      orgId: args.orgId ?? null,
      orgSplitBps: args.orgSplitBps ?? null,
      deliveryHint: args.deliveryHint ?? null,
    });
  }

  const me = getCurrentHandle() || "demo_user";
  const s = load();
  const id = s.nextListingId++;
  const mode = args.fulfillmentMode || defaultMode(args.itemType);
  s.listings.push({
    id,
    sellerHandle: me,
    itemType: args.itemType,
    itemRef: args.itemRef,
    price: args.price,
    title: args.title,
    description: args.description,
    isNft: args.isNft,
    townTag: args.townTag || "tsu",
    fulfillmentMode: mode,
    orgId: args.orgId,
    orgSplitBps: args.orgSplitBps ?? 0,
    deliveryHint: args.deliveryHint || "",
    createdAt: new Date().toISOString(),
  });
  save(s);
  return id;
}

export async function buyMarketplaceListing(
  listingId: number,
): Promise<Record<string, unknown>> {
  if (isTauri()) {
    return invoke("buy_marketplace_listing", {
      sessionToken: getSessionToken() || "",
      listingId,
    });
  }

  const me = getCurrentHandle() || "demo_user";
  const s = load();
  const listing = s.listings.find((l) => l.id === listingId && !l.soldTo);
  if (!listing) throw new Error("Listing not found");
  if (listing.sellerHandle === me)
    throw new Error("Cannot buy your own listing");

  const mode = listing.fulfillmentMode || defaultMode(listing.itemType);
  const platformFee = feeOf(listing.price, FEE_BPS);
  const afterPlatform = listing.price - platformFee;
  const orgFee =
    listing.orgId && (listing.orgSplitBps || 0) > 0
      ? feeOf(afterPlatform, Math.min(listing.orgSplitBps || 0, 5000))
      : 0;
  const sellerNet = afterPlatform - orgFee;

  if (mode === "escrow") {
    listing.soldTo = me;
    const escrowId = s.nextEscrowId++;
    const t0 = nowMs();
    const trade: EscrowTrade = {
      id: escrowId,
      listingId: listing.id,
      buyerHandle: me,
      sellerHandle: listing.sellerHandle,
      amount: listing.price,
      platformFee,
      orgFee,
      sellerNet,
      orgId: listing.orgId,
      orgName: listing.orgName,
      status: "listed",
      listingTitle: listing.title,
      itemType: listing.itemType,
      townTag: listing.townTag || "tsu",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      events: [
        { status: "listed", at: t0, by: listing.sellerHandle, note: "Listing" },
      ],
    };
    pushEvent(trade, "matched", me, "Buyer matched");
    pushEvent(trade, "funds_locked", me, "Funds locked");
    s.escrows.push(trade);
    s.balances[me] = (s.balances[me] || 0) - listing.price;
    applyBalanceDelta(me, -listing.price);
    recordEscrowHistory(trade, -listing.price, me);
    save(s);
    return {
      escrowId,
      listingId: listing.id,
      status: "funds_locked",
      fulfillmentMode: "escrow",
      seller: listing.sellerHandle,
      amount: listing.price,
      platformFee,
      orgFee,
      sellerNet,
      title: listing.title,
      nextStep: "Seller marks delivered with delivery ref",
    };
  }

  listing.soldTo = me;
  s.balances[me] = (s.balances[me] || 0) - listing.price;
  s.balances[listing.sellerHandle] =
    (s.balances[listing.sellerHandle] || 0) + sellerNet;
  save(s);
  return {
    id: listing.id,
    seller: listing.sellerHandle,
    price: listing.price,
    fulfillmentMode: "instant",
    itemType: listing.itemType,
    applied: {},
  };
}

export async function listMyEscrows(): Promise<EscrowTrade[]> {
  if (isTauri()) {
    return invoke("list_my_escrows", {
      sessionToken: getSessionToken() || "",
    });
  }
  const me = getCurrentHandle() || "demo_user";
  return load().escrows.filter(
    (e) => e.buyerHandle === me || e.sellerHandle === me,
  );
}

export async function escrowMarkDelivered(
  escrowId: number,
  deliveryRef: string,
  deliveryNote?: string | null,
): Promise<Record<string, unknown>> {
  if (isTauri()) {
    return invoke("escrow_mark_delivered", {
      sessionToken: getSessionToken() || "",
      escrowId,
      deliveryRef,
      deliveryNote: deliveryNote ?? null,
    });
  }
  const me = getCurrentHandle() || "demo_user";
  const s = load();
  const e = s.escrows.find((x) => x.id === escrowId);
  if (!e) throw new Error("Escrow not found");
  if (e.sellerHandle !== me) throw new Error("Only seller can mark delivered");
  const from = toCanonicalEscrowStatus(e.status);
  if (from !== "funds_locked" && from !== "dispute") {
    throw new Error(`Cannot deliver from status '${e.status}'`);
  }
  if (!deliveryRef.trim()) throw new Error("Delivery ref required");
  e.deliveryRef = deliveryRef.trim();
  e.deliveryNote = deliveryNote || "";
  pushEvent(e, "delivered", me, e.deliveryRef);
  recordEscrowHistory(e, 0, me);
  save(s);
  return {
    escrowId,
    status: "delivered",
    deliveryRef: e.deliveryRef,
    nextStep: "Buyer confirms receipt to release WeixBucks",
  };
}

export async function escrowConfirmRelease(
  escrowId: number,
): Promise<Record<string, unknown>> {
  if (isTauri()) {
    return invoke("escrow_confirm_release", {
      sessionToken: getSessionToken() || "",
      escrowId,
    });
  }
  const me = getCurrentHandle() || "demo_user";
  const s = load();
  const e = s.escrows.find((x) => x.id === escrowId);
  if (!e) throw new Error("Escrow not found");
  if (e.buyerHandle !== me) throw new Error("Only buyer can confirm release");
  const from = toCanonicalEscrowStatus(e.status);
  if (from !== "delivered" && from !== "funds_locked") {
    throw new Error(`Cannot release from status '${e.status}'`);
  }
  pushEvent(e, "released", me, "Buyer confirmed receipt");
  applyBalanceDelta(e.sellerHandle, e.sellerNet);
  recordEscrowHistory(e, e.sellerNet, me);
  s.balances[e.sellerHandle] = (s.balances[e.sellerHandle] || 0) + e.sellerNet;
  if (e.orgFee > 0 && e.orgId) {
    // Demo: credit org seller-side club owner heuristically
    const treasury = e.orgId.includes("howard")
      ? "hbcustudent"
      : e.orgId.includes("spelman")
        ? "jane_doe"
        : "campus_king";
    s.balances[treasury] = (s.balances[treasury] || 0) + e.orgFee;
  }
  const receipt = {
    type: "blkspace_escrow_receipt_v1",
    escrowId: e.id,
    listingId: e.listingId,
    title: e.listingTitle,
    buyer: e.buyerHandle,
    seller: e.sellerHandle,
    amountWb: e.amount,
    platformFeeWb: e.platformFee,
    orgFeeWb: e.orgFee,
    sellerNetWb: e.sellerNet,
    orgId: e.orgId,
    deliveryRef: e.deliveryRef,
    releasedAt: new Date().toISOString(),
  };
  e.receiptJson = JSON.stringify(receipt);
  save(s);
  return {
    escrowId,
    status: "released",
    sellerNet: e.sellerNet,
    orgFee: e.orgFee,
    platformFee: e.platformFee,
    receipt,
    applied: {},
  };
}

export async function escrowOpenDispute(
  escrowId: number,
  reason?: string | null,
): Promise<Record<string, unknown>> {
  if (isTauri()) {
    return invoke("escrow_open_dispute", {
      sessionToken: getSessionToken() || "",
      escrowId,
      reason: reason ?? null,
    });
  }
  const me = getCurrentHandle() || "demo_user";
  const s = load();
  const e = s.escrows.find((x) => x.id === escrowId);
  if (!e) throw new Error("Escrow not found");
  if (e.buyerHandle !== me && e.sellerHandle !== me) {
    throw new Error("Not a party to this escrow");
  }
  const from = toCanonicalEscrowStatus(e.status);
  if (from !== "funds_locked" && from !== "delivered") {
    throw new Error(`Cannot dispute from status '${e.status}'`);
  }
  e.disputeReason = reason || "opened";
  e.deliveryNote = [e.deliveryNote, `dispute: ${e.disputeReason}`]
    .filter(Boolean)
    .join(" | ");
  pushEvent(e, "dispute", me, e.disputeReason);
  recordEscrowHistory(e, 0, me);
  save(s);
  return { escrowId, status: "dispute", openedBy: me };
}

export async function escrowRefund(
  escrowId: number,
): Promise<Record<string, unknown>> {
  if (isTauri()) {
    return invoke("escrow_refund", {
      sessionToken: getSessionToken() || "",
      escrowId,
    });
  }
  const me = getCurrentHandle() || "demo_user";
  const s = load();
  const e = s.escrows.find((x) => x.id === escrowId);
  if (!e) throw new Error("Escrow not found");
  if (e.buyerHandle !== me && e.sellerHandle !== me) {
    throw new Error("Not a party to this escrow");
  }
  if (e.status === "released" || e.status === "refunded") {
    throw new Error(`Cannot refund from status '${e.status}'`);
  }
  pushEvent(e, "refunded", me, "Refunded to buyer");
  applyBalanceDelta(e.buyerHandle, e.amount);
  recordEscrowHistory(e, e.amount, me);
  s.balances[e.buyerHandle] = (s.balances[e.buyerHandle] || 0) + e.amount;
  const listing = s.listings.find((l) => l.id === e.listingId);
  if (listing) listing.soldTo = null;
  save(s);
  return {
    escrowId,
    status: "refunded",
    refundedTo: e.buyerHandle,
    amount: e.amount,
    listingReopened: true,
  };
}

export function statusLabel(status: string): string {
  const canonical = toCanonicalEscrowStatus(status);
  return ESCROW_STATUS_LABEL[canonical] || status;
}

export function escrowEvents(trade: EscrowTrade): EscrowEvent[] {
  return trade.events || [];
}
