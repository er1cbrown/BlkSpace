import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BANNER_GRADIENTS,
  DEFAULT_AESTHETIC,
  MAX_CSS_LEN,
  MAX_PLAYLIST,
  mergeMyYardLayout,
  normalizeTape,
  tapeIsPlaylist,
  type MyYardAesthetic,
  type MyYardLayout,
  type BgPatternId,
  type FontStyleId,
  type CardRadiusId,
} from "@/lib/myyard-layout";
import { MYARD_PROFILE_THEMES } from "@/lib/myyard-catalog";
import { MYYARD_PAGE_TEMPLATES } from "@/lib/myyard-page-templates";
import type { TauriBlobInfo } from "@/lib/tauri-api";
import { isTauri, tauriOpenMyYardCss } from "@/lib/tauri-api";
import {
  ImagePlus,
  Music,
  Palette,
  Sparkles,
  Type,
  Code2,
  Layout,
  Disc3,
  BookOpen,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentHandle } from "@/lib/auth";
import {
  MAX_WEB_TAPE,
  appendWebProfileTrack,
  clearWebProfileMusic,
} from "@/lib/profile-music-web";
import { toast } from "sonner";
import { MyYardLazyVimGuide } from "@/components/profile/MyYardLazyVimGuide";
import { MyYardPimpStudio } from "@/components/profile/MyYardPimpStudio";
import {
  cssForLazyVimOpen,
  MYYARD_LAZYVIM_STARTER_CSS,
} from "@/lib/myyard-lazyvim-lesson";

type ThemeKey = "classic" | "pro" | "vibrant" | "myspace";

interface Props {
  layout: MyYardLayout;
  profileTheme: ThemeKey;
  profileSong: string | null;
  audioBlobs: TauriBlobInfo[];
  imageBlobs: TauriBlobInfo[];
  saving?: boolean;
  onSave: (next: {
    layout: MyYardLayout;
    theme: ThemeKey;
    musicHash: string | null;
  }) => void;
}

const PATTERNS: { id: BgPatternId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "dots", label: "Dots" },
  { id: "grid", label: "Grid" },
  { id: "stars", label: "Stars" },
  { id: "waves", label: "Waves" },
];

