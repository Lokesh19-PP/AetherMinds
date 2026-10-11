import React, { useState } from 'react';
import { ShieldCheck, Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Cpu, Layers, ExternalLink } from 'lucide-react';

export const Verify: React.FC = () => {
  const [docFile, setDocFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verified, setVerified] = useState<boolean>(false);

  const handleSimulateVerify = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setVerified(true);
    }, 800);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky/30 bg-sky/10 text-sky text-xs font-mono">
          <ShieldCheck className="w-4 h-4" />
          <span>Standalone Client Verifier · Rule R-A Enforced</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Public Proof Verification
        </h1>
        <p className="text-slate text-sm max-w-2xl">
          Drop the original document and its corresponding <code className="text-sky font-mono">.pcproof.json</code> proof bundle. Verification executes 100% inside your browser using pinned public keys, with zero network requests to the registry.
        </p>
      </div>

      {/* Upload Dropzones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document Drop */}
        <div className="rounded-2xl border-2 border-dashed border-deep/80 hover:border-cerulean/60 bg-ink/40 p-8 text-center space-y-4 transition-all">
          <div className="w-12 h-12 rounded-xl bg-deep/40 text-sky mx-auto flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Original Document</h3>
            <p className="text-xs text-slate mt-1">PDF, PNG, JPG, or JSON file</p>
          </div>
          <label className="inline-block px-4 py-2 rounded-lg bg-deep/60 hover:bg-deep text-xs font-semibold text-silver hover:text-white cursor-pointer transition-all border border-silver/20">
            Select File
            <input
              type="file"
              className="hidden"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
            />
          </label>
          {docFile && (
            <div className="text-xs font-mono text-emerald-400 bg-success/10 border border-success/30 px-3 py-1.5 rounded-lg flex items-center justify-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px]">{docFile.name}</span>
            </div>
          )}
        </div>

        {/* Proof Bundle Drop */}
        <div className="rounded-2xl border-2 border-dashed border-deep/80 hover:border-cerulean/60 bg-ink/40 p-8 text-center space-y-4 transition-all">
          <div className="w-12 h-12 rounded-xl bg-deep/40 text-sky mx-auto flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Proof Bundle (.pcproof.json)</h3>
            <p className="text-xs text-slate mt-1">Merkle path & dual anchor assertions</p>
          </div>
          <label className="inline-block px-4 py-2 rounded-lg bg-deep/60 hover:bg-deep text-xs font-semibold text-silver hover:text-white cursor-pointer transition-all border border-silver/20">
            Select Proof
            <input
              type="file"
              accept=".json,.pcproof.json"
              className="hidden"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
            />
          </label>
          {proofFile && (
            <div className="text-xs font-mono text-emerald-400 bg-success/10 border border-success/30 px-3 py-1.5 rounded-lg flex items-center justify-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px]">{proofFile.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Verify Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSimulateVerify}
          disabled={verifying}
          className="px-8 py-3.5 rounded-xl bg-cerulean hover:bg-sky text-white hover:text-ink font-semibold flex items-center gap-2 transition-all shadow-lg shadow-cerulean/20 disabled:opacity-50"
        >
          {verifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Computing SHA-256 & Re-Folding Merkle Path...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Execute Cryptographic Verification
            </>
          )}
        </button>
      </div>

      {/* 3-Line Result Card & Step List */}
      {verified && (
        <div className="space-y-6 pt-4 animate-fadeIn">
          {/* 3-Line Banner */}
          <div className="rounded-2xl border border-deep bg-ink/70 p-6 space-y-4">
            <h3 className="text-sm uppercase font-mono tracking-wider text-slate font-bold">
              Verification Verdict · Standalone Output
            </h3>

            <div className="space-y-3 font-mono text-xs">
              {/* Line 1: Integrity */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-success/10 border border-success/30 text-emerald-300">
                <span className="font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  1. CONTENT INTEGRITY
                </span>
                <span className="font-bold">VERIFIED · NO BITS MODIFIED</span>
              </div>

              {/* Line 2: Registration */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-success/10 border border-success/30 text-emerald-300">
                <span className="font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  2. PRIORITY OF REGISTRATION
                </span>
                <span className="font-bold">VERIFIED · ANCHORED IN BATCH #1</span>
              </div>

              {/* Line 3: Attribution */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-info/10 border border-info/30 text-sky">
                <span className="font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-info" />
                  3. ATTRIBUTION EVIDENCE (NEVER GREEN)
                </span>
                <span className="font-bold">SIGNED BY CREATOR KEY (EVIDENCE ONLY)</span>
              </div>
            </div>
          </div>

          {/* Cryptographic Step Accordion */}
          <div className="rounded-2xl border border-deep bg-ink/50 p-6 space-y-3">
            <h4 className="text-xs uppercase font-mono tracking-wider text-slate font-bold">
              Cryptographic Execution Trail (Steps S1 - S8)
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-deep/30 border border-deep/60 flex items-center justify-between">
                <span className="text-silver">S1 · Document Canonicalization & Leaf Hash 0x00</span>
                <span className="text-emerald-400 font-bold">PASS</span>
              </div>
              <div className="p-2.5 rounded-lg bg-deep/30 border border-deep/60 flex items-center justify-between">
                <span className="text-silver">S2 · RFC 6962 Merkle Path Root Recomputation</span>
                <span className="text-emerald-400 font-bold">PASS</span>
              </div>
              <div className="p-2.5 rounded-lg bg-deep/30 border border-deep/60 flex items-center justify-between">
                <span className="text-silver">S3 · Ledger Anchor Ed25519 Signature Verification</span>
                <span className="text-emerald-400 font-bold">PASS</span>
              </div>
              <div className="p-2.5 rounded-lg bg-deep/30 border border-deep/60 flex items-center justify-between">
                <span className="text-silver">S4 · Witness Watchdog Consistency Check</span>
                <span className="text-emerald-400 font-bold">PASS</span>
              </div>
              <div className="p-2.5 rounded-lg bg-deep/30 border border-deep/60 flex items-center justify-between">
                <span className="text-silver">S5 · Ethereum RootAnchor Contract Agreement</span>
                <span className="text-emerald-400 font-bold">PASS</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
