import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Headphones,
  Mic,
  Radio,
  ExternalLink,
  Plus,
  Trash2,
  Users,
  MonitorPlay,
  Film,
} from "lucide-react";
import { LiveStreamPlayer } from "@/components/media/LiveStreamPlayer";
import { YardLiveIngest } from "@/components/community/YardLiveIngest";
import { WatchTogether } from "@/components/community/WatchTogether";
import {
  createLiveRoom,
  deleteLiveRoom,
  isSafeExternalLiveUrl,
  jitsiUrl,
  joinLiveRoom,
  leaveLiveRoom,
  listLiveRooms,
  type LiveRoomKind,
  type YardLiveRoom,
} from "@/lib/yard-live-rooms";
import { parseWatchSource } from "@/lib/yard-room-watch";
import { getCurrentHandle } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Discord/Slack-style live rooms for a yard.
 * Uses public Jitsi for voice/video stages + optional external Discord/Zoom/YT links.
 */
export function YardLiveRooms({
  yardId,
  communityName,
}: {
  yardId: string;
  communityName: string;
}) {
  const { data: rooms = [], refetch } = useQuery({
    queryKey: ["yard", "rooms", yardId],
    queryFn: () => listLiveRooms(yardId),
  });

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<LiveRoomKind>("stage");
  const [externalUrl, setExternalUrl] = useState("");
  const [watchTicket, setWatchTicket] = useState("");
  const [active, setActive] = useState<YardLiveRoom | null>(null);
  const me = getCurrentHandle();

  const refresh = () => {
    void refetch();
  };

  const create = async () => {
    if (
      kind === "external" &&
      externalUrl &&
      !isSafeExternalLiveUrl(externalUrl)
    ) {
      toast.error(
        "Use https Discord / Zoom / YouTube / Twitch / Meet / .edu link",
      );
      return;
    }
    if (kind === "watch") {
      const parsed = parseWatchSource(watchTicket);
      if (!parsed.ok) {
        toast.error(parsed.reason);
        return;
      }
    }
    let room: YardLiveRoom;
    try {
      room = await createLiveRoom({
        yardId,
        title: title || `${communityName} stage`,
        kind,
        externalUrl: kind === "external" ? externalUrl : undefined,
        watchTicket: kind === "watch" ? watchTicket : undefined,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not open that room.",
      );
      return;
    }
    setTitle("");
    setExternalUrl("");
    setWatchTicket("");
    refresh();
    toast.success(`Room “${room.title}” open`);
    openRoom(room);
  };

  const openRoom = (room: YardLiveRoom) => {
    const joined = joinLiveRoom(room.id) || room;
    setActive(joined);
    refresh();
  };

  const closeActive = () => {
    if (active) leaveLiveRoom(active.id);
    setActive(null);
    refresh();
  };

  const remove = async (id: string) => {
    if (active?.id === id) closeActive();
    try {
      await deleteLiveRoom(id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not close that room.",
      );
    }
    refresh();
  };

  const watchPlay = (() => {
    if (active?.kind !== "watch" || !active.externalUrl) return "";
    const parsed = parseWatchSource(active.externalUrl, { stored: true });
    if (!parsed.ok) return "";
    return parsed.ticket.playUrl || parsed.ticket.syncplayUrl || "";
  })();
  const joinHref = !active
    ? ""
    : active.kind === "watch"
      ? watchPlay
      : active.kind === "external" && active.externalUrl
        ? active.externalUrl
        : jitsiUrl(active);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            Live rooms
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Voice and video rooms stay on Jitsi. Camera live sends the picture
            from the host's browser to people who join. A YouTube or Twitch link
            plays in the room.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Room name</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Study hall voice · Homecoming stage"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as LiveRoomKind)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stage">Stage (video + screen)</SelectItem>
                  <SelectItem value="voice">
                    Voice (Jitsi audio-first)
                  </SelectItem>
                  <SelectItem value="external">
                    Live link (YouTube / Twitch / Zoom)
                  </SelectItem>
                  <SelectItem value="watch">Watch together</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {kind === "external" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Live link</Label>
              <Input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=… or twitch.tv/…"
                className="h-9 text-xs"
              />
            </div>
          )}
          {kind === "watch" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Library file</Label>
              <Input
                value={watchTicket}
                onChange={(e) => setWatchTicket(e.target.value)}
                placeholder="http://127.0.0.1:8096/…/clip.mp4 or a watch ticket"
                className="h-9 text-xs"
              />
            </div>
          )}
          <Button type="button" size="sm" className="gap-1.5" onClick={create}>
            <Plus className="w-4 h-4" />
            Open room
          </Button>
        </CardContent>
      </Card>

      <YardLiveIngest yardId={yardId} />

      <div className="grid gap-2">
        {rooms.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-xl">
            No live rooms yet — open a stage for {communityName}.
          </p>
        )}
        {rooms.map((room) => {
          const isOpen = active?.id === room.id;
          return (
            <Card
              key={room.id}
              className={cn(
                "border-border/60",
                isOpen && "border-primary/40 ring-1 ring-primary/20",
              )}
            >
              <CardContent className="p-3 flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0 flex items-start gap-2">
                  {room.kind === "voice" ? (
                    <Mic className="w-4 h-4 text-primary mt-0.5" />
                  ) : room.kind === "external" ? (
                    <Radio className="w-4 h-4 text-primary mt-0.5" />
                  ) : room.kind === "watch" ? (
                    <Film className="w-4 h-4 text-primary mt-0.5" />
                  ) : (
                    <MonitorPlay className="w-4 h-4 text-primary mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-sm truncate">{room.title}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize"
                      >
                        {room.kind}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <Users className="w-3 h-3" />
                        {room.present.length}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        by @{room.createdBy}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant={isOpen ? "secondary" : "default"}
                    onClick={() => (isOpen ? closeActive() : openRoom(room))}
                  >
                    {isOpen ? "Leave" : "Join"}
                  </Button>
                  {(room.createdBy === me || room.present.length === 0) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => remove(room.id)}
                      aria-label="Delete room"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {active && (
        <Card className="border-primary/25 overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base truncate">
              In room: {active.title}
            </CardTitle>
            <div className="flex gap-2 shrink-0">
              {joinHref.startsWith("http") && (
                <Button size="sm" variant="outline" className="gap-1" asChild>
                  <a href={joinHref} target="_blank" rel="noopener noreferrer">
                    Open tab
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={closeActive}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-2">
            {active.kind === "watch" ? (
              <WatchTogether room={active} />
            ) : active.kind === "external" && active.externalUrl ? (
              <LiveStreamPlayer url={active.externalUrl} title={active.title} />
            ) : (
              <iframe
                title={active.title}
                src={jitsiUrl(active)}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full h-[min(70vh,520px)] rounded-lg border bg-black"
              />
            )}
            <p className="text-[10px] text-muted-foreground px-3 py-2">
              {active.kind === "watch"
                ? "The library sends the file. This room only shares the clock."
                : active.kind === "external"
                  ? "The stage plays here when the link is YouTube, Twitch, or a media file."
                  : "Voice and video use public Jitsi. Mute when idle."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
