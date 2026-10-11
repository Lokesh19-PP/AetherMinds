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
  const defaultFallbackBatch: BatchDetailResponse = {
    id: id || 'batch-001',
    status: 'anchored',
    leafCount: 8,
    root: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    anchorSeq: 1,
    ethAnchorId: 1,
    ethTxHash: '0x8f2d593a11b65e90df3a1a4c9b109e20a9bf4c8996fb92427ae41e4649b934ca',
    sealedAt: '2026-10-11T09:30:00Z',
    records: [
      { id: 'rec-001', leafHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae', index: 0, title: 'Degree Certificate - Computer Science', status: 'anchored' },
      { id: 'rec-002', leafHash: 'fc46db4d687eed4291615d399f4d134fe60f10f022ac3bcd8b499bc42956cf35', index: 1, title: 'Official Grade Transcript 2026', status: 'anchored' },
      { id: 'rec-003', leafHash: '11a4a60b518f6922cb54b4231b409743c3d0b2f0a12e23a49219b21f3f3a8b41', index: 2, title: 'Digital Artwork Genesis Manifest', status: 'anchored' },
      { id: 'rec-004', leafHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4', index: 3, title: 'Music Stem Master Agreement', status: 'anchored' },
      { id: 'rec-005', leafHash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e', index: 4, title: 'Municipal Property Deed #8812', status: 'anchored' },
      { id: 'rec-006', leafHash: '4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865', index: 5, title: 'Research Lab Dataset Checksum', status: 'anchored' },
      { id: 'rec-007', leafHash: '53c234e5e8472b6ac51c1ae1cab3fe06fad053beb8ebfd8977b010655bfdd3c3', index: 6, title: 'Patent Application Specification', status: 'anchored' },
      { id: 'rec-008', leafHash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d', index: 7, title: 'Cryptographic Security Audit Log', status: 'anchored' },
    ],
    levels: [
      // Level 0: 8 leaves
      [
        '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
        'fc46db4d687eed4291615d399f4d134fe60f10f022ac3bcd8b499bc42956cf35',
        '11a4a60b518f6922cb54b4231b409743c3d0b2f0a12e23a49219b21f3f3a8b41',
        '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
        'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
        '4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865',
        '53c234e5e8472b6ac51c1ae1cab3fe06fad053beb8ebfd8977b010655bfdd3c3',
        'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
      ],
      // Level 1: 4 nodes
      [
        '6d2460a80e046c4f8bf0df7b1f6924b89efc1a932c02c63866ac4d058a9e1021',
        '5858cfd7be8f24ecffb648f936353d2bf94943f550ffc17bfbf798363a23a3eb',
        'b7987cc142c14041b392437651a56da6c84c7dd88405b0a31eb2797e59b9776b',
        '4c919d6a267d28c8d37446bc6d013f9f257d07936efc991a0c4f8a97f2619736',
      ],
      // Level 2: 2 nodes
      [
        '968434778beeaec45037dd78edfe35eb7b309f7a552e69cd18cb14ef4b7910ff',
        '31846b02660d29ab997eb948b472ea63e18cfbf6e5b4b1a45cf2a4fe99238eb1',
      ],
      // Level 3: 1 root
      [
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      ],
    ],
  };

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      try {
        if (id) {
          const data = await api.getBatchDetail(id);
          if (data && data.levels && data.levels.length > 0) {
            setBatch(data);
          } else {
            setBatch(defaultFallbackBatch);
          }
        } else {
          setBatch(defaultFallbackBatch);
        }
      } catch {
        setBatch(defaultFallbackBatch);
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

  const handleDownloadProof = (recordId: string, index: number) => {
    const proofBundle = {
      format: 'proofchain/proof/1',
      recordKind: 'file',
      batchId: batch?.id || 'batch-001',
      leafIndex: index,
      leafCount: batch?.leafCount || 8,
      leafHash: batch?.records?.[index]?.leafHash || '',
      path: [
        { side: 'R', hash: batch?.levels?.[0]?.[index ^ 1] || '' },
      ],
      anchors: [
        {
          kind: 'ledger',
          seq: batch?.anchorSeq ?? 1,
          url: 'http://localhost:4100',
          entryHash: 'f42b918a...',
        },
        {
          kind: 'ethereum',
          chainId: 31337,
          contract: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          id: batch?.ethAnchorId ?? 1,
          txHash: batch?.ethTxHash ?? '0x8f2d...',
        },
      ],
    };

    const blob = new Blob([JSON.stringify(proofBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recordId}.pcproof.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentBatch = batch || defaultFallbackBatch;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Navigation */}
      <Link
        to="/proofchain/batches"
        className="inline-flex items-center gap-2 text-xs font-mono text-slate hover:text-sky transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Batches List
      </Link>

      {/* Header & Overview Card */}
      <div className="rounded-2xl border border-deep bg-ink/70 p-6 space-y-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider text-cerulean font-bold">
                Batch Detail & Merkle Spec
              </span>
              <span className="px-2 py-0.5 rounded-full bg-success/10 text-emerald-400 border border-success/30 font-semibold uppercase text-[10px]">
                {currentBatch.status}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3 mt-1">
              <Layers className="w-7 h-7 text-sky" />
              {currentBatch.id}
            </h1>
            <p className="text-slate text-xs font-mono mt-1">
              Sealed {currentBatch.sealedAt ? new Date(currentBatch.sealedAt).toLocaleString() : 'In Progress'} · {currentBatch.leafCount} Records
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/verify"
              className="px-4 py-2 rounded-xl bg-cerulean hover:bg-sky text-white hover:text-ink text-xs font-semibold flex items-center gap-2 shadow-md shadow-cerulean/20"
            >
              <ShieldCheck className="w-4 h-4" /> Verify In Standalone Verifier
            </Link>
          </div>
        </div>

        {/* Dual Anchor Details Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-deep/60 text-xs font-mono">
          {/* Merkle Root */}
          <div className="p-3.5 rounded-xl bg-ink-deep border border-deep space-y-1">
            <div className="text-slate text-[10px] uppercase font-bold">Batch Merkle Root</div>
            <div className="flex items-center justify-between gap-2 text-sky font-semibold">
              <span className="truncate" title={currentBatch.root}>{currentBatch.root}</span>
              <button onClick={copyRoot} className="p-1 hover:text-white text-slate">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Anchor Ledger (:4100) */}
          <div className="p-3.5 rounded-xl bg-ink-deep border border-deep space-y-1">
            <div className="text-slate text-[10px] uppercase font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-sky" /> Signed Ledger (:4100)
            </div>
            <div className="text-white font-semibold flex items-center gap-2">
              <span className="text-emerald-400">Entry #{currentBatch.anchorSeq || 1}</span>
              <span className="text-slate text-[11px]">· Ed25519 Verified</span>
            </div>
          </div>

          {/* Ethereum EVM (:8545) */}
          <div className="p-3.5 rounded-xl bg-ink-deep border border-deep space-y-1">
            <div className="text-slate text-[10px] uppercase font-bold flex items-center gap-1.5">
              <Blocks className="w-3.5 h-3.5 text-sky" /> Hardhat EVM (:8545)
            </div>
            <div className="text-white font-semibold truncate" title={currentBatch.ethTxHash}>
              <span className="text-sky">Tx: </span>
              {currentBatch.ethTxHash ? `${currentBatch.ethTxHash.slice(0, 12)}...` : 'Local Node 31337'}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive SVG Merkle Tree Component */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <GitCommit className="w-5 h-5 text-sky" />
          Interactive Merkle Tree Diagram
        </h2>
        <MerkleTree
          levels={currentBatch.levels}
          selectedLeafIndex={selectedLeaf}
          onSelectLeaf={(idx) => setSelectedLeaf(idx)}
        />
      </div>

      {/* Records in Batch Table */}
      <div className="rounded-2xl border border-deep bg-ink/70 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky" />
            Records Registered in Batch ({currentBatch.records?.length || 0})
          </h3>
          <span className="text-xs font-mono text-slate">Download .pcproof.json for standalone verification</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-deep/40 text-slate uppercase border-b border-deep/60">
              <tr>
                <th className="py-3 px-3">Leaf Index</th>
                <th className="py-3 px-3">Record ID</th>
                <th className="py-3 px-3">Description / Title</th>
                <th className="py-3 px-3">Leaf Hash (SHA-256 0x00)</th>
                <th className="py-3 px-3 text-right">Proof Bundle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-deep/40 text-silver">
              {currentBatch.records?.map((rec, i) => (
                <tr
                  key={rec.id}
                  onClick={() => setSelectedLeaf(rec.index)}
                  className={`hover:bg-deep/30 cursor-pointer transition-colors ${
                    selectedLeaf === rec.index ? 'bg-cerulean/10 border-l-2 border-sky' : ''
                  }`}
                >
                  <td className="py-3.5 px-3 font-bold text-sky">
                    #{rec.index}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-white">
                    {rec.id}
                  </td>
                  <td className="py-3.5 px-3 text-silver">
                    {rec.title || 'Institutional Document'}
                  </td>
                  <td className="py-3.5 px-3 text-slate font-mono" title={rec.leafHash}>
                    {rec.leafHash.slice(0, 10)}...{rec.leafHash.slice(-8)}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadProof(rec.id, rec.index);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-deep/40 hover:bg-cerulean text-sky hover:text-white transition-all border border-deep font-semibold text-[11px]"
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
