import { describe, expect, it } from "vitest";
import {
  ESCROW_DEFAULT_TYPES,
  isEscrowDefaultType,
  itemTypeLabel,
  shopBuyerLine,
  shopShelf,
  sortShopListings,
} from "@/lib/myyard-catalog";

describe("yard sale shop shelf", () => {
  it("puts ready-now goods ahead of made-to-order, cheapest first", () => {
    const rows = [
      { itemType: "fashion", price: 5 },
      { itemType: "mix", price: 20 },
      { itemType: "theme", fulfillmentMode: "instant" as const, price: 8 },
      { itemType: "art", fulfillmentMode: "escrow" as const, price: 3 },
    ];
    const sorted = sortShopListings(rows);
    expect(sorted.map((row) => row.itemType)).toEqual([
      "theme",
      "mix",
      "art",
      "fashion",
    ]);
    expect(rows.map((row) => row.itemType)).toEqual([
      "fashion",
      "mix",
      "theme",
      "art",
    ]);
  });

  it("keeps an explicit mode ahead of the type default", () => {
    expect(shopShelf({ itemType: "mix" })).toBe("now");
    expect(shopShelf({ itemType: "logos-deck" })).toBe("now");
    expect(shopShelf({ itemType: "theme" })).toBe("now");
    expect(shopShelf({ itemType: "fashion" })).toBe("order");
    expect(shopShelf({ itemType: "merch-digital" })).toBe("order");
    expect(shopShelf({ itemType: "fashion", fulfillmentMode: "instant" })).toBe(
      "now",
    );
    expect(shopShelf({ itemType: "mix", fulfillmentMode: "escrow" })).toBe(
      "order",
    );
  });

  it("does not move the escrow defaults", () => {
    expect([...ESCROW_DEFAULT_TYPES]).toEqual([
      "art",
      "mockup",
      "blueprint",
      "merch-digital",
      "fashion",
    ]);
    expect(isEscrowDefaultType("mix")).toBe(false);
    expect(isEscrowDefaultType("logos-deck")).toBe(false);
    expect(isEscrowDefaultType("theme")).toBe(false);
  });

  it("uses one buyer sentence", () => {
    expect(shopBuyerLine({ itemType: "mix" })).toBe(
      "You get the set right away.",
    );
    expect(shopBuyerLine({ itemType: "logos-deck" })).toBe(
      "You get the set right away.",
    );
    expect(shopBuyerLine({ itemType: "theme" })).toBe(
      "It applies to your yard right away.",
    );
    expect(shopBuyerLine({ itemType: "media" })).toBe("You get it right away.");
    expect(shopBuyerLine({ itemType: "fashion" })).toBe(
      "You pay, they deliver, then you release.",
    );
  });

  it("uses short type names", () => {
    expect(itemTypeLabel("mix")).toBe("Mix");
    expect(itemTypeLabel("logos-deck")).toBe("Logos Deck");
    expect(itemTypeLabel("theme")).toBe("Yard theme");
    expect(itemTypeLabel("unknown-sku")).toBe("unknown-sku");
  });
});
