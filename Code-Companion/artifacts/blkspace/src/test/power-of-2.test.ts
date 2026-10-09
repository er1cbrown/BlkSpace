import { describe, it, expect } from "vitest";
import {
  POWER_OF_2,
  canonicalStandard,
  canonicalRailSettlesWeixBucks,
  hyperEvmDeployable,
  settlementPillar,
  solanaIsCanonicalMint,
} from "@/lib/power-of-2";
import { WB_TO_BKSPC_RATIO } from "@/lib/tokenomics";
import {
  BRIDGE_EXCLUDED_ASSETS,
  HYPEREVM_ASSETS,
  HYPEREVM_GATES_COPY,
} from "@/lib/hyperevm";
import { BKSPC_GATES_COPY } from "@/lib/bkspc-config";
import { BRAND } from "@/lib/brand";

describe("Power of 2 — ERC-20 is canonical", () => {
  it("exposes the canonical token distinctly from the Solana prototype", () => {
    // Two coins coexist deliberately. They must stay DIFFERENT, so the canonical
    // token cannot be reached through the prototype's ticker field.
    expect(BRAND.canonicalTokenSymbol).toBe("BI9");
    expect(BRAND.canonicalTokenName).toBe("BLACKINCCOIN");
    expect(BRAND.canonicalTokenChain).toBe("HyperEVM");

    // The prototype ticker still exists — BKSPC is a real, separate instrument.
    expect(BRAND.symbol).toBe("BKSPC");
    expect(BRAND.coinName).toBe("BKSPC Coin");

    // Both rails stay distinct instruments. BI9 is retained, not canonical.
    expect(BRAND.canonicalTokenSymbol).not.toBe(BRAND.symbol);
    expect(BRAND.canonicalTokenName).not.toBe(BRAND.coinName);
  });

  it("keeps the product name separate from both token identities", () => {
    // The nostalgic product mark may equal the prototype ticker, but it must
    // never be described as the canonical token.
    expect(BRAND.name).toBe("BKSPC");
    expect(BRAND.product).toBe("BKSPC");
    expect(BRAND.canonicalTokenSymbol).not.toBe(BRAND.name);
  });

  it("names BKSPC on Solana as the canonical on-chain asset", () => {
    expect(POWER_OF_2.canonicalSolana.canonical).toBe(true);
    expect(POWER_OF_2.canonicalSolana.token).toBe("BKSPC");
    expect(canonicalStandard()).toBe("Token-2022");
    expect(POWER_OF_2.canonicalSolana.chain).toBe("solana-devnet");
    expect(solanaIsCanonicalMint()).toBe(true);
  });

  it("marks BI9 on HyperEVM as retained and not deployable", () => {
    // Hyperliquid geo-restricts the US, so chain 999 is unreachable for this
    // operator. See docs/canonical-chain-decision.md
    expect(POWER_OF_2.retainedHyperEvm.canonical).toBe(false);
    expect(POWER_OF_2.retainedHyperEvm.token).toBe("BI9");
    expect(POWER_OF_2.retainedHyperEvm.chain).toBe("hyperevm");
    expect(hyperEvmDeployable()).toBe(false);
  });

  it("does not auto-convert WeixBucks", () => {
    // Settlement is explicit and user-initiated, never automatic.
    expect(POWER_OF_2.retainedHyperEvm.wbRatio).toBeNull();
    expect(POWER_OF_2.retainedHyperEvm.interactsWithWeixBucks).toBe(false);
    // The canonical rail does settle WB, but only via explicit withdrawal.
    expect(canonicalRailSettlesWeixBucks()).toBe(true);
  });

  it("keeps the canonical 1000:1 settlement ratio", () => {
    expect(POWER_OF_2.canonicalSolana.wbRatio).toBe(1000);
    expect(WB_TO_BKSPC_RATIO).toBe(1000);
    // WeixBucks reach BKSPC only through explicit withdrawal, not auto-conversion.
    expect(POWER_OF_2.canonicalSolana.interactsWithWeixBucks).toBe(true);
  });

  it("points the wallet on-chain pillar at BKSPC", () => {
    const pillar = settlementPillar();
    expect(pillar.href).toBe("#settlement");
    expect(pillar.sub).toBe("Solana · BKSPC");
  });

  it("keeps WeixBucks and BKSPC off the HyperEVM asset list", () => {
    expect(HYPEREVM_ASSETS).toEqual(["HYPE", "BI9"]);
    expect(HYPEREVM_ASSETS).not.toContain("BKSPC");
    expect(HYPEREVM_ASSETS).not.toContain("WB");
    expect(BRIDGE_EXCLUDED_ASSETS).toContain("WeixBucks");
  });

  it("states BKSPC canonical in wallet gate copy", () => {
    // The HyperEVM panel must not claim BI9 is canonical or deployable.
    const hyperCopy = HYPEREVM_GATES_COPY.join(" ");
    expect(hyperCopy).not.toMatch(/Canonical on-chain token is BI9/i);
    expect(hyperCopy).not.toMatch(/Mint is off until/i);
    expect(hyperCopy).toMatch(/retained reference code/i);
    expect(hyperCopy).toMatch(/not deployable/i);
    expect(hyperCopy).toMatch(/never auto-convert/i);

    const bkspcCopy = BKSPC_GATES_COPY.join(" ");
    expect(bkspcCopy).toMatch(/canonical on-chain asset/i);
    expect(bkspcCopy).not.toMatch(/not the canonical mint/i);
    expect(bkspcCopy).toMatch(/no reward/i);
    expect(bkspcCopy).toMatch(/only go down/i);
    expect(bkspcCopy).toMatch(/no presale/i);
  });
});
