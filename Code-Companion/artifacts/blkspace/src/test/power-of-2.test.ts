import { describe, it, expect } from "vitest";
import {
  POWER_OF_2,
  canonicalStandard,
  governanceRailTouchesWeixBucks,
  settlementPillar,
  solanaIsCanonicalMint,
} from "@/lib/power-of-2";
import { WB_TO_BKSPC_RATIO } from "@/lib/tokenomics";
import { BRIDGE_EXCLUDED_ASSETS, HYPEREVM_ASSETS, HYPEREVM_GATES_COPY } from "@/lib/hyperevm";
import { BKSPC_GATES_COPY } from "@/lib/bkspc-config";

describe("Power of 2 — ERC-20 is canonical", () => {
  it("names BI9 ERC-20 on HyperEVM as the canonical mint", () => {
    expect(POWER_OF_2.canonicalErc20.canonical).toBe(true);
    expect(POWER_OF_2.canonicalErc20.token).toBe("BI9");
    expect(canonicalStandard()).toBe("ERC-20");
    expect(POWER_OF_2.canonicalErc20.chain).toBe("hyperevm");
    expect(solanaIsCanonicalMint()).toBe(false);
    expect(POWER_OF_2.optionalSolanaPrototype.canonical).toBe(false);
  });

  it("does not auto-convert WeixBucks to BI9", () => {
    expect(governanceRailTouchesWeixBucks()).toBe(false);
    expect(POWER_OF_2.canonicalErc20.wbRatio).toBeNull();
  });

  it("keeps Solana as an optional 1000:1 prototype only", () => {
    expect(POWER_OF_2.optionalSolanaPrototype.token).toBe("BKSPC");
    expect(POWER_OF_2.optionalSolanaPrototype.wbRatio).toBe(1000);
    expect(WB_TO_BKSPC_RATIO).toBe(1000);
    expect(POWER_OF_2.optionalSolanaPrototype.interactsWithWeixBucks).toBe(true);
  });

  it("points the wallet on-chain pillar at HyperEVM BI9", () => {
    const pillar = settlementPillar();
    expect(pillar.href).toBe("#hyperevm");
    expect(pillar.sub).toBe("HyperEVM · BI9");
    expect(pillar.sub).not.toMatch(/Solana|BKSPC/);
  });

  it("keeps WeixBucks and BKSPC off the HyperEVM asset list", () => {
    expect(HYPEREVM_ASSETS).toEqual(["HYPE", "BI9"]);
    expect(HYPEREVM_ASSETS).not.toContain("BKSPC");
    expect(HYPEREVM_ASSETS).not.toContain("WB");
    expect(BRIDGE_EXCLUDED_ASSETS).toContain("WeixBucks");
  });

  it("states ERC-20 canonical in wallet gate copy", () => {
    expect(HYPEREVM_GATES_COPY.join(" ")).toMatch(/Canonical on-chain token is BI9 \(ERC-20\)/);
    expect(HYPEREVM_GATES_COPY.join(" ")).toMatch(/do not convert to BI9/i);
    expect(HYPEREVM_GATES_COPY.join(" ")).not.toMatch(/not student settlement/i);
    expect(BKSPC_GATES_COPY.join(" ")).toMatch(/not the canonical mint/i);
    expect(BKSPC_GATES_COPY.join(" ")).toMatch(/BI9 ERC-20/);
  });
});
