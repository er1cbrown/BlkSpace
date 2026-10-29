import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
} from "nostr-tools/pure";
import { createApp } from "../server.mjs";

const origin = "https://demo.example.test";
const alice = generateSecretKey();
const bob = generateSecretKey();
const alicePubkey = getPublicKey(alice);
const bobPubkey = getPublicKey(bob);
const actualFetch = globalThis.fetch;
const db = new Database(":memory:");
let server, base, dir;
let failSql = false;
let sqlCalls = 0;

function authorization(route, body, key = alice, overrides = {}) {
  const event = finalizeEvent(
    {
      kind: 27235,
      content: "",
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["u", origin + route],
        ["method", "POST"],
        ["payload", createHash("sha256").update(body).digest("hex")],
      ],
      ...overrides,
    },
    key,
  );
  return `Nostr ${Buffer.from(JSON.stringify(event)).toString("base64")}`;
}

function post(route, body, key = alice, overrides = {}) {
  const raw = JSON.stringify(body);
  return fetch(base + route, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: authorization(route, raw, key, overrides),
    },
    body: raw,
  });
}

function authorizedGet(route, key = alice) {
  const event = finalizeEvent(
    {
      kind: 27235,
      content: "",
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["u", origin + route],
        ["method", "GET"],
        ["payload", createHash("sha256").update("").digest("hex")],
      ],
    },
    key,
  );
  return fetch(base + route, {
    method: "GET",
    headers: {
      authorization: `Nostr ${Buffer.from(JSON.stringify(event)).toString("base64")}`,
    },
  });
}

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "blkspace-server-"));
  await writeFile(
    path.join(dir, "index.html"),
    "<!doctype html><h1>BlkSpace</h1>",
  );
  globalThis.fetch = async (url, options) => {
    if (String(url) === "https://test.turso/v2/pipeline") {
      sqlCalls++;
      if (failSql)
        return Response.json({
          results: [{ type: "error", error: { code: "SQL_ERROR" } }],
        });
      const stmt = JSON.parse(options.body).requests[0].stmt;
      const rows = db
        .query(stmt.sql)
        .all(
          ...stmt.args.map((a) =>
            a.type === "integer"
              ? Number(a.value)
              : a.type === "null"
                ? null
                : a.value,
          ),
        );
      const names = rows.length ? Object.keys(rows[0]) : [];
      return Response.json({
        results: [
          {
            type: "ok",
            response: {
              type: "execute",
              result: {
                cols: names.map((name) => ({ name })),
                rows: rows.map((row) =>
                  names.map((name) => ({ type: "text", value: row[name] })),
                ),
              },
            },
          },
        ],
      });
    }
    if (String(url).startsWith("https://api.cloudflare.com/")) {
      return Response.json(
        { success: false, errors: [{ message: "Authorization Failure" }] },
        { status: 403 },
      );
    }
    return actualFetch(url, options);
  };
  server = createApp({
    publicDir: dir,
    origins: [origin],
    env: {
      TURSO_DATABASE_URL: "libsql://test.turso",
      TURSO_AUTH_TOKEN: "test-only",
      WRITE_LIMIT: "200",
      CLOUDFLARE_ACCOUNT_ID: "test-account",
      CLOUDFLARE_API_TOKEN: "test-only",
      R2_ACCESS_KEY_ID: "test-access",
      R2_SECRET_ACCESS_KEY: "test-secret",
      R2_BUCKET: "test",
      R2_PUBLIC_BASE_URL: "https://media.example.test",
      YARD_AUDIO_DIR: path.join(dir, "yard-audio"),
      YARD_IMAGE_DIR: path.join(dir, "yard-image"),
      YARD_VIDEO_DIR: path.join(dir, "yard-video"),
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  globalThis.fetch = actualFetch;
  await new Promise((resolve) => server.close(resolve));
  db.close();
  await rm(dir, { recursive: true });
});

describe("ProjectConnect on the shared yard", () => {
  test("an organization and a raised hand are visible to someone else", async () => {
    await post("/api/portfolio/identity", { handle: "alice" });
    await post("/api/portfolio/identity", { handle: "bob" }, bob);
    const board = await (await fetch(base + "/api/connect/orgs")).json();
    expect(board.ok).toBe(true);
    expect(board.orgs.some((org) => org.id === "org_meharry_research")).toBe(
      true,
    );

    const created = await post("/api/connect/org", {
      name: "SACS Study Circle",
      orgType: "peer",
      yardId: "meharry",
      description: "Computer science students practicing clinical tasks.",
    });
    expect(created.status).toBe(200);
    const org = (await created.json()).org;
    expect(org.createdBy).toBe("alice");

    const seen = await (await fetch(base + "/api/connect/orgs")).json();
    expect(seen.orgs.some((row) => row.id === org.id)).toBe(true);

    const opening = await post("/api/connect/opportunity", {
      orgId: org.id,
      title: "Read one ClinYard drill",
      description: "Finish the handoff drill and write what the order was.",
      durationText: "15 min",
      tagsJson: "[]",
    });
    expect(opening.status).toBe(200);
    const opportunityId = (await opening.json()).opportunity.id;

    const hand = await post(
      "/api/connect/interest",
      {
        opportunityId,
        message: "I can do the handoff drill tonight.",
        skillsSnapshot: "SBAR",
        classification: "nursing",
        gpaShared: false,
      },
      bob,
    );
    expect(hand.status).toBe(200);

    const publicOpps = await (
      await fetch(base + "/api/connect/opportunities")
    ).json();
    const listed = publicOpps.opportunities.find(
      (row) => row.id === opportunityId,
    );
    expect(listed.interestCount).toBe(1);

    const cred = await (
      await fetch(base + "/api/connect/cred?handle=bob")
    ).json();
    expect(cred.cred.interests).toBeGreaterThanOrEqual(1);
    expect(cred.cred.score).toBeGreaterThan(12);
  });
});

describe("yards on the shared server", () => {
  test("a join, an event, and an RSVP are visible to someone else", async () => {
    await post("/api/portfolio/identity", { handle: "alice" });
    await post("/api/portfolio/identity", { handle: "bob" }, bob);

    const unsigned = await fetch(base + "/api/yards/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(unsigned.status).toBe(401);

    const joined = await post("/api/yards/join", { yardId: "meharry" });
    expect(joined.status).toBe(200);
    expect((await joined.json()).memberCount).toBe(1);

    const blocked = await post(
      "/api/yards/events",
      {
        communityId: "meharry",
        title: "Too early",
        startsAt: "2026-10-01T18:00:00",
      },
      bob,
    );
    expect(blocked.status).toBe(403);

    const created = await post("/api/yards/events", {
      communityId: "meharry",
      title: "ClinYard study hour",
      description: "Practice the handoff drill.",
      location: "SACS lab",
      startsAt: "2026-10-01T18:00:00",
      capacity: 20,
    });
    expect(created.status).toBe(200);
    const eventId = (await created.json()).event.id;
    expect(eventId).toBeGreaterThan(0);

    const early = await post(
      "/api/yards/rsvp",
      { eventId, status: "going" },
      bob,
    );
    expect(early.status).toBe(403);

    expect(
      (await post("/api/yards/join", { yardId: "meharry" }, bob)).status,
    ).toBe(200);
    const rsvp = await post(
      "/api/yards/rsvp",
      { eventId, status: "going" },
      bob,
    );
    expect(rsvp.status).toBe(200);
    expect((await rsvp.json()).status).toBe("going");

    const listed = await (
      await fetch(base + "/api/yards/events?yard=meharry")
    ).json();
    const row = listed.events.find((event) => event.id === eventId);
    expect(row.rsvpCount).toBe(1);
    expect(row.goingCount).toBe(1);

    const counts = await (await fetch(base + "/api/yards/counts")).json();
    expect(counts.counts.meharry).toBe(2);

    const members = await (
      await fetch(base + "/api/yards/members?yard=meharry")
    ).json();
    expect(members.members.map((member) => member.handle).sort()).toEqual([
      "alice",
      "bob",
    ]);

    const mine = await (await authorizedGet("/api/yards/mine")).json();
    expect(mine.yards).toContain("meharry");

    const before = await (
      await fetch(base + "/api/yards/channels?yard=meharry")
    ).json();
    expect(before.channels.map((channel) => channel.id)).toEqual([
      "general",
      "events",
      "study-hall",
    ]);

    const blockedChannel = await post(
      "/api/yards/channels",
      { yardId: "howard", name: "office-hours" },
      bob,
    );
    expect(blockedChannel.status).toBe(403);

    const added = await post("/api/yards/channels", {
      yardId: "meharry",
      names: ["Office Hours", "announcements"],
    });
    expect(added.status).toBe(200);
    expect((await added.json()).channelsCreated).toEqual([
      "office-hours",
      "announcements",
    ]);

    const after = await (
      await fetch(base + "/api/yards/channels?yard=meharry")
    ).json();
    expect(after.channels.slice(0, 3).map((channel) => channel.id)).toEqual([
      "general",
      "events",
      "study-hall",
    ]);
    expect(after.channels.map((channel) => channel.id).sort()).toEqual([
      "announcements",
      "events",
      "general",
      "office-hours",
      "study-hall",
    ]);
  });
});

describe("yard desk on the shared server", () => {
  test("a yard keeps its own room, message, balance, and sale", async () => {
    await post("/api/portfolio/identity", { handle: "alice" });
    await post("/api/portfolio/identity", { handle: "bob" }, bob);
    expect((await post("/api/yards/join", { yardId: "desk" })).status).toBe(200);
    expect((await post("/api/yards/join", { yardId: "desk" }, bob)).status).toBe(200);

    expect((await fetch(base + "/api/yards/boards", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status).toBe(401);
    const fits = await post("/api/yards/boards", {
      id: "board_fits_1",
      yardId: "desk",
      title: "Fits",
      createdAt: "2026-10-20T12:00:00.000Z",
    });
    expect(fits.status).toBe(200);
    const pin = await post("/api/yards/pins", {
      id: "pin_jacket_1",
      yardId: "desk",
      boardId: "board_fits_1",
      title: "Gold jacket",
      note: "Homecoming.",
      image: "https://media.example.test/jacket.jpg",
      createdAt: "2026-10-20T12:01:00.000Z",
    });
    expect(pin.status).toBe(200);
    const tape = await post("/api/yards/mixtapes", {
      id: "mix_friday_1",
      yardId: "desk",
      title: "Friday lawn",
      body: "Recorded in the yard.",
      priceWb: 25,
      editionSize: 10,
      tracks: [{ id: "t1", title: "Intro", src: "https://media.example.test/a.mp3" }],
      cover: "https://media.example.test/front.jpg",
      credits: "Produced in the yard.",
      createdAt: "2026-10-20T12:02:00.000Z",
    });
    expect(tape.status).toBe(200);
    const bareSleeve = await post("/api/yards/mixtapes", {
      id: "mix_bad_cover",
      yardId: "desk",
      title: "No sleeve",
      tracks: [{ id: "t1", title: "Intro", src: "https://media.example.test/a.mp3" }],
      cover: "data:image/png;base64,aaaa",
      createdAt: "2026-10-20T12:02:30.000Z",
    });
    expect(bareSleeve.status).toBe(400);
    const sharedBoards = await (await fetch(base + "/api/yards/boards?yard=desk")).json();
    const sharedPins = await (await fetch(base + "/api/yards/pins?yard=desk")).json();
    const sharedTapes = await (await fetch(base + "/api/yards/mixtapes?yard=desk")).json();
    expect(sharedBoards.boards.map((row) => row.title)).toEqual(["Fits"]);
    expect(sharedPins.pins.map((row) => row.title)).toEqual(["Gold jacket"]);
    expect(sharedTapes.mixtapes[0].tracks[0].src).toBe("https://media.example.test/a.mp3");
    expect(sharedTapes.mixtapes[0].authorHandle).toBe("alice");
    expect(sharedTapes.mixtapes[0].setKind).toBe("songs");
    expect(sharedTapes.mixtapes[0].cover).toBe("https://media.example.test/front.jpg");
    expect(sharedTapes.mixtapes[0].credits).toBe("Produced in the yard.");
    expect(sharedTapes.mixtapes[0].format).toBe("single");
    expect(sharedTapes.mixtapes[0].visibility).toBe("yard");
    expect(sharedTapes.mixtapes[0].label).toBe("Bermuda Boyz Records");
    expect(sharedTapes.mixtapes[0].writeReceipt).toBe(true);
    const publicVerse = await post("/api/yards/mixtapes", {
      id: "mix_public_verse",
      yardId: "desk",
      title: "Public verse",
      setKind: "logos",
      visibility: "public",
      rightsAttested: true,
      format: "single",
      tracks: [{ id: "v1", title: "Isaiah 53:5", src: "verse:Isaiah 53:5" }],
      createdAt: "2026-10-20T12:02:40.000Z",
    });
    expect(publicVerse.status).toBe(400);
    const publicBlob = await post("/api/yards/mixtapes", {
      id: "mix_public_blob",
      yardId: "desk",
      title: "Public blob",
      visibility: "public",
      rightsAttested: true,
      format: "single",
      tracks: [{ id: "web_trackblob1", title: "Intro", src: "web_trackblob1" }],
      createdAt: "2026-10-20T12:02:45.000Z",
    });
    expect(publicBlob.status).toBe(400);
    const spotify = await post("/api/yards/mixtapes", {
      id: "mix_spotify",
      yardId: "desk",
      title: "Spotify",
      format: "single",
      storeUrl: "https://open.spotify.com/track/abc",
      tracks: [{ id: "t1", title: "Intro", src: "https://media.example.test/a.mp3" }],
      createdAt: "2026-10-20T12:02:50.000Z",
    });
    expect(spotify.status).toBe(400);
    const deck = await post("/api/yards/mixtapes", {
      id: "mix_logos_1",
      yardId: "desk",
      title: "Servant set",
      body: "Verses for the deck.",
      setKind: "logos",
      priceWb: 0,
      editionSize: 1,
      tracks: [{ id: "v1", title: "Isaiah 53:5", src: "verse:Isaiah 53:5" }],
      createdAt: "2026-10-20T12:03:00.000Z",
    });
    expect(deck.status).toBe(200);
    expect((await fetch(base + "/api/yards/battles", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status).toBe(401);
    const battle = await post("/api/yards/battles", {
      id: "battle_lawn_1",
      yardId: "desk",
      title: "Friday lawn battle",
      mixId: "mix_friday_1",
      mixTitle: "Friday lawn",
      setKind: "songs",
      callUrl: "https://discord.gg/yard",
      jitsiSlug: "BkspcBattledeskfriday",
      createdAt: "2026-10-20T12:04:00.000Z",
    });
    expect(battle.status).toBe(200);
    const sharedDecks = await (await fetch(base + "/api/yards/mixtapes?yard=desk")).json();
    const logos = sharedDecks.mixtapes.find((row) => row.id === "mix_logos_1");
    expect(logos.setKind).toBe("logos");
    expect(logos.tracks[0].src).toBe("verse:Isaiah 53:5");
    const lobbies = await (await fetch(base + "/api/yards/battles?yard=desk")).json();
    expect(lobbies.battles[0].title).toBe("Friday lawn battle");
    expect(lobbies.battles[0].hostHandle).toBe("alice");
    expect(lobbies.battles[0].callUrl).toContain("discord.gg");
    const blob = await fetch(base + "/api/portfolio/blob", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "web_abcdef1234567890",
        filename: "jacket.jpg",
        mime: "image/jpeg",
        size: 12,
        dataUrl: "data:image/jpeg;base64,AAAA",
      }),
    });
    expect(blob.status).toBe(200);
    const loaded = await (await fetch(base + "/api/portfolio/blob?id=web_abcdef1234567890")).json();
    expect(loaded.row.data_url).toBe("data:image/jpeg;base64,AAAA");

    const aliceWb = await (
      await authorizedGet("/api/yards/wb?yard=desk")
    ).json();
    expect(aliceWb.balance).toBe(50);
    expect(aliceWb.cred).toBe(0);
    expect(aliceWb.mark).toBeNull();
    const bobWb = await (
      await authorizedGet("/api/yards/wb?yard=desk", bob)
    ).json();
    expect(bobWb.balance).toBe(50);

    const room = await post("/api/yards/rooms", {
      yardId: "desk",
      title: "Office hours",
      kind: "stage",
    });
    expect(room.status).toBe(200);
    const listedRooms = await (
      await fetch(base + "/api/yards/rooms?yard=desk")
    ).json();
    expect(listedRooms.rooms.some((row) => row.title === "Office hours")).toBe(true);

    const sent = await post("/api/yards/messages", {
      yardId: "desk",
      toHandle: "bob",
      body: "Faculty office hours are in this yard.",
    });
    expect(sent.status).toBe(200);
    const phi = await post("/api/yards/messages", {
      yardId: "desk",
      toHandle: "bob",
      body: "Patient name is on the chart.",
    });
    expect(phi.status).toBe(400);
    const inbox = await (
      await authorizedGet("/api/yards/messages?yard=desk&peer=alice", bob)
    ).json();
    expect(inbox.messages).toHaveLength(1);
    expect((await fetch(base + "/api/yards/messages?yard=desk")).status).toBe(401);

    const mix = await post("/api/yards/sale", {
      yardId: "desk",
      title: "Friday lawn",
      description: "BlkCore audio edition. Not a chain NFT.",
      price: 25,
      itemType: "mix",
      itemRef: "mix_friday",
      isNft: true,
      fulfillmentMode: "instant",
      deliveryHint: "mixtape:mix_friday",
    });
    expect(mix.status).toBe(200);
    const mixId = (await mix.json()).id;
    const audioBoard = await (await fetch(base + "/api/yards/sale?yard=desk")).json();
    const audioRow = audioBoard.listings.find((row) => row.id === mixId);
    expect(audioRow.itemType).toBe("mix");
    expect(audioRow.itemRef).toBe("mix_friday");
    expect(audioRow.isNft).toBe(false);
    expect(audioRow.fulfillmentMode).toBe("instant");
    expect(audioRow.deliveryHint).toBe("mixtape:mix_friday");

    const listing = await post("/api/yards/sale", {
      yardId: "desk",
      title: "Study notes",
      description: "One week of review sheets.",
      price: 20,
      itemType: "notes",
    });
    expect(listing.status).toBe(200);
    const listingId = (await listing.json()).id;
    const bought = await post("/api/yards/sale/buy", { listingId }, bob);
    expect(bought.status).toBe(200);
    const escrowId = (await bought.json()).escrowId;
    expect(
      (await (await authorizedGet("/api/yards/wb?yard=desk", bob)).json()).balance,
    ).toBe(30);
    expect(
      (await post("/api/yards/sale/deliver", { escrowId, deliveryRef: "https://example.edu/notes" })).status,
    ).toBe(200);
    expect(
      (await post("/api/yards/sale/release", { escrowId }, bob)).status,
    ).toBe(200);
    const aliceAfter = await (await authorizedGet("/api/yards/wb?yard=desk")).json();
    expect(aliceAfter.balance).toBe(69);
    expect(aliceAfter.cred).toBeGreaterThanOrEqual(15);
    expect(aliceAfter.mark.yardId).toBe("desk");
    expect(aliceAfter.mark.school).toBe("");
    const board = await (await fetch(base + "/api/yards/sale?yard=desk")).json();
    expect(board.listings.some((row) => row.id === listingId)).toBe(false);
    expect(board.listings.some((row) => row.id === mixId)).toBe(true);

    const boughtMix = await post("/api/yards/sale/buy", { listingId: mixId }, bob);
    expect(boughtMix.status).toBe(200);
    const mixSale = await boughtMix.json();
    expect(mixSale.fulfillmentMode).toBe("instant");
    expect(mixSale.escrowId).toBeUndefined();
    expect(mixSale.sellerNet).toBe(24);
    expect(
      (await (await authorizedGet("/api/yards/wb?yard=desk", bob)).json()).balance,
    ).toBe(5);
    expect((await (await authorizedGet("/api/yards/wb?yard=desk")).json()).balance).toBe(93);
    const afterAudio = await (await fetch(base + "/api/yards/sale?yard=desk")).json();
    expect(afterAudio.listings.some((row) => row.id === mixId)).toBe(false);

    const cara = generateSecretKey();
    await post("/api/portfolio/identity", { handle: "cara" }, cara);
    expect((await post("/api/yards/join", { yardId: "desk" }, cara)).status).toBe(200);
    const logosTape = await post("/api/yards/mixtapes", {
      id: "mix_logos_edition",
      yardId: "desk",
      title: "Servant set",
      body: "Verses for the deck.",
      setKind: "logos",
      priceWb: 2,
      editionSize: 2,
      tracks: [
        { id: "v1", title: "Isaiah 53:5", src: "verse:Isaiah 53:5" },
        { id: "v2", title: "John 1:1", src: "verse:John 1:1" },
      ],
      createdAt: "2026-10-27T12:00:00.000Z",
    });
    expect(logosTape.status).toBe(200);
    const logosList = await post("/api/yards/sale", {
      yardId: "desk",
      title: "Servant set",
      description: "Campus edition. Not a chain NFT.",
      price: 2,
      itemType: "mix",
      itemRef: "mix_logos_edition",
      isNft: true,
      fulfillmentMode: "instant",
      deliveryHint: "mixtape:mix_logos_edition",
    });
    expect(logosList.status).toBe(200);
    const logosId = (await logosList.json()).id;
    const openEdition = await (await fetch(base + "/api/yards/sale?yard=desk")).json();
    const editionRow = openEdition.listings.find((row) => row.id === logosId);
    expect(editionRow.isNft).toBe(false);
    expect(editionRow.setKind).toBe("logos");
    expect(editionRow.editionSize).toBe(2);
    expect(editionRow.copiesLeft).toBe(2);
    const firstCopy = await post("/api/yards/sale/buy", { listingId: logosId }, bob);
    expect(firstCopy.status).toBe(200);
    const firstBody = await firstCopy.json();
    expect(firstBody.setKind).toBe("logos");
    expect(firstBody.copiesLeft).toBe(1);
    expect(firstBody.applied.logosDeck).toBe(true);
    expect(firstBody.passages).toEqual(["Isaiah 53:5", "John 1:1"]);
    expect(firstBody.receipt.copyNumber).toBe(1);
    expect(firstBody.receipt.anchorStatus).toBe("off");
    expect(firstBody.discAnchor).toBeNull();
    expect(firstBody.sellerNet).toBe(2);
    expect(
      (await (await fetch(base + "/api/yards/sale?yard=desk")).json()).listings.some(
        (row) => row.id === logosId,
      ),
    ).toBe(true);
    expect((await post("/api/yards/sale/buy", { listingId: logosId }, bob)).status).toBe(400);
    const secondCopy = await post("/api/yards/sale/buy", { listingId: logosId }, cara);
    expect(secondCopy.status).toBe(200);
    expect((await secondCopy.json()).copiesLeft).toBe(0);
    expect(
      (await (await fetch(base + "/api/yards/sale?yard=desk")).json()).listings.some(
        (row) => row.id === logosId,
      ),
    ).toBe(false);
    expect(
      (await (await authorizedGet("/api/yards/wb?yard=desk", bob)).json()).balance,
    ).toBe(3);
    expect(
      (await (await authorizedGet("/api/yards/wb?yard=desk", cara)).json()).balance,
    ).toBe(48);
    expect((await (await authorizedGet("/api/yards/wb?yard=desk")).json()).balance).toBe(97);

    const dina = generateSecretKey();
    const erin = generateSecretKey();
    await post("/api/portfolio/identity", { handle: "dina" }, dina);
    await post("/api/portfolio/identity", { handle: "erin" }, erin);
    expect((await post("/api/yards/join", { yardId: "desk" }, dina)).status).toBe(200);
    expect((await post("/api/yards/join", { yardId: "desk" }, erin)).status).toBe(200);
    const pub = await post(
      "/api/yards/mixtapes",
      {
        id: "mix_public_single",
        yardId: "desk",
        title: "Public single",
        format: "single",
        visibility: "public",
        rightsAttested: true,
        writeReceipt: true,
        storeUrl: "https://soundcloud.com/bermuda-boyz/public",
        tracks: [{ id: "t1", title: "Intro", src: "https://media.example.test/public.mp3" }],
        createdAt: "2026-10-27T13:00:00.000Z",
      },
      dina,
    );
    expect(pub.status).toBe(200);
    expect((await pub.json()).mixtape.writeReceipt).toBe(true);
    const pubList = await post(
      "/api/yards/sale",
      {
        yardId: "desk",
        title: "Public single",
        description: "Campus edition. Not a chain NFT.",
        price: 20,
        itemType: "mix",
        itemRef: "mix_public_single",
        isNft: true,
        fulfillmentMode: "instant",
        deliveryHint: "mixtape:mix_public_single",
      },
      dina,
    );
    expect(pubList.status).toBe(200);
    const pubBuy = await post(
      "/api/yards/sale/buy",
      { listingId: (await pubList.json()).id },
      erin,
    );
    expect(pubBuy.status).toBe(200);
    const pubBody = await pubBuy.json();
    expect(pubBody.receipt.copyNumber).toBe(1);
    expect(pubBody.receipt.anchorStatus).toBe("pending");
    expect(pubBody.receipt.format).toBe("single");
    expect(pubBody.discAnchor.callsConvertWbToBkspc).toBe(false);
    expect(pubBody.discAnchor.programId).toContain("Memo");
    expect(pubBody.sellerNet).toBe(19);
    expect(pubBody.payouts).toEqual([{ handle: "dina", amount: 19 }]);
    expect((await (await authorizedGet("/api/yards/wb?yard=desk")).json()).balance).toBe(97);

    const nova = generateSecretKey();
    const opus = generateSecretKey();
    const pike = generateSecretKey();
    const quin = generateSecretKey();
    await post("/api/portfolio/identity", { handle: "nova" }, nova);
    await post("/api/portfolio/identity", { handle: "opus" }, opus);
    await post("/api/portfolio/identity", { handle: "pike" }, pike);
    await post("/api/portfolio/identity", { handle: "quin" }, quin);
    expect((await post("/api/yards/join", { yardId: "desk" }, nova)).status).toBe(200);
    expect((await post("/api/yards/join", { yardId: "desk" }, opus)).status).toBe(200);
    expect((await post("/api/yards/join", { yardId: "desk" }, pike)).status).toBe(200);
    expect((await post("/api/yards/join", { yardId: "desk" }, quin)).status).toBe(200);
    const splitTape = await post(
      "/api/yards/mixtapes",
      {
        id: "mix_nova_room",
        yardId: "desk",
        title: "Nova room",
        label: "Nova Room",
        format: "single",
        priceWb: 20,
        editionSize: 2,
        splits: [
          { handle: "nova", percent: 70 },
          { handle: "opus", percent: 25 },
        ],
        tracks: [{ id: "t1", title: "Room", src: "https://media.example.test/nova.mp3" }],
        createdAt: "2026-10-28T15:00:00.000Z",
      },
      nova,
    );
    expect(splitTape.status).toBe(200);
    expect((await splitTape.json()).mixtape.label).toBe("Bermuda Boyz Records");
    const splitList = await post(
      "/api/yards/sale",
      {
        yardId: "desk",
        title: "Nova room",
        description: "Campus edition. Not a chain NFT.",
        price: 20,
        itemType: "mix",
        itemRef: "mix_nova_room",
        isNft: true,
        fulfillmentMode: "instant",
        deliveryHint: "mixtape:mix_nova_room",
      },
      nova,
    );
    expect(splitList.status).toBe(200);
    const splitId = (await splitList.json()).id;
    const pikeBuy = await post("/api/yards/sale/buy", { listingId: splitId }, pike);
    expect(pikeBuy.status).toBe(200);
    const pikeBody = await pikeBuy.json();
    expect(pikeBody.sellerNet).toBe(19);
    expect(pikeBody.payouts).toEqual([
      { handle: "nova", amount: 14 },
      { handle: "opus", amount: 5 },
    ]);
    expect(pikeBody.receipt.copyNumber).toBe(1);
    expect((await (await authorizedGet("/api/yards/wb?yard=desk", pike)).json()).balance).toBe(30);
    expect((await (await authorizedGet("/api/yards/wb?yard=desk", nova)).json()).balance).toBe(64);
    expect((await (await authorizedGet("/api/yards/wb?yard=desk", opus)).json()).balance).toBe(55);
    const offered = await post(
      "/api/yards/sale/pass",
      { listingId: splitId, price: 10 },
      pike,
    );
    expect(offered.status).toBe(200);
    expect((await offered.json()).holderPaid).toBe(false);
    const boardPasses = await (await fetch(base + "/api/yards/sale?yard=desk")).json();
    expect(boardPasses.passes).toEqual([
      expect.objectContaining({
        listingId: splitId,
        holder: "pike",
        askWb: 10,
        itemRef: "mix_nova_room",
        copyNumber: 1,
      }),
    ]);
    const quinBuy = await post(
      "/api/yards/sale/pass/buy",
      { listingId: splitId, holder: "pike" },
      quin,
    );
    expect(quinBuy.status).toBe(200);
    const quinBody = await quinBuy.json();
    expect(quinBody.passed).toBe(true);
    expect(quinBody.holderPaid).toBe(false);
    expect(quinBody.copyNumber).toBe(1);
    expect(quinBody.payouts).toEqual([
      { handle: "nova", amount: 8 },
      { handle: "opus", amount: 2 },
    ]);
    expect((await (await authorizedGet("/api/yards/wb?yard=desk", pike)).json()).balance).toBe(30);
    expect((await (await authorizedGet("/api/yards/wb?yard=desk", quin)).json()).balance).toBe(40);
    expect((await (await authorizedGet("/api/yards/wb?yard=desk", nova)).json()).balance).toBe(72);
    expect((await (await authorizedGet("/api/yards/wb?yard=desk", opus)).json()).balance).toBe(57);
    const pikeCopies = await (await authorizedGet("/api/yards/sale/copies", pike)).json();
    expect(pikeCopies.copies).toEqual([]);
    const quinCopies = await (await authorizedGet("/api/yards/sale/copies", quin)).json();
    expect(quinCopies.copies[0].copyNumber).toBe(1);
    expect(quinCopies.copies[0].askWb).toBe(0);

    const verse = "In the beginning God created the heaven and the earth.";
    expect((await fetch(base + "/api/yards/typeverse/races", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status).toBe(401);
    const tooFast = await post("/api/yards/typeverse/races", {
      id: "race_cpu_fast",
      yardId: "desk",
      mode: "cpu",
      difficulty: "campus",
      verseRef: "Genesis 1:1",
      verseText: verse,
      vehicle: { name: "Nova", body: "lowrider", paint: "cardinal", accent: "gold", number: 12 },
    });
    expect(tooFast.status).toBe(200);
    expect((await post("/api/yards/typeverse/races/finish", {
      raceId: "race_cpu_fast",
      yardId: "desk",
      typed: verse,
    })).status).toBe(400);
    const cpu = await post("/api/yards/typeverse/races", {
      id: "race_cpu_campus",
      yardId: "desk",
      mode: "cpu",
      difficulty: "campus",
      verseRef: "Genesis 1:1",
      verseText: verse,
      vehicle: { name: "Nova", body: "lowrider", paint: "cardinal", accent: "gold", number: 12 },
    });
    expect(cpu.status).toBe(200);
    expect((await cpu.json()).race.entries[0].vehicle.body).toBe("lowrider");
    const started = new Date(Date.now() - 8000).toISOString();
    db.query("UPDATE yard_typeverse_races SET created_at = ?, started_at = ? WHERE id = ?").run(
      started,
      started,
      "race_cpu_campus",
    );
    const beat = await post("/api/yards/typeverse/races/finish", {
      raceId: "race_cpu_campus",
      yardId: "desk",
      typed: verse,
    });
    expect(beat.status).toBe(200);
    const beatBody = await beat.json();
    expect(beatBody.won).toBe(true);
    expect(beatBody.paid).toBe(8);
    expect(beatBody.balance).toBe(105);
    const sloppy = await post("/api/yards/typeverse/races", {
      id: "race_cpu_sloppy",
      yardId: "desk",
      mode: "cpu",
      difficulty: "campus",
      verseRef: "Genesis 1:1",
      verseText: verse,
    });
    expect(sloppy.status).toBe(200);
    db.query("UPDATE yard_typeverse_races SET created_at = ?, started_at = ? WHERE id = ?").run(
      started,
      started,
      "race_cpu_sloppy",
    );
    const missed = await post("/api/yards/typeverse/races/finish", {
      raceId: "race_cpu_sloppy",
      yardId: "desk",
      typed: `${"x".repeat(verse.length - 4)}arth`,
    });
    expect(missed.status).toBe(200);
    expect((await missed.json()).paid).toBe(0);
    const lobby = await post("/api/yards/typeverse/races", {
      id: "race_yard_lawn",
      yardId: "desk",
      mode: "yard",
      verseRef: "Genesis 1:1",
      verseText: verse,
      vehicle: { name: "Nova", body: "coupe", paint: "gold", accent: "night", number: 9 },
    });
    expect(lobby.status).toBe(200);
    const listed = await (await fetch(base + "/api/yards/typeverse/races?yard=desk")).json();
    expect(listed.races[0].id).toBe("race_yard_lawn");
    expect(listed.races[0].verseText).toBe("");
    const joined = await post("/api/yards/typeverse/races/join", {
      raceId: "race_yard_lawn",
      yardId: "desk",
      vehicle: { name: "Bob", body: "bus", paint: "royal", accent: "cream", number: 3 },
    }, bob);
    expect(joined.status).toBe(200);
    expect((await joined.json()).race.startedAt).not.toBe("");
    db.query("UPDATE yard_typeverse_races SET started_at = ? WHERE id = ?").run(
      started,
      "race_yard_lawn",
    );
    const bobWin = await post("/api/yards/typeverse/races/finish", {
      raceId: "race_yard_lawn",
      yardId: "desk",
      typed: verse,
    }, bob);
    expect(bobWin.status).toBe(200);
    const bobBody = await bobWin.json();
    expect(bobBody.won).toBe(true);
    expect(bobBody.paid).toBe(12);
    expect(bobBody.balance).toBe(15);
    const late = await post("/api/yards/typeverse/races/finish", {
      raceId: "race_yard_lawn",
      yardId: "desk",
      typed: verse,
    });
    expect(late.status).toBe(200);
    expect((await late.json()).paid).toBe(0);
    expect((await (await authorizedGet("/api/yards/wb?yard=desk")).json()).balance).toBe(105);
  });
});

describe("standalone cloud server", () => {
  test("serves deep links, health, and JSON API 404s", async () => {
    expect(await (await fetch(base + "/feed")).text()).toContain("BlkSpace");
    expect((await (await fetch(base + "/api/health")).json()).ok).toBe(true);
    const missing = await fetch(base + "/api/unknown");
    expect(missing.status).toBe(404);
    expect(missing.headers.get("content-type")).toBe("application/json");
    expect((await fetch(base + "/assets/missing.js")).status).toBe(404);
    expect((await fetch(base + "/.env")).status).toBe(404);
  });

  test("unsigned writes are rejected before database access", async () => {
    const before = sqlCalls;
    const r = await fetch(base + "/api/portfolio/post", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(r.status).toBe(401);
    expect(sqlCalls).toBe(before);
  });

  test("a signed post from one identity is visible to independent readers", async () => {
    const r = await post("/api/portfolio/post", {
      id: 1001,
      authorHandle: "alice",
      content: "hello from A",
      townTag: "tsu",
      mediaBlobs: [],
    });
    expect(r.status).toBe(200);
    for (let reader = 0; reader < 2; reader++) {
      const b = await (await fetch(base + "/api/portfolio/posts")).json();
      expect(b.rows).toHaveLength(1);
      expect(b.rows[0].content).toBe("hello from A");
    }
  });

  test("native postUid is idempotent and paginated", async () => {
    const body = {
      postUid: "native-alice-12345678",
      authorHandle: "alice",
      content: "hello from native",
      townTag: "tsu",
      channelId: "general",
      mediaBlobs: [],
    };
    const first = await post("/api/portfolio/post", body, alice);
    const firstBody = await first.json();
    expect(first.status).toBe(200);
    expect(firstBody.postUid).toBe(body.postUid);
    expect(firstBody.remoteId).toBeTruthy();

    const retry = await post("/api/portfolio/post", body, alice);
    expect(retry.status).toBe(200);
    expect((await retry.json()).remoteId).toBe(firstBody.remoteId);

    const changed = await post(
      "/api/portfolio/post",
      { ...body, content: "changed" },
      alice,
    );
    expect(changed.status).toBe(409);

    const page = await (
      await fetch(`${base}/api/portfolio/posts?town=tsu&limit=1`)
    ).json();
    expect(page.rows[0].postUid).toBeTruthy();
    expect(page.serverTime).toBeTruthy();
    db.run("DELETE FROM portfolio_posts WHERE post_uid = ?", [body.postUid]);
  });

  test("retrying a signed post does not duplicate it", async () => {
    const r = await post("/api/portfolio/post", {
      id: 1001,
      authorHandle: "alice",
      content: "hello from A",
      townTag: "tsu",
    });
    expect(r.status).toBe(200);
    expect(
      (await (await fetch(base + "/api/portfolio/posts")).json()).rows,
    ).toHaveLength(1);
  });

  test("another key cannot claim Alice's handle or overwrite her post", async () => {
    expect(
      (
        await post(
          "/api/portfolio/post",
          { id: 1002, authorHandle: "alice", content: "fake", townTag: "tsu" },
          bob,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await post(
          "/api/portfolio/post",
          {
            id: 1001,
            authorHandle: "bob",
            content: "overwrite",
            townTag: "tsu",
          },
          bob,
        )
      ).status,
    ).toBe(409);
    expect(
      (await (await fetch(base + "/api/portfolio/posts")).json()).rows[0]
        .content,
    ).toBe("hello from A");
  });

  test("legacy posts remain readable and cannot be overwritten", async () => {
    db.run(
      "INSERT INTO portfolio_posts (id, author_handle, content, town_tag, media_blobs) VALUES (10, 'legacy', 'keep me', 'tsu', '[]')",
    );
    const r = await post(
      "/api/portfolio/post",
      { id: 10, authorHandle: "bob", content: "overwrite", townTag: "tsu" },
      bob,
    );
    expect(r.status).toBe(409);
    expect(
      db.query("SELECT content FROM portfolio_posts WHERE id=10").get().content,
    ).toBe("keep me");
  });

  test("Turso HTTP-200 SQL errors are not reported as saved", async () => {
    failSql = true;
    try {
      const r = await post(
        "/api/portfolio/post",
        { id: 1003, authorHandle: "bob", content: "not saved", townTag: "tsu" },
        bob,
      );
      expect(r.status).toBe(502);
      expect((await r.json()).ok).toBe(false);
    } finally {
      failSql = false;
    }
  });

  test("stale, cross-origin and payload-tampered proofs are rejected", async () => {
    expect(
      (await post("/api/portfolio/post", {}, alice, { created_at: 1 })).status,
    ).toBe(401);
    const raw = "{}";
    const valid = authorization("/api/portfolio/post", raw);
    expect(
      (
        await fetch(base + "/api/portfolio/post", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: valid },
          body: '{"tampered":true}',
        })
      ).status,
    ).toBe(401);
    const wrong = authorization("/api/portfolio/post", raw, alice, {
      tags: [
        ["u", "https://wrong.test/api/portfolio/post"],
        ["method", "POST"],
        ["payload", createHash("sha256").update(raw).digest("hex")],
      ],
    });
    expect(
      (
        await fetch(base + "/api/portfolio/post", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: wrong },
          body: raw,
        })
      ).status,
    ).toBe(401);
  });

  test("cloud posts refuse browser-only attachments", async () => {
    expect(
      (
        await post("/api/portfolio/post", {
          id: 1004,
          authorHandle: "alice",
          content: "local file",
          townTag: "tsu",
          mediaBlobs: ["web_local"],
        })
      ).status,
    ).toBe(400);
  });

  test("authenticated R2 targets and actionable Stream errors", async () => {
    const image = await post("/api/media/upload-target", {
      filename: "photo.jpg",
      mime: "image/jpeg",
      size: 5,
    });
    expect(image.status).toBe(200);
    const target = await image.json();
    expect(target.provider).toBe("r2");
    expect(target.uploadUrl).toContain("X-Amz-Signature");
    expect(target.headers["content-type"]).toBe("image/jpeg");
    expect(target.secretAccessKey).toBeUndefined();
    const unsafe = await post("/api/media/upload-target", {
      filename: "unsafe.svg",
      mime: "image/svg+xml",
      size: 5,
    });
    expect(unsafe.status).toBe(400);
    const hostedImage = await post("/api/portfolio/post", {
      id: 1005,
      authorHandle: "alice",
      content: "hosted image",
      townTag: "tsu",
      mediaBlobs: ["https://media.example.test/photo.jpg"],
    });
    expect(hostedImage.status).toBe(200);
    db.run("DELETE FROM portfolio_posts WHERE id = 1005");
    const untrustedImage = await post("/api/portfolio/post", {
      id: 1006,
      authorHandle: "alice",
      content: "untrusted image",
      townTag: "tsu",
      mediaBlobs: ["https://evil.example/photo.jpg"],
    });
    expect(untrustedImage.status).toBe(400);
    const audio = await post("/api/media/upload-target", {
      filename: "voice.mp3",
      mime: "audio/mpeg",
      size: 5,
    });
    expect(audio.status).toBe(200);
    expect((await audio.json()).headers["content-type"]).toBe("audio/mpeg");
    const pdf = await post("/api/media/upload-target", {
      filename: "notes.pdf",
      mime: "application/pdf",
      size: 5,
    });
    expect(pdf.status).toBe(200);
    expect((await pdf.json()).headers["content-type"]).toBe("application/pdf");
    const mismatched = await post("/api/media/upload-target", {
      filename: "notes.pdf",
      mime: "audio/mpeg",
      size: 5,
    });
    expect(mismatched.status).toBe(400);
    const oversizedAudio = await post("/api/media/upload-target", {
      filename: "voice.mp3",
      mime: "audio/mpeg",
      size: 25 * 1024 * 1024 + 1,
    });
    expect(oversizedAudio.status).toBe(400);
    const unsupported = await post("/api/media/upload-target", {
      filename: "payload.exe",
      mime: "application/octet-stream",
      size: 5,
    });
    expect(unsupported.status).toBe(400);
    const video = await post("/api/media/upload-target", {
      filename: "clip.mp4",
      mime: "video/mp4",
      size: 5,
    });
    expect(video.status).toBe(502);
    expect((await video.json()).error).toContain(
      "Stream authorization failed (403)",
    );

    const previousFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      if (String(url).startsWith("https://api.cloudflare.com/")) {
        return Response.json({
          success: true,
          result: {
            uid: "stream-test-uid",
            uploadURL: "https://upload.videodelivery.net/stream-test",
          },
        });
      }
      return previousFetch(url, options);
    };
    try {
      const stream = await post("/api/media/upload-target", {
        filename: "clip.mp4",
        mime: "video/mp4",
        size: 5,
      });
      expect(stream.status).toBe(200);
      const streamTarget = await stream.json();
      expect(streamTarget.provider).toBe("stream");
      expect(streamTarget.method).toBe("POST");
      expect(streamTarget.publicUrl).toBe(
        "https://iframe.videodelivery.net/stream-test-uid",
      );
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  test("social mutations require NIP-98 and ignore actor spoofing", async () => {
    const unsigned = await fetch(base + "/api/portfolio/interactions/like", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        postUid: "social-parent-alice-0001",
        desiredState: true,
        actionUid: "unsigned-like-0001",
      }),
    });
    expect(unsigned.status).toBe(401);

    const parent = await post(
      "/api/portfolio/post",
      {
        postUid: "social-parent-alice-0001",
        authorHandle: "alice",
        content: "social parent",
        townTag: "social-town",
        channelId: "announcements",
        mediaBlobs: [],
      },
      alice,
    );
    expect(parent.status).toBe(200);
    const parentBody = await parent.json();

    const spoofed = await post(
      "/api/portfolio/interactions/like",
      {
        postUid: parentBody.postUid,
        desiredState: true,
        actionUid: "spoof-like-0001",
        actorPubkey: bobPubkey,
      },
      alice,
    );
    expect(spoofed.status).toBe(403);

    const orphan = await post(
      "/api/portfolio/interactions/like",
      {
        postUid: "missing-parent-0001",
        desiredState: true,
        actionUid: "orphan-like-0001",
      },
      alice,
    );
    expect(orphan.status).toBe(404);
  });

  test("likes, reposts, and replies are durable and idempotent", async () => {
    const parent = await post(
      "/api/portfolio/post",
      {
        postUid: "social-parent-bob-0001",
        authorHandle: "bob",
        content: "reply target",
        townTag: "social-town",
        channelId: "general",
        mediaBlobs: [],
      },
      bob,
    );
    expect(parent.status).toBe(200);
    const parentBody = await parent.json();

    const likeBody = {
      postUid: parentBody.postUid,
      desiredState: true,
      actionUid: "like-bob-0001",
    };
    const firstLike = await post(
      "/api/portfolio/interactions/like",
      likeBody,
      alice,
    );
    expect(firstLike.status).toBe(200);
    const firstLikeBody = await firstLike.json();
    expect(firstLikeBody.liked).toBe(true);
    expect(firstLikeBody.counts.likes).toBe(1);

    const replayLike = await post(
      "/api/portfolio/interactions/like",
      likeBody,
      alice,
    );
    expect(replayLike.status).toBe(200);
    expect(await replayLike.json()).toEqual(firstLikeBody);
    expect(
      (
        await post(
          "/api/portfolio/interactions/like",
          { ...likeBody, desiredState: false },
          alice,
        )
      ).status,
    ).toBe(409);
    const unlike = await post(
      "/api/portfolio/interactions/like",
      { ...likeBody, desiredState: false, actionUid: "like-bob-0002" },
      alice,
    );
    expect(unlike.status).toBe(200);
    expect((await unlike.json()).liked).toBe(false);
    const replayAfterUnlike = await post(
      "/api/portfolio/interactions/like",
      likeBody,
      alice,
    );
    expect(replayAfterUnlike.status).toBe(200);
    expect(await replayAfterUnlike.json()).toEqual(firstLikeBody);

    const repostBody = {
      postUid: parentBody.postUid,
      desiredState: true,
      actionUid: "repost-alice-0001",
    };
    const repost = await post(
      "/api/portfolio/interactions/repost",
      repostBody,
      alice,
    );
    expect(repost.status).toBe(200);
    expect((await repost.json()).reposted).toBe(true);
    expect(
      (await post("/api/portfolio/interactions/repost", repostBody, alice))
        .status,
    ).toBe(200);

    const replyBody = {
      postUid: parentBody.postUid,
      replyUid: "reply-alice-0001",
      content: "A durable reply",
      actionUid: "reply-alice-0001",
      townTag: "spoof-town",
      channelId: "spoof-channel",
      parentAuthorPubkey: alicePubkey,
    };
    const reply = await post(
      "/api/portfolio/interactions/reply",
      replyBody,
      alice,
    );
    expect(reply.status).toBe(200);
    const replyResult = await reply.json();
    expect(replyResult.reply.townTag).toBe("social-town");
    expect(replyResult.reply.channelId).toBe("general");
    expect(replyResult.reply.parentAuthorPubkey).toBe(bobPubkey);
    expect(
      (await post("/api/portfolio/interactions/reply", replyBody, alice))
        .status,
    ).toBe(200);
    expect(
      (
        await post(
          "/api/portfolio/interactions/reply",
          {
            ...replyBody,
            replyUid: "orphan-reply-0001",
            actionUid: "reply-alice-0002",
          },
          alice,
        )
      ).status,
    ).toBe(200);

    const posts = await (
      await fetch(base + "/api/portfolio/posts?town=social-town")
    ).json();
    const listed = posts.rows.find((row) => row.postUid === parentBody.postUid);
    expect(listed.repliesCount).toBe(2);
    expect(listed.likesCount).toBe(0);
    expect(listed.repostsCount).toBe(1);
    const listedReplies = await (
      await fetch(
        `${base}/api/portfolio/interactions/replies?postUid=${encodeURIComponent(parentBody.postUid)}`,
      )
    ).json();
    expect(listedReplies.rows.length).toBe(2);
    expect(listedReplies.rows[0].replyUid).toBe("reply-alice-0001");
    const firstReplyPage = await (
      await fetch(
        `${base}/api/portfolio/interactions/replies?postUid=${encodeURIComponent(parentBody.postUid)}&limit=1`,
      )
    ).json();
    expect(firstReplyPage.rows.length).toBe(1);
    expect(firstReplyPage.nextCursor).toBeTruthy();
    const secondReplyPage = await (
      await fetch(
        `${base}/api/portfolio/interactions/replies?postUid=${encodeURIComponent(parentBody.postUid)}&limit=1&cursor=${encodeURIComponent(firstReplyPage.nextCursor)}`,
      )
    ).json();
    expect(secondReplyPage.rows.length).toBe(1);
    expect(secondReplyPage.rows[0].replyUid).not.toBe(
      firstReplyPage.rows[0].replyUid,
    );
    const viewerPosts = await (
      await authorizedGet("/api/portfolio/posts?town=social-town", alice)
    ).json();
    const viewerListed = viewerPosts.rows.find(
      (row) => row.postUid === parentBody.postUid,
    );
    expect(viewerListed.viewerState).toEqual({
      liked: false,
      reposted: true,
    });
  });

  test("follows and notifications are recipient-scoped and read-idempotent", async () => {
    const alicePost = await post(
      "/api/portfolio/post",
      {
        postUid: "social-parent-alice-0002",
        authorHandle: "alice",
        content: "notification target",
        townTag: "social-town",
        channelId: "general",
        mediaBlobs: [],
      },
      alice,
    );
    expect(alicePost.status).toBe(200);
    const alicePostBody = await alicePost.json();

    const registered = await post(
      "/api/portfolio/identity",
      { handle: "alice" },
      alice,
    );
    expect(registered.status).toBe(200);
    expect(
      (await post("/api/portfolio/identity", { handle: "alice" }, bob)).status,
    ).toBe(409);

    const follow = await post(
      "/api/portfolio/interactions/follow",
      {
        targetHandle: "bob",
        desiredState: true,
        actionUid: "follow-alice-bob-0001",
      },
      alice,
    );
    expect(follow.status).toBe(200);
    expect((await follow.json()).following).toBe(true);
    const followingList = await (
      await authorizedGet("/api/portfolio/interactions/following", alice)
    ).json();
    expect(followingList.rows.some((row) => row.handle === "bob")).toBe(true);
    const publicFollows = await (
      await fetch(base + "/api/portfolio/follows?handle=bob")
    ).json();
    expect(publicFollows.ok).toBe(true);
    expect(publicFollows.followersCount).toBeGreaterThanOrEqual(1);
    expect(
      publicFollows.followers.some((row) => row.handle === "alice"),
    ).toBe(true);
    expect(
      (
        await post(
          "/api/portfolio/interactions/follow",
          {
            targetPubkey: alicePubkey,
            desiredState: true,
            actionUid: "self-follow-0001",
          },
          alice,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await post(
          "/api/portfolio/interactions/follow",
          {
            targetHandle: "nobody-here",
            desiredState: true,
            actionUid: "missing-follow-0001",
          },
          alice,
        )
      ).status,
    ).toBe(404);

    await post(
      "/api/portfolio/interactions/like",
      {
        postUid: alicePostBody.postUid,
        desiredState: true,
        actionUid: "notification-like-0001",
      },
      bob,
    );
    const notifications = await (
      await authorizedGet(
        "/api/portfolio/interactions/notifications?limit=50",
        alice,
      )
    ).json();
    expect(notifications.ok).toBe(true);
    expect(notifications.rows.length).toBeGreaterThanOrEqual(1);
    const postedNotifications = await (
      await post("/api/portfolio/notifications", {}, alice)
    ).json();
    expect(postedNotifications.rows.length).toBeGreaterThanOrEqual(1);
    expect(new Set(notifications.rows.map((row) => row.id)).size).toBe(
      notifications.rows.length,
    );
    expect(
      notifications.rows.some(
        (row) => row.type === "like" && row.actorPubkey === bobPubkey,
      ),
    ).toBe(true);
    expect(
      notifications.rows.every((row) => row.recipientPubkey === alicePubkey),
    ).toBe(true);

    const bobNotifications = await (
      await authorizedGet(
        "/api/portfolio/interactions/notifications?limit=50",
        bob,
      )
    ).json();
    expect(
      bobNotifications.rows.some(
        (row) => row.type === "follow" && row.actorPubkey === alicePubkey,
      ),
    ).toBe(true);

    const notificationId = notifications.rows[0].id;
    const firstRead = await post(
      "/api/portfolio/interactions/notifications/read",
      { notificationId },
      alice,
    );
    expect(firstRead.status).toBe(200);
    const firstReadBody = await firstRead.json();
    expect(firstReadBody.updatedCount).toBe(1);
    const secondRead = await post(
      "/api/portfolio/interactions/notifications/read",
      { notificationId },
      alice,
    );
    expect(secondRead.status).toBe(200);
    expect((await secondRead.json()).updatedCount).toBe(0);
    const afterRead = await (
      await authorizedGet(
        "/api/portfolio/interactions/notifications?limit=50",
        alice,
      )
    ).json();
    expect(afterRead.rows.find((row) => row.id === notificationId).read).toBe(
      true,
    );
  });
});

describe("public hub and practice ledger", () => {
  test("a hub has several public pages and does not mint WeixBucks", async () => {
    const terms = await (await fetch(base + "/api/terms")).json();
    expect(terms.version).toBe("2026-10-07");
    expect(terms.genesisWb).toBe(0);
    expect(terms.joinGrantWb).toBe(50);
    expect(terms.yardCredGate).toBe(15);
    expect(terms.chainSocket).toBe("not-connected");
    expect(terms.blkshiTrades).toBe(false);
    expect(terms.tipFeeBps).toBe(200);

    await post("/api/portfolio/identity", { handle: "alice" });
    await post("/api/portfolio/identity", { handle: "bob" }, bob);

    const door = await post("/api/portfolio/hub", {
      headline: "Transfer notes and a resume",
      kind: "transfer",
    });
    expect(door.status).toBe(200);

    for (const page of [
      { slug: "home", title: "Door", body: "Start here.", kind: "home", position: 0 },
      { slug: "resume", title: "Resume", body: "Studio and research.", kind: "resume", position: 1 },
      { slug: "transfer", title: "Transfer", body: "How to move yards.", kind: "transfer", position: 2, linkUrl: "https://example.edu/transfer" },
    ]) {
      expect((await post("/api/portfolio/hub/page", page)).status).toBe(200);
    }

    const stolen = await post("/api/portfolio/hub/page", {
      handle: "alice",
      slug: "resume",
      title: "Stolen",
      body: "Not yours.",
      kind: "resume",
    }, bob);
    expect(stolen.status).toBe(403);

    const badLink = await post("/api/portfolio/hub/page", {
      slug: "links",
      title: "Links",
      body: "Only https.",
      kind: "links",
      linkUrl: "http://example.edu",
    });
    expect(badLink.status).toBe(400);

    const pub = await (await fetch(base + "/api/portfolio/hub/alice")).json();
    expect(pub.pages.map((row) => row.slug)).toEqual(["home", "resume", "transfer"]);
    const one = await (await fetch(base + "/api/portfolio/hub/alice/resume")).json();
    expect(one.page.title).toBe("Resume");
    const floor = await (await fetch(base + "/api/portfolio/hubs")).json();
    expect(floor.hubs.some((row) => row.handle === "alice")).toBe(true);

    const minted = await post("/api/ledger/earn", {});
    expect(minted.status).toBe(400);

    const early = await post("/api/ledger/tip", { toHandle: "bob", yardId: "desk", amount: 10 });
    expect(early.status).toBe(403);

    expect((await post("/api/portfolio/terms", { version: "2026-10-07" })).status).toBe(200);
    expect((await post("/api/portfolio/terms", { version: "2026-10-07" }, bob)).status).toBe(200);
    const broke = await post("/api/ledger/tip", { toHandle: "alice", yardId: "desk", amount: 10 }, bob);
    expect(broke.status).toBe(400);

    db.run(
      "INSERT INTO ledger_accounts (handle, yard_id, balance) VALUES ('bob', 'desk', 100)",
    );
    const tipped = await post("/api/ledger/tip", { toHandle: "alice", yardId: "desk", amount: 50 }, bob);
    expect(tipped.status).toBe(200);
    const moved = await tipped.json();
    expect(moved.fee).toBe(1);
    expect(moved.fromBalance).toBe(50);
    expect(moved.toBalance).toBe(49);
    expect(moved.pool).toBe(1);

    const payout = await post("/api/ledger/payout", { yardId: "desk" }, bob);
    expect((await payout.json()).paid).toBe(0);

    const gate = await (await fetch(base + "/api/portfolio/gate?handle=alice")).json();
    expect(gate.walletEnabled).toBe(true);
    expect(gate.devTools).toBe(true);
    const stranger = await (await fetch(base + "/api/portfolio/gate?handle=bob")).json();
    expect(stranger.walletEnabled).toBe(true);
  });

  test("yard cred grants that university's mark and no extra WeixBucks", async () => {
    const cara = generateSecretKey();
    const dana = generateSecretKey();
    expect((await post("/api/portfolio/identity", { handle: "cara" }, cara)).status).toBe(200);
    expect((await post("/api/portfolio/identity", { handle: "dana" }, dana)).status).toBe(200);
    expect((await post("/api/yards/join", { yardId: "meharry" }, cara)).status).toBe(200);
    expect((await post("/api/yards/join", { yardId: "meharry" }, dana)).status).toBe(200);
    const joined = await (await authorizedGet("/api/yards/wb?yard=meharry", cara)).json();
    expect(joined.balance).toBe(50);
    expect(joined.cred).toBe(0);
    expect(joined.mark).toBeNull();

    expect((await post("/api/yards/rooms", { yardId: "meharry", title: "Lab", kind: "stage" }, cara)).status).toBe(200);
    expect((await post("/api/yards/messages", { yardId: "meharry", toHandle: "dana", body: "See you in lab." }, cara)).status).toBe(200);
    expect((await post("/api/yards/sale", { yardId: "meharry", title: "Notes", price: 10 }, cara)).status).toBe(200);

    const marked = await (await authorizedGet("/api/yards/wb?yard=meharry", cara)).json();
    expect(marked.balance).toBe(50);
    expect(marked.cred).toBeGreaterThanOrEqual(15);
    expect(marked.mark.school).toBe("Meharry Medical College");
    expect(marked.mark.shortName).toBe("Meharry Medical");

    const howard = await (await authorizedGet("/api/yards/wb?yard=howard", cara)).json();
    expect(howard.balance).toBe(0);
    expect(howard.mark).toBeNull();

    const again = await (await authorizedGet("/api/yards/wb?yard=meharry", cara)).json();
    expect(again.balance).toBe(50);
    expect(again.mark.createdAt).toBe(marked.mark.createdAt);
  });
});

describe("weixnet relay notes", () => {
  test("stores a signed kind-1 note and refuses a mismatched one", async () => {
    const key = generateSecretKey();
    const content = "relay note hello";
    const event = finalizeEvent(
      {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [["t", "blkspace"]],
        content,
      },
      key,
    );
    const saved = await post(
      "/api/portfolio/post",
      {
        postUid: "relay-note-12345678",
        authorHandle: "relaynote",
        content,
        townTag: "tsu",
        mediaBlobs: [],
        nostrEvent: event,
        relayUrl: "wss://nos.lol",
      },
      key,
    );
    expect(saved.status).toBe(200);
    expect((await saved.json()).nostrEventId).toBe(event.id);
    const page = await (
      await fetch(base + "/api/portfolio/posts?town=tsu&limit=20")
    ).json();
    const row = page.rows.find((item) => item.postUid === "relay-note-12345678");
    expect(row.nostrEventId).toBe(event.id);
    expect(row.relayUrl).toBe("wss://nos.lol");

    const forged = await post(
      "/api/portfolio/post",
      {
        postUid: "relay-note-forged-1",
        authorHandle: "relaynote",
        content,
        townTag: "tsu",
        mediaBlobs: [],
        nostrEvent: { ...event, content: "other words" },
        relayUrl: "wss://nos.lol",
      },
      key,
    );
    expect(forged.status).toBe(400);

    const offRelay = await post(
      "/api/portfolio/post",
      {
        postUid: "relay-note-offrelay1",
        authorHandle: "relaynote",
        content: "off relay",
        townTag: "tsu",
        mediaBlobs: [],
        nostrEvent: finalizeEvent(
          {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: "off relay",
          },
          key,
        ),
        relayUrl: "wss://relay.example.invalid",
      },
      key,
    );
    expect(offRelay.status).toBe(400);
    db.run("DELETE FROM portfolio_posts WHERE author_handle = ?", ["relaynote"]);
  });
});

describe("watch room and sealed messages", () => {
  test("a library file follows the host and a note stays sealed", async () => {
    const faye = generateSecretKey();
    const glen = generateSecretKey();
    expect((await post("/api/portfolio/identity", { handle: "faye" }, faye)).status).toBe(200);
    expect((await post("/api/portfolio/identity", { handle: "glen" }, glen)).status).toBe(200);
    expect((await post("/api/yards/join", { yardId: "watchlab" }, faye)).status).toBe(200);
    expect((await post("/api/yards/join", { yardId: "watchlab" }, glen)).status).toBe(200);

    const scrape = await post(
      "/api/yards/rooms",
      { yardId: "watchlab", title: "Nope", kind: "watch", watchTicket: "https://hianime.at/watch/x" },
      faye,
    );
    expect(scrape.status).toBe(400);

    const opened = await post(
      "/api/yards/rooms",
      {
        yardId: "watchlab",
        title: "Short",
        kind: "watch",
        watchTicket: "http://127.0.0.1:8096/Videos/clip.mp4",
      },
      faye,
    );
    expect(opened.status).toBe(200);
    const room = (await opened.json()).room;
    expect(room.kind).toBe("watch");
    expect(room.externalUrl.startsWith("blkspace-watch.v1.")).toBe(true);

    expect(
      (await post("/api/yards/rooms/watch", { roomId: room.id, positionMs: 1000, playing: true }, glen)).status,
    ).toBe(403);
    const hostClock = await post(
      "/api/yards/rooms/watch",
      { roomId: room.id, positionMs: 2500, playing: true },
      faye,
    );
    expect(hostClock.status).toBe(200);
    const clock = await (
      await authorizedGet(`/api/yards/rooms/watch?room=${encodeURIComponent(room.id)}`, glen)
    ).json();
    expect(clock.clock.positionMs).toBe(2500);
    expect(clock.clock.playing).toBe(true);

    expect(
      (
        await post(
          "/api/yards/messages/key",
          { publicJwk: { kty: "EC", crv: "P-256", x: "abcdefghijk", y: "lmnopqrstuv" } },
          faye,
        )
      ).status,
    ).toBe(200);
    const loaded = await (
      await authorizedGet("/api/yards/messages/key?yard=watchlab&handle=faye", glen)
    ).json();
    expect(loaded.publicJwk.crv).toBe("P-256");

    const pub = { kty: "EC", crv: "P-256", x: "abcdefghijk", y: "lmnopqrstuv" };
    const packed = Buffer.from(
      JSON.stringify({ v: 1, iv: "aaaaaaaaaaaa", ct: "bbbbbbbbbbbb", fromPub: pub, toPub: pub }),
    ).toString("base64url");
    const sealed = await post(
      "/api/yards/messages",
      { yardId: "watchlab", toHandle: "glen", body: `blkspace-dm.v1.${packed}` },
      faye,
    );
    expect(sealed.status).toBe(200);
    expect((await sealed.json()).message.body.startsWith("blkspace-dm.v1.")).toBe(true);
    const phi = await post(
      "/api/yards/messages",
      { yardId: "watchlab", toHandle: "glen", body: "patient name is hidden" },
      faye,
    );
    expect(phi.status).toBe(400);
    const threads = await (await authorizedGet("/api/yards/messages?yard=watchlab", glen)).json();
    expect(threads.threads.find((row) => row.peerHandle === "faye").lastBody).toBe("Encrypted message");
  });
});

describe("yard mod on the shared server", () => {
  test("a hide and a ban reach the other browser, and a farm pauses earn", async () => {
    const mod = generateSecretKey();
    const student = generateSecretKey();
    const farmer = generateSecretKey();
    expect((await post("/api/portfolio/identity", { handle: "er1cbrown" }, mod)).status).toBe(200);
    expect((await post("/api/portfolio/identity", { handle: "reed" }, student)).status).toBe(200);
    expect((await post("/api/portfolio/identity", { handle: "wynn" }, farmer)).status).toBe(200);
    expect((await post("/api/yards/join", { yardId: "moddesk" }, mod)).status).toBe(200);
    expect((await post("/api/yards/join", { yardId: "moddesk" }, student)).status).toBe(200);
    expect((await post("/api/yards/join", { yardId: "moddesk" }, farmer)).status).toBe(200);

    expect(
      (
        await post(
          "/api/portfolio/interactions/follow",
          { targetHandle: "wynn", desiredState: true, actionUid: "follow-reed-wynn-0001" },
          student,
        )
      ).status,
    ).toBe(200);
    const farm = "farm note farm note farm note";
    expect(
      (
        await post(
          "/api/portfolio/post",
          { id: 88001, authorHandle: "wynn", content: farm, townTag: "moddesk", mediaBlobs: [] },
          farmer,
        )
      ).status,
    ).toBe(200);
    for (let i = 1; i < 5; i += 1) {
      expect(
        (
          await post(
            "/api/portfolio/post",
            {
              postUid: `moddesk-wynn-000${i}`,
              authorHandle: "wynn",
              content: farm,
              townTag: "moddesk",
              mediaBlobs: [],
            },
            farmer,
          )
        ).status,
      ).toBe(200);
    }

    const scored = await (
      await authorizedGet("/api/yards/mod?yard=moddesk", farmer)
    ).json();
    expect(scored.you.paused).toBe(true);
    expect(scored.you.overall).toBeGreaterThan(0.7);
    expect(scored.reports).toBeUndefined();
    const farmedList = await (
      await authorizedGet("/api/portfolio/posts?town=moddesk")
    ).json();
    const farmed = farmedList.rows.find((row) => row.authorHandle === "wynn");
    expect(farmed.maliciousScore).toBeGreaterThan(0.7);
    expect(farmed.riskLevel).toBe("high");

    const verse = "In the beginning God created the heaven and the earth.";
    const race = await post(
      "/api/yards/typeverse/races",
      {
        id: "race_moddesk_wynn",
        yardId: "moddesk",
        mode: "cpu",
        difficulty: "campus",
        verseRef: "Genesis 1:1",
        verseText: verse,
      },
      farmer,
    );
    expect(race.status).toBe(200);
    const started = new Date(Date.now() - 8000).toISOString();
    db.query("UPDATE yard_typeverse_races SET created_at = ?, started_at = ? WHERE id = ?").run(
      started,
      started,
      "race_moddesk_wynn",
    );
    const paused = await post(
      "/api/yards/typeverse/races/finish",
      { raceId: "race_moddesk_wynn", yardId: "moddesk", typed: verse },
      farmer,
    );
    expect(paused.status).toBe(200);
    const pausedBody = await paused.json();
    expect(pausedBody.won).toBe(true);
    expect(pausedBody.paid).toBe(0);
    expect(pausedBody.reason).toBe("The earn pause is on. This score is above 0.7.");

    const appeal = await post(
      "/api/yards/mod/appeal",
      { yardId: "moddesk", note: "The score looks wrong." },
      farmer,
    );
    expect(appeal.status).toBe(200);

    const filed = await post(
      "/api/yards/mod/report",
      { yardId: "moddesk", postId: 88001, authorHandle: "wynn", reason: "spam" },
      student,
    );
    expect(filed.status).toBe(200);
    const reportId = (await filed.json()).report.id;
    const queue = await (await authorizedGet("/api/yards/mod?yard=moddesk", mod)).json();
    expect(queue.reports.some((row) => row.id === reportId)).toBe(true);
    expect(queue.appeals[0].handle).toBe("wynn");
    expect((await post("/api/yards/mod/hide", { yardId: "moddesk", postId: 88001, reportId }, student)).status).toBe(403);
    expect((await post("/api/yards/mod/hide", { yardId: "moddesk", postId: 88001, reportId }, mod)).status).toBe(200);
    const listed = await (await fetch(base + "/api/portfolio/posts?town=moddesk")).json();
    expect(listed.rows.some((row) => row.id === 88001 || row.id === "88001")).toBe(false);
    const seen = await (await fetch(base + "/api/yards/mod?yard=moddesk")).json();
    expect(seen.hiddenPostIds).toContain(88001);
    expect(seen.reports).toBeUndefined();

    expect((await post("/api/yards/mod/cap", { yardId: "moddesk", capWb: 20 }, mod)).status).toBe(200);
    expect((await (await post("/api/yards/mod/cap", { yardId: "moddesk", capWb: 20 }, mod)).json()).earnCapWb).toBe(100);
    expect((await post("/api/yards/mod/cap", { yardId: "moddesk", capWb: 400 }, student)).status).toBe(403);

    expect((await post("/api/yards/mod/ban", { yardId: "moddesk", handle: "wynn", reportId }, mod)).status).toBe(200);
    expect((await post("/api/yards/mod/ban", { yardId: "moddesk", handle: "er1cbrown" }, mod)).status).toBe(400);
    const blocked = await post(
      "/api/yards/messages",
      { yardId: "moddesk", toHandle: "reed", body: "still here" },
      farmer,
    );
    expect(blocked.status).toBe(403);
    expect(
      (
        await post(
          "/api/portfolio/post",
          {
            postUid: "moddesk-wynn-after-ban",
            authorHandle: "wynn",
            content: "one more",
            townTag: "moddesk",
            mediaBlobs: [],
          },
          farmer,
        )
      ).status,
    ).toBe(403);
  });
});

describe("yard audio upload", () => {
  test("a signed file plays back and an unsigned post is refused", async () => {
    const bytes = Buffer.from("ID3yard-audio-bytes");
    const route = "/api/yards/audio?name=lawn.mp3";
    const denied = await fetch(base + route, {
      method: "POST",
      headers: { "content-type": "audio/mpeg" },
      body: bytes,
    });
    expect(denied.status).toBe(401);

    const up = await fetch(base + route, {
      method: "POST",
      headers: {
        "content-type": "audio/mpeg",
        authorization: authorization(route, bytes),
      },
      body: bytes,
    });
    expect(up.status).toBe(200);
    const saved = await up.json();
    expect(saved.url).toMatch(
      /^\/api\/yards\/audio\/aud_[a-f0-9]{16}\.mp3$/,
    );
    const played = await fetch(base + saved.url);
    expect(played.status).toBe(200);
    expect(played.headers.get("content-type")).toContain("audio/mpeg");
    expect(Buffer.from(await played.arrayBuffer()).equals(bytes)).toBe(true);

    const ranged = await fetch(base + saved.url, {
      headers: { range: "bytes=0-2" },
    });
    expect(ranged.status).toBe(206);
    expect(Buffer.from(await ranged.arrayBuffer()).toString()).toBe("ID3");

    const notes = await fetch(base + "/api/yards/audio?name=notes.txt", {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        authorization: authorization(
          "/api/yards/audio?name=notes.txt",
          bytes,
        ),
      },
      body: bytes,
    });
    expect(notes.status).toBe(400);
  });
});

describe("yard image upload", () => {
  test("a signed image is served and a yard link can be posted", async () => {
    const { isAllowedHostedMediaUrl } = await import("../media.mjs");
    expect(
      isAllowedHostedMediaUrl(
        "http://127.0.0.1:24442/api/yards/image/img_0123456789abcdef.jpg",
      ),
    ).toBe(true);
    expect(
      isAllowedHostedMediaUrl(
        "https://evil.example/api/yards/image/img_0123456789abcdef.jpg",
      ),
    ).toBe(false);
    expect(
      isAllowedHostedMediaUrl(
        "https://bkspc.app/api/yards/image/img_0123456789abcdef.jpg",
        { PUBLIC_ORIGINS: "https://bkspc.app" },
      ),
    ).toBe(true);

    const bytes = Buffer.from("jpeg-bytes");
    const route = "/api/yards/image?name=cover.jpg";
    const denied = await fetch(base + route, {
      method: "POST",
      headers: { "content-type": "image/jpeg" },
      body: bytes,
    });
    expect(denied.status).toBe(401);
    const up = await fetch(base + route, {
      method: "POST",
      headers: {
        "content-type": "image/jpeg",
        authorization: authorization(route, bytes),
      },
      body: bytes,
    });
    expect(up.status).toBe(200);
    const saved = await up.json();
    expect(saved.url).toMatch(/^\/api\/yards\/image\/img_[a-f0-9]{16}\.jpg$/);
    const loaded = await fetch(base + saved.url);
    expect(loaded.status).toBe(200);
    expect(loaded.headers.get("content-type")).toContain("image/jpeg");
    expect(Buffer.from(await loaded.arrayBuffer()).equals(bytes)).toBe(true);
  });
});

describe("yard video upload", () => {
  test("a signed video plays back and a yard link can be posted", async () => {
    const { isAllowedHostedMediaUrl } = await import("../media.mjs");
    const clip =
      "http://127.0.0.1:24442/api/yards/video/vid_0123456789abcdef.mp4";
    expect(isAllowedHostedMediaUrl(clip)).toBe(true);
    expect(
      isAllowedHostedMediaUrl(
        "https://evil.example/api/yards/video/vid_0123456789abcdef.mp4",
      ),
    ).toBe(false);
    expect(
      isAllowedHostedMediaUrl(
        "https://bkspc.app/api/yards/video/vid_0123456789abcdef.mp4",
        { PUBLIC_ORIGINS: "https://bkspc.app" },
      ),
    ).toBe(true);
    const lan =
      "http://192.168.56.1:24442/api/yards/video/vid_0123456789abcdef.mp4";
    expect(isAllowedHostedMediaUrl(lan)).toBe(false);
    expect(
      isAllowedHostedMediaUrl(lan, { REQUEST_HOST: "192.168.56.1:24442" }),
    ).toBe(true);
    expect(
      isAllowedHostedMediaUrl(
        "https://evil.example/api/yards/video/vid_0123456789abcdef.mp4",
        { REQUEST_HOST: "192.168.56.1:24442" },
      ),
    ).toBe(false);

    const bytes = Buffer.from("mp4-yard-video");
    const route = "/api/yards/video?name=clip.mp4";
    const denied = await fetch(base + route, {
      method: "POST",
      headers: { "content-type": "video/mp4" },
      body: bytes,
    });
    expect(denied.status).toBe(401);
    const up = await fetch(base + route, {
      method: "POST",
      headers: {
        "content-type": "video/mp4",
        authorization: authorization(route, bytes),
      },
      body: bytes,
    });
    expect(up.status).toBe(200);
    const saved = await up.json();
    expect(saved.url).toMatch(/^\/api\/yards\/video\/vid_[a-f0-9]{16}\.mp4$/);
    const played = await fetch(base + saved.url);
    expect(played.status).toBe(200);
    expect(played.headers.get("content-type")).toContain("video/mp4");
    expect(played.headers.get("accept-ranges")).toBe("bytes");
    expect(Buffer.from(await played.arrayBuffer()).equals(bytes)).toBe(true);
    const ranged = await fetch(base + saved.url, {
      headers: { range: "bytes=0-2" },
    });
    expect(ranged.status).toBe(206);
    expect(Buffer.from(await ranged.arrayBuffer()).toString()).toBe("mp4");

    const mov = await fetch(base + "/api/yards/video?name=clip.mov", {
      method: "POST",
      headers: {
        "content-type": "video/mp4",
        authorization: authorization("/api/yards/video?name=clip.mov", bytes),
      },
      body: bytes,
    });
    expect(mov.status).toBe(200);
    const savedMov = await mov.json();
    expect(savedMov.url).toMatch(/^\/api\/yards\/video\/vid_[a-f0-9]{16}\.mov$/);

    const notes = await fetch(base + "/api/yards/video?name=notes.txt", {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        authorization: authorization(
          "/api/yards/video?name=notes.txt",
          bytes,
        ),
      },
      body: bytes,
    });
    expect(notes.status).toBe(400);

    const posted = await post("/api/portfolio/post", {
      id: 8842,
      authorHandle: "alice",
      content: "yard clip",
      townTag: "tsu",
      mediaBlobs: [`http://127.0.0.1:24442${saved.url}`],
    });
    expect(posted.status).toBe(200);
  });
});

describe("local SWORD verse reader", () => {
  test("refuses an unknown module and does not invent a verse", async () => {
    const bad = await fetch(base + "/api/logos/sword?module=NIV&ref=John%203:16");
    expect(bad.status).toBe(400);
    const unnamed = await fetch(base + "/api/logos/sword?module=KJV");
    expect(unnamed.status).toBe(400);
    const row = await fetch(base + "/api/logos/sword?module=KJV&ref=John%203:16");
    const body = await row.json();
    if (row.status === 503) {
      expect(body.ok).toBe(false);
      expect(JSON.stringify(body)).not.toMatch(/loved the world/i);
      return;
    }
    expect(row.status).toBe(200);
    expect(body.module).toBe("KJV");
    expect(body.verses[0].text.trim().length).toBeGreaterThan(0);
  });
});
