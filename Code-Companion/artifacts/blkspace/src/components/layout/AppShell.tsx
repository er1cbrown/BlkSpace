import { Link, useLocation } from "wouter";
import { ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import {
  Home,
  Clapperboard,
  Users,
  Wallet,
  User,
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  ArrowRight,
  Handshake,
  MessageCircle,
  Layers,
  HeartPulse,
  Building2,
  MoreHorizontal,
  Settings,
  Trophy,
  Joystick,
  TerminalSquare,
} from "lucide-react";
import { getCurrentHandle } from "@/lib/auth";
import { useAppGetUser } from "@/hooks/use-app-data";
import { useGuestMode } from "@/lib/guest-mode";
import { YardSidebar } from "@/components/layout/YardSidebar";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/BrandMark";
import { isTauriRuntime, loadUiPrefs, saveUiPrefs } from "@/lib/ui-prefs";
import { getYardTheme } from "@/lib/yard-themes";
import { applyUiPrefsToDocument } from "@/lib/ui-prefs";

interface AppShellProps {
  children: ReactNode;
  hideRightRail?: boolean;
  wide?: boolean;
  fullWidth?: boolean;
}

/** Student core — everyday destinations (Connect = ProjectConnect). */
const PRIMARY_NAV = [
  { href: "/feed", label: "Home", sub: "Your feed", icon: Home },
  { href: "/communities", label: "Yards", sub: "Campuses", icon: Users },
  {
    href: "/connect",
    label: "Connect",
    sub: "ProjectConnect",
    icon: Handshake,
  },
  { href: "/create", label: "Create", sub: "New post", icon: Clapperboard },
  {
    href: "/messages",
    label: "Messages",
    sub: "Your conversations",
    icon: MessageCircle,
  },
] as const;

const MOBILE_NAV = [
  { href: "/feed", label: "Home", icon: Home },
  { href: "/communities", label: "Yards", icon: Users },
  { href: "/connect", label: "Connect", icon: Handshake },
  { href: "/create", label: "Create", icon: Plus, accent: true },
  { href: "/profile", label: "You", icon: User, profile: true },
] as const;

function NavItem({
  href,
  label,
  sub,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  sub?: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link href={href}>
      <span
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
        title={sub}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex flex-col min-w-0">
          <span>{label}</span>
          {sub ? (
            <span
              className={cn(
                "text-[10px] font-normal leading-tight truncate",
                active ? "text-primary/70" : "text-muted-foreground/80",
              )}
            >
              {sub}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}

export function AppShell({
  children,
  hideRightRail = false,
  wide = false,
  fullWidth = false,
}: AppShellProps) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { isGuest } = useGuestMode();
  const handle = getCurrentHandle();
  const [shellReady, setShellReady] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShellReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const { data: user } = useAppGetUser(handle, shellReady);
  const profileHref = `/profile/${handle}`;

  const [uiPrefs, setUiPrefs] = useState(() => loadUiPrefs());
  useEffect(() => {
    const sync = () => setUiPrefs(loadUiPrefs());
    window.addEventListener("blkspace-ui-prefs", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("blkspace-ui-prefs", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Home-yard shell skin — re-apply accent when yard or prefs change
  useEffect(() => {
    const yardId = user?.town || uiPrefs.homeYardId;
    applyUiPrefsToDocument({
      ...uiPrefs,
      homeYardId: yardId || uiPrefs.homeYardId,
    });
    document.documentElement.dataset.homeYard = yardId || "";
  }, [user?.town, uiPrefs]);

  const primaryNav = isGuest
    ? PRIMARY_NAV.filter((item) => item.href !== "/create")
    : [...PRIMARY_NAV];

  // Connect is primary nav; More holds secondary destinations
  const moreItems = [
    { href: "/messages", label: "Messages", icon: MessageCircle, show: true },
    { href: "/hub", label: "Hub", icon: Layers, show: true },
    { href: "/arcade", label: "Arcade", icon: Joystick, show: true },
    {
      href: "/focus",
      label: "Focus",
      icon: HeartPulse,
      show: uiPrefs.showFocusNav,
    },
    {
      href: "/faculty",
      label: "Faculty",
      icon: Building2,
      show: !isGuest && uiPrefs.showFacultyNav,
    },
    { href: "/wallet", label: "Earnings", icon: Wallet, show: !isGuest },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy, show: true },
    { href: "/settings", label: "Settings", icon: Settings, show: !isGuest },
  ].filter((i) => i.show);

  const mobileNav = isGuest
    ? MOBILE_NAV.filter((item) => item.href !== "/create")
    : MOBILE_NAV;

  const moreActive = moreItems.some(
    (i) => location === i.href || location.startsWith(`${i.href}/`),
  );

  const isActive = (href: string) => {
    if (href === "/feed")
      return location === "/feed" || location.startsWith("/posts/");
    if (href === "/profile") return location.startsWith("/profile/");
    return location === href || location.startsWith(`${href}/`);
  };

  const homeYard = user?.town || uiPrefs.homeYardId;
  const yardTheme = homeYard ? getYardTheme(homeYard) : null;

  return (
    <div className="min-h-screen bg-background yard-shell">
      {/* Subtle home-yard top accent */}
      {yardTheme && (
        <div
          className={cn(
            "h-1 w-full bg-gradient-to-r yard-skin-gradient",
            yardTheme.gradient,
          )}
          aria-hidden
        />
      )}

      <header className="md:hidden sticky top-0 z-40 border-b bg-background/95 backdrop-blur px-4 h-14 flex items-center justify-between">
        <Link href="/feed">
          <BrandMark size="sm" />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/search">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Search className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/notifications">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full relative"
            >
              <Bell className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1280px] justify-center gap-0 lg:gap-6 px-0 md:px-4">
        <aside className="hidden md:flex w-[240px] shrink-0 flex-col py-4 pr-2">
          <Link href="/feed" className="mb-6 px-3">
            <BrandMark size="md" />
          </Link>
          {yardTheme && (
            <Link href={`/communities/${homeYard}`}>
              <p className="px-3 mb-3 text-[11px] text-muted-foreground truncate hover:text-primary cursor-pointer">
                <span className="font-medium text-foreground/80">
                  Your campus ·{" "}
                </span>
                {yardTheme.school || yardTheme.name}
                {yardTheme.mascot ? ` · ${yardTheme.mascot}` : ""}
              </p>
            </Link>
          )}

          <nav className="space-y-1 flex-1">
            {primaryNav.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
            <NavItem
              href={isGuest ? "/welcome" : profileHref}
              label="You"
              sub="Profile"
              icon={User}
              active={isActive("/profile")}
            />

            {/* More — secondary destinations (hide jargon until opened) */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  moreActive || moreOpen
                    ? "bg-muted/80 text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <MoreHorizontal className="h-5 w-5 shrink-0" />
                <span className="flex flex-col items-start min-w-0">
                  <span>More</span>
                  <span className="text-[10px] font-normal text-muted-foreground/80">
                    Earnings, settings…
                  </span>
                </span>
              </button>
              {moreOpen && (
                <div className="mt-1 ml-2 pl-2 border-l border-border/50 space-y-0.5">
                  {moreItems.map((item) => (
                    <NavItem
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={isActive(item.href)}
                    />
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="space-y-2 pt-4 border-t border-border/60">
            <Link href="/search">
              <span className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer">
                <Search className="h-5 w-5" />
                Search
              </span>
            </Link>
            <Link href="/notifications">
              <span className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer">
                <Bell className="h-5 w-5" />
                Notifications
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            >
              <Sun className="h-5 w-5 rotate-0 dark:hidden" />
              <Moon className="h-5 w-5 hidden dark:block" />
              Theme
            </button>
            {isTauriRuntime() && (
              <button
                type="button"
                onClick={() => {
                  const next =
                    uiPrefs.chromeSkin === "terminal" ? "default" : "terminal";
                  const prefs = { ...uiPrefs, chromeSkin: next as const };
                  if (next === "terminal") setTheme("dark");
                  saveUiPrefs(prefs);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-muted/60 hover:text-foreground",
                  uiPrefs.chromeSkin === "terminal"
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground",
                )}
              >
                <TerminalSquare className="h-5 w-5" />
                Terminal
              </button>
            )}
          </div>

          {isGuest ? (
            <div className="mt-4 space-y-2">
              <Link href="/welcome">
                <span className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer">
                  Join free
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
              <Link href="/login">
                <span className="flex items-center justify-center rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer">
                  Sign in
                </span>
              </Link>
            </div>
          ) : (
            <Link href={profileHref} className="mt-4">
              <div className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                <Avatar className="h-10 w-10 border border-primary/20">
                  <AvatarImage src={user?.avatarUrl} />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {user?.displayName?.charAt(0) ??
                      handle.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {user?.displayName ?? handle}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{handle}
                  </p>
                </div>
                {user && (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {user.weixBucks} WB
                  </Badge>
                )}
              </div>
            </Link>
          )}
        </aside>

        <main
          className={cn(
            "flex-1 min-w-0 border-x border-border/40 min-h-screen pb-20 md:pb-6",
            uiPrefs.chromeSkin === "terminal" && "md:pb-10",
            fullWidth ? "max-w-5xl" : wide ? "max-w-3xl" : "max-w-[640px]",
          )}
        >
          <div className="px-4 py-4 md:py-6">{children}</div>
        </main>

        {!hideRightRail && (
          <aside className="hidden lg:block w-[280px] xl:w-[320px] shrink-0 py-6 pl-2">
            <YardSidebar />
          </aside>
        )}
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur safe-area-pb">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
          {mobileNav.map((item) => {
            const href =
              "profile" in item && item.profile
                ? isGuest
                  ? "/welcome"
                  : profileHref
                : item.href;
            const active = isActive(
              "profile" in item && item.profile ? "/profile" : item.href,
            );
            const Icon = item.icon;
            if ("accent" in item && item.accent) {
              const accentHref = isGuest ? "/welcome" : "/create";
              return (
                <Link key={item.label} href={accentHref}>
                  <span className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg -mt-4">
                    <Icon className="h-6 w-6" />
                  </span>
                </Link>
              );
            }
            return (
              <Link key={item.label} href={href}>
                <span
                  className={cn(
                    "flex flex-col items-center gap-0.5 text-xs font-medium px-2 min-w-[3.5rem]",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {isGuest && "profile" in item && item.profile
                    ? "Join"
                    : item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {isTauriRuntime() && uiPrefs.chromeSkin === "terminal" && (
        <div
          className="fixed inset-x-0 bottom-16 md:bottom-0 z-[60] flex h-6 items-center gap-3 border-t border-border bg-[#1a1b26] px-3 font-mono text-[11px] text-[#c0caf5]"
          role="status"
        >
          <span className="bg-[#7aa2f7] px-2 font-semibold text-[#1a1b26]">
            NORMAL
          </span>
          <span className="text-[#7aa2f7]">blkspace</span>
          <span className="text-[#565f89]">·</span>
          <span className="truncate text-[#9ece6a]">
            {isGuest ? "guest" : `@${handle}`}
          </span>
          <span className="ml-auto truncate text-[#565f89]">
            {yardTheme?.school || uiPrefs.homeYardId} · terminal
          </span>
        </div>
      )}
    </div>
  );
}
