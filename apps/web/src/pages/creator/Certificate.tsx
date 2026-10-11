import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, QrCode, CheckCircle2, Lock, ExternalLink, Printer } from 'lucide-react';

export const Certificate: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <Link
          to="/creator"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate hover:text-sky transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Creator Studio
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-deep/60 hover:bg-deep text-silver hover:text-white text-xs font-semibold flex items-center gap-2 border border-deep transition-all"
        >
          <Printer className="w-4 h-4 text-sky" /> Print Certificate
        </button>
      </div>

      {/* Dark Luxury Certificate Card */}
      <div className="rounded-3xl border-2 border-cerulean/30 bg-ink-deep p-8 sm:p-12 space-y-8 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cerulean/10 rounded-full blur-3xl pointer-events-none" />

        {/* Certificate Header */}
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-deep pb-8">
          <div className="space-y-1">
            <div className="text-[11px] uppercase font-mono tracking-widest text-sky font-bold">
              ProofChain · CreatorProof Protocol
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Certificate of Priority & Integrity
            </h1>
            <p className="text-xs text-slate font-mono">
              Certificate ID: {id || 'rec-001'} · Batch batch-001
            </p>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-cerulean/10 border border-cerulean/40 flex items-center justify-center text-sky shadow-inner">
            <ShieldCheck className="w-9 h-9" />
          </div>
        </div>

        {/* Asserted Cryptographic Properties */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-mono">
          <div className="p-4 rounded-xl bg-ink/80 border border-deep/80 space-y-1">
            <div className="text-slate uppercase text-[10px]">Content SHA-256 Hash</div>
            <div className="text-sky font-semibold break-all text-[11px]">
              e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
            </div>
          </div>

          <div className="p-4 rounded-xl bg-ink/80 border border-deep/80 space-y-1">
            <div className="text-slate uppercase text-[10px]">Anchor Assertion</div>
            <div className="text-emerald-400 font-semibold text-[11px]">
              Entry #1 at 2026-10-11T09:30:00Z (Ledger + EVM)
            </div>
          </div>
        </div>

        {/* Mandatory Certificate Text (Fixed Wording from Section 11.6) */}
        <div className="p-6 rounded-2xl bg-ink/50 border border-deep/60 text-xs text-silver leading-relaxed font-mono">
          <p className="italic">
            &ldquo;This certificate states that a record matching the file hash below was registered in batch batch-001 and anchored as entry #1 at 2026-10-11T09:30:00Z (anchor-asserted time). It does not establish who created the work or that its contents are true. Verify independently at http://localhost:5173/verify.&rdquo;
          </p>
        </div>

        {/* 3-Line Status Summary */}
        <div className="space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-success/10 border border-success/30 text-emerald-300">
            <span className="font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              1. Content Integrity
            </span>
            <span className="font-bold">VERIFIED</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-success/10 border border-success/30 text-emerald-300">
            <span className="font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              2. Priority of Registration
            </span>
            <span className="font-bold">VERIFIED</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-info/10 border border-info/30 text-sky">
            <span className="font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-info" />
              3. Attribution Evidence
            </span>
            <span className="font-bold">SIGNED BY CREATOR (EVIDENCE ONLY)</span>
          </div>
        </div>

        {/* QR Code and Independent Verification Footer */}
        <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-deep/80">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-white p-2 flex items-center justify-center shadow-lg">
              <QrCode className="w-16 h-16 text-black" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold text-white">Scan for Independent Verification</div>
              <div className="text-[11px] font-mono text-slate">
                Direct verification link embedded with record hash
              </div>
            </div>
          </div>

          <Link
            to={`/verify`}
            className="px-5 py-2.5 rounded-xl bg-cerulean hover:bg-sky text-white hover:text-ink text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-cerulean/20"
          >
            Verify Independently <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
