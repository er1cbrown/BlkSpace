import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isTauri, tauriReadScripture } from "@/lib/tauri-api";
import { BookOpen } from "lucide-react";

export default function ScripturePage() {
  const [query, setQuery] = useState("John 3:16");
  const [versions, setVersions] = useState("KJV");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");
    setResult("");
    try {
      if (isTauri()) {
        const out = await tauriReadScripture(query, versions, "auto", true, false);
        setResult(out);
      } else {
        const res = await fetch(
          `https://bible-api.com/${encodeURIComponent(query)}?translation=kjv`,
        );
        const body = await res.json();
        setResult(JSON.stringify(body, null, 2));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Scripture
        </h1>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="John 3:16"
          />
          <Input
            value={versions}
            onChange={(e) => setVersions(e.target.value)}
            placeholder="KJV"
            className="w-24"
          />
          <Button onClick={run} disabled={loading}>
            {loading ? "Loading..." : "Read"}
          </Button>
        </div>
        {error && <pre className="text-red-500 whitespace-pre-wrap">{error}</pre>}
        {result && (
          <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded">
            {result}
          </pre>
        )}
      </div>
    </AppShell>
  );
}
