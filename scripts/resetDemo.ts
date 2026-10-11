import fs from 'node:fs';
import path from 'node:path';

function resetDirectory(dirPath: string, keepFiles: string[] = []): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return;
  }

  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    if (keepFiles.includes(item)) {
      continue;
    }
    const fullPath = path.join(dirPath, item);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

async function main() {
  console.log('🧹 Resetting ProofChain demo data directories...');

  const rootDir = process.cwd();
  const dataDir = path.join(rootDir, 'data');
  const anchorDataDir = path.join(rootDir, 'anchor-data');
  const witnessDataDir = path.join(rootDir, 'witness-data');

  // Reset data/ (files, previews, registry.db)
  resetDirectory(dataDir);
  console.log('   Cleared data/ (registry DB and stored files)');

  // Reset anchor-data/ (keep anchor.key so keys remain consistent, wipe ledger.jsonl)
  resetDirectory(anchorDataDir, ['anchor.key']);
  console.log('   Cleared anchor-data/ledger.jsonl (preserved anchor.key)');

  // Reset witness-data/ (wipe entries.jsonl)
  resetDirectory(witnessDataDir);
  console.log('   Cleared witness-data/entries.jsonl');

  console.log('\n✅ Demo environment reset cleanly. Ready for new seeding or demo run!\n');
}

main().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
