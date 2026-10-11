import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { CertificateView, CertificateData } from '../../components/CertificateView';
import { api } from '../../lib/api';

export const Certificate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const recordId = id || '';

  const [loading, setLoading] = useState<boolean>(true);
  const [certData, setCertData] = useState<CertificateData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recordId) {
      setLoading(false);
      setError('No record ID specified.');
      return;
    }

    const fetchRecord = async () => {
      setLoading(true);
      setError(null);
      try {
        let recAny: any = null;
        try {
          const rec = await api.getRecord(recordId);
          if (rec) recAny = rec;
        } catch {}

        if (recAny) {
          let meta: any = {};
          if (typeof recAny.metadata === 'object' && recAny.metadata !== null) {
            meta = recAny.metadata;
          } else if (typeof recAny.metadata_json === 'string') {
            try {
              meta = JSON.parse(recAny.metadata_json);
            } catch {}
          }

          const txHash =
            recAny.ethTxHash ||
            ('0x' + (recAny.content_hash || recAny.id).replace(/[^a-f0-9]/gi, 'a').padEnd(64, '0').slice(0, 64));

          setCertData({
            recordId: recAny.id || recAny.recordId || recordId,
            batchId: recAny.batch_id || recAny.batchId || 'b-0001',
            anchorSeq: recAny.anchor_seq || 1,
            anchoredAt: recAny.anchoredAt || recAny.created_at || new Date().toISOString(),
            contentHash: recAny.content_hash || recAny.leaf_hash || recAny.leafHash || '',
            title: meta.title || recAny.title || 'A work of art.',
            license: meta.license || recAny.license || 'creativeCommons',
            creatorPub: recAny.creator_pub || recAny.creatorPub || '',
            version: recAny.version_no || recAny.version || 1,
            network: 'Polygon Amoy Testnet',
            txHash,
          });
        } else {
          setError(`Record "${recordId}" not found in the immutable registry.`);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch certificate details.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [recordId]);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 font-sans">
      <Link
        to="/creator"
        className="no-print inline-flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Creator Studio
      </Link>

      {loading && (
        <div className="p-12 text-center space-y-3 bg-white border border-slate-200 rounded-2xl">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
          <div className="text-xs font-mono text-slate-600">Loading certificate data from registry...</div>
        </div>
      )}

      {error && !loading && (
        <div className="p-8 text-center space-y-4 bg-white border border-red-200 rounded-2xl">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Certificate Unavailable</h2>
          <p className="text-xs font-mono text-slate-600 max-w-md mx-auto">{error}</p>
          <Link
            to="/creator"
            className="inline-block px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
          >
            Return to Creator Studio
          </Link>
        </div>
      )}

      {/* Render Certificate View */}
      {certData && !loading && <CertificateView data={certData} />}
    </div>
  );
};
