import { Link } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { SbfRollbackTrainer } from "@/components/media/SbfRollbackTrainer";
import { ArrowLeft, Swords } from "lucide-react";

/**
 * Route C — local rollback trainer (N1). Not netplay WAN yet.
 */
export default function RollbackPage() {
  return (
    <AppShell wide>
      <div className="space-y-4 max-w-4xl">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/arcade">
            <Button variant="ghost" size="sm" className="gap-1 pl-0">
              <ArrowLeft className="w-4 h-4" /> Arcade
            </Button>
          </Link>
          <Link href="/mesh-test">
            <Button variant="ghost" size="sm">
              Mesh · 3 Routes
            </Button>
          </Link>
          <Swords className="w-5 h-5 text-orange-500" />
          <h1 className="text-xl font-bold font-serif">Rollback lab</h1>
        </div>
        <SbfRollbackTrainer />
      </div>
    </AppShell>
  );
}
