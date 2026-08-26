import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import {
  Users,
  MapPin,
  GraduationCap,
  ArrowRight,
  Search,
  Sparkles,
  Lock,
} from "lucide-react";
import { useTauriGetCommunities } from "@/hooks/use-app-data";
import { isTauri, type TauriCommunity } from "@/lib/tauri-api";
import { BETA_FEATURES } from "@/lib/beta-features";
import { getYardTheme, resolveCommunityYardTheme } from "@/lib/yard-themes";
import {
  FEATURED_YARD_IDS,
  HBCU_STATES,
  catalogStats,
  isFeaturedYardId,
  searchHbcus,
  type HbcuControl,
} from "@/lib/hbcu-catalog";
import { loadUiPrefs } from "@/lib/ui-prefs";
import { SampleBadge } from "@/components/ui/sample-badge";

function mapCommunity(c: TauriCommunity) {
  const packActive = c.packActive ?? false;
  const resolved = resolveCommunityYardTheme(
    c.id,
    packActive,
    c.purchaseCount ?? 0,
  );
  return {
    id: c.id,
    name: c.name,
    school: c.school,
    location: c.location,
    members: c.members,
    posts: Math.floor(c.members * 0.5),
    color: resolved?.gradient ?? c.color,
    mascot: resolved?.mascot,
    tagline: resolved?.tagline ?? c.description,
    packActive,
    skinTier: resolved?.skinTier ?? "preview",
    control: c.control ?? getYardTheme(c.id)?.control,
  };
}

export default function CommunitiesPage() {
  const { data: tauriData } = useTauriGetCommunities();
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const [control, setControl] = useState<"all" | HbcuControl>("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const homeYard = loadUiPrefs().homeYardId;
  const homeTheme = homeYard ? getYardTheme(homeYard) : null;
  const stats = catalogStats();

  const tauriMapped =
    isTauri() && Array.isArray(tauriData) && tauriData.length > 0
      ? tauriData.map(mapCommunity)
      : null;

  const catalogRows = useMemo(() => {
    // Prefer DB-backed communities (all 103 + live member counts) when Tauri
    if (tauriMapped) {
      let list = tauriMapped;
      if (state !== "all") {
        list = list.filter((c) => {
          const loc = c.location || "";
          return loc.endsWith(`, ${state}`) || loc.includes(`, ${state}`);
        });
      }
      if (control !== "all") {
        list = list.filter((c) => c.control === control);
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        list = list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.school.toLowerCase().includes(q) ||
            c.location.toLowerCase().includes(q) ||
            c.id.includes(q),
        );
      }
      if (featuredOnly) {
        list = list.filter((c) => isFeaturedYardId(c.id));
      }
      return [...list].sort((a, b) => {
        if (a.id === homeYard) return -1;
        if (b.id === homeYard) return 1;
        return a.school.localeCompare(b.school);
      });
    }

    // Web / empty DB fallback: static TS catalog
    let list = searchHbcus(query, {
      state: state === "all" ? undefined : state,
      control,
    });
    if (featuredOnly) {
      list = list.filter((h) => isFeaturedYardId(h.id));
    }
    list = [...list].sort((a, b) => {
      if (a.id === homeYard) return -1;
      if (b.id === homeYard) return 1;
      return a.school.localeCompare(b.school);
    });
    return list.map((h) => {
      const resolved = resolveCommunityYardTheme(h.id, false, 0)!;
      return {
        id: h.id,
        name: resolved.name,
        school: h.school,
        location: `${h.city}, ${h.state}`,
        members: 0,
        posts: 0,
        color: resolved.gradient,
        mascot: resolved.mascot,
        tagline: resolved.tagline,
        packActive: false,
        skinTier: resolved.skinTier as "preview" | "live",
        control: h.control,
      };
    });
  }, [query, state, control, featuredOnly, homeYard, tauriMapped]);

  return (
    <AppShell wide hideRightRail>
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <Users className="w-7 h-7 text-primary" />
        <h1 className="text-3xl font-bold">Yards</h1>
        <Badge variant="outline" className="text-xs font-normal">
          {stats.total} campuses
        </Badge>
        {!isTauri() && <SampleBadge>Web preview</SampleBadge>}
      </div>
      <p className="text-muted-foreground text-base mb-2">
        A <strong className="text-foreground font-medium">yard</strong> is one
        campus space — HBCU, SEC, NCAA, any school. Feed, chat, events, Live.
        Your home yard is sorted first.
      </p>
      {homeTheme && homeYard && (
        <p className="text-sm mb-6">
          <span className="text-muted-foreground">You joined: </span>
          <Link
            href={`/communities/${homeYard}`}
            className="text-primary font-semibold hover:underline"
          >
            {homeTheme.school || homeTheme.name}
          </Link>
          <span className="text-muted-foreground">
            {" "}
            — open it anytime from here.
          </span>
        </p>
      )}
      {!homeTheme && <div className="mb-6" />}

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search school, city, state…"
            className="pl-9"
          />
        </div>
        <Select value={state} onValueChange={setState}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="all">All states</SelectItem>
            {HBCU_STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={control}
          onValueChange={(v) => setControl(v as "all" | HbcuControl)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Public + private</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={featuredOnly ? "default" : "outline"}
          size="sm"
          className="h-10"
          onClick={() => setFeaturedOnly((f) => !f)}
        >
          Featured
        </Button>
      </div>

      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Discord-style college yards. Casual hangouts with professional tools —
          channels for study, music, events, and networking. Showing{" "}
          {catalogRows.length} yards.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {catalogRows.map((c) => (
          <Link key={c.id} href={`/communities/${c.id}`}>
            <Card
              className={`group cursor-pointer overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                c.packActive
                  ? "border-primary/20"
                  : "border-border/60 opacity-95"
              } ${c.id === homeYard ? "ring-2 ring-primary/40" : ""}`}
            >
              <div
                className={`h-24 bg-gradient-to-br ${c.color} yard-skin-gradient ${
                  !c.packActive ? "saturate-50" : ""
                }`}
              />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {c.name}
                      {c.id === homeYard && (
                        <Badge className="text-[10px]">Home</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {c.school}
                    </CardDescription>
                  </div>
                  {c.packActive ? (
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {c.control && (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {c.control}
                    </Badge>
                  )}
                  {c.mascot && (
                    <Badge variant="secondary" className="text-[10px]">
                      {c.mascot}
                    </Badge>
                  )}
                </div>
                {c.tagline && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {c.tagline}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {c.location}
                  </span>
                  <span className="flex items-center gap-1 text-primary font-medium">
                    Enter
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {catalogRows.length === 0 && (
        <p className="text-center text-muted-foreground py-16">
          No yards match your filters.
        </p>
      )}
    </AppShell>
  );
}
