import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/brand";
import {
  ALL_YARD_CATALOG,
  catalogStats,
  getHbcu,
  searchHbcus,
  yardKind,
} from "@/lib/hbcu-catalog";
import { getYardTheme } from "@/lib/yard-themes";

describe("BKSPC brand + inclusive yards", () => {
  it("product name is BKSPC only", () => {
    expect(BRAND.name).toBe("BKSPC");
    expect(BRAND.product).toBe("BKSPC");
    expect(BRAND.symbol).toBe("BKSPC");
    expect(BRAND.coinName).toBe("BKSPC Coin");
  });

  it("catalog includes HBCU and SEC/NCAA yards at the same table", () => {
    expect(getHbcu("tsu")?.school).toContain("Tennessee State");
    expect(getHbcu("vanderbilt")?.conference).toBe("SEC");
    expect(getHbcu("belmont")?.school).toContain("Belmont");
    expect(getHbcu("tennessee")?.school).toContain("Tennessee");
    expect(getHbcu("ut-austin")?.id).toBe("ut-austin");
    expect(yardKind(getHbcu("tsu")!)).toBe("hbcu");
    expect(yardKind(getHbcu("vanderbilt")!)).toBe("ncaa");
    expect(catalogStats().total).toBe(ALL_YARD_CATALOG.length);
    expect(catalogStats().total).toBeGreaterThan(100);
  });

  it("search finds SEC schools and HBCUs together", () => {
    const vandy = searchHbcus("vanderbilt");
    expect(vandy.some((h) => h.id === "vanderbilt")).toBe(true);
    const sec = searchHbcus("SEC");
    expect(sec.some((h) => h.id === "tennessee")).toBe(true);
    const tsu = searchHbcus("tsu");
    expect(tsu.some((h) => h.id === "tsu")).toBe(true);
  });

  it("themes resolve for crossover yards", () => {
    expect(getYardTheme("vanderbilt")?.school).toContain("Vanderbilt");
    expect(getYardTheme("ut-austin")?.mascot).toContain("Longhorns");
    expect(getYardTheme("tsu")?.school).toContain("Tennessee State");
  });
});
