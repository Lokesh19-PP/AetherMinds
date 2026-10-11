import React, { useState } from 'react';
import { Upload, CheckCircle2, Cpu } from 'lucide-react';

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
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 font-sans">
      <div>
        <div className="text-xs uppercase font-mono tracking-wider text-blue-600 font-bold">Side 1 · Registration</div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Register Institutional Records</h1>
        <p className="text-slate-600 text-sm mt-1">
          Upload documents to register them in the next open Merkle batch. Client-side canonicalization & AI suggestions with mandatory human confirmation.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white p-10 text-center space-y-4 shadow-sm transition-all">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
          <Upload className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Select Documents to Register</h3>
          <p className="text-xs text-slate-500 mt-1">PDFs, Certificates, Degree Audits, or Images (Up to 10 MB each)</p>
        </div>
        <label className="inline-block px-5 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-semibold cursor-pointer border border-blue-200 transition-all shadow-xs">
          Browse Files
          <input type="file" multiple className="hidden" onChange={handleFileChange} />
        </label>
        {files.length > 0 && (
          <div className="text-xs font-mono text-blue-700 font-semibold pt-2">
            {files.length} document(s) queued for hashing & metadata extraction
          </div>
        )}
      </div>

      {/* AI Extraction Preview & Human Confirmation */}
      {files.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              Local AI Metadata Extraction (Deterministic Rules / Naive Bayes)
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              Rule R-B: Human in the Loop
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {files.map((f, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{f.name}</div>
                  <div className="text-[11px] text-slate-500">Size: {(f.size / 1024).toFixed(1)} KB · Category: Official Transcript (94% conf)</div>
                </div>
                <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  Suggested
                </span>
              </div>
            ))}
          </div>

          {/* Mandatory Checkbox */}
          <div className="pt-4 border-t border-slate-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900">I have reviewed and confirmed these metadata values.</strong> AI suggestions are purely assistive and have zero effect on cryptographic integrity proofs.
              </span>
            </label>
          </div>

          <button
            onClick={handleRegister}
            disabled={!confirmed || submitting}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-sm"
          >
            {submitting ? 'Registering into Open Batch...' : 'Confirm & Commit Records to Batch'}
          </button>
        </div>
      )}

      {registered && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Records registered with status PENDING. Waiting for next batch seal.</span>
        </div>
      )}
    </div>
  );
};
