import React, { useState } from 'react';
import { Copy, Check, Hash, Cpu, Sparkles } from 'lucide-react';

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
    if (bytes === undefined || bytes === null) return '0 B';
    if (bytes === 0) return '0 B';
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
    <div className="w-full rounded-xl border border-deep bg-ink/70 p-4 space-y-3 font-mono text-xs">
      {/* Top Label & Percentage */}
      <div className="flex items-center justify-between text-silver">
        <span className="flex items-center gap-1.5 font-semibold text-white">
          <Hash className="w-3.5 h-3.5 text-sky" />
          {label}
        </span>
        <div className="flex items-center gap-2">
          {totalBytes !== undefined && (
            <span className="text-slate text-[11px]">
              {formatBytes(processedBytes)} / {formatBytes(totalBytes)}
            </span>
          )}
          <span className={`font-bold ${isComplete ? 'text-emerald-400' : 'text-sky'}`}>
            {progress}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-deep/50 overflow-hidden relative">
        <div
          className={`h-full transition-all duration-150 ease-out rounded-full ${
            isComplete
              ? 'bg-gradient-to-r from-success to-emerald-400'
              : 'bg-gradient-to-r from-cerulean to-sky'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {/* Hash display once complete */}
      {isComplete && hash && (
        <div className="pt-1 flex items-center justify-between gap-2 p-2.5 rounded-lg bg-ink-deep border border-deep/60">
          <div className="truncate text-sky font-mono text-[11px]" title={hash}>
            <span className="text-slate select-none">SHA-256: </span>
            {hash}
          </div>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-1 rounded hover:bg-deep/40 text-slate hover:text-white transition-colors"
            title="Copy Hash"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-sky" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};
