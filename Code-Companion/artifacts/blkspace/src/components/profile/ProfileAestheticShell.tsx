import { useEffect, useMemo, type ReactNode, type CSSProperties } from "react";
import {
  getBannerCss,
  patternStyle,
  sanitizeCustomCss,
  type MyYardAesthetic,
  type FontStyleId,
  type CardRadiusId,
} from "@/lib/myyard-layout";
import { cn } from "@/lib/utils";

const FONT_MAP: Record<FontStyleId, string> = {
  system: "inherit",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  display: "'Segoe UI', system-ui, sans-serif",
};

const RADIUS_MAP: Record<CardRadiusId, string> = {
  sharp: "0.5rem",
  soft: "1.25rem",
  round: "1.75rem",
};

interface Props {
  aesthetic: MyYardAesthetic;
  /** Extra theme class from classic/pro/vibrant/myspace */
  themeClassName?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a public profile so visitors see the owner's customization.
 * Custom CSS is scoped under `.myyard-root[data-myyard]`.
 */
export function ProfileAestheticShell({
  aesthetic,
  themeClassName,
  children,
  className,
}: Props) {
  const cssId = "myyard-user-css";
  const safeCss = useMemo(
    () => sanitizeCustomCss(aesthetic.customCss || ""),
    [aesthetic.customCss],
  );

  useEffect(() => {
    let el = document.getElementById(cssId) as HTMLStyleElement | null;
    if (!safeCss.trim()) {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement("style");
      el.id = cssId;
      document.head.appendChild(el);
    }
    // Scope all rules under .myyard-root when possible (user may write bare selectors)
    el.textContent = `.myyard-root[data-myyard] {\n${safeCss}\n}`;
    return () => {
      /* keep until next profile unmounts / css clears */
    };
  }, [safeCss]);

  useEffect(() => {
    return () => {
      document.getElementById(cssId)?.remove();
    };
  }, []);

  const bannerBg = getBannerCss(aesthetic);
  const radius = RADIUS_MAP[aesthetic.cardRadius] || RADIUS_MAP.soft;
  const rootStyle: CSSProperties = {
    ["--myyard-accent" as string]: aesthetic.accent,
    ["--myyard-radius" as string]: radius,
    fontFamily: FONT_MAP[aesthetic.fontStyle] || FONT_MAP.system,
    borderRadius: radius,
    borderColor: aesthetic.accent + "55",
  };

  const bannerStyle: CSSProperties = {
    background: bannerBg.startsWith("linear") || bannerBg.startsWith("center")
      ? bannerBg
      : bannerBg,
    backgroundColor: aesthetic.bannerMode === "solid" ? aesthetic.bannerSolid : undefined,
  };

  const pattern = patternStyle(aesthetic.bgPattern);

  return (
    <div
      data-myyard
      className={cn(
        "myyard-root overflow-hidden shadow-xl border mb-8 transition-all relative",
        themeClassName,
        className,
      )}
      style={rootStyle}
    >
      {/* Pattern overlay on body area only via children padding context */}
      {aesthetic.bgPattern !== "none" && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] text-foreground z-0"
          style={pattern}
          aria-hidden
        />
      )}
      <div className="relative z-10">{children}</div>
      {/* Expose banner style via CSS var for header children */}
      <style>{`
        .myyard-root[data-myyard] .myyard-banner {
          background: ${bannerBg.startsWith("linear") || bannerBg.includes("url(") ? bannerBg : "none"};
          ${aesthetic.bannerMode === "solid" ? `background-color: ${aesthetic.bannerSolid};` : ""}
        }
        .myyard-root[data-myyard] .myyard-accent-text { color: ${aesthetic.accent}; }
        .myyard-root[data-myyard] .myyard-accent-border { border-color: ${aesthetic.accent}; }
        .myyard-root[data-myyard] .myyard-accent-bg { background-color: ${aesthetic.accent}; }
      `}</style>
      {/* hidden data for bannerStyle consumers that use class myyard-banner */}
      <span className="hidden" data-banner={JSON.stringify(bannerStyle)} />
    </div>
  );
}

export function MyYardBanner({
  aesthetic,
  children,
  className,
}: {
  aesthetic: MyYardAesthetic;
  children?: ReactNode;
  className?: string;
}) {
  const bg = getBannerCss(aesthetic);
  const style: CSSProperties =
    aesthetic.bannerMode === "solid"
      ? { backgroundColor: aesthetic.bannerSolid }
      : aesthetic.bannerMode === "image" && aesthetic.bannerImageDataUrl
        ? {
            backgroundImage: `url(${aesthetic.bannerImageDataUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }
        : { backgroundImage: bg, backgroundSize: "cover" };

  return (
    <div
      className={cn(
        "myyard-banner h-40 md:h-48 relative",
        aesthetic.glassHeader && "after:absolute after:inset-0 after:bg-black/10",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
