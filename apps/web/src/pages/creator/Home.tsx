import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Feather, Key, PlusCircle, ArrowRight, Download, Upload, Eye, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { getOrCreateCreatorKey, getKeyFingerprint } from '../../lib/creatorKey';

interface WorkItem {
  work_id: string;
  max_version: number;
  version_count: number;
  latest_created_at: string;
  title: string;
  latest_record_id: string;
  batch_id: string;
}

export const CreatorHome: React.FC = () => {
  const [keyPair] = useState(() => getOrCreateCreatorKey());
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const keyFingerprint = getKeyFingerprint(keyPair.publicKey);

  const loadWorks = async () => {
    setLoading(true);
    try {
      const data = await api.getWorksList();
      if (Array.isArray(data)) {
        setWorks(data);
      }
    } catch {
      // Offline fallback
      setWorks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorks();
  }, []);

  const handleExportKey = () => {
    const keyData = JSON.stringify(keyPair, null, 2);
    const blob = new Blob([keyData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creator-key-${keyPair.publicKey.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-blue-600 font-bold">Side 2 · Business Application</div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Creator Studio</h1>
          <p className="text-slate-600 text-sm mt-1">
            Prove priority of registration and build cryptographic version creation trails with client-side Ed25519 signing.
          </p>
        </div>
        <Link
          to="/creator/new"
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Register New Work
        </Link>
      </div>

      {/* Creator Key Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Browser Ed25519 Creator Key</h3>
              <p className="text-xs text-slate-500 font-mono">Fingerprint: {keyFingerprint}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportKey}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-mono text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" /> Export Key
            </button>
          </div>
        </div>

        {/* Advisory chip */}
        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs font-mono">
          <strong>Notice:</strong> Ed25519 creator key is stored in browser localStorage. A cryptographic key proves key possession and registration timestamp priority, not physical biological identity.
        </div>
      </div>

      {/* Works List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Registered Works & Version Trails</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500">{works.length} creation trail{works.length !== 1 ? 's' : ''} in Registry</span>
            <button
              onClick={loadWorks}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
              title="Refresh Works"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {works.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <Feather className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No Creative Works Registered Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Register your first creative asset to establish timestamped priority and initiate an immutable creation trail.
              </p>
            </div>
            <Link
              to="/creator/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
            >
              <PlusCircle className="w-4 h-4" /> Register New Work
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {works.map((w) => (
              <div
                key={w.work_id}
                className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 hover:border-blue-400 transition-all shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold uppercase">
                    Anchored · Batch {w.batch_id}
                  </span>
                  <span className="text-xs font-mono text-slate-500">v{w.max_version}.0 ({w.version_count} Version{w.version_count > 1 ? 's' : ''})</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 truncate" title={w.title}>
                    {w.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    Work ID: {w.work_id} · Registered {new Date(w.latest_created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/creator/works/${w.work_id}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    View Creation Trail <ArrowRight className="w-3 h-3" />
                  </Link>
                  <Link
                    to={`/creator/certificate/${w.latest_record_id}`}
                    className="text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1"
                  >
                    Certificate <Eye className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
