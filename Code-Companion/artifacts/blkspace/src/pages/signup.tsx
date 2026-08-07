import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  storeIdentity,
  authenticateWithNostr,
  createNostrIdentity,
  nsecToMnemonic,
  markFirstRunComplete,
} from "@/lib/auth";
import { isTauri, tauriCreateUser } from "@/lib/tauri-api";
import { Textarea } from "@/components/ui/textarea";

export default function SignupPage() {
  const [, navigate] = useLocation();
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);
  const [phraseAck, setPhraseAck] = useState(false);

  const joinYard = async () => {
    const cleanHandle = handle.trim() || `user_${Date.now().toString(36)}`;
    const cleanName = displayName.trim() || cleanHandle;
    setSaving(true);
    setError("");
    try {
      const identity = createNostrIdentity();
      if (isTauri()) {
        await tauriCreateUser(cleanHandle, cleanName, identity.pubkey);
      }
      const token = await authenticateWithNostr(cleanHandle, identity.nsecHex);
      await storeIdentity(token, cleanHandle, identity.nsecHex, cleanName);
      setRecoveryPhrase(nsecToMnemonic(identity.nsecHex));
      setPhraseAck(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed — try again");
    } finally {
      setSaving(false);
    }
  };

  const finishSignup = () => {
    if (!phraseAck || !recoveryPhrase) return;
    markFirstRunComplete();
    navigate("/feed");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-primary/10">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-serif">
              {recoveryPhrase ? "Save Recovery Phrase" : "Join the Yard"}
            </CardTitle>
            <CardDescription className="text-base">
              {recoveryPhrase
                ? "Write down these 24 words — this is the only way to recover your account"
                : "Create your free account in seconds"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            {recoveryPhrase ? (
              <>
                <Textarea
                  readOnly
                  value={recoveryPhrase}
                  className="font-mono min-h-[120px] text-sm"
                />
                <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={phraseAck}
                    onChange={(e) => setPhraseAck(e.target.checked)}
                  />
                  <span>
                    I wrote down my 24-word recovery phrase in a safe place
                  </span>
                </label>
                <Button
                  onClick={finishSignup}
                  className="w-full rounded-full h-12 text-base font-bold"
                  disabled={!phraseAck}
                >
                  Continue to feed
                </Button>
              </>
            ) : (
              <>
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handle">Handle</Label>
              <Input
                id="handle"
                placeholder="your_handle"
                value={handle}
                onChange={(e) =>
                  setHandle(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))
                }
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              No wallet needed. You will be shown a 24-word recovery phrase
              before entering the yard — save it offline.
            </p>
            <Button
              onClick={joinYard}
              className="w-full rounded-full h-12 text-base font-bold"
              disabled={saving || !handle.trim()}
            >
              {saving ? "Creating..." : "Join the Yard"}
            </Button>
              </>
            )}
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary font-medium hover:underline"
              >
                Sign in
              </Link>
              {" · "}
              <Link
                href="/recover"
                className="text-primary font-medium hover:underline"
              >
                Recover with backup code
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
