import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, postsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetUserParams,
  UpdateUserParams,
  UpdateUserBody,
  CreateUserBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users);
});

router.post("/", async (req, res) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [user] = await db.insert(usersTable).values(parsed.data).returning();
  res.status(201).json(user);
});

router.get("/:handle", async (req, res) => {
  const parsed = GetUserParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.handle, parsed.data.handle));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

router.patch("/:handle", async (req, res) => {
  const paramsParsed = UpdateUserParams.safeParse(req.params);
  const bodyParsed = UpdateUserBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [user] = await db
    .update(usersTable)
    .set(bodyParsed.data)
    .where(eq(usersTable.handle, paramsParsed.data.handle))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

router.get("/:handle/posts", async (req, res) => {
  const parsed = GetUserParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.handle, parsed.data.handle));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const posts = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.authorHandle, parsed.data.handle))
    .orderBy(postsTable.createdAt);

  const enriched = posts.map((p) => ({
    ...p,
    authorDisplayName: user.displayName,
    authorAvatarUrl: user.avatarUrl,
    authorUniversity: user.university,
    liked: false,
  }));
  res.json(enriched);
});

export default router;
