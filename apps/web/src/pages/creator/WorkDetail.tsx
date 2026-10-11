import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Feather, GitBranch, Shield, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const WorkDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      <Link
        to="/creator"
        className="inline-flex items-center gap-2 text-xs font-mono text-slate hover:text-sky transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Creator Studio
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-sky font-bold">Creation Trail Lineage</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Feather className="w-7 h-7 text-sky" />
            Work: {id || 'work-001'}
          </h1>
          <p className="text-slate text-sm mt-1">
            Immutable version timeline anchored across RFC 6962 batches. Each version links cryptographically to its parent leaf.
          </p>
        </div>
      </div>

      {/* Creation Trail Timeline */}
      <div className="rounded-2xl border border-deep bg-ink/70 p-6 space-y-6 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-sky" />
          Version History Provenance Trail
        </h3>

        <div className="space-y-6 relative border-l-2 border-deep/80 ml-4 pl-6">
          {/* Version 2 */}
          <div className="relative space-y-2">
            <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-sky border-2 border-ink-deep" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Version 2.0 · Final Production Release</span>
              <span className="text-xs font-mono text-emerald-400">Anchored · Batch #2</span>
            </div>
            <p className="text-xs text-slate font-mono">
              Leaf: 7110eda4d09e... | Parent Leaf: e3b0c44298fc... (v1.0)
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Link
                to="/creator/certificate/rec-002"
                className="text-xs font-semibold text-sky hover:text-white flex items-center gap-1"
              >
                View Certificate <Eye className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Version 1 */}
          <div className="relative space-y-2">
            <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-cerulean border-2 border-ink-deep" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Version 1.0 · Initial Concept Draft</span>
              <span className="text-xs font-mono text-emerald-400">Anchored · Batch #1</span>
            </div>
            <p className="text-xs text-slate font-mono">
              Leaf: e3b0c44298fc... | Genesis Leaf (No parent)
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Link
                to="/creator/certificate/rec-001"
                className="text-xs font-semibold text-sky hover:text-white flex items-center gap-1"
              >
                View Certificate <Eye className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Competing Claims Panel */}
      <div className="rounded-2xl border border-deep bg-ink/50 p-6 space-y-3">
        <h4 className="text-xs uppercase font-mono tracking-wider text-slate font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warn" />
          Competing Claims & Content Collision Monitor
        </h4>
        <p className="text-xs text-silver leading-relaxed">
          The registry checks for identical content hashes or high visual similarity across all registered manifests.
        </p>
        <div className="p-3 rounded-xl bg-deep/30 border border-deep/60 text-xs font-mono text-slate">
          No conflicting claims found for this content hash. You hold earliest registration priority.
        </div>
      </div>
    </div>
  );
};
