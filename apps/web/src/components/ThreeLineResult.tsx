import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, ShieldCheck, Feather } from 'lucide-react';
import type { VerifyResult } from '@proofchain/core';

export interface ThreeLineResultProps {
  result: VerifyResult;
  batchId?: string;
  anchorSeq?: number;
  timestamp?: string;
  creatorPub?: string;
  isManifest?: boolean;
}

export const ThreeLineResult: React.FC<ThreeLineResultProps> = ({
  result,
  batchId = 'batch-001',
  anchorSeq = 1,
  timestamp,
  creatorPub,
  isManifest = false,
}) => {
  const isOk = result.verdict === 'VALID' || (result as any).ok === true;
  const hasIntegrity = isOk || (!['DOC_MODIFIED', 'LEAF_MISMATCH', 'ROOT_MISMATCH'].includes(result.code));
  const hasRegistration = isOk || (!['ANCHOR_INVALID', 'ANCHOR_DISAGREEMENT', 'WITNESS_MISMATCH', 'NOT_ANCHORED'].includes(result.code));
  const hasAttribution = Boolean(result.attribution?.signatureValid || (result as any).attribution?.signatureValid);

  const displayTime = timestamp
    ? new Date(timestamp).toUTCString()
    : '2026-10-11 09:30 UTC';

  return (
    <div className="w-full rounded-2xl border border-deep bg-ink/90 p-6 space-y-4 shadow-2xl font-mono text-xs">
      <div className="flex items-center justify-between border-b border-deep/60 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky" />
          <h3 className="font-bold text-white uppercase tracking-wider text-xs">
            Three-Line Verification Verdict (Section 9.5)
          </h3>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
            isOk
              ? 'bg-success/20 text-emerald-400 border border-success/40'
              : 'bg-danger/20 text-rose-400 border border-danger/40'
          }`}
        >
          {isOk ? 'VERIFIED · OK' : `REJECTED · ${result.code}`}
        </span>
      </div>

      <div className="space-y-3">
        {/* LINE 1: CONTENT INTEGRITY (Green or Red) */}
        <div
          className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
            hasIntegrity
              ? 'bg-success/10 border-success/30 text-emerald-300'
              : 'bg-danger/10 border-danger/30 text-rose-300'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {hasIntegrity ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold uppercase tracking-wide">
                1. Content Integrity
              </div>
              <div className="text-[11px] text-silver/90 mt-0.5">
                {hasIntegrity
                  ? 'Matches the registered record. Zero bit rot or unauthorized alterations.'
                  : `Document bytes modified or proof corrupted (Code: ${result.code}).`}
              </div>
            </div>
          </div>
          <span className="font-extrabold uppercase text-[11px]">
            {hasIntegrity ? 'PASS' : 'FAIL'}
          </span>
        </div>

        {/* LINE 2: PRIORITY OF REGISTRATION (Green or Red) */}
        <div
          className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
            hasRegistration
              ? 'bg-success/10 border-success/30 text-emerald-300'
              : 'bg-danger/10 border-danger/30 text-rose-300'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {hasRegistration ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold uppercase tracking-wide">
                2. Priority of Registration
              </div>
              <div className="text-[11px] text-silver/90 mt-0.5">
                {hasRegistration
                  ? `Batch ${batchId} · Anchor Entry #${anchorSeq} · Anchored ${displayTime} (anchor-asserted time).`
                  : 'Root mismatch or anchor ledger entry could not be authenticated.'}
              </div>
            </div>
          </div>
          <span className="font-extrabold uppercase text-[11px]">
            {hasRegistration ? 'PASS' : 'FAIL'}
          </span>
        </div>

        {/* LINE 3: ATTRIBUTION EVIDENCE (NEVER GREEN! Uses info #007EA7 / sky / warn) */}
        <div
          className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
            isManifest && hasAttribution
              ? 'bg-info/10 border-info/40 text-sky'
              : 'bg-deep/20 border-deep/60 text-silver/80'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold uppercase tracking-wide text-sky">
                3. Attribution Evidence (Never Green)
              </div>
              <div className="text-[11px] leading-relaxed mt-0.5">
                {isManifest && hasAttribution
                  ? `Signed by key ${creatorPub ? `${creatorPub.slice(0, 14)}...` : '03a1...31b8'} (signature valid). The key holder's biological identity is not verified.`
                  : 'No creator signature in this record. Authorship is not established.'}
              </div>
            </div>
          </div>
          <span className="font-bold uppercase text-[11px] text-sky">
            {isManifest ? 'EVIDENCE' : 'UNCLAIMED'}
          </span>
        </div>
      </div>
    </div>
  );
};
