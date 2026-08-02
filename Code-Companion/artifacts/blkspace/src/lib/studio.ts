/**
 * Studio portfolio + client shoot delivery (free grant or paid all-in-one unlock).
 */
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri-api";
import { getCurrentHandle, getSessionToken } from "@/lib/auth";

export interface StudioCollection {
  id: number;
  ownerHandle: string;
  title: string;
  description: string;
  coverRef: string;
  visibility: string;
  itemCount: number;
  createdAt: string;
}

export interface StudioCollectionItem {
  id: number;
  collectionId: number;
  mediaRef: string;
  caption: string;
  kind: string;
  sortOrder: number;
  createdAt: string;
}

export interface StudioShoot {
  id: number;
  ownerHandle: string;
  title: string;
  description: string;
  clientHandle: string;
  clientLabel: string;
  accessMode: string;
  priceWb: number;
  status: string;
  hasPin: boolean;
  assetCount: number;
  accessCount: number;
  createdAt: string;
  viewerHasAccess: boolean;
  viewerCanExport: boolean;
}

export interface StudioAsset {
  id: number;
  shootId: number;
  mediaRef: string;
  filename: string;
  caption: string;
  kind: string;
  createdAt: string;
}

const STORE = "blkspace_studio_v1";

type Demo = {
  collections: StudioCollection[];
  items: StudioCollectionItem[];
  shoots: StudioShoot[];
  assets: StudioAsset[];
  access: Record<number, string[]>;
  nextColl: number;
  nextItem: number;
  nextShoot: number;
  nextAsset: number;
};

function defaultDemo(): Demo {
  return {
    collections: [
      {
        id: 1,
        ownerHandle: "demo_user",
        title: "Campus Portraits 2026",
        description:
          "Senior + event photography samples. Book via Yard Sale or DM.",
        coverRef: "portfolio:cover:portraits",
        visibility: "public",
        itemCount: 3,
        createdAt: new Date().toISOString(),
      },
    ],
    items: [
      {
        id: 1,
        collectionId: 1,
        mediaRef: "portfolio:shot:01-golden-hour",
        caption: "Golden hour senior — TSU yard",
        kind: "photo",
        sortOrder: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        collectionId: 1,
        mediaRef: "portfolio:shot:02-homecoming",
        caption: "Homecoming night still",
        kind: "photo",
        sortOrder: 2,
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        collectionId: 1,
        mediaRef: "portfolio:shot:03-studio",
        caption: "Studio headshot sample",
        kind: "photo",
        sortOrder: 3,
        createdAt: new Date().toISOString(),
      },
    ],
    shoots: [
      {
        id: 1,
        ownerHandle: "demo_user",
        title: "Senior Session · Jane",
        description: "Selects + reel. Free grant to client.",
        clientHandle: "jane_doe",
        clientLabel: "Jane D. · Class of 2027",
        accessMode: "free",
        priceWb: 0,
        status: "delivered",
        hasPin: false,
        assetCount: 3,
        accessCount: 2,
        createdAt: new Date().toISOString(),
        viewerHasAccess: false,
        viewerCanExport: false,
      },
      {
        id: 2,
        ownerHandle: "demo_user",
        title: "Org Event Coverage Pack",
        description: "All-in-one paid unlock — 25 WB.",
        clientHandle: "",
        clientLabel: "NSBE media team",
        accessMode: "paid",
        priceWb: 25,
        status: "delivered",
        hasPin: false,
        assetCount: 2,
        accessCount: 1,
        createdAt: new Date().toISOString(),
        viewerHasAccess: false,
        viewerCanExport: false,
      },
    ],
    assets: [
      {
        id: 1,
        shootId: 1,
        mediaRef: "delivery:jane:select-01",
        filename: "select_01.jpg",
        caption: "Hero portrait",
        kind: "photo",
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        shootId: 1,
        mediaRef: "delivery:jane:select-02",
        filename: "select_02.jpg",
        caption: "Campus walk",
        kind: "photo",
        createdAt: new Date().toISOString(),
      },
      {
        id: 3,
        shootId: 1,
        mediaRef: "delivery:jane:reel.mp4",
        filename: "highlight_reel.mp4",
        caption: "15s highlight",
        kind: "video",
        createdAt: new Date().toISOString(),
      },
      {
        id: 4,
        shootId: 2,
        mediaRef: "delivery:nsbe:wide-01",
        filename: "event_wide_01.jpg",
        caption: "Keynote wide",
        kind: "photo",
        createdAt: new Date().toISOString(),
      },
      {
        id: 5,
        shootId: 2,
        mediaRef: "delivery:nsbe:crowd.mp4",
        filename: "crowd_cut.mp4",
        caption: "Crowd b-roll",
        kind: "video",
        createdAt: new Date().toISOString(),
      },
    ],
    access: {
      1: ["demo_user", "jane_doe"],
      2: ["demo_user"],
    },
    nextColl: 2,
    nextItem: 4,
    nextShoot: 3,
    nextAsset: 6,
  };
}

