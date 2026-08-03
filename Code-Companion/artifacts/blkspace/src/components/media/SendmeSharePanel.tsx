import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  isTauri,
  tauriCreateBlobShareTicket,
  tauriGetSendmeCliInfo,
  tauriListUserBlobs,
  tauriReceiveBlobShareTicket,
  type TauriBlobInfo,
  type TauriBlobShareTicket,
  type TauriSendmeCliInfo,
} from "@/lib/tauri-api";
import { getSessionToken } from "@/lib/auth";
import {
  isBlkspaceTicket,
  looksLikeExternalSendmeTicket,
  SENDME_DOCS,
  SENDME_INSTALL,
} from "@/lib/sendme-tickets";
import {
  ArrowDownToLine,
  Copy,
  ExternalLink,
  FileUp,
  Loader2,
  Share2,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

/**
 * P2P-style file drop UI inspired by n0 sendme.
 * Yard: content tickets + local/Iroh materialize.
 * Full/ops: optional sendme CLI for live hole-punch tickets.
 */
export function SendmeSharePanel({ compact = false }: { compact?: boolean }) {
  const [blobs, setBlobs] = useState<TauriBlobInfo[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [share, setShare] = useState<TauriBlobShareTicket | null>(null);
  const [ticketIn, setTicketIn] = useState("");
  const [cli, setCli] = useState<TauriSendmeCliInfo | null>(null);
  const [busy, setBusy] = useState<"share" | "recv" | "load" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isTauri()) return;
    const token = getSessionToken();
    if (!token) return;
    setBusy("load");
    try {
      const [list, info] = await Promise.all([
        tauriListUserBlobs(token),
        tauriGetSendmeCliInfo().catch(() => null),
      ]);
      setBlobs(list);
      if (info) setCli(info);
      if (list.length && !selected) setSelected(list[0].hash);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(null);
    }
  }, [selected]);

  useEffect(() => {
    load();
  }, [load]);

  const onShare = async () => {
    const token = getSessionToken();
    if (!token || !selected) {
      toast.error("Sign in and pick a file you uploaded");
      return;
    }
    setBusy("share");
    setMsg(null);
    try {
      const t = await tauriCreateBlobShareTicket(token, selected);
      setShare(t);
      toast.success("Share ticket ready");
    } catch (e) {
      const err = String(e);
      setMsg(err);
      toast.error(err);
    } finally {
      setBusy(null);
    }
  };

  const onReceive = async () => {
    const token = getSessionToken();
    if (!token) {
      toast.error("Sign in to receive");
      return;
    }
    const t = ticketIn.trim();
    if (!t) {
      toast.error("Paste a ticket");
      return;
    }
    if (looksLikeExternalSendmeTicket(t) && !isBlkspaceTicket(t)) {
      toast.message("External sendme ticket", {
        description: `Run: sendme receive ${t.slice(0, 24)}…`,
      });
    }
    setBusy("recv");
    setMsg(null);
    try {
      const r = await tauriReceiveBlobShareTicket(token, t);
      setMsg(`${r.message} — ${r.filename} (${r.source})`);
      toast.success(`Received ${r.filename}`);
      await load();
    } catch (e) {
      const err = String(e);
      setMsg(err);
      toast.error(err.length > 120 ? err.slice(0, 120) + "…" : err);
    } finally {
      setBusy(null);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  if (!isTauri()) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            File drop tickets
          </CardTitle>
          <CardDescription>
            Open the desktop app to share content-addressed tickets (sendme-style).
            Web preview cannot serve Iroh/local blob stores.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>
            True P2P hole-punch:{" "}
            <code className="text-[11px]">{SENDME_INSTALL}</code>
          </p>
          <a
            href={SENDME_DOCS}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            n0-computer/sendme <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" />
              Drop tickets
              <Badge variant="outline" className="text-[10px] font-normal">
                sendme-inspired
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Share a file you uploaded as a portable ticket. Peers materialize from
              local/Iroh store — or use{" "}
              <a
                href={SENDME_DOCS}
                className="text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                sendme
              </a>{" "}
              for live P2P.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => load()}
            disabled={busy === "load"}
          >
            {busy === "load" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium flex items-center gap-1.5">
            <FileUp className="h-3.5 w-3.5" /> Share (send)
          </p>
          {blobs.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No uploads yet — attach a file on Create, then share it here.
            </p>
          ) : (
            <select
              className="w-full text-sm rounded-md border border-border bg-background px-2 py-2"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setShare(null);
              }}
            >
              {blobs.map((b) => (
                <option key={b.hash} value={b.hash}>
                  {b.filename} · {(b.fileSize / 1024).toFixed(1)} KB
                  {b.cid ? " · cid" : ""}
                </option>
              ))}
            </select>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onShare}
              disabled={!selected || busy === "share"}
            >
              {busy === "share" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Share2 className="h-4 w-4 mr-1" />
              )}
              Make ticket
            </Button>
          </div>
          {share && (
            <div className="rounded-md border bg-muted/30 p-2 space-y-2">
              <Textarea
                readOnly
                value={share.ticket}
                className="font-mono text-[11px] min-h-[72px]"
              />
              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => copy(share.ticket)}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy ticket
                </Button>
                <Badge variant={share.bytesAvailable ? "default" : "secondary"}>
                  {share.bytesAvailable ? "bytes on device" : "metadata only"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">{share.p2pHint}</p>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-medium flex items-center gap-1.5">
            <ArrowDownToLine className="h-3.5 w-3.5" /> Receive
          </p>
          <Textarea
            placeholder="Paste blkspace1.… ticket (or raw sendme ticket for CLI hint)"
            value={ticketIn}
            onChange={(e) => setTicketIn(e.target.value)}
            className="font-mono text-[11px] min-h-[64px]"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onReceive}
            disabled={!ticketIn.trim() || busy === "recv"}
          >
            {busy === "recv" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <ArrowDownToLine className="h-4 w-4 mr-1" />
            )}
            Materialize
          </Button>
        </div>

        <div className="rounded-md border border-dashed p-2 space-y-1 text-[11px] text-muted-foreground">
          <p className="font-medium text-foreground flex items-center gap-1">
            <Terminal className="h-3.5 w-3.5" />
            sendme CLI (true P2P)
          </p>
          {cli?.installed ? (
            <p>
              Found: <code>{cli.version || cli.path}</code>
            </p>
          ) : (
            <p>
              Not on PATH. Install: <code>{cli?.installHint || SENDME_INSTALL}</code>
            </p>
          )}
          <p>
            <code>{cli?.sendExample || "sendme send ./file"}</code>
          </p>
          <p>
            <code>{cli?.receiveExample || "sendme receive <ticket>"}</code>
          </p>
          <p className="pt-1">{cli?.note}</p>
        </div>

        {msg && (
          <p className="text-xs whitespace-pre-wrap break-words text-muted-foreground border-t pt-2">
            {msg}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
