import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radio, Video } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCurrentHandle } from "@/lib/auth";
import {
  endYardLive,
  joinYardLive,
  listYardLive,
  readYardLive,
  sendLiveAnswer,
  sendLiveCandidate,
  sendLiveOffer,
  startYardLive,
  yardIceServers,
  type YardLiveSession,
} from "@/lib/yard-live-ingest";

/**
 * Camera live for people on this yard.
 * The host browser sends the picture. The server only keeps SDP and ICE.
 */
export function YardLiveIngest({ yardId }: { yardId: string }) {
  const { data: sessions = [], refetch } = useQuery({
    queryKey: ["yard", "live", yardId],
    queryFn: () => listYardLive(yardId),
    refetchInterval: 3000,
  });
  const [title, setTitle] = useState("");
  const [hosting, setHosting] = useState<YardLiveSession | null>(null);
  const [watching, setWatching] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const me = getCurrentHandle();

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!hosting || !video || !stream) return;
    video.srcObject = stream;
    video.muted = true;
    void video.play().catch(() => undefined);
  }, [hosting]);

  useEffect(() => {
    if (!hosting) return;
    const stream = streamRef.current;
    if (!stream) return;
    const sessionId = hosting.id;
    const pcs = new Map<string, RTCPeerConnection>();
    const opening = new Set<string>();
    const answered = new Set<string>();
    const seen = new Set<string>();
    let stop = false;

    const tick = async () => {
      if (stop) return;
      const session = await readYardLive(sessionId);
      if (!session) return;
      for (const viewer of session.viewers) {
        if (!pcs.has(viewer.id) && !opening.has(viewer.id)) {
          opening.add(viewer.id);
          const pc = new RTCPeerConnection({ iceServers: yardIceServers() });
          pcs.set(viewer.id, pc);
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
          pc.onicecandidate = (event) => {
            if (!event.candidate) return;
            void sendLiveCandidate(
              sessionId,
              viewer.id,
              "host",
              event.candidate.toJSON(),
            ).catch(() => undefined);
          };
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (offer.sdp) await sendLiveOffer(sessionId, viewer.id, offer.sdp);
        }
        const pc = pcs.get(viewer.id);
        if (pc && viewer.answer && !answered.has(viewer.id)) {
          answered.add(viewer.id);
          await pc.setRemoteDescription({
            type: "answer",
            sdp: viewer.answer,
          });
        }
        if (!pc || !answered.has(viewer.id)) continue;
        for (const raw of viewer.viewerCandidates) {
          const key = `${viewer.id}:viewer:${raw}`;
          if (seen.has(key)) continue;
          seen.add(key);
          await pc.addIceCandidate(JSON.parse(raw)).catch(() => undefined);
        }
      }
    };

    const timer = window.setInterval(() => {
      void tick().catch(() => undefined);
    }, 1000);
    void tick().catch(() => undefined);
    return () => {
      stop = true;
      window.clearInterval(timer);
      pcs.forEach((pc) => pc.close());
    };
  }, [hosting]);

  useEffect(() => {
    if (!watching) return;
    const video = videoRef.current;
    let pc: RTCPeerConnection | null = null;
    let viewerId = "";
    let stop = false;
    const seen = new Set<string>();
    let answered = false;

    const takeHostCandidates = async (
      peer: RTCPeerConnection,
      rows: string[],
    ) => {
      for (const raw of rows) {
        const key = `host:${raw}`;
        if (seen.has(key)) continue;
        seen.add(key);
        await peer.addIceCandidate(JSON.parse(raw)).catch(() => undefined);
      }
    };

    const tick = async () => {
      if (stop || !pc || !viewerId) return;
      const session = await readYardLive(watching);
      if (!session) return;
      const viewer = session.viewers.find((row) => row.id === viewerId);
      if (!viewer?.offer) return;
      if (!answered) {
        answered = true;
        await pc.setRemoteDescription({ type: "offer", sdp: viewer.offer });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (answer.sdp) await sendLiveAnswer(watching, viewerId, answer.sdp);
      }
      await takeHostCandidates(pc, viewer.hostCandidates);
    };

    const open = async () => {
      const viewer = await joinYardLive(watching);
      viewerId = viewer.id;
      pc = new RTCPeerConnection({ iceServers: yardIceServers() });
      pc.ontrack = (event) => {
        if (video) video.srcObject = event.streams[0] || null;
      };
      pc.onicecandidate = (event) => {
        if (!event.candidate || !viewerId) return;
        void sendLiveCandidate(
          watching,
          viewerId,
          "viewer",
          event.candidate.toJSON(),
        ).catch(() => undefined);
      };
      await tick();
    };

    void open().catch((err) => {
      toast.error(
        err instanceof Error ? err.message : "Could not join that camera.",
      );
      setWatching(null);
    });
    const timer = window.setInterval(() => {
      void tick().catch(() => undefined);
    }, 1000);
    return () => {
      stop = true;
      window.clearInterval(timer);
      pc?.close();
    };
  }, [watching]);

  const stopMedia = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const goLive = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("This browser has no camera.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      const session = await startYardLive(
        yardId,
        title.trim() || "Live camera",
      );
      setTitle("");
      setWatching(null);
      setHosting(session);
      void refetch();
      toast.success("Camera is live for this yard");
    } catch (err) {
      stopMedia();
      toast.error(
        err instanceof Error ? err.message : "Could not start the camera.",
      );
    }
  };

  const stopLive = async () => {
    const id = hosting?.id;
    setHosting(null);
    stopMedia();
    if (id) {
      try {
        await endYardLive(id);
      } catch {
        /* the session expires on its own */
      }
    }
    void refetch();
  };

  const watch = (session: YardLiveSession) => {
    stopMedia();
    setHosting(null);
    setWatching(session.id);
  };

  const leaveWatch = () => {
    setWatching(null);
    stopMedia();
  };

  const onAir = Boolean(hosting || watching);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          Camera live
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Go live from this camera. People who join get the picture from your
          browser. This yard keeps the connection notes for the session.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!onAir && (
          <div className="flex flex-wrap gap-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Homecoming camera"
              className="h-9 max-w-xs"
              maxLength={80}
            />
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={goLive}
            >
              <Radio className="w-4 h-4" />
              Go live
            </Button>
          </div>
        )}
        {onAir && (
          <div className="space-y-2">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full max-h-[360px] rounded-lg bg-black"
            />
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {hosting ? `Live as @${me}` : "Watching"}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={hosting ? stopLive : leaveWatch}
              >
                {hosting ? "End camera" : "Leave"}
              </Button>
            </div>
          </div>
        )}
        {!onAir && sessions.length > 0 && (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span>
                  {session.title}{" "}
                  <span className="text-muted-foreground">
                    @{session.hostHandle}
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => watch(session)}
                >
                  Watch
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
