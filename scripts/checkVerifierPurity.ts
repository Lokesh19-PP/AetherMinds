import fs from 'node:fs';
import path from 'node:path';

const FORBIDDEN_WORDS = ['ollama', 'openai', 'anthropic', 'llm'];
const FORBIDDEN_IMPORTS = [
  'express',
  'better-sqlite3',
  'zod',
  '@proofchain/ai',
  'node:',
  'fs',
  'path',
  'crypto',
  'apps/'
];

function checkDirectory(dir: string, allowedPackages: string[]): boolean {
  let ok = true;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'test') {
        continue;
      }
      if (!checkDirectory(fullPath, allowedPackages)) {
        ok = false;
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      const content = fs.readFileSync(fullPath, 'utf8');

      // Check forbidden words (case-insensitive)
      for (const word of FORBIDDEN_WORDS) {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(content)) {
          console.error(`[PURITY VIOLATION] ${fullPath} contains forbidden AI word: "${word}"`);
          ok = false;
        }
      }

      // Check forbidden imports
      const importLines = content.match(/import\s+.*from\s+['"][^'"]+['"]/g) || [];
      for (const line of importLines) {
        const match = line.match(/from\s+['"]([^'"]+)['"]/);
        if (match) {
          const importTarget = match[1];

          // Check if it's a relative import
          if (importTarget.startsWith('.')) {
            continue;
          }

          // Check if it's in the allowed packages list
          const isAllowed = allowedPackages.some(
            (pkg) => importTarget === pkg || importTarget.startsWith(`${pkg}/`)
          );

          if (!isAllowed) {
            console.error(`[PURITY VIOLATION] ${fullPath} has disallowed import: "${importTarget}"`);
            ok = false;
          }

          // Check explicit forbidden packages
          for (const forbidden of FORBIDDEN_IMPORTS) {
            if (importTarget === forbidden || importTarget.startsWith(`${forbidden}/`) || importTarget.startsWith(forbidden)) {
              console.error(`[PURITY VIOLATION] ${fullPath} imports forbidden module: "${importTarget}"`);
              ok = false;
            }
          }
        }
      }
    }
  }

  return ok;
}

console.log('Running Verifier Purity Check (Section 16.2)...');

const coreDir = path.resolve('packages/core/src');
const verifierDir = path.resolve('packages/verifier/src');

let allPurityPassed = true;

console.log(`Checking packages/core: ${coreDir}`);
const corePassed = checkDirectory(coreDir, ['@noble/hashes', '@noble/curves']);
if (!corePassed) allPurityPassed = false;

console.log(`Checking packages/verifier: ${verifierDir}`);
const verifierPassed = checkDirectory(verifierDir, [
  '@noble/hashes',
  '@noble/curves',
  '@proofchain/core'
]);
if (!verifierPassed) allPurityPassed = false;

if (!allPurityPassed) {
  console.error('\n❌ Verifier purity check FAILED. Rule R-A and R-B violated.');
  process.exit(1);
} else {
  console.log('\n✅ Verifier purity check PASSED. Zero AI or registry leakage in cryptographic paths.');
  process.exit(0);
}
