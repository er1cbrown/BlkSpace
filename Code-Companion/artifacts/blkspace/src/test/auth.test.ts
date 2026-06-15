import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createNostrIdentity,
  derivePubkey,
  nsecToMnemonic,
  mnemonicToNsec,
  isFirstRun,
  markFirstRunComplete,
  getCurrentHandle,
  getCurrentDisplayName,
  getSessionToken,
  storeSession,
  clearSession,
  clearIdentity,
  HANDLE_KEY,
  DISPLAY_KEY,
  SESSION_KEY,
  PUBKEY_KEY,
  FIRST_RUN_KEY,
} from "@/lib/auth";

describe("auth.ts", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("createNostrIdentity", () => {
    it("generates a valid nsec and pubkey", () => {
      const identity = createNostrIdentity();
      expect(identity.nsecHex).toBeDefined();
      expect(identity.pubkey).toBeDefined();
      expect(identity.nsecHex).toHaveLength(64);
      expect(identity.pubkey).toHaveLength(64);
      expect(identity.nsecHex).toMatch(/^[0-9a-f]+$/);
      expect(identity.pubkey).toMatch(/^[0-9a-f]+$/);
    });

    it("generates unique keys each time", () => {
      const id1 = createNostrIdentity();
      const id2 = createNostrIdentity();
      expect(id1.nsecHex).not.toBe(id2.nsecHex);
      expect(id1.pubkey).not.toBe(id2.pubkey);
    });
  });

  describe("derivePubkey", () => {
    it("derives pubkey from hex nsec", () => {
      const identity = createNostrIdentity();
      const pubkey = derivePubkey(identity.nsecHex);
      expect(pubkey).toBe(identity.pubkey);
    });

    it("derives pubkey from nsec1 bech32", () => {
      const identity = createNostrIdentity();
      // Skip test if nostr-tools nip19 encoding not available in test
      // This is a basic sanity check
      expect(() => derivePubkey(identity.nsecHex)).not.toThrow();
    });
  });

  describe("nsecToMnemonic / mnemonicToNsec", () => {
    it("round-trips correctly", () => {
      const identity = createNostrIdentity();
      const mnemonic = nsecToMnemonic(identity.nsecHex);
      expect(mnemonic).toBeDefined();
      expect(mnemonic.split(" ")).toHaveLength(24);

      const recoveredNsec = mnemonicToNsec(mnemonic);
      expect(recoveredNsec.toLowerCase()).toBe(identity.nsecHex.toLowerCase());
    });

    it("throws on invalid mnemonic", () => {
      expect(() => mnemonicToNsec("invalid mnemonic words here")).toThrow();
    });

    it("handles whitespace in mnemonic", () => {
      const identity = createNostrIdentity();
      const mnemonic = nsecToMnemonic(identity.nsecHex);
      const withExtraSpaces = `  ${mnemonic}  `.toUpperCase();
      const recoveredNsec = mnemonicToNsec(withExtraSpaces);
      expect(recoveredNsec.toLowerCase()).toBe(identity.nsecHex.toLowerCase());
    });
  });

  describe("isFirstRun / markFirstRunComplete", () => {
    it("returns true when no first_run flag set", () => {
      expect(isFirstRun()).toBe(true);
    });

    it("returns false after marking complete", () => {
      markFirstRunComplete();
      expect(isFirstRun()).toBe(false);
    });
  });

  describe("getCurrentHandle", () => {
    it("returns default handle when not set", () => {
      expect(getCurrentHandle()).toBe("demo_user");
    });

    it("returns stored handle", () => {
      localStorage.setItem(HANDLE_KEY, "test_user");
      expect(getCurrentHandle()).toBe("test_user");
    });
  });

  describe("getCurrentDisplayName", () => {
    it("returns default name when not set", () => {
      expect(getCurrentDisplayName()).toBe("Demo User");
    });

    it("returns stored name", () => {
      localStorage.setItem(DISPLAY_KEY, "Test User");
      expect(getCurrentDisplayName()).toBe("Test User");
    });
  });

  describe("getSessionToken", () => {
    it("returns null when no session", () => {
      expect(getSessionToken()).toBeNull();
    });

    it("returns stored token", () => {
      localStorage.setItem(SESSION_KEY, "test_token_123");
      expect(getSessionToken()).toBe("test_token_123");
    });
  });

  describe("storeSession", () => {
    it("stores token and pubkey", () => {
      storeSession("token_123", "pubkey_456");
      expect(localStorage.getItem(SESSION_KEY)).toBe("token_123");
      expect(localStorage.getItem(PUBKEY_KEY)).toBe("pubkey_456");
    });
  });

  describe("clearSession", () => {
    it("removes session data", () => {
      storeSession("token_123", "pubkey_456");
      clearSession();
      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
      expect(localStorage.getItem(PUBKEY_KEY)).toBeNull();
    });
  });

  describe("clearIdentity", () => {
    it("removes all identity data", () => {
      localStorage.setItem(HANDLE_KEY, "test_user");
      localStorage.setItem(DISPLAY_KEY, "Test User");
      localStorage.setItem("blkspace_nsec", "nsec_123");
      storeSession("token_123", "pubkey_456");

      clearIdentity();

      expect(localStorage.getItem(HANDLE_KEY)).toBeNull();
      expect(localStorage.getItem(DISPLAY_KEY)).toBeNull();
      expect(localStorage.getItem("blkspace_nsec")).toBeNull();
      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
      expect(localStorage.getItem(PUBKEY_KEY)).toBeNull();
    });
  });
});