import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon, Gift, Zap, TrendingUp, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { useTauriGetWalletTx, useAppSendWeixBucks, useAppGetUser, useAppWithdrawToSolana } from "@/hooks/use-app-data";
import { isTauri, type TauriWalletTx } from "@/lib/tauri-api";
import { getCurrentHandle } from "@/lib/auth";

const mockTxHistory = [
  { id: 1, type: "earn", user: "Content Reward", amount: 50, description: "Viral post reward", time: "2h ago", balance: 1250 },
  { id: 2, type: "spend", user: "Tip to @jane_doe", amount: -25, description: "Appreciation tip", time: "5h ago", balance: 1200 },
  { id: 3, type: "earn", user: "Node Reward", amount: 100, description: "Relay uptime bonus", time: "1d ago", balance: 1225 },
  { id: 4, type: "earn", user: "Engagement Bonus", amount: 75, description: "Weekly engagement reward", time: "2d ago", balance: 1125 },
  { id: 5, type: "spend", user: "Boost Post", amount: -50, description: "Post promotion", time: "3d ago", balance: 1050 },
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
      { onSuccess: () => { setToHandle(""); setAmount(""); } },
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
          <DialogDescription>Transfer to another user on the yard.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="to">Recipient Handle</Label>
            <Input id="to" placeholder="@username" value={toHandle} onChange={e => setToHandle(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (WB)</Label>
            <Input id="amount" type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} min={1} max={balance} />
          </div>
          <p className="text-xs text-muted-foreground">Balance: {balance.toLocaleString()} WB</p>
          {sendMut.isError && (
            <p className="text-sm text-destructive">{sendMut.error instanceof Error ? sendMut.error.message : "Send failed"}</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSend} disabled={sendMut.isPending || !toHandle.trim() || !amount}>
            {sendMut.isPending ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawDialog({ balance }: { balance: number }) {
  const [solanaAddress, setSolanaAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const withdrawMut = useAppWithdrawToSolana();

  const handleWithdraw = () => {
    const amt = parseInt(amount, 10);
    if (!solanaAddress.trim() || isNaN(amt) || amt < 100 || amt > balance) return;
    withdrawMut.mutate(
      { studentSolanaAddress: solanaAddress.trim(), amountWb: amt },
      {
        onSuccess: (sig) => {
          setTxSignature(sig);
          setSolanaAddress("");
          setAmount("");
        },
      }
    );
  };

  return (
    <Dialog onOpenChange={(open) => { if (!open) setTxSignature(""); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full gap-2 flex-1 h-12 font-bold border-primary/20 hover:bg-primary/5">
          <ArrowDownLeft className="w-5 h-5 text-primary" /> Withdraw to Solana
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw to Solana (BLKCOIN)</DialogTitle>
          <DialogDescription>Convert your off-chain WeixBucks (WB) into on-chain BLKCOIN tokens.</DialogDescription>
        </DialogHeader>
        
        {txSignature ? (
          <div className="space-y-4 py-4 text-center">
            <div className="p-3 bg-green-500/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-green-500">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="font-bold text-lg">Withdrawal Successful!</h4>
            <p className="text-sm text-muted-foreground px-4">
              Your off-chain WeixBucks have been converted and the BLKCOIN tokens are on the way to your Solana wallet.
            </p>
            <div className="bg-muted p-3 rounded-lg text-left">
              <Label className="text-xs text-muted-foreground block mb-1">Solana Transaction Signature</Label>
              <p className="font-mono text-xs break-all text-primary font-semibold select-all">{txSignature}</p>
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
                onChange={e => setSolanaAddress(e.target.value)}
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
                onChange={e => setAmount(e.target.value)}
                min={100}
                max={balance}
              />
            </div>
            <div className="bg-accent/5 p-3 rounded-lg border border-primary/10 flex items-start gap-3">
              <Coins className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold">Hybrid Bridge Rules</p>
                <p className="text-muted-foreground">1 WeixBuck (WB) = 1,000,000,000 BLKCOIN on Solana Devnet.</p>
                <p className="text-muted-foreground">Standard daily cap is 1,000 WB per student.</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Available balance: {balance.toLocaleString()} WB</p>
            {withdrawMut.isError && (
              <p className="text-sm text-destructive">{withdrawMut.error instanceof Error ? withdrawMut.error.message : "Withdrawal failed"}</p>
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
              <Button onClick={handleWithdraw} disabled={withdrawMut.isPending || !solanaAddress.trim() || !amount || parseInt(amount, 10) < 100 || parseInt(amount, 10) > balance}>
                {withdrawMut.isPending ? "Signing CPI Mint..." : "Confirm & Withdraw"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WalletPage() {
  const handle = getCurrentHandle();
  const { data: user } = useAppGetUser(handle);
  const { data: tauriTx } = useTauriGetWalletTx();

  const txHistory = isTauri() && Array.isArray(tauriTx) ? tauriTx.map(mapTx) : mockTxHistory;
  const balance = isTauri() && user ? (user as any).weixBucks ?? 1250 : 1250;
  const quality = isTauri() && user ? (user as any).engagementQuality ?? 1.0 : 1.0;

  const earnedToday = isTauri() && Array.isArray(tauriTx)
    ? tauriTx.filter(tx => tx.txType === "earn").reduce((s: number, tx) => s + tx.amount, 0)
    : 50;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container max-w-3xl py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <WalletIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Wallet</h1>
        </div>

        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 shadow-lg mb-8">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Balance</p>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-5xl font-black tracking-tighter text-foreground">{balance.toLocaleString()}</h2>
                  <Coins className="w-8 h-8 text-primary" />
                </div>
              </div>
              <Avatar className="h-16 w-16 border-2 border-primary/30 bg-background">
                <AvatarFallback><Coins className="w-8 h-8 text-primary" /></AvatarFallback>
              </Avatar>
            </div>
            <p className="text-sm text-muted-foreground mb-6">WeixBucks</p>
            <div className="flex gap-3">
              <SendDialog balance={balance} />
              <WithdrawDialog balance={balance} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-4 text-center">
              <Zap className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{earnedToday.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Earned Today</p>
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
              <p className="text-2xl font-bold">{isTauri() && Array.isArray(tauriTx) ? tauriTx.length : 3}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="history">
          <TabsList className="mb-6">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="earn">How to Earn</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-1">
            {txHistory.map(tx => (
              <Card key={tx.id} className="border-0 shadow-none rounded-none border-b border-border/30 last:border-0">
                <CardContent className="flex items-center justify-between py-4 px-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tx.amount > 0 ? "bg-green-500/10" : "bg-destructive/10"}`}>
                      {tx.amount > 0
                        ? <ArrowUpRight className="w-4 h-4 text-green-500" />
                        : <ArrowDownLeft className="w-4 h-4 text-destructive" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.user}</p>
                      <p className="text-xs text-muted-foreground">{tx.description} • {tx.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${tx.amount > 0 ? "text-green-500" : "text-destructive"}`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">{tx.balance} WB</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="earn">
            <Card className="border-primary/10">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10"><Zap className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h3 className="font-bold mb-1">Create Content</h3>
                    <p className="text-sm text-muted-foreground">Earn WeixBucks when your posts get engagement from the community.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-green-500/10"><TrendingUp className="w-5 h-5 text-green-500" /></div>
                  <div>
                    <h3 className="font-bold mb-1">Run a Relay</h3>
                    <p className="text-sm text-muted-foreground">Host a node and earn steady rewards for keeping the network healthy.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-accent/10"><Users className="w-5 h-5 text-accent" /></div>
                  <div>
                    <h3 className="font-bold mb-1">Engage Daily</h3>
                    <p className="text-sm text-muted-foreground">Maintain your quality score by posting, replying, and liking every day.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
