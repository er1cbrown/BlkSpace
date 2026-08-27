import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createPasswordBackup,
  downloadBackupFile,
  persistBackupLocally,
  MIN_BACKUP_PASSWORD,
} from "@/lib/account-backup";
import { nsecToMnemonic } from "@/lib/auth";

type Mode = "password" | "phrase" | "skip";

export function RecoverySetup({
  nsecHex,
  handle,
  onDone,
}: {
  nsecHex: string;
  handle: string;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<Mode>("password");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phraseAck, setPhraseAck] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const phrase = nsecToMnemonic(nsecHex);

  const savePassword = async () => {
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      const backup = await createPasswordBackup({
        nsecHex,
        handle,
        password,
      });
      persistBackupLocally(backup);
      try {
        downloadBackupFile(backup);
      } catch {
        /* file prompt optional in webview */
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save backup");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          className={
            mode === "password"
              ? "font-medium text-primary"
              : "text-muted-foreground hover:text-foreground"
          }
          onClick={() => setMode("password")}
        >
          Recovery password
        </button>
        <span className="text-muted-foreground">·</span>
        <button
          type="button"
          className={
            mode === "phrase"
              ? "font-medium text-primary"
              : "text-muted-foreground hover:text-foreground"
          }
          onClick={() => setMode("phrase")}
        >
          24 words (advanced)
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {mode === "password" && (
        <>
          <p className="text-sm text-muted-foreground">
            Use a password you already remember (campus email password is fine
            if it is only yours). We save an encrypted file — not your 24
            words. Nobody at BlkSpace can reset this.
          </p>
          <div className="space-y-2">
            <Label htmlFor="recovery-password">Recovery password</Label>
            <Input
              id="recovery-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={MIN_BACKUP_PASSWORD}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recovery-password-confirm">Confirm password</Label>
            <Input
              id="recovery-password-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button
            onClick={savePassword}
            disabled={
              saving ||
              password.length < MIN_BACKUP_PASSWORD ||
              confirm.length < MIN_BACKUP_PASSWORD
            }
            className="w-full rounded-full h-12 font-bold bg-green-600 hover:bg-green-700"
          >
            {saving ? "Saving…" : "Save recovery password"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Put the downloaded file in email-to-self, Drive, or iCloud. Keep
            the password in your head or a password manager.
          </p>
          <button
            type="button"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMode("skip")}
          >
            Skip — this device only (easy to lose)
          </button>
        </>
      )}

      {mode === "phrase" && (
        <>
          <p className="text-sm text-muted-foreground">
            24 words recreate this account on any computer. Write them on
            paper. Do not screenshot.
          </p>
          <Textarea
            readOnly
            value={phrase}
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
            onClick={onDone}
            disabled={!phraseAck}
            className="w-full rounded-full h-12 font-bold bg-green-600 hover:bg-green-700"
          >
            Continue
          </Button>
        </>
      )}

      {mode === "skip" && (
        <>
          <p className="text-sm text-amber-200 bg-amber-950/30 border border-amber-600/30 rounded-lg p-3">
            If this laptop dies and you skipped backup, this handle is gone.
            Settings can add a password later.
          </p>
          <Button
            variant="outline"
            onClick={onDone}
            className="w-full rounded-full h-12"
          >
            Enter the yard without a backup
          </Button>
          <Button variant="ghost" onClick={() => setMode("password")}>
            Back — set a password
          </Button>
        </>
      )}
    </div>
  );
}
