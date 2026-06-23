/** Parsed MyYard profile_layout_json shape. */

export interface MyYardModules {
  logosDeck?: boolean;
  bibleNlp?: boolean;
}

export interface MyYardLogosDeckConfig {
  setTitle?: string;
  audioHash?: string | null;
  trackIds?: string[];
}

export interface MyYardLayout {
  modules?: MyYardModules;
  logosDeck?: MyYardLogosDeckConfig;
  /** Campus pack from Yard Sale purchase (`theme:yard:tsu`). */
  yardPackId?: string | null;
}

export const DEFAULT_MYYARD_LAYOUT: MyYardLayout = {
  modules: { logosDeck: false, bibleNlp: false },
  logosDeck: { setTitle: "Sermon set", audioHash: null, trackIds: [] },
  yardPackId: null,
};

export function parseMyYardLayout(json: string | undefined | null): MyYardLayout {
  if (!json || json.trim() === "" || json === "{}") {
    return { ...DEFAULT_MYYARD_LAYOUT };
  }
  try {
    const raw = JSON.parse(json) as MyYardLayout;
    return {
      modules: {
        logosDeck: raw.modules?.logosDeck ?? false,
        bibleNlp: raw.modules?.bibleNlp ?? false,
      },
      logosDeck: {
        setTitle: raw.logosDeck?.setTitle ?? "Sermon set",
        audioHash: raw.logosDeck?.audioHash ?? null,
        trackIds: raw.logosDeck?.trackIds ?? [],
      },
      yardPackId: raw.yardPackId ?? null,
    };
  } catch {
    return { ...DEFAULT_MYYARD_LAYOUT };
  }
}

export function mergeMyYardLayout(
  current: MyYardLayout,
  patch: Partial<MyYardLayout>,
): MyYardLayout {
  return {
    modules: { ...current.modules, ...patch.modules },
    logosDeck: { ...current.logosDeck, ...patch.logosDeck },
    yardPackId:
      patch.yardPackId !== undefined ? patch.yardPackId : current.yardPackId,
  };
}

export function serializeMyYardLayout(layout: MyYardLayout): string {
  return JSON.stringify(layout);
}