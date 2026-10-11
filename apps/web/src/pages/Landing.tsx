import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Layers, Feather, FlaskConical, ArrowRight, Lock, FileCheck, Search, Sparkles } from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16 font-sans">
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold shadow-2xs">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>Next-Gen Document Integrity Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Tamper-Proof Document Security &{' '}
          <span className="text-blue-600">
            Instant Verification
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Secure certificates, official records, and creative works with mathematical proof. Verify authenticity anywhere, anytime — zero trust required.
        </p>

        {/* Quick Launch Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/proofchain/register"
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
          >
            <FileCheck className="w-5 h-5" />
            Register a Document
          </Link>
          <Link
            to="/verify"
            className="px-6 py-3 rounded-xl bg-white text-slate-800 border border-slate-300 hover:border-blue-400 hover:text-blue-600 font-semibold flex items-center gap-2 transition-all shadow-xs"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Verify Document
          </Link>
          <Link
            to="/proofchain/batches"
            className="px-5 py-3 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 font-semibold flex items-center gap-2 transition-all border border-slate-200"
          >
            <Layers className="w-5 h-5 text-slate-500" />
            View Batches & Records
          </Link>
        </div>
      </div>

      {/* 3 Simple Steps */}
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">How It Works in 3 Simple Steps</h2>
          <p className="text-sm text-slate-500">Simple for everyday users, cryptographically unbreakable under the hood.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs hover:border-blue-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-base">Upload Your Document</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Upload any PDF, credential, certificate, or image. Your browser creates a unique cryptographic fingerprint (SHA-256) of your file.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs hover:border-blue-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-base">Seal & Anchor Proof</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Documents are grouped into tamper-proof batches and anchored into an immutable ledger and smart contract with timestamp guarantees.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs hover:border-blue-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base">
              3
            </div>
            <h3 className="font-bold text-slate-900 text-base">Verify Anytime Anywhere</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Download your standalone <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-mono text-xs">.pcproof.json</code> bundle. Anyone can verify the file even if our servers are offline!
            </p>
          </div>
        </div>
      </div>

      {/* Two Main Solutions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Solution 1: Official Documents */}
        <div className="rounded-2xl bg-white border border-slate-200 p-8 space-y-6 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <FileCheck className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase font-mono tracking-wider text-blue-600 font-bold">Institutional Registry</span>
              <h2 className="text-2xl font-bold text-slate-900">Official Document Registry</h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Ideal for universities, government agencies, and organizations issuing diplomas, certificates, and legal contracts. Prevent forgery and enable instant public verification.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Upload & view documents inline with original copies preserved</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>One-click batch sealing and proof bundle exports</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Permanent ledger timestamps backed by cryptographic signatures</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/proofchain/register"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-all"
            >
              Start Registering Documents <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Solution 2: Creative Protection */}
        <div className="rounded-2xl bg-white border border-slate-200 p-8 space-y-6 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Feather className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase font-mono tracking-wider text-blue-600 font-bold">Creator Copyright</span>
              <h2 className="text-2xl font-bold text-slate-900">Creative Work Protection</h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                For authors, researchers, and digital creators. Establish legal timestamp priority on drafts, revisions, and final works using private cryptographic browser keys.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Zero file upload required — your confidential creative files stay on your device</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Chain revisions (Draft → Revision → Final) to prove creative evolution</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Generate printable Certificates of Authorship & Registration</span>
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
    </div>
  );
};
