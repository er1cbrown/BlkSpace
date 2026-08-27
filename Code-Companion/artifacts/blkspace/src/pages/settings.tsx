import { AppShell } from "@/components/layout/AppShell";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useMemo, useState } from "react";
import { nip19 } from "nostr-tools";
import { Badge } from "@/components/ui/badge";
import {
  isTauri,
  tauriVerifyNostrEvent,
  tauriUpdateProProfile,
} from "@/lib/tauri-api";
import type { TauriNostrEventVerification } from "@/lib/tauri-api";
import {
  getCurrentHandle,
  getCurrentDisplayName,
  getSessionToken,
  getStoredNsec,
  nsecToMnemonic,
  clearIdentity,
  getStoredPubkey,
} from "@/lib/auth";
import {
  createPasswordBackup,
  downloadBackupFile,
  persistBackupLocally,
  MIN_BACKUP_PASSWORD,
} from "@/lib/account-backup";
import {
  getWebProfilePatch,
  saveWebProfilePatch,
} from "@/lib/web-userspace";
import {
  Eye,
  EyeOff,
  Shield,
  Key,
  LogOut,
  GraduationCap,
  AlertTriangle,
  Palette,
  TerminalSquare,
} from "lucide-react";
import {
  GPA_VISIBILITY_HELP,
  type GpaVisibility,
  type PrivacySettings,
  loadPrivacySettings,
  savePrivacySettings,
  sanitizeGpa,
  embedPrivacyInProJson,
  mergePrivacyFromProJson,
} from "@/lib/privacy-settings";
import {
  ACCENT_OPTIONS,
  DENSITY_OPTIONS,
  FEED_LAYOUT_OPTIONS,
  FONT_SCALE_OPTIONS,
  type UiPrefs,
  loadUiPrefs,
  saveUiPrefs,
} from "@/lib/ui-prefs";
import {
  DISCIPLINE_TRACKS,
  applyDisciplineToUiPrefs,
  type DisciplineTrack,
} from "@/lib/discipline-track";
import { MYARD_PROFILE_THEMES } from "@/lib/myyard-catalog";
import { YardPicker } from "@/components/ui-prefs/YardPicker";
import { useAppGetUser } from "@/hooks/use-app-data";
import { toast } from "sonner";
import { useTheme } from "next-themes";

