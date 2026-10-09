import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentHandle } from "@/lib/auth";
import {
  CRED_GATE,
  CRED_KEY,
  LAB_EVENT,
  labUnlocked,
  markWalletEnabled,
} from "@/lib/lab-gate";

export function useLabUnlocked(): boolean {
  const [open, setOpen] = useState(labUnlocked);
  useEffect(() => {
    const sync = () => setOpen(labUnlocked());
    window.addEventListener(LAB_EVENT, sync);
    window.addEventListener("storage", sync);
    const handle = getCurrentHandle();
    let stop = false;
    if (handle) {
      void (async () => {
        const gate = await fetch(
          `/api/portfolio/gate?handle=${encodeURIComponent(handle)}`,
        )
          .then((res) => res.json())
          .catch(() => null);
        if (stop) return;
        if (gate?.walletEnabled) markWalletEnabled();
        const cred = await fetch(
          `/api/connect/cred?handle=${encodeURIComponent(handle)}`,
        )
          .then((res) => res.json())
          .catch(() => null);
        const score = Number(cred?.cred?.score || 0);
        if (score >= CRED_GATE) {
          localStorage.setItem(CRED_KEY, String(score));
          window.dispatchEvent(new Event(LAB_EVENT));
        }
      })();
    }
    return () => {
      stop = true;
      window.removeEventListener(LAB_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return open;
}

export function LabLocked() {
  return (
    <AppShell>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>This lab is closed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Mesh test, relays, and the stack open after you accept the terms and
            enable the practice wallet, or after Yard Cred reaches {CRED_GATE}.
          </p>
          <Button asChild>
            <Link href="/terms">Read the terms</Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
