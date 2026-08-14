import { describe, it, expect } from "vitest";
import { installBufferPolyfill } from "@/lib/buffer-polyfill";
import { createNostrIdentity, nsecToMnemonic, mnemonicToNsec } from "@/lib/auth";

describe("buffer-polyfill", () => {
  it("installs Buffer.from / isBuffer for bip39", () => {
    const Buf = installBufferPolyfill();
    expect(typeof Buf).toBe("function");
    const text = Buf.from("abc", "utf8");
    expect(Buf.isBuffer(text)).toBe(true);
    expect(text.toString("utf8")).toBe("abc");
    const hex = Buf.from("ff", "hex");
    expect(hex.length).toBe(1);
    expect(hex[0]).toBe(255);
  });

  it("lets join recovery phrases round-trip without a test shim", () => {
    installBufferPolyfill();
    const id = createNostrIdentity();
    const phrase = nsecToMnemonic(id.nsecHex);
    expect(phrase.split(" ")).toHaveLength(24);
    expect(mnemonicToNsec(phrase).toLowerCase()).toBe(id.nsecHex.toLowerCase());
  });
});
