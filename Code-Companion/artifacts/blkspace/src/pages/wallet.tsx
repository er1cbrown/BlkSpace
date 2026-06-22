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
  useAppSendWeixBucks,
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
import { WalletDisclaimer } from "@/components/economy/WalletDisclaimer";
import { EconomyPolicyPanel } from "@/components/economy/EconomyPolicyPanel";
import { EconomyTermsCard } from "@/components/economy/EconomyTermsCard";
import { EconomyAppealCard } from "@/components/economy/EconomyAppealCard";
import { CreatorMarketplacePanel } from "@/components/economy/CreatorMarketplacePanel";
import { formatFeePercent, FEE_BPS } from "@/lib/tokenomics";
import { toast } from "sonner";
import { WalletContextProvider } from "@/components/WalletContextProvider";

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

function SendDialog({ balance }: { balance: number }) {
  const [toHandle, setToHandle] = useState("");
  const [amount, setAmount] = useState("");
  const sendMut = useAppSendWeixBucks();

  const handleSend = () => {
    const amt = parseInt(amount, 10);
    if (!toHandle.trim() || isNaN(amt) || amt <= 0 || amt > balance) return;
    sendMut.mutate(
      { toHandle: toHandle.trim(), amount: amt },
      {
        onSuccess: () => {
          setToHandle("");
          setAmount("");
        },
      },
    );
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
            Transfer to another user on the yard.
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
            <p className="text-[10px] text-muted-foreground">
              Platform fee ({formatFeePercent(FEE_BPS.tip)}): recipient gets{" "}
              {Math.max(
                0,
                parseInt(amount, 10) -
                  Math.floor((parseInt(amount, 10) * FEE_BPS.tip) / 10000),
              )}{" "}
              WB net
            </p>
          )}
          {sendMut.isError && (
            <p className="text-sm text-destructive">
              {sendMut.error instanceof Error
                ? sendMut.error.message
                : "Send failed"}
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handleSend}
            disabled={sendMut.isPending || !toHandle.trim() || !amount}
          >
            {sendMut.isPending ? "Sending..." : "Send"}
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
      <p className="text-xs font-semibold">Withdrawal eligibility (draft rules)</p>
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
        {eligibility.bkspcSymbol}.
        Withdrawal includes a {formatFeePercent(FEE_BPS.withdrawSettlement)}{" "}
        settlement fee (published schedule).
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
          toast.success("Withdrawal recorded — BKSPC minted on devnet");
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Withdrawal failed",
          );
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
          <ArrowDownLeft className="w-5 h-5 text-primary" /> Withdraw to Solana
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw to Solana (draft bridge)</DialogTitle>
          <DialogDescription>
            Request conversion of earned WeixBucks to BKSPC on devnet.
            Settlement is simulated until legal counsel approves mainnet.
          </DialogDescription>
        </DialogHeader>

        {txSignature ? (
          <div className="space-y-4 py-4 text-center">
            <div className="p-3 bg-green-500/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-green-500">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="font-bold text-lg">Withdrawal recorded</h4>
            <p className="text-sm text-muted-foreground px-4">
              WeixBucks were debited off-chain. On-chain BKSPC minting is
              simulated on devnet — no mainnet tokens until counsel approves.
            </p>
            <div className="bg-muted p-3 rounded-lg text-left">
              <Label className="text-xs text-muted-foreground block mb-1">
                Solana Transaction Signature
              </Label>
              <p className="font-mono text-xs break-all text-primary font-semibold select-all">
                {txSignature}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="solana">Solana Recipient Address</Label>
              <Input
                id="solana"
                placeholder="Solana Wallet Address (e.g. 5tzq...)"
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
            {settlementStatus && (
              <p className="text-[10px] text-muted-foreground">
                On-chain settlement:{" "}
                {settlementStatus.wired
                  ? `devnet live (mint ${settlementStatus.mint?.slice(0, 8)}…)`
                  : settlementStatus.reason ?? "simulated until devnet manifest is configured"}
              </p>
            )}
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

  const txHistory =
    isTauri() && Array.isArray(tauriTx) ? tauriTx.map(mapTx) : mockTxHistory;
  const balance = isTauri() && user ? ((user as any).weixBucks ?? 1250) : 1250;
  const quality =
    isTauri() && user ? ((user as any).engagementQuality ?? 1.0) : 1.0;

  const earnedToday =
    isTauri() && Array.isArray(tauriTx)
      ? tauriTx
          .filter((tx) => tx.txType === "earn")
          .reduce((s: number, tx) => s + tx.amount, 0)
      : 50;

  const handleClaimRewards = async () => {
    const token = getSessionToken();
    if (!token) {
      toast.error("Please sign in");
      return;
    }
    try {
      const amt = await tauriClaimNodeRewards(token);
      toast.success(`Claimed ${amt} WB node rewards (from pin serves/uptime)`);
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <AppShell wide>
        <div className="flex items-center gap-3 mb-8">
          <WalletIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Wallet</h1>
        </div>

        <WalletDisclaimer />

        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 shadow-lg mb-8">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Total Balance
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
            <p className="text-sm text-muted-foreground mb-6">WeixBucks</p>
            <div className="flex gap-3">
              <SendDialog balance={balance} />
              <WithdrawDialog balance={balance} />
              <Button variant="outline" size="sm" onClick={handleClaimRewards}>
                Claim Node Rewards
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Node rewards (0.1 WB per pin serve, daily cap) + malicious intent
              throttle (score &gt;0.7 = 0 reward) wired in backend.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-4 text-center">
              <Zap className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {earnedToday.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Earned Today</p>
            </CardContent>
          </Card>
          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold">{Math.round(quality * 100)}%</p>
              <p className="text-xs text-muted-foreground">
                Engagement Quality
              </p>
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
          />
        </div>

        <Tabs defaultValue="history">
          <TabsList className="mb-6">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="earn">How to Earn</TabsTrigger>
            <TabsTrigger value="marketplace" className="gap-1.5">
              <Store className="w-3.5 h-3.5" />
              Marketplace
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-1">
            {txHistory.map((tx) => (
              <Card
                key={tx.id}
                className="border-0 shadow-none rounded-none border-b border-border/30 last:border-0"
              >
                <CardContent className="flex items-center justify-between py-4 px-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${tx.amount > 0 ? "bg-green-500/10" : "bg-destructive/10"}`}
                    >
                      {tx.amount > 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-green-500" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.user}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.description} • {tx.time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${tx.amount > 0 ? "text-green-500" : "text-destructive"}`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.balance} WB
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="earn">
            <EarnRatesPanel />
            <EconomyTermsCard />
            <EconomyPolicyPanel />
            <EconomyAppealCard />
          </TabsContent>

          <TabsContent value="marketplace">
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
