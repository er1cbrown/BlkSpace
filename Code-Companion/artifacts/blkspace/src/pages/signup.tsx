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
  markFirstRunComplete,
} from "@/lib/auth";
import { isTauri, tauriCreateUser } from "@/lib/tauri-api";
import { RecoverySetup } from "@/components/auth/RecoverySetup";
import {
  bkspcAddress,
  handleError,
  normalizeHandle,
  passwordError,
} from "@/lib/signup-identity";

export default function SignupPage() {
  const [, navigate] = useLocation();
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdNsec, setCreatedNsec] = useState<string | null>(null);
  const [joinedHandle, setJoinedHandle] = useState("");

  const joinYard = async () => {
    const cleanHandle = normalizeHandle(handle);
    const handleProblem = handleError(cleanHandle);
    const passwordProblem = passwordError(password);
    const cleanEmail = email.trim().toLowerCase();
    if (handleProblem || passwordProblem) {
      setError(handleProblem || passwordProblem || "");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Enter the email where we should send verification.");
      return;
    }
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
      localStorage.setItem("blkspace_email", cleanEmail);
      localStorage.setItem("blkspace_address", bkspcAddress(cleanHandle));
      setJoinedHandle(cleanHandle);
      setCreatedNsec(identity.nsecHex);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed — try again");
    } finally {
      setSaving(false);
    }
  };

  const finishSignup = () => {
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
              {createdNsec ? "Get back in" : "Join the Yard"}
            </CardTitle>
            <CardDescription className="text-base">
              {createdNsec
                ? "Pick a password you already remember"
                : "Create your free account in seconds"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            {createdNsec ? (
              <RecoverySetup
                nsecHex={createdNsec}
                handle={joinedHandle}
                onDone={finishSignup}
              />
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
                placeholder="yourhandle"
                value={handle}
                onChange={(e) =>
                  setHandle(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))
                }
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Inside BKSPC you are @{normalizeHandle(handle) || "handle"}.
                Your address is {bkspcAddress(handle || "handle")}.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                At least 8 characters, with one uppercase letter, one lowercase
                letter, one digit 0–9, and one symbol. Latin letters only.
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Other social accounts connect to this @handle later. Email
              verification sends once mail is hooked up.
            </p>
            <Button
              onClick={joinYard}
              className="w-full rounded-full h-12 text-base font-bold"
              disabled={saving || !handle.trim() || !email.trim() || !password}
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
                Recover account
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
