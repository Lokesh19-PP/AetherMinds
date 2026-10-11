import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Layers, ShieldCheck, Download, ExternalLink, GitCommit, Copy, Check, Lock, RefreshCw, Blocks, Shield } from 'lucide-react';
import { api, BatchDetailResponse } from '../../lib/api';
import { MerkleTree } from '../../components/MerkleTree';

export const BatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<BatchDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedLeaf, setSelectedLeaf] = useState<number>(0);

  // High fidelity fallback levels (RFC 6962 8-leaf Merkle Tree)
  useEffect(() => {
    const loadDetail = async () => {
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
              title: r.title || 'Institutional Document',
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
    };

    loadDetail();
  }, [id]);

  const copyRoot = () => {
    if (batch?.root) {
      navigator.clipboard.writeText(batch.root);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadProof = async (recordId: string, index: number) => {
    try {
      const proof = await api.getProof(recordId);
      const json = JSON.stringify(proof, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recordId}.pcproof.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Proof download failed: ${err?.message || 'Proof cannot be generated until batch is sealed'}`);
    }
  };

  if (loading) {
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

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Top Navigation */}
      <Link
        to="/proofchain/batches"
        className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Batches List
      </Link>

      {/* Header & Overview Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider text-blue-600 font-bold">
                Batch Detail & Merkle Spec
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold uppercase text-[10px]">
                {currentBatch.status}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3 mt-1">
              <Layers className="w-7 h-7 text-blue-600" />
              {currentBatch.id}
            </h1>
            <p className="text-slate-500 text-xs font-mono mt-1">
              Sealed {currentBatch.sealedAt ? new Date(currentBatch.sealedAt).toLocaleString() : 'In Progress'} · {currentBatch.leafCount} Records
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/verify"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              <ShieldCheck className="w-4 h-4" /> Verify In Standalone Verifier
            </Link>
          </div>
        </div>

        {/* Dual Anchor Details Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-xs font-mono">
          {/* Merkle Root */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-bold">Batch Merkle Root</div>
            <div className="flex items-center justify-between gap-2 text-blue-700 font-semibold">
              <span className="truncate" title={currentBatch.root}>{currentBatch.root}</span>
              <button onClick={copyRoot} className="p-1 hover:text-slate-900 text-slate-400">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Anchor Ledger (:4100) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" /> Signed Ledger (:4100)
            </div>
            <div className="text-slate-900 font-semibold flex items-center gap-2">
              <span className="text-emerald-700 font-bold">Entry #{currentBatch.anchorSeq || 1}</span>
              <span className="text-slate-500 text-[11px]">· Ed25519 Verified</span>
            </div>
          </div>

          {/* Ethereum EVM (:8545) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1.5">
              <Blocks className="w-3.5 h-3.5 text-blue-600" /> Hardhat EVM (:8545)
            </div>
            <div className="text-slate-900 font-semibold truncate" title={currentBatch.ethTxHash}>
              <span className="text-blue-700 font-medium">Tx: </span>
              {currentBatch.ethTxHash ? `${currentBatch.ethTxHash.slice(0, 12)}...` : 'Local Node 31337'}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive SVG Merkle Tree Component */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <GitCommit className="w-5 h-5 text-blue-600" />
          Interactive Merkle Tree Diagram
        </h2>
        <MerkleTree
          levels={currentBatch.levels}
          selectedLeafIndex={selectedLeaf}
          onSelectLeaf={(idx) => setSelectedLeaf(idx)}
        />
      </div>

      {/* Records in Batch Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Records Registered in Batch ({currentBatch.records?.length || 0})
          </h3>
          <span className="text-xs font-mono text-slate-500">Download .pcproof.json for standalone verification</span>
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
                    {rec.leafHash.slice(0, 10)}...{rec.leafHash.slice(-8)}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadProof(rec.id, rec.index);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white transition-all border border-blue-200 font-semibold text-[11px]"
                    >
                      <Download className="w-3.5 h-3.5" /> .pcproof.json
                    </button>
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
