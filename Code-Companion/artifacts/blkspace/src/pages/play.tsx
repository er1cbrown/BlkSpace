import { useMemo } from "react";
import { Link, useSearch } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShareCardButton } from "@/components/social/ShareCardButton";
import { isSafeHttpUrl } from "@/lib/amalgamation-meta";
import { playShellPath } from "@/lib/share-card";
import { ArrowLeft, ExternalLink, Gamepad2, Shield } from "lucide-react";

/**
 * Sandboxed Play shell for student HTML/WASM demos (HTTPS static hosts).
 * Not a Flash emulator, not a git forge. Tier 0–friendly when demos are small.
 * See docs/features/use-case-playable-sendme-yard.md
 */
export default function PlayPage() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const rawUrl = (params.get("url") || "").trim();
  const title = (params.get("title") || "Playable demo").trim();
  const safe = rawUrl && isSafeHttpUrl(rawUrl);

  // Block clearly dangerous schemes already rejected by isSafeHttpUrl;
  // also refuse data: and javascript if they sneak past.
  const blocked =
    !rawUrl ||
    /^(javascript|data|blob|file):/i.test(rawUrl) ||
    !safe;

  return (
    <AppShell wide>
      <div className="space-y-4 max-w-5xl">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Link href="/arcade">
              <Button variant="ghost" size="sm" className="gap-1 pl-0">
                <ArrowLeft className="w-4 h-4" /> Arcade
              </Button>
            </Link>
            <Link href="/hub">
              <Button variant="ghost" size="sm" className="gap-1">
                Hub
              </Button>
            </Link>
            <Gamepad2 className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold font-serif">{title}</h1>
            <Badge variant="secondary">Play shell</Badge>
          </div>
          {safe && (
            <div className="flex flex-wrap gap-2">
              <ShareCardButton
                variant="outline"
                share={{
                  kind: "playable",
                  title,
                  path: playShellPath(rawUrl),
                  externalUrl: rawUrl,
                }}
              />
              <a href={rawUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open raw
                </Button>
              </a>
            </div>
          )}
        </div>

        <Alert>
          <Shield className="w-4 h-4" />
          <AlertTitle>Sandboxed browser play</AlertTitle>
          <AlertDescription className="text-xs space-y-1">
            <p>
              Student demos (HTML + WASM) open in a restricted iframe. This is
              not Adobe Flash, not GitHub, and not a native OS. Prefer small
              packages on Tier 0 laptops.
            </p>
            <p className="text-muted-foreground">
              Forge stays external — link your repo on your profile. WeixNet
              tickets / Sendme are for drops; this shell is for{" "}
              <strong>https</strong> static play URLs.
            </p>
          </AlertDescription>
        </Alert>

        {blocked ? (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base">No playable URL</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Pass a safe <code className="text-xs">https://</code> URL:
              </p>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                /play?url=https%3A%2F%2Fexample.com%2Fdemo%2F&title=My%20Demo
              </pre>
              <Link href="/hub">
                <Button size="sm">Browse Content Hub</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-primary/20">
            <CardContent className="p-0">
              <iframe
                title={title}
                src={rawUrl}
                className="w-full min-h-[70vh] bg-background border-0"
                // Restrictive sandbox: scripts allowed for WASM demos; no top-nav
                sandbox="allow-scripts allow-forms allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-downloads"
                referrerPolicy="no-referrer"
                allow="fullscreen; gamepad; accelerometer; gyroscope"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
