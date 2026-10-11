import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ShieldCheck, CheckCircle2, ArrowRight, Lock, Clock, ExternalLink } from 'lucide-react';

export const Batches: React.FC = () => {
  const [sealing, setSealing] = useState(false);

  const mockBatches = [
    {
      id: 'batch-001',
      status: 'anchored',
      leafCount: 8,
      root: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      anchorSeq: 1,
      ethTxHash: '0x8f2d593a11b6...9a4c',
      sealedAt: '2026-10-11T09:30:00Z',
    },
    {
      id: 'batch-002',
      status: 'anchored',
      leafCount: 8,
      root: '7110eda4d09e062aa5e4a390b0a572ac0d2c0220da71a55d56d83a4e9dd3a4ac',
      anchorSeq: 2,
      ethTxHash: '0x3c9e12019fab...118b',
      sealedAt: '2026-10-11T11:15:00Z',
    },
  ];

  const handleSeal = () => {
    setSealing(true);
    setTimeout(() => {
      setSealing(false);
      alert('Batch sealed and published to Anchor Ledger (:4100) & Ethereum RootAnchor (:8545)!');
    }, 1200);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-cerulean font-bold">Side 1 · Merkle Batches</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Batches & Merkle Trees</h1>
          <p className="text-slate text-sm mt-1">
            Grouped RFC 6962 Merkle tree batches. Each batch is anchored to the append-only ledger and the local Hardhat smart contract.
          </p>
        </div>
        <button
          onClick={handleSeal}
          disabled={sealing}
          className="px-5 py-2.5 rounded-xl bg-cerulean hover:bg-sky text-white hover:text-ink font-semibold text-sm flex items-center gap-2 transition-all shadow-md shadow-cerulean/20 disabled:opacity-50"
        >
          <Lock className="w-4 h-4" />
          {sealing ? 'Sealing & Anchoring...' : 'Seal Open Batch'}
        </button>
      </div>

      {/* Batches Table */}
      <div className="rounded-2xl border border-deep bg-ink/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-deep/40 text-slate uppercase tracking-wider border-b border-deep/60">
              <tr>
                <th className="py-3 px-4">Batch ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Leaves</th>
                <th className="py-3 px-4">Merkle Root</th>
                <th className="py-3 px-4">Anchor Seq</th>
                <th className="py-3 px-4">Eth Tx</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-deep/40 text-silver">
              {mockBatches.map((b) => (
                <tr key={b.id} className="hover:bg-deep/20 transition-colors">
                  <td className="py-4 px-4 font-bold text-white flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-sky" />
                    {b.id}
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-success/10 text-emerald-400 border border-success/30 font-semibold uppercase text-[10px]">
                      {b.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-bold">{b.leafCount} records</td>
                  <td className="py-4 px-4 text-sky">
                    <span title={b.root}>{b.root.slice(0, 8)}...{b.root.slice(-6)}</span>
                  </td>
                  <td className="py-4 px-4 font-bold text-white">#{b.anchorSeq}</td>
                  <td className="py-4 px-4 text-slate">{b.ethTxHash}</td>
                  <td className="py-4 px-4 text-right">
                    <Link
                      to={`/proofchain/batches/${b.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cerulean/20 hover:bg-cerulean text-sky hover:text-white transition-all font-semibold"
                    >
                      Inspect Tree <ArrowRight className="w-3 h-3" />
                    </Link>
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
