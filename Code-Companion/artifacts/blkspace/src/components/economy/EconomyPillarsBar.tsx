import { Link } from "wouter";
import { Award, BookOpen, Coins, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

const PILLARS = [
  {
    id: "practice",
    label: "Practice credits",
    sub: "WeixBucks",
    href: "#practice",
    icon: Coins,
  },
  {
    id: "reliability",
    label: "Reliability",
    sub: "Yard Cred",
    href: "/profile",
    icon: Award,
    profile: true,
  },
  {
    id: "literacy",
    label: "Learn markets",
    sub: "Literacy",
    href: "#literacy",
    icon: BookOpen,
  },
  {
    id: "settlement",
    label: "Settlement",
    sub: "BKSPC gated",
    href: "#settlement",
    icon: Landmark,
  },
] as const;

/**
 * Wallet IA — four pillars (docs/features/four-pillar-economy.md).
 */
export function EconomyPillarsBar({
  handle,
  active,
}: {
  handle?: string;
  active?: string;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
      {PILLARS.map((p) => {
        const Icon = p.icon;
        const href =
          "profile" in p && p.profile && handle
            ? `/profile/${handle}`
            : p.href;
        const isHash = href.startsWith("#");
        const className = cn(
          "rounded-xl border border-primary/15 bg-card/80 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5",
          active === p.id && "border-primary/50 bg-primary/10",
        );
        const body = (
          <>
            <Icon className="h-4 w-4 text-primary mb-1.5" />
            <p className="text-xs font-semibold text-foreground leading-tight">
              {p.label}
            </p>
            <p className="text-[10px] text-muted-foreground">{p.sub}</p>
          </>
        );
        if (isHash) {
          return (
            <a key={p.id} href={href} className={className}>
              {body}
            </a>
          );
        }
        return (
          <Link key={p.id} href={href} className={className}>
            {body}
          </Link>
        );
      })}
    </div>
  );
}
