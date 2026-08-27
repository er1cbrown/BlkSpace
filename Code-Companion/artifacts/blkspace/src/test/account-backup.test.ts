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
});
