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
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {mode === "password" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void savePassword();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="recovery-password">Recovery password</Label>
            <Input
              id="recovery-password"
              type="password"
              autoComplete="new-password"
              autoFocus
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
            type="submit"
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
            At least 8 characters. A backup file downloads — keep this
            password.
          </p>
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <button
              type="button"
              className="hover:text-foreground"
              onClick={() => setMode("skip")}
            >
              Skip for now
            </button>
            <button
              type="button"
              className="hover:text-foreground"
              onClick={() => setMode("phrase")}
            >
              24 words (advanced)
            </button>
          </div>
        </form>
      )}

      {mode === "phrase" && (
        <>
          <p className="text-sm text-muted-foreground">
            Write these on paper. Anyone with them owns the account.
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
          <button
            type="button"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMode("password")}
          >
            Back to password
          </button>
        </>
      )}

      {mode === "skip" && (
        <>
          <p className="text-sm text-amber-200 bg-amber-950/30 border border-amber-600/30 rounded-lg p-3">
            If this device dies with no backup, this handle is gone. You can
            add a password later in Settings.
          </p>
          <Button
            variant="outline"
            onClick={onDone}
            className="w-full rounded-full h-12"
          >
            Continue without a backup
          </Button>
          <Button variant="ghost" onClick={() => setMode("password")}>
            Back — set a password
          </Button>
        </>
      )}
    </div>
  );
}
