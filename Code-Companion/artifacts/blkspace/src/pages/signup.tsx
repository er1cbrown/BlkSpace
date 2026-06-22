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
} from "@/lib/auth";
import { isTauri, tauriCreateUser } from "@/lib/tauri-api";

export default function SignupPage() {
  const [, navigate] = useLocation();
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      navigate("/feed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed — try again");
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
            <CardTitle className="text-3xl font-serif">Join the Yard</CardTitle>
            <CardDescription className="text-base">
              Create your free account in seconds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {error}
              </div>
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
                onChange={(e) =>
                  setHandle(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))
                }
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              No wallet needed. Your account is secured automatically — save
              your backup code in Settings when you want to cash out.
            </p>
            <Button
              onClick={joinYard}
              className="w-full rounded-full h-12 text-base font-bold"
              disabled={saving || !handle.trim()}
            >
              {saving ? "Creating..." : "Join the Yard"}
            </Button>
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