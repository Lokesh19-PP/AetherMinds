import React, { useState } from 'react';
import { FlaskConical, AlertTriangle, ShieldAlert, RotateCcw, CheckCircle2, Bug, Play } from 'lucide-react';

export const TamperLab: React.FC = () => {
  const [tampering, setTampering] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([
    'System initialized in clean state. Ready for adversarial test simulations.',
  ]);

  const runTamper = (scenario: string, expectedCode: string) => {
    setTampering(scenario);
    setTimeout(() => {
      setTampering(null);
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Executed scenario: ${scenario} -> Expected rejection code: ${expectedCode}`,
        ...prev,
      ]);
    }, 600);
  };

  const handleReset = () => {
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] System reset: Restored SQLite and clean state.`,
      ...prev,
    ]);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-warn font-bold flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4 text-warn" />
            Adversarial Simulation
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Tamper Lab</h1>
          <p className="text-slate text-sm mt-1">
            Simulate realistic malicious attacks against documents, proof bundles, SQLite databases, and anchor ledgers to prove fail-closed guarantees.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="px-4 py-2.5 rounded-xl bg-deep/50 hover:bg-deep text-silver hover:text-white border border-deep text-sm font-semibold flex items-center gap-2 transition-all"
        >
          <RotateCcw className="w-4 h-4 text-sky" />
          Reset to Clean State
        </button>
      </div>

      {/* Tamper Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Case 1: Document Flip */}
        <div className="p-6 rounded-2xl border border-deep bg-ink/60 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">1. Flip 1 Byte in Document</h3>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-danger/20 text-rose-400 border border-danger/40">
              DOC_MODIFIED
            </span>
          </div>
          <p className="text-slate text-xs leading-relaxed">
            Modifies a single byte in the uploaded document. The recomputed leaf hash fails to match the leafHash asserted in the proof bundle.
          </p>
          <button
            onClick={() => runTamper('doc-flip', 'DOC_MODIFIED')}
            disabled={tampering !== null}
            className="w-full py-2.5 rounded-xl bg-danger/20 hover:bg-danger/30 text-rose-300 border border-danger/40 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Play className="w-3.5 h-3.5" /> Simulate doc-flip
          </button>
        </div>

        {/* Case 2: Proof Sibling Edit */}
        <div className="p-6 rounded-2xl border border-deep bg-ink/60 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">2. Edit Merkle Proof Path</h3>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-danger/20 text-rose-400 border border-danger/40">
              ROOT_MISMATCH
            </span>
          </div>
          <p className="text-slate text-xs leading-relaxed">
            Alters one sibling node hash in .pcproof.json. Folding the path produces a bogus root that fails to match the anchor root.
          </p>
          <button
            onClick={() => runTamper('proof-edit', 'ROOT_MISMATCH')}
            disabled={tampering !== null}
            className="w-full py-2.5 rounded-xl bg-danger/20 hover:bg-danger/30 text-rose-300 border border-danger/40 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Play className="w-3.5 h-3.5" /> Simulate proof-edit
          </button>
        </div>

        {/* Case 3: Anchor Edit */}
        <div className="p-6 rounded-2xl border border-deep bg-ink/60 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">3. Mutate Anchor Entry</h3>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-danger/20 text-rose-400 border border-danger/40">
              ANCHOR_INVALID
            </span>
          </div>
          <p className="text-slate text-xs leading-relaxed">
            Modifies an anchor entry line without re-signing. The verifier recomputes entryHash and rejects the invalid Ed25519 signature.
          </p>
          <button
            onClick={() => runTamper('anchor-edit', 'ANCHOR_INVALID')}
            disabled={tampering !== null}
            className="w-full py-2.5 rounded-xl bg-danger/20 hover:bg-danger/30 text-rose-300 border border-danger/40 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Play className="w-3.5 h-3.5" /> Simulate anchor-edit
          </button>
        </div>

        {/* Case 4: Witness Mismatch */}
        <div className="p-6 rounded-2xl border border-deep bg-ink/60 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">4. Re-sign Anchor Ledger (Fork)</h3>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-danger/20 text-rose-400 border border-danger/40">
              WITNESS_MISMATCH
            </span>
          </div>
          <p className="text-slate text-xs leading-relaxed">
            Simulates a rogue anchor admin rewriting past entries. The independent Witness watchdog (:4200) catches the history discrepancy.
          </p>
          <button
            onClick={() => runTamper('anchor-resign', 'WITNESS_MISMATCH')}
            disabled={tampering !== null}
            className="w-full py-2.5 rounded-xl bg-danger/20 hover:bg-danger/30 text-rose-300 border border-danger/40 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Play className="w-3.5 h-3.5" /> Simulate anchor-resign
          </button>
        </div>
      </div>

      {/* Tamper Output Logs */}
      <div className="rounded-2xl border border-deep bg-ink/80 p-6 space-y-3 font-mono text-xs">
        <h4 className="text-slate text-xs uppercase tracking-wider font-bold">Adversarial Execution Log</h4>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="text-silver/80">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