function EventSignatureVerifier() {
  const [eventJson, setEventJson] = useState("");
  const [result, setResult] = useState<TauriNostrEventVerification | null>(
    null,
  );
  const [checking, setChecking] = useState(false);

  const handleVerify = async () => {
    if (!eventJson.trim()) return;
    setChecking(true);
    try {
      const res = await tauriVerifyNostrEvent(eventJson.trim());
      setResult(res);
    } catch (e) {
      setResult({
        valid: false,
        status: "error",
        message: String(e),
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        placeholder='{"id":"…","pubkey":"…","sig":"…","kind":1,…}'
        className="font-mono text-xs min-h-[120px]"
        value={eventJson}
        onChange={(e) => setEventJson(e.target.value)}
      />
      <Button onClick={handleVerify} disabled={checking || !eventJson.trim()}>
        {checking ? "Verifying…" : "Verify Signature"}
      </Button>
      {result && (
        <div className="rounded-lg border p-3 space-y-2 text-sm">
          <Badge variant={result.valid ? "default" : "destructive"}>
            {result.valid ? "Valid signature" : result.status}
          </Badge>
          {result.message && (
            <p className="text-muted-foreground">{result.message}</p>
          )}
          {result.eventId && (
            <p className="font-mono text-xs break-all">id: {result.eventId}</p>
          )}
          {result.pubkey && (
            <p className="font-mono text-xs break-all">
              pubkey: {result.pubkey}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [name, setName] = useState(getCurrentDisplayName());
  const [handle] = useState(getCurrentHandle());
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [xUrl, setXUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [revealedPhrase, setRevealedPhrase] = useState<string | null>(null);
  const [loadingPhrase, setLoadingPhrase] = useState(false);
  const [backupPassword, setBackupPassword] = useState("");
  const [backupConfirm, setBackupConfirm] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [privacy, setPrivacy] = useState<PrivacySettings>(() =>
    loadPrivacySettings(),
  );
  const [privacySaved, setPrivacySaved] = useState(false);
  const [uiPrefs, setUiPrefs] = useState<UiPrefs>(() => loadUiPrefs());
  const [uiSaved, setUiSaved] = useState(false);
  const { theme, setTheme } = useTheme();
  const { data: me } = useAppGetUser(handle);

  const handleSavePasswordBackup = async () => {
    if (backupPassword !== backupConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      toast.error("Sign in again to save a backup");
      return;
    }
    setBackupBusy(true);
    try {
      const nsec = await getStoredNsec(sessionToken, handle);
      if (!nsec) {
        toast.error("Could not export your key from this device");
        return;
      }
      const backup = await createPasswordBackup({
        nsecHex: nsec,
        handle,
        password: backupPassword,
      });
      persistBackupLocally(backup);
      downloadBackupFile(backup);
      setBackupPassword("");
      setBackupConfirm("");
      toast.success("Backup file saved — keep the password");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setBackupBusy(false);
    }
  };

  const handleRevealPhrase = async () => {
    setLoadingPhrase(true);
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        setRevealedPhrase(null);
        return;
      }
      // Explicit export only — no localStorage secret fallback (purged / insecure)
      const nsec = await getStoredNsec(sessionToken, handle);
      if (nsec) setRevealedPhrase(nsecToMnemonic(nsec));
      else setRevealedPhrase(null);
    } catch {
      setRevealedPhrase(null);
    } finally {
      setLoadingPhrase(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem("blkspace_display_name", name);
    const next = { ...uiPrefs, homeYardId: uiPrefs.homeYardId };
    saveUiPrefs(next);
    // Bio + external forge/social links (forge is link-out only — not a git host)
    saveWebProfilePatch({
      ...getWebProfilePatch(),
      bio: bio.trim() || undefined,
      displayName: name.trim() || undefined,
      githubUrl: githubUrl.trim(),
      xUrl: xUrl.trim(),
      websiteUrl: websiteUrl.trim(),
    });
    setSaved(true);
    toast.success("Profile saved");
    setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => {
    const patch = getWebProfilePatch();
    if (patch.bio) setBio(patch.bio);
    if (patch.githubUrl) setGithubUrl(patch.githubUrl);
    if (patch.xUrl) setXUrl(patch.xUrl);
    if (patch.websiteUrl) setWebsiteUrl(patch.websiteUrl);
  }, []);

  const patchUi = (patch: Partial<UiPrefs>) => {
    setUiPrefs((prev) => ({ ...prev, ...patch }));
  };

  const handleSaveAppearance = () => {
    saveUiPrefs(uiPrefs);
    setUiSaved(true);
    toast.success("Your BKSPC look is saved");
    setTimeout(() => setUiSaved(false), 2000);
  };

  const handleSavePrivacy = async () => {
    const next: PrivacySettings = {
      ...privacy,
      gpa: sanitizeGpa(privacy.gpa),
    };
    if (next.gpaVisibility === "private") {
      next.shareGpaOnApplyDefault = false;
    }
    savePrivacySettings(next);
    setPrivacy(next);
    // Persist with pro profile JSON when Tauri session is available
    const token = getSessionToken();
    if (isTauri() && token) {
      try {
        const merged = embedPrivacyInProJson(me?.proProfileJson, next);
        await tauriUpdateProProfile(token, merged);
      } catch (e) {
        console.warn("pro profile privacy sync failed", e);
      }
    }
    setPrivacySaved(true);
    toast.success("GPA privacy saved");
    setTimeout(() => setPrivacySaved(false), 2000);
  };

  useEffect(() => {
    if (me?.proProfileJson) {
      setPrivacy((p) =>
        mergePrivacyFromProJson(loadPrivacySettings(), me.proProfileJson),
      );
    }
  }, [me?.proProfileJson]);

  const handleLogout = () => {
    clearIdentity();
    window.location.href = "/";
  };

  const pubkey = getStoredPubkey();
  const npub = useMemo(() => {
    if (!pubkey) return null;
    try {
      return nip19.npubEncode(pubkey);
    } catch {
      return null;
    }
  }, [pubkey]);

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="flex items-center gap-6 mb-8 p-6 bg-card rounded-2xl border">
        <Avatar className="h-20 w-20 border-2 border-primary/20">
          <AvatarFallback className="text-3xl">{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-bold">{name || "Your Name"}</h2>
          <p className="text-muted-foreground">@{handle}</p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="border-primary/10 shadow-sm">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Update your public profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="handle">Handle</Label>
                <Input
                  id="handle"
                  value={handle}
                  disabled
                  className="font-mono opacity-60"
                />
                <p className="text-xs text-muted-foreground">
                  Handle cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the yard about yourself..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github">GitHub (forge — link only)</Label>
                <Input
                  id="github"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/you/project"
                  inputMode="url"
                />
                <p className="text-xs text-muted-foreground">
                  BKSPC is not a git host. Source stays on GitHub; the yard is
                  your stage.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="xurl">X / Twitter</Label>
                <Input
                  id="xurl"
                  value={xUrl}
                  onChange={(e) => setXUrl(e.target.value)}
                  placeholder="https://x.com/you"
                  inputMode="url"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website / portfolio</Label>
                <Input
                  id="website"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://…"
                  inputMode="url"
                />
              </div>
              <div className="space-y-2">
                <Label>Home yard (any public or private HBCU)</Label>
                <YardPicker
                  value={uiPrefs.homeYardId}
                  onChange={(id) => patchUi({ homeYardId: id })}
                  maxVisible={10}
                />
              </div>
              <Button onClick={handleSave} className="rounded-full px-8">
                {saved ? "Saved!" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card className="border-primary/10 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Tailor your BKSPC
              </CardTitle>
              <CardDescription>
                Density, accent, feed layout, and campus vibe — unique per user
                on this device.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isTauri() && (
                <div className="space-y-2">
                  <Label>Look</Label>
                  <button
                    type="button"
                    onClick={() => {
                      const next =
                        uiPrefs.chromeSkin === "terminal"
                          ? "default"
                          : "terminal";
                      const prefs = { ...uiPrefs, chromeSkin: next };
                      setUiPrefs(prefs);
                      if (next === "terminal") setTheme("dark");
                      saveUiPrefs(prefs);
                    }}
                    className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left ${
                      uiPrefs.chromeSkin === "terminal"
                        ? "border-primary bg-primary/10"
                        : "border-border"
                    }`}
                  >
                    <TerminalSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>
                      <span className="block text-sm font-medium">
                        Terminal mode
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Desktop only — paints on Tauri boot. Night · mono ·
                        status line.
                      </span>
                    </span>
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <Label>Color mode</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => setTheme("dark")}
                  >
                    Dark
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => setTheme("light")}
                  >
                    Light
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Accent color</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ACCENT_OPTIONS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => patchUi({ accent: a.id })}
                      className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs ${
                        uiPrefs.accent === a.id
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      }`}
                    >
                      <span
                        className={`h-4 w-4 rounded-full shrink-0 ${a.swatch}`}
                      />
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Density</Label>
                <div className="grid gap-2">
                  {DENSITY_OPTIONS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => patchUi({ density: d.id })}
                      className={`rounded-lg border px-3 py-2 text-left text-sm ${
                        uiPrefs.density === d.id
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      }`}
                    >
                      <span className="font-medium">{d.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {d.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Text size</Label>
                  <Select
                    value={uiPrefs.fontScale}
                    onValueChange={(v) =>
                      patchUi({ fontScale: v as UiPrefs["fontScale"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_SCALE_OPTIONS.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Feed layout</Label>
                  <Select
                    value={uiPrefs.feedLayout}
                    onValueChange={(v) =>
                      patchUi({ feedLayout: v as UiPrefs["feedLayout"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEED_LAYOUT_OPTIONS.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.label} — {f.hint}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Profile theme chrome</Label>
                <div className="flex flex-wrap gap-2">
                  {MYARD_PROFILE_THEMES.map((t) => (
                    <Button
                      key={t.id}
                      type="button"
                      size="sm"
                      variant={
                        uiPrefs.profileTheme === t.id ? "default" : "outline"
                      }
                      onClick={() => patchUi({ profileTheme: t.id })}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>BKSPC University · discipline track</Label>
                <p className="text-xs text-muted-foreground">
                  Reorders Content Hub and emphasis. Does not buy rank or Cred.
                  Same four-pillar economy for every track.
                </p>
                <div className="grid gap-2">
                  {DISCIPLINE_TRACKS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setUiPrefs((prev) =>
                          applyDisciplineToUiPrefs(prev, t.id as DisciplineTrack, {
                            setStartPath: false,
                          }),
                        );
                      }}
                      className={`rounded-lg border px-3 py-2 text-left text-sm ${
                        uiPrefs.disciplineTrack === t.id
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      }`}
                    >
                      <span className="font-medium">{t.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t.blurb}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Start page after open</Label>
                <Select
                  value={uiPrefs.startPath}
                  onValueChange={(v) =>
                    patchUi({ startPath: v as UiPrefs["startPath"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="/feed">Feed</SelectItem>
                    <SelectItem value="/hub">Hub</SelectItem>
                    <SelectItem value="/focus">Focus</SelectItem>
                    <SelectItem value="/communities">Yards</SelectItem>
                    <SelectItem value="/connect">Connect</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={uiPrefs.reduceMotion}
                    onChange={(e) =>
                      patchUi({ reduceMotion: e.target.checked })
                    }
                  />
                  Reduce motion
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={uiPrefs.calmCampusSkins}
                    onChange={(e) =>
                      patchUi({ calmCampusSkins: e.target.checked })
                    }
                  />
                  Calm campus skins (softer gradients)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={uiPrefs.showFocusNav}
                    onChange={(e) =>
                      patchUi({ showFocusNav: e.target.checked })
                    }
                  />
                  Show Focus in nav
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={uiPrefs.showFacultyNav}
                    onChange={(e) =>
                      patchUi({ showFacultyNav: e.target.checked })
                    }
                  />
                  Show Faculty shortcut
                </label>
              </div>

              <div className="space-y-2">
                <Label>Pinned Hub modules</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {(
                    [
                      ["events", "Events"],
                      ["studio", "Studio"],
                      ["clubs", "Clubs"],
                      ["yardSale", "Yard Sale"],
                      ["literacy", "Earn literacy"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={uiPrefs.pinnedModules[key]}
                        onChange={(e) =>
                          patchUi({
                            pinnedModules: {
                              ...uiPrefs.pinnedModules,
                              [key]: e.target.checked,
                            },
                          })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSaveAppearance}
                className="rounded-full px-8"
              >
                {uiSaved ? "Saved!" : "Save appearance"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="border-primary/10 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Get back in
              </CardTitle>
              <CardDescription>
                Campus default: recovery password + encrypted file. 24 words
                are optional for people who want paper.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="settings-backup-password">
                  Recovery password
                </Label>
                <Input
                  id="settings-backup-password"
                  type="password"
                  autoComplete="new-password"
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  minLength={MIN_BACKUP_PASSWORD}
                />
                <Label htmlFor="settings-backup-confirm">Confirm</Label>
                <Input
                  id="settings-backup-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={backupConfirm}
                  onChange={(e) => setBackupConfirm(e.target.value)}
                />
                <Button
                  type="button"
                  className="w-full rounded-full h-11"
                  disabled={
                    backupBusy ||
                    backupPassword.length < MIN_BACKUP_PASSWORD
                  }
                  onClick={handleSavePasswordBackup}
                >
                  {backupBusy ? "Saving…" : "Save password backup file"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  BlkSpace cannot reset this password. Keep the file in Drive /
                  iCloud / email-to-self.
                </p>
              </div>

              <div className="bg-amber-950/20 border border-amber-600/30 text-amber-200 text-sm p-4 rounded-lg">
                <strong>24-word phrase (advanced):</strong> still works. If you
                skip password <em>and</em> skip paper, nobody can recover the
                account — including us.
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full rounded-full h-12"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Show Recovery Phrase
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Your Recovery Phrase
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Never share these words. Anyone with this phrase can take
                      your identity permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="space-y-4">
                    <div className="bg-amber-950/10 border border-amber-600/20 text-amber-200 text-sm p-3 rounded-lg">
                      <strong>Write this on paper.</strong> Do NOT screenshot,
                      photograph, or save to your phone.
                    </div>

                    {loadingPhrase ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading your phrase...
                      </div>
                    ) : revealedPhrase ? (
                      <div className="space-y-3">
                        <div className="bg-muted p-4 rounded-xl font-mono text-sm leading-relaxed relative">
                          <div
                            className={showPhrase ? "" : "blur-sm select-none"}
                          >
                            {revealedPhrase}
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
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            navigator.clipboard?.writeText(revealedPhrase);
                          }}
                        >
                          Copy to Clipboard (Not Recommended)
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={handleRevealPhrase}
                        className="w-full h-12"
                      >
                        Click to Reveal Phrase
                      </Button>
                    )}
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="pt-4 border-t space-y-4">
                <div className="space-y-2">
                  <Label>Nostr Public Key (npub)</Label>
                  <Input
                    value={npub || pubkey || "Not available"}
                    disabled
                    className="font-mono text-xs opacity-60"
                  />
                  <p className="text-xs text-muted-foreground">
                    Share this npub so others can follow you on Damus, Amethyst,
                    or nostr.band.
                  </p>
                  {npub && (
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={`https://nostr.band/${npub}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View profile on nostr.band
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <LogOut className="w-5 h-5" />
                Sign Out
              </CardTitle>
              <CardDescription>
                Sign out of this device. Your account will remain on the
                network.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="rounded-full">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign Out?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will be logged out of this device. Make sure you have
                      a recovery password file or 24-word phrase first.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogout}
                      className="bg-destructive"
                    >
                      Sign Out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                GPA privacy (ProjectConnect)
              </CardTitle>
              <CardDescription>
                GPA is private by default. Org leads only see it when you opt in
                on an application — never sold, never required for Cred.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="gpa">GPA (optional)</Label>
                <Input
                  id="gpa"
                  type="number"
                  min={0}
                  max={4.5}
                  step={0.01}
                  placeholder="e.g. 3.75"
                  value={privacy.gpa}
                  onChange={(e) =>
                    setPrivacy((p) => ({ ...p, gpa: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank if you prefer not to store GPA at all.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Who can see my GPA?</Label>
                <Select
                  value={privacy.gpaVisibility}
                  onValueChange={(v) =>
                    setPrivacy((p) => ({
                      ...p,
                      gpaVisibility: v as GpaVisibility,
                      shareGpaOnApplyDefault:
                        v === "private" ? false : p.shareGpaOnApplyDefault,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">
                      Private — never share
                    </SelectItem>
                    <SelectItem value="connect_leads">
                      Connect leads only — opt-in when I apply
                    </SelectItem>
                    <SelectItem value="public">
                      Public on pro profile (apply still opt-in)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {GPA_VISIBILITY_HELP[privacy.gpaVisibility]}
                </p>
              </div>

              {privacy.gpaVisibility !== "private" && (
                <label className="flex items-start gap-3 text-sm rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={privacy.shareGpaOnApplyDefault}
                    onChange={(e) =>
                      setPrivacy((p) => ({
                        ...p,
                        shareGpaOnApplyDefault: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    <strong>Pre-check “share GPA”</strong> when I apply on
                    ProjectConnect. You can still uncheck per application.
                  </span>
                </label>
              )}

              <Button onClick={handleSavePrivacy} className="rounded-full px-8">
                {privacySaved ? "Saved!" : "Save GPA privacy"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-amber-600/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-amber-200 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Platform privacy notes
              </CardTitle>
              <CardDescription>
                How BKSPC protects your data on the yard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-amber-950/10 border border-amber-600/20 text-sm p-4 rounded-lg space-y-3">
                <p>
                  <strong>Link Previews Disabled</strong> — Automatic link
                  previews are turned off to prevent a known Nostr
                  confidentiality attack (CBC malleability + link preview
                  fetching). URLs are displayed as clickable text only.
                </p>
                <p>
                  <strong>Private Messages</strong> — Nostr encrypted direct
                  messages use experimental encryption (NIP-44). Do not use them
                  for sensitive communications. A warning will appear when DMs
                  are enabled.
                </p>
                <p>
                  <strong>Key Storage</strong> — Your private key is stored on
                  this device only. In Tauri desktop mode, it is stored in an
                  encrypted file. In web mode, it is stored in your
                  browser&apos;s localStorage.
                </p>
                <p>
                  <strong>Data Ownership</strong> — Your posts, follows, and
                  profile are stored on the Nostr relay network. You can move to
                  any compatible client at any time.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Session Status</Label>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm">Active session on this device</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Session expires after 24 hours of inactivity
                </p>
              </div>

              {isTauri() && (
                <div className="space-y-3 pt-4 border-t">
                  <Label>Verify Nostr Event Signature</Label>
                  <p className="text-xs text-muted-foreground">
                    Paste a signed Nostr event JSON to verify its Schnorr
                    signature client-side (Kimura et al. 2025 mitigations).
                  </p>
                  <EventSignatureVerifier />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
