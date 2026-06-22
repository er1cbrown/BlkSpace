import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  MapPin,
  Users,
  Plus,
  Check,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { getSessionToken } from "@/lib/auth";
import { useGuestMode } from "@/lib/guest-mode";
import { isTauri, type TauriYardEvent } from "@/lib/tauri-api";
import {
  useTauriListYardEvents,
  useTauriCreateYardEvent,
  useTauriRsvpYardEvent,
  useTauriCancelYardEventRsvp,
} from "@/hooks/use-app-data";
import { showEarnFromResult } from "@/components/economy/EarnToast";

type YardEventView = {
  id: number;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt?: string | null;
  createdBy: string;
  createdByDisplayName: string;
  rsvpCount: number;
  userRsvp?: string | null;
};

const fallbackEvents: Record<string, YardEventView[]> = {
  tsu: [
    {
      id: 1,
      title: "Career Fair Prep & Networking",
      description:
        "Resume reviews and employer intros before the TSU career fair.",
      location: "Kean Hall Lobby",
      startsAt: "2026-06-22T18:00:00",
      createdBy: "demo_user",
      createdByDisplayName: "Demo User",
      rsvpCount: 24,
      userRsvp: null,
    },
    {
      id: 2,
      title: "Homecoming Watch Party",
      description: "Tailgate vibes indoors with live game stream.",
      location: "Student Center Ballroom",
      startsAt: "2026-06-28T20:00:00",
      createdBy: "jane_doe",
      createdByDisplayName: "Jane Doe",
      rsvpCount: 67,
      userRsvp: null,
    },
  ],
  howard: [
    {
      id: 1,
      title: "Yard Networking Night",
      description: "Meet founders, alumni, and creators on the yard.",
      location: "Founders Library Plaza",
      startsAt: "2026-06-24T19:00:00",
      createdBy: "jane_doe",
      createdByDisplayName: "Jane Doe",
      rsvpCount: 41,
      userRsvp: null,
    },
  ],
};

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function toView(event: TauriYardEvent): YardEventView {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    createdBy: event.createdBy,
    createdByDisplayName: event.createdByDisplayName,
    rsvpCount: event.rsvpCount,
    userRsvp: event.userRsvp,
  };
}

function defaultStartsAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

