import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogosDeckBoard } from "@/components/logos/LogosDeckBoard";
import { MIXTAPE_STORE, type AudioMixtape } from "@/lib/audio-mixtapes";

const BATTLE_KEY = "blkspace_yard_dj_battles_v1";

function lawn(): AudioMixtape {
  return {
    id: "mix_lawn",
    title: "Friday lawn",
    body: "",
    tracks: [
      { id: "t1", title: "Lawn cut", src: "https://cdn.example/lawn.mp3" },
    ],
    authorHandle: "ada",
    authorDisplayName: "Ada",
    yardId: "tsu",
    createdAt: "2026-10-28T00:00:00.000Z",
    setKind: "songs",
    priceWb: 0,
    editionSize: 1,
    cover: "",
    credits: "",
    format: "mixtape",
    visibility: "yard",
    storeUrl: "",
    writeReceipt: false,
    rightsAttested: false,
    splits: [{ handle: "ada", percent: 95 }],
    masterId: "",
    label: "Bermuda Boyz Records",
    listingId: null,
    hubItemId: null,
  };
}

describe("logos deck board", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(JSON.stringify({ mixtapes: [], battles: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
  });

  it("puts the host record on deck A and a passage on deck B", async () => {
    localStorage.setItem(MIXTAPE_STORE, JSON.stringify([lawn()]));
    localStorage.setItem(
      BATTLE_KEY,
      JSON.stringify([
        {
          id: "battle_1",
          yardId: "tsu",
          title: "Chapel battle",
          mixId: "mix_lawn",
          mixTitle: "Friday lawn",
          setKind: "songs",
          callUrl: "https://discord.gg/yard",
          jitsiSlug: "BkspcBattle1",
          hostHandle: "ada",
          createdAt: "2026-10-28T00:00:00.000Z",
        },
      ]),
    );

    render(<LogosDeckBoard battleId="battle_1" />);

    expect(await screen.findByText("Friday lawn · @ada")).toBeTruthy();
    expect(screen.getAllByText("Chapel battle").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Join call" }).getAttribute("href"),
    ).toBe("https://discord.gg/yard");

    fireEvent.click(
      screen.getByRole("button", { name: "Load John 3:16 on deck B" }),
    );
    expect(screen.getByText(/For God so loved the world/)).toBeTruthy();
    expect(
      screen.getByText(/streams as audio when a hosted file is loaded/),
    ).toBeTruthy();

    fireEvent.change(screen.getByRole("slider", { name: "Crossfader" }), {
      target: { value: "100" },
    });
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText("0%")).toBeTruthy();
    expect(document.querySelector("audio")?.volume ?? 1).toBeLessThan(0.001);
    fireEvent.click(screen.getByRole("button", { name: "Loop" }));
    expect(document.querySelector("audio")?.loop).toBe(true);

    fireEvent.change(screen.getByRole("combobox", { name: "Deck A lens" }), {
      target: { value: "law" },
    });
    expect(
      screen.getByText(/Filter and echo stay off so this file keeps playing/),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cue 2" }));
    expect(screen.getByText(/has not reported its length yet/)).toBeTruthy();
  });

  it("builds deck B flow from a hosted reading and closes the set", async () => {
    render(<LogosDeckBoard />);
    fireEvent.change(screen.getByRole("combobox", { name: "Tradition" }), {
      target: { value: "Quran" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Reading title" }), {
      target: { value: "Opening" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Hosted reading" }), {
      target: { value: "A line they host." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Book on B" }));
    expect(screen.getByText("Opening")).toBeTruthy();
    expect(screen.getByText("Quran reading")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Strike B" }));
    expect(screen.getByLabelText("Deck B combo").textContent?.trim()).toBe(
      "1x",
    );
    expect(screen.getByLabelText("Deck B score").textContent?.trim()).toBe(
      "324",
    );
    expect(
      screen
        .getByRole("meter", { name: "Deck B flow" })
        .getAttribute("aria-valuenow"),
    ).toBe("8");
    expect(screen.getByText("Deck B · Great")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close the set" }));
    expect(screen.getByText("Deck B wins the set.")).toBeTruthy();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });
});
