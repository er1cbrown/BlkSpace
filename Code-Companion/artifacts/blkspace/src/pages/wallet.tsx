import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet as WalletIcon,
  Gift,
  Zap,
  TrendingUp,
  Store,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import {
  useTauriGetWalletTx,
  useAppGetUser,
  useAppWithdrawToSolana,
  useTauriGetWithdrawEligibility,
} from "@/hooks/use-app-data";
import { useQuery } from "@tanstack/react-query";
import {
  isTauri,
  type TauriWalletTx,
  type TauriWithdrawEligibility,
  tauriClaimNodeRewards,
  tauriGetBkspcSettlementStatus,
} from "@/lib/tauri-api";
import { getSessionToken, getCurrentHandle } from "@/lib/auth";
import { EarnRatesPanel } from "@/components/economy/EarnRatesPanel";
import { EarnDashboard } from "@/components/economy/EarnDashboard";
import { FinancialLiteracyPanel } from "@/components/economy/FinancialLiteracyPanel";
import { WalletDisclaimer } from "@/components/economy/WalletDisclaimer";
import { EconomyPolicyPanel } from "@/components/economy/EconomyPolicyPanel";
import { EconomyTermsCard } from "@/components/economy/EconomyTermsCard";
import { EconomyAppealCard } from "@/components/economy/EconomyAppealCard";
import { CreatorMarketplacePanel } from "@/components/economy/CreatorMarketplacePanel";
import { OwnedNftsPanel } from "@/components/economy/OwnedNftsPanel";
import { EconomyPillarsBar } from "@/components/economy/EconomyPillarsBar";
import { ProgressionCard } from "@/components/economy/ProgressionCard";
import { formatFeePercent, FEE_BPS } from "@/lib/tokenomics";
import { useTip } from "@/hooks/use-tip";
import { useOptimisticBalance } from "@/hooks/use-economic-ledger";
import { TransactionHistory } from "@/components/economy/TransactionHistory";
import { FeeBreakdown } from "@/components/economy/FeeBreakdown";
import { SelfCustodyCard } from "@/components/economy/SelfCustodyCard";
import { privilegesForCred } from "@/lib/yard-cred-privileges";
import { toast } from "sonner";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { BkspcMainnetPanel } from "@/components/economy/BkspcMainnetPanel";
import { getBkspcConfig } from "@/lib/bkspc-config";
import { useTauriGetEarnSummary } from "@/hooks/use-app-data";

const mockTxHistory = [
  {
    id: 1,
    type: "earn",
    user: "Content Reward",
    amount: 50,
    description: "Viral post reward",
    time: "2h ago",
    balance: 1250,
  },
  {
    id: 2,
    type: "spend",
    user: "Tip to @jane_doe",
    amount: -25,
    description: "Appreciation tip",
    time: "5h ago",
    balance: 1200,
  },
  {
    id: 3,
    type: "earn",
    user: "Node Reward",
    amount: 100,
    description: "Relay uptime bonus",
    time: "1d ago",
    balance: 1225,
  },
  {
    id: 4,
    type: "earn",
    user: "Engagement Bonus",
    amount: 75,
    description: "Weekly engagement reward",
    time: "2d ago",
    balance: 1125,
  },
  {
    id: 5,
    type: "spend",
    user: "Boost Post",
    amount: -50,
    description: "Post promotion",
    time: "3d ago",
    balance: 1050,
  },
];

function mapTx(tx: TauriWalletTx) {
  return {
    id: tx.id,
    type: tx.txType,
    user: tx.description,
    amount: tx.amount,
    description: tx.txType === "earn" ? "Earning" : "Spending",
    time: new Date(tx.createdAt).toLocaleDateString(),
    balance: tx.balanceAfter,
  };
}

