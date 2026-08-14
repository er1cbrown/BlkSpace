import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeartPulse } from "lucide-react";

/**
 * Stub: HEAD App.tsx lazy-loads this route, but clinyard.tsx was not
 * in origin/main (cff3355). Enough to ship a Yard bundle for Device B.
 */
export default function ClinyardPage() {
  return (
    <AppShell>
      <Card className="max-w-lg mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HeartPulse className="w-5 h-5 text-teal-500" />
            ClinYard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Offline med-study drills. This page is a Device B stub because the
            full ClinYard module is documented but not in the current tree.
          </p>
          <Link href="/feed">
            <Button size="sm">Back to Home</Button>
          </Link>
        </CardContent>
      </Card>
    </AppShell>
  );
}
