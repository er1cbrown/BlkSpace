import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const relaysTable = pgTable("relays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  town: text("town").notNull(),
  university: text("university").notNull(),
  tier: integer("tier").notNull().default(1),
  status: text("status").notNull().default("online"),
  eventsPerHour: integer("events_per_hour").notNull().default(0),
  connectedPeers: integer("connected_peers").notNull().default(0),
  uptimePercent: real("uptime_percent").notNull().default(100),
  storageUsedMb: integer("storage_used_mb").notNull().default(0),
  region: text("region").notNull().default("southeast"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRelaySchema = createInsertSchema(relaysTable).omit({ id: true, createdAt: true });
export type InsertRelay = z.infer<typeof insertRelaySchema>;
export type Relay = typeof relaysTable.$inferSelect;
