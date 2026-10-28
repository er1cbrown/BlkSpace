import { describe, expect, it } from "vitest";
import {
  FLOW_GAP_MS,
  HIT_GREAT,
  closeSet,
  emptyFight,
  flowFromCombo,
  hitScore,
  readFight,
  runItBack,
  scoreLead,
  showcaseLive,
  strikeFlow,
  writeFight,
} from "@/lib/logos-deck-aura";
import { bookLoad, type DeckLoad } from "@/lib/logos-deck-mix";

function track(): DeckLoad {
  return {
    id: "mix_lawn:t1",
    title: "Lawn cut",
    source: "Friday lawn",
    authorHandle: "ada",
    src: "https://cdn.example/lawn.mp3",
    passage: "",
    text: "",
    playable: true,
    lane: "track",
    tradition: "",
  };
}

describe("logos deck flow judge", () => {
  it("builds flow from a combo and ignores tradition", () => {
    const bible = bookLoad({
      tradition: "Bible",
      title: "Servant",
      text: "The line the member hosted.",
    });
    const quran = bookLoad({
      tradition: "Quran",
      title: "Opening",
      text: "The line the member hosted.",
    });
    expect(showcaseLive(bible, false)).toBe(true);
    expect(
      showcaseLive(bookLoad({ tradition: "Buddhist", title: "Wheel" }), false),
    ).toBe(false);
    expect(showcaseLive(track(), false)).toBe(false);
    expect(showcaseLive(track(), true)).toBe(true);
    const bibleHit = strikeFlow({
      state: emptyFight(),
      side: "a",
      load: bible,
      playing: false,
      fader: 0,
      now: 1_000,
    });
    const quranHit = strikeFlow({
      state: emptyFight(),
      side: "a",
      load: quran,
      playing: false,
      fader: 0,
      now: 1_000,
    });
    expect(bibleHit.judgment).toBe("great");
    expect(quranHit.state.a.score).toBe(bibleHit.state.a.score);
    expect(bibleHit.state.a.combo).toBe(1);
    expect(bibleHit.state.a.flow).toBe(flowFromCombo(1));
    expect(bibleHit.state.a.score).toBe(hitScore("great", 1));
  });

  it("pays more in front and breaks the chain on a miss or a long gap", () => {
    const hosted = bookLoad({
      tradition: "Esoteric",
      title: "Night",
      text: "A line they host.",
    });
    const named = bookLoad({ tradition: "Quran", title: "Opening" });
    const miss = strikeFlow({
      state: emptyFight(),
      side: "b",
      load: named,
      playing: false,
      fader: 100,
      now: 1_000,
    });
    expect(miss.judgment).toBe("miss");
    expect(miss.state.b).toMatchObject({ score: 0, combo: 0, flow: 0 });

    const back = strikeFlow({
      state: emptyFight(),
      side: "b",
      load: hosted,
      playing: false,
      fader: 0,
      now: 1_000,
    });
    expect(back.judgment).toBe("good");
    expect(back.state.b.score).toBe(hitScore("good", 1));

    const first = strikeFlow({
      state: emptyFight(),
      side: "a",
      load: hosted,
      playing: false,
      fader: 0,
      now: 1_000,
    });
    const chained = strikeFlow({
      state: first.state,
      side: "a",
      load: hosted,
      playing: false,
      fader: 0,
      now: 1_000 + FLOW_GAP_MS,
    });
    expect(chained.state.a.combo).toBe(2);
    expect(chained.state.a.flow).toBe(16);
    const broken = strikeFlow({
      state: first.state,
      side: "a",
      load: hosted,
      playing: false,
      fader: 0,
      now: 1_000 + FLOW_GAP_MS + 1,
    });
    expect(broken.state.a.combo).toBe(1);
    expect(broken.state.a.score).toBe(
      first.state.a.score + hitScore("great", 1),
    );
    expect(HIT_GREAT).toBe(300);
  });

  it("gives the set to the higher score when the set closes", () => {
    const hosted = bookLoad({
      tradition: "Bible",
      title: "Servant",
      text: "Hosted line.",
    });
    const hit = strikeFlow({
      state: emptyFight(),
      side: "b",
      load: hosted,
      playing: false,
      fader: 100,
      now: 2_000,
    });
    expect(scoreLead(hit.state)).toBe("b");
    const closed = closeSet(hit.state);
    expect(closed.winner).toBe("b");
    expect(closed.closed).toBe(true);
    const held = strikeFlow({
      state: closed,
      side: "a",
      load: hosted,
      playing: false,
      fader: 0,
      now: 3_000,
    });
    expect(held.state).toEqual(closed);
    const draw = closeSet(emptyFight());
    expect(draw.winner).toBe("even");
    expect(runItBack().a.score).toBe(0);
    expect(runItBack().closed).toBe(false);
  });

  it("keeps the flow fight on this device", () => {
    localStorage.clear();
    const hit = strikeFlow({
      state: emptyFight(),
      side: "a",
      load: track(),
      playing: true,
      fader: 0,
      now: 500,
    });
    writeFight("battle_1", hit.state, { a: "mix_lawn:t1", b: "" });
    expect(readFight("battle_1")).toMatchObject({
      a: { score: hit.state.a.score, combo: 1 },
      closed: false,
      aLoad: "mix_lawn:t1",
    });
    expect(readFight("other")).toBeNull();
  });
});
