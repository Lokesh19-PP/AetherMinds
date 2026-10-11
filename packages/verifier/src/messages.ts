import { VerificationCode } from './codes.js';

export const CODE_MESSAGES: Record<VerificationCode, string> = {
  OK: 'All cryptographic checks passed. The document matches the registered record exactly and is anchored to the published root.',
  DOC_MODIFIED:
    'The document does not match the leaf recorded in the proof. Either the file content was modified, or the proof belongs to a different document.',
  PROOF_INVALID:
    'The proof bundle is malformed. The proof structure, path length, or hexadecimal values do not adhere to the proof specification.',
  ROOT_MISMATCH:
    'The cryptographic Merkle proof does not lead to the anchored root published in the immutable anchor ledger or smart contract.',
  ROOT_NOT_FOUND:
    'The anchor reference identified in the proof bundle was not found in the published anchor records.',
  ANCHOR_INVALID:
    'The anchor record authentication failed. The signature, cryptographic linkage, or chain parameters differ from the pinned root configuration.',
  ANCHOR_DISAGREEMENT:
    'The published ledger anchor and the Ethereum smart contract anchor state conflicting roots, leaf counts, or batch bindings.',
  WITNESS_MISMATCH:
    'The ledger history differs from the independent witness watchdog record, indicating a modified or compromised anchor history.',
  SIGNATURE_INVALID:
    'The creator Ed25519 digital signature over the registered manifest failed cryptographic verification.',
  ANCHOR_UNREACHABLE:
    'Unable to reach any configured anchor service or blockchain RPC. Verification is inconclusive without network confirmation.'
};

export function getCodeMessage(code: VerificationCode): string {
  return CODE_MESSAGES[code] || `Verification result code: ${code}`;
}
