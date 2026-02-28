export type NoteType = "text" | "voice" | "mixed";

export interface Note {
  id: string;
  content: string;
  type: NoteType;
  color: string;
  audioUri: string | null;
  transcript: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Reminder {
  id: string;
  noteId: string;
  remindAt: number;
  isDone: boolean;
  createdAt: number;
}

export interface NoteWithReminder extends Note {
  reminder?: Reminder | null;
}
