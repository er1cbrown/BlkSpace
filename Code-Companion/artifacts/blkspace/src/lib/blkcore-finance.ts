/**
 * BlkCore finance books.
 *
 * WeixBucks price a yard listing. BKSPC is the only later settlement of earned
 * WeixBucks, and only by an explicit withdrawal. BI9 is recorded on this desk
 * as the Ethereum treasury book. It is not deployed, it does not price a
 * listing, and it does not accept or pay WeixBucks.
 *
 * Decision: docs/canonical-chain-decision.md. Contract: BI9.sol cap 0.
 */
import { BRAND } from "@/lib/brand";

export const BLKCORE_BOOKS = {
  weixBucks: {
    symbol: "WB" as const,
    name: "WeixBucks",
    pricesYardSale: true,
    settlesWeixBucks: false,
    acceptsWeixBucks: true,
  },
  bkspc: {
    symbol: "BKSPC" as const,
    name: "BKSPC Coin",
    chain: "Solana",
    pricesYardSale: false,
    settlesWeixBucks: true,
    wbRatio: 1000,
    explicitWithdrawalOnly: true,
  },
  bi9: {
    symbol: BRAND.bi9Symbol,
    name: BRAND.bi9Name,
    chain: BRAND.bi9Chain,
    chainId: 1,
    standard: "ERC-20" as const,
    deployed: false,
    cap: 0,
    minterSet: false,
    totalSupply: 0,
    pricesYardSale: false,
    settlesWeixBucks: false,
    acceptsWeixBucks: false,
    paysWeixBucks: false,
  },
} as const;

/** Yard Sale listings are denominated in WeixBucks. */
export function listingPriceSymbol(): "WB" {
  return "WB";
}

/** BI9 and BKSPC cannot be the price of a BlkCore listing. */
export function bookCanPriceYardSale(symbol: string): boolean {
  if (symbol === BLKCORE_BOOKS.bi9.symbol) return false;
  if (symbol === BLKCORE_BOOKS.bkspc.symbol) return false;
  return symbol === BLKCORE_BOOKS.weixBucks.symbol;
}
