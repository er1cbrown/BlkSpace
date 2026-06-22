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
import { useMemo, useState } from "react";
import { nip19 } from "nostr-tools";
import { Badge } from "@/components/ui/badge";
import { isTauri, tauriVerifyNostrEvent } from "@/lib/tauri-api";
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
import { Eye, EyeOff, Shield, Key, LogOut, AlertTriangle } from "lucide-react";

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
            <p className="font-mono text-xs break-all">
              id: {result.eventId}
            </p>
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

const TOWNS = [
  { value: "tsu", label: "TSU Yard" },
  { value: "howard", label: "Howard Yard" },
  { value: "spelman", label: "Spelman Yard" },
  { value: "famu", label: "FAMU Yard" },
  { value: "morehouse", label: "Morehouse Yard" },
];

export default function SettingsPage() {
  const [name, setName] = useState(getCurrentDisplayName());
  const [handle] = useState(getCurrentHandle());
  const [bio, setBio] = useState("");
  const [town, setTown] = useState("tsu");
  const [saved, setSaved] = useState(false);
  const [revealedPhrase, setRevealedPhrase] = useState<string | null>(null);
  const [loadingPhrase, setLoadingPhrase] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const handleRevealPhrase = async () => {
    setLoadingPhrase(true);
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        // Try localStorage fallback
        const nsec = localStorage.getItem("blkspace_nsec");
        if (nsec) setRevealedPhrase(nsecToMnemonic(nsec));
        else setRevealedPhrase(null);
        return;
      }
      const nsec = await getStoredNsec(sessionToken, handle);
      if (nsec) setRevealedPhrase(nsecToMnemonic(nsec));
      else setRevealedPhrase(null);
    } catch {
      // Fallback to localStorage
      const nsec = localStorage.getItem("blkspace_nsec");
      if (nsec) setRevealedPhrase(nsecToMnemonic(nsec));
      else setRevealedPhrase(null);
    } finally {
      setLoadingPhrase(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem("blkspace_display_name", name);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
            <AvatarFallback className="text-3xl">
              {name.charAt(0)}
            </AvatarFallback>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
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
                  <Label>Home Town</Label>
                  <Select value={town} onValueChange={setTown}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOWNS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} className="rounded-full px-8">
                  {saved ? "Saved!" : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="border-primary/10 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Recovery Phrase
                </CardTitle>
                <CardDescription>
                  Your 12-word seed phrase is the only way to recover your
                  account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-amber-950/20 border border-amber-600/30 text-amber-200 text-sm p-4 rounded-lg">
                  <strong>⚠ Critical:</strong> Lose this phrase, and your
                  account is gone forever. There is no reset, no support, no
                  recovery.
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
                        Never share these words. Anyone with this phrase can
                        take your identity permanently.
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
                              className={
                                showPhrase ? "" : "blur-sm select-none"
                              }
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
                        You will be logged out of this device. Make sure you
                        have your recovery phrase written down before signing
                        out.
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
            <Card className="border-amber-600/20 shadow-sm">
              <CardHeader>
                <CardTitle className="text-amber-200 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Privacy & Security
                </CardTitle>
                <CardDescription>
                  Important notes about how BKSPC protects your data
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
                    messages use experimental encryption (NIP-44). Do not use
                    them for sensitive communications. A warning will appear
                    when DMs are enabled.
                  </p>
                  <p>
                    <strong>Key Storage</strong> — Your private key is stored on
                    this device only. In Tauri desktop mode, it is stored in an
                    encrypted file. In web mode, it is stored in your browser's
                    localStorage.
                  </p>
                  <p>
                    <strong>Data Ownership</strong> — Your posts, follows, and
                    profile are stored on the Nostr relay network. You can move
                    to any compatible client at any time.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Session Status</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm">
                      Active session on this device
                    </span>
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
