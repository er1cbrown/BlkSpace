import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/layout/Navbar";
import {
  ArrowRight,
  ArrowLeft,
  Globe,
  Coins,
  Users,
  Sparkles,
  HeartPulse,
  GraduationCap,
  Building2,
  TerminalSquare,
} from "lucide-react";
import {
  createNostrIdentity,
  storeIdentity,
  authenticateWithNostr,
  enterGuestMode,
  markFirstRunComplete,
} from "@/lib/auth";
import { RecoverySetup } from "@/components/auth/RecoverySetup";
import { isTauri, tauriCreateUser, tauriUpdateUser } from "@/lib/tauri-api";
import { BRAND } from "@/lib/brand";
import { BrandMark } from "@/components/brand/BrandMark";
import { applyMedSchoolOnboarding } from "@/lib/focus-mode";
import { applyFacultyOnboarding } from "@/lib/faculty-desk";
import { getYardTheme } from "@/lib/yard-themes";
import { YardPicker } from "@/components/ui-prefs/YardPicker";
import {
  loadUiPrefs,
  saveUiPrefs,
  type ChromeSkinId,
} from "@/lib/ui-prefs";
import { ensureIntranetConnected } from "@/lib/hbcu-intranet";
import { markJustJoined } from "@/lib/yard-orientation";
import { cn } from "@/lib/utils";

type OnboardingPath = "general" | "med_focus" | "faculty";

