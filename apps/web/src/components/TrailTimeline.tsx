import React from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, Clock, ArrowRight } from 'lucide-react';
import type { WorkVersion } from '../lib/api';

export interface TrailTimelineProps {
  versions: WorkVersion[];
  workId: string;
}

export const TrailTimeline: React.FC<TrailTimelineProps> = ({ versions, workId }) => {
  if (!versions || versions.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs border border-slate-200 rounded-2xl bg-white shadow-sm">
        No version history recorded for this work.
      </div>
    );
  }

  // Sort versions descending (newest on top)
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm font-mono text-xs">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
            Cryptographic Creation Trail ({versions.length} Version{versions.length > 1 ? 's' : ''})
          </h3>
        </div>
        <span className="text-[11px] text-slate-500">Unbroken Parent Leaf Lineage</span>
      </div>

      {/* Vertical Timeline */}
      <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-8">
        {sortedVersions.map((v, idx) => {
          const isLatest = idx === 0;
          return (
            <div key={v.recordId || v.version} className="relative space-y-3 group">
              {/* Timeline Node Point */}
              <span
                className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white transition-all ${
                  isLatest
                    ? 'bg-blue-600 ring-4 ring-blue-100'
                    : 'bg-slate-400'
                }`}
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 font-extrabold text-sm tracking-tight">
                    Version {v.version}.0
                  </span>
                  {isLatest && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase">
                      Latest Release
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                    {v.status || 'Anchored'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-600" />
                  {v.anchoredAt ? new Date(v.anchoredAt).toLocaleDateString() : 'Anchored Entry'}
                </div>
              </div>

              {/* Hashes and Parent Leaf Linkage Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 group-hover:border-blue-300 transition-colors">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Current Version Leaf Hash:</div>
                  <div className="text-blue-700 text-[11px] font-semibold truncate" title={v.leafHash}>
                    {v.leafHash}
                  </div>
                </div>

                {v.parentLeaf ? (
                  <div className="space-y-1 pt-1 border-t border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                      <span>Parent Leaf (v{v.version - 1}.0):</span>
                    </div>
                    <div className="text-slate-700 text-[11px] truncate font-medium" title={v.parentLeaf}>
                      {v.parentLeaf}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] italic text-slate-500 pt-1 border-t border-slate-200">
                    Genesis Version 1.0 (Initial Root Work — No Parent Leaf)
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <Link
                  to={`/creator/certificate/${v.recordId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-semibold text-xs transition-all border border-blue-200 hover:border-transparent"
                >
                  View Certificate <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to={`/verify?record=${v.recordId}`}
                  className="text-slate-500 hover:text-blue-600 text-xs transition-colors"
                >
                  Verify Proof
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
