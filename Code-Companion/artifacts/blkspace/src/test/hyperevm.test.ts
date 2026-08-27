import { describe, it, expect, beforeEach } from "vitest";
import {
  BRIDGE_EXCLUDED_ASSETS,
  encodeBalanceOf,
  formatWei,
  getHyperevmConfig,
  HYPEREVM_ASSETS,
  HYPEREVM_MAINNET,
  isConfiguredAddress,
  isHexAddress,
  isWeixBucksListedAsHyperevmAsset,
  saveHyperevmOperatorConfig,
  walletAddHyperEvmParams,
  fetchHyperevmBalances,
} from "@/lib/hyperevm";

describe("HyperEVM mainnet constants", () => {
  it("uses chain id 999 and official RPC", () => {
    expect(HYPEREVM_MAINNET.chainId).toBe(999);
    expect(HYPEREVM_MAINNET.chainIdHex).toBe("0x3e7");
    expect(HYPEREVM_MAINNET.rpcUrl).toBe("https://rpc.hyperliquid.xyz/evm");
    expect(HYPEREVM_MAINNET.nativeCurrency.symbol).toBe("HYPE");
  });

  it("never lists WeixBucks as a HyperEVM asset", () => {
    expect(isWeixBucksListedAsHyperevmAsset()).toBe(false);
    expect(HYPEREVM_ASSETS).toEqual(["HYPE", "BI9"]);
    expect(BRIDGE_EXCLUDED_ASSETS).toContain("WB");
    expect(BRIDGE_EXCLUDED_ASSETS).toContain("WeixBucks");
  });
});

describe("addresses", () => {
  it("rejects zero and junk", () => {
    expect(isHexAddress("0xabc")).toBe(false);
    expect(isConfiguredAddress("0x0000000000000000000000000000000000000000")).toBe(
      false,
    );
    expect(
      isConfiguredAddress("0x2222222222222222222222222222222222222222"),
    ).toBe(true);
  });
});

describe("abi helpers", () => {
  it("encodes balanceOf", () => {
    const data = encodeBalanceOf("0x0000000000000000000000000000000000000001");
    expect(data.startsWith("0x70a08231")).toBe(true);
    expect(data.endsWith("0000000000000000000000000000000000000001")).toBe(true);
    expect(data.length).toBe(2 + 8 + 64);
  });

  it("formats wei", () => {
    expect(formatWei(0n)).toBe("0");
    expect(formatWei(1n * 10n ** 18n)).toBe("1");
    expect(formatWei(15n * 10n ** 17n)).toBe("1.5");
  });
});

describe("operator config", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to mainnet with mint not deployed", () => {
    const cfg = getHyperevmConfig();
    expect(cfg.chainId).toBe(999);
    expect(cfg.isMainnet).toBe(true);
    expect(cfg.isBi9Deployed).toBe(false);
    expect(cfg.bi9).toBe("");
  });

  it("persists operator addresses", () => {
    const next = saveHyperevmOperatorConfig({
      network: "mainnet",
      bi9: "0x1111111111111111111111111111111111111111",
      account: "0x2222222222222222222222222222222222222222",
    });
    expect(next.isBi9Deployed).toBe(true);
    expect(next.account).toMatch(/^0x2222/);
    expect(getHyperevmConfig().bi9).toBe(next.bi9);
  });
});

describe("wallet_addEthereumChain payload", () => {
  it("matches official HyperEVM mainnet", () => {
    const p = walletAddHyperEvmParams("mainnet");
    expect(p.chainId).toBe("0x3e7");
    expect(p.nativeCurrency.symbol).toBe("HYPE");
    expect(p.rpcUrls[0]).toContain("hyperliquid.xyz/evm");
  });
});

describe("balance reads", () => {
  it("calls eth_getBalance and skips BI9 when undeployed", async () => {
    const calls: string[] = [];
    const fetchFn = async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { method: string };
      calls.push(body.method);
      return {
        ok: true,
        json: async () => ({ result: "0xde0b6b3a7640000" }),
      } as Response;
    };
    const cfg = {
      ...getHyperevmConfig(),
      account: "0x2222222222222222222222222222222222222222",
      isBi9Deployed: false,
      bi9: "",
    };
    const bal = await fetchHyperevmBalances(cfg, cfg.account, fetchFn);
    expect(calls).toEqual(["eth_getBalance"]);
    expect(bal.hypeWei).toBe(10n ** 18n);
    expect(bal.bi9Wei).toBeNull();
  });
});
