import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Network,
  Activity,
  Server,
  Zap,
  Users,
  Link2Off,
  RefreshCw,
  Plus,
  Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  useAppGetNetworkStats,
  useAppListRelays,
  useAppGetRecentActivity,
} from "@/hooks/use-app-data";
import {
  useTauriRelayStatuses,
  useTauriConnectToRelay,
  useTauriDisconnectFromRelay,
  useTauriSyncTownEvents,
  useTauriRelayNetworkStats,
  useTauriConnectToDefaultRelays,
  useTauriCheckRelayHealth,
  useTauriPublishNostrVisibilityTest,
  useTauriPublishRelayList,
  useTauriFetchUserRelayList,
} from "@/hooks/use-app-data";
import {
  isTauri,
  TauriRelayStatus,
  type NostrVisibilityTestResult,
} from "@/lib/tauri-api";
import { getStoredPubkey } from "@/lib/auth";

export default function RelaysPage() {
  const [connectUrl, setConnectUrl] = useState("");
  const [connectName, setConnectName] = useState("");
  const [connectTown, setConnectTown] = useState("");
  const [showConnectForm, setShowConnectForm] = useState(false);

  const { data: stats } = useAppGetNetworkStats();
  const { data: relays, isLoading: relaysLoading } = useAppListRelays();
  const { data: activity, isLoading: activityLoading } =
    useAppGetRecentActivity();

  const { data: relayStatuses } = useTauriRelayStatuses();
  const { data: relayNetworkStats } = useTauriRelayNetworkStats();
  const connectMutation = useTauriConnectToRelay();
  const disconnectMutation = useTauriDisconnectFromRelay();
  const syncMutation = useTauriSyncTownEvents();
  const defaultRelaysMutation = useTauriConnectToDefaultRelays();
  const healthCheckMutation = useTauriCheckRelayHealth();
  const visibilityTestMutation = useTauriPublishNostrVisibilityTest();
  const publishRelayListMutation = useTauriPublishRelayList();
  const myPubkey = getStoredPubkey() || "";
  const { data: myRelayList, refetch: refetchMyRelayList } =
    useTauriFetchUserRelayList(myPubkey);
  const [visibilityResult, setVisibilityResult] =
    useState<NostrVisibilityTestResult | null>(null);
  const [healthResults, setHealthResults] = useState<
    Record<string, { connected: boolean; latencyMs?: number }>
  >({});

  const displayStats = relayNetworkStats || stats;
  const isDesktop = isTauri();

  const handleConnect = () => {
    if (!connectUrl || !connectName || !connectTown) return;
    connectMutation.mutate({
      url: connectUrl,
      name: connectName,
      town: connectTown,
    });
    setConnectUrl("");
    setConnectName("");
    setConnectTown("");
    setShowConnectForm(false);
  };

  const handleDisconnect = (url: string) => {
    disconnectMutation.mutate({ url });
  };

  const handleSync = (town: string) => {
    syncMutation.mutate({ town });
  };

  const handleConnectDefaults = () => {
    defaultRelaysMutation.mutate(undefined);
  };

  const handleHealthCheck = async (url: string) => {
    const result = await healthCheckMutation.mutateAsync(url);
    setHealthResults((prev) => ({ ...prev, [url]: result }));
  };

  return (
    <AppShell wide hideRightRail>
      <div className="-mx-4 -mt-4 md:-mx-0 md:-mt-2 mb-6 bg-secondary text-secondary-foreground py-10 border-b-4 border-primary rounded-b-2xl">
        <div className="container px-4">
          <div className="flex items-center gap-4 mb-4">
            <Network className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-black tracking-tighter">
              Relay Network
            </h1>
          </div>
          <p className="text-lg opacity-90 max-w-2xl">
            The decentralized backbone of BKSPC. Run by students, alumni, and
            organizations.
          </p>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {displayStats && (
            <>
              <Card className="bg-card shadow-sm border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-muted-foreground font-medium">
                      Network Health
                    </div>
                    <Activity className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="text-3xl font-bold">
                    {displayStats.onlineRelays ?? 0}{" "}
                    <span className="text-lg text-muted-foreground font-normal">
                      / {displayStats.totalRelays ?? 0}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Relays Online
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card shadow-sm border-l-4 border-l-primary">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-muted-foreground font-medium">
                      Population
                    </div>
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-3xl font-bold">
                    {(displayStats.totalUsers ?? 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Across {displayStats.activeTowns ?? 0} Towns
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card shadow-sm border-l-4 border-l-accent">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-muted-foreground font-medium">
                      Economy
                    </div>
                    <Zap className="w-4 h-4 text-accent" />
                  </div>
                  <div className="text-3xl font-bold text-accent-foreground">
                    {(
                      displayStats.weixBucksInCirculation ?? 0
                    ).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    WeixBucks Minted
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card shadow-sm border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-muted-foreground font-medium">
                      Velocity
                    </div>
                    <Server className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-3xl font-bold">
                    {(displayStats.eventsLast24h ?? 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Events Last 24h
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Server className="w-5 h-5" /> Active Nodes
              </h2>
              <div className="flex gap-2">
                {isDesktop && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleConnectDefaults}
                    disabled={defaultRelaysMutation.isPending}
                  >
                    <Wifi className="w-4 h-4 mr-1" />{" "}
                    {defaultRelaysMutation.isPending
                      ? "Connecting..."
                      : "Connect Defaults"}
                  </Button>
                )}
                {isDesktop && (
                  <Button
                    size="sm"
                    onClick={() => setShowConnectForm(!showConnectForm)}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Connect Relay
                  </Button>
                )}
              </div>
            </div>
            {defaultRelaysMutation.isSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                Connected to {defaultRelaysMutation.data?.length} default
                relays: {defaultRelaysMutation.data?.join(", ")}
              </div>
            )}

            {isDesktop && (
              <Card className="mb-6 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    NIP-65 relay list
                  </CardTitle>
                  <CardDescription>
                    Publish kind 10002 to relays, then fetch live from the
                    network (falls back to local cache).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        publishRelayListMutation.mutate(undefined, {
                          onSuccess: () => refetchMyRelayList(),
                        })
                      }
                      disabled={publishRelayListMutation.isPending}
                    >
                      {publishRelayListMutation.isPending
                        ? "Publishing…"
                        : "Publish my relay list"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refetchMyRelayList()}
                      disabled={!myPubkey}
                    >
                      Refresh from relays
                    </Button>
                  </div>
                  {publishRelayListMutation.isError && (
                    <p className="text-sm text-destructive">
                      {publishRelayListMutation.error.message}
                    </p>
                  )}
                  {publishRelayListMutation.isSuccess && (
                    <p className="text-xs text-green-700">
                      Published event{" "}
                      <span className="font-mono">
                        {publishRelayListMutation.data?.slice(0, 16)}…
                      </span>
                    </p>
                  )}
                  {myPubkey && (
                    <div className="text-sm space-y-1">
                      <p className="text-muted-foreground">Your relays (NIP-65):</p>
                      {myRelayList && myRelayList.length > 0 ? (
                        <ul className="font-mono text-xs space-y-1">
                          {myRelayList.map((url) => (
                            <li key={url} className="break-all">
                              {url}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          None found — connect defaults, then publish.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {isDesktop && (
              <Card className="mb-6 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    Damus / cross-client visibility
                  </CardTitle>
                  <CardDescription>
                    Publish a signed test note to relay.damus.io, then verify on
                    Damus or nostr.band.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      visibilityTestMutation.mutate(undefined, {
                        onSuccess: (result) => setVisibilityResult(result),
                      })
                    }
                    disabled={visibilityTestMutation.isPending}
                  >
                    {visibilityTestMutation.isPending
                      ? "Publishing…"
                      : "Publish visibility test note"}
                  </Button>
                  {visibilityTestMutation.isError && (
                    <p className="text-sm text-destructive">
                      {visibilityTestMutation.error.message}
                    </p>
                  )}
                  {visibilityResult && (
                    <div className="space-y-3 text-sm">
                      <Badge
                        variant={
                          visibilityResult.fetchedBack ? "default" : "secondary"
                        }
                      >
                        {visibilityResult.fetchedBack
                          ? "Relay round-trip OK"
                          : "Published — waiting on relay index"}
                      </Badge>
                      <p className="text-muted-foreground break-all">
                        {visibilityResult.content}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" asChild>
                          <a
                            href={`https://nostr.band/${visibilityResult.nevent}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open on nostr.band
                          </a>
                        </Button>
                        <Button size="sm" variant="secondary" asChild>
                          <a
                            href={`https://nostr.band/${visibilityResult.npub}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Your profile on nostr.band
                          </a>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Damus (iOS): add relay{" "}
                        <span className="font-mono">
                          {visibilityResult.relayUrl}
                        </span>
                        , search your npub{" "}
                        <span className="font-mono break-all">
                          {visibilityResult.npub}
                        </span>
                        , or search note text “BKSPC visibility test”.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {isDesktop && showConnectForm && (
              <Card className="mb-6 border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-bold text-sm">
                    Connect to a Nostr Relay
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Input
                      placeholder="wss://relay.example.com"
                      value={connectUrl}
                      onChange={(e) => setConnectUrl(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Display name"
                      value={connectName}
                      onChange={(e) => setConnectName(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Town (e.g. tsu)"
                      value={connectTown}
                      onChange={(e) => setConnectTown(e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      onClick={handleConnect}
                      disabled={connectMutation.isPending}
                    >
                      {connectMutation.isPending ? "Connecting..." : "Connect"}
                    </Button>
                  </div>
                  {connectMutation.isSuccess && (
                    <p className="text-xs text-green-600">
                      {connectMutation.data}
                    </p>
                  )}
                  {connectMutation.isError && (
                    <p className="text-xs text-red-600">
                      {connectMutation.error.message}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {isDesktop && relayStatuses && relayStatuses.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-green-500" /> Your Connections
                </h3>
                <div className="space-y-2">
                  {relayStatuses.map((rs) => (
                    <Card
                      key={rs.url}
                      className="border-l-4 border-l-green-500"
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{rs.url}</div>
                          <div className="text-xs text-muted-foreground">
                            Events received: {rs.eventsReceived}
                            {rs.latencyMs && (
                              <span className="ml-2 text-green-600">
                                {rs.latencyMs}ms
                              </span>
                            )}
                            {healthResults[rs.url] && (
                              <span
                                className={`ml-2 ${healthResults[rs.url].connected ? "text-green-600" : "text-red-600"}`}
                              >
                                {healthResults[rs.url].connected
                                  ? "Healthy"
                                  : "Unreachable"}
                                {healthResults[rs.url].latencyMs &&
                                  ` (${healthResults[rs.url].latencyMs}ms)`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSync("tsu")}
                            disabled={syncMutation.isPending}
                          >
                            <RefreshCw
                              className={`w-3 h-3 mr-1 ${syncMutation.isPending ? "animate-spin" : ""}`}
                            />
                            Sync
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleHealthCheck(rs.url)}
                            disabled={healthCheckMutation.isPending}
                          >
                            <Activity className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDisconnect(rs.url)}
                          >
                            <Link2Off className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {relaysLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted/50 rounded-xl"></div>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {Array.isArray(relays) &&
                  relays.map((relay) => (
                    <Card
                      key={relay.id}
                      className="shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group border-muted"
                    >
                      <div
                        className={`absolute top-0 left-0 w-1 h-full ${relay.status === "online" ? "bg-green-500" : relay.status === "degraded" ? "bg-yellow-500" : "bg-red-500"}`}
                      ></div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex justify-between items-center">
                          <span className="font-bold truncate pr-2">
                            {relay.name}
                          </span>
                          <Badge
                            variant={
                              relay.status === "online"
                                ? "default"
                                : "secondary"
                            }
                            className={
                              relay.status === "online"
                                ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 shadow-none"
                                : ""
                            }
                          >
                            {relay.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 text-xs uppercase tracking-wider font-semibold">
                          {relay.university} • {relay.town}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">
                              Uptime
                            </span>
                            <span className="font-medium">
                              {relay.uptimePercent}%
                            </span>
                          </div>
                          <Progress
                            value={relay.uptimePercent}
                            className="h-1.5"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t pt-3">
                          <div>
                            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">
                              Peers
                            </div>
                            <div className="font-bold">
                              {relay.connectedPeers}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">
                              Events/hr
                            </div>
                            <div className="font-bold">
                              {relay.eventsPerHour.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5" /> Live Activity
            </h2>
            <Card className="bg-card border-muted shadow-sm h-[600px] flex flex-col">
              <CardContent className="p-0 flex-1 overflow-auto">
                {activityLoading ? (
                  <div className="p-4 space-y-4 animate-pulse">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-12 bg-muted/50 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y">
                    {Array.isArray(activity) &&
                      activity.map((event) => (
                        <div
                          key={event.id}
                          className="p-4 hover:bg-muted/30 transition-colors text-sm"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase"
                            >
                              {event.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-foreground mt-1">
                            {event.description}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1 font-medium">
                            {event.town}{" "}
                            {event.userHandle && `• @${event.userHandle}`}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
