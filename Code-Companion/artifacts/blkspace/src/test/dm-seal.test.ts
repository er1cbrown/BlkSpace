import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureDmKey, openDm, sealDm } from "@/lib/dm-seal";
import { looksLikePhiRisk } from "@/lib/secure-dm";

beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  }
});

describe("sealed yard messages", () => {
  it("opens a note for the two handles and not for a swapped pair", async () => {
    localStorage.clear();
    const alice = await ensureDmKey();
    const aliceStore = localStorage.getItem("blkspace_dm_ecdh_v1");
    localStorage.clear();
    const bob = await ensureDmKey();
    const bobStore = localStorage.getItem("blkspace_dm_ecdh_v1");

    localStorage.setItem("blkspace_dm_ecdh_v1", aliceStore || "");
    const sealed = await sealDm({
      text: "See you in the yard.",
      from: "alice",
      to: "bob",
      toPub: bob,
    });
    expect(sealed.startsWith("blkspace-dm.v1.")).toBe(true);
    expect(sealed).not.toContain("See you in the yard.");

    localStorage.setItem("blkspace_dm_ecdh_v1", bobStore || "");
    expect(await openDm(sealed, "alice", "bob", "bob")).toBe("See you in the yard.");

    localStorage.setItem("blkspace_dm_ecdh_v1", aliceStore || "");
    expect(await openDm(sealed, "alice", "bob", "alice")).toBe("See you in the yard.");
    await expect(openDm(sealed, "alice", "cara", "alice")).rejects.toThrow();
    expect(looksLikePhiRisk("patient name on the chart")).toBe(true);
    expect(alice.crv).toBe("P-256");
  });
});
