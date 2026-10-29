import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, MapPin, Settings, Code2 } from "lucide-react";
import { getCurrentHandle } from "@/lib/auth";
import { useAppGetUser } from "@/hooks/use-app-data";
import { townGradient, townLabel } from "@/lib/towns";
import { useLabUnlocked } from "@/components/lab/LabGate";

const LINKS = [
  { href: "/logosdecks", label: "LogosDecks" },
  { href: "/audio", label: "Records" },
  { href: "/weixsound", label: "WeixSound" },
  { href: "/arcade", label: "Arcade" },
  { href: "/typeverse", label: "Typeverse" },
  { href: "/connect", label: "Connect" },
  { href: "/wallet", label: "Earnings" },
];

export function YardSidebar() {
  const handle = getCurrentHandle();
  const lab = useLabUnlocked();
  const { data: user } = useAppGetUser(handle);
  const town = user?.town ?? "tsu";
  const wb = user?.weixBucks ?? 0;

  return (
    <aside className="sticky top-4">
      <Card className="overflow-hidden border-border/60">
        <div
          className={`h-8 bg-gradient-to-br yard-skin-gradient ${townGradient(town)}`}
        />
        <CardContent className="space-y-3 p-3">
          <Link href={`/profile/${handle}`}>
            <span className="flex cursor-pointer items-center gap-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {user?.displayName?.charAt(0) ??
                    handle.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {user?.displayName ?? handle}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{handle}
                </span>
              </span>
            </span>
          </Link>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{townLabel(town)}</span>
            </span>
            <Link href="/wallet">
              <Badge variant="secondary" className="gap-1 font-semibold">
                <Coins className="h-3.5 w-3.5" />
                {wb.toLocaleString()} WB
              </Badge>
            </Link>
          </div>
          <nav className="grid grid-cols-2 gap-1">
            {LINKS.map((item) => (
              <Link key={item.href} href={item.href}>
                <span className="block cursor-pointer rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>
          <Link
            href="/settings"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Link>
          {lab && (
            <div className="space-y-1 text-xs text-muted-foreground">
              <Link
                href="/architecture"
                className="flex items-center gap-2 hover:text-foreground"
              >
                <Code2 className="h-3.5 w-3.5" />
                Stack
              </Link>
              <Link
                href="/mesh-test"
                className="flex items-center gap-2 hover:text-foreground"
              >
                <Code2 className="h-3.5 w-3.5" />
                Sync test
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
