/**
 * Yard boards. A yard is the campus. A board is a collection of pins.
 * A pin is a photo plus a short note. Saving copies a pin onto another
 * board in the same yard. The hub gets one culture card per new pin.
 */
import { isSafeHttpUrl } from "@/lib/amalgamation-meta";
import { getCurrentHandle } from "@/lib/auth";
import { publishHubItem } from "@/lib/content-hub";
import { isWebBlobId } from "@/lib/media-web-store";

export const YARD_PIN_STORE = "blkspace_yard_pins_v1";
export const MAX_PIN_BYTES = 4 * 1024 * 1024;

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export interface YardBoard {
  id: string;
  yardId: string;
  title: string;
  authorHandle: string;
  createdAt: string;
}

export interface YardPin {
  id: string;
  yardId: string;
  boardId: string;
  title: string;
  note: string;
  /** `web_` blob id or an http(s) image URL. */
  image: string;
  authorHandle: string;
  createdAt: string;
  hubItemId: string | null;
}

interface Store {
  boards: YardBoard[];
  pins: YardPin[];
}

function empty(): Store {
  return { boards: [], pins: [] };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(YARD_PIN_STORE);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Store;
    return {
      boards: Array.isArray(parsed.boards) ? parsed.boards : [],
      pins: Array.isArray(parsed.pins) ? parsed.pins : [],
    };
  } catch {
    return empty();
  }
}

function save(store: Store) {
  localStorage.setItem(
    YARD_PIN_STORE,
    JSON.stringify({
      boards: store.boards.slice(0, 200),
      pins: store.pins.slice(0, 400),
    }),
  );
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function pinFileOk(file: {
  type: string;
  name: string;
  size: number;
}): string | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const mimeOk = IMAGE_MIME.has(type) || /\.(jpe?g|png|webp|gif)$/.test(name);
  if (!mimeOk) return "Use a photo (jpg, png, webp, gif).";
  if (file.size > MAX_PIN_BYTES) return "That photo is over 4 MB.";
  if (file.size <= 0) return "That file is empty.";
  return null;
}

export function pinImageOk(src: string): boolean {
  const value = src.trim();
  if (isWebBlobId(value)) return true;
  return isSafeHttpUrl(value);
}

export function listBoards(yardId: string): YardBoard[] {
  return load()
    .boards.filter((board) => board.yardId === yardId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

export function listPins(yardId: string, boardId?: string | null): YardPin[] {
  return load()
    .pins.filter(
      (pin) => pin.yardId === yardId && (!boardId || pin.boardId === boardId),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function getPin(id: string): YardPin | null {
  return load().pins.find((pin) => pin.id === id) ?? null;
}

export function createBoard(yardId: string, title: string): YardBoard {
  const name = title.trim();
  if (!name) throw new Error("Name the board");
  if (name.length > 40) throw new Error("Board names stay under 40 characters");
  const yard = yardId.trim();
  if (!yard) throw new Error("Pick a yard");
  const store = load();
  const mine = store.boards.filter((board) => board.yardId === yard);
  if (mine.length >= 24) throw new Error("This yard already has 24 boards");
  if (mine.some((board) => board.title.toLowerCase() === name.toLowerCase())) {
    throw new Error("That board already exists");
  }
  const board: YardBoard = {
    id: newId("board"),
    yardId: yard,
    title: name,
    authorHandle: getCurrentHandle() || "guest",
    createdAt: new Date().toISOString(),
  };
  save({ ...store, boards: [board, ...store.boards] });
  return board;
}

export function addPin(input: {
  yardId: string;
  boardId: string;
  title: string;
  note?: string;
  image: string;
}): YardPin {
  const title = input.title.trim();
  if (!title) throw new Error("Title required");
  const image = input.image.trim();
  if (!pinImageOk(image)) {
    throw new Error("Each pin needs a photo or an https image link");
  }
  const store = load();
  const board = store.boards.find((row) => row.id === input.boardId);
  if (!board || board.yardId !== input.yardId) {
    throw new Error("Pick a board on this yard");
  }
  const onYard = store.pins.filter((pin) => pin.yardId === input.yardId);
  if (onYard.length >= 200) throw new Error("This yard board is full");
  const pin: YardPin = {
    id: newId("pin"),
    yardId: input.yardId,
    boardId: board.id,
    title,
    note: (input.note || "").trim(),
    image,
    authorHandle: getCurrentHandle() || "guest",
    createdAt: new Date().toISOString(),
    hubItemId: null,
  };
  const hub = publishHubItem({
    topic: "culture",
    kind: "pin",
    title,
    body: pin.note || `Pinned on ${board.title}`,
    mediaUrl: image,
    yardId: input.yardId,
    earnHint: "On the yard board · save it to another collection",
  });
  pin.hubItemId = hub.id;
  save({ ...store, pins: [pin, ...store.pins] });
  return pin;
}

/** Copy a pin onto another board in the same yard. */
export function savePinToBoard(pinId: string, boardId: string): YardPin {
  const store = load();
  const pin = store.pins.find((row) => row.id === pinId);
  if (!pin) throw new Error("Pin not found");
  const board = store.boards.find((row) => row.id === boardId);
  if (!board || board.yardId !== pin.yardId) {
    throw new Error("Save it onto a board in this yard");
  }
  if (pin.boardId === board.id) {
    throw new Error("That pin is already on this board");
  }
  const copy: YardPin = {
    id: newId("pin"),
    yardId: pin.yardId,
    boardId: board.id,
    title: pin.title,
    note: pin.note,
    image: pin.image,
    authorHandle: getCurrentHandle() || "guest",
    createdAt: new Date().toISOString(),
    hubItemId: pin.hubItemId,
  };
  save({ ...store, pins: [copy, ...store.pins] });
  return copy;
}
