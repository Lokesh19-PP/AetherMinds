import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Download,
  Copy,
  Check,
  FileText,
  Layers,
  Sparkles,
  UserCheck,
  Blocks,
  Eye,
  ExternalLink,
  Clock,
  Key,
  Shield,
  FileCode2,
  RefreshCw,
} from 'lucide-react';
import { api, RecordResponse, getFileUrl } from '../../lib/api';

export const RecordDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<any | null>(null);
  const [proof, setProof] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [downloadingProof, setDownloadingProof] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const rec = await api.getRecord(id);
      setRecord(rec);

      // Try fetching proof if anchored
      try {
        const p = await api.getProof(id);
        setProof(p);
      } catch {
        // Proof may not be ready if pending
        setProof(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load record details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(label);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownloadProof = async () => {
    if (!id) return;
    setDownloadingProof(true);
    try {
      let bundle = proof;
      if (!bundle) {
        bundle = await api.getProof(id);
        setProof(bundle);
      }
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}.pcproof.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Could not download proof: ${err.message || 'Not yet anchored'}`);
    } finally {
      setDownloadingProof(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-16 flex flex-col items-center justify-center text-slate-500 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Loading record cryptographic details...</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen py-16 px-4 max-w-4xl mx-auto space-y-6">
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 space-y-2">
          <h2 className="text-lg font-bold">Record Not Found</h2>
          <p className="text-sm">{error || `No record found with identifier "${id}".`}</p>
        </div>
        <Link
          to="/proofchain/batches"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Merkle Batches
        </Link>
      </div>
    );
  }

  // Parse metadata & AI suggestions
  let confirmedMeta: Record<string, any> = {};
  if (record.metadata_json) {
    try {
      confirmedMeta = JSON.parse(record.metadata_json);
    } catch {}
  } else if (record.metadata) {
    confirmedMeta = record.metadata;
  }

  let aiSuggestion: any = null;
  if (record.ai_suggestion_json) {
    try {
      aiSuggestion = JSON.parse(record.ai_suggestion_json);
    } catch {}
  }

  const isAnchored = record.batchStatus === 'anchored' || record.status === 'anchored';
  const isSealed = record.batchStatus === 'sealed' || record.status === 'sealed';

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          {record.batch_id && (
            <Link
              to={`/proofchain/batches/${record.batch_id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-all"
            >
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Batch {record.batch_id}
            </Link>
          )}
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-2xs"
            title="Refresh Record"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono ${
                  isAnchored
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isSealed
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {isAnchored ? 'ANCHORED' : isSealed ? 'SEALED' : 'PENDING SEAL'}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono bg-slate-100 text-slate-700 border border-slate-200">
                {record.kind === 'manifest' ? 'Side 2 · Creator Manifest' : 'Side 1 · Institutional Document'}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-50 text-slate-600 border border-slate-200">
                Storage: {record.storage_mode || 'none'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {record.title || record.file_name || 'Registered Record'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 font-mono">
              ID: {record.id}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {record.storage_mode === 'copy' && (
              <a
                href={getFileUrl(record.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs shadow-2xs transition-all"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                View File
              </a>
            )}

            <button
              onClick={handleDownloadProof}
              disabled={downloadingProof || !isAnchored}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs transition-all border ${
                isAnchored
                  ? 'bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border-blue-200'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
              title={isAnchored ? 'Download cryptographic proof bundle' : 'Proof ready after batch is anchored'}
            >
              <Download className="w-3.5 h-3.5" />
              {downloadingProof ? 'Generating...' : '.pcproof.json'}
            </button>

            <Link
              to="/verify"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-500/20 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              Verify in Standalone Verifier
            </Link>
          </div>
        </div>

        {/* Cryptographic Identifiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span>Canonical File SHA-256 Digest</span>
              <button
                onClick={() => copyToClipboard(record.content_hash, 'content_hash')}
                className="text-slate-400 hover:text-slate-700"
              >
                {copiedHash === 'content_hash' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="font-mono text-slate-800 break-all select-all font-semibold">
              {record.content_hash}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span>Merkle Leaf Hash (Domain-Separated 0x00)</span>
              <button
                onClick={() => copyToClipboard(record.leaf_hash, 'leaf_hash')}
                className="text-slate-400 hover:text-slate-700"
              >
                {copiedHash === 'leaf_hash' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="font-mono text-blue-700 break-all select-all font-semibold">
              {record.leaf_hash}
            </div>
          </div>
        </div>

        {/* Merkle Batch & Anchor Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs">
          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Batch ID</span>
            <div className="font-semibold text-slate-800 font-mono">
              {record.batch_id || 'b-0001'}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Leaf Index</span>
            <div className="font-semibold text-slate-800 font-mono">
              #{record.leaf_index !== undefined && record.leaf_index !== null ? record.leaf_index : 'Pending'}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Anchor Sequence</span>
            <div className="font-semibold text-slate-800 font-mono">
              Seq {record.anchor_seq || 1}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Registered Date</span>
            <div className="font-semibold text-slate-800">
              {record.created_at ? new Date(record.created_at).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>

        {/* Ethereum Dual Anchor Details */}
        {record.ethTxHash && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Blocks className="w-4 h-4 text-purple-600" />
              <span>Ethereum Anchor (Chain ID: <strong>{record.ethChainId || 31337}</strong>)</span>
            </div>
            <div className="font-mono text-slate-600 truncate max-w-xs" title={record.ethTxHash}>
              Tx: {record.ethTxHash.slice(0, 14)}...{record.ethTxHash.slice(-8)}
            </div>
          </div>
        )}
      </div>

      {/* AI Transparency & Human Confirmation Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Registrant Provenance & AI Transparency
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Human-in-the-loop guarantee: Cryptographic integrity is bound strictly to human-confirmed metadata and registrant identity.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200">
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Registered By: <strong>{record.registered_by_name || record.confirmed_by || 'Institutional Registrar'}</strong>
                {record.registered_by_email ? ` (${record.registered_by_email})` : ''}
              </span>
              {record.registered_by_role && (
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-200/70 text-blue-900 font-bold ml-1">
                  {record.registered_by_role}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Side-by-Side: Confirmed Metadata vs AI Suggestion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Confirmed Metadata */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <Check className="w-4 h-4" />
                Human-Confirmed Metadata (Hashed)
              </span>
              <span className="text-slate-400 font-mono text-[11px]">Binding Leaf Data</span>
            </div>

            {Object.keys(confirmedMeta).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(confirmedMeta).map(([k, v]) => (
                  <div
                    key={k}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-600 uppercase tracking-wider font-mono text-[11px]">{k}</span>
                    <span className="font-medium text-slate-900 max-w-[65%] truncate text-right">
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-500 font-mono text-center">
                No custom metadata keys confirmed.
              </div>
            )}
          </div>

          {/* AI Suggestion (Archived) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1.5 text-blue-700">
                <Sparkles className="w-4 h-4" />
                AI Proposal (Archived for Audit)
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {aiSuggestion?.aiPath ? `Path: ${aiSuggestion.aiPath}` : 'Advisory Only'}
              </span>
            </div>

            {aiSuggestion && Array.isArray(aiSuggestion.fields) && aiSuggestion.fields.length > 0 ? (
              <div className="space-y-2">
                {aiSuggestion.fields.map((f: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-blue-50/40 border border-blue-100 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-blue-900 font-mono text-[11px]">{f.key}</div>
                      {f.confidence !== undefined && (
                        <div className="text-[10px] text-slate-500">
                          Confidence: {Math.round(f.confidence * 100)}% · Source: {f.source || 'llm'}
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-slate-800 max-w-[60%] truncate text-right">
                      {String(f.value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-500 font-mono text-center">
                {aiSuggestion
                  ? 'Raw AI Suggestion: ' + JSON.stringify(aiSuggestion).slice(0, 80) + '...'
                  : 'No separate AI suggestions were archived for this record.'}
              </div>
            )}
          </div>
        </div>

        {/* Rule R-B & Rule R-C Compliance Banner */}
        <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Cryptographic Guarantee:</strong> The verifier executes zero AI and relies strictly on RFC 6962 Merkle tree math and Ed25519 signatures. The database records AI suggestions solely to audit human acceptance or rejection.
          </div>
        </div>
      </div>
    </div>
  );
};
export default RecordDetail;
