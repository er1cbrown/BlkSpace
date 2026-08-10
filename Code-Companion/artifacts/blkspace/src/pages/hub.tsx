import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HUB_TOPICS,
  hubTopicLabel,
  listHubItems,
  publishHubItem,
  type HubItemKind,
  type HubTopic,
} from "@/lib/content-hub";
import { useGuestMode } from "@/lib/guest-mode";
import { isSafeHttpUrl } from "@/lib/amalgamation-meta";
import { BRAND } from "@/lib/brand";
import {
  Clapperboard,
  ExternalLink,
  Gamepad2,
  GraduationCap,
  Layers,
  Plus,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import { loadUiPrefs } from "@/lib/ui-prefs";
import {
  disciplineUpliftLine,
  getDisciplineTrack,
  orderHubTopicsForTrack,
} from "@/lib/discipline-track";
import { ShareCardButton } from "@/components/social/ShareCardButton";
import { playShellPath } from "@/lib/share-card";

/**
 * Content Hub — amalgamation media shelf (chess lessons, live links, fashion,
 * pro portfolios). Complements feed; focuses topic discovery + earn literacy.
 * Topic order follows BKSPC University discipline track.
 */
export default function HubPage() {
  const { isGuest } = useGuestMode();
  const [topic, setTopic] = useState<HubTopic | "all">("all");
  const [showPublish, setShowPublish] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [pubTopic, setPubTopic] = useState<HubTopic>("chess");
  const [kind, setKind] = useState<HubItemKind>("post");
  const [tick, setTick] = useState(0);
  const [prefsTick, setPrefsTick] = useState(0);

  const uiPrefs = useMemo(() => {
    void prefsTick;
    try {
      return loadUiPrefs();
    } catch {
      return null;
    }
  }, [prefsTick]);

  const discipline = getDisciplineTrack(uiPrefs?.disciplineTrack);
  const orderedTopics = useMemo(
    () => orderHubTopicsForTrack(HUB_TOPICS, discipline.id),
    [discipline.id],
  );

  const items = useMemo(() => {
    void tick;
    return listHubItems(topic);
  }, [topic, tick]);

  // Live-update when settings save discipline track
  useEffect(() => {
    const onPrefs = () => setPrefsTick((n) => n + 1);
    window.addEventListener("blkspace-ui-prefs", onPrefs);
    return () => window.removeEventListener("blkspace-ui-prefs", onPrefs);
  }, []);

  const publish = () => {
    if (isGuest) {
      toast("Create a free account to publish on the Hub", {
        action: {
          label: "Sign up",
          onClick: () => {
            window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/welcome`;
          },
        },
      });
      return;
    }
    try {
      publishHubItem({
        topic: pubTopic,
        kind,
        title,
        body,
        mediaUrl,
      });
      toast.success("Published to Content Hub");
      setTitle("");
      setBody("");
      setMediaUrl("");
      setShowPublish(false);
      setTick((n) => n + 1);
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <AppShell wide>
      <div className="space-y-6 max-w-4xl">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold font-serif">Content Hub</h1>
            <Badge variant="secondary">Amalgamation</Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            One shelf for underrepresented-network culture — chess lessons, live
            link-outs, fashion drops, study hours, pro portfolios. Same{" "}
            {BRAND.name} identity and soft-earn story as the feed, yards, and
            Connect. Topics reorder for your{" "}
            <span className="text-foreground font-medium">
              {discipline.label}
            </span>{" "}
            track.
          </p>
          <p className="text-xs text-primary/90 max-w-2xl">
            {disciplineUpliftLine(discipline.id)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/wallet">
              <Button size="sm" variant="outline" className="gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                Money literacy
              </Button>
            </Link>
            <Link href="/arcade">
              <Button size="sm" variant="default" className="gap-1">
                <Gamepad2 className="w-3.5 h-3.5" />
                Yard Arcade
              </Button>
            </Link>
            <Link href="/create">
              <Button size="sm" variant="outline" className="gap-1">
                <Clapperboard className="w-3.5 h-3.5" />
                Create post
              </Button>
            </Link>
            <Link href="/settings">
              <Button size="sm" variant="outline">
                Change discipline
              </Button>
            </Link>
            <Button
              size="sm"
              className="gap-1"
              onClick={() => setShowPublish(!showPublish)}
            >
              <Plus className="w-3.5 h-3.5" />
              Publish to Hub
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {orderedTopics.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTopic(t.id)}
              className={`text-left rounded-xl border p-3 transition-colors ${
                topic === t.id
                  ? "border-primary bg-primary/10"
                  : "border-border/60 hover:border-primary/40"
              }`}
            >
              <div className="text-sm font-medium">{t.label}</div>
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                {t.blurb}
              </p>
              <p className="text-[10px] text-primary mt-1.5">{t.earnAngle}</p>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={topic === "all" ? "default" : "ghost"}
            onClick={() => setTopic("all")}
          >
            All topics
          </Button>
          <span className="text-xs text-muted-foreground">
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        </div>

        {showPublish && (
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Publish hub item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                <Select
                  value={pubTopic}
                  onValueChange={(v) => setPubTopic(v as HubTopic)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {HUB_TOPICS.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={kind}
                  onValueChange={(v) => setKind(v as HubItemKind)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kind" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "post",
                        "lesson",
                        "video",
                        "stream",
                        "article",
                        "portfolio",
                        "playable",
                      ] as HubItemKind[]
                    ).map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="What should the yard learn or watch?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
              />
              <Input
                placeholder="Optional link (Lichess, Twitch, YT, WASM demo, portfolio…)"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Radio className="w-3 h-3" />
                Live? Use kind <strong>stream</strong> + watch URL. Playable?
                Use kind <strong>playable</strong> + HTTPS static/WASM URL →
                Play shell.
              </p>
              <Button size="sm" disabled={!title.trim()} onClick={publish}>
                Publish
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="border-primary/10">
              <CardContent className="p-4 space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant="outline" className="text-[10px]">
                    {hubTopicLabel(item.topic)}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {item.kind}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    @{item.authorHandle} · {item.yardId}
                  </span>
                </div>
                <h2 className="font-semibold text-base leading-snug">
                  {item.title}
                </h2>
                <p className="text-sm text-muted-foreground">{item.body}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <ShareCardButton
                    variant="outline"
                    share={{
                      kind: item.kind === "playable" ? "playable" : "hub",
                      title: item.title,
                      body: item.body,
                      authorHandle: item.authorHandle,
                      yardId: item.yardId,
                      path:
                        item.kind === "playable" &&
                        item.mediaUrl &&
                        isSafeHttpUrl(item.mediaUrl)
                          ? playShellPath(item.mediaUrl)
                          : "/hub",
                      externalUrl: item.mediaUrl || undefined,
                    }}
                  />
                  {item.kind === "playable" &&
                    item.mediaUrl &&
                    isSafeHttpUrl(item.mediaUrl) && (
                      <Link
                        href={playShellPath(item.mediaUrl) +
                          `&title=${encodeURIComponent(item.title)}`}
                      >
                        <Button size="sm" className="gap-1 h-8">
                          <Gamepad2 className="w-3.5 h-3.5" />
                          Play in BlkSpace
                        </Button>
                      </Link>
                    )}
                </div>
                {item.mediaUrl && isSafeHttpUrl(item.mediaUrl) && (
                  <a
                    href={item.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Open link
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <p className="text-[11px] text-primary/90 border-l-2 border-primary/30 pl-2">
                  Earn angle: {item.earnHint}
                </p>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nothing in this topic yet — be the first to publish.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
