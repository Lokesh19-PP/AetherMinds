import React from 'react';
import { AlertTriangle, Clock, ShieldAlert, Key, UserCheck } from 'lucide-react';
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
    <div className="w-full rounded-2xl border border-warn/40 bg-warn/10 p-5 space-y-4 font-mono text-xs shadow-xl animate-fadeIn">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warn flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-white text-sm uppercase tracking-wide flex items-center gap-2">
            <span>Competing Content Claims Detected</span>
            <span className="px-2 py-0.5 rounded-full bg-warn/20 text-warn border border-warn/30 text-[10px]">
              {claims.length} Prior Claim{claims.length > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-silver/90 text-xs leading-relaxed font-sans">
            Another record matching this exact content hash has already been registered. In ProofChain, <strong>priority of registration</strong> is established strictly by anchor timestamp. Submitting this manifest creates attribution evidence but does not overwrite or invalidate earlier registered claims.
          </p>
        </div>
      </div>

      {/* Prior Claims List */}
      <div className="space-y-2 pt-1 border-t border-warn/20">
        <div className="text-[10px] uppercase font-bold text-slate">
          Prior Registered Claims (Ordered by Anchor Timestamp):
        </div>
        {claims.map((claim, idx) => (
          <div
            key={claim.recordId || idx}
            className="p-3 rounded-xl bg-ink-deep/80 border border-deep/60 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="text-white font-bold text-xs flex items-center gap-2">
                <span className="text-warn">Claim #{idx + 1}</span>
                <span className="text-slate">· Record ID: {claim.recordId}</span>
              </div>
              <div className="text-[11px] text-sky flex items-center gap-1.5 truncate max-w-sm">
                <Key className="w-3 h-3 text-slate flex-shrink-0" />
                <span className="truncate">Creator Key: {claim.creatorPub}</span>
              </div>
            </div>

            <div className="text-right text-[11px] font-mono">
              <div className="text-emerald-400 font-semibold flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" />
                {claim.anchoredAt ? new Date(claim.anchoredAt).toLocaleDateString() : 'Anchored'}
              </div>
              <span className="text-slate text-[10px] uppercase">{claim.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
