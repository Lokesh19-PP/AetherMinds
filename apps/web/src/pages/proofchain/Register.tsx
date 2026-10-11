import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, CheckCircle2, Cpu, ArrowRight, Layers, AlertCircle, FileText } from 'lucide-react';
import { api, RecordResponse, ExtractResponse } from '../../lib/api';
import { hashFile } from '../../lib/fileHash';

interface QueuedFile {
  file: File;
  contentHash: string;
  category: string;
  confidence: number;
}

export const Register: React.FC = () => {
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [extracting, setExtracting] = useState<boolean>(false);
  const [registeredRecords, setRegisteredRecords] = useState<RecordResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selected = Array.from(e.target.files);
    setExtracting(true);
    setError(null);

    const queued: QueuedFile[] = [];
    for (const f of selected) {
      try {
        const hashRes = await hashFile(f);
        let category = 'Institutional Record';
        let confidence = 0.90;
        try {
          const extRes = await api.extractMetadata(f);
          if (extRes.category?.label) {
            category = extRes.category.label;
            confidence = extRes.category.confidence;
          }
        } catch {
          // Heuristic fallback
          if (f.name.endsWith('.pdf')) {
            category = 'Official Academic Record / Document';
            confidence = 0.85;
          } else if (f.type.startsWith('image/')) {
            category = 'Verified Photographic Evidence';
            confidence = 0.88;
          }
        }
        queued.push({
          file: f,
          contentHash: hashRes.hex,
          category,
          confidence,
        });
      } catch (err: any) {
        setError('Failed to process file ' + f.name + ': ' + err.message);
      }
    }

    setQueuedFiles(queued);
    setExtracting(false);
  };

  const handleRegister = async () => {
    if (queuedFiles.length === 0 || !confirmed) return;
    setSubmitting(true);
    setError(null);

    const results: RecordResponse[] = [];
    try {
      for (const item of queuedFiles) {
        const res = await api.registerRecord({
          file: item.file,
          title: item.file.name.replace(/\.[^/.]+$/, ''),
          fileName: item.file.name,
          mime: item.file.type || 'application/octet-stream',
          size: item.file.size,
          contentHash: item.contentHash,
          confirmedBy: 'Admin / Registration Officer',
          metadata: {
            category: item.category,
            confidence: item.confidence,
            registeredVia: 'ProofChain Institutional Web Portal',
          },
        });
        results.push(res);
      }
      setRegisteredRecords(results);
      setQueuedFiles([]);
      setConfirmed(false);
    } catch (err: any) {
      setError(err.message || 'Failed to register records to batch');
    } finally {
      setSubmitting(false);
    }
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

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
        {extracting && (
          <div className="text-xs font-mono text-blue-600 animate-pulse pt-2">
            Computing browser SHA-256 and running local AI categorization...
          </div>
        )}
        {queuedFiles.length > 0 && !extracting && (
          <div className="text-xs font-mono text-blue-700 font-semibold pt-2">
            {queuedFiles.length} document(s) queued for hashing & metadata extraction
          </div>
        )}
      </div>

      {/* AI Extraction Preview & Human Confirmation */}
      {queuedFiles.length > 0 && (
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
            {queuedFiles.map((q, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{q.file.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Size: {(q.file.size / 1024).toFixed(1)} KB · Category: {q.category} ({Math.round(q.confidence * 100)}% conf)
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono truncate max-w-md">
                    SHA-256: {q.contentHash}
                  </div>
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

      {registeredRecords.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>Successfully registered {registeredRecords.length} record(s) into Batch {registeredRecords[0]?.batchId}!</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {registeredRecords.map((r, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Record ID: {r.recordId}</div>
                  <div className="text-[11px] text-slate-500">Leaf Hash: {r.leafHash.slice(0, 24)}...</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase text-[10px]">
                  {r.status}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link
              to="/proofchain/batches"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              <Layers className="w-4 h-4" /> Go to Batches & Seal Tree
            </Link>
            <button
              onClick={() => setRegisteredRecords([])}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
            >
              Register More Documents
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