function CreateEventDialog({
  communityId,
  communityName,
  isMember,
  open,
  onOpenChange,
}: {
  communityId: string;
  communityName: string;
  isMember: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = open ?? internalOpen;
  const setDialogOpen = onOpenChange ?? setInternalOpen;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState(defaultStartsAt());
  const createEvent = useTauriCreateYardEvent();

  const reset = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setStartsAt(defaultStartsAt());
  };

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error("Event title required");
      return;
    }
    if (!startsAt.trim()) {
      toast.error("Start date required");
      return;
    }
    if (!isTauri()) {
      toast.success(`Event "${title}" created (demo preview)`);
      setDialogOpen(false);
      reset();
      return;
    }
    if (!getSessionToken()) {
      toast.error("Sign in required");
      return;
    }
    if (!isMember) {
      toast.error("Join the yard before creating events");
      return;
    }
    createEvent.mutate(
      {
        communityId,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        startsAt: startsAt.trim(),
      },
      {
        onSuccess: () => {
          toast.success(`Event published to ${communityName}`);
          setDialogOpen(false);
          reset();
        },
        onError: (e) => toast.error(String(e)),
      },
    );
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create yard event</DialogTitle>
          <DialogDescription>
            Homecoming watch parties, study halls, networking nights — members
            earn WB when they RSVP.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              placeholder="e.g. Yard Networking Night"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-desc">Description</Label>
            <Textarea
              id="event-desc"
              placeholder="What's happening? Who should come?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              placeholder="Student Center, Library Plaza..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-starts">Starts</Label>
            <Input
              id="event-starts"
              type="datetime-local"
              value={startsAt.slice(0, 16)}
              onChange={(e) =>
                setStartsAt(
                  e.target.value ? `${e.target.value}:00` : defaultStartsAt(),
                )
              }
            />
          </div>
          {!isMember && isTauri() && (
            <p className="text-xs text-amber-600">
              Join this yard first to publish events.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={createEvent.isPending || !title.trim()}
          >
            {createEvent.isPending ? "Publishing..." : "Publish Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EventCard({
  event,
  communityId,
  isMember,
}: {
  event: YardEventView;
  communityId: string;
  isMember: boolean;
}) {
  const rsvp = useTauriRsvpYardEvent();
  const cancelRsvp = useTauriCancelYardEventRsvp();
  const { isGuest } = useGuestMode();

  const handleRsvp = (status: "going" | "interested") => {
    if (isGuest) {
      toast("Create a free account to RSVP and earn WB.", {
        action: { label: "Sign up", onClick: () => (window.location.hash = "/welcome") },
      });
      return;
    }
    if (!isTauri()) {
      toast.success(
        status === "going"
          ? `You're going to "${event.title}" (demo)`
          : `Marked interested in "${event.title}" (demo)`,
      );
      return;
    }
    if (!getSessionToken()) {
      toast.error("Sign in to RSVP");
      return;
    }
    if (!isMember) {
      toast.error("Join the yard to RSVP and earn WB");
      return;
    }
    rsvp.mutate(
      { communityId, eventId: event.id, status },
      {
        onSuccess: (result) => {
          if (result.earn?.wb) {
            showEarnFromResult(result.earn, `RSVP: ${event.title}`);
          } else {
            toast.success(
              status === "going" ? "You're going!" : "Marked interested",
            );
          }
        },
        onError: (e) => toast.error(String(e)),
      },
    );
  };

  const handleCancel = () => {
    if (!isTauri()) {
      toast.success("RSVP cancelled (demo)");
      return;
    }
    cancelRsvp.mutate(
      { communityId, eventId: event.id },
      {
        onSuccess: () => toast.success("RSVP removed"),
        onError: (e) => toast.error(String(e)),
      },
    );
  };

  const isGoing = event.userRsvp === "going";
  const isInterested = event.userRsvp === "interested";

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-snug">{event.title}</CardTitle>
          {event.userRsvp && (
            <Badge variant="secondary" className="shrink-0 capitalize">
              {event.userRsvp}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Hosted by {event.createdByDisplayName} · @{event.createdBy}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {event.description && (
          <p className="text-muted-foreground leading-relaxed">
            {event.description}
          </p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            {formatEventDate(event.startsAt)}
          </span>
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {event.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-primary" />
            {event.rsvpCount} RSVP{event.rsvpCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant={isGoing ? "default" : "outline"}
            className="gap-1"
            disabled={rsvp.isPending}
            onClick={() => handleRsvp("going")}
          >
            <Check className="w-3.5 h-3.5" />
            {isGoing ? "Going" : "RSVP Going"}
          </Button>
          <Button
            size="sm"
            variant={isInterested ? "secondary" : "outline"}
            className="gap-1"
            disabled={rsvp.isPending}
            onClick={() => handleRsvp("interested")}
          >
            <Star className="w-3.5 h-3.5" />
            {isInterested ? "Interested" : "Interested"}
          </Button>
          {event.userRsvp && (
            <Button
              size="sm"
              variant="ghost"
              disabled={cancelRsvp.isPending}
              onClick={handleCancel}
            >
              Cancel RSVP
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function YardEventsPanel({
  communityId,
  communityName,
  isMember,
  createDialogOpen,
  onCreateDialogOpenChange,
}: {
  communityId: string;
  communityName: string;
  isMember: boolean;
  createDialogOpen?: boolean;
  onCreateDialogOpenChange?: (open: boolean) => void;
}) {
  const { data: tauriEvents, isLoading } = useTauriListYardEvents(communityId);

  const events: YardEventView[] =
    isTauri() && tauriEvents
      ? tauriEvents.map(toView)
      : fallbackEvents[communityId] || fallbackEvents.tsu;

  const upcoming = events.filter((e) => {
    try {
      return new Date(e.startsAt) >= new Date(Date.now() - 86400000);
    } catch {
      return true;
    }
  });

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + 7);
  const buckets: { label: string; items: YardEventView[] }[] = [
    { label: "Today", items: [] },
    { label: "This week", items: [] },
    { label: "Later", items: [] },
  ];
  for (const e of upcoming) {
    const d = new Date(e.startsAt);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    if (d < new Date(dayStart.getTime() + 86400000)) buckets[0].items.push(e);
    else if (d < endOfWeek) buckets[1].items.push(e);
    else buckets[2].items.push(e);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">Yard events</p>
          <p className="text-xs text-muted-foreground">
            Homecoming watch parties, study halls, networking nights — RSVP to
            earn WB.
          </p>
        </div>
        <CreateEventDialog
          communityId={communityId}
          communityName={communityName}
          isMember={isMember}
          open={createDialogOpen}
          onOpenChange={onCreateDialogOpenChange}
        />
      </div>

      {isLoading && isTauri() ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Loading events...
        </p>
      ) : upcoming.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No upcoming events yet. Be the first to host something on the yard.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {buckets.map(
            (bucket) =>
              bucket.items.length > 0 && (
                <div key={bucket.label} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
                    {bucket.label}
                  </h4>
                  <div className="space-y-3">
                    {bucket.items.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        communityId={communityId}
                        isMember={isMember}
                      />
                    ))}
                  </div>
                </div>
              ),
          )}
        </div>
      )}
    </div>
  );
}