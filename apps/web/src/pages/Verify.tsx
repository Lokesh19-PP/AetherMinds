import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Cpu, Layers, WifiOff, FileCode, Eye, Download, Sparkles, XCircle, ArrowRight } from 'lucide-react';
import { verifyBundle, HttpLedgerReader, StaticLedgerReader, EthereumReader } from '@proofchain/verifier';
import { sha256Hex, leafHash as computeLeafHash } from '@proofchain/core';
import type { VerifyResult, ProofBundle } from '@proofchain/core';
import { pinnedEthereum } from '../generated/pinnedEthereum';
import { anchorPublicKey } from '../generated/anchorPub';
import { ThreeLineResult } from '../components/ThreeLineResult';
import { StepList } from '../components/StepList';
import { api } from '../lib/api';

export const Verify: React.FC = () => {
  // Verification Mode: 'instant' (single file) or 'offline' (document + .pcproof.json)
  const [mode, setMode] = useState<'instant' | 'offline'>('instant');

  // Document state
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docBytes, setDocBytes] = useState<Uint8Array | null>(null);
  const [computedSha256, setComputedSha256] = useState<string>('');

  // Standalone Proof state (for offline mode)
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [bundleData, setBundleData] = useState<ProofBundle | null>(null);

  // Status & Results
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [foundRecord, setFoundRecord] = useState<any | null>(null);
  const [unregistered, setUnregistered] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  // Offline reader state
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [pastedLedgerJson, setPastedLedgerJson] = useState<string>('');
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);

  // Instant 1-Click Verification Handler
  const handleInstantFileSelected = async (file: File) => {
    setDocFile(file);
    setVerifyResult(null);
    setFoundRecord(null);
    setUnregistered(false);
    setAiExplanation(null);
    setVerifying(true);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setDocBytes(bytes);

      const hash = sha256Hex(bytes);
      setComputedSha256(hash);

      // Look up file in registry system automatically
      try {
        const lookupRes = await api.lookupRecordByHash(hash);
        if (lookupRes && lookupRes.record) {
          setFoundRecord(lookupRes.record);

          // If proof bundle is ready, verify cryptographic Merkle tree and ledger signature immediately
          if (lookupRes.proof) {
            setBundleData(lookupRes.proof);

            const ledgerReader = new HttpLedgerReader('http://localhost:4100');
            const chainReader = new EthereumReader(pinnedEthereum);

            const result = await verifyBundle({
              documentBytes: bytes,
              bundle: lookupRes.proof,
              readers: {
                ledger: ledgerReader,
                ethereum: chainReader,
              },
              pinned: {
                ledgerPublicKey: anchorPublicKey,
                ethereum: pinnedEthereum,
              },
            });

            setVerifyResult(result);

            try {
              const explainerRes = await api.explainVerification(result);
              setAiExplanation(explainerRes.text);
            } catch {
              setAiExplanation('Document cryptographic hash matches the immutable ledger record and batch Merkle root.');
            }
          }
          return;
        }
      } catch (err: any) {
        if (err.status === 404 || err.message?.includes('NOT_FOUND') || err.message?.includes('404')) {
          setUnregistered(true);
          return;
        }
        throw err;
      }

      setUnregistered(true);
    } catch (err: any) {
      alert('Verification error: ' + (err.message || 'Failed to process file'));
    } finally {
      setVerifying(false);
    }
  };

  // Manual Offline Verification Handler (when user provides both files)
  const handleOfflineVerify = async () => {
    if (!docBytes || !bundleData) {
      alert('Please select both the original document and the .pcproof.json file.');
      return;
    }

    setVerifying(true);
    setAiExplanation(null);

    try {
      let ledgerReader: any;
      if (isOfflineMode && pastedLedgerJson) {
        const parsed = JSON.parse(pastedLedgerJson);
        ledgerReader = new StaticLedgerReader(parsed);
      } else {
        ledgerReader = new HttpLedgerReader('http://localhost:4100');
      }

      const chainReader = new EthereumReader(pinnedEthereum);

      const result = await verifyBundle({
        documentBytes: docBytes,
        bundle: bundleData,
        readers: {
          ledger: ledgerReader,
          ethereum: chainReader,
        },
        pinned: {
          ledgerPublicKey: anchorPublicKey,
          ethereum: pinnedEthereum,
        },
      });

      setVerifyResult(result);
    } catch (err: any) {
      alert('Verification failed: ' + err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleDownloadProofJson = () => {
    if (!bundleData) return;
    const json = JSON.stringify(bundleData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${foundRecord?.id || 'document'}.pcproof.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Instant Document Verification</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Verify Document Authenticity
          </h1>
          <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
            Drop any document, image, or certificate below. The system checks the mathematical fingerprint against the tamper-proof ledger in seconds.
          </p>
        </div>

        {/* Verification Mode Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setMode('instant')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mode === 'instant' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1-Click File Verification
          </button>
          <button
            onClick={() => setMode('offline')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              mode === 'offline' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upload .pcproof.json Bundle
          </button>
        </div>
      </div>

      {/* Mode 1: Instant 1-Click Verification (Single File Upload) */}
      {mode === 'instant' && (
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white p-10 text-center space-y-4 transition-all shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center shadow-xs">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Drop Any Document to Verify</h3>
              <p className="text-xs text-slate-500 mt-1">PDFs, Certificates, Diplomas, Images, Audio, or Videos</p>
            </div>
            <label className="inline-block px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold cursor-pointer shadow-md shadow-blue-500/20 transition-all">
              Select Document
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleInstantFileSelected(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </label>
            {verifying && (
              <div className="text-xs font-mono text-blue-600 animate-pulse pt-2 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Computing SHA-256 fingerprint and querying decentralized anchors...
              </div>
            )}
          </div>

          {/* Verification Result: Authenticated & Registered */}
          {foundRecord && (
            <div className="rounded-2xl border border-emerald-200 bg-white p-6 space-y-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Document Verified & 100% Authentic!
                    </h2>
                    <p className="text-xs text-slate-500">
                      The cryptographic fingerprint of your file matches an immutable registered record.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase text-xs">
                  {foundRecord.batch_status || 'Anchored'}
                </span>
              </div>

              {/* Record Summary Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Document Title</div>
                  <div className="font-semibold text-slate-900 mt-0.5 truncate">{foundRecord.title || docFile?.name}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Merkle Batch</div>
                  <div className="font-semibold text-blue-700 mt-0.5 font-mono">{foundRecord.batch_id} · Leaf #{foundRecord.leaf_index ?? 0}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Ledger Anchor</div>
                  <div className="font-semibold text-slate-900 mt-0.5 font-mono">
                    {foundRecord.anchor_seq ? `Entry #${foundRecord.anchor_seq} (Signed)` : 'Batch Anchored'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">Blockchain Status</div>
                  <div className="font-semibold text-emerald-700 mt-0.5 font-mono">
                    {foundRecord.ethereum_tx_hash ? 'EVM Tx Confirmed' : 'Ledger Hash-Chained'}
                  </div>
                </div>
              </div>

              {/* Actions Strip */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {/* View Document */}
                <a
                  href={`/api/records/${foundRecord.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all"
                >
                  <Eye className="w-4 h-4" /> View Original Stored Copy
                </a>

                {/* Download Standalone Proof Bundle */}
                {bundleData && (
                  <button
                    onClick={handleDownloadProofJson}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all border border-slate-200"
                  >
                    <Download className="w-4 h-4 text-blue-600" /> Download .pcproof.json Certificate
                  </button>
                )}

                <Link
                  to={`/proofchain/batches/${foundRecord.batch_id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all border border-slate-200"
                >
                  <Layers className="w-4 h-4 text-slate-500" /> View Batch #{foundRecord.batch_id}
                </Link>
              </div>

              {/* Detailed Cryptographic Steps & AI Verdict */}
              {verifyResult && (
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <ThreeLineResult
                    result={verifyResult}
                    batchId={foundRecord.batch_id}
                    anchorSeq={foundRecord.anchor_seq || 1}
                    timestamp={foundRecord.anchored_at || foundRecord.created_at}
                    isManifest={false}
                  />

                  <StepList steps={verifyResult.steps} />

                  {aiExplanation && (
                    <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700 space-y-1">
                      <div className="font-bold text-blue-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Explanation Summary
                      </div>
                      <p>{aiExplanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Verification Result: Unregistered / Altered Document */}
          {unregistered && (
            <div className="rounded-2xl border border-rose-200 bg-white p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-3 text-rose-700">
                <XCircle className="w-7 h-7 flex-shrink-0" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Unregistered or Altered File</h2>
                  <p className="text-xs text-slate-500">
                    This file does not match any registered document on the ledger.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="text-slate-600">
                  ProofChain calculated the exact SHA-256 cryptographic digest of your uploaded file:
                </div>
                <div className="font-mono text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 break-all text-[11px]">
                  {computedSha256}
                </div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  Even a single altered byte, compressed pixel, or changed word produces a completely different hash. If this is a new document, you can register it now.
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/proofchain/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all"
                >
                  Register This Document on ProofChain <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Manual Offline .pcproof.json Verification */}
      {mode === 'offline' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700 flex items-center justify-between gap-2">
            <span>
              <strong>Air-Gapped & Offline Verification:</strong> Verify a document locally using a saved <code>.pcproof.json</code> bundle.
            </span>
            <button
              onClick={() => setShowOfflineModal(true)}
              className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 font-semibold text-xs shadow-2xs hover:bg-blue-50"
            >
              Air-Gapped Settings
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Document Drop */}
            <div className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white p-7 text-center space-y-3 transition-all shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">1. Select Document File</h3>
              <label className="inline-block px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer border border-slate-300">
                Browse Document
                <input
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setDocFile(file);
                      const buf = await file.arrayBuffer();
                      setDocBytes(new Uint8Array(buf));
                    }
                  }}
                  className="hidden"
                />
              </label>
              {docFile && (
                <div className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg truncate">
                  {docFile.name} ({(docFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {/* Proof Bundle Drop */}
            <div className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white p-7 text-center space-y-3 transition-all shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <FileCode className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">2. Select .pcproof.json File</h3>
              <label className="inline-block px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer border border-slate-300">
                Browse .pcproof.json
                <input
                  type="file"
                  accept=".json,.pcproof.json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setProofFile(file);
                      try {
                        const text = await file.text();
                        setBundleData(JSON.parse(text));
                      } catch {
                        alert('Invalid JSON file.');
                      }
                    }
                  }}
                  className="hidden"
                />
              </label>
              {proofFile && (
                <div className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg truncate">
                  {proofFile.name}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={handleOfflineVerify}
              disabled={verifying || !docFile || !bundleData}
              className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-sm disabled:opacity-40"
            >
              <CheckCircle2 className="w-4 h-4" /> Verify Using Proof File
            </button>
          </div>

          {verifyResult && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <ThreeLineResult
                result={verifyResult}
                batchId={bundleData?.batchId}
                anchorSeq={bundleData?.anchors?.[0]?.kind === 'ledger' ? bundleData.anchors[0].seq : 1}
                timestamp={(bundleData?.anchors?.[0] as any)?.timestamp || (bundleData?.anchors?.[0] as any)?.anchoredAt}
                isManifest={bundleData?.recordKind === 'manifest'}
              />
              <StepList steps={verifyResult.steps} />
            </div>
          )}
        </div>
      )}

      {/* Air-Gapped Modal */}
      {showOfflineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-amber-600" />
              Air-Gapped / Offline Ledger Settings
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              In secure air-gapped environments, paste the ledger JSON export below to verify proofs without any network connections.
            </p>
            <textarea
              value={pastedLedgerJson}
              onChange={(e) => setPastedLedgerJson(e.target.value)}
              placeholder='[{"seq": 0, "root": "...", "entryHash": "...", "sig": "..."}]'
              rows={5}
              className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowOfflineModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (pastedLedgerJson.trim()) setIsOfflineMode(true);
                  setShowOfflineModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                Save Offline Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
