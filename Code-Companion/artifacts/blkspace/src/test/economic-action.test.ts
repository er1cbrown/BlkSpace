import { describe, it, expect, beforeEach } from "vitest";
import { runEconomicAction } from "@/lib/economic-action";
import {
  assertEscrowTransition,
  canTransitionEscrow,
  canTransitionTip,
  toCanonicalEscrowStatus,
} from "@/lib/economic-types";
import {
  applyBalanceDelta,
  getEconomicStore,
  overlayBalance,
  resetEconomicStoreForTests,
} from "@/lib/economic-store";
import { calcPlatformFee, FEE_BPS } from "@/lib/tokenomics";
import { privilegesForCred } from "@/lib/yard-cred-privileges";

describe("status machines", () => {
  it("allows tip pending → confirmed → settled", () => {
    expect(canTransitionTip("pending", "confirmed")).toBe(true);
    expect(canTransitionTip("confirmed", "settled")).toBe(true);
    expect(canTransitionTip("settled", "failed")).toBe(false);
  });

  it("rejects illegal escrow jumps", () => {
    expect(canTransitionEscrow("listed", "released")).toBe(false);
    expect(() => assertEscrowTransition("listed", "released")).toThrow(
      /Illegal escrow/,
    );
    expect(canTransitionEscrow("funds_locked", "delivered")).toBe(true);
    expect(canTransitionEscrow("delivered", "dispute")).toBe(true);
  });

  it("maps legacy funded/disputed to shared labels", () => {
    expect(toCanonicalEscrowStatus("funded")).toBe("funds_locked");
    expect(toCanonicalEscrowStatus("disputed")).toBe("dispute");
  });
});

describe("runEconomicAction", () => {
  it("rolls back when settle fails", async () => {
    let n = 10;
    await expect(
      runEconomicAction({
        applyOptimistic: () => {
          n -= 5;
          return n;
        },
        persist: () => {},
        settle: () => {
          throw new Error("network");
        },
        rollback: () => {
          n += 5;
        },
      }),
    ).rejects.toThrow("network");
    expect(n).toBe(10);
  });

  it("keeps optimistic result on success", async () => {
    let n = 10;
    const out = await runEconomicAction({
      applyOptimistic: () => {
        n -= 5;
        return n;
      },
      persist: () => {},
      settle: () => {},
      rollback: () => {
        n += 5;
      },
    });
    expect(out).toBe(5);
    expect(n).toBe(5);
  });
});

describe("optimistic balances + tip fee", () => {
  beforeEach(() => resetEconomicStoreForTests());

  it("applies overlay immediately", () => {
    applyBalanceDelta("alice", -25);
    applyBalanceDelta("bob", 25 - calcPlatformFee(25, FEE_BPS.tip));
    expect(overlayBalance("alice", 1250)).toBe(1225);
    expect(overlayBalance("bob", 0)).toBe(24);
    expect(getEconomicStore().balances.alice).toBe(-25);
  });
});

describe("yard cred privileges", () => {
  it("unlocks lower fees and BKSPC at campus / yard tiers", () => {
    expect(privilegesForCred(0).bkspcPath).toBe(false);
    expect(privilegesForCred(0).effectiveTipFeeBps).toBe(FEE_BPS.tip);
    expect(privilegesForCred(15).bkspcPath).toBe(true);
    expect(privilegesForCred(15).effectiveTipFeeBps).toBe(FEE_BPS.tip - 25);
    expect(privilegesForCred(40).settlement).toBe("priority");
    expect(privilegesForCred(40).listingMaxWb).toBe(500);
    expect(calcPlatformFee(100, privilegesForCred(40).effectiveTipFeeBps)).toBe(
      1,
    );
  });
});
