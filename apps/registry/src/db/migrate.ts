import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from './sqlite.js';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'proofchain_salt_2026').digest('hex');
}

export function migrateDatabase(db: DatabaseSync): void {
  // 1. Safe migrations for newly added columns FIRST before executing indexes
  try { db.exec('ALTER TABLE records ADD COLUMN registered_by_id TEXT;'); } catch {}
  try { db.exec('ALTER TABLE records ADD COLUMN registered_by_name TEXT;'); } catch {}
  try { db.exec('ALTER TABLE records ADD COLUMN registered_by_email TEXT;'); } catch {}
  try { db.exec('ALTER TABLE records ADD COLUMN registered_by_role TEXT;'); } catch {}

  // 2. Execute schema DDL
  const schemaPath = path.resolve(import.meta.dirname, 'schema.sql');
  let schemaSql = '';

  if (fs.existsSync(schemaPath)) {
    schemaSql = fs.readFileSync(schemaPath, 'utf8');
  } else {
    const altPath = path.resolve(process.cwd(), 'apps/registry/src/db/schema.sql');
    schemaSql = fs.readFileSync(altPath, 'utf8');
  }

  db.exec(schemaSql);

  // 3. Ensure an initial open batch exists if no batches exist
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM batches').get() as { count: number | bigint };
  if (Number(existingCount.count) === 0) {
    db.prepare(`
      INSERT INTO batches (id, status, created_at)
      VALUES (?, 'open', ?)
    `).run('b-0001', new Date().toISOString());
  }

  // 4. Pre-seed default demo users if users table is empty
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number | bigint };
    if (Number(userCount.count) === 0) {
      const defaultPasswordHash = hashPassword('password123');
      const now = new Date().toISOString();

      const insertUser = db.prepare(`
        INSERT INTO users (id, username, email, name, password_hash, role, organization, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertUser.run(
        'usr-alice-01',
        'alice',
        'alice@apex.edu',
        'Alice Smith',
        defaultPasswordHash,
        'issuer',
        'Apex University Registrar',
        now
      );

      insertUser.run(
        'usr-bob-02',
        'bob',
        'bob@vancedesign.com',
        'Bob Vance',
        defaultPasswordHash,
        'creator',
        'Vance Digital Studios',
        now
      );

      insertUser.run(
        'usr-carol-03',
        'carol',
        'carol@globaltrust.org',
        'Carol Danvers',
        defaultPasswordHash,
        'auditor',
        'Global Trust Compliance',
        now
      );
    }
  } catch (err: any) {
    console.warn('[Users seeding notice]:', err.message);
  }
}