const FONTS: { id: FontStyleId; label: string }[] = [
  { id: "system", label: "Clean" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Mono" },
  { id: "display", label: "Bold UI" },
];

const RADII: { id: CardRadiusId; label: string }[] = [
  { id: "sharp", label: "Sharp" },
  { id: "soft", label: "Soft" },
  { id: "round", label: "Round" },
];

/**
 * Streamlined MySpace-style customization hub.
 * Look · Photos · Music · Type · Advanced CSS · Modules
 */
export function CustomizeStation({
  layout,
  profileTheme,
  profileSong,
  audioBlobs,
  imageBlobs,
  saving,
  onSave,
}: Props) {
  const [theme, setTheme] = useState<ThemeKey>(profileTheme);
  const [a, setA] = useState<MyYardAesthetic>(() => {
    const base = { ...DEFAULT_AESTHETIC, ...(layout.aesthetic || {}) };
    return {
      ...base,
      playlistHashes: normalizeTape(base.playlistHashes, profileSong),
    };
  });
  const [music, setMusic] = useState<string | null>(
    () => normalizeTape(layout.aesthetic?.playlistHashes, profileSong)[0] ?? profileSong,
  );
  const [modules, setModules] = useState(
    () => layout.modules || { logosDeck: false, bibleNlp: false },
  );
  const [section, setSection] = useState("look");

  const draftLayout: MyYardLayout = useMemo(
    () =>
      mergeMyYardLayout(layout, {
        aesthetic: a,
        modules,
      }),
    [layout, a, modules],
  );

  const patchA = (p: Partial<MyYardAesthetic>) =>
    setA((prev) => ({ ...prev, ...p }));

  const setTape = (next: string[]) => {
    const n = normalizeTape(next);
    patchA({ playlistHashes: n });
    setMusic(n[0] || null);
  };

  const tape = normalizeTape(a.playlistHashes, music);
  const hasPlaylist = tapeIsPlaylist(tape);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const addGalleryFromFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (a.galleryHashes.length + Object.keys(a.galleryDataUrls).length >= 8)
      return;
    const dataUrl = await readFileAsDataUrl(file);
    const id = `web_${Date.now()}_${file.name.slice(0, 12)}`;
    patchA({
      galleryDataUrls: { ...a.galleryDataUrls, [id]: dataUrl },
      galleryHashes: [...a.galleryHashes, id].slice(0, 8),
    });
  };

  const addBannerFromFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await readFileAsDataUrl(file);
    patchA({
      bannerMode: "image",
      bannerImageDataUrl: dataUrl,
      bannerImageHash: null,
    });
  };

  const save = () => {
    const hashes = normalizeTape(a.playlistHashes, music);
    onSave({
      layout: mergeMyYardLayout(draftLayout, {
        aesthetic: { ...a, playlistHashes: hashes },
      }),
      theme,
      musicHash: hashes[0] || null,
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/25 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Customize station
          </CardTitle>
          <CardDescription>
            Make your page yours — banner, photos, music, fonts, and a real
            pimp-out (FX + CSS). Visitors see this on your public MyYard, not
            the whole campus yard. Song stays on the Music tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving} className="rounded-full">
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving…" : "Save MyYard"}
          </Button>
          <p className="text-[11px] text-muted-foreground self-center">
            {isTauri()
              ? "Saves to your account on this device"
              : "Saves in this browser (web preview)"}
          </p>
        </CardContent>
      </Card>

      <Tabs value={section} onValueChange={setSection}>
        <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1">
          <TabsTrigger value="look" className="gap-1">
            <Palette className="h-3.5 w-3.5" /> Look
          </TabsTrigger>
          <TabsTrigger value="photos" className="gap-1">
            <ImagePlus className="h-3.5 w-3.5" /> Photos
          </TabsTrigger>
          <TabsTrigger value="music" className="gap-1">
            <Music className="h-3.5 w-3.5" /> Music
          </TabsTrigger>
          <TabsTrigger value="type" className="gap-1">
            <Type className="h-3.5 w-3.5" /> About
          </TabsTrigger>
          <TabsTrigger value="css" className="gap-1">
            <Code2 className="h-3.5 w-3.5" /> Pimp / CSS
          </TabsTrigger>
          <TabsTrigger value="modules" className="gap-1">
            <Layout className="h-3.5 w-3.5" /> Extra
          </TabsTrigger>
        </TabsList>

        <TabsContent value="look" className="space-y-4 mt-4">
          <div>
            <Label className="text-sm font-medium">Page template</Label>
            <p className="text-xs text-muted-foreground mb-2">
              React templates — Myspace diversity without writing CSS first.
              Visual / audio nuance can stack on later.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {MYYARD_PAGE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className="rounded-xl border p-3 text-left hover:border-primary/50"
                  onClick={() => {
                    setTheme(tpl.theme);
                    patchA(tpl.aesthetic);
                    toast.success(`${tpl.label} applied — Save MyYard`);
                  }}
                >
                  <p className="text-sm font-medium">{tpl.label}</p>
                  <p className="text-[11px] text-muted-foreground">{tpl.blurb}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Base theme</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Starting skin — then layer your colors & banner.
            </p>
            <div className="flex flex-wrap gap-2">
              {MYARD_PROFILE_THEMES.map((t) => (
                <Button
                  key={t.id}
                  size="sm"
                  variant={theme === t.id ? "default" : "outline"}
                  onClick={() => setTheme(t.id as ThemeKey)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Banner</Label>
            <div className="flex flex-wrap gap-2 mt-2 mb-2">
              {(
                [
                  ["gradient", "Gradient"],
                  ["solid", "Solid"],
                  ["image", "Photo"],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  size="sm"
                  variant={a.bannerMode === id ? "default" : "outline"}
                  onClick={() => patchA({ bannerMode: id })}
                >
                  {label}
                </Button>
              ))}
            </div>
            {a.bannerMode === "gradient" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BANNER_GRADIENTS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => patchA({ bannerGradientId: g.id })}
                    className={cn(
                      "h-14 rounded-xl border-2 text-[10px] font-medium text-white drop-shadow",
                      a.bannerGradientId === g.id
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-transparent",
                    )}
                    style={{ backgroundImage: g.css }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}
            {a.bannerMode === "solid" && (
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={a.bannerSolid}
                  onChange={(e) => patchA({ bannerSolid: e.target.value })}
                  className="w-14 h-10 p-1"
                />
                <Input
                  value={a.bannerSolid}
                  onChange={(e) => patchA({ bannerSolid: e.target.value })}
                  className="font-mono text-sm max-w-[8rem]"
                />
              </div>
            )}
            {a.bannerMode === "image" && (
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void addBannerFromFile(f);
                  }}
                />
                {imageBlobs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {imageBlobs.slice(0, 12).map((b) => (
                      <Button
                        key={b.hash}
                        size="sm"
                        variant={
                          a.bannerImageHash === b.hash ? "default" : "outline"
                        }
                        onClick={() =>
                          patchA({
                            bannerImageHash: b.hash,
                            bannerImageDataUrl: null,
                          })
                        }
                      >
                        {b.filename}
                      </Button>
                    ))}
                  </div>
                )}
                {a.bannerImageDataUrl && (
                  <img
                    src={a.bannerImageDataUrl}
                    alt="Banner preview"
                    className="h-24 w-full object-cover rounded-xl border"
                  />
                )}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Accent color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={a.accent}
                  onChange={(e) => patchA({ accent: e.target.value })}
                  className="w-14 h-10 p-1"
                />
                <Input
                  value={a.accent}
                  onChange={(e) => patchA({ accent: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>
            <div>
              <Label>Background pattern</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {PATTERNS.map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant={a.bgPattern === p.id ? "default" : "outline"}
                    onClick={() => patchA({ bgPattern: p.id })}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Font</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {FONTS.map((f) => (
                  <Button
                    key={f.id}
                    size="sm"
                    variant={a.fontStyle === f.id ? "default" : "outline"}
                    onClick={() => patchA({ fontStyle: f.id })}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Corners</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {RADII.map((r) => (
                  <Button
                    key={r.id}
                    size="sm"
                    variant={a.cardRadius === r.id ? "default" : "outline"}
                    onClick={() => patchA({ cardRadius: r.id })}
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Glass banner overlay</p>
              <p className="text-xs text-muted-foreground">
                Soft dark veil for readable text on bright banners
              </p>
            </div>
            <Switch
              checked={a.glassHeader}
              onCheckedChange={(v) => patchA({ glassHeader: v })}
            />
          </div>
        </TabsContent>

        <TabsContent value="photos" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Show photo gallery</p>
              <p className="text-xs text-muted-foreground">
                Up to 8 featured pics on your public page
              </p>
            </div>
            <Switch
              checked={a.showGallery}
              onCheckedChange={(v) => patchA({ showGallery: v })}
            />
          </div>
          <div>
            <Label>Upload photos</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              className="mt-1"
              onChange={(e) => {
                const files = e.target.files;
                if (!files) return;
                void (async () => {
                  for (const f of Array.from(files)) {
                    await addGalleryFromFile(f);
                  }
                })();
              }}
            />
          </div>
          {imageBlobs.length > 0 && (
            <div>
              <Label className="text-xs">From your uploads</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {imageBlobs.map((b) => {
                  const on = a.galleryHashes.includes(b.hash);
                  return (
                    <Button
                      key={b.hash}
                      size="sm"
                      variant={on ? "default" : "outline"}
                      onClick={() => {
                        const next = on
                          ? a.galleryHashes.filter((h) => h !== b.hash)
                          : [...a.galleryHashes, b.hash].slice(0, 8);
                        patchA({ galleryHashes: next });
                      }}
                    >
                      {on ? "✓ " : "+ "}
                      {b.filename}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            {a.galleryHashes.map((h) => (
              <div
                key={h}
                className="relative aspect-square rounded-lg border overflow-hidden bg-muted"
              >
                {a.galleryDataUrls[h] ? (
                  <img
                    src={a.galleryDataUrls[h]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[9px] p-1 break-all text-muted-foreground">
                    {h.slice(0, 10)}
                  </span>
                )}
                <button
                  type="button"
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white text-[10px] px-1 rounded"
                  onClick={() =>
                    patchA({
                      galleryHashes: a.galleryHashes.filter((x) => x !== h),
                      galleryDataUrls: Object.fromEntries(
                        Object.entries(a.galleryDataUrls).filter(
                          ([k]) => k !== h,
                        ),
                      ),
                    })
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="music" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">
                {hasPlaylist ? "Profile tape" : "Profile song on page"}
              </p>
              <p className="text-xs text-muted-foreground">
                One track = a single song (play, pause, volume). Add a second
                track to run skip / playlist. LazyVim does not play audio.
              </p>
            </div>
            <Switch
              checked={a.showMusic}
              onCheckedChange={(v) => patchA({ showMusic: v })}
            />
          </div>
          {!isTauri() && (
            <div className="space-y-2">
              <Label>Upload audio (web preview)</Label>
              <Input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 8 * 1024 * 1024) {
                    toast.error("Keep audio under 8 MB for browser storage");
                    return;
                  }
                  const handle = getCurrentHandle();
                  if (tape.length >= MAX_WEB_TAPE) {
                    toast.error(`Web tape max ${MAX_WEB_TAPE} tracks`);
                    return;
                  }
                  void (async () => {
                    const dataUrl = await readFileAsDataUrl(f);
                    const next = appendWebProfileTrack(handle, {
                      trackName: f.name,
                      dataUrl,
                    });
                    setTape(next.map((t) => t.id));
                    toast.success(
                      next.length > 1
                        ? `Tape: ${next.length} tracks — Save MyYard`
                        : "Profile song ready — Save MyYard",
                    );
                  })();
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                Browser storage only. Max {MAX_WEB_TAPE} tracks on web.
                Desktop hashes can hold {MAX_PLAYLIST}.
              </p>
            </div>
          )}
          {audioBlobs.length === 0 && isTauri() ? (
            <p className="text-sm text-muted-foreground">
              Upload audio from Media or Create (desktop), then tap tracks to
              build a tape.
            </p>
          ) : audioBlobs.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {audioBlobs.map((b) => {
                const on = tape.includes(b.hash);
                return (
                  <Button
                    key={b.hash}
                    size="sm"
                    variant={on ? "default" : "outline"}
                    onClick={() => {
                      if (on) setTape(tape.filter((h) => h !== b.hash));
                      else if (tape.length >= MAX_PLAYLIST) {
                        toast.error(`Tape max ${MAX_PLAYLIST} tracks`);
                      } else setTape([...tape, b.hash]);
                    }}
                  >
                    {on ? "✓ " : "+ "}
                    {b.filename}
                  </Button>
                );
              })}
            </div>
          ) : null}

          {tape.length > 0 && (
            <div className="rounded-xl border p-3 space-y-2">
              <p className="text-xs font-medium">
                {hasPlaylist
                  ? `Tape order (${tape.length}) — skip is on`
                  : "Single song — add another track to enable skip"}
              </p>
              <ol className="space-y-1">
                {tape.map((id, i) => (
                  <li
                    key={id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="tabular-nums text-muted-foreground w-4">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate">
                      {audioBlobs.find((b) => b.hash === id)?.filename ||
                        `${id.slice(0, 12)}…`}
                    </span>
                    {hasPlaylist && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          disabled={i === 0}
                          onClick={() => {
                            const n = [...tape];
                            [n[i - 1], n[i]] = [n[i], n[i - 1]];
                            setTape(n);
                          }}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          disabled={i === tape.length - 1}
                          onClick={() => {
                            const n = [...tape];
                            [n[i + 1], n[i]] = [n[i], n[i + 1]];
                            setTape(n);
                          }}
                        >
                          ↓
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => setTape(tape.filter((h) => h !== id))}
                    >
                      ×
                    </Button>
                  </li>
                ))}
              </ol>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTape([]);
                  if (!isTauri()) clearWebProfileMusic(getCurrentHandle());
                }}
              >
                Clear {hasPlaylist ? "tape" : "song"}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="type" className="space-y-4 mt-4">
          <div>
            <Label htmlFor="mood">Mood / status line</Label>
            <Input
              id="mood"
              placeholder='e.g. "Midterms · TSU · living"'
              value={a.mood}
              onChange={(e) => patchA({ mood: e.target.value.slice(0, 120) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="about">About me</Label>
            <Textarea
              id="about"
              placeholder="Who you are when someone lands on your page…"
              value={a.about}
              onChange={(e) => patchA({ about: e.target.value.slice(0, 2000) })}
              className="mt-1 min-h-[100px]"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Show Top friends</p>
              <p className="text-xs text-muted-foreground">Top 8 strip</p>
            </div>
            <Switch
              checked={a.showTopFriends}
              onCheckedChange={(v) => patchA({ showTopFriends: v })}
            />
          </div>
        </TabsContent>

        <TabsContent value="css" className="space-y-3 mt-4">
          <MyYardPimpStudio aesthetic={a} onPatch={patchA} />
          <MyYardLazyVimGuide
            onPasteStarter={() => {
              patchA({ customCss: MYYARD_LAZYVIM_STARTER_CSS });
              toast.success("Starter CSS pasted — edit or Open in LazyVim");
            }}
            canOpenLazyVim={isTauri()}
            onOpenLazyVim={() => {
              tauriOpenMyYardCss(
                getCurrentHandle() || "me",
                cssForLazyVimOpen(a.customCss),
                true,
              )
                .then((p) =>
                  toast.success(
                    `LazyVim: ${p} — i to type, Esc, :wq then Load CSS file`,
                  ),
                )
                .catch((err) =>
                  toast.error(String(err) || "Could not open LazyVim"),
                );
            }}
          />
          <p className="text-sm text-muted-foreground">
            Raw CSS paints only your profile card (
            <code className="text-xs">.myyard-root</code>). Keyframes are
            allowed. Scripts, remote <code className="text-xs">url()</code>, and{" "}
            <code className="text-xs">@import</code> are stripped.
          </p>
          <Textarea
            value={a.customCss}
            onChange={(e) => patchA({ customCss: e.target.value })}
            placeholder={`/* example */\n.myyard-name { letter-spacing: -0.04em; }\n@keyframes pulse { 50% { opacity: 0.8; } }`}
            className="font-mono text-xs min-h-[220px]"
          />
          <p className="text-[11px] text-muted-foreground">
            {a.customCss.length.toLocaleString()} / {MAX_CSS_LEN.toLocaleString()}{" "}
            chars. LazyVim is optional (needs nvim on this machine) — packs and
            snippets do not.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const blob = new Blob([a.customCss || ""], {
                  type: "text/css",
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "myyard.css";
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Save CSS file
            </Button>
            <label className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium cursor-pointer hover:bg-accent">
              Load CSS file
              <input
                type="file"
                accept=".css,text/css"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const text = await f.text();
                  patchA({ customCss: text });
                  toast.success("CSS loaded — Save MyYard");
                  e.target.value = "";
                }}
              />
            </label>
            {isTauri() && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  tauriOpenMyYardCss(
                    getCurrentHandle() || "me",
                    cssForLazyVimOpen(a.customCss),
                    true,
                  )
                    .then((p) =>
                      toast.success(
                        `LazyVim: ${p} — i, Esc, :wq then Load CSS file`,
                      ),
                    )
                    .catch((err) =>
                      toast.error(String(err) || "Could not open LazyVim"),
                    );
                }}
              >
                Open in LazyVim
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="modules" className="space-y-3 mt-4">
          <Card className="border-dashed">
            <CardContent className="pt-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Disc3 className="h-4 w-4 text-primary" /> Logos Deck
              </div>
              <Switch
                checked={!!modules.logosDeck}
                onCheckedChange={(v) =>
                  setModules((m) => ({ ...m, logosDeck: v }))
                }
              />
            </CardContent>
          </Card>
          <Card className="border-dashed">
            <CardContent className="pt-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BookOpen className="h-4 w-4 text-primary" /> Bible NLP
              </div>
              <Switch
                checked={!!modules.bibleNlp}
                onCheckedChange={(v) =>
                  setModules((m) => ({ ...m, bibleNlp: v }))
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={saving}
          size="lg"
          className="rounded-full"
        >
          <Save className="h-4 w-4 mr-1" />
          Save & publish look
        </Button>
      </div>
    </div>
  );
}
