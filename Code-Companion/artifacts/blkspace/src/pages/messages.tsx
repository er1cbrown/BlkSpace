import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  IEEE_ETHICS_PRINCIPLES,
  NO_PHI_POLICY,
  claimLevelLabel,
  declareInstitutionalClaim,
  hasEthicsAck,
  loadInstitutionalClaim,
  type InstitutionalRole,
} from "@/lib/identity-ethics";
import {
  blockHandle,
  canSendSecureDm,
  listThreadMessages,
  listThreads,
  sendSecureDm,
  type SecureDmMessage,
  type SecureDmThread,
} from "@/lib/secure-dm";
import { getCurrentHandle } from "@/lib/auth";
import { useGuestMode } from "@/lib/guest-mode";
import { GuestCTA } from "@/components/social/GuestCTA";
import { ExperimentalMessagingWarning } from "@/components/ui/experimental-messaging-warning";
import {
  AlertTriangle,
  MessageSquare,
  Send,
  Shield,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Handle-based secure messaging + ethical identity.
 * Faculty and students use the same handle identity; no fake SSO.
 */
export default function MessagesPage() {
  const { isGuest } = useGuestMode();
  const me = getCurrentHandle();
  const [loc] = useLocation();
  const peerParam =
    new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    ).get("to") ||
    (loc.includes("?")
      ? new URLSearchParams(loc.split("?")[1] || "").get("to")
      : "") ||
    "";

  const [threads, setThreads] = useState<SecureDmThread[]>([]);
  const [peer, setPeer] = useState(peerParam.replace(/^@/, ""));
  const [messages, setMessages] = useState<SecureDmMessage[]>([]);
  const [body, setBody] = useState("");
  const [phiAck, setPhiAck] = useState(false);
  const [ethicalAck, setEthicalAck] = useState(hasEthicsAck());
  const [claim, setClaim] = useState(() => loadInstitutionalClaim(me));
  const [showEthics, setShowEthics] = useState(!hasEthicsAck());
  const [inst, setInst] = useState(claim?.institution || "");
  const [role, setRole] = useState<InstitutionalRole>(
    claim?.role || "faculty",
  );
  const [domain, setDomain] = useState(claim?.emailDomain || "");
  const [contactEmail, setContactEmail] = useState(claim?.contactEmail || "");

  const refresh = async () => {
    setThreads(await listThreads());
    if (peer) setMessages(await listThreadMessages(peer));
  };

  useEffect(() => {
    void refresh();
  }, [peer]);

  if (isGuest) {
    return (
      <AppShell>
        <GuestCTA fullPage />
      </AppShell>
    );
  }

  const saveClaim = () => {
    try {
      if (!me) throw new Error("Sign in required");
      const c = declareInstitutionalClaim({
        handle: me,
        institution: inst,
        role,
        emailDomain: domain,
        contactEmail,
        noPhiAck: phiAck,
        ethicalAck: ethicalAck,
      });
      setClaim(c);
      setEthicalAck(true);
      setPhiAck(true);
      setShowEthics(false);
      toast.success(
        `Identity claim saved · ${claimLevelLabel(c.claimLevel)} (not campus SSO)`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const send = async () => {
    try {
      await sendSecureDm({
        toHandle: peer,
        body,
        phiAck: true,
        ethicalAck: true,
      });
      setBody("");
      await refresh();
      toast.success("Message sent (handle-to-handle)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const gate = canSendSecureDm();

  return (
    <AppShell wide>
      <div className="space-y-4 max-w-4xl">
        <div className="flex flex-wrap items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Secure messages</h1>
          <Badge variant="outline">Handle identity</Badge>
          {claim && (
            <Badge className="bg-violet-600/90 text-white text-xs capitalize">
              {claim.role} · {claimLevelLabel(claim.claimLevel)}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Every user already has a <strong className="text-foreground">@handle</strong>.
          Messaging is handle-to-handle with ethical security: No-PHI, consent,
          blocks, rate limits. Institutional tags are{" "}
          <strong className="text-foreground">self-attested or domain-declared</strong>{" "}
          — not fake SSO until a real campus IdP is connected.
        </p>

        <ExperimentalMessagingWarning />

        <Card className="border-amber-600/30 bg-amber-950/10">
          <CardContent className="p-3 text-xs space-y-1">
            <p className="font-medium text-amber-100 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {NO_PHI_POLICY.title}
            </p>
            <p className="text-muted-foreground">{NO_PHI_POLICY.body}</p>
          </CardContent>
        </Card>

        {(showEthics || !gate.ok) && (
          <Card className="border-primary/25">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Ethical identity & IEEE-aligned principles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-2">
                {IEEE_ETHICS_PRINCIPLES.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border/60 p-2 text-[11px]"
                  >
                    <p className="font-medium">{p.title}</p>
                    <p className="text-muted-foreground mt-0.5">{p.body}</p>
                  </div>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Institution</Label>
                  <Input
                    value={inst}
                    onChange={(e) => setInst(e.target.value)}
                    placeholder="Meharry / Private University …"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Role</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background text-sm px-2"
                    value={role}
                    onChange={(e) =>
                      setRole(e.target.value as InstitutionalRole)
                    }
                  >
                    {(
                      [
                        "faculty",
                        "student",
                        "staff",
                        "partner",
                        "other",
                      ] as InstitutionalRole[]
                    ).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    Institutional email domain (declared, not SSO)
                  </Label>
                  <Input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="meharry.edu"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    Contact email (org-lead use only, optional)
                  </Label>
                  <Input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@institution.edu"
                    type="email"
                  />
                </div>
              </div>
              <label className="flex gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={phiAck}
                  onChange={(e) => setPhiAck(e.target.checked)}
                />
                I will never send PHI / clinical secrets on BlkSpace
              </label>
              <label className="flex gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={ethicalAck}
                  onChange={(e) => setEthicalAck(e.target.checked)}
                />
                I acknowledge the ethical principles (IEEE-aligned, honesty about claim levels)
              </label>
              <Button
                size="sm"
                disabled={!phiAck || !ethicalAck || !inst.trim()}
                onClick={saveClaim}
              >
                Save ethical identity claim
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Threads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-80 overflow-y-auto">
              {threads.map((t) => (
                <button
                  key={t.threadId}
                  type="button"
                  onClick={() => setPeer(t.peerHandle)}
                  className={`w-full text-left rounded-lg border p-2 text-xs ${
                    peer === t.peerHandle
                      ? "border-primary bg-primary/10"
                      : "border-border/60"
                  }`}
                >
                  <p className="font-medium">@{t.peerHandle}</p>
                  <p className="text-muted-foreground line-clamp-1">
                    {t.lastBody}
                  </p>
                </button>
              ))}
              {threads.length === 0 && (
                <p className="text-xs text-muted-foreground">No threads yet</p>
              )}
              <div className="pt-2 space-y-1">
                <Label className="text-xs">Message @handle</Label>
                <Input
                  value={peer}
                  onChange={(e) => setPeer(e.target.value.replace(/^@/, ""))}
                  placeholder="student_handle"
                  className="h-8"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">
                {peer ? `Chat · @${peer}` : "Select or enter a handle"}
              </CardTitle>
              {peer && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 h-8"
                  onClick={() => {
                    blockHandle(peer);
                    toast.message(`Blocked @${peer}`);
                    setPeer("");
                    void refresh();
                  }}
                >
                  <Ban className="w-3 h-3" /> Block
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="min-h-[200px] max-h-72 overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/20">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`text-sm max-w-[85%] rounded-lg px-3 py-2 ${
                      m.fromHandle === me
                        ? "ml-auto bg-primary/20"
                        : "bg-background border"
                    }`}
                  >
                    <p className="text-[10px] text-muted-foreground mb-0.5">
                      @{m.fromHandle}
                    </p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
                {peer && messages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No messages yet — keep it professional, no PHI.
                  </p>
                )}
              </div>
              <Textarea
                placeholder={
                  peer
                    ? "Message (blocked if it looks like clinical PHI)…"
                    : "Pick a handle first"
                }
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                disabled={!peer || !gate.ok}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={!peer || !body.trim() || !gate.ok}
                  onClick={() => void send()}
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </Button>
                <Link href="/connect/inbox">
                  <Button size="sm" variant="outline">
                    Lead inbox
                  </Button>
                </Link>
                <Link href="/faculty">
                  <Button size="sm" variant="ghost">
                    Faculty Desk
                  </Button>
                </Link>
              </div>
              {!gate.ok && (
                <p className="text-xs text-destructive">{gate.reason}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
