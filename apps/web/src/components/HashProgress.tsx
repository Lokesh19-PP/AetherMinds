import React, { useState } from 'react';
import { Copy, Check, Hash } from 'lucide-react';

export interface HashProgressProps {
  progress: number; // 0 to 100
  processedBytes?: number;
  totalBytes?: number;
  hash?: string;
  isComplete?: boolean;
  label?: string;
}

export const HashProgress: React.FC<HashProgressProps> = ({
  progress,
  processedBytes,
  totalBytes,
  hash,
  isComplete = false,
  label = 'Streaming SHA-256 Hashing',
}) => {
  const [copied, setCopied] = useState(false);

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleCopy = () => {
    if (hash) {
      navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-4 space-y-3 font-mono text-xs shadow-sm">
      {/* Top Label & Percentage */}
      <div className="flex items-center justify-between text-slate-700">
        <span className="flex items-center gap-1.5 font-semibold text-slate-900">
          <Hash className="w-3.5 h-3.5 text-blue-600" />
          {label}
        </span>
        <div className="flex items-center gap-2">
          {totalBytes !== undefined && (
            <span className="text-slate-500 text-[11px]">
              {formatBytes(processedBytes)} / {formatBytes(totalBytes)}
            </span>
          )}
          <span className={`font-bold ${isComplete ? 'text-emerald-600' : 'text-blue-600'}`}>
            {progress}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden relative border border-slate-200/50">
        <div
          className={`h-full transition-all duration-150 ease-out rounded-full ${
            isComplete
              ? 'bg-emerald-500'
              : 'bg-blue-600'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {/* Hash display once complete */}
      {isComplete && hash && (
        <div className="pt-1 flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="truncate text-slate-800 font-mono text-[11px]" title={hash}>
            <span className="text-slate-500 select-none">SHA-256: </span>
            {hash}
          </div>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            title="Copy Hash"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-blue-600" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};
