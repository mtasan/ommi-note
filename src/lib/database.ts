import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

const DB_NAME = "omminote.db";

const expoDb = openDatabaseSync(DB_NAME);

export const db = drizzle(expoDb, { schema });

export async function initDatabase() {
  expoDb.execSync(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'text',
      color TEXT NOT NULL DEFAULT 'yellow',
      audio_uri TEXT,
      transcript TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      remind_at INTEGER NOT NULL,
      is_done INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
}
