import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/brand";
import {
  ALL_YARD_CATALOG,
  catalogStats,
  getHbcu,
  HBCU_CATALOG,
  searchHbcus,
} from "@/lib/hbcu-catalog";
import { getYardTheme } from "@/lib/yard-themes";

describe("BKSPC brand + HBCU-only yards", () => {
  it("product name is BKSPC only", () => {
    expect(BRAND.name).toBe("BKSPC");
    expect(BRAND.product).toBe("BKSPC");
    expect(BRAND.symbol).toBe("BKSPC");
    expect(BRAND.coinName).toBe("BKSPC Coin");
  });

  it("catalog is HBCU campuses only", () => {
    expect(getHbcu("tsu")?.school).toContain("Tennessee State");
    expect(getHbcu("howard")?.school).toContain("Howard");
    expect(getHbcu("vanderbilt")).toBeNull();
    expect(getHbcu("belmont")).toBeNull();
    expect(getHbcu("tennessee")).toBeNull();
    expect(getHbcu("ut-austin")).toBeNull();
    expect(ALL_YARD_CATALOG).toBe(HBCU_CATALOG);
    expect(catalogStats().total).toBe(HBCU_CATALOG.length);
    expect(catalogStats().total).toBeGreaterThan(80);
  });

  it("search finds HBCUs and not SEC/NCAA schools", () => {
    const tsu = searchHbcus("tsu");
    expect(tsu.some((h) => h.id === "tsu")).toBe(true);
    expect(searchHbcus("vanderbilt")).toHaveLength(0);
    expect(searchHbcus("SEC")).toHaveLength(0);
  });

  it("themes resolve for HBCU yards only", () => {
    expect(getYardTheme("tsu")?.school).toContain("Tennessee State");
    expect(getYardTheme("howard")?.school).toContain("Howard");
    expect(getYardTheme("vanderbilt")).toBeNull();
    expect(getYardTheme("ut-austin")).toBeNull();
  });
});
