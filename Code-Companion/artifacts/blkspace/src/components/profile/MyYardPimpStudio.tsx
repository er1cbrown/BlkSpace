import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { MyYardAesthetic } from "@/lib/myyard-layout";
import { MAX_CSS_LEN } from "@/lib/myyard-layout";
import {
  MYYARD_BANNER_MOTION,
  MYYARD_CSS_HOOKS,
  MYYARD_CSS_SNIPPETS,
  MYYARD_CURSORS,
  MYYARD_FX,
  MYYARD_PIMP_PACKS,
  MYYARD_TEXT_FX,
  appendSnippet,
  applyPimpPack,
} from "@/lib/myyard-pimp";
import { cn } from "@/lib/utils";

/**
 * Advanced look studio. Does not play audio — Music tab owns the song.
 */
export function MyYardPimpStudio({
  aesthetic,
  onPatch,
}: {
  aesthetic: MyYardAesthetic;
  onPatch: (p: Partial<MyYardAesthetic>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium">Pimp packs</Label>
        <p className="text-xs text-muted-foreground mb-2">
          One-click skins that actually land on visitors — FX, cursor, type, and
          starter CSS. Replaces your CSS field. Music is still the Music tab.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MYYARD_PIMP_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              className={cn(
                "rounded-xl border p-3 text-left hover:border-primary/50",
                aesthetic.pimpPackId === pack.id &&
                  "border-primary ring-1 ring-primary/40",
              )}
              onClick={() => {
                onPatch(applyPimpPack(aesthetic, pack));
                toast.success(`${pack.label} on — Save MyYard`);
              }}
            >
              <p className="text-sm font-medium">{pack.label}</p>
              <p className="text-[11px] text-muted-foreground">{pack.blurb}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Page FX</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {MYYARD_FX.map((fx) => (
            <Button
              key={fx.id}
              type="button"
              size="sm"
              variant={aesthetic.fx === fx.id ? "default" : "outline"}
              onClick={() => onPatch({ fx: fx.id })}
            >
              {fx.label}
            </Button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Built-in overlays. No remote glitter GIFs (those get stripped).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Cursor</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {MYYARD_CURSORS.map((c) => (
              <Button
                key={c.id}
                type="button"
                size="sm"
                variant={aesthetic.cursorPack === c.id ? "default" : "outline"}
                onClick={() => onPatch({ cursorPack: c.id })}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">Name treatment</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {MYYARD_TEXT_FX.map((t) => (
              <Button
                key={t.id}
                type="button"
                size="sm"
                variant={aesthetic.textFx === t.id ? "default" : "outline"}
                onClick={() => onPatch({ textFx: t.id })}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Banner motion</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {MYYARD_BANNER_MOTION.map((m) => (
            <Button
              key={m.id}
              type="button"
              size="sm"
              variant={aesthetic.bannerMotion === m.id ? "default" : "outline"}
              onClick={() => onPatch({ bannerMotion: m.id })}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border p-3">
        <div>
          <p className="text-sm font-medium">Mood ticker</p>
          <p className="text-xs text-muted-foreground">
            Marquee the status line. Honors reduced-motion.
          </p>
        </div>
        <Switch
          checked={!!aesthetic.marqueeMood}
          onCheckedChange={(v) => onPatch({ marqueeMood: v })}
        />
      </div>

      <div>
        <Label className="text-sm font-medium">CSS snippets</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Appends to your CSS. Hooks:{" "}
          {MYYARD_CSS_HOOKS.map((h) => (
            <code key={h} className="text-[10px] mr-1">
              {h}
            </code>
          ))}
        </p>
        <div className="flex flex-wrap gap-2">
          {MYYARD_CSS_SNIPPETS.map((snip) => (
            <Button
              key={snip.id}
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                onPatch({ customCss: appendSnippet(aesthetic.customCss, snip) });
                toast.success(`${snip.label} added`);
              }}
            >
              {snip.label}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        CSS budget {MAX_CSS_LEN.toLocaleString()} chars. Remote{" "}
        <code className="text-[10px]">url(https://…)</code> and{" "}
        <code className="text-[10px]">@import</code> are stripped so a profile
        cannot phone home. Use packs + snippets, then LazyVim if you already
        have nvim.
      </p>
    </div>
  );
}
