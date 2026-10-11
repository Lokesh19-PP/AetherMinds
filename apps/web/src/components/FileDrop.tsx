import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Image as ImageIcon, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
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
  maxSizeMb = 100, // Client hashing can handle large files
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
        // Step 1: Streaming chunked SHA-256
        const hashResult: FileHashResult = await hashFile(file, (pct, processed, total) => {
          setProgress(pct);
          setProcessedBytes(processed);
          setTotalBytes(total);
        });

        // Step 2: Optional canvas thumbnail (for images/videos)
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

        // Step 3: Optional 64-bit dHash (images only)
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
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
              ? 'border-sky bg-sky/10 shadow-lg shadow-sky/10'
              : 'border-deep/80 hover:border-cerulean/60 bg-ink/40 hover:bg-ink/60'
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
            <div className="w-14 h-14 rounded-2xl bg-deep/40 text-sky mx-auto flex items-center justify-center group-hover:scale-105 group-hover:text-white transition-all shadow-md">
              <Upload className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white group-hover:text-sky transition-colors">
                {label}
              </h3>
              <p className="text-xs text-slate max-w-sm mx-auto leading-relaxed">
                {sublabel}
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-deep/50 text-[11px] font-mono text-silver border border-silver/10">
              <ShieldCheck className="w-3.5 h-3.5 text-sky" />
              <span>Max size: {maxSizeMb} MB</span>
            </div>
          </div>
        </div>
      ) : (
        /* Completed file view */
        <div className="rounded-2xl border border-deep bg-ink/80 p-5 space-y-4 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {result.thumbnail ? (
                <img
                  src={result.thumbnail.dataUrl}
                  alt="Thumbnail"
                  className="w-14 h-14 rounded-xl object-cover border border-deep shadow-md"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-deep/40 text-sky flex items-center justify-center border border-deep/60">
                  <FileText className="w-7 h-7" />
                </div>
              )}

              <div className="space-y-0.5">
                <div className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                  {result.file.name}
                </div>
                <div className="text-[11px] font-mono text-slate">
                  {(result.file.size / 1024).toFixed(1)} KB · {result.file.type || 'binary/raw'}
                </div>
                {result.dHash && (
                  <div className="text-[10px] font-mono text-sky">
                    64-bit dHash: {result.dHash}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg text-slate hover:text-white hover:bg-deep/40 transition-colors"
              title="Remove File"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Hash details */}
          <HashProgress
            progress={100}
            totalBytes={result.file.size}
            processedBytes={result.file.size}
            hash={result.hash}
            isComplete={true}
            label="Verified Content SHA-256"
          />
        </div>
      )}

      {/* Real-time processing progress */}
      {isProcessing && (
        <HashProgress
          progress={progress}
          processedBytes={processedBytes}
          totalBytes={totalBytes}
          label="Streaming Hashing in Progress..."
        />
      )}

      {/* Error notification */}
      {error && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
