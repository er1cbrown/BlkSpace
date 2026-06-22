/**
 * Beta yard seed content — realistic TSU-first posts for web preview / hosted demo.
 * Labeled internally; shown as live yard activity until real users post.
 */

export type SeedPost = {
  id: number;
  authorHandle: string;
  authorDisplayName: string;
  authorAvatarUrl: string;
  content: string;
  townTag: string;
  repliesCount: number;
  repostsCount: number;
  likesCount: number;
  liked: boolean;
  mediaBlobs: string[];
  nostrEventId: string;
  relayUrl: string;
  createdAt: string;
  engagementQuality: number;
  maliciousScore: number;
  riskLevel: "low" | "medium" | "high";
};

export const SEED_YARD_ID = "tsu";
export const SEED_YARD_LABEL = "TSU Yard";

export const SEED_POSTS: SeedPost[] = [
  {
    id: 101,
    authorHandle: "nina_tsu26",
    authorDisplayName: "Nina J.",
    authorAvatarUrl: "",
    content:
      "First day back on the yard and the band already practicing at 7am. TSU season is HERE 🎺",
    townTag: "tsu",
    repliesCount: 14,
    repostsCount: 6,
    likesCount: 89,
    liked: false,
    mediaBlobs: [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: "2026-06-22T08:15:00Z",
    engagementQuality: 1.1,
    maliciousScore: 0,
    riskLevel: "low",
  },
  {
    id: 102,
    authorHandle: "dj_kev_tsu",
    authorDisplayName: "DJ Kev",
    authorAvatarUrl: "",
    content:
      "New yard mix dropping Friday. Who's pulling up to the plaza? Link in my profile 🎧",
    townTag: "tsu",
    repliesCount: 22,
    repostsCount: 31,
    likesCount: 214,
    liked: true,
    mediaBlobs: [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: "2026-06-22T09:00:00Z",
    engagementQuality: 1.3,
    maliciousScore: 0,
    riskLevel: "low",
  },
  {
    id: 103,
    authorHandle: "marcus_alpha",
    authorDisplayName: "Marcus (ΑΦΑ)",
    authorAvatarUrl: "",
    content:
      "Study group in the library basement tonight 8pm. Bring notes from Dr. Williams' lecture.",
    townTag: "tsu",
    repliesCount: 8,
    repostsCount: 2,
    likesCount: 45,
    liked: false,
    mediaBlobs: [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: "2026-06-22T10:30:00Z",
    engagementQuality: 1.0,
    maliciousScore: 0,
    riskLevel: "low",
  },
  {
    id: 104,
    authorHandle: "jayla_creates",
    authorDisplayName: "Jayla Creates",
    authorAvatarUrl: "",
    content:
      "Just listed my homecoming flyer pack on the shop — 15 WB. Custom TSU colors, same-day turnaround ✨",
    townTag: "tsu",
    repliesCount: 5,
    repostsCount: 12,
    likesCount: 67,
    liked: false,
    mediaBlobs: [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: "2026-06-22T11:00:00Z",
    engagementQuality: 1.2,
    maliciousScore: 0,
    riskLevel: "low",
  },
  {
    id: 105,
    authorHandle: "coach_reed",
    authorDisplayName: "Coach Reed",
    authorAvatarUrl: "",
    content:
      "Volleyball tryouts moved to Kean Gym — 4pm Thursday. Bring your student ID.",
    townTag: "tsu",
    repliesCount: 3,
    repostsCount: 8,
    likesCount: 38,
    liked: false,
    mediaBlobs: [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: "2026-06-22T12:00:00Z",
    engagementQuality: 1.0,
    maliciousScore: 0,
    riskLevel: "low",
  },
  {
    id: 106,
    authorHandle: "tiana_sga",
    authorDisplayName: "Tiana | SGA",
    authorAvatarUrl: "",
    content:
      "Town hall this Friday — free food, voice your concerns, meet the e-board. 6pm student center.",
    townTag: "tsu",
    repliesCount: 19,
    repostsCount: 24,
    likesCount: 156,
    liked: false,
    mediaBlobs: [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: "2026-06-22T13:30:00Z",
    engagementQuality: 1.15,
    maliciousScore: 0,
    riskLevel: "low",
  },
  {
    id: 107,
    authorHandle: "devon_film",
    authorDisplayName: "Devon 🎬",
    authorAvatarUrl: "",
    content:
      "Shot a mini-doc on the marching band yesterday. Preview on my profile — feedback welcome!",
    townTag: "tsu",
    repliesCount: 11,
    repostsCount: 9,
    likesCount: 98,
    liked: false,
    mediaBlobs: [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: "2026-06-22T14:00:00Z",
    engagementQuality: 1.25,
    maliciousScore: 0,
    riskLevel: "low",
  },
  {
    id: 108,
    authorHandle: "alumni_92",
    authorDisplayName: "Ms. Patricia (’92)",
    authorAvatarUrl: "",
    content:
      "Proud to see y'all building something for the yard. Back in my day we had the bulletin board — now you have this. 💙",
    townTag: "tsu",
    repliesCount: 27,
    repostsCount: 5,
    likesCount: 201,
    liked: true,
    mediaBlobs: [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: "2026-06-22T15:00:00Z",
    engagementQuality: 1.1,
    maliciousScore: 0,
    riskLevel: "low",
  },
  {
    id: 109,
    authorHandle: "howard_yard",
    authorDisplayName: "Howard Yard",
    authorAvatarUrl: "",
    content: "Yard debate: best HBCU homecoming — drop your school below 👇",
    townTag: "howard",
    repliesCount: 89,
    repostsCount: 42,
    likesCount: 312,
    liked: false,
    mediaBlobs: [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: "2026-06-22T09:30:00Z",
    engagementQuality: 1.2,
    maliciousScore: 0,
    riskLevel: "low",
  },
  {
    id: 110,
    authorHandle: "famu_dj",
    authorDisplayName: "FAMU Sets",
    authorAvatarUrl: "",
    content: "Set from last weekend's tailgate — 500 WB in the shop if you want the full hour.",
    townTag: "famu",
    repliesCount: 16,
    repostsCount: 28,
    likesCount: 178,
    liked: false,
    mediaBlobs: [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: "2026-06-22T10:00:00Z",
    engagementQuality: 1.2,
    maliciousScore: 0,
    riskLevel: "low",
  },
  {
    id: 111,
    authorHandle: "spelman_voice",
    authorDisplayName: "Spelman Voice",
    authorAvatarUrl: "",
    content: "Open mic night at the campus cafe — poets, singers, all welcome. Thursday 7pm.",
    townTag: "spelman",
    repliesCount: 12,
    repostsCount: 7,
    likesCount: 94,
    liked: false,
    mediaBlobs: [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: "2026-06-22T11:30:00Z",
    engagementQuality: 1.0,
    maliciousScore: 0,
    riskLevel: "low",
  },
  {
    id: 112,
    authorHandle: "nina_tsu26",
    authorDisplayName: "Nina J.",
    authorAvatarUrl: "",
    content: "Who else up studying for finals already? The library is PACKED rn 📚",
    townTag: "tsu",
    repliesCount: 31,
    repostsCount: 4,
    likesCount: 127,
    liked: false,
    mediaBlobs: [],
    nostrEventId: "",
    relayUrl: "",
    createdAt: "2026-06-21T22:00:00Z",
    engagementQuality: 1.05,
    maliciousScore: 0,
    riskLevel: "low",
  },
];

export const SEED_USERS = [
  { handle: "nina_tsu26", display: "Nina J.", town: "TSU", followers: 428 },
  { handle: "dj_kev_tsu", display: "DJ Kev", town: "TSU", followers: 1842 },
  { handle: "jayla_creates", display: "Jayla Creates", town: "TSU", followers: 612 },
  { handle: "marcus_alpha", display: "Marcus (ΑΦΑ)", town: "TSU", followers: 389 },
  { handle: "tiana_sga", display: "Tiana | SGA", town: "TSU", followers: 956 },
  { handle: "devon_film", display: "Devon 🎬", town: "TSU", followers: 271 },
  { handle: "howard_yard", display: "Howard Yard", town: "Howard", followers: 2104 },
  { handle: "famu_dj", display: "FAMU Sets", town: "FAMU", followers: 1330 },
];

export const SEED_SUGGESTED_PEOPLE = [
  { handle: "dj_kev_tsu", name: "DJ Kev", town: "tsu" },
  { handle: "nina_tsu26", name: "Nina J.", town: "tsu" },
  { handle: "jayla_creates", name: "Jayla Creates", town: "tsu" },
];

export const SEED_COMMUNITIES = [
  {
    id: "tsu",
    name: "TSU Yard",
    school: "Tennessee State University",
    location: "Nashville, TN",
    members: 2847,
  },
  {
    id: "howard",
    name: "Howard Yard",
    school: "Howard University",
    location: "Washington, DC",
    members: 4521,
  },
  {
    id: "famu",
    name: "FAMU Yard",
    school: "Florida A&M University",
    location: "Tallahassee, FL",
    members: 3190,
  },
];

export function getSeedPosts(town?: string): SeedPost[] {
  if (!town || town === "tsu") {
    return [...SEED_POSTS].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
  return SEED_POSTS.filter((p) => p.townTag === town);
}