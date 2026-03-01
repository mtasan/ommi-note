// Web-specific database module - no SQLite on web
// Metro will resolve this file instead of database.ts on web platform

export function getDb() {
  return null;
}

export async function initDatabase() {
  console.log("[OmmiNote] Web platform - using in-memory store");
}
