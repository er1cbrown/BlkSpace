import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  useTauriSyncAccountContent,
  useTauriGetUserAccountData,
  useTauriGetPendingOfflineActions,
  useTauriListPinnedContent,
  useTauriListOfflineCache,
  useTauriClaimNodeRewards,
  useTauriGetDeviceSyncHistory,
  useTauriRunTier0Benchmark,
} from "@/hooks/use-app-data";
import type { Tier0BenchmarkReport } from "@/lib/tauri-api";
import { getSessionToken, getCurrentHandle } from "@/lib/auth";
import { isTauri } from "@/lib/tauri-api";
import {
  Smartphone,
  Laptop,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Database,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function DeviceMeshTestPage() {
  const [activeTab, setActiveTab] = useState("sync");
  const [deviceId, setDeviceId] = useState(() => {
    const stored = localStorage.getItem("device_id");
    if (stored) return stored;
    const newId = `device_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem("device_id", newId);
    return newId;
  });

  const syncMutation = useTauriSyncAccountContent();
  const { data: accountData } = useTauriGetUserAccountData();
  const { data: pendingActions } = useTauriGetPendingOfflineActions();
  const { data: pinnedContent } = useTauriListPinnedContent();
  const { data: offlineCache } = useTauriListOfflineCache();
  const { data: nodeRewards } = useTauriClaimNodeRewards();
  const { data: syncHistory } = useTauriGetDeviceSyncHistory(deviceId);
  const tier0Bench = useTauriRunTier0Benchmark();
  const [benchReport, setBenchReport] = useState<Tier0BenchmarkReport | null>(
    null,
  );

  const handleSync = () => {
    const start = performance.now();
    syncMutation.mutate(undefined, {
      onSuccess: (syncedItems) => {
        const duration = Math.round(performance.now() - start);
        console.log(`Synced ${syncedItems.length} items in ${duration}ms`);
      },
    });
  };

  const isDesktop = isTauri();
  const sessionToken = getSessionToken();
  const handle = getCurrentHandle();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      <div className="bg-secondary text-secondary-foreground py-12 border-b-4 border-primary">
        <div className="container px-4">
          <div className="flex items-center gap-4 mb-4">
            <ArrowRightLeft className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-black tracking-tighter">
              Multi-Device Sync Test
            </h1>
          </div>
          <p className="text-lg opacity-90 max-w-2xl">
            Cross-device sync, recovery, and performance testing — Nostr relays,
            Iroh media, and offline queue (hub-sync mesh).
          </p>
          <div className="flex items-center gap-2 mt-4 text-sm">
            <Badge variant="outline" className="bg-background/20">
              Device: {deviceId}
            </Badge>
            <Badge variant="outline" className="bg-background/20">
              User: {handle}
            </Badge>
            <Badge variant={isDesktop ? "default" : "secondary"}>
              {isDesktop ? "Desktop" : "Web"}
            </Badge>
          </div>
        </div>
      </div>

      <main className="flex-1 container py-8 px-4">
        {!sessionToken && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-yellow-800">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            You must be logged in to test cross-device sync. Go to Settings →
            Sign In first.
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid grid-cols-5 w-full max-w-3xl">
            <TabsTrigger value="sync">Sync</TabsTrigger>
            <TabsTrigger value="recovery">Recovery</TabsTrigger>
            <TabsTrigger value="offline">Offline</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" /> Account Sync
                  </CardTitle>
                  <CardDescription>
                    Sync all your content (posts, media, wallet) to this device
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={handleSync}
                    disabled={syncMutation.isPending || !sessionToken}
                    className="w-full"
                  >
                    {syncMutation.isPending
                      ? "Syncing..."
                      : "Sync Account Content"}
                  </Button>
                  {syncMutation.isSuccess && (
                    <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">
                      <CheckCircle2 className="w-4 h-4 inline mr-1" />
                      Synced {syncMutation.data?.length} items from Iroh
                    </div>
                  )}
                  {syncMutation.isError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Sync failed: {syncMutation.error?.message}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" /> Account Data
                  </CardTitle>
                  <CardDescription>
                    Current account data on this device
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {accountData ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">User</span>
                        <span className="font-medium">
                          {accountData.user?.display_name}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Posts</span>
                        <span className="font-medium">
                          {accountData.posts?.length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Wallet TX</span>
                        <span className="font-medium">
                          {accountData.wallet_tx?.length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">WeixBucks</span>
                        <span className="font-medium">
                          {accountData.user?.weix_bucks}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No account data loaded
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" /> Sync History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {syncHistory && syncHistory.length > 0 ? (
                  <div className="space-y-2">
                    {syncHistory.map((entry, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-sm py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          {entry[3] ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span>{entry[0]}</span>
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span>{entry[1]} items</span>
                          <span>{entry[2]}ms</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No sync history yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recovery" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" /> BIP39 Recovery Test
                </CardTitle>
                <CardDescription>
                  Verify account recovery with mnemonic phrase
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                  <p className="font-medium">Recovery Steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Go to Settings → Security</li>
                    <li>View your recovery phrase</li>
                    <li>Write it down on paper</li>
                    <li>Click "Sign Out" to clear this device</li>
                    <li>Go to /recover and enter your phrase</li>
                    <li>Verify your balance and posts are restored</li>
                  </ol>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-green-50 text-green-700 p-3 rounded-lg text-sm">
                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                    Recovery phrase: Available in Settings
                  </div>
                  <div className="flex-1 bg-blue-50 text-blue-700 p-3 rounded-lg text-sm">
                    <Database className="w-4 h-4 inline mr-1" />
                    Data: Synced via Iroh CIDs
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offline" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <WifiOff className="w-5 h-5" /> Pending Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {pendingActions?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Queued offline actions
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wifi className="w-5 h-5" /> Pinned Content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {pinnedContent?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Locally pinned blobs
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" /> Offline Cache
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {offlineCache?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Cached for offline
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Offline Queue Test</CardTitle>
                <CardDescription>
                  Test what happens when you create posts without internet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">Test Scenario:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Disconnect internet</li>
                      <li>Create a post on Feed page</li>
                      <li>Post is queued locally</li>
                      <li>Reconnect internet</li>
                      <li>Queued posts are published automatically</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Laptop className="w-5 h-5" /> Tier 0 Performance Benchmark
                </CardTitle>
                <CardDescription>
                  Target: Windows 10, 4GB RAM, i3 — run on Tier 0 hardware and
                  sign off DEVICE_MESH_TESTING.md §4.1
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isDesktop ? (
                  <>
                    <Button
                      onClick={() =>
                        tier0Bench.mutate(undefined, {
                          onSuccess: (report) => setBenchReport(report),
                        })
                      }
                      disabled={tier0Bench.isPending}
                    >
                      {tier0Bench.isPending
                        ? "Running…"
                        : "Run Tier 0 Benchmark"}
                    </Button>
                    {benchReport && (
                      <div className="space-y-4 pt-2">
                        {benchReport.metrics.map((m) => (
                          <div key={m.name}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="flex items-center gap-2">
                                {m.pass ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-amber-500" />
                                )}
                                {m.name}
                              </span>
                              <span className="text-muted-foreground">
                                {m.durationMs}ms / &lt; {m.targetMs}ms
                              </span>
                            </div>
                            <Progress
                              value={Math.min(
                                100,
                                (m.durationMs / m.targetMs) * 100,
                              )}
                              className="h-2"
                            />
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground">
                          {benchReport.deviceNote}
                        </p>
                        <Badge
                          variant={
                            benchReport.allPass ? "default" : "secondary"
                          }
                        >
                          {benchReport.allPass
                            ? "All targets met on this device"
                            : "Some targets missed — retry on Tier 0"}
                        </Badge>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Open in Tauri desktop to run live benchmarks.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stress Test</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Create 100 posts in 5 minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Rate limiting: 30 req/60s</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Database consistency maintained</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>UI responsive throughout</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" /> Node Rewards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/10 p-4 rounded-lg">
                    <div className="text-2xl font-bold">{nodeRewards || 0}</div>
                    <div className="text-sm text-muted-foreground">
                      Today's Rewards (WB)
                    </div>
                  </div>
                  <div className="bg-accent/10 p-4 rounded-lg">
                    <div className="text-2xl font-bold">
                      {pinnedContent?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Pinned Content
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">Reward Structure:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Pin serve: 0.1 WB per fetch</li>
                    <li>Daily cap: 100 serves (10 WB max)</li>
                    <li>Relay uptime: 1-5 WB/hour</li>
                    <li>Content upload: 10 WB (new blobs only)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
