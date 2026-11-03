import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { isTauri, tauriOpenNotebookInLazyVim } from "@/lib/tauri-api";
import {
  DR_GRADES,
  DR_HOMEWORK_HREF,
  DR_HOSTS,
  DR_PY_NAME,
  drPredictUrl,
  ensureDrProgramNotebook,
  requestDrScore,
  toPercentPy,
  type DrHostId,
  type DrScore,
} from "@/lib/clinyard/dr-program";

const HOST_KEY = "blkspace_dr_host_urls_v1";

function readHostUrls(): Record<DrHostId, string> {
  try {
    const raw = sessionStorage.getItem(HOST_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as Partial<Record<DrHostId, string>>)
      : {};
    return { colab: parsed.colab ?? "", xai: parsed.xai ?? "" };
  } catch {
    return { colab: "", xai: "" };
  }
}

/**
 * Front end for the DR program. The model runs on the GPU URL the student pastes.
 * The file stays in this tab and is not written to the yard.
 */
export function DrScreenProgram() {
  const [host, setHost] = useState<DrHostId>("colab");
  const [urls, setUrls] = useState(readHostUrls);
  const [token, setToken] = useState("");
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [score, setScore] = useState<DrScore | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const endpoint = urls[host];
  const urlCheck = endpoint.trim() ? drPredictUrl(endpoint) : null;
  const ready = consent && !!file && urlCheck?.ok === true && !sending;

  const pickFile = (next: File | null) => {
    setScore(null);
    setError(null);
    setFile(next);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next ? URL.createObjectURL(next) : null;
    });
  };

  const setEndpoint = (value: string) => {
    const next = { ...urls, [host]: value };
    setUrls(next);
    sessionStorage.setItem(HOST_KEY, JSON.stringify(next));
    setScore(null);
    setError(null);
  };

  const scoreImage = async () => {
    if (!file || !ready) return;
    setSending(true);
    setError(null);
    setScore(null);
    try {
      const result = await requestDrScore(endpoint, file, token);
      setScore(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const openLazyVim = async () => {
    const notebook = ensureDrProgramNotebook();
    const body = toPercentPy(notebook);
    if (!isTauri()) {
      const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = DR_PY_NAME;
      link.click();
      URL.revokeObjectURL(url);
      toast(
        "Downloaded the local .py. In LazyVim, Space pc writes the .ipynb.",
      );
      return;
    }
    try {
      const path = await tauriOpenNotebookInLazyVim(
        notebook.title,
        DR_PY_NAME,
        body,
      );
      toast.success(
        path.endsWith(".ipynb")
          ? `Opened ${path}`
          : `Opened ${path}. Press Space pc to write the .ipynb.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">DR screening program</CardTitle>
        <p className="text-sm text-muted-foreground">
          The notebook trains an ImageNet EfficientNet on APTOS grades 0–4. Open
          in LazyVim writes a local percent .py. Space pc in that config runs
          jupytext and writes the .ipynb next to it. This page only sends the
          picture to the GPU host you paste. Hostinger does not run the model.
          The score is not a diagnosis, and the picture is not saved here.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {DR_HOSTS.map((item) => (
            <Button
              key={item.id}
              size="sm"
              type="button"
              variant={host === item.id ? "default" : "outline"}
              onClick={() => setHost(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <label className="block text-sm">
          GPU host
          <Input
            className="mt-1"
            aria-label="GPU host URL"
            placeholder={DR_HOSTS.find((item) => item.id === host)?.placeholder}
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
          />
        </label>
        {urlCheck && !urlCheck.ok && (
          <p className="text-sm text-amber-700">{urlCheck.reason}</p>
        )}
        <label className="block text-sm">
          Host token, optional, this tab only
          <Input
            className="mt-1"
            aria-label="Host token"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          <span>
            This file is a teaching image or a public-dataset image. It is not a
            patient photo. I am sending it only to the GPU host above.
          </span>
        </label>
        <label className="block text-sm">
          Fundus image
          <input
            className="mt-1 block w-full text-sm"
            aria-label="Fundus image"
            type="file"
            accept="image/*"
            onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {preview && (
          <img
            src={preview}
            alt="Local preview of the selected file"
            className="w-full max-w-sm rounded-lg border"
          />
        )}
        <ul className="text-sm space-y-1">
          {DR_GRADES.map((grade) => (
            <li
              key={grade.classIndex}
              className={
                score?.classIndex === grade.classIndex
                  ? "text-teal-700"
                  : "text-muted-foreground"
              }
            >
              {grade.classIndex} {grade.label}. {grade.detail}
            </li>
          ))}
        </ul>
        {score && (
          <p className="text-sm">
            Host score: {score.classIndex} {score.label}, confidence{" "}
            {(score.confidence * 100).toFixed(1)}%. Internal model output. Not a
            diagnosis.
          </p>
        )}
        {error && <p className="text-sm text-amber-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void scoreImage()}
            disabled={!ready}
          >
            {sending ? "Sending…" : "Score on GPU host"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              pickFile(null);
              setConsent(false);
              setToken("");
            }}
          >
            Clear file
          </Button>
          <Link href={DR_HOMEWORK_HREF}>
            <Button type="button" variant="outline">
              Edit in Homework
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={() => void openLazyVim()}
          >
            Open in LazyVim
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The Full app writes dr-screening.py, runs the same jupytext --to ipynb
          command as Space pc, and opens dr-screening.ipynb. The kernel name is
          miniconda. The file is sent as you picked it, including any metadata
          inside it, and yard cookies are not included.
        </p>
      </CardContent>
    </Card>
  );
}