function SendDialog({
  baseBalance,
  yardCred = 0,
}: {
  baseBalance: number;
  yardCred?: number;
}) {
  const [toHandle, setToHandle] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const { sendTip, phase, lastError, balance } = useTip(baseBalance);
  const busy = phase === "submitting" || phase === "settling";
  const priv = privilegesForCred(yardCred);
  const feeBps = priv.effectiveTipFeeBps;

  const handleSend = async () => {
    const amt = parseInt(amount, 10);
    if (!toHandle.trim() || isNaN(amt) || amt <= 0 || amt > balance) return;
    try {
      await sendTip({
        toHandle: toHandle.trim(),
        amount: amt,
        message: message.trim() || undefined,
        feeBps,
      });
      setToHandle("");
      setAmount("");
      setMessage("");
    } catch {
      /* toast + rollback handled in useTip */
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="rounded-full gap-2 flex-1 h-12 font-bold">
          <ArrowUpRight className="w-5 h-5" /> Send
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send WeixBucks</DialogTitle>
          <DialogDescription>
            Instant local confirm. Settlement runs in the background.
            {priv.tipFeeDiscountBps > 0
              ? ` Yard Cred ${priv.score} lowered the tip fee.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="to">Recipient Handle</Label>
            <Input
              id="to"
              placeholder="@username"
              value={toHandle}
              onChange={(e) => setToHandle(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (WB)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={1}
              max={balance}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Balance: {balance.toLocaleString()} WB
          </p>
          {amount && parseInt(amount, 10) > 0 && (
            <FeeBreakdown amount={parseInt(amount, 10)} feeBps={feeBps} />
          )}
          <div className="space-y-2">
            <Label htmlFor="tip-msg">Message (optional)</Label>
            <Input
              id="tip-msg"
              placeholder="Appreciate you"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          {lastError && (
            <p className="text-sm text-destructive">{lastError}</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSend}
            disabled={busy || !toHandle.trim() || !amount}
          >
            {phase === "settling"
              ? "Settling…"
              : busy
                ? "Sending..."
                : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawEligibilityPanel({
  eligibility,
}: {
  eligibility: TauriWithdrawEligibility | undefined;
}) {
  if (!eligibility) return null;

  const checks = [
    {
      ok: eligibility.accountAgeDays >= eligibility.minAccountAgeDays,
      label: `Account age: ${eligibility.accountAgeDays}/${eligibility.minAccountAgeDays} days`,
    },
    {
      ok: eligibility.totalKarma >= eligibility.minKarma,
      label: `Karma: ${eligibility.totalKarma}/${eligibility.minKarma}`,
    },
    {
      ok: eligibility.postCount >= eligibility.minPosts,
      label: `Posts: ${eligibility.postCount}/${eligibility.minPosts}`,
    },
    {
      ok: (eligibility.yardCred ?? 0) >= (eligibility.minYardCred ?? 15),
      label: `Yard Cred: ${eligibility.yardCred ?? 0}/${eligibility.minYardCred ?? 15} (ProjectConnect)`,
    },
    {
      ok: eligibility.daysUntilNextWithdraw === 0,
      label:
        eligibility.daysUntilNextWithdraw > 0
          ? `Cooldown: ${eligibility.daysUntilNextWithdraw} day(s) remaining`
          : `Cooldown: ${eligibility.cooldownDays}-day window clear`,
    },
    {
      ok: eligibility.weeklyRemainingWb > 0,
      label: `Weekly cap: ${eligibility.weeklyWithdrawnWb}/${eligibility.weeklyCapWb} WB used`,
    },
  ];

  return (
    <div className="rounded-lg border border-primary/10 p-3 space-y-2">
      <p className="text-xs font-semibold">Settlement eligibility</p>
      <ul className="text-xs space-y-1">
        {checks.map((c) => (
          <li
            key={c.label}
            className={c.ok ? "text-muted-foreground" : "text-destructive"}
          >
            {c.ok ? "✓" : "✗"} {c.label}
          </li>
        ))}
      </ul>
      {!eligibility.eligible && eligibility.reasons.length > 0 && (
        <p className="text-xs text-destructive">{eligibility.reasons[0]}</p>
      )}
      <p className="text-[10px] text-muted-foreground">
        Settlement: {eligibility.wbToBkspcRatio.toLocaleString()} WB = 1{" "}
        {eligibility.bkspcSymbol}. Withdrawal includes a{" "}
        {formatFeePercent(FEE_BPS.withdrawSettlement)} settlement fee (published
        schedule).
      </p>
    </div>
  );
}

function WithdrawDialog({ balance }: { balance: number }) {
  const [solanaAddress, setSolanaAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const withdrawMut = useAppWithdrawToSolana();
  const parsedAmount = parseInt(amount, 10);
  const amountForCheck =
    !Number.isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined;
  const { data: eligibility } = useTauriGetWithdrawEligibility(amountForCheck);
  const { data: settlementStatus } = useQuery({
    queryKey: ["tauri", "bkspc-settlement-status"],
    queryFn: tauriGetBkspcSettlementStatus,
    enabled: isTauri(),
  });
  const canSubmit =
    eligibility?.eligible &&
    solanaAddress.trim().length >= 32 &&
    amountForCheck !== undefined &&
    amountForCheck >= (eligibility?.minAmountWb ?? 100) &&
    amountForCheck <= balance;

  const handleWithdraw = async () => {
    const amt = parseInt(amount, 10);
    if (!solanaAddress.trim() || isNaN(amt) || amt < 100 || amt > balance)
      return;

    withdrawMut.mutate(
      { studentSolanaAddress: solanaAddress.trim(), amountWb: amt },
      {
        onSuccess: (sig) => {
          setTxSignature(sig);
          setSolanaAddress("");
          setAmount("");
          toast.success("Cash out recorded — check your wallet");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Withdrawal failed");
        },
      },
    );
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setTxSignature("");
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full gap-2 flex-1 h-12 font-bold border-primary/20 hover:bg-primary/5"
        >
          <ArrowDownLeft className="w-5 h-5 text-primary" /> Cash Out
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settlement (gated)</DialogTitle>
          <DialogDescription>
            Optional settlement of <em>earned</em> practice credits after Yard
            Cred and eligibility. Not investment advice — no promised returns.
            Connect a wallet only when you understand the risk.
          </DialogDescription>
        </DialogHeader>

        {txSignature ? (
          <div className="space-y-4 py-4 text-center">
            <div className="p-3 bg-green-500/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-green-500">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="font-bold text-lg">Cash out recorded</h4>
            <p className="text-sm text-muted-foreground px-4">
              Your WeixBucks were converted. Check your connected wallet for the
              transfer.
            </p>
            <div className="bg-muted p-3 rounded-lg text-left">
              <Label className="text-xs text-muted-foreground block mb-1">
                Transaction reference
              </Label>
              <p className="font-mono text-xs break-all text-primary font-semibold select-all">
                {txSignature}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="solana">Wallet address to receive payout</Label>
              <Input
                id="solana"
                placeholder="Your wallet address"
                value={solanaAddress}
                onChange={(e) => setSolanaAddress(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Amount (WB)</Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="Minimum 100 WB"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={100}
                max={balance}
              />
            </div>
            <WithdrawEligibilityPanel eligibility={eligibility} />
            {(() => {
              const cfg = getBkspcConfig();
              return (
                <p className="text-[10px] text-muted-foreground">
                  On-chain settlement ({cfg.cluster}):{" "}
                  {settlementStatus?.wired
                    ? `wired (mint ${(settlementStatus.mint || cfg.mint || "").slice(0, 8)}…)`
                    : cfg.isMintConfigured
                      ? `mint set on ${cfg.cluster} — Cred gates still apply`
                      : (settlementStatus?.reason ??
                        "simulated until mint is configured")}
                </p>
              );
            })()}
            <p className="text-xs text-muted-foreground">
              Available balance: {balance.toLocaleString()} WB
            </p>
            {withdrawMut.isError && (
              <p className="text-sm text-destructive">
                {withdrawMut.error instanceof Error
                  ? withdrawMut.error.message
                  : "Withdrawal failed"}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {txSignature ? (
            <DialogClose asChild>
              <Button className="w-full">Done</Button>
            </DialogClose>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleWithdraw}
                disabled={withdrawMut.isPending || !canSubmit}
              >
                {withdrawMut.isPending
                  ? "Processing..."
                  : eligibility?.eligible
                    ? "Confirm withdrawal"
                    : "Not eligible"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WalletPageContent() {
  const handle = getCurrentHandle();
  const { data: user } = useAppGetUser(handle);
  const { data: tauriTx } = useTauriGetWalletTx();
  const { data: earnSummary } = useTauriGetEarnSummary();

  const txHistory =
    isTauri() && Array.isArray(tauriTx) ? tauriTx.map(mapTx) : mockTxHistory;
  const rawBalance =
    isTauri() && user ? ((user as any).weixBucks ?? 1250) : 1250;
  const balance = useOptimisticBalance(rawBalance);
  const yardCred = Number((user as any)?.yardCred ?? 0);
  const quality =
    isTauri() && user ? ((user as any).engagementQuality ?? 1.0) : 1.0;

  const earnedToday =
    earnSummary?.earnedTodayWb ??
    (isTauri() && Array.isArray(tauriTx)
      ? tauriTx
          .filter((tx) => tx.txType === "earn")
          .reduce((s: number, tx) => s + tx.amount, 0)
      : 50);
  const dailyCap = earnSummary?.dailyCapWb ?? 250;

  const handleClaimRewards = async () => {
    const token = getSessionToken();
    if (!token) {
      toast.error("Please sign in");
      return;
    }
    try {
      const amt = await tauriClaimNodeRewards(token);
      toast.success(
        amt > 0
          ? `Claimed ${amt} WB (if peer-verified serves exist)`
          : "No self-serve node rewards — contribute on the yard instead",
      );
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <AppShell wide>
      <div className="flex items-center gap-3 mb-8">
        <WalletIcon className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Earnings & practice credits</h1>
          <p className="text-sm text-muted-foreground">
            Soft WeixBucks · Yard Cred · literacy · gated settlement
          </p>
        </div>
      </div>

      <WalletDisclaimer />
      <SelfCustodyCard yardCred={yardCred} />
      <EconomyPillarsBar handle={handle} />
      <ProgressionCard summary={earnSummary} />

      <div id="settlement" className="mb-8">
        <BkspcMainnetPanel wbBalance={balance} />
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 shadow-lg mb-8">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Practice credits (WeixBucks)
              </p>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="text-5xl font-black tracking-tighter text-foreground">
                  {balance.toLocaleString()}
                </h2>
                <Coins className="w-8 h-8 text-primary" />
              </div>
            </div>
            <Avatar className="h-16 w-16 border-2 border-primary/30 bg-background">
              <AvatarFallback>
                <Coins className="w-8 h-8 text-primary" />
              </AvatarFallback>
            </Avatar>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Earn-only soft currency · tier daily cap {dailyCap} WB · not cash
          </p>
          <div className="flex gap-3 flex-wrap">
            <SendDialog baseBalance={rawBalance} yardCred={yardCred} />
            <WithdrawDialog balance={balance} />
            <Button variant="outline" size="sm" onClick={handleClaimRewards}>
              Node claim (disabled faucet)
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Self-serve pin rewards are off. MIDF throttle (score &gt;0.7) still
            zeros earn. Settlement requires Yard Cred + eligibility.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="border-primary/10 shadow-sm">
          <CardContent className="p-4 text-center">
            <Zap className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {earnedToday.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground">
                /{dailyCap}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Earned today / cap</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-sm">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold">{Math.round(quality * 100)}%</p>
            <p className="text-xs text-muted-foreground">Engagement Quality</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-sm">
          <CardContent className="p-4 text-center">
            <Gift className="w-5 h-5 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {isTauri() && Array.isArray(tauriTx) ? tauriTx.length : 3}
            </p>
            <p className="text-xs text-muted-foreground">Transactions</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <EarnDashboard
          transactions={isTauri() && Array.isArray(tauriTx) ? tauriTx : []}
          earnedToday={earnedToday}
          dailyCap={dailyCap}
        />
      </div>

      <Tabs defaultValue="history">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="earn">How to earn</TabsTrigger>
          <TabsTrigger value="literacy">Learn markets</TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-1.5">
            <Store className="w-3.5 h-3.5" />
            Yard Sale
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-1">
          <TransactionHistory fallback={txHistory} />
        </TabsContent>

        <TabsContent value="earn" className="space-y-6">
          <EarnRatesPanel />
          <EconomyTermsCard />
          <EconomyPolicyPanel />
          <EconomyAppealCard />
        </TabsContent>

        <TabsContent value="literacy" className="space-y-6">
          <FinancialLiteracyPanel />
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-4">
          <OwnedNftsPanel />
          <CreatorMarketplacePanel />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

export default function WalletPage() {
  return (
    <WalletContextProvider>
      <WalletPageContent />
    </WalletContextProvider>
  );
}