export default function WelcomePage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [path, setPath] = useState<OnboardingPath>("general");
  const [yardId, setYardId] = useState("tsu");
  const [chromeSkin, setChromeSkin] = useState<ChromeSkinId>(
    () => loadUiPrefs().chromeSkin,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pickLook = (skin: ChromeSkinId) => {
    setChromeSkin(skin);
    const prefs = loadUiPrefs();
    saveUiPrefs({ ...prefs, chromeSkin: skin });
  };
  const [createdNsec, setCreatedNsec] = useState<string | null>(null);
  const [joinedHandle, setJoinedHandle] = useState("");
  const [postJoinPath, setPostJoinPath] = useState("/feed");

  const totalSteps = 3;

  const finishRecoverySetup = () => {
    markFirstRunComplete();
    markJustJoined(yardId || "tsu");
    navigate(postJoinPath);
  };

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
      await storeIdentity(token, cleanHandle, identity.nsecHex, cleanName);
      // Persist home yard / town when possible
      if (isTauri() && token) {
        try {
          await tauriUpdateUser(token, cleanName, "", yardId);
        } catch {
          /* town update optional on first join */
        }
      }
      try {
        localStorage.setItem("blkspace_home_yard", yardId);
        const prefs = loadUiPrefs();
        saveUiPrefs({ ...prefs, homeYardId: yardId, chromeSkin });
      } catch {
        /* ignore */
      }

      if (path === "med_focus") {
        const homeYard = yardId || "meharry";
        const theme = getYardTheme(homeYard);
        applyMedSchoolOnboarding({
          campusLabel: theme?.school || "Meharry Medical College",
          yardId: homeYard,
        });
        try {
          localStorage.setItem("blkspace_home_yard", homeYard);
          const prefs = loadUiPrefs();
          saveUiPrefs({
            ...prefs,
            homeYardId: homeYard,
            showFocusNav: true,
            startPath: "/focus",
          });
        } catch {
          /* ignore */
        }
      }
      if (path === "faculty") {
        applyFacultyOnboarding({
          institution: "Private University (Nashville region)",
          targetYardId: yardId === "tsu" ? "meharry" : yardId,
          department: "Research / Public Health",
        });
        try {
          const prefs = loadUiPrefs();
          saveUiPrefs({
            ...prefs,
            showFacultyNav: true,
            startPath: "/connect",
          });
        } catch {
          /* ignore */
        }
      }

      // Join HBCU intranet backbone (shared relays + all-yard tags)
      try {
        await ensureIntranetConnected(yardId);
      } catch {
        /* mesh optional on first join if offline */
      }

      const next =
        path === "med_focus"
          ? "/focus"
          : path === "faculty"
            ? "/faculty"
            : "/feed";
      setPostJoinPath(next);
      setJoinedHandle(cleanHandle);
      setCreatedNsec(identity.nsecHex);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create account");
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    <div className="space-y-6 text-center" key="welcome">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
        <Globe className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-3xl font-bold font-serif tracking-tight">
        Welcome to <BrandMark size="lg" className="inline-block align-middle" />
      </h2>
      <p className="text-lg text-muted-foreground">{BRAND.tagline}</p>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Customizable campus social — Facebook wall + IG grid + Threads talk,
        Myspace page, Newgrounds uploads. Your HBCU. Scroll first.
      </p>
      <div className="grid grid-cols-3 gap-3 text-sm pt-2">
        <div className="bg-card p-3 rounded-xl border">
          <Users className="w-5 h-5 text-primary mx-auto mb-1.5" />
          <p className="font-medium text-xs">Campus</p>
          <p className="text-muted-foreground text-[11px]">Your yard</p>
        </div>
        <div className="bg-card p-3 rounded-xl border">
          <Sparkles className="w-5 h-5 text-primary mx-auto mb-1.5" />
          <p className="font-medium text-xs">Wall + grid</p>
          <p className="text-muted-foreground text-[11px]">Text, pics, talk</p>
        </div>
        <div className="bg-card p-3 rounded-xl border">
          <Coins className="w-5 h-5 text-primary mx-auto mb-1.5" />
          <p className="font-medium text-xs">Your page</p>
          <p className="text-muted-foreground text-[11px]">Customize it</p>
        </div>
      </div>
      {isTauri() && (
        <div className="text-left space-y-2 pt-2">
          <p className="text-xs font-medium text-center">
            How should the app look? (this device)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => pickLook("default")}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                chromeSkin === "default"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40",
              )}
            >
              <Sparkles className="w-4 h-4 text-primary mb-1" />
              <p className="text-xs font-medium">Social</p>
              <p className="text-[11px] text-muted-foreground">
                Default yard feed
              </p>
            </button>
            <button
              type="button"
              onClick={() => pickLook("terminal")}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                chromeSkin === "terminal"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40",
              )}
            >
              <TerminalSquare className="w-4 h-4 text-primary mb-1" />
              <p className="text-xs font-medium">Terminal</p>
              <p className="text-[11px] text-muted-foreground">
                Night · mono · status line
              </p>
            </button>
          </div>
        </div>
      )}
    </div>,

    <div className="space-y-5" key="path">
      <h2 className="text-2xl font-bold font-serif text-center">
        Your campus & how you start
      </h2>
      <p className="text-center text-sm text-muted-foreground">
        Most students pick <strong className="text-foreground">Student</strong>{" "}
        and their school. You&apos;ll land on Home with a short guide.
      </p>
      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => {
            setPath("general");
            if (yardId === "meharry") setYardId("tsu");
          }}
          className={cn(
            "text-left rounded-xl border p-4 transition-colors",
            path === "general"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/40",
          )}
        >
          <div className="flex items-center gap-2 font-medium text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            Student · social home
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Recommended — feed, post, yards, events. Like other social apps.
          </p>
        </button>
        <button
          type="button"
          onClick={() => {
            setPath("med_focus");
            setYardId("meharry");
          }}
          className={cn(
            "text-left rounded-xl border p-4 transition-colors",
            path === "med_focus"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/40",
          )}
        >
          <div className="flex items-center gap-2 font-medium text-sm">
            <HeartPulse className="w-4 h-4 text-primary" />
            Med school · Focus Path
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Optional — med school study tools (Meharry-first). Skip if you just
            want the social feed.
          </p>
        </button>
        <button
          type="button"
          onClick={() => {
            setPath("faculty");
            setYardId("meharry");
          }}
          className={cn(
            "text-left rounded-xl border p-4 transition-colors",
            path === "faculty"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/40",
          )}
        >
          <div className="flex items-center gap-2 font-medium text-sm">
            <Building2 className="w-4 h-4 text-primary" />
            Faculty · post opportunities
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Optional — for staff posting jobs/research for students.
          </p>
        </button>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5" />
          Your school (home yard)
        </Label>
        <p className="text-[11px] text-muted-foreground">
          This is your default campus feed — you can visit other yards anytime.
        </p>
        <YardPicker value={yardId} onChange={setYardId} maxVisible={8} />
      </div>
    </div>,

    <div className="space-y-6" key="profile">
      <h2 className="text-2xl font-bold font-serif text-center">
        Pick a name & handle
      </h2>
      <p className="text-center text-muted-foreground text-sm">
        {path === "med_focus"
          ? "Next screen: Focus tools for study. You can open Home anytime."
          : path === "faculty"
            ? "Next: Faculty desk to post opportunities."
            : "Then you land on Home for your school — post when you're ready. No wallet needed."}
      </p>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Display Name</Label>
          <Input
            id="name"
            placeholder="Your name (e.g., Nina J.)"
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
          <p className="text-xs text-muted-foreground">
            You&apos;ll show up as @{handle || "your_handle"} · yard{" "}
            <span className="text-primary">{yardId}</span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Next: pick a password you remember.
        </p>
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>,
  ];

  if (createdNsec) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-lg border-primary/10">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-serif">
                Get back in
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Pick a password you already remember.
              </p>
            </CardHeader>
            <CardContent>
              <RecoverySetup
                nsecHex={createdNsec}
                handle={joinedHandle}
                onDone={finishRecoverySetup}
              />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg border-primary/10">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center gap-2 justify-center mb-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-8 h-1 rounded-full transition-colors ${
                    i <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {steps[step]}

            <div className="flex justify-between pt-4">
              {step > 0 ? (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  disabled={saving}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              ) : (
                <div />
              )}

              {step === 2 ? (
                <Button
                  onClick={joinYard}
                  disabled={!handle.trim() || saving}
                  className="rounded-full h-12 px-6 font-bold bg-green-600 hover:bg-green-700"
                >
                  {saving
                    ? "Joining..."
                    : path === "med_focus"
                      ? "Join · open Focus"
                      : path === "faculty"
                        ? "Join · open Faculty Desk"
                        : "Join the Yard"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => setStep(step + 1)}
                  className="rounded-full h-12 px-6 font-bold"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

            {step === 0 && (
              <div className="space-y-3">
                <Button
                  type="button"
                  className="w-full rounded-full h-12 font-bold"
                  onClick={() => {
                    enterGuestMode();
                    navigate("/feed");
                  }}
                >
                  Just browse the yard as a guest
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Opens Home — campus wall. No password. Make a page when you
                  want to post or customize.
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Sign In
                  </Link>
                  {" · "}
                  <Link
                    href="/recover"
                    className="text-primary hover:underline"
                  >
                    Recover
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
