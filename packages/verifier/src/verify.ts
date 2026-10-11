import { keccak_256 } from '@noble/hashes/sha3';
import {
  ProofBundle,
  VerifyResult,
  StepResult,
  RegistrationInfo,
  AttributionInfo,
  PinnedConfig,
  validateBundleShape,
  leafHash,
  sha256Hex,
  verifyPath,
  verifyEntrySignature,
  verifyManifest,
  manifestLeafHash,
  utf8ToBytes,
  bytesToHex
} from '@proofchain/core';
import { VerificationCode } from './codes.js';
import { getCodeMessage } from './messages.js';
import { LedgerReader, ChainReader, WitnessReader, AnchorUnreachableError } from './anchorReader.js';

export interface VerifyInput {
  documentBytes: Uint8Array;
  bundle: unknown;
  readers: {
    ledger?: LedgerReader;
    ethereum?: ChainReader;
  };
  witness?: WitnessReader;
  pinned: PinnedConfig;
}

export async function verifyBundle(input: {
  documentBytes: Uint8Array;
  bundle: unknown;
  readers?: {
    ledger?: LedgerReader;
    ethereum?: ChainReader;
  };
  witness?: WitnessReader;
  pinned: PinnedConfig;
}): Promise<VerifyResult> {
  const steps: StepResult[] = [];
  const warnings: string[] = [];
  const registrations: RegistrationInfo[] = [];
  let attribution: AttributionInfo = { kind: 'none' };

  const readers = input.readers || {};

  // Helper to fail early in S1-S3
  function earlyFail(code: VerificationCode, currentStepId: string, label: string, detail: string): VerifyResult {
    steps.push({ id: currentStepId, label, status: 'fail', detail });
    return {
      verdict: 'INVALID',
      code,
      steps,
      warnings,
      registrations,
      attribution,
      message: getCodeMessage(code)
    };
  }

  // S1_PARSE
  const shape = validateBundleShape(input.bundle);
  if (!shape.valid) {
    return earlyFail('PROOF_INVALID', 'S1_PARSE', 'Bundle shape and format', shape.error || 'Invalid proof bundle shape');
  }
  const bundle = input.bundle as ProofBundle;
  steps.push({ id: 'S1_PARSE', label: 'Bundle shape and format', status: 'pass' });

  // S2_LEAF
  let expectedLeaf: string;
  if (bundle.recordKind === 'file') {
    expectedLeaf = leafHash(input.documentBytes);
  } else {
    // Manifest kind
    const docHash = sha256Hex(input.documentBytes);
    if (!bundle.manifest || bundle.manifest.fileHash !== docHash) {
      return earlyFail('DOC_MODIFIED', 'S2_LEAF', 'Document and leaf hash match', 'File does not match manifest fileHash');
    }
    expectedLeaf = manifestLeafHash(bundle.manifest);
  }

  if (expectedLeaf !== bundle.leafHash) {
    return earlyFail('DOC_MODIFIED', 'S2_LEAF', 'Document and leaf hash match', `Leaf hash mismatch: recomputed ${expectedLeaf} != bundle ${bundle.leafHash}`);
  }
  steps.push({ id: 'S2_LEAF', label: 'Document and leaf hash match', status: 'pass' });

  // S3_ROOT
  let calculatedRoot: string;
  try {
    calculatedRoot = verifyPath(bundle.leafHash, bundle.path);
    steps.push({ id: 'S3_ROOT', label: 'Merkle path folding to root', status: 'pass', detail: `Root: ${calculatedRoot}` });
  } catch (err) {
    return earlyFail('PROOF_INVALID', 'S3_ROOT', 'Merkle path folding to root', (err as Error).message);
  }

  // Anchor evaluation
  let reachableAnchorCount = 0;
  let hasAnchorFailure = false;
  let failingCode: VerificationCode | null = null;

  interface VerifiedAnchorData {
    kind: 'ledger' | 'ethereum';
    root: string;
    leafCount: number;
    batchId: string;
  }
  const authPassedAnchors: VerifiedAnchorData[] = [];

  for (const anchorRef of bundle.anchors) {
    const kind = anchorRef.kind;

    if (kind === 'ledger') {
      const stepFetchId = 'S4_ANCHOR_FETCH:ledger';
      const stepAuthId = 'S5_ANCHOR_AUTH:ledger';
      const stepCompareId = 'S6_ROOT_COMPARE:ledger';

      if (!readers.ledger) {
        warnings.push('Ledger reader not configured');
        steps.push({ id: stepFetchId, label: 'Fetch ledger entry', status: 'warn', detail: 'Ledger reader not configured' });
        continue;
      }

      let entry;
      try {
        entry = await readers.ledger.getEntry(anchorRef.seq);
      } catch (err) {
        warnings.push(`Ledger anchor unreachable: ${(err as Error).message}`);
        steps.push({ id: stepFetchId, label: 'Fetch ledger entry', status: 'warn', detail: (err as Error).message });
        continue;
      }

      if (!entry) {
        steps.push({ id: stepFetchId, label: 'Fetch ledger entry', status: 'fail', detail: `Entry #${anchorRef.seq} not found` });
        hasAnchorFailure = true;
        failingCode = failingCode || 'ROOT_NOT_FOUND';
        continue;
      }
      steps.push({ id: stepFetchId, label: 'Fetch ledger entry', status: 'pass', detail: `Seq: ${entry.seq}` });
      reachableAnchorCount++;

      // S5 Auth
      const sigOk = verifyEntrySignature(entry, input.pinned.ledgerPublicKey);
      if (!sigOk) {
        steps.push({ id: stepAuthId, label: 'Authenticate ledger entry', status: 'fail', detail: 'Ed25519 signature invalid' });
        hasAnchorFailure = true;
        failingCode = failingCode || 'ANCHOR_INVALID';
        continue;
      }

      if (entry.batchId !== bundle.batchId || entry.leafCount !== bundle.leafCount) {
        steps.push({ id: stepAuthId, label: 'Authenticate ledger entry', status: 'fail', detail: 'Batch ID or leaf count mismatch' });
        hasAnchorFailure = true;
        failingCode = failingCode || 'ROOT_MISMATCH';
        continue;
      }
      steps.push({ id: stepAuthId, label: 'Authenticate ledger entry', status: 'pass' });

      authPassedAnchors.push({
        kind: 'ledger',
        root: entry.root.toLowerCase(),
        leafCount: entry.leafCount,
        batchId: entry.batchId
      });

      // S6 Compare
      if (entry.root.toLowerCase() !== calculatedRoot.toLowerCase()) {
        steps.push({ id: stepCompareId, label: 'Compare Merkle root with ledger', status: 'fail', detail: `Expected ${calculatedRoot}, got ${entry.root}` });
        hasAnchorFailure = true;
        failingCode = failingCode || 'ROOT_MISMATCH';
      } else {
        steps.push({ id: stepCompareId, label: 'Compare Merkle root with ledger', status: 'pass' });
      }

      registrations.push({
        kind: 'ledger',
        batchId: entry.batchId,
        ref: entry.seq,
        anchoredAt: entry.ts,
        root: entry.root
      });

      // S7 Witness
      if (input.witness) {
        try {
          const wit = await input.witness.getEntry(entry.seq);
          if (!wit) {
            warnings.push('Witness has no record for this sequence');
            steps.push({ id: 'S7_WITNESS', label: 'Witness cross-check', status: 'warn', detail: 'No witness record' });
          } else if (wit.entryHash !== entry.entryHash) {
            steps.push({ id: 'S7_WITNESS', label: 'Witness cross-check', status: 'fail', detail: 'Witness entryHash does not match ledger' });
            hasAnchorFailure = true;
            failingCode = failingCode || 'WITNESS_MISMATCH';
          } else {
            steps.push({ id: 'S7_WITNESS', label: 'Witness cross-check', status: 'pass' });
          }
        } catch (err) {
          warnings.push(`Witness unreachable: ${(err as Error).message}`);
          steps.push({ id: 'S7_WITNESS', label: 'Witness cross-check', status: 'warn', detail: 'Witness unreachable' });
        }
      }
    } else if (kind === 'ethereum') {
      const stepFetchId = 'S4_ANCHOR_FETCH:ethereum';
      const stepAuthId = 'S5_ANCHOR_AUTH:ethereum';
      const stepCompareId = 'S6_ROOT_COMPARE:ethereum';

      if (!readers.ethereum) {
        warnings.push('Ethereum reader not configured');
        steps.push({ id: stepFetchId, label: 'Fetch Ethereum anchor', status: 'warn', detail: 'Ethereum reader not configured' });
        continue;
      }

      let chainAnchor;
      try {
        chainAnchor = await readers.ethereum.getAnchor(anchorRef.id);
      } catch (err) {
        warnings.push(`Ethereum anchor unreachable: ${(err as Error).message}`);
        steps.push({ id: stepFetchId, label: 'Fetch Ethereum anchor', status: 'warn', detail: (err as Error).message });
        continue;
      }

      if (!chainAnchor) {
        steps.push({ id: stepFetchId, label: 'Fetch Ethereum anchor', status: 'fail', detail: `Anchor ID ${anchorRef.id} not found on chain` });
        hasAnchorFailure = true;
        failingCode = failingCode || 'ROOT_NOT_FOUND';
        continue;
      }
      steps.push({ id: stepFetchId, label: 'Fetch Ethereum anchor', status: 'pass' });
      reachableAnchorCount++;

      // S5 Auth
      const expectedBatchKey = bytesToHex(keccak_256(utf8ToBytes(bundle.batchId)));
      if (chainAnchor.batchKey.toLowerCase() !== expectedBatchKey.toLowerCase()) {
        steps.push({ id: stepAuthId, label: 'Authenticate Ethereum anchor', status: 'fail', detail: 'batchKey does not match keccak256(batchId)' });
        hasAnchorFailure = true;
        failingCode = failingCode || 'ANCHOR_INVALID';
        continue;
      }

      if (chainAnchor.leafCount !== bundle.leafCount) {
        steps.push({ id: stepAuthId, label: 'Authenticate Ethereum anchor', status: 'fail', detail: `leafCount mismatch: expected ${bundle.leafCount}, got ${chainAnchor.leafCount}` });
        hasAnchorFailure = true;
        failingCode = failingCode || 'ROOT_MISMATCH';
        continue;
      }
      authPassedAnchors.push({
        kind: 'ethereum',
        root: chainAnchor.root.toLowerCase(),
        leafCount: chainAnchor.leafCount,
        batchId: bundle.batchId
      });

      // S6 Compare
      if (chainAnchor.root.toLowerCase() !== calculatedRoot.toLowerCase()) {
        steps.push({ id: stepCompareId, label: 'Compare Merkle root with Ethereum', status: 'fail', detail: `Expected ${calculatedRoot}, got ${chainAnchor.root}` });
        hasAnchorFailure = true;
        failingCode = failingCode || 'ROOT_MISMATCH';
      } else {
        steps.push({ id: stepCompareId, label: 'Compare Merkle root with Ethereum', status: 'pass' });
      }

      const dt = new Date(chainAnchor.timestamp * 1000).toISOString();
      registrations.push({
        kind: 'ethereum',
        batchId: bundle.batchId,
        ref: anchorRef.id,
        anchoredAt: dt,
        root: chainAnchor.root
      });
    }
  }

  // S6B_CROSS_CHECK
  if (authPassedAnchors.length === 2) {
    const a1 = authPassedAnchors[0];
    const a2 = authPassedAnchors[1];
    if (a1.root !== a2.root || a1.leafCount !== a2.leafCount || a1.batchId !== a2.batchId) {
      steps.push({ id: 'S6B_CROSS_CHECK', label: 'Cross-check dual anchors', status: 'fail', detail: 'Ledger and Ethereum roots/counts disagree' });
      hasAnchorFailure = true;
      failingCode = 'ANCHOR_DISAGREEMENT';
    } else {
      steps.push({ id: 'S6B_CROSS_CHECK', label: 'Cross-check dual anchors', status: 'pass' });
    }
  }

  // S8_SIGNATURE
  if (bundle.recordKind === 'manifest' && bundle.manifest) {
    const sigValid = verifyManifest(bundle.manifest);
    attribution = {
      kind: 'signed',
      publicKey: bundle.manifest.creator.publicKey,
      signatureValid: sigValid
    };

    if (!sigValid) {
      steps.push({ id: 'S8_SIGNATURE', label: 'Creator manifest signature', status: 'fail' });
      hasAnchorFailure = true;
      failingCode = failingCode || 'SIGNATURE_INVALID';
    } else {
      steps.push({ id: 'S8_SIGNATURE', label: 'Creator manifest signature', status: 'pass' });
    }
  }

  // Policy decision
  if (hasAnchorFailure) {
    const finalCode = failingCode || 'ROOT_MISMATCH';
    return {
      verdict: 'INVALID',
      code: finalCode,
      steps,
      warnings,
      registrations,
      attribution,
      message: getCodeMessage(finalCode)
    };
  }

  if (reachableAnchorCount === 0) {
    return {
      verdict: 'INCONCLUSIVE',
      code: 'ANCHOR_UNREACHABLE',
      steps,
      warnings,
      registrations,
      attribution,
      message: getCodeMessage('ANCHOR_UNREACHABLE')
    };
  }

  return {
    verdict: 'VALID',
    code: 'OK',
    steps,
    warnings,
    registrations,
    attribution,
    message: getCodeMessage('OK')
  };
}
