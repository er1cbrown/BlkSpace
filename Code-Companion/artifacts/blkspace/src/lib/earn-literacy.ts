/**
 * Financial literacy + "how you make money on BlkSpace" — amalgamation thesis.
 * Soft credits (WB) first; BKSPC is gated settlement, not a casino pitch.
 */
import { WB_EARN, KARMA_EARN } from "@/lib/earn-sources";

export type LiteracyTrack =
  | "create"
  | "community"
  | "live"
  | "compete"
  | "sell"
  | "portfolio"
  | "coin";

export interface LiteracyPath {
  id: LiteracyTrack;
  title: string;
  competitorAnalogy: string;
  howYouEarn: string;
  firstAction: string;
  href: string;
  wbExample: string;
  literacyTip: string;
}

export const LITERACY_PATHS: LiteracyPath[] = [
  {
    id: "create",
    title: "Create media",
    competitorAnalogy: "TikTok · IG · Twitter · Myspace posts",
    howYouEarn: "Posts, replies, media uploads pay soft WeixBucks (WB) under a daily cap.",
    firstAction: "Drop a yard post or upload to Create",
    href: "/create",
    wbExample: `Post +${WB_EARN.feedPost} WB · Upload +${WB_EARN.mediaUpload} WB`,
    literacyTip:
      "Soft credits train the habit of value exchange before any coin. Cap protects the economy from spam farms.",
  },
  {
    id: "community",
    title: "Build the yard",
    competitorAnalogy: "Discord · Reddit · Fizz campus rooms",
    howYouEarn: "Join yards, RSVP events, host club kits — community work is paid in WB + karma.",
    firstAction: "Join a yard or apply a club kit",
    href: "/communities",
    wbExample: `Join yard +${WB_EARN.joinYard} WB · RSVP +${WB_EARN.eventRsvp} WB`,
    literacyTip:
      "Reputation (karma / Yard Cred) gates serious money later. Real community before cash-out.",
  },
  {
    id: "live",
    title: "Host live (link-out)",
    competitorAnalogy: "IG Live · TikTok Live · Twitch · Discord Stage",
    howYouEarn:
      "Native stream ingest is later. Today: put your stream URL on an event or Hub live card; yard RSVPs still earn.",
    firstAction: "Create a Live event with stream URL or publish on Hub → Live",
    href: "/hub",
    wbExample: "RSVP earn · content engagement · tips later",
    literacyTip:
      "Don't confuse platform rent (Twitch ads) with ownership. Your yard graph should stay on BlkSpace.",
  },
  {
    id: "compete",
    title: "Compete & teach",
    competitorAnalogy: "Chess.com + Challonge + Discord brackets",
    howYouEarn:
      "Tournaments: register, bracket, report scores, prize WB. Chess content belongs on Hub + club channels; play can link to Lichess.",
    firstAction: "Host a tournament or drop chess lessons on Hub",
    href: "/hub",
    wbExample: "Prize pool WB · teaching content · merch",
    literacyTip:
      "Skill communities monetize via teaching, prizes, and merch — not only by winning. Diversify income loops.",
  },
  {
    id: "sell",
    title: "Sell on Yard Sale",
    competitorAnalogy: "Depop · club merch · campus marketplace",
    howYouEarn: "List fashion, digital goods, services with soft escrow. Platform fee is transparent.",
    firstAction: "Open Earnings → Yard Sale",
    href: "/wallet",
    wbExample: "Sale proceeds · org split for clubs",
    literacyTip:
      "Escrow teaches trust + fees. Physical shipping and card rails are separate products — start soft.",
  },
  {
    id: "portfolio",
    title: "Pro portfolio & Connect",
    competitorAnalogy: "LinkedIn · portfolio sites · research boards",
    howYouEarn:
      "Studio grants and paid unlocks; ProjectConnect opportunities; open-to-work flags. Cred compounds.",
    firstAction: "Update Pro profile or Studio portfolio",
    href: "/connect",
    wbExample: "Paid studio unlock · future paid intros",
    literacyTip:
      "Human capital is an asset. Cred signals reliability before anyone should trust you with real settlement.",
  },
  {
    id: "coin",
    title: "BKSPC path (gated)",
    competitorAnalogy: "Not pump-and-dump social coins",
    howYouEarn:
      "WeixBucks are not tradable coin. BKSPC is optional settlement after Cred, counsel, and product proof.",
    firstAction: "Read economy terms on Earnings",
    href: "/wallet",
    wbExample: "Withdraw only when eligibility + Cred pass",
    literacyTip:
      "Financial literacy: soft currency ≠ investment advice. No guaranteed returns. Cred before coin.",
  },
];

export const LITERACY_PRINCIPLES = [
  {
    title: "Own your identity",
    body: "Keys and handles are yours — not rented from Meta. Backup recovery phrase before you care about balance.",
  },
  {
    title: "Soft money first",
    body: `WeixBucks are earn-only credits (daily cap, published rates). Karma is reputation only — never for sale. Example: post +${WB_EARN.feedPost} WB / +${KARMA_EARN.feedPost} karma.`,
  },
  {
    title: "Cred before coin",
    body: "Yard Cred and real activity gate serious withdraw paths. Underrepresented networks deserve protection from extractive token theater.",
  },
  {
    title: "Many loops, one home",
    body: "Create · live link-out · tournaments · sale · portfolio — same yard, same wallet story. Amalgamation, not eight logins.",
  },
] as const;
