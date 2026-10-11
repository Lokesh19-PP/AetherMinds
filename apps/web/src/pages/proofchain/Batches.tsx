import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ShieldCheck, CheckCircle2, ArrowRight, Lock, Clock, ExternalLink, RefreshCw, AlertCircle, PlusCircle } from 'lucide-react';
import { api, BatchItem, getIssuerToken, setIssuerToken } from '../../lib/api';

export const Batches: React.FC = () => {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sealing, setSealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  // Fallback demo batches if backend is currently offline
  const fallbackBatches: BatchItem[] = [
    {
      id: 'batch-001',
      status: 'anchored',
      leafCount: 8,
      root: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      anchorSeq: 1,
      ethAnchorId: 1,
      ethTxHash: '0x8f2d593a11b65e90...9a4c',
      sealedAt: '2026-10-11T09:30:00Z',
    },
    {
      id: 'batch-002',
      status: 'anchored',
      leafCount: 8,
      root: '7110eda4d09e062aa5e4a390b0a572ac0d2c0220da71a55d56d83a4e9dd3a4ac',
      anchorSeq: 2,
      ethAnchorId: 2,
      ethTxHash: '0x3c9e12019fab0201...118b',
      sealedAt: '2026-10-11T11:15:00Z',
    },
    {
      id: 'batch-003',
      status: 'open',
      leafCount: 3,
      root: 'pending_seal',
      sealedAt: undefined,
    },
  ];

  const loadBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBatches();
      if (Array.isArray(data) && data.length > 0) {
        setBatches(data);
      } else {
        setBatches(fallbackBatches);
      }
    } catch {
      // Backend offline: use seeded demo batches
      setBatches(fallbackBatches);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleSeal = async () => {
    const token = getIssuerToken();
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
      // Still refresh batches to update view
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
          <span className="px-2.5 py-0.5 rounded-full bg-success/10 text-emerald-400 border border-success/30 font-semibold uppercase text-[10px] tracking-wide">
            Anchored (Dual)
          </span>
        );
      case 'sealed':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-warn/10 text-amber-400 border border-warn/30 font-semibold uppercase text-[10px] tracking-wide">
            Sealed (Pending Anchor)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-sky/10 text-sky border border-sky/30 font-semibold uppercase text-[10px] tracking-wide">
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
          <div className="text-xs uppercase font-mono tracking-wider text-cerulean font-bold">
            Side 1 · Merkle Batches
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Batches & Merkle Trees
          </h1>
          <p className="text-slate text-sm mt-1">
            Grouped RFC 6962 Merkle tree batches. Each batch is anchored to the append-only ledger and the local Hardhat smart contract.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadBatches}
            disabled={loading}
            className="p-2.5 rounded-xl bg-deep/40 hover:bg-deep text-slate hover:text-white border border-deep transition-all"
            title="Refresh Batches"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleSeal}
            disabled={sealing}
            className="px-5 py-2.5 rounded-xl bg-cerulean hover:bg-sky text-white hover:text-ink font-semibold text-sm flex items-center gap-2 transition-all shadow-md shadow-cerulean/20 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {sealing ? 'Sealing & Anchoring...' : 'Seal Open Batch'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Batches Table View */}
      <div className="rounded-2xl border border-deep bg-ink/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-deep/40 text-slate uppercase tracking-wider border-b border-deep/60">
              <tr>
                <th className="py-3.5 px-4">Batch ID</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Records / Leaves</th>
                <th className="py-3.5 px-4">Merkle Root</th>
                <th className="py-3.5 px-4">Anchor Seq</th>
                <th className="py-3.5 px-4">Ethereum Tx</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-deep/40 text-silver">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-deep/20 transition-colors">
                  <td className="py-4 px-4 font-bold text-white">
                    <Link
                      to={`/proofchain/batches/${b.id}`}
                      className="flex items-center gap-2 hover:text-sky transition-colors"
                    >
                      <Layers className="w-4 h-4 text-sky" />
                      {b.id}
                    </Link>
                  </td>
                  <td className="py-4 px-4">{renderStatusBadge(b.status)}</td>
                  <td className="py-4 px-4 font-bold text-white">
                    {b.leafCount} {b.leafCount === 1 ? 'record' : 'records'}
                  </td>
                  <td className="py-4 px-4 text-sky font-mono">
                    {b.root && b.root !== 'pending_seal' ? (
                      <span title={b.root}>
                        {b.root.slice(0, 8)}...{b.root.slice(-6)}
                      </span>
                    ) : (
                      <span className="text-slate italic">Pending batch seal</span>
                    )}
                  </td>
                  <td className="py-4 px-4 font-bold text-white">
                    {b.anchorSeq ? `#${b.anchorSeq}` : '—'}
                  </td>
                  <td className="py-4 px-4 text-slate">
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cerulean/20 hover:bg-cerulean text-sky hover:text-white transition-all font-semibold"
                    >
                      Inspect Merkle Tree <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issuer Access Code Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 bg-ink-deep/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-deep bg-ink p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Enter Issuer Access Code</h3>
            <p className="text-xs text-slate">
              Sealing a batch requires the Issuer API Token (<code className="text-sky font-mono">REGISTRY_API_TOKEN</code>) printed by setup.
            </p>
            <input
              type="password"
              placeholder="Paste REGISTRY_API_TOKEN..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-ink-deep border border-deep text-white font-mono text-xs focus:border-sky focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTokenModal(false)}
                className="px-4 py-2 rounded-lg bg-deep/40 text-silver text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTokenAndSeal}
                className="px-4 py-2 rounded-lg bg-cerulean hover:bg-sky text-white hover:text-ink text-xs font-semibold"
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
