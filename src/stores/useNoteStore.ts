import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "../lib/database";
import { notes, reminders } from "../lib/schema";
import { scheduleReminder, cancelReminder } from "../lib/notifications";
import { getRandomColor } from "../lib/colors";
import type { Note, Reminder, NoteType } from "../types/note";

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
    transcript?: string
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
    const rows = await db.select().from(notes).orderBy(desc(notes.createdAt));
    const mapped: Note[] = rows.map((r) => ({
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
    const rows = await db.select().from(reminders).orderBy(desc(reminders.remindAt));
    const mapped: Reminder[] = rows.map((r) => ({
      id: r.id,
      noteId: r.noteId,
      remindAt: (r.remindAt as unknown as Date).getTime(),
      isDone: r.isDone,
      createdAt: (r.createdAt as unknown as Date).getTime(),
    }));
    set({ reminders: mapped });
  },

  createNote: async (content, type, color, audioUri, transcript) => {
    const now = new Date();
    const id = uuid();
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

    set((state) => ({ notes: [note, ...state.notes] }));
    return note;
  },

  updateNote: async (id, content) => {
    const now = new Date();
    await db.update(notes).set({ content, updatedAt: now }).where(eq(notes.id, id));
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, content, updatedAt: now.getTime() } : n
      ),
    }));
  },

  deleteNote: async (id) => {
    await db.delete(notes).where(eq(notes.id, id));
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      reminders: state.reminders.filter((r) => r.noteId !== id),
    }));
  },

  addReminder: async (noteId, noteContent, remindAt) => {
    const id = uuid();
    const now = new Date();

    await scheduleReminder(id, noteContent, remindAt);

    await db.insert(reminders).values({
      id,
      noteId,
      remindAt,
      isDone: false,
      createdAt: now,
    });

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
    await cancelReminder(id).catch(() => {});
    await db.update(reminders).set({ isDone: true }).where(eq(reminders.id, id));
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, isDone: true } : r
      ),
    }));
  },

  deleteReminder: async (id) => {
    await cancelReminder(id).catch(() => {});
    await db.delete(reminders).where(eq(reminders.id, id));
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
    }));
  },

  getReminderForNote: (noteId) => {
    return get().reminders.find((r) => r.noteId === noteId && !r.isDone);
  },
}));
