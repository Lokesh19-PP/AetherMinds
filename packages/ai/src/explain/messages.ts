/**
 * Deterministic plain-language template messages for each verification code.
 * (ProofChain Section 9.3 & 10.1)
 */
export const VERIFY_MESSAGES: Record<string, string> = {
  OK: 'The document matches the registered cryptographic record and all anchor checks succeeded.',
  DOC_MODIFIED:
    'The document does not match the leaf recorded in this proof bundle. Either the document has been modified since registration, or this proof belongs to a different document.',
  PROOF_INVALID:
    'The proof bundle is malformed or contains an invalid structure, length, or encoding.',
  ROOT_MISMATCH:
    'The cryptographic path in the proof does not calculate to the Merkle root published on the anchor.',
  ROOT_NOT_FOUND:
    'The anchor has no record of the sequence number or anchor identifier specified in the proof.',
  ANCHOR_INVALID:
    'The anchor entry failed cryptographic signature verification, hash chaining, or pinned configuration parameters.',
  ANCHOR_DISAGREEMENT:
    'The signed ledger and the Ethereum smart contract disagree on the root, leaf count, or batch binding.',
  WITNESS_MISMATCH:
    'The witness watchdog observed a ledger entry hash that conflicts with its recorded history.',
  SIGNATURE_INVALID:
    'The creator digital signature on this manifest is invalid or does not match the asserted public key.',
  ANCHOR_UNREACHABLE:
    'Could not contact any anchor service to verify the publication status of this proof.',
};

export function getTemplateMessage(code: string): string {
  return (
    VERIFY_MESSAGES[code] ||
    `Verification completed with status code ${code}.`
  );
}
