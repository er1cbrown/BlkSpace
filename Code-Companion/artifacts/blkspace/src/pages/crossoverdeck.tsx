import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Music2 } from "lucide-react";

export default function CrossoverDeckPage() {
  const [leftUrl, setLeftUrl] = useState("");
  const [rightUrl, setRightUrl] = useState("");
  const [cross, setCross] = useState(0.5);
  const leftRef = useRef<HTMLAudioElement | null>(null);
  const rightRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (leftRef.current) leftRef.current.volume = 1 - cross;
    if (rightRef.current) rightRef.current.volume = cross;
  }, [cross, leftUrl, rightUrl]);

  const playBoth = () => {
    leftRef.current?.play().catch(() => {});
    rightRef.current?.play().catch(() => {});
  };
  const pauseBoth = () => {
    leftRef.current?.pause();
    rightRef.current?.pause();
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Music2 className="h-6 w-6" /> CrossoverDeck — Scripture + Music
        </h1>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Input
              value={leftUrl}
              onChange={(e) => setLeftUrl(e.target.value)}
              placeholder="Left track URL"
            />
            {leftUrl && <audio ref={leftRef} controls src={leftUrl} className="w-full" />}
          </div>
          <div className="space-y-2">
            <Input
              value={rightUrl}
              onChange={(e) => setRightUrl(e.target.value)}
              placeholder="Right track URL"
            />
            {rightUrl && <audio ref={rightRef} controls src={rightUrl} className="w-full" />}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm">Crossfader</div>
          <Slider
            value={[cross * 100]}
            onValueChange={(v) => setCross((v[0] ?? 50) / 100)}
            min={0}
            max={100}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={playBoth}>Play Both</Button>
          <Button variant="outline" onClick={pauseBoth}>
            Pause Both
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
