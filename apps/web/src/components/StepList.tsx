import React from 'react';
import { CheckCircle2, XCircle, MinusCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { StepResult } from '@proofchain/core';

export interface StepListProps {
  steps: StepResult[];
}

export const StepList: React.FC<StepListProps> = ({ steps }) => {
  const renderStatusBadge = (status: StepResult['status'] | 'skip', code?: string) => {
    switch (status) {
      case 'pass':
        return (
          <span className="px-2 py-0.5 rounded-full bg-success/20 text-emerald-400 border border-success/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> PASS
          </span>
        );
      case 'fail':
        return (
          <span className="px-2 py-0.5 rounded-full bg-danger/20 text-rose-400 border border-danger/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <XCircle className="w-3 h-3" /> FAIL {code ? `(${code})` : ''}
          </span>
        );
      case 'skipped':
      case 'skip' as any:
        return (
          <span className="px-2 py-0.5 rounded-full bg-deep/40 text-slate border border-deep text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <MinusCircle className="w-3 h-3" /> SKIP
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-warn/20 text-amber-400 border border-warn/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> WARN
          </span>
        );
    }
  };

  return (
    <div className="w-full rounded-2xl border border-deep bg-ink/70 p-6 space-y-4 shadow-xl font-mono text-xs">
      <div className="flex items-center justify-between border-b border-deep/60 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky" />
          <h3 className="font-bold text-white uppercase tracking-wider text-xs">
            Cryptographic Verification Steps (S1 – S8)
          </h3>
        </div>
        <span className="text-[11px] text-slate font-medium">
          {steps.filter((s) => s.status === 'pass').length} / {steps.length} Passed
        </span>
      </div>

      <div className="space-y-2.5">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`p-3 rounded-xl border transition-all ${
              step.status === 'pass'
                ? 'bg-deep/10 border-deep/60 hover:border-cerulean/40'
                : step.status === 'fail'
                ? 'bg-danger/10 border-danger/40'
                : 'bg-ink-deep/40 border-deep/40 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sky font-bold text-[11px] min-w-[70px]">
                  {step.id}
                </span>
                <span className="font-semibold text-white text-xs">
                  {step.label || (step as any).name}
                </span>
              </div>
              <div>{renderStatusBadge(step.status, (step as any).code)}</div>
            </div>

            {(step.detail || (step as any).details) && (
              <div className="mt-1.5 text-[11px] text-slate pl-2 border-l border-deep/80 break-all">
                {step.detail || (step as any).details}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
