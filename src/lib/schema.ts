import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  content: text("content").notNull().default(""),
  type: text("type").notNull().default("text"), // 'text' | 'voice' | 'mixed'
  color: text("color").notNull().default("yellow"),
  audioUri: text("audio_uri"),
  transcript: text("transcript"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const reminders = sqliteTable("reminders", {
  id: text("id").primaryKey(),
  noteId: text("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  remindAt: integer("remind_at", { mode: "timestamp_ms" }).notNull(),
  isDone: integer("is_done", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
