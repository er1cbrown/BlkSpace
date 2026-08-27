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
  normalizeSecretKey,
  derivePubkey,
  authenticateWithNostr,
  storeIdentity,
} from "@/lib/auth";
import { isTauri, tauriCreateUser, tauriGetUser } from "@/lib/tauri-api";
import {
  loadLocalBackup,
  parseBackupJson,
  restorePasswordBackup,
} from "@/lib/account-backup";

type Method = "password" | "phrase";

export default function RecoverPage() {
  const [, navigate] = useLocation();
  const local = loadLocalBackup();
  const [method, setMethod] = useState<Method>(local ? "password" : "password");
  const [phrase, setPhrase] = useState("");
  const [handle, setHandle] = useState(local?.handle ?? "");
  const [password, setPassword] = useState("");
  const [fileText, setFileText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loginWithNsec = async (nsecHex: string, cleanHandle: string) => {
    const pubkey = derivePubkey(nsecHex);
    if (isTauri()) {
      const existing = await tauriGetUser(cleanHandle);
      if (!existing) {
        await tauriCreateUser(cleanHandle, cleanHandle, pubkey);
      }
    }
    const token = await authenticateWithNostr(cleanHandle, nsecHex);
    await storeIdentity(token, cleanHandle, nsecHex, cleanHandle);
    navigate("/feed");
  };

  const handleRecoverPhrase = async () => {
    if (!phrase.trim() || !handle.trim()) return;
    setSaving(true);
    setError("");
    try {
      const nsecHex = normalizeSecretKey(phrase);
      await loginWithNsec(nsecHex, handle.trim());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Recovery failed — check your phrase",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRecoverPassword = async () => {
    setSaving(true);
    setError("");
    try {
      const raw = fileText.trim() || JSON.stringify(local);
      if (!raw || raw === "null") {
        throw new Error("Add your backup file (or use this browser’s saved backup)");
      }
      const backup = parseBackupJson(raw);
      const restored = await restorePasswordBackup(backup, password);
      const cleanHandle = handle.trim() || restored.handle;
      await loginWithNsec(restored.nsecHex, cleanHandle);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Recovery failed — check password and file",
      );
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setFileText(text);
    try {
      const b = parseBackupJson(text);
      if (b.handle) setHandle(b.handle);
    } catch {
      /* parse error shown on submit */
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
              Password + backup file for most people. 24 words if you saved
              them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            <div className="flex gap-2 text-sm justify-center">
              <button
                type="button"
                className={
                  method === "password"
                    ? "font-medium text-primary"
                    : "text-muted-foreground"
                }
                onClick={() => setMethod("password")}
              >
                Recovery password
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                className={
                  method === "phrase"
                    ? "font-medium text-primary"
                    : "text-muted-foreground"
                }
                onClick={() => setMethod("phrase")}
              >
                24-word phrase
              </button>
            </div>

            {method === "password" ? (
              <>
                {local && (
                  <p className="text-xs text-muted-foreground text-center">
                    A backup for @{local.handle} is already on this browser.
                  </p>
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
                  <Label htmlFor="backup-file">Backup file</Label>
                  <Input
                    id="backup-file"
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => onFile(e.target.files?.[0])}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backup-password">Recovery password</Label>
                  <Input
                    id="backup-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleRecoverPassword}
                  className="w-full rounded-full h-12 text-base font-bold"
                  disabled={saving || !password}
                >
                  {saving ? "Recovering..." : "Recover with password"}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="handle-phrase">Handle</Label>
                  <Input
                    id="handle-phrase"
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
                    placeholder="Enter your 24-word phrase separated by spaces"
                    value={phrase}
                    onChange={(e) => setPhrase(e.target.value)}
                    className="font-mono min-h-[100px]"
                  />
                </div>
                <Button
                  onClick={handleRecoverPhrase}
                  className="w-full rounded-full h-12 text-base font-bold"
                  disabled={saving || !phrase.trim() || !handle.trim()}
                >
                  {saving ? "Recovering..." : "Recover Account"}
                </Button>
              </>
            )}
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
