import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Layers, Feather, FlaskConical, ArrowRight, Lock, Database, Search } from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-4 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-mono font-semibold">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>VORTEXA 3.0 · Problem B-01 · ProofChain + CreatorProof</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Cryptographic Document Registry &{' '}
          <span className="text-blue-600">
            Zero-Trust Attribution
          </span>
        </h1>

        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Verify digital credentials, institutional documents, and creative authorship client-side. Complete cryptographic certainty with zero reliance on the central registry.
        </p>

        {/* Quick Launch Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/verify"
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
          >
            <CheckCircle2 className="w-5 h-5" />
            Launch Public Verifier
          </Link>
          <Link
            to="/proofchain"
            className="px-6 py-3 rounded-xl bg-white text-slate-700 border border-slate-200 hover:border-blue-400 hover:text-blue-700 font-semibold flex items-center gap-2 transition-all shadow-xs"
          >
            <Layers className="w-5 h-5 text-blue-600" />
            Issuer Batches
          </Link>
          <Link
            to="/creator"
            className="px-6 py-3 rounded-xl bg-white text-slate-700 border border-slate-200 hover:border-blue-400 hover:text-blue-700 font-semibold flex items-center gap-2 transition-all shadow-xs"
          >
            <Feather className="w-5 h-5 text-blue-600" />
            Creator Studio
          </Link>
          <Link
            to="/proofchain/tamper-lab"
            className="px-6 py-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-semibold flex items-center gap-2 transition-all shadow-xs"
          >
            <FlaskConical className="w-5 h-5 text-amber-600" />
            Tamper Lab
          </Link>
        </div>
      </div>

      {/* Two Core Systems Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        {/* Side 1: ProofChain Card */}
        <div className="rounded-2xl bg-white border border-slate-200 p-8 space-y-6 hover:border-blue-300 transition-all shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Layers className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase font-mono tracking-wider text-blue-600 font-bold">Side 1 · Institutional Product</div>
              <h2 className="text-2xl font-bold text-slate-900">ProofChain Registry</h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                For universities, registrars, and enterprise issuers. Batches documents into RFC 6962 Merkle trees, dual-anchoring roots into an Ed25519 hash-chained ledger and local Ethereum smart contract.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-xs font-mono text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Deterministic SHA-256 Domain-Separated Merkle Batches</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Dual-Anchored: Ed25519 Signed Ledger + RootAnchor.sol</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Independent Anti-Fork Witness Watchdog (:4200)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/proofchain"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-all"
            >
              Open Issuer Portal <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Side 2: CreatorProof Card */}
        <div className="rounded-2xl bg-white border border-slate-200 p-8 space-y-6 hover:border-blue-300 transition-all shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Feather className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <div className="text-xs uppercase font-mono tracking-wider text-blue-600 font-bold">Side 2 · Creator Attribution</div>
              <h2 className="text-2xl font-bold text-slate-900">CreatorProof Studio</h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                For digital artists, authors, and researchers. Create verifiable creation trails linking work revisions (Draft → Revision → Final) via parent leaf hashes, signed with local Ed25519 browser keys.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-xs font-mono text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Browser Ed25519 Key Generation & Local Manifest Signing</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Cryptographic Revision Trails Chained via parentLeaf</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Priority Claim & Near-Duplicate SimHash Detection</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/creator"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-all"
            >
              Open Creator Studio <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
        <div className="p-6 rounded-xl bg-white border border-slate-200 space-y-2">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Pure Client Verification</h3>
          <p className="text-slate-600 text-sm">
            Verification runs entirely in your browser using pure cryptography. Zero registry dependencies or secret network calls.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white border border-slate-200 space-y-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">3-Line Legal Verdict</h3>
          <p className="text-slate-600 text-sm">
            Distinguishes Content Integrity, Registration Priority, and Attribution Evidence without deceptive green checkmarks.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white border border-slate-200 space-y-2">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 mb-3">
            <FlaskConical className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Adversarial Tamper Lab</h3>
          <p className="text-slate-600 text-sm">
            Live interactive simulations demonstrating defenses against flipped bytes, forged proof paths, and compromised ledgers.
          </p>
        </div>
      </div>
    </div>
  );
};
