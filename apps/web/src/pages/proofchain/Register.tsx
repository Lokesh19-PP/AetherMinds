import React, { useState } from 'react';
import { Upload, FileCheck, CheckCircle2, AlertCircle, Cpu, Shield, ArrowRight } from 'lucide-react';

export const Register: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [registered, setRegistered] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleRegister = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setRegistered(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      <div>
        <div className="text-xs uppercase font-mono tracking-wider text-cerulean font-bold">Side 1 · Registration</div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Register Institutional Records</h1>
        <p className="text-slate text-sm mt-1">
          Upload documents to register them in the next open Merkle batch. Client-side canonicalization & AI suggestions with mandatory human confirmation.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="rounded-2xl border-2 border-dashed border-deep hover:border-cerulean/60 bg-ink/40 p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-deep/40 text-sky mx-auto flex items-center justify-center">
          <Upload className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Select Documents to Register</h3>
          <p className="text-xs text-slate mt-1">PDFs, Certificates, Degree Audits, or Images (Up to 10 MB each)</p>
        </div>
        <label className="inline-block px-5 py-2.5 rounded-lg bg-cerulean/20 hover:bg-cerulean text-sky hover:text-white text-xs font-semibold cursor-pointer border border-cerulean/40 transition-all">
          Browse Files
          <input type="file" multiple className="hidden" onChange={handleFileChange} />
        </label>
        {files.length > 0 && (
          <div className="text-xs font-mono text-sky pt-2">
            {files.length} document(s) queued for hashing & metadata extraction
          </div>
        )}
      </div>

      {/* AI Extraction Preview & Human Confirmation */}
      {files.length > 0 && (
        <div className="rounded-2xl border border-deep bg-ink/50 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky" />
              Local AI Metadata Extraction (Deterministic Rules / Naive Bayes)
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky/10 text-sky border border-sky/30">
              Rule R-B: Human in the Loop
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {files.map((f, i) => (
              <div key={i} className="p-3 rounded-xl bg-deep/20 border border-deep/60 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{f.name}</div>
                  <div className="text-[11px] text-slate">Size: {(f.size / 1024).toFixed(1)} KB · Category: Official Transcript (94% conf)</div>
                </div>
                <span className="px-2 py-1 rounded bg-success/10 text-emerald-400 border border-success/30 font-bold">
                  Suggested
                </span>
              </div>
            ))}
          </div>

          {/* Mandatory Checkbox */}
          <div className="pt-4 border-t border-deep/60">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-deep text-cerulean focus:ring-sky"
              />
              <span className="text-xs text-silver leading-relaxed">
                <strong className="text-white">I have reviewed and confirmed these metadata values.</strong> AI suggestions are purely assistive and have zero effect on cryptographic integrity proofs.
              </span>
            </label>
          </div>

          <button
            onClick={handleRegister}
            disabled={!confirmed || submitting}
            className="w-full py-3 rounded-xl bg-cerulean hover:bg-sky text-white hover:text-ink font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          >
            {submitting ? 'Registering into Open Batch...' : 'Confirm & Commit Records to Batch'}
          </button>
        </div>
      )}

      {registered && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Records registered with status PENDING. Waiting for next batch seal.</span>
        </div>
      )}
    </div>
  );
};
