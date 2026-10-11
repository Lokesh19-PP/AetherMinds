import React from 'react';
import { CheckCircle2, XCircle, Info, ShieldCheck } from 'lucide-react';
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
  batchId = 'b-0001',
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
    : '2026-01-01 00:00 UTC';

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm font-mono text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
            Three-Line Verification Verdict (Section 9.5)
          </h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isOk
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
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
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/70 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {hasIntegrity ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold uppercase tracking-wide">
                1. Content Integrity
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                {hasIntegrity
                  ? 'Matches the registered record. Zero bit rot or unauthorized alterations.'
                  : `Document bytes modified or proof corrupted (Code: ${result.code}).`}
              </div>
            </div>
          </div>
          <span className={`font-extrabold uppercase text-[11px] ${hasIntegrity ? 'text-emerald-700' : 'text-rose-700'}`}>
            {hasIntegrity ? 'PASS' : 'FAIL'}
          </span>
        </div>

        {/* LINE 2: PRIORITY OF REGISTRATION (Green or Red) */}
        <div
          className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
            hasRegistration
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/70 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {hasRegistration ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold uppercase tracking-wide">
                2. Priority of Registration
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                {hasRegistration
                  ? `Batch ${batchId} · Anchor Entry #${anchorSeq} · Anchored ${displayTime} (anchor-asserted time).`
                  : 'Root mismatch or anchor ledger entry could not be authenticated.'}
              </div>
            </div>
          </div>
          <span className={`font-extrabold uppercase text-[11px] ${hasRegistration ? 'text-emerald-700' : 'text-rose-700'}`}>
            {hasRegistration ? 'PASS' : 'FAIL'}
          </span>
        </div>

        {/* LINE 3: ATTRIBUTION EVIDENCE (NEVER GREEN! Uses Blue / Info) */}
        <div
          className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
            isManifest && hasAttribution
              ? 'bg-blue-50/80 border-blue-200 text-blue-950'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold uppercase tracking-wide text-blue-800">
                3. Attribution Evidence (Never Green)
              </div>
              <div className="text-[11px] leading-relaxed text-slate-600 mt-0.5">
                {isManifest && hasAttribution
                  ? `Signed by key ${creatorPub ? `${creatorPub.slice(0, 14)}...` : '03a1...31b8'} (signature valid). The key holder's biological identity is not verified.`
                  : 'No creator signature in this record. Authorship is not established.'}
              </div>
            </div>
          </div>
          <span className="font-bold uppercase text-[11px] text-blue-700">
            {isManifest ? 'EVIDENCE' : 'UNCLAIMED'}
          </span>
        </div>
      </div>
    </div>
  );
};
