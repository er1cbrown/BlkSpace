import { Transaction } from "@solana/web3.js";
import type { PublicKey } from "@solana/web3.js";
import {
  isTauri,
  tauriPrepareBkspcBurnTx,
  tauriSubmitBkspcBurnTx,
} from "@/lib/tauri-api";

export interface BkspcPurchaseQuote {
  listingPriceWb: number;
  platformFeeWb: number;
  totalWb: number;
  burnRawAmount: number;
  burnBkspcDisplay: string;
  mint: string;
  wbToBkspcRatio: number;
  decimals: number;
  marketplaceFeeBps: number;
  wired?: boolean;
  reason?: string;
}

/**
 * Build, sign, and submit a BKSPC burn for marketplace payment.
 * Tauri path: Rust RPC proxy (no browser Connection / WebSocket).
 */
export async function burnBkspcForPurchase(
  quote: BkspcPurchaseQuote,
  buyerPublicKey: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
): Promise<string> {
  if (!quote.burnRawAmount) {
    throw new Error("Invalid BKSPC purchase quote");
  }

  if (isTauri()) {
    const prepared = await tauriPrepareBkspcBurnTx(
      buyerPublicKey.toBase58(),
      quote.burnRawAmount,
    );
    const tx = Transaction.from(
      Buffer.from(prepared.transactionBase64, "base64"),
    );
    const signed = await signTransaction(tx);
    const signedB64 = Buffer.from(signed.serialize()).toString("base64");
    return tauriSubmitBkspcBurnTx(signedB64);
  }

  throw new Error(
    "BKSPC burns require the Tauri desktop app with bkspc-devnet build",
  );
}