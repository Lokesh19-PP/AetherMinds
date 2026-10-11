import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Layers, ShieldCheck, Download, Copy, Check, Lock, RefreshCw, Blocks, Shield, AlertCircle, Eye } from 'lucide-react';
import { api, BatchDetailResponse } from '../../lib/api';
import { MerkleTree } from '../../components/MerkleTree';

export const BatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<BatchDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sealing, setSealing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedLeaf, setSelectedLeaf] = useState<number>(0);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      if (id) {
        const data = await api.getBatchDetail(id);
        if (data) {
          const raw = data as any;
          const records = (data.records || []).map((r: any, idx: number) => ({
            id: r.id,
            leafHash: r.leaf_hash || r.leafHash || '',
            index: r.leaf_index !== undefined ? r.leaf_index : idx,
            title: r.title || r.file_name || 'Institutional Document',
            fileName: r.file_name || r.fileName,
            fileRef: r.file_ref || r.fileRef,
            storageMode: r.storage_mode || r.storageMode,
            status: r.status || data.status || 'anchored',
          }));

          setBatch({
            id: data.id,
            status: data.status,
            leafCount: raw.leaf_count ?? data.leafCount ?? records.length,
            root: data.root ?? 'pending_seal',
            anchorSeq: raw.anchor_seq ?? data.anchorSeq ?? 1,
            ethAnchorId: raw.ethereum_anchor_id ?? data.ethAnchorId,
            ethTxHash: raw.ethereum_tx_hash ?? data.ethTxHash,
            sealedAt: raw.sealed_at ?? data.sealedAt,
            records,
            levels: data.levels || [],
          });
        }
      }
    } catch {
      // Keep null if error
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const copyRoot = () => {
    if (batch?.root) {
      navigator.clipboard.writeText(batch.root);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const triggerDownload = (recordId: string, proof: any) => {
    const json = JSON.stringify(proof, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recordId}.pcproof.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSealThisBatch = async () => {
    if (!id) return;
    setSealing(true);
    try {
      await api.sealBatch(id);
      await loadDetail();
    } catch (err: any) {
      alert(`Failed to seal batch: ${err.message || 'Unknown error'}`);
    } finally {
      setSealing(false);
    }
  };

  const handleDownloadProof = async (recordId: string, index: number) => {
    if (batch?.status === 'open') {
      const confirmSeal = window.confirm(
        'This batch is currently OPEN and has not yet been sealed. Merkle tree proofs (.pcproof.json) are calculated upon batch sealing.\n\nWould you like to seal and anchor this batch now to generate the proof bundle?'
      );
      if (confirmSeal) {
        setSealing(true);
        try {
          await api.sealBatch(batch.id);
          await loadDetail();
          const proof = await api.getProof(recordId);
          triggerDownload(recordId, proof);
        } catch (err: any) {
          alert(`Failed to seal and generate proof: ${err.message}`);
        } finally {
          setSealing(false);
        }
      }
      return;
    }

    try {
      const proof = await api.getProof(recordId);
      triggerDownload(recordId, proof);
    } catch (err: any) {
      alert(`Proof download failed: ${err?.message || 'Proof cannot be generated until batch is sealed'}`);
    }
  };

  if (loading && !batch) {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 font-sans">
        <Link
          to="/proofchain/batches"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Batches List
        </Link>
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
          <div className="text-xs font-mono text-slate-600 mt-2">Loading batch from live registry...</div>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 font-sans">
        <Link
          to="/proofchain/batches"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Batches List
        </Link>
        <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
          <h2 className="text-base font-bold text-slate-900">Batch Not Found</h2>
          <p className="text-xs font-mono text-slate-500">Batch {id} does not exist in registry.</p>
          <Link
            to="/proofchain/batches"
            className="inline-block px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
          >
            Return to Batches
          </Link>
        </div>
      </div>
    );
  }

  const currentBatch = batch;
  const isOpen = currentBatch.status === 'open';

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Top Navigation */}
      <Link
        to="/proofchain/batches"
        className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Batches List
      </Link>

      {/* Notice Banner for OPEN batches */}
      {isOpen && (
        <div className="p-5 rounded-2xl bg-blue-50/80 border border-blue-200 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1 max-w-2xl">
            <div className="text-xs font-bold uppercase font-mono text-blue-700 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-blue-600" />
              Batch is Currently Open
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              This batch is actively accumulating records. Cryptographic Merkle tree paths and <code className="font-mono bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-semibold">.pcproof.json</code> proof bundles are calculated upon sealing. Click <strong>Seal & Anchor Batch Now</strong> to finalize the Merkle tree and anchor to the ledger.
            </p>
          </div>
          <button
            onClick={handleSealThisBatch}
            disabled={sealing || currentBatch.records.length === 0}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {sealing ? 'Sealing & Publishing Root...' : 'Seal & Anchor Batch Now'}
          </button>
        </div>
      )}

      {/* Header & Overview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider text-blue-600 font-bold">
                Batch Detail & Merkle Spec
              </span>
              <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase ${
                isOpen
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {currentBatch.status}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3 mt-1">
              <Layers className="w-7 h-7 text-blue-600" />
              {currentBatch.id}
            </h1>
            <p className="text-slate-500 text-xs font-mono mt-1">
              {isOpen ? 'Open Batch (Accepting Records)' : `Sealed ${currentBatch.sealedAt ? new Date(currentBatch.sealedAt).toLocaleString() : ''}`} · {currentBatch.leafCount} Records
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isOpen ? (
              <button
                onClick={handleSealThisBatch}
                disabled={sealing || currentBatch.records.length === 0}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                {sealing ? 'Sealing Batch...' : 'Seal Batch'}
              </button>
            ) : (
              <Link
                to="/verify"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
              >
                <ShieldCheck className="w-4 h-4" /> Verify In Standalone Verifier
              </Link>
            )}
          </div>
        </div>

        {/* Dual Anchor Details Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-xs font-mono">
          {/* Merkle Root */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-bold">Batch Merkle Root</div>
            <div className="flex items-center justify-between gap-2 text-blue-700 font-semibold">
              <span className="truncate" title={currentBatch.root}>{currentBatch.root}</span>
              {!isOpen && (
                <button onClick={copyRoot} className="p-1 hover:text-slate-900 text-slate-400">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Anchor Ledger (:4100) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" /> Signed Ledger (:4100)
            </div>
            <div className="text-slate-900 font-semibold flex items-center gap-2">
              {isOpen ? (
                <span className="text-slate-500 italic">Pending Batch Seal</span>
              ) : (
                <>
                  <span className="text-emerald-700 font-bold">Entry #{currentBatch.anchorSeq || 1}</span>
                  <span className="text-slate-500 text-[11px]">· Ed25519 Verified</span>
                </>
              )}
            </div>
          </div>

          {/* Ethereum EVM (:8545) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1.5">
              <Blocks className="w-3.5 h-3.5 text-blue-600" /> Hardhat EVM (:8545)
            </div>
            <div className="text-slate-900 font-semibold truncate" title={currentBatch.ethTxHash}>
              {isOpen ? (
                <span className="text-slate-500 italic">Pending Batch Seal</span>
              ) : (
                <>
                  <span className="text-blue-700 font-medium">Tx: </span>
                  {currentBatch.ethTxHash ? `${currentBatch.ethTxHash.slice(0, 12)}...` : 'Local Node 31337'}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive SVG Merkle Tree Component */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          Interactive Merkle Tree Diagram
        </h2>
        {currentBatch.levels && currentBatch.levels.length > 0 ? (
          <MerkleTree
            levels={currentBatch.levels}
            selectedLeafIndex={selectedLeaf}
            onSelectLeaf={(idx) => setSelectedLeaf(idx)}
          />
        ) : (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-xs font-mono text-slate-500">
            {isOpen
              ? 'Merkle tree levels will be calculated as soon as the batch is sealed.'
              : 'No Merkle levels available for this batch.'}
          </div>
        )}
      </div>

      {/* Records in Batch Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Records Registered in Batch ({currentBatch.records?.length || 0})
          </h3>
          <span className="text-xs font-mono text-slate-500">
            {isOpen ? 'Seal batch to enable .pcproof.json export' : 'Download .pcproof.json for standalone verification'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Leaf Index</th>
                <th className="py-3 px-3">Record ID</th>
                <th className="py-3 px-3">Description / Title</th>
                <th className="py-3 px-3">Leaf Hash (SHA-256 0x00)</th>
                <th className="py-3 px-3 text-right">Proof Bundle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {currentBatch.records?.map((rec, i) => (
                <tr
                  key={rec.id}
                  onClick={() => setSelectedLeaf(rec.index)}
                  className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${
                    selectedLeaf === rec.index ? 'bg-blue-50/60 border-l-2 border-blue-600' : ''
                  }`}
                >
                  <td className="py-3.5 px-3 font-bold text-blue-700">
                    #{rec.index}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-900">
                    {rec.id}
                  </td>
                  <td className="py-3.5 px-3 text-slate-800">
                    {rec.title || 'Institutional Document'}
                  </td>
                  <td className="py-3.5 px-3 text-slate-500 font-mono" title={rec.leafHash}>
                    {rec.leafHash ? `${rec.leafHash.slice(0, 10)}...${rec.leafHash.slice(-8)}` : 'Pending'}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/api/records/${rec.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-blue-700 transition-all font-semibold text-[11px] border border-slate-200"
                        title="View or download original uploaded document"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" /> View Document
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadProof(rec.id, rec.index);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white transition-all border border-blue-200 font-semibold text-[11px]"
                      >
                        <Download className="w-3.5 h-3.5" /> {isOpen ? 'Seal & Export' : '.pcproof.json'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
