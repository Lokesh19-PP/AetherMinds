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

  return (
    <div className="w-full bg-slate-50/90 border-b border-slate-200 px-4 py-1.5 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-blue-700 font-semibold">
          <Activity className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span className="uppercase tracking-wider text-[10px] text-slate-500 font-bold">Network Services</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Registry status (:4000) */}
          {isOffline ? (
            renderBadge('Registry :4000', 'fail', <Database className="w-3 h-3" />, 'Port 4000 offline')
          ) : (
            renderBadge('Registry :4000', health?.ok ? 'pass' : 'warn', <Database className="w-3 h-3" />, 'Registry DB active')
          )}

          {/* Anchor status (:4100) */}
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

          {/* Witness status (:4200) */}
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

          {/* Chain status (:8545) */}
          {isOffline ? (
            renderBadge('Hardhat EVM', 'connecting', <Blocks className="w-3 h-3" />, 'Standby')
          ) : (
            renderBadge(
              'Hardhat EVM',
              health?.chain?.reachable ? 'pass' : 'connecting',
              <Blocks className="w-3 h-3" />,
              health?.chain?.reachable ? `Chain ID ${health.chain.chainId || 31337}` : 'Local Node'
            )
          )}

          {/* AI status */}
          {!isOffline && health?.ai && (
            renderBadge(
              `AI: ${health.ai.mode}`,
              'pass',
              <Cpu className="w-3 h-3" />,
              'Deterministic AI Purity Enforced'
            )
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
        {health?.demoMode && (
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold uppercase tracking-wider text-[10px]">
            Demo Mode Active
          </span>
        )}
        <span>Sync: {lastChecked || 'Checking...'}</span>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="p-1 text-slate-500 hover:text-blue-600 transition-colors rounded hover:bg-slate-200 disabled:opacity-50"
          title="Refresh service status"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
