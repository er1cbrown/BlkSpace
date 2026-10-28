import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { getCurrentHandle, hasWebKey } from "@/lib/auth";
import { getHomeYardId } from "@/lib/focus-mode";
import { hostedPost } from "@/lib/hosted-api";
import {
  EARN_CAP_DEFAULT,
  EARN_CAP_MAX,
  EARN_CAP_MIN,
  EARN_CAP_STEP,
  banHandle,
  dismissReport,
  getEarnCap,
  hidePost,
  isYardMod,
  listOpenReports,
  readAppeals,
  readYourScore,
  setEarnCap,
  syncYardMod,
} from "@/lib/yard-mod";

export default function ModPage() {
  const handle = getCurrentHandle();
  const mod = isYardMod(handle);
  const [cap, setCap] = useState(EARN_CAP_DEFAULT);
  const [reports, setReports] = useState(listOpenReports());
  const [appeals, setAppeals] = useState(readAppeals());
  const [score, setScore] = useState(readYourScore());
  const [note, setNote] = useState("");

  useEffect(() => {
    const refresh = () => {
      setCap(getEarnCap());
      setReports(listOpenReports());
      setAppeals(readAppeals());
      setScore(readYourScore());
    };
    refresh();
    void syncYardMod(getHomeYardId(), true);
    window.addEventListener("blkspace-mod", refresh);
    return () => window.removeEventListener("blkspace-mod", refresh);
  }, []);

  const askReview = async () => {
    const text = note.trim();
    if (!text || !hasWebKey()) return;
    const res = await hostedPost("/api/yards/mod/appeal", {
      yardId: getHomeYardId(),
      note: text,
    });
    if (!res.ok) return;
    setNote("");
    await syncYardMod(getHomeYardId(), true);
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Yard mod</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Signed in as @{handle}. Founder mod is @er1cbrown. A score above 0.7
            pauses Typeverse WeixBucks. A hide or a ban applies to this yard for
            every browser.
          </p>
          {score ? (
            <p className="text-sm mt-2">
              Your score is {score.overall.toFixed(2)} ({score.risk}
              {score.paused ? ", earn paused" : ""}).
            </p>
          ) : null}
        </div>

        <section className="space-y-2 border rounded-xl p-4">
          <h2 className="font-semibold">Ask for a review</h2>
          <p className="text-sm text-muted-foreground">
            The pause stays until a mod looks at it. This note does not clear
            the score.
          </p>
          <textarea
            aria-label="Review note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="w-full min-h-20 rounded-md border bg-background p-2 text-sm"
          />
          <Button size="sm" onClick={() => void askReview()}>
            File the note
          </Button>
        </section>

        {!mod ? (
          <p className="text-sm border border-dashed rounded-xl p-4">
            This desk is for yard mods. Reports still go into the queue from the
            feed.
          </p>
        ) : (
          <>
            <section className="space-y-3 border rounded-xl p-4">
              <h2 className="font-semibold">Daily earn cap</h2>
              <p className="text-sm text-muted-foreground">
                Default {EARN_CAP_DEFAULT} WB. You can move it between{" "}
                {EARN_CAP_MIN} and {EARN_CAP_MAX}. Lower starves the yard.
                Higher lets people farm posts.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={EARN_CAP_MIN}
                  max={EARN_CAP_MAX}
                  step={EARN_CAP_STEP}
                  value={cap}
                  onChange={(e) => setCap(setEarnCap(Number(e.target.value)))}
                  aria-label="Daily earn cap"
                />
                <span className="font-mono text-sm w-16">{cap} WB</span>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">Report queue</h2>
              {appeals.length > 0 && (
                <div className="space-y-2">
                  <h2 className="font-semibold">Earn reviews</h2>
                  {appeals.map((appeal) => (
                    <p
                      key={appeal.id}
                      className="text-sm border rounded-xl p-3"
                    >
                      @{appeal.handle}: {appeal.note}
                    </p>
                  ))}
                </div>
              )}
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No open reports.
                </p>
              ) : (
                reports.map((report) => (
                  <div
                    key={report.id}
                    className="border rounded-xl p-3 space-y-2"
                  >
                    <p className="text-sm">
                      Post {report.postId} by @{report.authorHandle} ·{" "}
                      {report.reason}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reported by @{report.reporterHandle}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => hidePost(report.postId, report.id)}
                      >
                        Hide post
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          banHandle(report.authorHandle, report.id)
                        }
                      >
                        Ban @{report.authorHandle}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dismissReport(report.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