function load(): Demo {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) return JSON.parse(raw) as Demo;
  } catch {
    /* ignore */
  }
  const d = defaultDemo();
  save(d);
  return d;
}

function save(d: Demo) {
  localStorage.setItem(STORE, JSON.stringify(d));
}

function enrichShoot(s: StudioShoot, viewer: string): StudioShoot {
  const d = load();
  const access = (d.access[s.id] || []).includes(viewer) || s.ownerHandle === viewer;
  return {
    ...s,
    viewerHasAccess: access,
    viewerCanExport: access,
    assetCount: d.assets.filter((a) => a.shootId === s.id).length,
    accessCount: (d.access[s.id] || []).length,
  };
}

export async function listCollections(
  ownerHandle: string,
  viewerHandle?: string | null,
): Promise<StudioCollection[]> {
  if (isTauri()) {
    return invoke("studio_list_collections", {
      ownerHandle,
      viewerHandle: viewerHandle ?? null,
    });
  }
  const d = load();
  const isOwner = viewerHandle === ownerHandle;
  return d.collections.filter(
    (c) =>
      c.ownerHandle === ownerHandle &&
      (isOwner || c.visibility === "public"),
  );
}

export async function createCollection(args: {
  title: string;
  description: string;
  coverRef?: string;
  visibility?: string;
}): Promise<StudioCollection> {
  if (isTauri()) {
    return invoke("studio_create_collection", {
      sessionToken: getSessionToken() || "",
      title: args.title,
      description: args.description,
      coverRef: args.coverRef || "",
      visibility: args.visibility || "public",
    });
  }
  const me = getCurrentHandle() || "demo_user";
  const d = load();
  const c: StudioCollection = {
    id: d.nextColl++,
    ownerHandle: me,
    title: args.title,
    description: args.description,
    coverRef: args.coverRef || "",
    visibility: args.visibility || "public",
    itemCount: 0,
    createdAt: new Date().toISOString(),
  };
  d.collections.unshift(c);
  save(d);
  return c;
}

export async function addCollectionItem(args: {
  collectionId: number;
  mediaRef: string;
  caption: string;
  kind: string;
}): Promise<StudioCollectionItem> {
  if (isTauri()) {
    return invoke("studio_add_collection_item", {
      sessionToken: getSessionToken() || "",
      ...args,
    });
  }
  const d = load();
  const item: StudioCollectionItem = {
    id: d.nextItem++,
    collectionId: args.collectionId,
    mediaRef: args.mediaRef,
    caption: args.caption,
    kind: args.kind,
    sortOrder: d.items.filter((i) => i.collectionId === args.collectionId).length + 1,
    createdAt: new Date().toISOString(),
  };
  d.items.push(item);
  const c = d.collections.find((x) => x.id === args.collectionId);
  if (c) {
    c.itemCount += 1;
    if (!c.coverRef) c.coverRef = args.mediaRef;
  }
  save(d);
  return item;
}

