import { Link, useLocation } from "wouter";
import { ReactNode } from "react";
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
  Compass,
} from "lucide-react";
import { getCurrentHandle } from "@/lib/auth";
import { useAppGetUser } from "@/hooks/use-app-data";
import { YardSidebar } from "@/components/layout/YardSidebar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  /** Hide right rail (e.g. full-width community chat later) */
  hideRightRail?: boolean;
  /** Wider center column */
  wide?: boolean;
  /** Full-width center for grids and community chat */
  fullWidth?: boolean;
}

const PRIMARY_NAV = [
  { href: "/feed", label: "Home", icon: Home },
  { href: "/create", label: "Create", icon: Clapperboard },
  { href: "/communities", label: "Yards", icon: Users },
  { href: "/wallet", label: "Wallet", icon: Wallet },
] as const;

const MOBILE_NAV = [
  { href: "/feed", label: "Home", icon: Home },
  { href: "/search", label: "Explore", icon: Compass },
  { href: "/create", label: "Create", icon: Plus, accent: true },
  { href: "/communities", label: "Yards", icon: Users },
  { href: "/profile", label: "Profile", icon: User, profile: true },
] as const;

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link href={href}>
      <span
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
          active
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {label}
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
  const handle = getCurrentHandle();
  const { data: user } = useAppGetUser(handle);
  const profileHref = `/profile/${handle}`;

  const isActive = (href: string) => {
    if (href === "/feed") return location === "/feed" || location.startsWith("/posts/");
    if (href === "/profile") return location.startsWith("/profile/");
    return location === href || location.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 border-b bg-background/95 backdrop-blur px-4 h-14 flex items-center justify-between">
        <Link href="/feed">
          <span className="font-serif font-bold text-xl text-primary">BlkSpace</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/search">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Search className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/notifications">
            <Button variant="ghost" size="icon" className="rounded-full relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
            </Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1280px] justify-center gap-0 lg:gap-6 px-0 md:px-4">
        {/* Left rail — desktop */}
        <aside className="hidden md:flex w-[240px] shrink-0 flex-col py-4 pr-2">
          <Link href="/feed" className="mb-6 px-3">
            <span className="font-serif font-bold text-2xl tracking-tight text-primary">
              BlkSpace
            </span>
          </Link>

          <nav className="space-y-1 flex-1">
            {PRIMARY_NAV.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                active={isActive(item.href)}
              />
            ))}
            <NavItem
              href={profileHref}
              label="Profile"
              icon={User}
              active={isActive("/profile")}
            />
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
                <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-[10px]">
                  3
                </Badge>
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
          </div>

          <Link href={profileHref} className="mt-4">
            <div className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/50 transition-colors cursor-pointer">
              <Avatar className="h-10 w-10 border border-primary/20">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                  {user?.displayName?.charAt(0) ?? handle.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">
                  {user?.displayName ?? handle}
                </p>
                <p className="text-xs text-muted-foreground truncate">@{handle}</p>
              </div>
              {user && (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {user.weixBucks} WB
                </Badge>
              )}
            </div>
          </Link>
        </aside>

        {/* Center feed */}
        <main
          className={cn(
            "flex-1 min-w-0 border-x border-border/40 min-h-screen pb-20 md:pb-6",
            fullWidth
              ? "max-w-5xl"
              : wide
                ? "max-w-3xl"
                : "max-w-[640px]",
          )}
        >
          <div className="px-4 py-4 md:py-6">{children}</div>
        </main>

        {/* Right rail — desktop xl */}
        {!hideRightRail && (
          <aside className="hidden xl:block w-[320px] shrink-0 py-6 pl-2">
            <YardSidebar />
          </aside>
        )}
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur safe-area-pb">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {MOBILE_NAV.map((item) => {
            const href =
              "profile" in item && item.profile ? profileHref : item.href;
            const active = isActive(
              "profile" in item && item.profile ? "/profile" : item.href,
            );
            const Icon = item.icon;
            if ("accent" in item && item.accent) {
              return (
                <Link key={item.label} href="/feed">
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
                    "flex flex-col items-center gap-0.5 text-[10px] font-medium px-2",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}