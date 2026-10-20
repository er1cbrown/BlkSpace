import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PinImage } from "@/components/yard/PinImage";
import { useGuestMode } from "@/lib/guest-mode";
import { webStoreFile } from "@/lib/media-web-store";
import {
  addPin,
  createBoard,
  listBoards,
  listPins,
  pinFileOk,
  savePinToBoard,
} from "@/lib/yard-pins";
import { toast } from "sonner";

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Pinterest-style wall for one yard: boards are collections, pins are photos.
 */
export function YardBoardPanel({
  yardId,
  yardName,
}: {
  yardId: string;
  yardName: string;
}) {
  const { isGuest } = useGuestMode();
  const [tick, setTick] = useState(0);
  const [boardName, setBoardName] = useState("");
  const [activeBoard, setActiveBoard] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);

  const boards = useMemo(() => {
    void tick;
    return listBoards(yardId);
  }, [tick, yardId]);
  const pins = useMemo(() => {
    void tick;
    return listPins(yardId, activeBoard);
  }, [tick, yardId, activeBoard]);

  const signIn = () => {
    toast("Create a free account to pin on this yard", {
      action: {
        label: "Sign up",
        onClick: () => {
          window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/welcome`;
        },
      },
    });
  };

  const addBoard = () => {
    if (isGuest) {
      signIn();
      return;
    }
    try {
      const board = createBoard(yardId, boardName);
      setBoardName("");
      setActiveBoard(board.id);
      setTick((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add a board");
    }
  };

  const onFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const problem = pinFileOk(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readFile(file);
      const saved = await webStoreFile(file, dataUrl);
      setImage(saved.id);
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
      if (!saved.synced) {
        toast("Saved on this device. An https image shows on every phone.");
      }
    } finally {
      setBusy(false);
    }
  };

  const publish = () => {
    if (isGuest) {
      signIn();
      return;
    }
    const boardId = activeBoard || boards[0]?.id;
    if (!boardId) {
      toast.error("Add a board first");
      return;
    }
    try {
      addPin({
        yardId,
        boardId,
        title,
        note,
        image: image || link,
      });
      setTitle("");
      setNote("");
      setLink("");
      setImage("");
      setActiveBoard(boardId);
      setTick((n) => n + 1);
      toast.success("Pinned on the yard board");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not pin");
    }
  };

  const saveOnto = (pinId: string, boardId: string) => {
    if (isGuest) {
      signIn();
      return;
    }
    try {
      savePinToBoard(pinId, boardId);
      setTick((n) => n + 1);
      toast.success("Saved onto that board");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{yardName} board</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Pin a photo, a fit, a flyer, or a link. Boards are collections on this
          yard. Save a pin onto another board when you want it in a second
          place. The hub keeps a copy under Culture.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Button
          type="button"
          size="sm"
          variant={activeBoard === null ? "default" : "outline"}
          onClick={() => setActiveBoard(null)}
        >
          All
        </Button>
        {boards.map((board) => (
          <Button
            key={board.id}
            type="button"
            size="sm"
            variant={activeBoard === board.id ? "default" : "outline"}
            onClick={() => setActiveBoard(board.id)}
          >
            {board.title}
          </Button>
        ))}
        <Input
          value={boardName}
          onChange={(e) => setBoardName(e.target.value)}
          placeholder="New board"
          aria-label="New board name"
          className="h-8 w-36"
        />
        <Button type="button" size="sm" variant="outline" onClick={addBoard}>
          Add board
        </Button>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <Input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Pin title"
        />
        <Textarea
          placeholder="A note. What is this, and do you own the photo?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          aria-label="Pin photo"
          onChange={(e) => {
            void onFile(e.target.files);
            e.target.value = "";
          }}
        />
        <Input
          placeholder="or https:// image link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          aria-label="Pin image link"
        />
        <Button size="sm" disabled={busy || !title.trim()} onClick={publish}>
          Pin to this yard
        </Button>
      </div>

      {pins.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No pins on this view yet.
        </p>
      ) : (
        <div className="columns-2 md:columns-3 gap-3">
          {pins.map((pin) => {
            const board = boards.find((row) => row.id === pin.boardId);
            const others = boards.filter((row) => row.id !== pin.boardId);
            return (
              <article
                key={pin.id}
                className="break-inside-avoid mb-3 rounded-lg border bg-card overflow-hidden"
              >
                <PinImage src={pin.image} alt={pin.title} />
                <div className="p-2 space-y-1">
                  <p className="text-sm font-medium leading-snug">
                    {pin.title}
                  </p>
                  {pin.note && (
                    <p className="text-xs text-muted-foreground">{pin.note}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    @{pin.authorHandle}
                    {board ? ` · ${board.title}` : ""}
                  </p>
                  {others.length > 0 && (
                    <label className="block text-[11px] text-muted-foreground">
                      Save to
                      <select
                        className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-xs"
                        aria-label={`Save ${pin.title}`}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) saveOnto(pin.id, e.target.value);
                          e.target.value = "";
                        }}
                      >
                        <option value="">Choose a board</option>
                        {others.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
