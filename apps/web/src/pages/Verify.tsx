import React, { useState } from 'react';
import { ShieldCheck, Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Cpu, Layers, ExternalLink, WifiOff, FileCode } from 'lucide-react';
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
      } catch (err) {
        alert('Invalid proof bundle JSON file.');
      }
    }
  };

  // Quick Load Sample for Testing
  const handleLoadSample = () => {
    const sampleText = 'VORTEXA 3.0 Sample Document Content for ProofChain Verification';
    const sampleBytes = new TextEncoder().encode(sampleText);
    const mockFile = new File([sampleBytes], 'sample_degree.pdf', { type: 'application/pdf' });

    // Compute expected RFC 6962 leaf hash: SHA-256( 0x00 || sampleBytes )
    const buf = new Uint8Array(1 + sampleBytes.length);
    buf[0] = 0x00;
    buf.set(sampleBytes, 1);

    // Sample leaf hash
    const sampleLeaf = '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';

    const sampleBundle: ProofBundle = {
      version: 'proofchain/proof/1',
      recordId: 'rec-sample-001',
      leafHash: sampleLeaf,
      leafIndex: 0,
      leafCount: 8,
      batchId: 'batch-001',
      path: [
        { side: 'right', hash: 'fc46db4d687eed4291615d399f4d134fe60f10f022ac3bcd8b499bc42956cf35' },
        { side: 'right', hash: '5858cfd7be8f24ecffb648f936353d2bf94943f550ffc17bfbf798363a23a3eb' },
        { side: 'right', hash: '31846b02660d29ab997eb948b472ea63e18cfbf6e5b4b1a45cf2a4fe99238eb1' },
      ],
      anchors: [
        {
          type: 'ledger',
          seq: 1,
          root: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          entryHash: 'f42b918a0029bc41...',
          timestamp: '2026-10-11T09:30:00Z',
        },
        {
          type: 'ethereum',
          seq: 1,
          root: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          timestamp: '2026-10-11T09:30:00Z',
        },
      ],
    };

    setDocFile(mockFile);
    setDocBytes(sampleBytes);
    setProofFile(new File([JSON.stringify(sampleBundle, null, 2)], 'sample_degree.pcproof.json', { type: 'application/json' }));
    setBundleData(sampleBundle);
    setVerifyResult(null);
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
      // 1. Setup readers:
      // Verifier contacts only :4100 and :8545 (or static JSON), NEVER the registry!
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

      // 3. Request assistive AI explanation (purely assistive, does not alter verdict)
      try {
        const explainerRes = await api.explainVerification(result);
        setAiExplanation(explainerRes.text);
      } catch {
        setAiExplanation(
          result.ok
            ? 'The document matches the registered leaf hash and the recomputed Merkle root matches the anchored published root across all independent trust layers.'
            : `Verification failed with code ${result.code}. The document or proof does not match published anchor state.`
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky/30 bg-sky/10 text-sky text-xs font-mono">
            <ShieldCheck className="w-4 h-4" />
            <span>Standalone In-Browser Verifier · Rule R-A Enforced</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Public Proof Verification
          </h1>
          <p className="text-slate text-sm max-w-2xl">
            Drop the original document and its corresponding <code className="text-sky font-mono">.pcproof.json</code> bundle. Verification runs 100% inside your browser against Anchor (:4100) and Ethereum (:8545), with zero calls to the registry database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOfflineModal(true)}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 border transition-all ${
              isOfflineMode
                ? 'bg-warn/20 border-warn/40 text-warn'
                : 'bg-deep/40 hover:bg-deep border-deep text-slate hover:text-white'
            }`}
          >
            <WifiOff className="w-3.5 h-3.5" />
            {isOfflineMode ? 'Offline Mode Active' : 'Offline Mode'}
          </button>

          <button
            onClick={handleLoadSample}
            className="px-3.5 py-2 rounded-xl bg-cerulean/20 hover:bg-cerulean text-sky hover:text-white text-xs font-mono font-semibold border border-cerulean/40 transition-all"
          >
            Load Demo Sample
          </button>
        </div>
      </div>

      {/* Upload Dropzones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document Drop */}
        <div className="rounded-2xl border-2 border-dashed border-deep/80 hover:border-cerulean/60 bg-ink/40 p-8 text-center space-y-4 transition-all">
          <div className="w-12 h-12 rounded-xl bg-deep/40 text-sky mx-auto flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">1. Original Document File</h3>
            <p className="text-xs text-slate mt-1">PDF, Image, Text, or JSON</p>
          </div>
          <label className="inline-block px-4 py-2 rounded-lg bg-deep/60 hover:bg-deep text-xs font-semibold text-silver hover:text-white cursor-pointer transition-all border border-silver/20">
            Select Document
            <input
              type="file"
              onChange={handleDocChange}
              className="hidden"
            />
          </label>
          {docFile && (
            <div className="text-xs font-mono text-emerald-400 bg-success/10 border border-success/30 px-3 py-1.5 rounded-lg flex items-center justify-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate max-w-[220px]">{docFile.name} ({(docFile.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>

        {/* Proof Bundle Drop */}
        <div className="rounded-2xl border-2 border-dashed border-deep/80 hover:border-cerulean/60 bg-ink/40 p-8 text-center space-y-4 transition-all">
          <div className="w-12 h-12 rounded-xl bg-deep/40 text-sky mx-auto flex items-center justify-center">
            <FileCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">2. Proof Bundle (.pcproof.json)</h3>
            <p className="text-xs text-slate mt-1">Merkle path & dual anchor declarations</p>
          </div>
          <label className="inline-block px-4 py-2 rounded-lg bg-deep/60 hover:bg-deep text-xs font-semibold text-silver hover:text-white cursor-pointer transition-all border border-silver/20">
            Select Proof Bundle
            <input
              type="file"
              accept=".json,.pcproof.json"
              onChange={handleProofChange}
              className="hidden"
            />
          </label>
          {proofFile && (
            <div className="text-xs font-mono text-emerald-400 bg-success/10 border border-success/30 px-3 py-1.5 rounded-lg flex items-center justify-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="truncate max-w-[220px]">{proofFile.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Verify Button */}
      <div className="flex justify-center">
        <button
          onClick={handleVerify}
          disabled={verifying || !docFile || !bundleData}
          className="px-8 py-3.5 rounded-xl bg-cerulean hover:bg-sky text-white hover:text-ink font-semibold flex items-center gap-2.5 transition-all shadow-lg shadow-cerulean/20 disabled:opacity-40"
        >
          {verifying ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Executing Standalone Verification...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Verify Cryptographic Proof
            </>
          )}
        </button>
      </div>

      {/* Results View */}
      {verifyResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Three-Line Result Card */}
          <ThreeLineResult
            result={verifyResult}
            batchId={bundleData?.batchId}
            anchorSeq={bundleData?.anchors?.[0]?.seq || 1}
            timestamp={bundleData?.anchors?.[0]?.timestamp}
            isManifest={bundleData?.recordKind === 'manifest'}
          />

          {/* Cryptographic Step List (S1 - S8) */}
          <StepList steps={verifyResult.steps} />

          {/* AI Explainer Panel */}
          {aiExplanation && (
            <div className="rounded-2xl border border-deep bg-ink/70 p-6 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-2 text-sky font-bold">
                <Cpu className="w-4 h-4" />
                <span>Explanation (AI-assisted, not part of verification)</span>
              </div>
              <p className="text-silver/90 leading-relaxed font-sans text-sm">
                {aiExplanation}
              </p>
              <div className="text-[10px] text-slate">
                * Rule R-B enforced: Verdict is decided purely by cryptographic SHA-256 and Ed25519 recomputation. AI provides human paraphrase only.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Offline Mode Modal */}
      {showOfflineModal && (
        <div className="fixed inset-0 z-50 bg-ink-deep/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl border border-deep bg-ink p-6 space-y-4 shadow-2xl font-mono text-xs">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-warn" />
              Offline Verification Mode (Static Anchor Entry)
            </h3>
            <p className="text-slate text-xs leading-relaxed">
              When disconnected from local services, paste a signed AnchorEntry JSON object below. The verifier will execute against this static entry with zero network requests.
            </p>
            <textarea
              rows={6}
              value={pastedLedgerJson}
              onChange={(e) => setPastedLedgerJson(e.target.value)}
              placeholder='Paste {"seq": 1, "root": "e3b0c4...", "entryHash": "...", "signature": "..."}'
              className="w-full p-3 rounded-xl bg-ink-deep border border-deep text-sky text-xs font-mono focus:border-sky focus:outline-none"
            />
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setIsOfflineMode(false);
                  setPastedLedgerJson('');
                  setShowOfflineModal(false);
                }}
                className="px-3 py-1.5 rounded-lg text-rose-400 hover:bg-danger/10"
              >
                Disable Offline Mode
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOfflineModal(false)}
                  className="px-4 py-2 rounded-lg bg-deep/40 text-silver"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsOfflineMode(true);
                    setShowOfflineModal(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-cerulean hover:bg-sky text-white hover:text-ink font-bold"
                >
                  Enable Offline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
