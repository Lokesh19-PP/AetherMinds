import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Feather, Key, PlusCircle, ArrowRight, Download, Upload, Shield, Eye, Layers } from 'lucide-react';

export const CreatorHome: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [keyFingerprint] = useState<string>('ed25519:7b3a9c...8f12');

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-sky font-bold">Side 2 · Business Application</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Creator Studio</h1>
          <p className="text-slate text-sm mt-1">
            Prove priority of registration and build cryptographic version creation trails with client-side Ed25519 signing.
          </p>
        </div>
        <Link
          to="/creator/new"
          className="px-5 py-2.5 rounded-xl bg-cerulean hover:bg-sky text-white hover:text-ink font-semibold text-sm flex items-center gap-2 transition-all shadow-md shadow-cerulean/20"
        >
          <PlusCircle className="w-4 h-4" />
          Register New Work
        </Link>
      </div>

      {/* Creator Key Card */}
      <div className="rounded-2xl border border-deep bg-ink/70 p-6 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky/20 text-sky flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Browser Ed25519 Creator Key</h3>
              <p className="text-xs text-slate font-mono">Fingerprint: {keyFingerprint}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-lg bg-deep/50 hover:bg-deep text-xs font-mono text-silver hover:text-white border border-deep flex items-center gap-1.5 transition-all">
              <Download className="w-3.5 h-3.5 text-sky" /> Export Key
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-deep/50 hover:bg-deep text-xs font-mono text-silver hover:text-white border border-deep flex items-center gap-1.5 transition-all">
              <Upload className="w-3.5 h-3.5 text-sky" /> Import Key
            </button>
          </div>
        </div>

        {/* Advisory chip */}
        <div className="p-3 rounded-xl bg-warn/10 border border-warn/30 text-amber-300 text-xs font-mono">
          <strong>Notice:</strong> Demo-grade key stored in browser localStorage. A cryptographic key is not a biological identity. It proves key possession and registration priority.
        </div>
      </div>

      {/* Works List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Registered Works & Trails</h2>
          <span className="text-xs font-mono text-slate">Showing 2 creation trails</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-deep/80 bg-ink/40 p-6 space-y-4 hover:border-sky/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-success/10 text-emerald-400 border border-success/30 text-[10px] font-mono font-bold uppercase">
                Anchored · Batch #1
              </span>
              <span className="text-xs font-mono text-slate">v2.0 (2 Versions)</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Cybernetic Genesis Concept Art</h3>
              <p className="text-xs text-slate mt-1 line-clamp-2">
                Digital painting series with procedural background elements and vector layers.
              </p>
            </div>
            <div className="pt-2 border-t border-deep/60 flex items-center justify-between">
              <Link
                to="/creator/works/work-001"
                className="text-xs font-semibold text-sky hover:text-white flex items-center gap-1"
              >
                View Creation Trail <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                to="/creator/certificate/rec-001"
                className="text-xs font-semibold text-silver hover:text-sky flex items-center gap-1"
              >
                Certificate <Eye className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-deep/80 bg-ink/40 p-6 space-y-4 hover:border-sky/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-success/10 text-emerald-400 border border-success/30 text-[10px] font-mono font-bold uppercase">
                Anchored · Batch #2
              </span>
              <span className="text-xs font-mono text-slate">v1.0 (Initial)</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Algorithmic Soundscape Vol 1</h3>
              <p className="text-xs text-slate mt-1 line-clamp-2">
                Generative audio stem composition registered under CC-BY-NC license.
              </p>
            </div>
            <div className="pt-2 border-t border-deep/60 flex items-center justify-between">
              <Link
                to="/creator/works/work-002"
                className="text-xs font-semibold text-sky hover:text-white flex items-center gap-1"
              >
                View Creation Trail <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                to="/creator/certificate/rec-002"
                className="text-xs font-semibold text-silver hover:text-sky flex items-center gap-1"
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
