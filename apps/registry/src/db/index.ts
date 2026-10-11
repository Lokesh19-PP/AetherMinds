import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from './sqlite.js';
import { migrateDatabase } from './migrate.js';

let defaultDb: DatabaseSync | null = null;
let currentDbPath: string | null = null;

export function getDbPath(customPath?: string): string {
  if (customPath) return customPath;
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
  return path.join(dataDir, 'registry.db');
}

export function initDatabase(dbPath?: string): DatabaseSync {
  const resolvedPath = getDbPath(dbPath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(resolvedPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  migrateDatabase(db);
  currentDbPath = resolvedPath;
  return db;
}

export function getDb(customPath?: string): DatabaseSync {
  const targetPath = getDbPath(customPath);
  if (!defaultDb || currentDbPath !== targetPath) {
    if (defaultDb) {
      defaultDb.close();
    }
    defaultDb = initDatabase(targetPath);
  }
  return defaultDb;
}

export function closeDb(): void {
  if (defaultDb) {
    defaultDb.close();
    defaultDb = null;
    currentDbPath = null;
  }
}
