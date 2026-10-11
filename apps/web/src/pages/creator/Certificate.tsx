import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CertificateView, CertificateData } from '../../components/CertificateView';
import { api } from '../../lib/api';

export const Certificate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const recordId = id || 'rec-001';

  const [loading, setLoading] = useState<boolean>(true);
  const [certData, setCertData] = useState<CertificateData>({
    recordId,
    batchId: 'batch-001',
    anchorSeq: 1,
    anchoredAt: '2026-10-11T09:30:00Z',
    contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    title: 'AetherMinds Master Algorithm Blueprint',
    license: 'CC-BY-4.0',
    creatorPub: 'ed25519:7b3a9c81928374a56b1029384756c01928374650192837465a01928374659102',
    version: 1,
  });

  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true);
      try {
        const record = await api.getRecord(recordId);
        if (record) {
          setCertData({
            recordId: record.recordId,
            batchId: record.batchId || 'batch-001',
            anchorSeq: 1,
            anchoredAt: record.createdAt || '2026-10-11T09:30:00Z',
            contentHash: record.leafHash || certData.contentHash,
            title: 'AetherMinds Master Algorithm Blueprint',
            license: 'CC-BY-4.0',
            creatorPub: certData.creatorPub,
            version: 1,
          });
        }
      } catch {
        // Fallback to default certData
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

      {/* Render Certificate View */}
      <CertificateView data={certData} />
    </div>
  );
};
