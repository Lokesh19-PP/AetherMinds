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
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" /> PASS
          </span>
        );
      case 'fail':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-700" /> FAIL {code ? `(${code})` : ''}
          </span>
        );
      case 'skipped':
      case 'skip' as any:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <MinusCircle className="w-3 h-3 text-slate-500" /> SKIP
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-700" /> WARN
          </span>
        );
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm font-mono text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
            Cryptographic Pipeline Steps (S1 – S8)
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-medium font-sans">
          {steps.filter((s) => s.status === 'pass').length} of {steps.length} Passed
        </span>
      </div>

      <div className="space-y-2.5">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`p-3.5 rounded-xl border transition-all ${
              step.status === 'pass'
                ? 'bg-slate-50/60 border-slate-200 hover:border-blue-300'
                : step.status === 'fail'
                ? 'bg-rose-50 border-rose-200'
                : 'bg-slate-50/40 border-slate-200 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-blue-700 font-bold text-xs min-w-[70px]">
                  {step.id}
                </span>
                <span className="font-semibold text-slate-900 text-xs">
                  {step.label || (step as any).name}
                </span>
              </div>
              <div>{renderStatusBadge(step.status, (step as any).code)}</div>
            </div>

            {(step.detail || (step as any).details) && (
              <div className="mt-2 text-[11px] text-slate-600 pl-2.5 border-l-2 border-slate-300 break-all font-sans leading-relaxed">
                {step.detail || (step as any).details}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
