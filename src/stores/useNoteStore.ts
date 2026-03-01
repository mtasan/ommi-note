import { create } from "zustand";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { getDb } from "../lib/database";
import { getRandomColor } from "../lib/colors";
import type { Note, Reminder, NoteType } from "../types/note";

// Lazy imports for native-only modules
function getDrizzleOps() {
  const { eq, desc } = require("drizzle-orm");
  const schema = require("../lib/schema");
  return { eq, desc, notes: schema.notes, reminders: schema.reminders };
}

function getNotifications() {
  if (Platform.OS === "web") {
    return {
      scheduleReminder: async () => {},
      cancelReminder: async () => {},
    };
  }
  return require("../lib/notifications");
}

interface NoteStore {
  notes: Note[];
  reminders: Reminder[];
  isLoading: boolean;

  loadNotes: () => Promise<void>;
  loadReminders: () => Promise<void>;
  createNote: (
    content: string,
    type: NoteType,
    color?: string,
    audioUri?: string,
    transcript?: string,
    reminderDate?: Date
  ) => Promise<Note>;
  updateNote: (id: string, content: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  addReminder: (noteId: string, noteContent: string, remindAt: Date) => Promise<void>;
  completeReminder: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  getReminderForNote: (noteId: string) => Reminder | undefined;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  reminders: [],
  isLoading: false,

  loadNotes: async () => {
    set({ isLoading: true });
    const db = getDb();
    if (!db) {
      // Web: keep existing in-memory state
      set({ isLoading: false });
      return;
    }
    const { desc, notes } = getDrizzleOps();
    const rows = await db.select().from(notes).orderBy(desc(notes.createdAt));
    const mapped: Note[] = rows.map((r: any) => ({
      id: r.id,
      content: r.content,
      type: r.type as NoteType,
      color: r.color,
      audioUri: r.audioUri,
      transcript: r.transcript,
      createdAt: (r.createdAt as unknown as Date).getTime(),
      updatedAt: (r.updatedAt as unknown as Date).getTime(),
    }));
    set({ notes: mapped, isLoading: false });
  },

  loadReminders: async () => {
    const db = getDb();
    if (!db) return;
    const { desc, reminders } = getDrizzleOps();
    const rows = await db.select().from(reminders).orderBy(desc(reminders.remindAt));
    const mapped: Reminder[] = rows.map((r: any) => ({
      id: r.id,
      noteId: r.noteId,
      remindAt: (r.remindAt as unknown as Date).getTime(),
      isDone: r.isDone,
      createdAt: (r.createdAt as unknown as Date).getTime(),
    }));
    set({ reminders: mapped });
  },

  createNote: async (content, type, color, audioUri, transcript, reminderDate) => {
    const now = new Date();
    const id = Crypto.randomUUID();
    const noteColor = color ?? getRandomColor().name;
    const note: Note = {
      id,
      content,
      type,
      color: noteColor,
      audioUri: audioUri ?? null,
      transcript: transcript ?? null,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    };

    const db = getDb();
    if (db) {
      const { notes } = getDrizzleOps();
      await db.insert(notes).values({
        id,
        content,
        type,
        color: noteColor,
        audioUri: audioUri ?? null,
        transcript: transcript ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    set((state) => ({ notes: [note, ...state.notes] }));

    // Auto-create reminder if a date was provided (from AI intent extraction)
    if (reminderDate && reminderDate.getTime() > Date.now()) {
      await get().addReminder(id, content, reminderDate);
    }

    return note;
  },

  updateNote: async (id, content) => {
    const now = new Date();
    const db = getDb();
    if (db) {
      const { eq, notes } = getDrizzleOps();
      await db.update(notes).set({ content, updatedAt: now }).where(eq(notes.id, id));
    }
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, content, updatedAt: now.getTime() } : n
      ),
    }));
  },

  deleteNote: async (id) => {
    const db = getDb();
    if (db) {
      const { eq, notes } = getDrizzleOps();
      await db.delete(notes).where(eq(notes.id, id));
    }
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      reminders: state.reminders.filter((r) => r.noteId !== id),
    }));
  },

  addReminder: async (noteId, noteContent, remindAt) => {
    const id = Crypto.randomUUID();
    const now = new Date();

    const { scheduleReminder } = getNotifications();
    await scheduleReminder(id, noteContent, remindAt, noteId);

    const db = getDb();
    if (db) {
      const { reminders } = getDrizzleOps();
      await db.insert(reminders).values({
        id,
        noteId,
        remindAt,
        isDone: false,
        createdAt: now,
      });
    }

    const reminder: Reminder = {
      id,
      noteId,
      remindAt: remindAt.getTime(),
      isDone: false,
      createdAt: now.getTime(),
    };

    set((state) => ({ reminders: [reminder, ...state.reminders] }));
  },

  completeReminder: async (id) => {
    const { cancelReminder } = getNotifications();
    await cancelReminder(id).catch(() => {});

    const db = getDb();
    if (db) {
      const { eq, reminders } = getDrizzleOps();
      await db.update(reminders).set({ isDone: true }).where(eq(reminders.id, id));
    }
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, isDone: true } : r
      ),
    }));
  },

  deleteReminder: async (id) => {
    const { cancelReminder } = getNotifications();
    await cancelReminder(id).catch(() => {});

    const db = getDb();
    if (db) {
      const { eq, reminders } = getDrizzleOps();
      await db.delete(reminders).where(eq(reminders.id, id));
    }
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
    }));
  },

  getReminderForNote: (noteId) => {
    return get().reminders.find((r) => r.noteId === noteId && !r.isDone);
  },
}));
