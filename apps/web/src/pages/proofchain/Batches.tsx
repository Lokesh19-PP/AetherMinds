import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowRight, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { api, BatchItem, getIssuerToken, setIssuerToken, DEFAULT_DEV_ISSUER_TOKEN } from '../../lib/api';
import '../../styles/pc-batch.css';

export const Batches: React.FC = () => {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sealing, setSealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState(DEFAULT_DEV_ISSUER_TOKEN);

  const loadBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBatches();
      if (Array.isArray(data)) {
        const normalized: BatchItem[] = data.map((b: any) => ({
          id: b.id,
          status: b.status,
          leafCount: b.leaf_count ?? b.leafCount ?? 0,
          root: b.root ?? 'pending_seal',
          anchorSeq: b.anchor_seq ?? b.anchorSeq,
          ethAnchorId: b.ethereum_anchor_id ?? b.ethAnchorId,
          ethTxHash: b.ethereum_tx_hash ?? b.ethTxHash,
          sealedAt: b.sealed_at ?? b.sealedAt,
        }));
        setBatches(normalized);
      } else {
        setBatches([]);
      }
    } catch {
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleSeal = async () => {
    const token = getIssuerToken() || DEFAULT_DEV_ISSUER_TOKEN;
    if (!token) {
      setShowTokenModal(true);
      return;
    }

    setSealing(true);
    setError(null);
    try {
      await api.sealBatch();
      await loadBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seal batch');
      setTimeout(loadBatches, 500);
    } finally {
      setSealing(false);
    }
  };

  const handleSaveTokenAndSeal = () => {
    if (tokenInput.trim()) {
      setIssuerToken(tokenInput.trim());
      setShowTokenModal(false);
      handleSeal();
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'anchored':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold uppercase text-[10px] tracking-wide">
            Anchored
          </span>
        );
      case 'sealed':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold uppercase text-[10px] tracking-wide">
            Sealed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold uppercase text-[10px] tracking-wide">
            Open (Accepting Records)
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-blue-600 font-bold">
            Document Batches
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Batches & Registered Records
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Registered documents are batched and anchored to the ledger. Each sealed batch produces verifiable cryptographic proof bundles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadBatches}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all shadow-xs"
            title="Refresh Batches"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleSeal}
            disabled={sealing}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {sealing ? 'Sealing Batch...' : 'Seal & Finalize Open Batch'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Batches Table View */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Batch ID</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Documents</th>
                <th className="py-3.5 px-4">Merkle Root</th>
                <th className="py-3.5 px-4">Ledger Seq</th>
                <th className="py-3.5 px-4">Smart Contract Tx</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-900">
                    <Link
                      to={`/proofchain/batches/${b.id}`}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Layers className="w-4 h-4 text-blue-600" />
                      {b.id}
                    </Link>
                  </td>
                  <td className="py-4 px-4">{renderStatusBadge(b.status)}</td>
                  <td className="py-4 px-4 font-bold text-slate-900">
                    {b.leafCount} {b.leafCount === 1 ? 'document' : 'documents'}
                  </td>
                  <td className="py-4 px-4 text-blue-700 font-mono font-medium">
                    {b.root && b.root !== 'pending_seal' ? (
                      <span title={b.root}>
                        {b.root.slice(0, 8)}...{b.root.slice(-6)}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Pending seal</span>
                    )}
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-900">
                    {b.anchorSeq ? `Entry #${b.anchorSeq}` : '—'}
                  </td>
                  <td className="py-4 px-4 text-slate-500">
                    {b.ethTxHash ? (
                      <span title={b.ethTxHash}>
                        {b.ethTxHash.slice(0, 10)}...{b.ethTxHash.slice(-4)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Link
                      to={`/proofchain/batches/${b.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white transition-all font-semibold border border-blue-200 hover:border-transparent"
                    >
                      View Records & Proofs <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dark Merkle Tree Card · Batch B-0007 (Approved Design) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-bold">
              Cryptographic Proof Architecture
            </div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mt-0.5">
              <Layers className="w-4 h-4 text-blue-400" />
              MERKLE TREE · BATCH B-0007
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase">
              Anchored · 3 Documents
            </span>
          </div>
        </div>

        {/* Tree Container */}
        <div className="relative py-2 max-w-2xl mx-auto flex flex-col items-center">
          {/* Top: Root Box */}
          <div className="z-10 px-6 py-3 rounded-xl bg-slate-900 border border-blue-500/40 shadow-lg text-center min-w-[220px]">
            <div className="text-[11px] font-mono uppercase font-bold text-blue-400 tracking-wider">
              ROOT
            </div>
            <div className="text-xs font-mono text-slate-200 font-semibold mt-0.5 truncate">
              a3e2de2f…6cc967
            </div>
          </div>

          {/* SVG Connector Lines from leaves to root */}
          <div className="w-full h-24 relative my-[-2px]">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 600 96"
              fill="none"
              preserveAspectRatio="none"
            >
              {/* doc 1 to ROOT */}
              <path
                d="M 100 96 C 100 48, 300 60, 300 0"
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
                className="pc-batch-connector-line"
              />
              {/* doc 2 to ROOT */}
              <path
                d="M 300 96 L 300 0"
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
                className="pc-batch-connector-line"
              />
              {/* doc 3 to ROOT */}
              <path
                d="M 500 96 C 500 48, 300 60, 300 0"
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
                className="pc-batch-connector-line"
              />
            </svg>
          </div>

          {/* Bottom: 3 Leaf Boxes */}
          <div className="z-10 w-full grid grid-cols-3 gap-4">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center shadow-md">
              <div className="text-[12px] font-mono font-bold text-slate-200">doc 1</div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">Leaf #0</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center shadow-md">
              <div className="text-[12px] font-mono font-bold text-slate-200">doc 2</div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">Leaf #1</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center shadow-md">
              <div className="text-[12px] font-mono font-bold text-slate-200">doc 3</div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">Leaf #2</div>
            </div>
          </div>
        </div>
      </div>

      {/* Issuer Access Code Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Enter Issuer Access Code</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sealing a batch requires the Issuer API Token (<code className="text-blue-700 font-mono">REGISTRY_API_TOKEN</code>) printed by setup.
            </p>
            <input
              type="password"
              placeholder="Paste REGISTRY_API_TOKEN..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-mono text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTokenModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTokenAndSeal}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
              >
                Save & Seal Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
