import { describe, expect, it } from "vitest";
import {
  BLKCORE_BOOKS,
  bookCanPriceYardSale,
  listingPriceSymbol,
} from "@/lib/blkcore-finance";
import { POWER_OF_2 } from "@/lib/power-of-2";

describe("BlkCore finance books", () => {
  it("prices a yard listing in WeixBucks only", () => {
    expect(listingPriceSymbol()).toBe("WB");
    expect(bookCanPriceYardSale("WB")).toBe(true);
    expect(bookCanPriceYardSale("BI9")).toBe(false);
    expect(bookCanPriceYardSale("BKSPC")).toBe(false);
  });

  it("records BI9 as a closed Ethereum book", () => {
    const bi9 = BLKCORE_BOOKS.bi9;
    expect(bi9.symbol).toBe("BI9");
    expect(bi9.name).toBe("BLACKINCCOIN");
    expect(bi9.chain).toBe("Ethereum");
    expect(bi9.chainId).toBe(1);
    expect(bi9.deployed).toBe(false);
    expect(bi9.cap).toBe(0);
    expect(bi9.minterSet).toBe(false);
    expect(bi9.totalSupply).toBe(0);
    expect(bi9.pricesYardSale).toBe(false);
    expect(bi9.settlesWeixBucks).toBe(false);
    expect(bi9.acceptsWeixBucks).toBe(false);
    expect(bi9.paysWeixBucks).toBe(false);
  });

  it("keeps the BI9 desk anchor off chain 999", () => {
    expect(POWER_OF_2.retainedHyperEvm.pillarHref).toBe("#bi9");
    expect(POWER_OF_2.retainedHyperEvm.interactsWithWeixBucks).toBe(false);
    expect(BLKCORE_BOOKS.bkspc.settlesWeixBucks).toBe(true);
    expect(BLKCORE_BOOKS.bkspc.explicitWithdrawalOnly).toBe(true);
    expect(BLKCORE_BOOKS.bkspc.pricesYardSale).toBe(false);
  });
});
