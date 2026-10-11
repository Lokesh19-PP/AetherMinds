import fs from 'node:fs';
import {
  verifyBundle,
  formatThreeLine,
  HttpLedgerReader,
  HttpWitnessReader,
  EthereumReader,
  StaticLedgerReader
} from '@proofchain/verifier';
import { PinnedConfig } from '@proofchain/core';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: proofchain-verify <file> <proof.json> [options]');
    console.log('Options:');
    console.log('  --anchor <url>       Anchor service URL (default: http://localhost:4100)');
    console.log('  --witness <url>      Witness service URL');
    console.log('  --rpc <url>          Ethereum JSON-RPC URL');
    console.log('  --contract <0x...>   Ethereum RootAnchor contract address');
    console.log('  --chain-id <id>      Expected chain ID (default: 31337)');
    console.log('  --pub <hex>          Pinned anchor public key');
    console.log('  --entry <entry.json> Offline entry JSON');
    process.exit(2);
  }

  const filePath = args[0];
  const proofPath = args[1];

  let anchorUrl = 'http://localhost:4100';
  let witnessUrl: string | undefined;
  let rpcUrl: string | undefined;
  let contract: string | undefined;
  let chainId = 31337;
  let pubKey = '03a107bff3ce10be1d70dd18e74bc09967e4d6309ba50d5f1ddc8664125531b8';
  let entryFile: string | undefined;

  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--anchor' && args[i + 1]) anchorUrl = args[++i];
    else if (args[i] === '--witness' && args[i + 1]) witnessUrl = args[++i];
    else if (args[i] === '--rpc' && args[i + 1]) rpcUrl = args[++i];
    else if (args[i] === '--contract' && args[i + 1]) contract = args[++i];
    else if (args[i] === '--chain-id' && args[i + 1]) chainId = parseInt(args[++i], 10);
    else if (args[i] === '--pub' && args[i + 1]) pubKey = args[++i];
    else if (args[i] === '--entry' && args[i + 1]) entryFile = args[++i];
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(2);
  }
  if (!fs.existsSync(proofPath)) {
    console.error(`Error: Proof file not found: ${proofPath}`);
    process.exit(2);
  }

  const documentBytes = fs.readFileSync(filePath);
  const bundleJson = JSON.parse(fs.readFileSync(proofPath, 'utf8'));

  const readers: any = {};
  if (entryFile && fs.existsSync(entryFile)) {
    const entryData = JSON.parse(fs.readFileSync(entryFile, 'utf8'));
    readers.ledger = new StaticLedgerReader(Array.isArray(entryData) ? entryData : [entryData]);
  } else {
    readers.ledger = new HttpLedgerReader(anchorUrl);
  }

  const witness = witnessUrl ? new HttpWitnessReader(witnessUrl) : undefined;
  if (rpcUrl && contract) {
    readers.ethereum = new EthereumReader({
      chainId,
      contract,
      rpcUrls: [rpcUrl]
    });
  }

  const pinned: PinnedConfig = {
    ledgerPublicKey: pubKey,
    ...(contract && rpcUrl ? { ethereum: { chainId, contract, rpcUrls: [rpcUrl], blockTag: 'latest' } } : {})
  };

  console.log(`\nVerifying document: ${filePath}`);
  console.log(`Using proof:        ${proofPath}\n`);

  const result = await verifyBundle({
    documentBytes,
    bundle: bundleJson,
    readers,
    witness,
    pinned
  });

  console.log('--- Step Breakdown ---');
  for (const step of result.steps) {
    const statusTag =
      step.status === 'pass'
        ? '\x1b[32m[PASS]\x1b[0m'
        : step.status === 'fail'
        ? '\x1b[31m[FAIL]\x1b[0m'
        : step.status === 'warn'
        ? '\x1b[33m[WARN]\x1b[0m'
        : '\x1b[90m[SKIP]\x1b[0m';
    console.log(`${statusTag} ${step.id}: ${step.label} ${step.detail ? `(${step.detail})` : ''}`);
  }

  const three = formatThreeLine(result);
  console.log('\n--- Three-Line Summary ---');
  console.log(`Integrity:    ${three.integrity.status === 'pass' ? '✓' : '✗'} ${three.integrity.text}`);
  console.log(`Registration: ${three.registration.status === 'pass' ? '✓' : '⚠️'} ${three.registration.text}`);
  console.log(`Attribution:  ℹ️ ${three.attribution.text}`);
  console.log(`\nVerdict: ${result.verdict} (${result.code})\n`);

  if (result.verdict === 'VALID') {
    process.exit(0);
  } else if (result.verdict === 'INVALID') {
    process.exit(1);
  } else {
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(2);
});
