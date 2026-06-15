import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { getCurrentHandle, getCurrentDisplayName, getSessionToken, getStoredNsec, nsecToMnemonic } from "@/lib/auth";

const TOWNS = [
  { value: "tsu", label: "TSU Yard" },
  { value: "howard", label: "Howard Yard" },
  { value: "spelman", label: "Spelman Yard" },
  { value: "famu", label: "FAMU Yard" },
  { value: "morehouse", label: "Morehouse Yard" },
];

export default function SettingsPage() {
  const [name, setName] = useState(getCurrentDisplayName());
  const [handle, setHandle] = useState(getCurrentHandle());
  const [bio, setBio] = useState("");
  const [town, setTown] = useState("tsu");
  const [saved, setSaved] = useState(false);
  const [revealedPhrase, setRevealedPhrase] = useState<string | null>(null);
  const [loadingPhrase, setLoadingPhrase] = useState(false);

  const handleRevealPhrase = async () => {
    setLoadingPhrase(true);
    try {
      const sessionToken = getSessionToken();
      if (!sessionToken) return;
      const nsec = await getStoredNsec(sessionToken, handle);
      if (nsec) setRevealedPhrase(nsecToMnemonic(nsec));
      else setRevealedPhrase(null);
    } finally {
      setLoadingPhrase(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem("blkspace_display_name", name);
    localStorage.setItem("blkspace_handle", handle);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container max-w-2xl py-8 px-4">
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

        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your public profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handle">Handle</Label>
              <Input id="handle" value={handle} onChange={(e) => setHandle(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell the yard about yourself..." rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Home Town</Label>
              <Select value={town} onValueChange={setTown}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOWNS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="key">Nostr Public Key</Label>
              <Input id="key" value="Stored securely — not displayed" disabled className="font-mono text-xs opacity-60" />
            </div>
            <Button onClick={handleSave} className="rounded-full px-8">
              {saved ? "Saved!" : "Save Changes"}
            </Button>
            <div className="pt-4 border-t">
              <Label>Recovery Phrase</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Your 12-word seed phrase can recover your identity on any device.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full">
                    Show Recovery Phrase
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Your Recovery Phrase</AlertDialogTitle>
                    <AlertDialogDescription>
                      Never share these words. Anyone with this phrase can take your identity permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {loadingPhrase ? (
                    <div className="text-center py-4 text-muted-foreground">Loading...</div>
                  ) : revealedPhrase ? (
                    <div className="bg-muted p-4 rounded-xl font-mono text-sm leading-relaxed select-all">
                      {revealedPhrase}
                    </div>
                  ) : (
                    <Button onClick={handleRevealPhrase} variant="outline" className="w-full">
                      Click to Reveal
                    </Button>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-600/20 shadow-sm mt-6">
          <CardHeader>
            <CardTitle className="text-amber-200">Privacy & Security</CardTitle>
            <CardDescription>
              Important notes about Nostr protocol security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-950/10 border border-amber-600/20 text-sm p-4 rounded-lg space-y-2">
              <p><strong>Link Previews Disabled</strong> — Automatic link previews are turned off to prevent a known Nostr confidentiality attack (CBC malleability + link preview fetching). URLs are displayed as clickable text only.</p>
              <p><strong>Private Messages</strong> — Nostr encrypted direct messages use experimental encryption (NIP-44). Do not use them for sensitive communications. A warning will appear when DMs are enabled.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
