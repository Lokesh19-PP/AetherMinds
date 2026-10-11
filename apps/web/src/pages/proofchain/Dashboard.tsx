import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, FileCheck, FileSearch, Shield, CheckCircle2, ArrowRight, Database, Blocks } from 'lucide-react';

export const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-cerulean font-bold">Side 1 · Institutional Engine</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Issuer Dashboard</h1>
          <p className="text-slate text-sm mt-1">
            Manage institutional records, view Merkle tree batches, inspect dual anchors, and monitor registry drift.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/proofchain/register"
            className="px-4 py-2.5 rounded-xl bg-cerulean hover:bg-sky text-white hover:text-ink text-sm font-semibold flex items-center gap-2 transition-all shadow-md shadow-cerulean/20"
          >
            <FileCheck className="w-4 h-4" />
            Register Records
          </Link>
          <Link
            to="/proofchain/batches"
            className="px-4 py-2.5 rounded-xl bg-deep/50 hover:bg-deep text-silver hover:text-white border border-deep text-sm font-medium flex items-center gap-2 transition-all"
          >
            <Layers className="w-4 h-4 text-sky" />
            View Batches
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-deep bg-ink/50 p-6 space-y-2">
          <div className="text-slate text-xs font-mono uppercase tracking-wider">Total Sealed Batches</div>
          <div className="text-3xl font-extrabold text-white font-mono">2</div>
          <div className="text-xs text-emerald-400 font-mono">100% Dual Anchored</div>
        </div>

        <div className="rounded-2xl border border-deep bg-ink/50 p-6 space-y-2">
          <div className="text-slate text-xs font-mono uppercase tracking-wider">Registered Records</div>
          <div className="text-3xl font-extrabold text-white font-mono">16</div>
          <div className="text-xs text-sky font-mono">Canonical Leaves RFC 6962</div>
        </div>

        <div className="rounded-2xl border border-deep bg-ink/50 p-6 space-y-2">
          <div className="text-slate text-xs font-mono uppercase tracking-wider">Anchor Ledger Seq</div>
          <div className="text-3xl font-extrabold text-white font-mono">#2</div>
          <div className="text-xs text-slate font-mono">Witness Consistency: OK</div>
        </div>

        <div className="rounded-2xl border border-deep bg-ink/50 p-6 space-y-2">
          <div className="text-slate text-xs font-mono uppercase tracking-wider">Registry Drift Status</div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">0 DRIFT</div>
          <div className="text-xs text-emerald-400 font-mono">Audited Just Now</div>
        </div>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/proofchain/register"
          className="rounded-2xl border border-deep/80 hover:border-cerulean/60 bg-ink/30 p-6 space-y-4 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-cerulean/20 text-sky flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-sky transition-colors">
              Multi-File Registration
            </h3>
            <p className="text-slate text-xs mt-1">
              Drop files, inspect local AI metadata suggestions, confirm human review, and commit to open batch.
            </p>
          </div>
          <div className="text-xs font-semibold text-sky flex items-center gap-1 group-hover:translate-x-1 transition-all">
            Open Registration <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/proofchain/batches"
          className="rounded-2xl border border-deep/80 hover:border-cerulean/60 bg-ink/30 p-6 space-y-4 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-cerulean/20 text-sky flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-sky transition-colors">
              Merkle Batches & Trees
            </h3>
            <p className="text-slate text-xs mt-1">
              Explore interactive SVG Merkle trees, leaf-to-root folding, and download verified .pcproof.json bundles.
            </p>
          </div>
          <div className="text-xs font-semibold text-sky flex items-center gap-1 group-hover:translate-x-1 transition-all">
            Explore Batches <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/proofchain/audit"
          className="rounded-2xl border border-deep/80 hover:border-cerulean/60 bg-ink/30 p-6 space-y-4 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-cerulean/20 text-sky flex items-center justify-center">
            <FileSearch className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-sky transition-colors">
              Registry Drift Audit
            </h3>
            <p className="text-slate text-xs mt-1">
              Compare database roots, counts, and leaves against immutable anchor ledgers to detect silent data corruption.
            </p>
          </div>
          <div className="text-xs font-semibold text-sky flex items-center gap-1 group-hover:translate-x-1 transition-all">
            Run Audit <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
};
