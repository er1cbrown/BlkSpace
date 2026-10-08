import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type OutboxFile = { name: string; bytes: number };

type ShareBody = { ok?: boolean; ticket?: string; error?: string };
type ReceiveBody = { ok?: boolean; detail?: string; error?: string };

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T;
}

export function SendmeLaneCard({ fileLane }: { fileLane?: string }) {
  const [files, setFiles] = useState<OutboxFile[]>([]);
  const [listError, setListError] = useState("");
  const [ticket, setTicket] = useState("");
  const [paste, setPaste] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setListError("");
    try {
      const res = await fetch("/api/weixnet/outbox");
      const body = await readJson<{ files?: OutboxFile[]; error?: string }>(res);
      if (!res.ok) throw new Error(body.error || "The outbox did not answer.");
      setFiles(Array.isArray(body.files) ? body.files : []);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "The outbox did not answer.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const share = async (name: string) => {
    setBusy(name);
    setNote("");
    try {
      const res = await fetch("/api/weixnet/sendme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file: name }),
      });
      const body = await readJson<ShareBody>(res);
      if (!res.ok || !body.ticket) throw new Error(body.error || "Share did not start.");
      setTicket(body.ticket);
      setPaste(body.ticket);
      setNote("Ticket is live. Leave this window open until the file is received.");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Share did not start.");
    } finally {
      setBusy("");
    }
  };

  const receive = async () => {
    const value = paste.trim();
    if (!value) {
      setNote("Paste a ticket first.");
      return;
    }
    setBusy("receive");
    setNote("");
    try {
      const res = await fetch("/api/weixnet/receive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticket: value }),
      });
      const body = await readJson<ReceiveBody>(res);
      if (!res.ok) throw new Error(body.error || "Receive did not finish.");
      setNote(body.detail ? `Received. ${body.detail}` : "Received into the inbox.");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Receive did not finish.");
    } finally {
      setBusy("");
    }
  };

  const copy = async () => {
    if (!ticket) return;
    try {
      await navigator.clipboard.writeText(ticket);
      setNote("Ticket copied.");
    } catch {
      setNote("Copy failed. Select the ticket and copy it.");
    }
  };

  const blocked = fileLane === "unavailable";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">File lane</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          {blocked
            ? "Sendme is not available on this machine, so a file cannot leave from here."
            : "Share a file from this laptop. The ticket appears here. The other side pastes that ticket to receive it."}
        </p>
        {listError ? <p>{listError}</p> : null}
        {files.length === 0 && !listError ? (
          <p className="text-muted-foreground">No files are in the outbox yet.</p>
        ) : (
          <ul className="space-y-2">
            {files.map((file) => (
              <li key={file.name} className="flex items-center justify-between gap-3">
                <span>
                  {file.name}{" "}
                  <span className="text-muted-foreground">{file.bytes} bytes</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  disabled={blocked || busy !== ""}
                  onClick={() => void share(file.name)}
                >
                  {busy === file.name ? "Sharing…" : "Share"}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {ticket ? (
          <div className="space-y-2">
            <p className="break-all font-mono text-xs">{ticket}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
              Copy ticket
            </Button>
          </div>
        ) : null}
        <div className="flex gap-2">
          <Input
            value={paste}
            onChange={(event) => setPaste(event.target.value)}
            placeholder="Paste a sendme ticket"
            disabled={blocked}
            aria-label="Sendme ticket"
          />
          <Button type="button" disabled={blocked || busy !== ""} onClick={() => void receive()}>
            {busy === "receive" ? "Receiving…" : "Receive"}
          </Button>
        </div>
        {note ? <p>{note}</p> : null}
      </CardContent>
    </Card>
  );
}
