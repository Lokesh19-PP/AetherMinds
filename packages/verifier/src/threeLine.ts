import { VerifyResult } from '@proofchain/core';

export interface ThreeLineSummary {
  integrity: {
    status: 'pass' | 'fail';
    text: string;
  };
  registration: {
    status: 'pass' | 'fail' | 'warn';
    text: string;
    sublines: string[];
  };
  attribution: {
    status: 'info' | 'fail';
    text: string;
  };
}

export function formatThreeLine(result: VerifyResult): ThreeLineSummary {
  // Line 1: Integrity
  const integrityPass = result.verdict === 'VALID';
  const integrity = {
    status: (integrityPass ? 'pass' : 'fail') as 'pass' | 'fail',
    text: integrityPass ? 'Matches the registered record' : `${result.code}: ${result.message}`
  };

  // Line 2: Registration
  const sublines: string[] = [];
  let regStatus: 'pass' | 'fail' | 'warn' = 'fail';

  if (result.registrations && result.registrations.length > 0) {
    regStatus = 'pass';
    for (const reg of result.registrations) {
      if (reg.kind === 'ledger') {
        sublines.push(
          `Ledger: batch ${reg.batchId} · entry #${reg.ref} · ${reg.anchoredAt} (anchor-asserted time)`
        );
      } else if (reg.kind === 'ethereum') {
        sublines.push(
          `Ethereum: anchor #${reg.ref} · ${reg.anchoredAt} (chain-asserted, local chain)`
        );
      }
    }
    if (result.warnings.length > 0) {
      regStatus = 'warn';
    }
  } else if (result.code === 'ANCHOR_UNREACHABLE') {
    sublines.push('Could not reach any configured anchor service');
  } else {
    sublines.push('Registration not verified');
  }

  const registration = {
    status: regStatus,
    text: sublines.join(' | ') || 'Registration pending',
    sublines
  };

  // Line 3: Attribution (CRITICAL: Attribution status is NEVER green!)
  let attributionText = 'No creator signature in this record. Authorship is not established.';
  let attributionStatus: 'info' | 'fail' = 'info';

  if (result.attribution) {
    if (result.attribution.kind === 'signed') {
      if (result.attribution.signatureValid) {
        const pk = result.attribution.publicKey ? result.attribution.publicKey.slice(0, 8) + '…' + result.attribution.publicKey.slice(-4) : '';
        attributionText = `Signed by key ${pk} (signature valid). The key holder's identity is not verified.`;
        attributionStatus = 'info';
      } else {
        attributionText = 'Signature invalid';
        attributionStatus = 'fail';
      }
    }
  }

  const attribution = {
    status: attributionStatus,
    text: attributionText
  };

  return { integrity, registration, attribution };
}
