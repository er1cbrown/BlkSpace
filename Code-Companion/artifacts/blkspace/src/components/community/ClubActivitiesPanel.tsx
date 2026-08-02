import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen,
  Gamepad2,
  GraduationCap,
  LayoutTemplate,
  Plus,
  Swords,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentHandle } from "@/lib/auth";
import {
  addReadingEntry,
  applyClubTemplate,
  createReadingCircle,
  createTournament,
  generateTournamentBracket,
  joinReadingCircle,
  listAppliedClubTemplates,
  listClubTemplates,
  listReadingCircles,
  listReadingEntries,
  listTournamentEntrants,
  listTournamentMatches,
  listTournaments,
  registerTournament,
  reportTournamentMatch,
  setReadingCurrent,
  type ReadingCircle,
  type Tournament,
} from "@/lib/club-activities";

export function ClubActivitiesPanel({
  communityId,
}: {
  communityId: string;
}) {
  const [tab, setTab] = useState<"templates" | "reading" | "tournaments">(
    "templates",
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["templates", "Club kits", LayoutTemplate],
            ["reading", "Book / manga", BookOpen],
            ["tournaments", "Tournaments", Trophy],
          ] as const
        ).map(([id, label, Icon]) => (
          <Button
            key={id}
            size="sm"
            variant={tab === id ? "default" : "outline"}
            className="gap-1"
            onClick={() => setTab(id)}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Button>
        ))}
      </div>
      {tab === "templates" && <TemplatesSection communityId={communityId} />}
      {tab === "reading" && <ReadingSection communityId={communityId} />}
      {tab === "tournaments" && (
        <TournamentsSection communityId={communityId} />
      )}
    </div>
  );
}

