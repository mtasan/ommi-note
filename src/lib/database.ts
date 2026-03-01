import { Platform } from "react-native";

const DB_NAME = "asyra.db";

let _db: any = null;

export function getDb() {
  if (_db) return _db;
  if (Platform.OS === "web") return null;

  const { drizzle } = require("drizzle-orm/expo-sqlite");
  const { openDatabaseSync } = require("expo-sqlite");
  const schema = require("./schema");
  const expoDb = openDatabaseSync(DB_NAME);
  _db = drizzle(expoDb, { schema });
  return _db;
}

export async function initDatabase() {
  if (Platform.OS === "web") {
    console.log("[Asyra] Web platform - using in-memory store");
    return;
  }

  const { openDatabaseSync } = require("expo-sqlite");
  const expoDb = openDatabaseSync(DB_NAME);

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
