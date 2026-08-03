import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "lucide-react";
import {
  createNostrIdentity,
  storeIdentity,
  authenticateWithNostr,
  enterGuestMode,
} from "@/lib/auth";
import { isTauri, tauriCreateUser, tauriUpdateUser } from "@/lib/tauri-api";
import { markFirstRunComplete } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { BrandMark } from "@/components/brand/BrandMark";
import { applyMedSchoolOnboarding } from "@/lib/focus-mode";
import { applyFacultyOnboarding } from "@/lib/faculty-desk";
import { getYardTheme } from "@/lib/yard-themes";
import { YardPicker } from "@/components/ui-prefs/YardPicker";
import { loadUiPrefs, saveUiPrefs } from "@/lib/ui-prefs";
import { ensureIntranetConnected } from "@/lib/hbcu-intranet";
import { cn } from "@/lib/utils";

type OnboardingPath = "general" | "med_focus" | "faculty";

export default function WelcomePage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [path, setPath] = useState<OnboardingPath>("general");
  const [yardId, setYardId] = useState("tsu");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalSteps = 3;

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
      await storeIdentity(
        token,
        cleanHandle,
        identity.nsecHex,
        cleanName,
      );
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
        saveUiPrefs({ ...prefs, homeYardId: yardId });
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

      markFirstRunComplete();
      navigate(
        path === "med_focus"
          ? "/focus"
          : path === "faculty"
            ? "/faculty"
            : "/feed",
      );
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
      <p className="text-sm text-muted-foreground">
        Amalgamation social for underrepresented networks — yards, media,
        Connect, soft earn literacy. Campus first, not campus only.
      </p>
      <div className="grid grid-cols-3 gap-4 text-sm pt-4">
        <div className="bg-card p-4 rounded-xl border">
          <Users className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="font-medium">Your Yard</p>
          <p className="text-muted-foreground text-xs">
            100+ public & private HBCUs
          </p>
        </div>
        <div className="bg-card p-4 rounded-xl border">
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="font-medium">Your Posts</p>
          <p className="text-muted-foreground text-xs">Nobody can take them down</p>
        </div>
        <div className="bg-card p-4 rounded-xl border">
          <Coins className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="font-medium">Your Earnings</p>
          <p className="text-muted-foreground text-xs">Earn WeixBucks to post</p>
        </div>
      </div>
    </div>,

    <div className="space-y-5" key="path">
      <h2 className="text-2xl font-bold font-serif text-center">
        How do you want to start?
      </h2>
      <p className="text-center text-sm text-muted-foreground">
        Pick a path — you can always open Feed, Hub, or Focus later.
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
            Full yard social
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Feed, Hub, Connect, events — classic amalgamation home.
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
            Meharry / HBCU med: study refresh, low-bandwidth ProjectConnect,
            time + money effort — not a second residency.
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
            Faculty · provide opportunities
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Private uni / partner faculty: ProjectConnect Desk — post RA roles,
            meet Meharry & HBCU students where they already are.
          </p>
        </button>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5" />
          Home yard — any public or private HBCU
        </Label>
        <YardPicker value={yardId} onChange={setYardId} maxVisible={8} />
      </div>
    </div>,

    <div className="space-y-6" key="profile">
      <h2 className="text-2xl font-bold font-serif text-center">
        Join the Yard
      </h2>
      <p className="text-center text-muted-foreground text-sm">
        {path === "med_focus"
          ? "After you join, we open Focus Path with study refresh + efficient Connect."
          : path === "faculty"
            ? "After you join, we open Faculty Desk to post opportunities for underrepresented students."
            : "Pick a handle and you're in. No wallet, no setup — just post and earn."}
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
          Your account is secured automatically. Save your backup code later in
          Settings when you&apos;re ready to cash out.
        </p>
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg border-primary/10">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
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
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Sign In
                  </Link>
                  {" · "}
                  <Link href="/recover" className="text-primary hover:underline">
                    Recover
                  </Link>
                </p>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      enterGuestMode();
                      navigate("/feed");
                    }}
                    className="text-xs text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4"
                  >
                    Just browse the yard as a guest
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
