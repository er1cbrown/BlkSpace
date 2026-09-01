import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ExternalLink, Shield, AlertTriangle } from "lucide-react";
import {
  explorerAddressUrl,
  fetchHyperevmBalances,
  formatWei,
  getHyperevmConfig,
  HYPEREVM_GATES_COPY,
  saveHyperevmOperatorConfig,
  walletAddHyperEvmParams,
  type HyperevmNetwork,
} from "@/lib/hyperevm";
import { toast } from "sonner";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function injectedEthereum(): EthereumProvider | undefined {
  const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
  return eth;
}

/**
 * Canonical HyperEVM / BI9 ERC-20 panel. Collapsed by default.
 * Never converts WeixBucks.
 */
export function HyperEvmPanel({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState(() => getHyperevmConfig());
  const [accountDraft, setAccountDraft] = useState(cfg.account);
  const [bi9Draft, setBi9Draft] = useState(cfg.bi9);
  const [networkDraft, setNetworkDraft] = useState<HyperevmNetwork>(cfg.network);
  const [hype, setHype] = useState<string | null>(null);
  const [bi9, setBi9] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showOps, setShowOps] = useState(false);

  const apply = () => {
    const next = saveHyperevmOperatorConfig({
      network: networkDraft,
      bi9: bi9Draft,
      account: accountDraft,
    });
    setCfg(next);
    toast.success(
      next.isMainnet
        ? "Using HyperEVM mainnet (chain 999)"
        : "Using HyperEVM testnet (chain 998)",
    );
  };

  const refresh = async () => {
    const next = saveHyperevmOperatorConfig({ account: accountDraft });
    setCfg(next);
    if (!next.account) {
      toast.error("Paste a 0x HyperEVM address first");
      return;
    }
    setBusy(true);
    try {
      const bal = await fetchHyperevmBalances(next);
      setHype(formatWei(bal.hypeWei));
      setBi9(bal.bi9Wei == null ? null : formatWei(bal.bi9Wei));
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  };

  const addChain = async () => {
    const eth = injectedEthereum();
    if (!eth) {
      toast.error("No injected wallet. Add HyperEVM from chainlist.org/chain/999");
      return;
    }
    try {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [walletAddHyperEvmParams(cfg.network)],
      });
      toast.success("Wallet asked to add HyperEVM");
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <Card className={className} id="hyperevm">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 text-left"
            >
              <CardTitle className="text-base flex items-center gap-2 flex-wrap flex-1">
                On-chain (HyperEVM)
                <Badge variant={cfg.isMainnet ? "default" : "secondary"}>
                  {cfg.isMainnet ? "mainnet 999" : "testnet 998"}
                </Badge>
                {cfg.isBi9Deployed ? (
                  <Badge
                    variant="outline"
                    className="text-emerald-600 border-emerald-600/40"
                  >
                    BI9 set
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-amber-600 border-amber-600/40"
                  >
                    BI9 not deployed
                  </Badge>
                )}
              </CardTitle>
              <ChevronDown
                className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Canonical on-chain token is{" "}
              <strong className="text-foreground">BI9</strong> (ERC-20) on
              HyperEVM. Practice credits stay WeixBucks. There is no conversion
              button.
            </p>

            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {HYPEREVM_GATES_COPY.map((line) => (
                <li key={line} className="flex gap-2">
                  <Shield className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  {line}
                </li>
              ))}
            </ul>

            {!cfg.isBi9Deployed && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    BI9 is not on chain 999 yet
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Broadcast{" "}
                    <code className="text-[10px]">
                      script/DeployMainnet.s.sol
                    </code>{" "}
                    with HYPE for gas, then set the BI9 address. Cap stays 0
                    (mint off) until a timelocked propose.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="hyperevm-account">HyperEVM address</Label>
              <Input
                id="hyperevm-account"
                placeholder="0x…"
                value={accountDraft}
                onChange={(e) => setAccountDraft(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void refresh()} disabled={busy}>
                {busy ? "Reading…" : "Read HYPE / BI9"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void addChain()}>
                Add HyperEVM to wallet
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a
                  href={cfg.explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Explorer
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
              </Button>
            </div>

            {(hype !== null || bi9 !== null) && (
              <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Balances (read-only)</p>
                <p className="font-bold">
                  {hype ?? "—"}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    HYPE
                  </span>
                </p>
                <p className="font-bold">
                  {bi9 ?? "not deployed"}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    BI9
                  </span>
                </p>
              </div>
            )}

            {cfg.isBi9Deployed && (
              <p className="text-[10px] font-mono text-muted-foreground break-all">
                BI9{" "}
                <a
                  className="underline"
                  href={explorerAddressUrl(cfg.bi9, cfg.explorer)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {cfg.bi9}
                </a>
              </p>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="h-auto px-0 text-xs"
              onClick={() => setShowOps((v) => !v)}
            >
              {showOps ? "Hide" : "Operator"} contract fields
            </Button>

            {showOps && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="space-y-2">
                  <Label>Network</Label>
                  <Select
                    value={networkDraft}
                    onValueChange={(v) => setNetworkDraft(v as HyperevmNetwork)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mainnet">mainnet (999)</SelectItem>
                      <SelectItem value="testnet">testnet (998)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bi9-addr">BI9 address</Label>
                  <Input
                    id="bi9-addr"
                    placeholder="0x… after DeployMainnet"
                    value={bi9Draft}
                    onChange={(e) => setBi9Draft(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <Button size="sm" onClick={apply}>
                  Save
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
