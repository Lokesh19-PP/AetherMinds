import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Layers, ShieldCheck, Download, ExternalLink, GitCommit } from 'lucide-react';

export const BatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Back button */}
      <Link
        to="/proofchain/batches"
        className="inline-flex items-center gap-2 text-xs font-mono text-slate hover:text-sky transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Batches
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-cerulean font-bold">Batch Inspector</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Layers className="w-7 h-7 text-sky" />
            Batch Details: {id || 'batch-001'}
          </h1>
          <p className="text-slate text-sm font-mono mt-1">
            Root: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 · Anchor Seq #1
          </p>
        </div>
      </div>

      {/* Interactive Merkle Tree Preview */}
      <div className="rounded-2xl border border-deep bg-ink/70 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-sky" />
            Interactive Merkle Tree (RFC 6962 Domain Separation: 0x00 Leaves, 0x01 Nodes)
          </h3>
          <span className="text-[11px] font-mono text-slate">8 Leaves · 4 Tree Levels</span>
        </div>

        {/* SVG Diagram Canvas */}
        <div className="w-full h-64 rounded-xl border border-deep/60 bg-ink-deep/80 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="text-center space-y-2 z-10">
            <div className="inline-block px-3 py-1 rounded bg-cerulean/20 border border-cerulean/50 text-sky font-mono text-xs font-bold shadow-md shadow-sky/10">
              Root Hash: [e3b0c4...]
            </div>
            <div className="flex items-center justify-center gap-8 pt-4">
              <div className="px-2.5 py-1 rounded bg-deep/50 border border-deep text-[11px] font-mono text-silver">
                Node L1 [42fa91...]
              </div>
              <div className="px-2.5 py-1 rounded bg-deep/50 border border-deep text-[11px] font-mono text-silver">
                Node L2 [91bd30...]
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 pt-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((leaf) => (
                <div
                  key={leaf}
                  className="px-2 py-1 rounded bg-ink/90 border border-deep/80 hover:border-sky text-[10px] font-mono text-slate hover:text-white cursor-pointer transition-colors"
                  title={`Leaf ${leaf}`}
                >
                  L{leaf}
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-deep/10 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Records Table */}
      <div className="rounded-2xl border border-deep bg-ink/50 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white">Records in Batch</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-deep/30 text-slate uppercase border-b border-deep/60">
              <tr>
                <th className="py-2.5 px-3">Index</th>
                <th className="py-2.5 px-3">Record ID</th>
                <th className="py-2.5 px-3">Leaf Hash (SHA-256 0x00)</th>
                <th className="py-2.5 px-3 text-right">Proof File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-deep/40 text-silver">
              {[0, 1, 2, 3].map((idx) => (
                <tr key={idx} className="hover:bg-deep/20 transition-colors">
                  <td className="py-3 px-3 font-bold text-sky">#{idx}</td>
                  <td className="py-3 px-3 font-semibold text-white">rec-sample-{idx + 1}</td>
                  <td className="py-3 px-3 text-slate">
                    fa83b109{idx}ef...6291
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button className="px-2.5 py-1 rounded bg-deep/40 hover:bg-deep text-sky hover:text-white text-[11px] border border-deep flex items-center gap-1 ml-auto">
                      <Download className="w-3 h-3" /> .pcproof.json
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
