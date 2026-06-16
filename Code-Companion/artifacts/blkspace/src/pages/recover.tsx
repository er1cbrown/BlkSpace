import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  mnemonicToNsec,
  derivePubkey,
  authenticateWithNostr,
} from "@/lib/auth";
import { isTauri, tauriCreateUser, tauriGetUser } from "@/lib/tauri-api";

export default function RecoverPage() {
  const [, navigate] = useLocation();
  const [phrase, setPhrase] = useState("");
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleRecover = async () => {
    if (!phrase.trim() || !handle.trim()) return;
    setSaving(true);
    setError("");
    try {
      const nsecHex = mnemonicToNsec(phrase);
      const pubkey = derivePubkey(nsecHex);

      if (isTauri()) {
        const existing = await tauriGetUser(handle.trim());
        if (!existing) {
          await tauriCreateUser(handle.trim(), handle.trim(), pubkey);
        }
      }

      await authenticateWithNostr(handle.trim(), nsecHex);
      navigate("/feed");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Recovery failed — check your phrase",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-primary/10">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-serif">
              Recover Account
            </CardTitle>
            <CardDescription className="text-base">
              Enter your 12-word recovery phrase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="handle">Handle</Label>
              <Input
                id="handle"
                placeholder="your_handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phrase">Recovery Phrase</Label>
              <Textarea
                id="phrase"
                placeholder="Enter your 12-word phrase separated by spaces"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                className="font-mono min-h-[100px]"
              />
            </div>
            <Button
              onClick={handleRecover}
              className="w-full rounded-full h-12 text-base font-bold"
              disabled={saving || !phrase.trim() || !handle.trim()}
            >
              {saving ? "Recovering..." : "Recover Account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/signup"
                className="text-primary font-medium hover:underline"
              >
                Create a new account instead
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
