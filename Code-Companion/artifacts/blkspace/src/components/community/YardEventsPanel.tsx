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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  MapPin,
  Users,
  Plus,
  Check,
  Star,
  Ticket,
  ClipboardList,
  ScanLine,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import { useGuestMode } from "@/lib/guest-mode";
import { isTauri } from "@/lib/tauri-api";
import { embedAmalgamationMeta } from "@/lib/amalgamation-meta";
import {
  CleanDescription,
  LiveLinkButtons,
} from "@/components/media/LiveLinkButtons";
import {
  useTauriListYardEvents,
  useTauriListCommunityRoles,
  useTauriCreateYardEvent,
  useTauriRsvpYardEvent,
  useTauriCancelYardEventRsvp,
  useEventGuests,
  useCheckInEventGuest,
} from "@/hooks/use-app-data";
import { getCurrentHandle } from "@/lib/auth";
import { showEarnFromResult } from "@/components/economy/EarnToast";
import { listOrgs, type ConnectOrg } from "@/lib/project-connect";
import { useQuery } from "@tanstack/react-query";
import type { YardEvent as YardEventFull } from "@/lib/yard-events";

type YardEventView = YardEventFull;

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
  canCreateEvents,
  open,
  onOpenChange,
}: {
  communityId: string;
  communityName: string;
  isMember: boolean;
  canCreateEvents: boolean;
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
  const [capacity, setCapacity] = useState("");
  const [ticketPrice, setTicketPrice] = useState("0");
  const [eventKind, setEventKind] = useState("service");
  const [orgId, setOrgId] = useState("__none__");
  const [requiresOrg, setRequiresOrg] = useState(false);
  const [liveUrl, setLiveUrl] = useState("");
  const createEvent = useTauriCreateYardEvent();

  const { data: orgs = [] } = useQuery({
    queryKey: ["connect", "orgs-events"],
    queryFn: () => listOrgs(),
  });

  const reset = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setStartsAt(defaultStartsAt());
    setCapacity("");
    setTicketPrice("0");
    setEventKind("service");
    setOrgId("__none__");
    setRequiresOrg(false);
    setLiveUrl("");
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
    if (isTauri() && !isMember) {
      toast.error("Join the yard before creating events");
      return;
    }
    if (isTauri() && !canCreateEvents) {
      toast.error("Only yard owners and moderators can publish events");
      return;
    }
    const cap = capacity ? parseInt(capacity, 10) : null;
    const desc = embedAmalgamationMeta(description.trim(), {
      liveUrl: liveUrl.trim() || undefined,
    });
    createEvent.mutate(
      {
        communityId,
        title: title.trim(),
        description: desc,
        location: location.trim(),
        startsAt: startsAt.trim(),
        capacity: cap && cap > 0 ? cap : null,
        orgId: orgId === "__none__" ? null : orgId,
        requiresOrgMember: requiresOrg && orgId !== "__none__",
        ticketPriceWb: parseInt(ticketPrice, 10) || 0,
        eventKind,
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

  if (!canCreateEvents && isTauri()) {
    return null;
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Host a yard event</DialogTitle>
          <DialogDescription>
            Community service, mixers, club nights — members RSVP for a free or
            paid pass. Track guests and check in at the door.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              placeholder="e.g. First Campus Cleanup · Club XYZ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="What's happening? Who should sign up?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-primary" />
              Live stream URL (optional)
            </Label>
            <Input
              placeholder="https://twitch.tv/… · youtube.com/live/… · Discord stage"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Link-out live for now (IG/TikTok/Twitch class). Native ingest later —
              yard RSVP + identity stay on BlkSpace.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input
              placeholder="Student Center, Library Plaza..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Starts</Label>
            <Input
              type="datetime-local"
              value={startsAt.slice(0, 16)}
              onChange={(e) =>
                setStartsAt(
                  e.target.value ? `${e.target.value}:00` : defaultStartsAt(),
                )
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Capacity (optional)</Label>
              <Input
                type="number"
                placeholder="e.g. 40"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ticket (WB)</Label>
              <Input
                type="number"
                value={ticketPrice}
                onChange={(e) => setTicketPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Kind</Label>
            <Select value={eventKind} onValueChange={setEventKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="service">Community service</SelectItem>
                <SelectItem value="study">Study / decompress hour</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="career">Career / networking</SelectItem>
                <SelectItem value="club">Club exclusive</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Club brand (ProjectConnect)</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Optional club" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Open to yard</SelectItem>
                {(orgs as ConnectOrg[]).map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {orgId !== "__none__" && (
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={requiresOrg}
                onChange={(e) => setRequiresOrg(e.target.checked)}
              />
              Club members only (must join org on Connect to RSVP)
            </label>
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

function GuestListDialog({
  event,
  communityId,
  canManage,
}: {
  event: YardEventView;
  communityId: string;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [scan, setScan] = useState("");
  const { data: guests = [], refetch } = useEventGuests(open ? event.id : null);
  const checkIn = useCheckInEventGuest();

  if (!canManage) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <ClipboardList className="w-3.5 h-3.5" />
          Guest list
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Guests · {event.title}</DialogTitle>
          <DialogDescription>
            Track signups, passes, and door check-in (Posh/Eventbrite-style for
            the yard).
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            placeholder="Ticket code or handle"
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            className="text-xs font-mono"
          />
          <Button
            size="sm"
            disabled={checkIn.isPending || !scan.trim()}
            onClick={async () => {
              try {
                const r = await checkIn.mutateAsync({
                  eventId: event.id,
                  ticketOrHandle: scan.trim(),
                  communityId,
                });
                toast.success(
                  r.alreadyCheckedIn
                    ? `Already checked in: @${r.handle}`
                    : `Checked in @${r.handle}`,
                );
                setScan("");
                refetch();
              } catch (e) {
                toast.error(String(e));
              }
            }}
          >
            <ScanLine className="w-3.5 h-3.5 mr-1" />
            Check in
          </Button>
        </div>
        <div className="space-y-2 text-sm">
          {guests.length === 0 && (
            <p className="text-muted-foreground text-xs">No RSVPs yet.</p>
          )}
          {guests.map((g) => (
            <div
              key={g.handle}
              className="flex justify-between items-center border rounded p-2 text-xs gap-2"
            >
              <div className="min-w-0">
                <div className="font-medium">
                  {g.displayName} · @{g.handle}
                </div>
                <div className="text-muted-foreground font-mono truncate">
                  {g.ticketCode || "—"} · {g.status}
                  {g.waitlisted ? " · waitlist" : ""}
                  {g.paidWb > 0 ? ` · ${g.paidWb} WB` : ""}
                </div>
              </div>
              <Badge variant={g.checkedIn ? "default" : "secondary"}>
                {g.checkedIn ? "In" : "Out"}
              </Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EventCard({
  event,
  communityId,
  isMember,
  canManage,
}: {
  event: YardEventView;
  communityId: string;
  isMember: boolean;
  canManage: boolean;
}) {
  const rsvp = useTauriRsvpYardEvent();
  const cancelRsvp = useTauriCancelYardEventRsvp();
  const { isGuest } = useGuestMode();
  const handle = getCurrentHandle();

  const handleRsvp = (status: "going" | "interested") => {
    if (isGuest) {
      toast("Create a free account to RSVP and earn WB.", {
        action: {
          label: "Sign up",
          onClick: () => (window.location.hash = "/welcome"),
        },
      });
      return;
    }
    if (isTauri() && !isMember) {
      toast.error("Join the yard to RSVP and earn WB");
      return;
    }
    rsvp.mutate(
      { communityId, eventId: event.id, status },
      {
        onSuccess: (result) => {
          if (result.waitlisted) {
            toast.message("Added to waitlist — capacity full");
          } else if (result.ticketCode) {
            toast.success(
              `Pass issued: ${result.ticketCode}${
                result.paidWb ? ` · ${result.paidWb} WB` : " · free"
              }`,
            );
          }
          if (result.earn?.wb) {
            showEarnFromResult(result.earn as any, `RSVP: ${event.title}`);
          } else if (!result.ticketCode) {
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
    cancelRsvp.mutate(
      { communityId, eventId: event.id },
      {
        onSuccess: () => toast.success("RSVP removed · ticket refunded if paid"),
        onError: (e) => toast.error(String(e)),
      },
    );
  };

  const isGoing = event.userRsvp === "going" && !event.userWaitlisted;
  const isWaitlist =
    event.userRsvp === "waitlist" || event.userWaitlisted === true;
  const isInterested = event.userRsvp === "interested";
  const going = event.goingCount ?? event.rsvpCount;
  const hostOrMod =
    canManage || event.createdBy === handle;

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-snug">{event.title}</CardTitle>
          <div className="flex flex-wrap gap-1 justify-end">
            {event.eventKind && event.eventKind !== "general" && (
              <Badge variant="outline" className="text-[10px] capitalize">
                {event.eventKind}
              </Badge>
            )}
            {event.requiresOrgMember && (
              <Badge variant="secondary" className="text-[10px]">
                Club only
              </Badge>
            )}
            {(event.ticketPriceWb ?? 0) > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {event.ticketPriceWb} WB
              </Badge>
            )}
            {event.userRsvp && (
              <Badge variant="secondary" className="shrink-0 capitalize text-[10px]">
                {isWaitlist ? "waitlist" : event.userRsvp}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Hosted by {event.createdByDisplayName} · @{event.createdBy}
          {event.orgName ? ` · ${event.orgName}` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <CleanDescription
          description={event.description}
          className="text-muted-foreground leading-relaxed"
        />
        <LiveLinkButtons description={event.description} />
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
            {going} going
            {event.capacity != null
              ? ` / ${event.capacity}${
                  event.spotsRemaining != null
                    ? ` · ${event.spotsRemaining} left`
                    : ""
                }`
              : ""}
            {(event.waitlistCount ?? 0) > 0
              ? ` · ${event.waitlistCount} waitlist`
              : ""}
          </span>
          {(event.ticketPriceWb ?? 0) === 0 && (
            <span className="flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5 text-primary" />
              Free pass
            </span>
          )}
        </div>
        {event.userTicketCode && (
          <div className="text-[11px] font-mono bg-muted/50 rounded px-2 py-1.5">
            Pass · {event.userTicketCode}
            {event.userCheckedIn ? " · checked in" : " · show at door"}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant={isGoing ? "default" : "outline"}
            className="gap-1"
            disabled={rsvp.isPending}
            onClick={() => handleRsvp("going")}
          >
            <Check className="w-3.5 h-3.5" />
            {isGoing
              ? "Going"
              : isWaitlist
                ? "On waitlist"
                : (event.ticketPriceWb ?? 0) > 0
                  ? `Get ticket (${event.ticketPriceWb} WB)`
                  : "Sign up / Going"}
          </Button>
          <Button
            size="sm"
            variant={isInterested ? "secondary" : "outline"}
            className="gap-1"
            disabled={rsvp.isPending}
            onClick={() => handleRsvp("interested")}
          >
            <Star className="w-3.5 h-3.5" />
            Interested
          </Button>
          {event.userRsvp && (
            <Button
              size="sm"
              variant="ghost"
              disabled={cancelRsvp.isPending}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
          <GuestListDialog
            event={event}
            communityId={communityId}
            canManage={!!hostOrMod}
          />
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
  const currentHandle = getCurrentHandle();
  const { data: tauriEvents, isLoading } = useTauriListYardEvents(communityId);
  const { data: roleEntries = [] } = useTauriListCommunityRoles(communityId);
  const myRole = currentHandle
    ? roleEntries.find((e) => e.handle === currentHandle)?.role ||
      (isMember ? "Student" : "")
    : "";
  const canCreateEvents =
    !isTauri() || myRole === "Admin" || myRole === "Yard Mod";
  const canManage = canCreateEvents;

  const events: YardEventView[] = tauriEvents || [];

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
          <h3 className="font-semibold text-sm">Yard events & tickets</h3>
          <p className="text-xs text-muted-foreground">
            RSVP · free/paid pass · capacity · club exclusive · guest check-in
          </p>
        </div>
        <CreateEventDialog
          communityId={communityId}
          communityName={communityName}
          isMember={isMember}
          canCreateEvents={canCreateEvents}
          open={createDialogOpen}
          onOpenChange={onCreateDialogOpenChange}
        />
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading events…</p>
      )}

      {!isLoading && upcoming.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No upcoming events. Hosts can publish community service days, mixers,
            and club nights with signup tracking.
          </CardContent>
        </Card>
      )}

      {buckets.map(
        (b) =>
          b.items.length > 0 && (
            <div key={b.label} className="space-y-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {b.label}
              </p>
              {b.items.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  communityId={communityId}
                  isMember={isMember}
                  canManage={canManage}
                />
              ))}
            </div>
          ),
      )}
    </div>
  );
}
