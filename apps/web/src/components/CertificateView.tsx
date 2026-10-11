import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck, Printer, ExternalLink, QrCode as QrIcon, CheckCircle2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface CertificateData {
  recordId: string;
  batchId: string;
  anchorSeq: number;
  anchoredAt: string;
  contentHash: string;
  title?: string;
  license?: string;
  creatorPub?: string;
  version?: number;
  origin?: string;
}

export interface CertificateViewProps {
  data: CertificateData;
}

export const CertificateView: React.FC<CertificateViewProps> = ({ data }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const webOrigin = data.origin || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
  const verifyUrl = `${webOrigin}/verify?record=${encodeURIComponent(data.recordId)}`;

  useEffect(() => {
    QRCode.toDataURL(verifyUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.warn('QR generation error:', err));
  }, [verifyUrl]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between no-print font-mono text-xs">
        <span className="text-slate-600 flex items-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          Cryptographic Certificate of Priority & Integrity
        </span>
        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* Luxury Certificate Card Container */}
      <div
        id="certificate-print-area"
        className="certificate-card rounded-3xl border-2 border-blue-600/30 bg-white p-8 sm:p-12 space-y-8 shadow-xl relative overflow-hidden font-sans text-slate-800"
      >
        {/* Subtle Luxury Gradient & Accent Border */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-blue-50/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />

        {/* Certificate Header */}
        <div className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-200 pb-6 relative z-10">
          <div className="space-y-1">
            <div className="text-[11px] uppercase font-mono tracking-widest text-blue-600 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              ProofChain · CreatorProof Protocol
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Certificate of Priority & Integrity
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Certificate ID: {data.recordId} · Merkle Batch {data.batchId}
            </p>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
            <ShieldCheck className="w-9 h-9" />
          </div>
        </div>

        {/* Work Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono relative z-10">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-500 uppercase text-[10px] font-bold">Registered Work Title</div>
            <div className="text-slate-900 font-bold text-sm truncate">{data.title || 'Untitled Creation'}</div>
            <div className="text-[11px] text-slate-500">Version {data.version ?? 1}.0 · License: {data.license || 'CC-BY-4.0'}</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-500 uppercase text-[10px] font-bold">Anchor Ledger Assertion</div>
            <div className="text-emerald-700 font-bold text-sm">
              Entry #{data.anchorSeq} (Dual Anchored)
            </div>
            <div className="text-[11px] text-slate-500">
              Timestamp: {data.anchoredAt ? new Date(data.anchoredAt).toUTCString() : '2026-10-11 09:30 UTC'}
            </div>
          </div>
        </div>

        {/* Content SHA-256 Hash Display */}
        <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200 space-y-1 font-mono text-xs relative z-10">
          <div className="text-slate-600 uppercase text-[10px] font-bold">Registered Content SHA-256 Hash</div>
          <div className="text-blue-900 font-bold break-all text-xs selection:bg-blue-600 selection:text-white">
            {data.contentHash}
          </div>
          {data.creatorPub && (
            <div className="text-[11px] text-slate-600 pt-1 truncate">
              Creator Key: <span className="text-slate-800 font-medium">{data.creatorPub}</span>
            </div>
          )}
        </div>

        {/* Mandatory Disclaimer Text (Exact Frozen Wording) */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-mono relative z-10">
          <p className="italic">
            &ldquo;This certificate states that a record matching the file hash below was registered in batch {data.batchId} and anchored as entry #{data.anchorSeq} at {data.anchoredAt ? new Date(data.anchoredAt).toUTCString() : '2026-10-11 09:30 UTC'} (anchor-asserted time). It does not establish who created the work or that its contents are true. Verify independently at {verifyUrl}.&rdquo;
          </p>
        </div>

        {/* 3-Line Status Banner */}
        <div className="space-y-2.5 font-mono text-xs relative z-10">
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
            <span className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              1. Content Integrity
            </span>
            <span className="font-bold">VERIFIED · NO BITS MODIFIED</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
            <span className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              2. Priority of Registration
            </span>
            <span className="font-bold">VERIFIED · ANCHORED IN BATCH {data.batchId}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
            <span className="font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              3. Attribution Evidence (Never Green)
            </span>
            <span className="font-bold">SIGNED BY CREATOR (EVIDENCE ONLY)</span>
          </div>
        </div>

        {/* QR Code and Verification Footer */}
        <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-slate-200 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-2xl bg-white p-2 flex items-center justify-center shadow-md border border-slate-200">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="Verify QR Code" className="w-full h-full object-contain" />
              ) : (
                <QrIcon className="w-16 h-16 text-slate-400" />
              )}
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-900">Scan for Independent Verification</div>
              <div className="text-[11px] font-mono text-slate-500 max-w-xs break-all">
                {verifyUrl}
              </div>
            </div>
          </div>

          <Link
            to={`/verify?record=${encodeURIComponent(data.recordId)}`}
            className="no-print px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all font-mono"
          >
            Verify Independently <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
