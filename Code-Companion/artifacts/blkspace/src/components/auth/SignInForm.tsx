import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  authenticateWithNostr,
  authenticateWithStoredKey,
  derivePubkey,
  HANDLE_KEY,
  normalizeSecretKey,
  storeIdentity,
} from "@/lib/auth";
import { isTauri, tauriCreateUser, tauriGetUser } from "@/lib/tauri-api";
import {
  loadLocalBackup,
  parseBackupJson,
  restorePasswordBackup,
} from "@/lib/account-backup";

type Mode = "device" | "password" | "phrase";

export function SignInForm() {
  const [, navigate] = useLocation();
  const native = isTauri();
  const local = loadLocalBackup();
  const [mode, setMode] = useState<Mode>(() =>
    native ? "device" : "password",
  );
  const [handle, setHandle] = useState(
    () => localStorage.getItem(HANDLE_KEY) || local?.handle || "",
  );
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [fileText, setFileText] = useState("");
  const [showFile, setShowFile] = useState(() => !native && !local);
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

  const loginWithDeviceKey = async () => {
    const cleanHandle = handle.trim();
    if (!cleanHandle) {
      setError("Enter the handle you used when you joined.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await authenticateWithStoredKey(cleanHandle);
      navigate("/feed");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not sign in with the key saved on this device.",
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
      const backup = parseBackupJson(text);
      if (backup.handle) setHandle(backup.handle);
    } catch {
      /* parse error shown on submit */
    }
  };

  const handlePasswordSignIn = async () => {
    setSaving(true);
    setError("");
    try {
      const typedHandle = handle.trim();
      const localFits = local && (!typedHandle || typedHandle === local.handle);
      const raw = fileText.trim() || (localFits ? JSON.stringify(local) : "");
      if (!raw) {
        throw new Error(
          "Choose a backup file, or use your recovery phrase instead.",
        );
      }
      const backup = parseBackupJson(raw);
      const restored = await restorePasswordBackup(backup, password);
      await loginWithNsec(restored.nsecHex, typedHandle || restored.handle);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Sign-in failed — check the backup password.",
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
          : "Sign-in failed — check your recovery phrase and handle.",
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

      {mode === "device" && (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void loginWithDeviceKey();
          }}
        >
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
            <p className="font-medium text-foreground">Use this device</p>
            <p className="mt-1 text-muted-foreground">
              Your account key is secured in the desktop app. No password or
              backup file is needed to sign in here.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="device-handle">Handle</Label>
            <Input
              id="device-handle"
              placeholder="your_handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="font-mono"
              autoComplete="username"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-full h-12 text-base font-bold"
            disabled={saving || !handle.trim()}
          >
            {saving ? "Signing in..." : "Sign in on this device"}
          </Button>
          <div className="space-y-2 text-center text-xs text-muted-foreground">
            <button
              type="button"
              className="block w-full hover:text-foreground"
              onClick={() => setMode("phrase")}
            >
              Use a recovery phrase on a new device
            </button>
            <button
              type="button"
              className="block w-full hover:text-foreground"
              onClick={() => setMode("password")}
            >
              Use a backup file
            </button>
          </div>
        </form>
      )}

      {mode === "password" && (
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
            <Label htmlFor="signin-password">Backup password</Label>
            <Input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This option is for a password-encrypted backup from another
              device.
            </p>
          </div>
          {showFile ? (
            <div className="space-y-2">
              <Label htmlFor="backup-file">Backup file</Label>
              <Input
                id="backup-file"
                type="file"
                accept="application/json,.json"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </div>
          ) : (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowFile(true)}
            >
              Choose a backup file
            </button>
          )}
          <Button
            type="submit"
            className="w-full rounded-full h-12 text-base font-bold"
            disabled={saving || !password || (!fileText.trim() && !local)}
          >
            {saving ? "Signing in..." : "Sign in with backup"}
          </Button>
          <div className="space-y-2 text-center text-xs text-muted-foreground">
            <button
              type="button"
              className="block w-full hover:text-foreground"
              onClick={() => setMode(native ? "device" : "phrase")}
            >
              {native
                ? "Back to device sign-in"
                : "Use a recovery phrase instead"}
            </button>
          </div>
        </form>
      )}

      {mode === "phrase" && (
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
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phrase">Recovery phrase or key</Label>
            <Textarea
              id="phrase"
              placeholder="24 words, nsec1…, or 64-char hex"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              className="font-mono min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Use this only when signing in on a new device. The key is sent to
              secure app storage after verification.
            </p>
          </div>
          <Button
            type="submit"
            className="w-full rounded-full h-12 text-base font-bold"
            disabled={saving || !phrase.trim() || !handle.trim()}
          >
            {saving ? "Signing in..." : "Sign in with recovery phrase"}
          </Button>
          <button
            type="button"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMode(native ? "device" : "password")}
          >
            {native ? "Back to device sign-in" : "Back to backup sign-in"}
          </button>
        </form>
      )}
    </div>
  );
}
