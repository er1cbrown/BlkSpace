import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/layout/Navbar";
import {
  ArrowRight,
  ArrowLeft,
  Globe,
  Coins,
  Users,
  Sparkles,
} from "lucide-react";
import {
  createNostrIdentity,
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

  const totalSteps = 2;

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
      await storeIdentity(
        token,
        cleanHandle,
        identity.nsecHex,
        cleanName,
      );
      markFirstRunComplete();
      navigate("/feed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create account");
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    <div className="space-y-6 text-center" key="welcome">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
        <Globe className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-3xl font-bold font-serif">Welcome to BlkSpace</h2>
      <p className="text-lg text-muted-foreground">
        The social network that pays you to post. Built for HBCU, works on any
        laptop or phone.
      </p>
      <div className="grid grid-cols-3 gap-4 text-sm pt-4">
        <div className="bg-card p-4 rounded-xl border">
          <Users className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="font-medium">Your Yard</p>
          <p className="text-muted-foreground text-xs">TSU, Howard, FAMU + more</p>
        </div>
        <div className="bg-card p-4 rounded-xl border">
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="font-medium">Your Posts</p>
          <p className="text-muted-foreground text-xs">Nobody can take them down</p>
        </div>
        <div className="bg-card p-4 rounded-xl border">
          <Coins className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="font-medium">Your Earnings</p>
          <p className="text-muted-foreground text-xs">Earn WeixBucks to post</p>
        </div>
      </div>
    </div>,

    <div className="space-y-6" key="profile">
      <h2 className="text-2xl font-bold font-serif text-center">
        Join the Yard
      </h2>
      <p className="text-center text-muted-foreground">
        Pick a handle and you&apos;re in. No wallet, no setup — just post and
        earn.
      </p>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input
            id="name"
            placeholder="Your name (e.g., Nina J.)"
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
          <p className="text-xs text-muted-foreground">
            You&apos;ll show up as @{handle || "your_handle"}
          </p>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Your account is secured automatically. Save your backup code later in
          Settings when you&apos;re ready to cash out.
        </p>
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
            {error}
          </div>
        )}
      </div>
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

              {step === 1 ? (
                <Button
                  onClick={joinYard}
                  disabled={!handle.trim() || saving}
                  className="rounded-full h-12 px-6 font-bold bg-green-600 hover:bg-green-700"
                >
                  {saving ? "Joining..." : "Join the Yard"}
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