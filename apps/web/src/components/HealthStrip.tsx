import React, { useEffect, useState, useCallback } from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Database, Shield, Radio, Cpu, Blocks } from 'lucide-react';

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
      setLastChecked(new Date().toLocaleTimeString());
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
    let colorClasses = 'border-slate/40 text-slate bg-ink/60';
    let dotColor = 'bg-slate';

    if (status === 'pass') {
      colorClasses = 'border-success/30 text-emerald-400 bg-success/10';
      dotColor = 'bg-success';
    } else if (status === 'warn') {
      colorClasses = 'border-warn/30 text-amber-400 bg-warn/10';
      dotColor = 'bg-warn';
    } else if (status === 'fail') {
      colorClasses = 'border-danger/30 text-rose-400 bg-danger/10';
      dotColor = 'bg-danger';
    }

    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition-colors ${colorClasses}`}
        title={details || label}
      >
        <span className="flex-shrink-0">{icon}</span>
        <span>{label}</span>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${status === 'pass' ? 'animate-pulse' : ''}`} />
      </div>
    );
  };

  return (
    <div className="w-full bg-ink/80 border-b border-deep/60 px-4 py-1.5 text-xs text-silver flex flex-wrap items-center justify-between gap-2 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sky font-medium">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span className="uppercase tracking-wider text-[10px] text-slate font-bold">Network Trust Strip</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Registry status (:4000) */}
          {isOffline ? (
            renderBadge('Registry :4000', 'fail', <Database className="w-3 h-3" />, 'Registry unreachable (offline/standby)')
          ) : (
            renderBadge('Registry :4000', health?.ok ? 'pass' : 'warn', <Database className="w-3 h-3" />, 'Port 4000 Active')
          )}

          {/* Anchor status (:4100) */}
          {isOffline ? (
            renderBadge('Anchor :4100', 'connecting', <Shield className="w-3 h-3" />, 'Standby')
          ) : (
            renderBadge(
              'Anchor :4100',
              health?.anchor?.reachable ? 'pass' : 'fail',
              <Shield className="w-3 h-3" />,
              health?.anchor?.reachable ? 'Signed Ledger Active' : 'Unreachable'
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
              health?.witness?.reachable ? 'Watchdog Consistent' : 'Unreachable'
            )
          )}

          {/* Chain status (:8545) */}
          {isOffline ? (
            renderBadge('Chain :8545', 'connecting', <Blocks className="w-3 h-3" />, 'Standby')
          ) : (
            renderBadge(
              'Hardhat EVM',
              health?.chain?.reachable ? 'pass' : health?.chain?.mode === 'none' ? 'connecting' : 'warn',
              <Blocks className="w-3 h-3" />,
              health?.chain?.reachable ? `Chain ID ${health.chain.chainId || 31337}` : 'Local Node'
            )
          )}

          {/* AI status */}
          {!isOffline && health?.ai && (
            renderBadge(
              `AI: ${health.ai.mode}${health.ai.ollama ? ' (Ollama)' : ''}`,
              'pass',
              <Cpu className="w-3 h-3" />,
              'Deterministic AI Purity Enforced'
            )
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-slate font-mono text-[11px]">
        {health?.demoMode && (
          <span className="px-2 py-0.5 rounded bg-warn/20 text-warn border border-warn/30 font-bold uppercase tracking-wider text-[10px]">
            Demo Mode Active
          </span>
        )}
        <span>Poll: {lastChecked || 'Initial...'}</span>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="p-1 hover:text-sky transition-colors rounded hover:bg-deep/40 disabled:opacity-50"
          title="Refresh service health"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
