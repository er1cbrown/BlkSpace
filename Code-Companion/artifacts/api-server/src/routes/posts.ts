import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, usersTable, likesTable, repliesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  ListPostsQueryParams,
  CreatePostBody,
  GetPostParams,
  DeletePostParams,
  LikePostParams,
  UnlikePostParams,
  ListRepliesParams,
  CreateReplyParams,
  CreateReplyBody,
} from "@workspace/api-zod";

const router = Router();

async function enrichPost(post: typeof postsTable.$inferSelect, viewerHandle?: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.handle, post.authorHandle));
  let liked = false;
  if (viewerHandle) {
    const [like] = await db
      .select()
      .from(likesTable)
      .where(eq(likesTable.postId, post.id));
    liked = !!like;
  }
  return {
    ...post,
    authorDisplayName: user?.displayName ?? post.authorHandle,
    authorAvatarUrl: user?.avatarUrl ?? null,
    authorUniversity: user?.university ?? "",
    liked,
  };
}

router.get("/", async (req, res) => {
  const parsed = ListPostsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }
  let query = db.select().from(postsTable).$dynamic();
  if (parsed.data.town) {
    query = query.where(eq(postsTable.townTag, parsed.data.town));
  }
  if (parsed.data.trending) {
    query = query.orderBy(desc(postsTable.likesCount));
  } else {
    query = query.orderBy(desc(postsTable.createdAt));
  }
  const posts = await query.limit(50);
  const enriched = await Promise.all(posts.map((p) => enrichPost(p)));
  res.json(enriched);
});

router.post("/", async (req, res) => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [post] = await db.insert(postsTable).values({
    authorHandle: parsed.data.authorHandle,
    content: parsed.data.content,
    townTag: parsed.data.townTag,
    mediaUrl: parsed.data.mediaUrl ?? null,
  }).returning();
  await db.update(usersTable)
    .set({ postsCount: sql`${usersTable.postsCount} + 1` })
    .where(eq(usersTable.handle, parsed.data.authorHandle));
  const enriched = await enrichPost(post);
  res.status(201).json(enriched);
});

router.get("/trending", async (req, res) => {
  const posts = await db.select().from(postsTable).orderBy(desc(postsTable.likesCount)).limit(20);
  const enriched = await Promise.all(posts.map((p) => enrichPost(p)));
  res.json(enriched);
});

router.get("/:id", async (req, res) => {
  const parsed = GetPostParams.safeParse({ id: parseInt(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, parsed.data.id));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  const enriched = await enrichPost(post);
  res.json(enriched);
});

router.delete("/:id", async (req, res) => {
  const parsed = DeletePostParams.safeParse({ id: parseInt(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(postsTable).where(eq(postsTable.id, parsed.data.id));
  res.status(204).send();
});

router.post("/:id/like", async (req, res) => {
  const parsed = LikePostParams.safeParse({ id: parseInt(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, parsed.data.id));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  await db.insert(likesTable).values({ postId: parsed.data.id, userHandle: "current_user" }).onConflictDoNothing();
  const [updated] = await db.update(postsTable)
    .set({ likesCount: sql`${postsTable.likesCount} + 1` })
    .where(eq(postsTable.id, parsed.data.id))
    .returning();
  const enriched = await enrichPost(updated);
  res.json(enriched);
});

router.delete("/:id/like", async (req, res) => {
  const parsed = UnlikePostParams.safeParse({ id: parseInt(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, parsed.data.id));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  await db.delete(likesTable).where(eq(likesTable.postId, parsed.data.id));
  const [updated] = await db.update(postsTable)
    .set({ likesCount: sql`GREATEST(${postsTable.likesCount} - 1, 0)` })
    .where(eq(postsTable.id, parsed.data.id))
    .returning();
  const enriched = await enrichPost(updated);
  res.json(enriched);
});

router.get("/:id/replies", async (req, res) => {
  const parsed = ListRepliesParams.safeParse({ id: parseInt(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const replies = await db.select().from(repliesTable).where(eq(repliesTable.postId, parsed.data.id)).orderBy(repliesTable.createdAt);
  const enriched = await Promise.all(replies.map(async (r) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.handle, r.authorHandle));
    return {
      ...r,
      authorDisplayName: user?.displayName ?? r.authorHandle,
      authorAvatarUrl: user?.avatarUrl ?? null,
    };
  }));
  res.json(enriched);
});

router.post("/:id/replies", async (req, res) => {
  const paramsParsed = CreateReplyParams.safeParse({ id: parseInt(req.params.id) });
  const bodyParsed = CreateReplyBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [reply] = await db.insert(repliesTable).values({
    postId: paramsParsed.data.id,
    authorHandle: bodyParsed.data.authorHandle,
    content: bodyParsed.data.content,
  }).returning();
  await db.update(postsTable)
    .set({ repliesCount: sql`${postsTable.repliesCount} + 1` })
    .where(eq(postsTable.id, paramsParsed.data.id));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.handle, bodyParsed.data.authorHandle));
  res.status(201).json({
    ...reply,
    authorDisplayName: user?.displayName ?? bodyParsed.data.authorHandle,
    authorAvatarUrl: user?.avatarUrl ?? null,
  });
});

export default router;
