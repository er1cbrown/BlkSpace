import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LITERACY_PATHS,
  LITERACY_PRINCIPLES,
  MARKETS_101,
} from "@/lib/earn-literacy";
import {
  GraduationCap,
  ArrowRight,
  Sparkles,
  Shield,
  Landmark,
} from "lucide-react";
import { BRAND } from "@/lib/brand";

/**
 * How underrepresented-network students make money + learn finance on BlkSpace.
 * Amalgamation thesis: culture + identity + literacy, not casino cosplay.
 */
export function FinancialLiteracyPanel() {
  return (
    <div id="literacy" className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            How money works on {BRAND.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Soft <strong className="text-foreground">WeixBucks (WB)</strong> are{" "}
            <strong className="text-foreground">practice credits</strong> for
            yard activity.{" "}
            <strong className="text-foreground">Yard Cred</strong> is
            reliability (not cash).{" "}
            <strong className="text-foreground">BKSPC settlement</strong> is
            optional and gated — not a hype coin or brokerage product.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {LITERACY_PRINCIPLES.map((p) => (
              <div
                key={p.title}
                className="rounded-lg border border-border/60 bg-background/80 p-3 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  {p.title}
                </div>
                <p className="text-xs leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/15">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            Markets 101 · Learn (not trade)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Educational only. {BRAND.name} does not open brokerage accounts,
            execute NASDAQ or crypto orders, or give personalized investment
            advice.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {MARKETS_101.map((m) => (
              <div
                key={m.title}
                className="rounded-lg border border-border/60 p-3 space-y-1"
              >
                <p className="text-xs font-semibold text-foreground">
                  {m.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {m.body}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Ways people earn here
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {LITERACY_PATHS.map((path) => (
            <Card key={path.id} className="border-primary/10">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm">{path.title}</h4>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {path.id}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Like: {path.competitorAnalogy}
                </p>
                <p className="text-xs">{path.howYouEarn}</p>
                <p className="text-[11px] font-mono text-primary/90">
                  {path.wbExample}
                </p>
                <p className="text-[11px] text-muted-foreground border-l-2 border-primary/30 pl-2">
                  Literacy: {path.literacyTip}
                </p>
                <Link href={path.href}>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full gap-1 mt-1"
                  >
                    {path.firstAction}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
