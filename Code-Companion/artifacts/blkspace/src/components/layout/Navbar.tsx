import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Moon, Sun, Bell, Search, Users, Wallet, Menu, X } from "lucide-react";
import { useState } from "react";
import { getCurrentHandle } from "@/lib/auth";
import { BRAND } from "@/lib/brand";

export function Navbar() {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/feed", label: "Feed" },
    { href: "/media", label: "Media" },
    { href: "/communities", label: "Communities" },
    { href: "/relays", label: "Network" },
    { href: "/mesh-test", label: "Sync Test" },
    { href: "/architecture", label: "Stack" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/">
          <span className="font-sans font-bold text-2xl tracking-tighter text-primary cursor-pointer">
            {BRAND.name}
          </span>
        </Link>

        <div className="hidden md:flex gap-6 items-center">
          {navItems.map((item) => (
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
            className="md:hidden rounded-full"
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
        <div className="md:hidden border-t bg-background p-4 space-y-3">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <span
                className={`block text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location === item.href ? "text-primary" : "text-muted-foreground"}`}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </span>
            </Link>
          ))}
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
