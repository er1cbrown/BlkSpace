import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  authenticateWithNostr,
  derivePubkey,
  normalizeSecretKey,
  storeIdentity,
} from "@/lib/auth";
import { isTauri, tauriCreateUser, tauriGetUser } from "@/lib/tauri-api";
import {
  loadLocalBackup,
  parseBackupJson,
  restorePasswordBackup,
} from "@/lib/account-backup";

type Mode = "password" | "phrase";

export function SignInForm() {
  const [, navigate] = useLocation();
  const local = loadLocalBackup();
  const [mode, setMode] = useState<Mode>("password");
  const [handle, setHandle] = useState(local?.handle ?? "");
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [fileText, setFileText] = useState("");
  const [showFile, setShowFile] = useState(!local);
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

  const handlePasswordSignIn = async () => {
    setSaving(true);
    setError("");
    try {
      const typedHandle = handle.trim();
      const localFits =
        local && (!typedHandle || typedHandle === local.handle);
      const raw = fileText.trim() || (localFits ? JSON.stringify(local) : "");
      if (!raw) {
        throw new Error(
          "Add the backup file you saved when you joined — or use 24 words",
        );
      }
      const backup = parseBackupJson(raw);
      const restored = await restorePasswordBackup(backup, password);
      await loginWithNsec(
        restored.nsecHex,
        typedHandle || restored.handle,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Sign in failed — check password and backup",
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePhraseSignIn = async () => {
    if (!phrase.trim() || !handle.trim()) return;
    setSaving(true);
    setError("");
    try {
      const nsecHex = normalizeSecretKey(phrase);
      await loginWithNsec(nsecHex, handle.trim());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Sign in failed — check your phrase and handle",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {mode === "password" ? (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void handlePasswordSignIn();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="handle">Handle</Label>
            <Input
              id="handle"
              placeholder="your_handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="font-mono"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-password">Password</Label>
            <Input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {showFile ? (
            <div className="space-y-2">
              <Label htmlFor="backup-file">Backup file</Label>
              <Input
                id="backup-file"
                type="file"
                accept="application/json,.json"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </div>
          ) : (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowFile(true)}
            >
              I have a backup file
            </button>
          )}
          <Button
            type="submit"
            className="w-full rounded-full h-12 text-base font-bold"
            disabled={saving || !password}
          >
            {saving ? "Signing in..." : "Sign In"}
          </Button>
          <button
            type="button"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMode("phrase")}
          >
            24 words (advanced)
          </button>
        </form>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void handlePhraseSignIn();
          }}
        >
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
            <Label htmlFor="phrase">Recovery phrase</Label>
            <Textarea
              id="phrase"
              placeholder="24 words, nsec1…, or 64-char hex"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              className="font-mono min-h-[100px]"
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-full h-12 text-base font-bold"
            disabled={saving || !phrase.trim() || !handle.trim()}
          >
            {saving ? "Signing in..." : "Sign In"}
          </Button>
          <button
            type="button"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMode("password")}
          >
            Back to password
          </button>
        </form>
      )}
    </div>
  );
}
