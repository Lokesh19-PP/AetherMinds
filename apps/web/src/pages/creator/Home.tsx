import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Feather, Key, PlusCircle, ArrowRight, Download, Upload, Shield, Eye, Layers } from 'lucide-react';

export const CreatorHome: React.FC = () => {
  const [keyFingerprint] = useState<string>('ed25519:7b3a9c...8f12');

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-blue-600 font-bold">Side 2 · Business Application</div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Creator Studio</h1>
          <p className="text-slate-600 text-sm mt-1">
            Prove priority of registration and build cryptographic version creation trails with client-side Ed25519 signing.
          </p>
        </div>
        <Link
          to="/creator/new"
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-sm shadow-blue-500/20"
        >
          <PlusCircle className="w-4 h-4" />
          Register New Work
        </Link>
      </div>

      {/* Creator Key Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Browser Ed25519 Creator Key</h3>
              <p className="text-xs text-slate-500 font-mono">Fingerprint: {keyFingerprint}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-mono text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-all">
              <Download className="w-3.5 h-3.5 text-blue-600" /> Export Key
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-mono text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-all">
              <Upload className="w-3.5 h-3.5 text-blue-600" /> Import Key
            </button>
          </div>
        </div>

        {/* Advisory chip */}
        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs font-mono">
          <strong>Notice:</strong> Ed25519 creator key is stored in browser localStorage. A cryptographic key proves key possession and registration timestamp priority, not physical biological identity.
        </div>
      </div>

      {/* Works List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Registered Works & Version Trails</h2>
          <span className="text-xs font-mono text-slate-500">2 creation trails in Batch b-0002</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 hover:border-blue-300 transition-all shadow-xs">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold uppercase">
                Anchored · Batch b-0002
              </span>
              <span className="text-xs font-mono text-slate-500">v3.0 (3 Versions Linked)</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Decentralized Protocol Blueprint</h3>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                Multi-tier cryptographic consensus specifications with formal verification model and state diagram.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/creator/works/work-001"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                View Creation Trail <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                to="/creator/certificate/rec-001"
                className="text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1"
              >
                Certificate <Eye className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 hover:border-blue-300 transition-all shadow-xs">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold uppercase">
                Anchored · Batch b-0002
              </span>
              <span className="text-xs font-mono text-slate-500">v1.0 (Initial Registration)</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Deep Learning Survey on Zero-Knowledge Proofs</h3>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                Academic pre-print research exploring succinct non-interactive arguments of knowledge for confidential ML.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/creator/works/work-002"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                View Creation Trail <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                to="/creator/certificate/rec-002"
                className="text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1"
              >
                Certificate <Eye className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