export async function listCollectionItems(
  collectionId: number,
): Promise<StudioCollectionItem[]> {
  if (isTauri()) {
    return invoke("studio_list_collection_items", { collectionId });
  }
  return load()
    .items.filter((i) => i.collectionId === collectionId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listMyShoots(): Promise<StudioShoot[]> {
  const me = getCurrentHandle() || "demo_user";
  if (isTauri()) {
    return invoke("studio_list_my_shoots", {
      sessionToken: getSessionToken() || "",
    });
  }
  return load()
    .shoots.filter((s) => s.ownerHandle === me)
    .map((s) => enrichShoot(s, me));
}

export async function listClientDeliveries(): Promise<StudioShoot[]> {
  const me = getCurrentHandle() || "demo_user";
  if (isTauri()) {
    return invoke("studio_list_client_deliveries", {
      sessionToken: getSessionToken() || "",
    });
  }
  const d = load();
  return d.shoots
    .filter(
      (s) =>
        s.status === "delivered" &&
        ((d.access[s.id] || []).includes(me) || s.clientHandle === me),
    )
    .map((s) => enrichShoot(s, me));
}

export async function createShoot(args: {
  title: string;
  description: string;
  clientHandle: string;
  clientLabel: string;
  accessMode: "free" | "paid";
  priceWb: number;
  pinCode?: string;
}): Promise<StudioShoot> {
  if (isTauri()) {
    return invoke("studio_create_shoot", {
      sessionToken: getSessionToken() || "",
      title: args.title,
      description: args.description,
      clientHandle: args.clientHandle,
      clientLabel: args.clientLabel,
      accessMode: args.accessMode,
      priceWb: args.priceWb,
      pinCode: args.pinCode || "",
    });
  }
  const me = getCurrentHandle() || "demo_user";
  const d = load();
  const s: StudioShoot = {
    id: d.nextShoot++,
    ownerHandle: me,
    title: args.title,
    description: args.description,
    clientHandle: args.clientHandle,
    clientLabel: args.clientLabel,
    accessMode: args.accessMode,
    priceWb: args.accessMode === "paid" ? Math.max(1, args.priceWb) : 0,
    status: "draft",
    hasPin: !!args.pinCode,
    assetCount: 0,
    accessCount: 1,
    createdAt: new Date().toISOString(),
    viewerHasAccess: true,
    viewerCanExport: true,
  };
  d.shoots.unshift(s);
  d.access[s.id] = [me];
  if (args.accessMode === "free" && args.clientHandle) {
    d.access[s.id].push(args.clientHandle);
  }
  save(d);
  return s;
}

export async function addShootAsset(args: {
  shootId: number;
  mediaRef: string;
  filename: string;
  caption: string;
  kind: string;
}): Promise<StudioAsset> {
  if (isTauri()) {
    return invoke("studio_add_shoot_asset", {
      sessionToken: getSessionToken() || "",
      ...args,
    });
  }
  const d = load();
  const a: StudioAsset = {
    id: d.nextAsset++,
    shootId: args.shootId,
    mediaRef: args.mediaRef,
    filename: args.filename,
    caption: args.caption,
    kind: args.kind,
    createdAt: new Date().toISOString(),
  };
  d.assets.push(a);
  const s = d.shoots.find((x) => x.id === args.shootId);
  if (s) s.assetCount += 1;
  save(d);
  return a;
}

export async function listShootAssets(shootId: number): Promise<StudioAsset[]> {
  const me = getCurrentHandle() || "demo_user";
  if (isTauri()) {
    return invoke("studio_list_shoot_assets", {
      sessionToken: getSessionToken() || null,
      shootId,
      viewerHandle: me,
    });
  }
  const d = load();
  const s = d.shoots.find((x) => x.id === shootId);
  if (!s) throw new Error("Shoot not found");
  const access =
    (d.access[shootId] || []).includes(me) || s.ownerHandle === me;
  if (!access) {
    throw new Error(
      s.accessMode === "paid"
        ? "Purchase or request access to view delivery"
        : "No access to this delivery",
    );
  }
  return d.assets.filter((a) => a.shootId === shootId);
}

export async function publishShoot(shootId: number): Promise<StudioShoot> {
  if (isTauri()) {
    return invoke("studio_publish_shoot", {
      sessionToken: getSessionToken() || "",
      shootId,
    });
  }
  const me = getCurrentHandle() || "demo_user";
  const d = load();
  const s = d.shoots.find((x) => x.id === shootId);
  if (!s || s.ownerHandle !== me) throw new Error("Not your shoot");
  if (!d.assets.some((a) => a.shootId === shootId)) {
    throw new Error("Add at least one asset before publishing");
  }
  s.status = "delivered";
  save(d);
  return enrichShoot(s, me);
}

export async function grantShootAccess(
  shootId: number,
  clientHandle: string,
): Promise<{ granted: boolean }> {
  if (isTauri()) {
    return invoke("studio_grant_access", {
      sessionToken: getSessionToken() || "",
      shootId,
      clientHandle,
    });
  }
  const d = load();
  const list = d.access[shootId] || [];
  if (!list.includes(clientHandle)) {
    list.push(clientHandle);
    d.access[shootId] = list;
    save(d);
  }
  return { granted: true };
}

export async function purchaseShootAccess(
  shootId: number,
): Promise<{ purchased?: boolean; paidWb?: number; alreadyHadAccess?: boolean }> {
  if (isTauri()) {
    return invoke("studio_purchase_access", {
      sessionToken: getSessionToken() || "",
      shootId,
    });
  }
  const me = getCurrentHandle() || "demo_user";
  const d = load();
  const s = d.shoots.find((x) => x.id === shootId);
  if (!s) throw new Error("Shoot not found");
  if ((d.access[shootId] || []).includes(me)) {
    return { alreadyHadAccess: true };
  }
  if (s.accessMode !== "paid") {
    throw new Error("This delivery is free — ask the studio for a grant");
  }
  const list = d.access[shootId] || [];
  list.push(me);
  d.access[shootId] = list;
  save(d);
  return { purchased: true, paidWb: s.priceWb };
}

export async function exportShootManifest(
  shootId: number,
): Promise<Record<string, unknown>> {
  if (isTauri()) {
    return invoke("studio_export_manifest", {
      sessionToken: getSessionToken() || "",
      shootId,
    });
  }
  const assets = await listShootAssets(shootId);
  const d = load();
  const s = d.shoots.find((x) => x.id === shootId)!;
  return {
    type: "blkspace_studio_export_v1",
    shootId,
    title: s.title,
    studio: s.ownerHandle,
    client: s.clientHandle,
    exportedAt: new Date().toISOString(),
    assetCount: assets.length,
    assets: assets.map((a) => ({
      id: a.id,
      mediaRef: a.mediaRef,
      filename: a.filename,
      caption: a.caption,
      kind: a.kind,
    })),
    note: "All-in-one access package — download via mediaRef / blob APIs.",
  };
}
