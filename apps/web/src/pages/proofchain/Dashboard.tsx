import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, FileCheck, FileSearch, Shield, CheckCircle2, ArrowRight, Database, Blocks, FlaskConical } from 'lucide-react';

export const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-blue-600 font-bold">Side 1 · Institutional Engine</div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Issuer Dashboard</h1>
          <p className="text-slate-600 text-sm mt-1">
            Manage institutional records, view Merkle tree batches, inspect dual anchors, and monitor registry drift.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/proofchain/register"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center gap-2 transition-all shadow-sm shadow-blue-500/20"
          >
            <FileCheck className="w-4 h-4" />
            Register Records
          </Link>
          <Link
            to="/proofchain/batches"
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-sm font-semibold flex items-center gap-2 transition-all shadow-2xs"
          >
            <Layers className="w-4 h-4 text-blue-600" />
            View Batches
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2 shadow-xs">
          <div className="text-slate-500 text-xs font-mono uppercase tracking-wider">Total Sealed Batches</div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">2</div>
          <div className="text-xs text-emerald-600 font-semibold font-mono">Dual-Anchored (Ledger + Chain)</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2 shadow-xs">
          <div className="text-slate-500 text-xs font-mono uppercase tracking-wider">Registered Records</div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">16</div>
          <div className="text-xs text-blue-600 font-semibold font-mono">Canonical RFC 6962 Leaves</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2 shadow-xs">
          <div className="text-slate-500 text-xs font-mono uppercase tracking-wider">Anchor Ledger Seq</div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">#2</div>
          <div className="text-xs text-emerald-600 font-semibold font-mono">Witness Anti-Fork: OK</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-2 shadow-xs">
          <div className="text-slate-500 text-xs font-mono uppercase tracking-wider">Registry Drift Status</div>
          <div className="text-3xl font-extrabold text-emerald-600 font-mono">0 DRIFT</div>
          <div className="text-xs text-slate-500 font-mono">Audited & Clean</div>
        </div>
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/proofchain/register"
          className="rounded-2xl border border-slate-200 hover:border-blue-300 bg-white p-6 space-y-4 transition-all group shadow-xs hover:shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
              Document Registration
            </h3>
            <p className="text-slate-600 text-xs mt-1">
              Drop document files, review deterministic metadata, confirm, and commit to open batch.
            </p>
          </div>
          <div className="text-xs font-semibold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-all">
            Open Registration <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/proofchain/batches"
          className="rounded-2xl border border-slate-200 hover:border-blue-300 bg-white p-6 space-y-4 transition-all group shadow-xs hover:shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
              Batches & Merkle Explorer
            </h3>
            <p className="text-slate-600 text-xs mt-1">
              Inspect batches, view Merkle tree diagrams, seal pending batches, and export proof bundles.
            </p>
          </div>
          <div className="text-xs font-semibold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-all">
            View Batches <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/proofchain/tamper-lab"
          className="rounded-2xl border border-amber-200 hover:border-amber-300 bg-white p-6 space-y-4 transition-all group shadow-xs hover:shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
              Adversarial Tamper Lab
            </h3>
            <p className="text-slate-600 text-xs mt-1">
              Simulate 5 adversarial attacks (flipped byte, forged proof, ledger edit) and observe defense responses.
            </p>
          </div>
          <div className="text-xs font-semibold text-amber-600 flex items-center gap-1 group-hover:translate-x-1 transition-all">
            Run Tamper Tests <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
};
