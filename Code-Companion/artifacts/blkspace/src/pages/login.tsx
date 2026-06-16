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
import { storeIdentity, authenticateWithNostr } from "@/lib/auth";
import { derivePubkey } from "@/lib/auth";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [nsec, setNsec] = useState("");
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!nsec.trim() || !handle.trim()) return;
    setSaving(true);
    setError("");
    try {
      const pubkey = derivePubkey(nsec.trim());
      const token = await authenticateWithNostr(handle.trim(), nsec.trim());
      await storeIdentity(token, handle.trim(), nsec.trim(), handle.trim());
      navigate("/feed");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Login failed — check your key and handle",
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
            <CardTitle className="text-3xl font-serif">Welcome Back</CardTitle>
            <CardDescription className="text-base">
              Sign in with your Nostr secret key
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
              <Label htmlFor="nsec">Nostr Secret Key (nsec...)</Label>
              <Input
                id="nsec"
                type="password"
                placeholder="nsec1..."
                value={nsec}
                onChange={(e) => setNsec(e.target.value)}
                className="font-mono"
              />
            </div>
            <Button
              onClick={handleLogin}
              className="w-full rounded-full h-12 text-base font-bold"
              disabled={saving || !nsec.trim() || !handle.trim()}
            >
              {saving ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have a key?{" "}
              <Link
                href="/signup"
                className="text-primary font-medium hover:underline"
              >
                Create one
              </Link>
              {" · "}
              <Link
                href="/recover"
                className="text-primary font-medium hover:underline"
              >
                Recover with seed
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
