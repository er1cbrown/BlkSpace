import { describe, expect, it } from "vitest";
import {
  createPasswordBackup,
  restorePasswordBackup,
  parseBackupJson,
  BACKUP_KIND,
} from "@/lib/account-backup";
import { createNostrIdentity } from "@/lib/auth";

describe("account-backup", () => {
  it("round-trips nsec with a campus password", async () => {
    const id = createNostrIdentity();
    const backup = await createPasswordBackup({
      nsecHex: id.nsecHex,
      handle: "campus_king",
      password: "yard-pass-ok",
    });
    expect(backup.kind).toBe(BACKUP_KIND);
    expect(backup.ct).not.toContain(id.nsecHex);
    const restored = await restorePasswordBackup(backup, "yard-pass-ok");
    expect(restored.nsecHex).toBe(id.nsecHex.toLowerCase());
    expect(restored.handle).toBe("campus_king");
    expect(restored.pubkey).toBe(id.pubkey);
  });

  it("rejects a wrong password", async () => {
    const id = createNostrIdentity();
    const backup = await createPasswordBackup({
      nsecHex: id.nsecHex,
      handle: "nina",
      password: "correct-horse",
    });
    await expect(
      restorePasswordBackup(backup, "wrong-password"),
    ).rejects.toThrow(/wrong password/i);
  });

  it("rejects a short password", async () => {
    const id = createNostrIdentity();
    await expect(
      createPasswordBackup({
        nsecHex: id.nsecHex,
        handle: "nina",
        password: "short",
      }),
    ).rejects.toThrow(/at least 8/i);
  });

  it("parses its own JSON", async () => {
    const id = createNostrIdentity();
    const backup = await createPasswordBackup({
      nsecHex: id.nsecHex,
      handle: "tsu_student",
      password: "remember-this",
    });
    const again = parseBackupJson(JSON.stringify(backup));
    expect(again.handle).toBe("tsu_student");
  });

  it("encrypts when Web Crypto subtle is missing", async () => {
    const cryptoObj = globalThis.crypto as Crypto & { subtle?: SubtleCrypto };
    const orig = cryptoObj.subtle;
    Object.defineProperty(cryptoObj, "subtle", {
      configurable: true,
      value: undefined,
    });
    try {
      const id = createNostrIdentity();
      const backup = await createPasswordBackup({
        nsecHex: id.nsecHex,
        handle: "lan_preview",
        password: "yard-pass-ok",
      });
      const restored = await restorePasswordBackup(backup, "yard-pass-ok");
      expect(restored.nsecHex).toBe(id.nsecHex.toLowerCase());
      expect(restored.handle).toBe("lan_preview");
    } finally {
      Object.defineProperty(cryptoObj, "subtle", {
        configurable: true,
        value: orig,
      });
    }
  });
});
