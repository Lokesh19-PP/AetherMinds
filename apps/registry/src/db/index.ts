import fs from 'node:fs';
import path from 'node:path';

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

/**
 * Creates a synchronous SQLite database connection.
 * Uses native node:sqlite (DatabaseSync) in Node 22+ or falls back to better-sqlite3.
 */
export function createDatabase(dbPath: string = ':memory:'): RegistryDB {
  let dbInstance: any;

  try {
    const { DatabaseSync } = require('node:sqlite');
    dbInstance = new DatabaseSync(dbPath);
    if (dbPath !== ':memory:') {
      dbInstance.exec('PRAGMA journal_mode = WAL;');
    }
    dbInstance.exec('PRAGMA foreign_keys = ON;');
  } catch {
    const BetterSqlite3 = require('better-sqlite3');
    dbInstance = new BetterSqlite3(dbPath);
    if (dbPath !== ':memory:') {
      dbInstance.pragma('journal_mode = WAL');
    }
    dbInstance.pragma('foreign_keys = ON');
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    dbInstance.exec(schemaSql);
  }

  return {
    exec(sql: string) {
      dbInstance.exec(sql);
    },
    prepare(sql: string): PreparedStatement {
      const stmt = dbInstance.prepare(sql);
      return {
        run(...params: unknown[]) {
          return stmt.run(...params);
        },
        get<T = any>(...params: unknown[]): T | undefined {
          return stmt.get(...params) as T | undefined;
        },
        all<T = any>(...params: unknown[]): T[] {
          return stmt.all(...params) as T[];
        },
      };
    },
    close() {
      dbInstance.close();
    },
  };
}

let defaultDb: RegistryDB | null = null;

export function getDatabase(): RegistryDB {
  if (!defaultDb) {
    const dbFile = process.env.DATABASE_PATH || ':memory:';
    defaultDb = createDatabase(dbFile);
  }
  return defaultDb;
}

export function setDatabase(db: RegistryDB): void {
  defaultDb = db;
}
