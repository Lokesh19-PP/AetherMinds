/**
 * contracts/scripts/deploy.ts
 * Deploys RootAnchor to the Hardhat node (:8545) and writes the pinned
 * Ethereum config to apps/web/src/generated/pinnedEthereum.ts
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network localhost
 *   (from the contracts/ directory)
 *
 * What it does (section 20.4):
 *  1. Generates a FRESH publisher key — does NOT use the well-known
 *     Hardhat account #0 (its private key is public, defeating security).
 *  2. Funds the new publisher from Hardhat dev account #0.
 *  3. Deploys RootAnchor(publisherAddress).
 *  4. Writes CHAIN_PUBLISHER_KEY to ../.env (appends or updates).
 *  5. Writes apps/web/src/generated/pinnedEthereum.ts.
 *
 * After this script the registry reads CHAIN_PUBLISHER_KEY from .env.
 * The verifier reads the contract address from pinnedEthereum.ts (pinned
 * at build time, never from a proof bundle).
 */

import { ethers, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

// ── Paths ─────────────────────────────────────────────────────────────────────

// This script lives in contracts/scripts/; workspace root is two levels up
const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const ENV_FILE = path.join(WORKSPACE_ROOT, '.env');
const PINNED_FILE = path.join(
  WORKSPACE_ROOT,
  'apps', 'web', 'src', 'generated', 'pinnedEthereum.ts',
);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Update or append a KEY=VALUE line in a .env file.
 * Creates the file if it doesn't exist.
 */
function upsertEnvVar(envPath: string, key: string, value: string): void {
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  }

  const lines = content.split('\n');
  const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
  const newLine = `${key}=${value}`;

  if (idx >= 0) {
    lines[idx] = newLine;
  } else {
    // Add a blank line separator before the new section if the file is not empty
    if (content.trim().length > 0) lines.push('');
    lines.push('# Ethereum chain (written by contracts/scripts/deploy.ts)');
    lines.push(newLine);
  }

  fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');
}

/** Ensure a directory exists (creates all parents). */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const networkName = network.name;
  const { chainId } = await ethers.provider.getNetwork();
  const rpcUrl =
    networkName === 'localhost'
      ? 'http://127.0.0.1:8545'
      : (network.config as { url?: string }).url ?? 'http://127.0.0.1:8545';

  console.log(`\n🔗 Network: ${networkName} (chainId=${chainId})`);
  console.log(`   RPC: ${rpcUrl}`);

  // ── 1. Generate a fresh publisher wallet ──────────────────────────────────
  const publisherWallet = ethers.Wallet.createRandom().connect(ethers.provider);
  const publisherAddress = publisherWallet.address;
  const publisherKey = publisherWallet.privateKey; // keep secret

  console.log(`\n🔑 Fresh publisher key generated`);
  console.log(`   Address: ${publisherAddress}`);

  // ── 2. Fund publisher from dev account #0 ─────────────────────────────────
  const [devAccount] = await ethers.getSigners();
  if (!devAccount) throw new Error('No signers available. Is the Hardhat node running?');

  const fundTx = await devAccount.sendTransaction({
    to: publisherAddress,
    value: ethers.parseEther('1.0'), // 1 ETH — plenty for many publish() calls
  });
  await fundTx.wait();
  console.log(`\n💰 Funded publisher with 1 ETH (tx: ${fundTx.hash.slice(0, 18)}...)`);

  // ── 3. Deploy RootAnchor ──────────────────────────────────────────────────
  const Factory = await ethers.getContractFactory('RootAnchor', publisherWallet);
  const contract = await Factory.deploy(publisherAddress);
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log(`\n📜 RootAnchor deployed`);
  console.log(`   Contract: ${contractAddress}`);
  console.log(`   Verified count: ${await contract.count()}`);

  // ── 4. Write .env ─────────────────────────────────────────────────────────
  upsertEnvVar(ENV_FILE, 'CHAIN_PUBLISHER_KEY', publisherKey);
  upsertEnvVar(ENV_FILE, 'RPC_URL', rpcUrl);
  upsertEnvVar(ENV_FILE, 'CHAIN_ID', chainId.toString());
  upsertEnvVar(ENV_FILE, 'ETH_CONTRACT', contractAddress);

  console.log(`\n📝 .env updated`);
  console.log(`   CHAIN_PUBLISHER_KEY written (keep secret!)`);
  console.log(`   ETH_CONTRACT=${contractAddress}`);

  // ── 5. Write apps/web/src/generated/pinnedEthereum.ts ────────────────────
  //
  // This file is imported by the verifier and the web app.
  // It is committed to git only after deploy, and pinned at build time.
  // The verifier NEVER reads the address from a proof bundle.
  //
  const pinnedContent = `// AUTO-GENERATED by contracts/scripts/deploy.ts
// DO NOT EDIT MANUALLY. Re-run deploy to update.
// Pinned at build time — the verifier uses these values, never bundle values.

export const pinnedEthereum = {
  chainId: ${chainId},
  contract: '${contractAddress}',
  rpcUrls: ['${rpcUrl}'],
  blockTag: 'latest',
} as const;

export type PinnedEthereum = typeof pinnedEthereum;
`;

  ensureDir(path.dirname(PINNED_FILE));
  fs.writeFileSync(PINNED_FILE, pinnedContent, 'utf-8');

  console.log(`\n📌 Pinned config written`);
  console.log(`   ${path.relative(WORKSPACE_ROOT, PINNED_FILE)}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Deploy complete!');
  console.log(`   Chain ID   : ${chainId}`);
  console.log(`   Contract   : ${contractAddress}`);
  console.log(`   Publisher  : ${publisherAddress}`);
  console.log(`   RPC        : ${rpcUrl}`);
  console.log('═'.repeat(60));
  console.log('\nNext steps:');
  console.log('  1. Keep .env secret (never commit CHAIN_PUBLISHER_KEY)');
  console.log('  2. Restart registry to pick up the new CHAIN_PUBLISHER_KEY');
  console.log('  3. Run `npm run seed` to register initial batches');
  console.log('');
}

main().catch((err) => {
  console.error('Deploy failed:', err);
  process.exit(1);
});
