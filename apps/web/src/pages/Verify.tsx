import React, { useState } from 'react';
import { ShieldCheck, Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Cpu, Layers, WifiOff, FileCode, Copy, Check } from 'lucide-react';
import { verifyBundle, HttpLedgerReader, StaticLedgerReader, EthereumReader } from '@proofchain/verifier';
import type { VerifyResult, ProofBundle } from '@proofchain/core';
import { pinnedEthereum } from '../generated/pinnedEthereum';
import { anchorPublicKey } from '../generated/anchorPub';
import { ThreeLineResult } from '../components/ThreeLineResult';
import { StepList } from '../components/StepList';
import { api } from '../lib/api';

export const Verify: React.FC = () => {
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docBytes, setDocBytes] = useState<Uint8Array | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [bundleData, setBundleData] = useState<ProofBundle | null>(null);

  const [verifying, setVerifying] = useState<boolean>(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  // Offline mode state
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [pastedLedgerJson, setPastedLedgerJson] = useState<string>('');
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Handle Document Upload
  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFile(file);
      const buffer = await file.arrayBuffer();
      setDocBytes(new Uint8Array(buffer));
      setVerifyResult(null);
    }
  };

  // Handle Proof Upload
  const handleProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        setBundleData(json);
        setVerifyResult(null);
      } catch {
        alert('Invalid proof bundle JSON file.');
      }
    }
  };

  // Quick Load Sample for Testing
  const handleLoadSample = () => {
    const sampleText = 'VORTEXA 3.0 Sample Document Content for ProofChain Verification';
    const sampleBytes = new TextEncoder().encode(sampleText);
    const mockFile = new File([sampleBytes], 'Degree_Priya_Sharma_IIT.pdf', { type: 'application/pdf' });

    const sampleLeaf = '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';

    const sampleBundle: any = {
      format: 'proofchain/proof/1',
      recordKind: 'file',
      recordId: 'rec-sample-001',
      leafHash: sampleLeaf,
      leafIndex: 0,
      leafCount: 8,
      batchId: 'b-0001',
      path: [
        { side: 'R', hash: 'fc46db4d687eed4291615d399f4d134fe60f10f022ac3bcd8b499bc42956cf35' },
        { side: 'R', hash: '5858cfd7be8f24ecffb648f936353d2bf94943f550ffc17bfbf798363a23a3eb' },
        { side: 'R', hash: '31846b02660d29ab997eb948b472ea63e18cfbf6e5b4b1a45cf2a4fe99238eb1' },
      ],
      anchors: [
        {
          kind: 'ledger',
          seq: 1,
          root: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          entryHash: 'f42b918a0029bc41234f9b883011aeb2c3019f39aa1023ba11099f3817a94ef2',
        },
        {
          kind: 'ethereum',
          chainId: 31337,
          contract: '0x0000000000000000000000000000000000000000',
          id: 1,
        },
      ],
    };

    setDocFile(mockFile);
    setDocBytes(sampleBytes);
    setProofFile(new File([JSON.stringify(sampleBundle, null, 2)], 'Degree_Priya_Sharma.pcproof.json', { type: 'application/json' }));
    setBundleData(sampleBundle);
    setVerifyResult(null);
    setAiExplanation(null);
  };

  // Run in-browser verification
  const handleVerify = async () => {
    if (!docBytes || !bundleData) {
      alert('Please select both the original document and the .pcproof.json proof bundle.');
      return;
    }

    setVerifying(true);
    setAiExplanation(null);

    try {
      // 1. Setup readers: contacts only :4100 and :8545 (or static JSON), NEVER the registry!
      let ledgerReader: any;
      if (isOfflineMode && pastedLedgerJson) {
        const parsed = JSON.parse(pastedLedgerJson);
        ledgerReader = new StaticLedgerReader(parsed);
      } else {
        ledgerReader = new HttpLedgerReader('http://localhost:4100');
      }

      const chainReader = new EthereumReader(pinnedEthereum);

      // 2. Call standalone verifyBundle from @proofchain/verifier
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

      // 3. Request assistive AI explanation
      try {
        const explainerRes = await api.explainVerification(result);
        setAiExplanation(explainerRes.text);
      } catch {
        setAiExplanation(
          result.verdict === 'VALID'
            ? 'The document content matches the registered leaf hash, and the recomputed Merkle root matches the immutable anchor state across all independent trust layers.'
            : `Verification resulted in ${result.verdict} with code ${result.code}. The document bytes or cryptographic proof path do not match published anchor records.`
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-mono font-semibold">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Standalone Public Verifier · Zero-Trust Client Pure</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Verify Document Proof
          </h1>
          <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
            Provide the original document file and its <code className="text-blue-700 font-mono font-semibold bg-blue-50 px-1.5 py-0.5 rounded">.pcproof.json</code> package. Verification executes completely in your browser without contacting the central registry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowOfflineModal(true)}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 border transition-all ${
              isOfflineMode
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
            }`}
          >
            <WifiOff className="w-3.5 h-3.5" />
            {isOfflineMode ? 'Air-Gapped Mode' : 'Air-Gap / Offline'}
          </button>

          <button
            onClick={handleLoadSample}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-all shadow-2xs"
          >
            Load Sample Proof
          </button>
        </div>
      </div>

      {/* Upload Dropzones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document Drop */}
        <div className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white p-7 text-center space-y-4 transition-all shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">1. Original Document</h3>
            <p className="text-xs text-slate-500 mt-1">PDF, Document, Image, or Binary</p>
          </div>
          <label className="inline-block px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-all border border-slate-300">
            Select Document
            <input
              type="file"
              onChange={handleDocChange}
              className="hidden"
            />
          </label>
          {docFile && (
            <div className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center justify-center gap-2">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate max-w-[220px]">{docFile.name} ({(docFile.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>

        {/* Proof Bundle Drop */}
        <div className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white p-7 text-center space-y-4 transition-all shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <FileCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">2. Proof Bundle (.pcproof.json)</h3>
            <p className="text-xs text-slate-500 mt-1">Merkle proof path & anchor references</p>
          </div>
          <label className="inline-block px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-all border border-slate-300">
            Select Proof Bundle
            <input
              type="file"
              accept=".json,.pcproof.json"
              onChange={handleProofChange}
              className="hidden"
            />
          </label>
          {proofFile && (
            <div className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center justify-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate max-w-[220px]">{proofFile.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Verify Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={handleVerify}
          disabled={verifying || !docFile || !bundleData}
          className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base flex items-center gap-2.5 transition-all shadow-md shadow-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {verifying ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Executing S1–S8 Cryptographic Pipeline...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Run Cryptographic Verification</span>
            </>
          )}
        </button>
      </div>

      {/* Results View */}
      {verifyResult && (
        <div className="space-y-6 pt-2">
          {/* Three-Line Result Card */}
          <ThreeLineResult
            result={verifyResult}
            batchId={bundleData?.batchId}
            anchorSeq={bundleData?.anchors?.[0]?.kind === 'ledger' ? bundleData.anchors[0].seq : 1}
            timestamp={(bundleData?.anchors?.[0] as any)?.timestamp || (bundleData?.anchors?.[0] as any)?.anchoredAt}
            isManifest={bundleData?.recordKind === 'manifest'}
          />

          {/* Cryptographic Step List (S1 - S8) */}
          <StepList steps={verifyResult.steps} />

          {/* AI Explainer Panel */}
          {aiExplanation && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6 space-y-2 text-xs font-mono shadow-xs">
              <div className="flex items-center gap-2 text-blue-700 font-bold">
                <Cpu className="w-4 h-4" />
                <span>Verification Explanation (Assistive AI analysis)</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-sans text-sm">
                {aiExplanation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Offline Modal */}
      {showOfflineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-amber-600" />
              Air-Gapped / Offline Ledger
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              In high-security or air-gapped environments, paste the anchor ledger JSON export below to verify proofs without any network connections.
            </p>
            <textarea
              value={pastedLedgerJson}
              onChange={(e) => setPastedLedgerJson(e.target.value)}
              placeholder='[{"seq": 0, "root": "...", "entryHash": "...", "sig": "..."}]'
              rows={5}
              className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsOfflineMode(false);
                  setShowOfflineModal(false);
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Disable Offline Mode
              </button>
              <button
                onClick={() => {
                  if (pastedLedgerJson.trim()) {
                    setIsOfflineMode(true);
                  }
                  setShowOfflineModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                Save & Use Offline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
