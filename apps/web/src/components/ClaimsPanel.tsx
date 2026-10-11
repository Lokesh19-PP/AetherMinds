import React from 'react';
import { AlertTriangle, Clock, Key } from 'lucide-react';
import type { ClaimItem } from '../lib/api';

export interface ClaimsPanelProps {
  claims: ClaimItem[];
  contentHash: string;
}

export const ClaimsPanel: React.FC<ClaimsPanelProps> = ({ claims, contentHash }) => {
  if (!claims || claims.length === 0) {
    return null;
  }

  return (
    <div className="w-full rounded-2xl border border-amber-300 bg-amber-50/80 p-5 space-y-4 font-mono text-xs shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-amber-900 text-sm uppercase tracking-wide flex items-center gap-2">
            <span>Competing Content Claims Detected</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-800 border border-amber-300 text-[10px] font-bold">
              {claims.length} Prior Claim{claims.length > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-amber-800 text-xs leading-relaxed font-sans">
            Another record matching this exact content hash has already been registered. In ProofChain, <strong>priority of registration</strong> is established strictly by anchor timestamp. Submitting this manifest creates attribution evidence but does not overwrite earlier registered claims.
          </p>
        </div>
      </div>

      {/* Prior Claims List */}
      <div className="space-y-2 pt-1 border-t border-amber-200">
        <div className="text-[10px] uppercase font-bold text-amber-700">
          Prior Registered Claims (Ordered by Anchor Timestamp):
        </div>
        {claims.map((claim, idx) => (
          <div
            key={claim.recordId || idx}
            className="p-3 rounded-xl bg-white border border-amber-200/70 flex flex-wrap items-center justify-between gap-3 shadow-xs"
          >
            <div className="space-y-1">
              <div className="text-slate-900 font-bold text-xs flex items-center gap-2">
                <span className="text-amber-700">Claim #{idx + 1}</span>
                <span className="text-slate-500">· Record ID: {claim.recordId}</span>
              </div>
              <div className="text-[11px] text-blue-600 flex items-center gap-1.5 truncate max-w-sm">
                <Key className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="truncate">Creator Key: {claim.creatorPub}</span>
              </div>
            </div>

            <div className="text-right text-[11px] font-mono">
              <div className="text-emerald-700 font-semibold flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" />
                {claim.anchoredAt ? new Date(claim.anchoredAt).toLocaleDateString() : 'Anchored'}
              </div>
              <span className="text-slate-500 text-[10px] uppercase">{claim.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
