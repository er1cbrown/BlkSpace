import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { storeIdentity, authenticateWithNostr, createNostrIdentity, nsecToMnemonic } from "@/lib/auth";
import { isTauri, tauriCreateUser } from "@/lib/tauri-api";

export default function SignupPage() {
  const [, navigate] = useLocation();
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [nsecHex, setNsecHex] = useState("");
  const [pubkey, setPubkey] = useState("");

  const generateKey = async () => {
    setSaving(true);
    setError("");
    try {
      const identity = createNostrIdentity();
      setNsecHex(identity.nsecHex);
      setPubkey(identity.pubkey);
      setSeedPhrase(nsecToMnemonic(identity.nsecHex));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Key generation failed");
    } finally {
      setSaving(false);
    }
  };

  const finishSignup = async () => {
    const cleanHandle = handle.trim() || `user_${Date.now().toString(36)}`;
    const cleanName = displayName.trim() || cleanHandle;
    setSaving(true);
    setError("");
    try {
      if (isTauri()) {
        await tauriCreateUser(cleanHandle, cleanName, pubkey);
      }
      const token = await authenticateWithNostr(cleanHandle, nsecHex);
      await storeIdentity(token, cleanHandle, nsecHex, cleanName);
      navigate("/feed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed — try again");
    } finally {
      setSaving(false);
    }
  };

  // ─── Mnemonic Verification ───────────────────────────────

  const [verifyWords, setVerifyWords] = useState<{ index: number; word: string }[]>([]);
  const [verifyInputs, setVerifyInputs] = useState<string[]>(["", ""]);
  const [verifyError, setVerifyError] = useState("");

  const startVerification = () => {
    if (!seedPhrase) return;
    const words = seedPhrase.split(" ");
    // Pick 2 random unique indices
    const indices: number[] = [];
    while (indices.length < 2) {
      const idx = Math.floor(Math.random() * 12);
      if (!indices.includes(idx)) indices.push(idx);
    }
    indices.sort((a, b) => a - b);
    setVerifyWords(indices.map(i => ({ index: i + 1, word: words[i] })));
    setVerifyInputs(["", ""]);
    setVerifyError("");
    setConfirmed(true);
  };

  const checkVerification = () => {
    const correct = verifyWords.every((vw, i) =>
      verifyInputs[i].trim().toLowerCase() === vw.word.toLowerCase()
    );
    if (correct) {
      setVerifyError("");
      finishSignup();
    } else {
      setVerifyError("Words don't match. Please check your paper and try again.");
    }
  };

  if (seedPhrase && verifyWords.length > 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg border-primary/10">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-serif">Verify Your Backup</CardTitle>
              <CardDescription className="text-base">
                Type the words from your paper to prove you wrote them down
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {verifyError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{verifyError}</div>
              )}
              <div className="space-y-4">
                {verifyWords.map((vw, i) => (
                  <div key={i} className="space-y-2">
                    <Label htmlFor={`verify-${i}`}>Word #{vw.index}</Label>
                    <Input
                      id={`verify-${i}`}
                      placeholder={`Type word #${vw.index}`}
                      value={verifyInputs[i]}
                      onChange={(e) => {
                        const next = [...verifyInputs];
                        next[i] = e.target.value;
                        setVerifyInputs(next);
                      }}
                      className="font-mono"
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>
              <div className="bg-amber-950/20 border border-amber-600/30 text-amber-200 text-sm p-4 rounded-lg">
                <strong>Can't remember?</strong> Go back and write your phrase again on paper. No screenshots.
              </div>
              <Button
                onClick={checkVerification}
                className="w-full rounded-full h-12 text-base font-bold"
                disabled={verifyInputs.some(v => !v.trim()) || saving}
              >
                {saving ? "Creating Account..." : "Verify & Create Account"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setVerifyWords([]);
                  setConfirmed(false);
                }}
              >
                Go Back to Recovery Phrase
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (seedPhrase) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-lg border-primary/10">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-serif">Your Recovery Phrase</CardTitle>
              <CardDescription className="text-base">
                Save these 12 words — this is the only way to recover your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-amber-950/20 border border-amber-600/30 text-amber-200 text-sm p-4 rounded-lg">
                <strong>⚠ Never share these words.</strong> Anyone with this phrase can take your identity permanently.
              </div>
              <div className="bg-amber-950/10 border border-amber-600/20 text-amber-200 text-sm p-4 rounded-lg">
                <strong>Write this on paper.</strong> Do NOT screenshot, photograph, or copy to your phone. Paper is safer.
              </div>
              <div className="bg-muted p-4 rounded-xl font-mono text-sm leading-relaxed select-all">
                {seedPhrase}
              </div>
              <Button
                variant="outline"
                className="w-full rounded-full"
                onClick={() => { navigator.clipboard?.writeText(seedPhrase); }}
              >
                Copy to Clipboard (Not Recommended)
              </Button>
              <Button
                onClick={startVerification}
                className="w-full rounded-full h-12 text-base font-bold"
                disabled={saving}
              >
                I Wrote It Down — Continue
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                By continuing, you confirm you understand there is no "Forgot Password" option.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-primary/10">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-serif">Join the Yard</CardTitle>
            <CardDescription className="text-base">Create your Nostr identity to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{error}</div>
            )}
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
                onChange={(e) => setHandle(e.target.value)}
                className="font-mono"
              />
            </div>
            <Button onClick={generateKey} className="w-full rounded-full h-12 text-base font-bold" disabled={saving}>
              {saving ? "Creating..." : "Generate Key & Sign Up"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have a key?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
              {" · "}
              <Link href="/recover" className="text-primary font-medium hover:underline">
                Recover with seed phrase
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
