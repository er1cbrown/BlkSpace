import { useState } from "react";
import { Link, useLocation } from "wouter";
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
import { Navbar } from "@/components/layout/Navbar";
import {
  ArrowRight,
  ArrowLeft,
  Shield,
  Globe,
  Coins,
  Key,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import {
  createNostrIdentity,
  nsecToMnemonic,
  storeIdentity,
  authenticateWithNostr,
  enterGuestMode,
} from "@/lib/auth";
import { isTauri, tauriCreateUser } from "@/lib/tauri-api";
import { markFirstRunComplete } from "@/lib/auth";

export default function WelcomePage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);
  const [nsecHex, setNsecHex] = useState("");
  const [pubkey, setPubkey] = useState("");
  const [showPhrase, setShowPhrase] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const totalSteps = 5;

  const generateKey = async () => {
    setSaving(true);
    setError("");
    try {
      const identity = createNostrIdentity();
      setNsecHex(identity.nsecHex);
      setPubkey(identity.pubkey);
      setSeedPhrase(nsecToMnemonic(identity.nsecHex));
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Key generation failed");
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
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
      markFirstRunComplete();
      navigate("/feed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed — try again");
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    // Step 0: Welcome
    <div className="space-y-6 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
        <Globe className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-3xl font-bold font-serif">Welcome to BlkSpace</h2>
      <p className="text-lg text-muted-foreground">
        The digital yard for HBCU communities. Built on decentralized
        technology, owned by the people who use it.
      </p>
      <div className="grid grid-cols-3 gap-4 text-sm pt-4">
        <div className="bg-card p-4 rounded-xl border">
          <Shield className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="font-medium">Your Keys</p>
          <p className="text-muted-foreground text-xs">
            Your identity, your control
          </p>
        </div>
        <div className="bg-card p-4 rounded-xl border">
          <Globe className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="font-medium">Your Town</p>
          <p className="text-muted-foreground text-xs">
            Campus-first community
          </p>
        </div>
        <div className="bg-card p-4 rounded-xl border">
          <Coins className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="font-medium">Your Value</p>
          <p className="text-muted-foreground text-xs">Earn for contributing</p>
        </div>
      </div>
    </div>,

    // Step 1: What Makes BlkSpace Different
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-serif text-center">
        What Makes This Different
      </h2>
      <div className="space-y-4">
        <div className="bg-card p-4 rounded-xl border flex gap-4">
          <Key className="w-8 h-8 text-primary shrink-0 mt-1" />
          <div>
            <p className="font-bold">No Company Owns Your Account</p>
            <p className="text-sm text-muted-foreground">
              Instagram, TikTok, Twitter — they all own your data. BlkSpace
              gives you cryptographic keys. Your account belongs to you, not a
              corporation.
            </p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border flex gap-4">
          <Shield className="w-8 h-8 text-primary shrink-0 mt-1" />
          <div>
            <p className="font-bold">No "Forgot Password"</p>
            <p className="text-sm text-muted-foreground">
              Because there's no password. Instead, you get a{" "}
              <strong>recovery phrase</strong> — 12 words that unlock your
              account anywhere. Lose it, and nobody can help you. Not even us.
            </p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border flex gap-4">
          <Globe className="w-8 h-8 text-primary shrink-0 mt-1" />
          <div>
            <p className="font-bold">Your Town, Your Rules</p>
            <p className="text-sm text-muted-foreground">
              TSU, Howard, FAMU, Spelman — each has its own digital yard. No
              algorithms from Silicon Valley decide what you see.
            </p>
          </div>
        </div>
      </div>
    </div>,

    // Step 2: Create Profile
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-serif text-center">
        Create Your Profile
      </h2>
      <p className="text-center text-muted-foreground">
        Pick your handle and name. This is how people will find you on the yard.
      </p>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input
            id="name"
            placeholder="Your name (e.g., Jane Doe)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="handle">Handle</Label>
          <Input
            id="handle"
            placeholder="your_handle (letters, numbers, _ or -)"
            value={handle}
            onChange={(e) =>
              setHandle(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))
            }
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            This will be your username: @{handle || "your_handle"}
          </p>
        </div>
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>,

    // Step 3: Recovery Phrase
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-serif text-center">
        Your Recovery Phrase
      </h2>
      <div className="space-y-4">
        <div className="bg-amber-950/20 border border-amber-600/30 text-amber-200 text-sm p-4 rounded-lg">
          <strong>⚠ This is the most important step.</strong>
          <p className="mt-1">
            These 12 words are your account. Lose them, and your account is gone
            forever. There is no reset, no support, no recovery.
          </p>
        </div>

        <div className="bg-amber-950/10 border border-amber-600/20 text-amber-200 text-sm p-4 rounded-lg">
          <strong>Write this on paper.</strong> Do NOT screenshot, photograph,
          or save to your phone. Paper is safer than pixels.
        </div>

        <div className="bg-muted p-4 rounded-xl font-mono text-sm leading-relaxed relative">
          <div className={showPhrase ? "" : "blur-sm select-none"}>
            {seedPhrase}
          </div>
          <button
            onClick={() => setShowPhrase(!showPhrase)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            {showPhrase ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            id="written"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="written" className="cursor-pointer">
            I have written these 12 words on paper
          </label>
        </div>

        <div className="bg-card p-4 rounded-lg border text-sm space-y-2">
          <p className="font-medium">What if you lose your phrase?</p>
          <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
            <li>Your account is gone forever</li>
            <li>Your WeixBucks, posts, followers — all lost</li>
            <li>Nobody can recover it for you</li>
            <li>Prevention is your only protection</li>
          </ul>
        </div>
      </div>
    </div>,

    // Step 4: Confirm & Finish
    <div className="space-y-6 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-4">
        <Check className="w-10 h-10 text-green-500" />
      </div>
      <h2 className="text-3xl font-bold font-serif">You're Ready</h2>
      <p className="text-lg text-muted-foreground">
        Your account is created. Your keys are stored on this device. Your
        phrase is on paper.
      </p>
      <div className="bg-card p-6 rounded-xl border text-left space-y-3">
        <p>
          <strong>Handle:</strong> @{handle || "your_handle"}
        </p>
        <p>
          <strong>Name:</strong> {displayName || handle || "Your Name"}
        </p>
        <p className="text-sm text-muted-foreground">
          Recovery phrase: Saved on paper (not shown again)
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        You can find your phrase anytime in Settings → Security.
      </p>
    </div>,
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg border-primary/10">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-8 h-1 rounded-full transition-colors ${
                    i <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {steps[step]}

            {error && step !== 2 && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex justify-between pt-4">
              {step > 0 ? (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={saving}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              ) : (
                <div />
              )}

              {step === 2 ? (
                <Button
                  onClick={generateKey}
                  disabled={!handle.trim() || saving}
                  className="rounded-full h-12 px-6 font-bold"
                >
                  {saving ? "Creating..." : "Generate My Key"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : step === 3 ? (
                <Button
                  onClick={() => setStep(4)}
                  disabled={!confirmed || saving}
                  className="rounded-full h-12 px-6 font-bold"
                >
                  I Saved It — Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : step === 4 ? (
                <Button
                  onClick={finish}
                  disabled={saving}
                  className="rounded-full h-12 px-6 font-bold bg-green-600 hover:bg-green-700"
                >
                  {saving ? "Entering the Yard..." : "Enter the Yard"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => setStep(step + 1)}
                  className="rounded-full h-12 px-6 font-bold"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

            {step === 0 && (
              <div className="space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Sign In
                  </Link>
                  {" · "}
                  <Link href="/recover" className="text-primary hover:underline">
                    Recover
                  </Link>
                </p>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      enterGuestMode();
                      navigate("/feed");
                    }}
                    className="text-xs text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4"
                  >
                    Just browse the yard as a guest
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
