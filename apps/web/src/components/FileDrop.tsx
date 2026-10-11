import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { hashFile, FileHashResult } from '../lib/fileHash';
import { generateThumbnail, ThumbnailResult } from '../lib/thumbnail';
import { computeDHash } from '../lib/similarity';
import { HashProgress } from './HashProgress';

export interface FileDropResult {
  file: File;
  hash: string;
  bytes: Uint8Array;
  thumbnail?: ThumbnailResult;
  dHash?: string;
}

export interface FileDropProps {
  accept?: string;
  maxSizeMb?: number;
  label?: string;
  sublabel?: string;
  enableThumbnail?: boolean;
  enableDHash?: boolean;
  onFileHashed?: (result: FileDropResult) => void;
  onReset?: () => void;
}

export const FileDrop: React.FC<FileDropProps> = ({
  accept = '*/*',
  maxSizeMb = 100,
  label = 'Drop file to hash in browser',
  sublabel = 'Pure client-side streaming SHA-256. Zero bits leave your device.',
  enableThumbnail = true,
  enableDHash = true,
  onFileHashed,
  onReset,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedBytes, setProcessedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FileDropResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsProcessing(true);
      setProgress(0);
      setTotalBytes(file.size);

      try {
        const hashResult: FileHashResult = await hashFile(file, (pct, processed, total) => {
          setProgress(pct);
          setProcessedBytes(processed);
          setTotalBytes(total);
        });

        let thumbnail: ThumbnailResult | undefined;
        let dHash: string | undefined;

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (enableThumbnail && (isImage || isVideo)) {
          try {
            thumbnail = await generateThumbnail(file);
          } catch (thumbErr) {
            console.warn('Thumbnail generation skipped:', thumbErr);
          }
        }

        if (enableDHash && isImage) {
          try {
            dHash = await computeDHash(file);
          } catch (dHashErr) {
            console.warn('dHash computation skipped:', dHashErr);
          }
        }

        const dropResult: FileDropResult = {
          file,
          hash: hashResult.hex,
          bytes: hashResult.bytes,
          thumbnail,
          dHash,
        };

        setResult(dropResult);
        onFileHashed?.(dropResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to hash file');
      } finally {
        setIsProcessing(false);
      }
    },
    [enableThumbnail, enableDHash, onFileHashed]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleReset = () => {
    setResult(null);
    setProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onReset?.();
  };

  return (
    <div className="w-full space-y-4 font-sans">
      {!result ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 group ${
            isDragging
              ? 'border-blue-600 bg-blue-50/60 shadow-md shadow-blue-500/10'
              : 'border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50/20 shadow-sm'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-100 transition-all shadow-sm">
              <Upload className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {label}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {sublabel}
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[11px] font-mono text-slate-600 border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Max size: {maxSizeMb} MB</span>
            </div>
          </div>
        </div>
      ) : (
        /* Completed file view */
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {result.thumbnail ? (
                <img
                  src={result.thumbnail.dataUrl}
                  alt="Thumbnail"
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <FileText className="w-7 h-7" />
                </div>
              )}

              <div className="space-y-0.5">
                <div className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                  {result.file.name}
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  {(result.file.size / 1024).toFixed(1)} KB · {result.file.type || 'binary/raw'}
                </div>
                {result.dHash && (
                  <div className="text-[10px] font-mono text-blue-600">
                    64-bit dHash: {result.dHash}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs flex items-center justify-between gap-2">
            <span className="text-slate-500 text-[11px] select-none">SHA-256:</span>
            <span className="text-slate-800 font-bold truncate text-[11px] select-all">
              {result.hash}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* In-progress hashing view */}
      {isProcessing && (
        <HashProgress
          progress={progress}
          processedBytes={processedBytes}
          totalBytes={totalBytes}
        />
      )}

      {/* Error state */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