function TemplatesSection({ communityId }: { communityId: string }) {
  const qc = useQueryClient();
  const { data: templates = [] } = useQuery({
    queryKey: ["club", "templates"],
    queryFn: listClubTemplates,
  });
  const { data: applied = [] } = useQuery({
    queryKey: ["club", "applied", communityId],
    queryFn: () => listAppliedClubTemplates(communityId),
  });
  const apply = useMutation({
    mutationFn: (id: string) => applyClubTemplate(communityId, id),
    onSuccess: (r) => {
      toast.success(
        `Applied ${r.name} · channels: ${(r.channelsCreated || []).join(", ") || "already present"}`,
      );
      qc.invalidateQueries({ queryKey: ["club", "applied", communityId] });
      qc.invalidateQueries({ queryKey: ["tauri", "channels", communityId] });
    },
    onError: (e) => toast.error(String(e)),
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        One-click club kits spin up channels for anime book groups, gaming
        brackets, study hours, or faculty scholarships — no streaming required.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {templates.map((t) => {
          const on = applied.includes(t.id);
          return (
            <Card key={t.id} className="border-primary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between gap-2">
                  {t.name}
                  {on && <Badge variant="secondary">Applied</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="text-muted-foreground">{t.description}</p>
                <div className="flex flex-wrap gap-1">
                  {t.channels.map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px]">
                      #{c}
                    </Badge>
                  ))}
                </div>
                <Button
                  size="sm"
                  disabled={apply.isPending}
                  onClick={() => apply.mutate(t.id)}
                >
                  {on ? "Re-apply channels" : "Apply kit"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ReadingSection({ communityId }: { communityId: string }) {
  const qc = useQueryClient();
  const handle = getCurrentHandle() || "demo_user";
  const { data: circles = [] } = useQuery({
    queryKey: ["club", "circles", communityId],
    queryFn: () => listReadingCircles(communityId),
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [work, setWork] = useState("");
  const [mediaType, setMediaType] = useState("manga");
  const [desc, setDesc] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createReadingCircle({
        communityId,
        title,
        mediaType,
        description: desc,
        currentWork: work,
      }),
    onSuccess: (c) => {
      toast.success("Reading circle created");
      setShowCreate(false);
      setSelected(c.id);
      qc.invalidateQueries({ queryKey: ["club", "circles", communityId] });
    },
    onError: (e) => toast.error(String(e)),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          Book groups · share anime/manga · publish your own pages
        </p>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New circle
        </Button>
      </div>
      {showCreate && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <Input
              placeholder="Circle title (e.g. Weekly Manga Club)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Current work (title)"
              value={work}
              onChange={(e) => setWork(e.target.value)}
            />
            <div className="flex flex-wrap gap-1">
              {["manga", "anime", "book", "webtoon"].map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={mediaType === m ? "default" : "outline"}
                  className="text-xs capitalize"
                  onClick={() => setMediaType(m)}
                >
                  {m}
                </Button>
              ))}
            </div>
            <Textarea
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
            />
            <Button
              size="sm"
              disabled={!title.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              Create circle
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="grid sm:grid-cols-2 gap-2">
        {circles.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelected(c.id)}
            className={`text-left border rounded-lg p-3 text-sm hover:border-primary/40 ${
              selected === c.id ? "border-primary bg-primary/5" : ""
            }`}
          >
            <div className="font-medium flex justify-between gap-2">
              {c.title}
              <Badge variant="outline" className="text-[10px] capitalize">
                {c.mediaType}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Now: {c.currentWork || "—"} {c.currentChapter}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {c.memberCount} members · {c.entryCount} posts
            </div>
          </button>
        ))}
      </div>
      {circles.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No circles yet — start a weekly read for your anime club.
        </p>
      )}
      {selected != null && (
        <CircleDetail
          circle={circles.find((c) => c.id === selected)!}
          handle={handle}
          onChange={() => {
            qc.invalidateQueries({ queryKey: ["club", "circles", communityId] });
            qc.invalidateQueries({ queryKey: ["club", "entries", selected] });
          }}
        />
      )}
    </div>
  );
}

function CircleDetail({
  circle,
  handle,
  onChange,
}: {
  circle: ReadingCircle;
  handle: string;
  onChange: () => void;
}) {
  const { data: entries = [] } = useQuery({
    queryKey: ["club", "entries", circle.id],
    queryFn: () => listReadingEntries(circle.id),
  });
  const [entryType, setEntryType] = useState("note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [chapter, setChapter] = useState("");
  const [mediaRef, setMediaRef] = useState("");
  const [work, setWork] = useState(circle.currentWork);
  const [ch, setCh] = useState(circle.currentChapter);

  const join = useMutation({
    mutationFn: () => joinReadingCircle(circle.id),
    onSuccess: () => {
      toast.success("Joined circle");
      onChange();
    },
  });
  const setCurrent = useMutation({
    mutationFn: () => setReadingCurrent(circle.id, work, ch),
    onSuccess: () => {
      toast.success("Current read updated");
      onChange();
    },
  });
  const publish = useMutation({
    mutationFn: () =>
      addReadingEntry({
        circleId: circle.id,
        entryType,
        title,
        body,
        mediaRef,
        chapterLabel: chapter,
      }),
    onSuccess: () => {
      toast.success("Published to circle");
      setTitle("");
      setBody("");
      onChange();
    },
    onError: (e) => toast.error(String(e)),
  });

  if (!circle) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          {circle.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{circle.description}</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => join.mutate()}>
            Join circle
          </Button>
          <span className="text-xs text-muted-foreground self-center">
            by @{circle.createdBy}
          </span>
        </div>
        {(circle.createdBy === handle || true) && (
          <div className="grid sm:grid-cols-3 gap-2">
            <Input
              placeholder="Current title"
              value={work}
              onChange={(e) => setWork(e.target.value)}
            />
            <Input
              placeholder="Chapter / episode"
              value={ch}
              onChange={(e) => setCh(e.target.value)}
            />
            <Button size="sm" onClick={() => setCurrent.mutate()}>
              Set current read
            </Button>
          </div>
        )}
        <div className="border rounded p-3 space-y-2 bg-muted/20">
          <p className="text-xs font-medium">Share note · publish page · rec</p>
          <div className="flex flex-wrap gap-1">
            {["note", "publish", "chapter", "rec"].map((t) => (
              <Button
                key={t}
                size="sm"
                variant={entryType === t ? "default" : "outline"}
                className="text-xs capitalize"
                onClick={() => setEntryType(t)}
              >
                {t}
              </Button>
            ))}
          </div>
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Thoughts, synopsis, or page description"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Chapter label"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
            />
            <Input
              placeholder="Media ref / CID (optional)"
              value={mediaRef}
              onChange={(e) => setMediaRef(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            disabled={!title.trim() || publish.isPending}
            onClick={() => publish.mutate()}
          >
            Post to circle
          </Button>
        </div>
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="border-l-2 border-primary/30 pl-3 py-1">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="font-medium text-sm">{e.title}</span>
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {e.entryType}
                </Badge>
                {e.chapterLabel && (
                  <span className="text-[10px] text-muted-foreground">
                    {e.chapterLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                @{e.handle} · {e.body}
              </p>
              {e.mediaRef && (
                <p className="text-[10px] font-mono">ref: {e.mediaRef}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TournamentsSection({ communityId }: { communityId: string }) {
  const qc = useQueryClient();
  const handle = getCurrentHandle() || "demo_user";
  const { data: tours = [] } = useQuery({
    queryKey: ["club", "tours", communityId],
    queryFn: () => listTournaments(communityId),
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("");
  const [desc, setDesc] = useState("");
  const [maxP, setMaxP] = useState("8");
  const [prize, setPrize] = useState("");
  const [prizeWb, setPrizeWb] = useState("50");

  const create = useMutation({
    mutationFn: () =>
      createTournament({
        communityId,
        title,
        gameTitle: game,
        description: desc,
        maxPlayers: parseInt(maxP, 10) || 8,
        prizeText: prize,
        prizeWb: parseInt(prizeWb, 10) || 0,
      }),
    onSuccess: (t) => {
      toast.success("Tournament created");
      setShowCreate(false);
      setSelected(t.id);
      qc.invalidateQueries({ queryKey: ["club", "tours", communityId] });
    },
    onError: (e) => toast.error(String(e)),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          Brackets · 1v1 pairings · score reports · WB prizes (no live stream)
        </p>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          <Gamepad2 className="w-3.5 h-3.5 mr-1" /> Host tournament
        </Button>
      </div>
      {showCreate && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <Input
              placeholder="Tournament title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Game (e.g. SF6, Smash, Valorant)"
              value={game}
              onChange={(e) => setGame(e.target.value)}
            />
            <Textarea
              placeholder="Rules, venue, schedule"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                placeholder="Max players"
                value={maxP}
                onChange={(e) => setMaxP(e.target.value)}
              />
              <Input
                placeholder="Prize text"
                value={prize}
                onChange={(e) => setPrize(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Prize WB"
                value={prizeWb}
                onChange={(e) => setPrizeWb(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={!title.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              Create tournament
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="space-y-2">
        {tours.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelected(t.id)}
            className={`w-full text-left border rounded-lg p-3 text-sm hover:border-primary/40 ${
              selected === t.id ? "border-primary bg-primary/5" : ""
            }`}
          >
            <div className="font-medium flex flex-wrap gap-2 items-center">
              <Swords className="w-4 h-4 text-primary" />
              {t.title}
              <Badge variant="outline" className="text-[10px] capitalize">
                {t.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t.gameTitle} · {t.entrantCount}/{t.maxPlayers} ·{" "}
              {t.prizeText || `${t.prizeWb} WB`}
            </div>
          </button>
        ))}
      </div>
      {selected != null && (
        <TournamentDetail
          tour={tours.find((t) => t.id === selected)!}
          handle={handle}
          onChange={() => {
            qc.invalidateQueries({ queryKey: ["club", "tours", communityId] });
            qc.invalidateQueries({ queryKey: ["club", "matches", selected] });
            qc.invalidateQueries({ queryKey: ["club", "entrants", selected] });
          }}
        />
      )}
    </div>
  );
}

function TournamentDetail({
  tour,
  handle,
  onChange,
}: {
  tour: Tournament;
  handle: string;
  onChange: () => void;
}) {
  const { data: entrants = [] } = useQuery({
    queryKey: ["club", "entrants", tour.id],
    queryFn: () => listTournamentEntrants(tour.id),
  });
  const { data: matches = [] } = useQuery({
    queryKey: ["club", "matches", tour.id],
    queryFn: () => listTournamentMatches(tour.id),
  });
  const [scores, setScores] = useState<Record<number, { a: string; b: string }>>(
    {},
  );

  const reg = useMutation({
    mutationFn: () => registerTournament(tour.id),
    onSuccess: () => {
      toast.success("Registered");
      onChange();
    },
    onError: (e) => toast.error(String(e)),
  });
  const bracket = useMutation({
    mutationFn: () => generateTournamentBracket(tour.id),
    onSuccess: () => {
      toast.success("Bracket generated — check 1v1 pairings");
      onChange();
    },
    onError: (e) => toast.error(String(e)),
  });
  const report = useMutation({
    mutationFn: (args: { matchId: number; a: number; b: number }) =>
      reportTournamentMatch(args.matchId, args.a, args.b),
    onSuccess: (m) => {
      toast.success(`Match complete · winner @${m.winner}`);
      onChange();
    },
    onError: (e) => toast.error(String(e)),
  });

  if (!tour) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          {tour.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{tour.description}</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => reg.mutate()} disabled={reg.isPending}>
            Register
          </Button>
          {tour.createdBy === handle && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => bracket.mutate()}
              disabled={bracket.isPending}
            >
              Generate R1 bracket
            </Button>
          )}
        </div>
        <div>
          <p className="text-xs font-medium mb-1">Entrants</p>
          <div className="flex flex-wrap gap-1">
            {entrants.map((e) => (
              <Badge key={e.handle} variant="outline" className="text-[10px]">
                #{e.seed} @{e.handle}
              </Badge>
            ))}
          </div>
        </div>
        {matches.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium">Matches · Round 1</p>
            {matches.map((m) => (
              <div key={m.id} className="border rounded p-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>
                    @{m.playerA || "TBD"} vs @{m.playerB || "BYE"}
                  </span>
                  <Badge
                    variant={m.status === "complete" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {m.status}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {m.channelNote}
                </p>
                {m.status === "pending" && m.playerA && m.playerB && (
                  <div className="flex gap-2 items-center">
                    <Input
                      className="h-8 w-16 text-xs"
                      type="number"
                      placeholder="A"
                      value={scores[m.id]?.a || ""}
                      onChange={(e) =>
                        setScores({
                          ...scores,
                          [m.id]: {
                            a: e.target.value,
                            b: scores[m.id]?.b || "",
                          },
                        })
                      }
                    />
                    <span className="text-xs">-</span>
                    <Input
                      className="h-8 w-16 text-xs"
                      type="number"
                      placeholder="B"
                      value={scores[m.id]?.b || ""}
                      onChange={(e) =>
                        setScores({
                          ...scores,
                          [m.id]: {
                            a: scores[m.id]?.a || "",
                            b: e.target.value,
                          },
                        })
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        report.mutate({
                          matchId: m.id,
                          a: parseInt(scores[m.id]?.a || "0", 10),
                          b: parseInt(scores[m.id]?.b || "0", 10),
                        })
                      }
                    >
                      Report
                    </Button>
                  </div>
                )}
                {m.status === "complete" && (
                  <p className="text-xs">
                    {m.scoreA}-{m.scoreB} · winner @{m.winner}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">
          Pairings also live in #match-reports. Merch & services: Yard Sale tab.
          Link a Yard Event for check-in passes.
        </p>
      </CardContent>
    </Card>
  );
}

/** Quick study-hour preset helper text for Events */
export function StudyHourHint() {
  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground border rounded-lg p-3 bg-muted/20">
      <GraduationCap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div>
        <strong className="text-foreground">Study / decompress hour:</strong>{" "}
        Create an Event with kind <em>study</em>, free pass, optional capacity.
        Apply the Study kit for #focus-hours and #debrief channels.
      </div>
    </div>
  );
}
