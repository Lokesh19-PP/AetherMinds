import React from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, ShieldCheck, Clock, Eye, Layers, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import type { WorkVersion } from '../lib/api';

export interface TrailTimelineProps {
  versions: WorkVersion[];
  workId: string;
}

export const TrailTimeline: React.FC<TrailTimelineProps> = ({ versions, workId }) => {
  if (!versions || versions.length === 0) {
    return (
      <div className="p-8 text-center text-slate font-mono text-xs border border-deep rounded-2xl bg-ink/40">
        No version history recorded for this work.
      </div>
    );
  }

  // Sort versions descending (newest on top)
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  return (
    <div className="w-full rounded-2xl border border-deep bg-ink/70 p-6 space-y-6 shadow-xl font-mono text-xs">
      <div className="flex items-center justify-between border-b border-deep/60 pb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-sky" />
          <h3 className="font-bold text-white uppercase tracking-wider text-xs">
            Cryptographic Creation Trail ({versions.length} Version{versions.length > 1 ? 's' : ''})
          </h3>
        </div>
        <span className="text-[11px] text-slate">Unbroken Parent Leaf Lineage</span>
      </div>

      {/* Vertical Timeline */}
      <div className="relative border-l-2 border-deep/80 ml-4 pl-6 space-y-8">
        {sortedVersions.map((v, idx) => {
          const isLatest = idx === 0;
          return (
            <div key={v.recordId || v.version} className="relative space-y-3 group">
              {/* Timeline Node Point */}
              <span
                className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-ink-deep transition-all ${
                  isLatest
                    ? 'bg-sky shadow-md shadow-sky/50 ring-4 ring-sky/10'
                    : 'bg-cerulean'
                }`}
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-white font-extrabold text-sm tracking-tight">
                    Version {v.version}.0
                  </span>
                  {isLatest && (
                    <span className="px-2 py-0.5 rounded-full bg-sky/20 text-sky border border-sky/40 text-[10px] font-bold uppercase">
                      Latest Release
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-success/10 text-emerald-400 border border-success/30 text-[10px] font-bold uppercase">
                    {v.status || 'Anchored'}
                  </span>
                </div>

                <div className="text-[11px] text-slate flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky" />
                  {v.anchoredAt ? new Date(v.anchoredAt).toLocaleDateString() : 'Anchored Entry'}
                </div>
              </div>

              {/* Hashes and Parent Leaf Linkage Card */}
              <div className="p-3.5 rounded-xl bg-ink-deep/80 border border-deep/80 space-y-2 group-hover:border-sky/40 transition-colors">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate">Current Version Leaf Hash:</div>
                  <div className="text-sky text-[11px] truncate" title={v.leafHash}>
                    {v.leafHash}
                  </div>
                </div>

                {v.parentLeaf ? (
                  <div className="space-y-1 pt-1 border-t border-deep/50">
                    <div className="text-[10px] uppercase font-bold text-slate flex items-center gap-1">
                      <span>Parent Leaf (v{v.version - 1}.0):</span>
                    </div>
                    <div className="text-silver/80 text-[11px] truncate font-semibold" title={v.parentLeaf}>
                      {v.parentLeaf}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] italic text-slate pt-1 border-t border-deep/50">
                    Genesis Version 1.0 (Initial Root Work — No Parent Leaf)
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <Link
                  to={`/creator/certificate/${v.recordId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cerulean/20 hover:bg-cerulean text-sky hover:text-white font-semibold text-xs transition-all border border-cerulean/40"
                >
                  <Eye className="w-3.5 h-3.5" /> View Certificate
                </Link>

                <Link
                  to={`/verify`}
                  className="inline-flex items-center gap-1 text-slate hover:text-sky text-xs transition-colors"
                >
                  Verify Independently <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
