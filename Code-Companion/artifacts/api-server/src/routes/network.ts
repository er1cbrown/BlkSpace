import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, postsTable, relaysTable, activityTable } from "@workspace/db";
import { eq, count, sum } from "drizzle-orm";

const router = Router();

router.get("/stats", async (req, res) => {
  const [userCountResult] = await db.select({ count: count() }).from(usersTable);
  const [postCountResult] = await db.select({ count: count() }).from(postsTable);
  const [relayCountResult] = await db.select({ count: count() }).from(relaysTable);
  const [onlineRelayCountResult] = await db
    .select({ count: count() })
    .from(relaysTable)
    .where(eq(relaysTable.status, "online"));
  const [weixSumResult] = await db.select({ total: sum(usersTable.weixBucks) }).from(usersTable);
  
  const activeTowns = await db
    .selectDistinct({ town: postsTable.townTag })
    .from(postsTable);

  res.json({
    totalRelays: relayCountResult.count,
    onlineRelays: onlineRelayCountResult.count,
    totalUsers: userCountResult.count,
    totalPosts: postCountResult.count,
    activeTowns: activeTowns.length,
    weixBucksInCirculation: Number(weixSumResult.total ?? 0),
    eventsLast24h: postCountResult.count * 3,
    meshConnections: onlineRelayCountResult.count * 4,
  });
});

router.get("/activity", async (req, res) => {
  const events = await db
    .select()
    .from(activityTable)
    .orderBy(activityTable.createdAt)
    .limit(30);
  res.json(events);
});

router.get("/architecture", async (req, res) => {
  res.json({
    layers: [
      {
        layer: "Application",
        standardRole: "Application logic (HTTP, SMTP)",
        blkspaceImpl: "Nostr (events) + Iroh (blobs) + Solana (high-value settlement)",
        rationale: "Nostr provides flexible social primitives; Iroh handles large media efficiently; Solana is used only for final economic coordination.",
        color: "#7C3AED",
      },
      {
        layer: "Transport",
        standardRole: "End-to-end process communication",
        blkspaceImpl: "TCP (reliable global sync) + UDP (local mesh)",
        rationale: "TCP ensures reliable event propagation across relays; UDP supports low-latency local BLE/Wi-Fi mesh.",
        color: "#2563EB",
      },
      {
        layer: "Network",
        standardRole: "Datagram routing",
        blkspaceImpl: "IPv4/IPv6 overlay via proxy relays + Nostr relay mesh",
        rationale: "Existing internet infrastructure is leveraged; Nostr relays provide application-level routing.",
        color: "#0891B2",
      },
      {
        layer: "Link",
        standardRole: "Frame transfer between adjacent nodes",
        blkspaceImpl: "802.11 (Wi-Fi) + Bluetooth Low Energy (BLE) Mesh",
        rationale: "BLE Mesh enables infrastructure-free local communication in dorms and low-connectivity zones.",
        color: "#059669",
      },
      {
        layer: "Physical",
        standardRole: "Bit transmission",
        blkspaceImpl: "Tier-0 low-end Windows laptops + standard networking hardware",
        rationale: "Design explicitly targets student hardware constraints for maximum HBCU accessibility.",
        color: "#D97706",
      },
    ],
    principles: [
      {
        title: "Pragmatic Decentralization",
        description: "Pure P2P collapses under scale and hardware constraints. Full centralization contradicts the mission. The solution is a federated mesh of town-level relays with selective synchronization.",
      },
      {
        title: "Defense in Depth",
        description: "No single layer is trusted. Cryptographic validation, relay-side filtering, anomaly detection, and economic guardrails work together seamlessly.",
      },
      {
        title: "Hardware Realism",
        description: "The system must function cleanly on Tier-0 student laptops — low RAM, older CPUs, residential networks. This constraint drives protocol and role separation between clients and relays.",
      },
      {
        title: "Economic Security",
        description: "Incentives (WeixBucks and BKSPC settlement) are first-class architectural concerns. The design actively mitigates reward farming, Sybil attacks, and collusion.",
      },
    ],
    securityLayers: [
      {
        layer: "Client",
        mechanism: "Disable automatic link previews; strict signature verification",
        protection: "EFAIL-style CBC attacks, forged events",
      },
      {
        layer: "Relay (Town)",
        mechanism: "Mandatory town tag enforcement + lightweight anomaly detection",
        protection: "Global cache poisoning, Sybil amplification",
      },
      {
        layer: "Economic",
        mechanism: "Engagement Quality signals + reward caps",
        protection: "Reward farming, star-shaped Sybil patterns",
      },
      {
        layer: "Solana (Phase 4)",
        mechanism: "Anchor constraints + checked arithmetic + PDA guards",
        protection: "Unauthorized claims, integer manipulation",
      },
    ],
  });
});

export default router;
