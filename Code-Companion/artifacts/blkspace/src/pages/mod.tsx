import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { getCurrentHandle } from "@/lib/auth";
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
  setEarnCap,
} from "@/lib/yard-mod";

export default function ModPage() {
  const handle = getCurrentHandle();
  const mod = isYardMod(handle);
  const [cap, setCap] = useState(EARN_CAP_DEFAULT);
  const [reports, setReports] = useState(listOpenReports());

  useEffect(() => {
    const refresh = () => {
      setCap(getEarnCap());
      setReports(listOpenReports());
    };
    refresh();
    window.addEventListener("blkspace-mod", refresh);
    return () => window.removeEventListener("blkspace-mod", refresh);
  }, []);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Yard mod</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Signed in as @{handle}. Founder mod is @er1cbrown.
          </p>
        </div>

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
