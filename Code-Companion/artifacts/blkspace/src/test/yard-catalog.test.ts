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

  it("catalog keeps HBCUs and restored partner yards", () => {
    expect(getHbcu("tsu")?.school).toContain("Tennessee State");
    expect(getHbcu("howard")?.school).toContain("Howard");
    expect(getHbcu("vanderbilt")?.school).toContain("Vanderbilt");
    expect(getHbcu("belmont")?.school).toContain("Belmont");
    expect(getHbcu("tennessee")?.school).toContain("Tennessee");
    expect(getHbcu("ut-austin")?.school).toContain("Austin");
    expect(ALL_YARD_CATALOG).toHaveLength(HBCU_CATALOG.length + 4);
    expect(catalogStats().total).toBe(HBCU_CATALOG.length);
    expect(catalogStats().total).toBeGreaterThan(80);
  });

  it("search finds HBCUs and restored partner campuses", () => {
    const tsu = searchHbcus("tsu");
    expect(tsu.some((h) => h.id === "tsu")).toBe(true);
    expect(searchHbcus("vanderbilt").some((h) => h.id === "vanderbilt")).toBe(
      true,
    );
    expect(searchHbcus("SEC")).toHaveLength(0);
  });

  it("themes resolve for HBCU yards and Vanderbilt", () => {
    expect(getYardTheme("tsu")?.school).toContain("Tennessee State");
    expect(getYardTheme("howard")?.school).toContain("Howard");
    expect(getYardTheme("vanderbilt")?.school).toContain("Vanderbilt");
    expect(getYardTheme("ut-austin")?.school).toContain("Austin");
  });
});
