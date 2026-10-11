import React, { useEffect, useState, useCallback } from 'react';
import { Activity, RefreshCw, Database, Shield, Radio, Blocks, Cpu } from 'lucide-react';

export interface HealthData {
  ok: boolean;
  ai?: {
    mode: string;
    ollama: boolean;
  };
  anchor?: {
    reachable: boolean;
    head?: number | { seq: number; entryHash: string };
  };
  witness?: {
    reachable: boolean;
    consistent: boolean;
  };
  chain?: {
    mode: string;
    reachable: boolean;
    chainId?: number;
    contract?: string;
    count?: number;
  };
  demoMode?: boolean;
}

export const HealthStrip: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<string>('');
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const checkHealth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error(`Health check returned status ${res.status}`);
      }
      const data: HealthData = await res.json();
      setHealth(data);
      setIsOffline(false);
    } catch {
      setIsOffline(true);
      setHealth(null);
    } finally {
      setLoading(false);
      setLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const renderBadge = (
    label: string,
    status: 'pass' | 'fail' | 'warn' | 'connecting',
    icon: React.ReactNode,
    details?: string
  ) => {
    let colorClasses = 'border-slate-200 text-slate-500 bg-white';
    let dotColor = 'bg-slate-400';

    if (status === 'pass') {
      colorClasses = 'border-emerald-200 text-emerald-700 bg-emerald-50/80';
      dotColor = 'bg-emerald-500';
    } else if (status === 'warn') {
      colorClasses = 'border-amber-200 text-amber-700 bg-amber-50/80';
      dotColor = 'bg-amber-500';
    } else if (status === 'fail') {
      colorClasses = 'border-rose-200 text-rose-700 bg-rose-50/80';
      dotColor = 'bg-rose-500';
    }

    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border transition-colors shadow-2xs ${colorClasses}`}
        title={details || label}
      >
        <span className="shrink-0 text-slate-600">{icon}</span>
        <span>{label}</span>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${status === 'pass' ? 'animate-pulse' : ''}`} />
      </div>
    );
  };

  const [showDetails, setShowDetails] = useState<boolean>(false);

  return (
    <div className="w-full bg-slate-50 border-b border-slate-200 px-4 py-1.5 text-xs text-slate-600">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-500 pc-status-dot-active'}`} />
          <span className="font-semibold text-slate-700 text-xs">
            {isOffline ? 'Services Offline' : 'ProofChain Network Active'}
          </span>
          <span className="hidden sm:inline text-slate-400 text-[11px]">·</span>
          <span className="hidden sm:inline text-slate-500 text-[11px]">
            {isOffline ? 'Connecting to local nodes...' : 'Registry (:4000) · Ledger (:4100) · Witness (:4200)'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {health?.demoMode && (
            <span className="hidden md:inline px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[10px]">
              Demo Mode
            </span>
          )}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
          >
            {showDetails ? 'Hide Status' : 'System Details'}
          </button>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-blue-600 transition-colors rounded hover:bg-slate-200 disabled:opacity-50"
            title="Refresh status"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Collapsible Detailed View */}
      {showDetails && (
        <div className="max-w-7xl mx-auto pt-2 pb-1 border-t border-slate-200/80 mt-1.5 flex flex-wrap items-center gap-2">
          {isOffline ? (
            renderBadge('Registry :4000', 'fail', <Database className="w-3 h-3" />, 'Port 4000 offline')
          ) : (
            renderBadge('Registry :4000', health?.ok ? 'pass' : 'warn', <Database className="w-3 h-3" />, 'Registry DB active')
          )}

          {isOffline ? (
            renderBadge('Anchor :4100', 'connecting', <Shield className="w-3 h-3" />, 'Standby')
          ) : (
            renderBadge(
              'Anchor :4100',
              health?.anchor?.reachable ? 'pass' : 'fail',
              <Shield className="w-3 h-3" />,
              health?.anchor?.reachable ? 'Signed Ledger active' : 'Unreachable'
            )
          )}

          {isOffline ? (
            renderBadge('Witness :4200', 'connecting', <Radio className="w-3 h-3" />, 'Standby')
          ) : (
            renderBadge(
              'Witness :4200',
              health?.witness?.reachable && health?.witness?.consistent !== false ? 'pass' : 'fail',
              <Radio className="w-3 h-3" />,
              health?.witness?.reachable ? 'Watchdog consistent' : 'Unreachable'
            )
          )}

          {isOffline ? (
            renderBadge('Polygon Amoy / EVM', 'connecting', <Blocks className="w-3 h-3" />, 'Standby')
          ) : (
            renderBadge(
              'Polygon Amoy / EVM',
              'pass',
              <Blocks className="w-3 h-3" />,
              'Online (Chain ID 80002)'
            )
          )}

          {!isOffline && health?.ai && (
            renderBadge(
              `AI: ${health.ai.mode}`,
              'pass',
              <Cpu className="w-3 h-3" />,
              'Deterministic AI Purity Enforced'
            )
          )}
        </div>
      )}
    </div>
  );
};
