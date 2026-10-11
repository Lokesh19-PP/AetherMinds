import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Feather, PlusCircle, RefreshCw } from 'lucide-react';
import { api, WorkVersion, ClaimItem } from '../../lib/api';
import { TrailTimeline } from '../../components/TrailTimeline';
import { ClaimsPanel } from '../../components/ClaimsPanel';

export const WorkDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const workId = id || 'work-001';

  const [loading, setLoading] = useState<boolean>(true);
  const [versions, setVersions] = useState<WorkVersion[]>([]);
  const [claims, setClaims] = useState<ClaimItem[]>([]);

  // Realistic fallback demo creation trail data
  const fallbackVersions: WorkVersion[] = [
    {
      version: 2,
      recordId: 'rec-002',
      leafHash: '7110eda4d09e062aa5e4a390b0a572ac0d2c0220da71a55d56d83a4e9dd3a4ac',
      parentLeaf: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      status: 'anchored',
      anchoredAt: '2026-10-11T11:15:00Z',
    },
    {
      version: 1,
      recordId: 'rec-001',
      leafHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      status: 'anchored',
      anchoredAt: '2026-10-11T09:30:00Z',
    },
  ];

  const loadWorkData = async () => {
    setLoading(true);
    try {
      const data = await api.getWorks(workId);
      if (data && data.versions && data.versions.length > 0) {
        setVersions(data.versions);
        if (data.versions[0]?.leafHash) {
          const claimsRes = await api.getClaims(data.versions[0].leafHash);
          if (claimsRes && claimsRes.claims) {
            setClaims(claimsRes.claims);
          }
        }
      } else {
        setVersions(fallbackVersions);
      }
    } catch {
      setVersions(fallbackVersions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkData();
  }, [workId]);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 font-sans">
      <Link
        to="/creator"
        className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Creator Studio
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-blue-600 font-bold flex items-center gap-1.5">
            <Feather className="w-4 h-4 text-blue-600" />
            Provenance & Version Trail
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-3">
            Work: {workId}
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Immutable version timeline anchored across RFC 6962 batches. Each version binds cryptographically to its parent leaf.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={loadWorkData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all shadow-xs"
            title="Refresh Trail"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/creator/new"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Add New Version
          </Link>
        </div>
      </div>

      {/* Competing Claims Panel (if any exist) */}
      {claims.length > 0 && (
        <ClaimsPanel claims={claims} contentHash={versions[0]?.leafHash || ''} />
      )}

      {/* Timeline Component */}
      <TrailTimeline versions={versions} workId={workId} />
    </div>
  );
};
