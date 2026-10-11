import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from './sqlite.js';

export function migrateDatabase(db: DatabaseSync): void {
  const schemaPath = path.resolve(import.meta.dirname, 'schema.sql');
  let schemaSql = '';

  if (fs.existsSync(schemaPath)) {
    schemaSql = fs.readFileSync(schemaPath, 'utf8');
  } else {
    const altPath = path.resolve(process.cwd(), 'apps/registry/src/db/schema.sql');
    schemaSql = fs.readFileSync(altPath, 'utf8');
  }

  db.exec(schemaSql);

  // Ensure an initial open batch exists if no batches exist
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM batches').get() as { count: number | bigint };
  if (Number(existingCount.count) === 0) {
    db.prepare(`
      INSERT INTO batches (id, status, created_at)
      VALUES (?, 'open', ?)
    `).run('b-0001', new Date().toISOString());
  }
}
