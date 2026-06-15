import { Router } from "express";
import { db } from "@workspace/db";
import { relaysTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetRelayParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const relays = await db.select().from(relaysTable).orderBy(relaysTable.createdAt);
  res.json(relays);
});

router.get("/:id", async (req, res) => {
  const parsed = GetRelayParams.safeParse({ id: parseInt(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [relay] = await db.select().from(relaysTable).where(eq(relaysTable.id, parsed.data.id));
  if (!relay) {
    res.status(404).json({ error: "Relay not found" });
    return;
  }
  res.json(relay);
});

export default router;
