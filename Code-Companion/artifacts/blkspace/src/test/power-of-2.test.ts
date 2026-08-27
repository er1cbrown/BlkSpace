import { describe, it, expect } from "vitest";
import {
  POWER_OF_2,
  bothRailsClaimPrimarySettlement,
  governanceRailTouchesWeixBucks,
  settlementPillar,
} from "@/lib/power-of-2";
import { WB_TO_BKSPC_RATIO } from "@/lib/tokenomics";
import { BRIDGE_EXCLUDED_ASSETS, HYPEREVM_ASSETS, HYPEREVM_GATES_COPY } from "@/lib/hyperevm";
import { BKSPC_GATES_COPY } from "@/lib/bkspc-config";

describe("Power of 2 functional separation", () => {
  it("gives each chain a distinct non-overlapping job", () => {
    expect(POWER_OF_2.socialMicroSettlement.role).toMatch(/micro-settlement/i);
    expect(POWER_OF_2.protocolGovernance.role).toMatch(/governance/i);
    expect(POWER_OF_2.socialMicroSettlement.token).toBe("BKSPC");
    expect(POWER_OF_2.protocolGovernance.token).toBe("BI9");
    expect(POWER_OF_2.socialMicroSettlement.chain).not.toBe(
      POWER_OF_2.protocolGovernance.chain,
    );
  });

  it("does not let both rails claim primary settlement", () => {
    expect(bothRailsClaimPrimarySettlement()).toBe(false);
  });

  it("lets only Solana BKSPC touch WeixBucks", () => {
    expect(POWER_OF_2.socialMicroSettlement.interactsWithWeixBucks).toBe(true);
    expect(POWER_OF_2.socialMicroSettlement.wbRatio).toBe(1000);
    expect(WB_TO_BKSPC_RATIO).toBe(1000);
    expect(governanceRailTouchesWeixBucks()).toBe(false);
    expect(POWER_OF_2.protocolGovernance.wbRatio).toBeNull();
  });

  it("points the student settlement pillar at Solana, not HyperEVM", () => {
    const pillar = settlementPillar();
    expect(pillar.href).toBe("#settlement");
    expect(pillar.sub).toBe("Solana · BKSPC");
    expect(pillar.sub).not.toMatch(/HyperEVM|BI9/);
  });

  it("keeps WeixBucks and BKSPC off the HyperEVM asset list", () => {
    expect(HYPEREVM_ASSETS).toEqual(["HYPE", "BI9"]);
    expect(HYPEREVM_ASSETS).not.toContain("BKSPC");
    expect(HYPEREVM_ASSETS).not.toContain("WB");
    expect(BRIDGE_EXCLUDED_ASSETS).toContain("WeixBucks");
  });

  it("states the isolation in wallet gate copy", () => {
    expect(HYPEREVM_GATES_COPY.join(" ")).toMatch(/not student settlement/i);
    expect(HYPEREVM_GATES_COPY.join(" ")).toMatch(/do not convert to BI9/i);
    expect(BKSPC_GATES_COPY.join(" ")).toMatch(/1,000 WB/);
    expect(BKSPC_GATES_COPY.join(" ")).toMatch(/not minted from WeixBucks/i);
  });
});
