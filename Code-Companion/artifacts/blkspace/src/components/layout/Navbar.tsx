import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Moon, Sun, Bell, Search, Wallet, Menu, X } from "lucide-react";
import { useState } from "react";
import { getCurrentHandle } from "@/lib/auth";
import { isYardMod } from "@/lib/yard-mod";
import { BrandMark } from "@/components/brand/BrandMark";
import { useLabUnlocked } from "@/components/lab/LabGate";

export function Navbar() {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const lab = useLabUnlocked();

  const primary = [
    { href: "/feed", label: "Feed" },
    { href: "/audio", label: "Records" },
    { href: "/logosdecks", label: "Decks" },
  ];
  const extra = [
    { href: "/communities", label: "Yards" },
    { href: "/weixsound", label: "WeixSound" },
    { href: "/messages", label: "Messages" },
    { href: "/connect", label: "Connect" },
    { href: "/arcade", label: "Arcade" },
    { href: "/typeverse", label: "Typeverse" },
    { href: "/hub", label: "Hub" },
    { href: "/ide", label: "Homework" },
    { href: "/blkshi", label: "BLKSHI" },
    { href: "/focus", label: "Focus" },
    { href: "/faculty", label: "Faculty" },
    { href: "/media", label: "Media" },
    ...(isYardMod(getCurrentHandle()) ? [{ href: "/mod", label: "Mod" }] : []),
    ...(lab
      ? [
          { href: "/relays", label: "Network" },
          { href: "/mesh-test", label: "Sync Test" },
          { href: "/architecture", label: "Stack" },
        ]
      : []),
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/">
          <BrandMark className="cursor-pointer" size="md" />
        </Link>

        <div className="hidden md:flex gap-5 items-center">
          {primary.map((item) => (
            <Link key={item.href} href={item.href}>
              <span
                className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location === item.href ? "text-primary" : "text-muted-foreground"}`}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
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
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" />
            </Button>
          </Link>
          <Link href="/wallet">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Wallet className="h-5 w-5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Link
            href={`/profile/${getCurrentHandle()}`}
            className="hidden md:block"
          >
            <Button variant="outline" size="sm">
              Profile
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="More"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t bg-background p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[...primary, ...extra].map((item) => (
              <Link key={item.href} href={item.href}>
                <span
                  className={`block rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location === item.href ? "text-primary" : "text-muted-foreground"}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
          <Link href={`/profile/${getCurrentHandle()}`}>
            <Button variant="outline" size="sm" className="w-full mt-2">
              Profile
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
}
