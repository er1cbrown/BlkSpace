import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShareCardButton } from "@/components/social/ShareCardButton";
import { useGuestMode } from "@/lib/guest-mode";
import { BRAND } from "@/lib/brand";
import { loadUiPrefs } from "@/lib/ui-prefs";
import { TOWN_OPTIONS } from "@/lib/towns";
import {
  ARCADE_SIZE_CLASSES,
  arcadePlayPath,
  arcadeScopeLine,
  ensureArcadeSeeds,
  listArcadeGames,
  parseArcadeRuntime,
  parseArcadeSize,
  publishArcadeGame,
  sizeMeta,
  YARD_ARCADE_NAME,
  type ArcadeSizeClass,
} from "@/lib/yard-arcade";
import {
  SUPER_BLKSPACE_FIGHTERS,
  PROJECT_B_EQUATION,
} from "@/lib/yard-day-brawl";
import {
  Gamepad2,
  Joystick,
  Plus,
  Shield,
  Store,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Yard Arcade — homebrew campus games shelf.
 * Steam Workshop energy without Steam-class platform claims.
 */
export default function ArcadePage() {
  const { isGuest } = useGuestMode();
  const prefs = loadUiPrefs();
  const [tick, setTick] = useState(0);
  const [yardFilter, setYardFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<ArcadeSizeClass | "all">("all");
  const [q, setQ] = useState("");
  const [showPublish, setShowPublish] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [playUrl, setPlayUrl] = useState("");
  const [sizeClass, setSizeClass] = useState<ArcadeSizeClass>("tier0");
  const [topic, setTopic] = useState<"gaming" | "systems">("gaming");
  const [listPriceWb, setListPriceWb] = useState("0");

  useEffect(() => {
    ensureArcadeSeeds();
    setTick((n) => n + 1);
  }, []);

  const games = useMemo(() => {
    void tick;
    return listArcadeGames({
      yardId: yardFilter,
      size: sizeFilter,
      q,
    });
  }, [tick, yardFilter, sizeFilter, q]);

  const publish = () => {
    if (isGuest) {
      toast("Create a free account to publish homebrew", {
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
      const price = Number.parseInt(listPriceWb, 10) || 0;
      publishArcadeGame({
        title,
        body,
        playUrl,
        sizeClass,
        topic,
        yardId: prefs.homeYardId || "tsu",
        listPriceWb: price,
      });
      toast.success(`Live on ${YARD_ARCADE_NAME}`);
      setTitle("");
      setBody("");
      setPlayUrl("");
      setListPriceWb("0");
      setShowPublish(false);
      setTick((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <AppShell wide>
      <div className="space-y-6 max-w-4xl">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Joystick className="w-7 h-7 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight">
              {YARD_ARCADE_NAME}
            </h1>
            <Badge className="bg-primary/90">Homebrew</Badge>
            <Badge variant="outline">Not Steam</Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Campus shelf for student games and systems demos — play in the{" "}
            <Link href="/play" className="text-primary underline-offset-2 hover:underline">
              Play shell
            </Link>
            , share with the yard, optional soft WB list later. Same{" "}
            {BRAND.name} identity as Hub, Yards, and Yard Sale.{" "}
            <strong className="text-foreground font-medium">
              {SUPER_BLKSPACE_FIGHTERS}
            </strong>{" "}
            series{" "}
            <span className="font-mono text-[11px]">
              ({PROJECT_B_EQUATION} · YDB1/XQ5D/5DXQ)
            </span>{" "}
            — Flash nostalgia trilogy (Rumble → Smash Flash → Capoeira/tag
            classes), original cast only.{" "}
            <Link href="/rollback" className="text-primary underline-offset-2 hover:underline font-medium">
              Rollback lab (N1)
            </Link>
          </p>
        </div>

        <Alert className="border-primary/25 bg-primary/5">
          <Shield className="w-4 h-4" />
          <AlertTitle className="text-sm">Scope honesty</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            {arcadeScopeLine()} Optional runtimes (e.g. Flash-class) stay
            plugins — not the product name.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-1"
            onClick={() => setShowPublish(!showPublish)}
          >
            <Plus className="w-3.5 h-3.5" />
            Publish homebrew
          </Button>
          <Link href="/hub">
            <Button size="sm" variant="outline" className="gap-1">
              <Layers className="w-3.5 h-3.5" />
              Content Hub
            </Button>
          </Link>
          <Link href="/communities">
            <Button size="sm" variant="outline" className="gap-1">
              <Store className="w-3.5 h-3.5" />
              Yards · Yard Sale
            </Button>
          </Link>
        </div>

        {showPublish && (
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Drop a homebrew
              </CardTitle>
              <CardDescription className="text-xs">
                HTTPS static or WASM URL preferred. Host your files; we stage
                play + social. Git forge stays external.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                <Select
                  value={topic}
                  onValueChange={(v) => setTopic(v as "gaming" | "systems")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Shelf" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gaming">Gaming homebrew</SelectItem>
                    <SelectItem value="systems">Systems / demos</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={sizeClass}
                  onValueChange={(v) => setSizeClass(v as ArcadeSizeClass)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Size class" />
                  </SelectTrigger>
                  <SelectContent>
                    {ARCADE_SIZE_CLASSES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label} · ≤~{s.softMaxMb} MB hint
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
                placeholder="What is it? Controls? Jam theme?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
              />
              <Input
                placeholder="Play URL (https://…)"
                value={playUrl}
                onChange={(e) => setPlayUrl(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                placeholder="Optional list price WB (0 = free play)"
                value={listPriceWb}
                onChange={(e) => setListPriceWb(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                {sizeMeta(sizeClass).blurb}. Paid soft goods still use Yard Sale
                escrow when you list there — Arcade is the play catalog.
              </p>
              <Button
                size="sm"
                disabled={!title.trim() || !playUrl.trim()}
                onClick={publish}
              >
                Publish to Arcade
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Input
            placeholder="Search title, author, yard…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={yardFilter} onValueChange={setYardFilter}>
            <SelectTrigger className="sm:w-[160px]">
              <SelectValue placeholder="Yard" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All yards</SelectItem>
              {TOWN_OPTIONS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sizeFilter}
            onValueChange={(v) =>
              setSizeFilter(v as ArcadeSizeClass | "all")
            }
          >
            <SelectTrigger className="sm:w-[140px]">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sizes</SelectItem>
              {ARCADE_SIZE_CLASSES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground sm:ml-auto">
            {games.length} game{games.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {games.map((item) => {
            const size = parseArcadeSize(item);
            const runtime = parseArcadeRuntime(item);
            const play = arcadePlayPath(item);
            return (
              <Card
                key={item.id}
                className="border-primary/15 overflow-hidden flex flex-col"
              >
                <div className="h-1 bg-gradient-to-r from-primary via-accent to-secondary" />
                <CardHeader className="pb-2 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {sizeMeta(size).label}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {runtime}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {item.yardId}
                    </Badge>
                  </div>
                  <CardTitle className="text-base leading-snug">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-3">
                    {item.body.replace(/\[\[size:\w+\]\]/gi, "").trim()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-2 pt-0">
                  <p className="text-[11px] text-muted-foreground">
                    @{item.authorHandle} · {item.earnHint}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {play ? (
                      <Link href={play}>
                        <Button size="sm" className="gap-1 h-8">
                          <Gamepad2 className="w-3.5 h-3.5" />
                          Play
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" disabled className="h-8">
                        No play URL
                      </Button>
                    )}
                    <ShareCardButton
                      variant="outline"
                      share={{
                        kind: "playable",
                        title: item.title,
                        body: item.body,
                        authorHandle: item.authorHandle,
                        yardId: item.yardId,
                        path: play || "/arcade",
                        externalUrl: item.mediaUrl || undefined,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {games.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-2">
              <Joystick className="w-8 h-8 mx-auto opacity-50" />
              <p>No homebrew matches — publish the first jam build.</p>
              <Button size="sm" onClick={() => setShowPublish(true)}>
                Publish homebrew
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
