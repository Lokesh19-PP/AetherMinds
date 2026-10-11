import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from './sqlite.js';
import { migrateDatabase } from './migrate.js';

export interface PreparedStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get<T = any>(...params: unknown[]): T | undefined;
  all<T = any>(...params: unknown[]): T[];
}

export interface RegistryDB {
  exec(sql: string): void;
  prepare(sql: string): PreparedStatement;
  close(): void;
}

let defaultDb: any = null;
let currentDbPath: string | null = null;

export function getDbPath(customPath?: string): string {
  if (customPath) return customPath;
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
  return path.join(dataDir, 'registry.db');
}

/**
 * Creates a synchronous SQLite database connection.
 * Uses native/adapter DatabaseSync and applies migrations or schema.sql.
 */
export function createDatabase(dbPath: string = ':memory:'): RegistryDB {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  let dbInstance: any;
  try {
    dbInstance = new DatabaseSync(dbPath);
  } catch {
    try {
      const { DatabaseSync: NodeDbSync } = require('node:sqlite');
      dbInstance = new NodeDbSync(dbPath);
    } catch {
      const BetterSqlite3 = require('better-sqlite3');
      dbInstance = new BetterSqlite3(dbPath);
    }
  }

  if (dbPath !== ':memory:') {
    dbInstance.exec ? dbInstance.exec('PRAGMA journal_mode = WAL;') : dbInstance.pragma?.('journal_mode = WAL');
  }
  dbInstance.exec ? dbInstance.exec('PRAGMA foreign_keys = ON;') : dbInstance.pragma?.('foreign_keys = ON');

  // Run migrations from main if available
  try {
    migrateDatabase(dbInstance);
  } catch {
    // Fallback to schema.sql from Yash if migrateDatabase is not applicable
    const dirName = typeof __dirname !== 'undefined'
      ? __dirname
      : path.dirname(fileURLToPath(import.meta.url));
    const schemaPath = path.join(dirName, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      dbInstance.exec(schemaSql);
    }
  }

  return dbInstance as RegistryDB;
}

export function initDatabase(dbPath?: string): DatabaseSync {
  const resolvedPath = getDbPath(dbPath);
  const db = createDatabase(resolvedPath) as any;
  currentDbPath = resolvedPath;
  defaultDb = db;
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

export function getDatabase(): RegistryDB {
  if (!defaultDb) {
    const dbFile = process.env.DATABASE_PATH || ':memory:';
    defaultDb = createDatabase(dbFile);
  }
  return defaultDb as RegistryDB;
}

export function setDatabase(db: RegistryDB): void {
  defaultDb = db;
}

export function closeDb(): void {
  if (defaultDb) {
    defaultDb.close();
    defaultDb = null;
    currentDbPath = null;
  }
}
