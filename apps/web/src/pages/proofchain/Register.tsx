import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, CheckCircle2, ArrowRight, Layers, AlertCircle, FileText, Eye, Download, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import { api, RecordResponse, getFileUrl } from '../../lib/api';
import { hashFile } from '../../lib/fileHash';
import { useAuth } from '../../context/AuthContext';
import '../../styles/pc-reg.css';

interface QueuedFile {
  file: File;
  title: string;
  contentHash: string;
  category: string;
  confidence: number;
}

export const Register: React.FC = () => {
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [confirmed, setConfirmed] = useState<boolean>(true);
  const [autoSeal, setAutoSeal] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [extracting, setExtracting] = useState<boolean>(false);
  const [registeredRecords, setRegisteredRecords] = useState<RecordResponse[]>([]);
  const [downloadingProof, setDownloadingProof] = useState<string | null>(null);
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
          if (f.name.endsWith('.pdf')) {
            category = 'Official Certificate / Diploma';
            confidence = 0.88;
          } else if (f.type.startsWith('image/')) {
            category = 'Photographic Evidence';
            confidence = 0.88;
          }
        }
        queued.push({
          file: f,
          title: f.name.replace(/\.[^/.]+$/, ''),
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

  const { currentUser } = useAuth();

  const handleRegister = async () => {
    if (queuedFiles.length === 0) return;
    setSubmitting(true);
    setError(null);

    const registrantName = currentUser?.name || 'Institutional Registration Officer';
    const registrantInfo = currentUser ? {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
    } : undefined;

    const results: RecordResponse[] = [];
    try {
      for (const item of queuedFiles) {
        const res = await api.registerRecord({
          file: item.file,
          title: item.title,
          fileName: item.file.name,
          mime: item.file.type || 'application/octet-stream',
          size: item.file.size,
          contentHash: item.contentHash,
          confirmedBy: registrantName,
          registeredBy: registrantInfo,
          storeCopy: true,
          metadata: {
            category: item.category,
            confidence: item.confidence,
            registeredBy: registrantName,
            registrantEmail: currentUser?.email,
            organization: currentUser?.organization,
            registeredVia: 'ProofChain Institutional Web Portal',
          },
        });
        results.push(res);
      }

      // If user selected auto-seal, finalize the batch immediately so proofs are ready
      if (autoSeal && results.length > 0) {
        try {
          await api.sealBatch(results[0].batchId);
        } catch (sealErr: any) {
          console.warn('Auto-seal note:', sealErr.message);
        }
      }

      setRegisteredRecords(results);
      setQueuedFiles([]);
    } catch (err: any) {
      setError(err.message || 'Failed to register records to batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadProof = async (recordId: string, batchId: string) => {
    setDownloadingProof(recordId);
    try {
      // If batch is still open, attempt to seal it first
      try {
        const proof = await api.getProof(recordId);
        triggerProofDownload(recordId, proof);
      } catch {
        await api.sealBatch(batchId);
        const proof = await api.getProof(recordId);
        triggerProofDownload(recordId, proof);
      }
    } catch (err: any) {
      alert(`Could not download proof: ${err.message}`);
    } finally {
      setDownloadingProof(null);
    }
  };

  const triggerProofDownload = (recordId: string, proof: any) => {
    const json = JSON.stringify(proof, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recordId}.pcproof.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 font-sans">
      <div>
        <div className="text-xs uppercase font-mono tracking-wider text-blue-600 font-bold">Document Registration</div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Register & Secure Documents</h1>
        <p className="text-slate-600 text-sm mt-1">
          Upload any certificate, credential, or document to create an immutable cryptographic timestamp on the ledger.
        </p>
      </div>

      {/* Active Logged-in Registrant Banner */}
      {currentUser && (
        <div className="p-4 rounded-2xl bg-white border border-blue-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <span>Certifying as: {currentUser.name}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                  {currentUser.role}
                </span>
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                {currentUser.email} {currentUser.organization ? `• ${currentUser.organization}` : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Identity Bound to Merkle Leaf</span>
          </div>
        </div>
      )}

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
          <h3 className="text-base font-bold text-slate-900">Select Files to Register</h3>
          <p className="text-xs text-slate-500 mt-1">PDFs, Certificates, Diplomas, or Images (Up to 50 MB each)</p>
        </div>
        <label className="inline-block px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-sm transition-all">
          Browse Documents
          <input type="file" multiple className="hidden" onChange={handleFileChange} />
        </label>
        {extracting && (
          <div className="text-xs font-mono text-blue-600 animate-pulse pt-2 flex items-center justify-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Analyzing file and calculating cryptographic fingerprint...
          </div>
        )}
      </div>

      {/* Registration Pipeline Status Card (Approved Design) */}
      <div className="pc-reg-card-entrance rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                {queuedFiles.length > 0 ? queuedFiles[0].file.name : '[FILE NAME].pdf'}
              </div>
              <div className="text-xs text-slate-500">Hashed in your browser</div>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-mono flex items-center gap-2 max-w-full overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-slate-400">SHA-256</span>
            <span className="pc-reg-typewriter font-mono text-blue-600 truncate">
              {queuedFiles.length > 0 ? queuedFiles[0].contentHash : 'e3b0c44298fc1c149afbf4c8996fb924'}
            </span>
          </div>
        </div>

        {/* 4 Pipeline Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/60 border border-slate-100">
            <div className="pc-reg-badge-1 w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              1
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Fingerprint</div>
              <div className="text-[11px] text-slate-500">SHA-256 computed locally</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/60 border border-slate-100">
            <div className="pc-reg-badge-2 w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              2
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Queue in open batch</div>
              <div className="text-[11px] text-slate-500">b-0012 accepting records</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/60 border border-slate-100">
            <div className="pc-reg-badge-3 w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              3
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Seal batch</div>
              <div className="text-[11px] text-slate-500">Merkle root generated</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/60 border border-slate-100">
            <div className="pc-reg-badge-4 w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
              4
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Anchor to ledger</div>
              <div className="text-[11px] text-slate-500">Timestamp is permanent</div>
            </div>
          </div>
        </div>

        {/* Progress bar under steps */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div className="pc-reg-progress-bar h-full bg-blue-600 rounded-full" />
        </div>
      </div>

      {/* Queued Documents Ready to Register */}
      {queuedFiles.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Document Details ({queuedFiles.length} file{queuedFiles.length > 1 ? 's' : ''})
            </h3>
            <span className="text-xs text-slate-500">
              SHA-256 fingerprint generated
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {queuedFiles.map((q, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    {q.file.name}
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {(q.file.size / 1024).toFixed(1)} KB
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Document Title</label>
                    <input
                      type="text"
                      value={q.title}
                      onChange={(e) => {
                        const updated = [...queuedFiles];
                        updated[i].title = e.target.value;
                        setQueuedFiles(updated);
                      }}
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Category</label>
                    <input
                      type="text"
                      value={q.category}
                      onChange={(e) => {
                        const updated = [...queuedFiles];
                        updated[i].category = e.target.value;
                        setQueuedFiles(updated);
                      }}
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono pt-1 truncate">
                  SHA-256 Digest: {q.contentHash}
                </div>
              </div>
            ))}
          </div>

          {/* User Confirmation & Auto-Seal Preferences */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSeal}
                onChange={(e) => setAutoSeal(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700">
                <strong>Seal batch immediately upon registration</strong> (Enables instant <code>.pcproof.json</code> proof download)
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-600">
                I confirm the accuracy of this document for immutable registration.
              </span>
            </label>
          </div>

          <button
            onClick={handleRegister}
            disabled={!confirmed || submitting}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-sm"
          >
            {submitting ? 'Registering Document...' : 'Secure & Register Document Now'}
          </button>
        </div>
      )}

      {/* Success View */}
      {registeredRecords.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 text-emerald-700 font-bold text-base">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>Document Successfully Registered & Stored!</span>
          </div>

          <div className="space-y-3 text-xs">
            {registeredRecords.map((r, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Record ID: {r.recordId}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Batch: {r.batchId} · Leaf Hash: {r.leafHash.slice(0, 24)}...
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold uppercase text-[10px]">
                    Registered
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200">
                  {/* View Document Button */}
                  <a
                    href={getFileUrl(r.recordId)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-900 border border-blue-200 font-semibold text-xs shadow-2xs transition-all"
                    title="View uploaded document"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" /> View Document
                  </a>

                  {/* Download Proof Bundle */}
                  <button
                    onClick={() => handleDownloadProof(r.recordId, r.batchId)}
                    disabled={downloadingProof === r.recordId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs transition-all disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {downloadingProof === r.recordId ? 'Exporting Proof...' : 'Download Proof (.pcproof.json)'}
                  </button>

                  {/* Verify Link */}
                  <Link
                    to="/verify"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-600" /> Open Verifier
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => setRegisteredRecords([])}
              className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-all border border-blue-200"
            >
              Register Another Document
            </button>
            <Link
              to="/proofchain/batches"
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
            >
              View All Batches & Records
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
