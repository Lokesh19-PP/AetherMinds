import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Layers, Feather, ArrowRight, Lock, Cpu, Database, EyeOff } from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cerulean/40 bg-cerulean/10 text-sky text-xs font-mono font-medium">
          <ShieldCheck className="w-4 h-4 text-sky" />
          <span>VORTEXA 3.0 · Problem B-01 · High-Trust Records Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Verifiable Records, Tamper Detection &{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky to-cerulean">
            Zero-Trust Attribution
          </span>
        </h1>

        <p className="text-lg text-slate max-w-2xl mx-auto leading-relaxed">
          One unified cryptographic engine powering institutional document integrity and creator attribution trails. Verifiable anywhere with zero dependency on the central registry.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            to="/verify"
            className="px-6 py-3 rounded-xl bg-cerulean text-white font-semibold flex items-center gap-2 hover:bg-sky hover:text-ink transition-all shadow-lg shadow-cerulean/20"
          >
            <CheckCircle2 className="w-5 h-5" />
            Launch Public Verifier
          </Link>
          <Link
            to="/proofchain"
            className="px-6 py-3 rounded-xl bg-deep/50 text-silver border border-deep hover:border-cerulean font-medium flex items-center gap-2 hover:text-white transition-all"
          >
            <Layers className="w-5 h-5 text-sky" />
            Issuer Dashboard
          </Link>
          <Link
            to="/creator"
            className="px-6 py-3 rounded-xl bg-deep/50 text-silver border border-deep hover:border-sky font-medium flex items-center gap-2 hover:text-white transition-all"
          >
            <Feather className="w-5 h-5 text-sky" />
            Creator Studio
          </Link>
        </div>
      </div>

      {/* Two Sides Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        {/* Side 1: ProofChain Card */}
        <div className="relative group rounded-2xl bg-gradient-to-b from-ink to-ink-deep border border-deep/80 p-8 space-y-6 hover:border-cerulean/60 transition-all shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-cerulean/20 border border-cerulean/40 flex items-center justify-center text-sky">
            <Layers className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase font-mono tracking-wider text-cerulean font-bold">Side 1 · Institutional Product</div>
            <h2 className="text-2xl font-bold text-white">ProofChain Issuer Engine</h2>
            <p className="text-slate text-sm leading-relaxed">
              Designed for universities, municipal registrars, and enterprise issuers. Register raw PDFs, images, and certificates into Merkle tree batches anchored to a cryptographic signed ledger and local Ethereum chain.
            </p>
          </div>

          <ul className="space-y-2 text-sm text-silver/80 font-mono text-xs">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              RFC 6962 Domain-Separated Merkle Batches
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Dual-Anchored: Ed25519 Signed Ledger + RootAnchor.sol
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Independent Witness Watchdog (:4200) Fork Detection
            </li>
          </ul>

          <div className="pt-4 border-t border-deep/60 flex items-center justify-between">
            <Link
              to="/proofchain"
              className="text-sm font-semibold text-sky hover:text-white flex items-center gap-1 group-hover:translate-x-1 transition-all"
            >
              Open Issuer Portal <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Side 2: CreatorProof Card */}
        <div className="relative group rounded-2xl bg-gradient-to-b from-ink to-ink-deep border border-deep/80 p-8 space-y-6 hover:border-sky/60 transition-all shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-sky/10 border border-sky/30 flex items-center justify-center text-sky">
            <Feather className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase font-mono tracking-wider text-sky font-bold">Side 2 · Business Application</div>
            <h2 className="text-2xl font-bold text-white">CreatorProof Studio</h2>
            <p className="text-slate text-sm leading-relaxed">
              Designed for digital artists, designers, and agencies. Hash files locally in-browser, sign RFC 8785 canonical manifests with client-side Ed25519 keys, and build immutable creation trails.
            </p>
          </div>

          <ul className="space-y-2 text-sm text-silver/80 font-mono text-xs">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-info" />
              Zero File Upload (100% Client-Side Streaming Hash)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-info" />
              Multi-Version Creation Trail Linked by Parent Leaf Hashes
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-info" />
              Attribution Evidence Panel & Luxury Certificates
            </li>
          </ul>

          <div className="pt-4 border-t border-deep/60 flex items-center justify-between">
            <Link
              to="/creator"
              className="text-sm font-semibold text-sky hover:text-white flex items-center gap-1 group-hover:translate-x-1 transition-all"
            >
              Open Creator Studio <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Trust Invariants Banner */}
      <div className="rounded-2xl border border-deep bg-ink/50 p-6 sm:p-8 backdrop-blur-md">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-sky" />
          The Three Frozen Architectural Invariants
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="space-y-1.5">
            <div className="text-xs font-mono font-bold text-sky">R-A · NO REGISTRY TRUST</div>
            <p className="text-slate text-xs leading-relaxed">
              The verifier checks documents against published anchor roots only. It makes ZERO calls to the central registry and never reads database state.
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-mono font-bold text-warn">R-B · DETERMINISTIC PURITY</div>
            <p className="text-slate text-xs leading-relaxed">
              AI is strictly local (rules + Naive Bayes) for metadata suggestions. AI never decides or alters any cryptographic verification verdict.
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-mono font-bold text-info">R-C · HONEST CLAIMS</div>
            <p className="text-slate text-xs leading-relaxed">
              We prove content integrity and registration priority. We never claim to prove biological authorship or truth of content.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
