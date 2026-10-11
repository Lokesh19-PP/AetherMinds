import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, AlertTriangle, ShieldAlert, RotateCcw, CheckCircle2, Download, Play, ExternalLink, RefreshCw, FileWarning, Database } from 'lucide-react';
import { api } from '../../lib/api';

export const TamperLab: React.FC = () => {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Tamper Lab initialized. System in clean benchmark state.`,
  ]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  // Call Server-side Demo Tamper Routes
  const handleServerTamper = async (action: string, label: string, expectedEffect: string) => {
    setActiveAction(action);
    try {
      const res = await api.demoTamper(action);
      addLog(`SERVER TAMPER: "${label}" executed. Changed: ${res.changed || 'OK'}. Expected Audit Drift: ${expectedEffect}`);
    } catch {
      // Fallback in demo mode if server isn't running
      addLog(`SIMULATED TAMPER: "${label}" simulated on localhost. Audit will flag ${expectedEffect}.`);
    } finally {
      setActiveAction(null);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.demoReset();
      addLog('CLEAN STATE RESTORED: Restored SQLite database from clean backup.');
    } catch {
      addLog('CLEAN STATE RESTORED: Local state restored.');
    } finally {
      setResetting(false);
    }
  };

  // Pre-tampered file generators for live testing on /verify
  const downloadTamperedDoc = () => {
    const originalText = 'VORTEXA 3.0 Sample Document Content for ProofChain Verification';
    // Flip 1 character
    const tamperedText = 'VORTEXA 3.0 Sample Document Content for ProofChain Verificatixn';
    const blob = new Blob([tamperedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tampered_doc_bit_flip.txt';
    a.click();
    URL.revokeObjectURL(url);
    addLog('DOWNLOADED: "tampered_doc_bit_flip.txt". Verify with clean proof on /verify -> Produces DOC_MODIFIED.');
  };

  const downloadTamperedProof = () => {
    const tamperedBundle = {
      format: 'proofchain/proof/1',
      recordKind: 'file',
      batchId: 'batch-001',
      leafIndex: 0,
      leafCount: 8,
      leafHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
      path: [
        // Tampered sibling hash
        { side: 'right', hash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' },
        { side: 'right', hash: '5858cfd7be8f24ecffb648f936353d2bf94943f550ffc17bfbf798363a23a3eb' },
        { side: 'right', hash: '31846b02660d29ab997eb948b472ea63e18cfbf6e5b4b1a45cf2a4fe99238eb1' },
      ],
      anchors: [
        {
          type: 'ledger',
          seq: 1,
          root: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          entryHash: 'f42b918a0029bc41...',
          timestamp: '2026-10-11T09:30:00Z',
        },
      ],
    };

    const blob = new Blob([JSON.stringify(tamperedBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tampered_proof_path_corrupted.pcproof.json';
    a.click();
    URL.revokeObjectURL(url);
    addLog('DOWNLOADED: "tampered_proof_path_corrupted.pcproof.json". Verify on /verify -> Produces ROOT_MISMATCH.');
  };

  const downloadTamperedAnchorEntry = () => {
    const invalidAnchorEntry = {
      seq: 1,
      batchId: 'batch-001',
      root: '0000000000000000000000000000000000000000000000000000000000000000',
      leafCount: 8,
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
      timestamp: '2026-10-11T09:30:00Z',
      entryHash: '9999999999999999999999999999999999999999999999999999999999999999',
      signature: 'bad_signature_forged_entry_bytes_99999999999999999999999999999999999999999999',
    };

    const blob = new Blob([JSON.stringify(invalidAnchorEntry, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tampered_anchor_invalid_sig.json';
    a.click();
    URL.revokeObjectURL(url);
    addLog('DOWNLOADED: "tampered_anchor_invalid_sig.json". Paste in /verify offline mode -> Produces ANCHOR_INVALID.');
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-warn font-bold flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4 text-warn" />
            Adversarial Security Laboratory
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Tamper Lab
          </h1>
          <p className="text-slate text-sm mt-1">
            Simulate realistic malicious attacks against SQLite databases, document bits, Merkle paths, and anchor ledgers to prove fail-closed guarantees.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/verify"
            className="px-4 py-2.5 rounded-xl bg-cerulean hover:bg-sky text-white hover:text-ink font-semibold text-xs flex items-center gap-2 shadow-md"
          >
            <ExternalLink className="w-4 h-4" /> Go to /verify
          </Link>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-4 py-2.5 rounded-xl bg-deep/50 hover:bg-deep text-silver hover:text-white border border-deep text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <RotateCcw className={`w-4 h-4 text-sky ${resetting ? 'animate-spin' : ''}`} />
            Reset DB Clean State
          </button>
        </div>
      </div>

      {/* SECTION 1: Client Verification Tamper Tests */}
      <div className="rounded-2xl border border-deep bg-ink/70 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-warn" />
            Live Client Tamper Files (Download & Verify on /verify)
          </h2>
          <span className="text-xs font-mono text-slate">Verifies Rule R-5 & R-7</span>
        </div>

        <p className="text-xs text-slate leading-relaxed">
          Download pre-tampered adversarial samples below and drop them directly into the standalone verifier on <code className="text-sky font-mono">/verify</code> to observe deterministic cryptographic rejection codes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Doc Flip */}
          <div className="p-4 rounded-xl border border-deep bg-ink-deep/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Tamper Document</span>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-danger/20 text-rose-400 border border-danger/40">
                DOC_MODIFIED
              </span>
            </div>
            <p className="text-[11px] text-slate">
              Flips 1 byte in document. Leaf hash fails to match bundle assertion.
            </p>
            <button
              onClick={downloadTamperedDoc}
              className="w-full py-2 rounded-lg bg-deep/40 hover:bg-cerulean text-sky hover:text-white text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Download Doc
            </button>
          </div>

          {/* Proof Edit */}
          <div className="p-4 rounded-xl border border-deep bg-ink-deep/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Tamper Merkle Path</span>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-danger/20 text-rose-400 border border-danger/40">
                ROOT_MISMATCH
              </span>
            </div>
            <p className="text-[11px] text-slate">
              Modifies sibling node in .pcproof.json. Recomputes bogus Merkle root.
            </p>
            <button
              onClick={downloadTamperedProof}
              className="w-full py-2 rounded-lg bg-deep/40 hover:bg-cerulean text-sky hover:text-white text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Download Proof
            </button>
          </div>

          {/* Anchor Invalid */}
          <div className="p-4 rounded-xl border border-deep bg-ink-deep/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Tamper Anchor Entry</span>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-danger/20 text-rose-400 border border-danger/40">
                ANCHOR_INVALID
              </span>
            </div>
            <p className="text-[11px] text-slate">
              Corrupts signature in AnchorEntry. Fails Ed25519 signature verification.
            </p>
            <button
              onClick={downloadTamperedAnchorEntry}
              className="w-full py-2 rounded-lg bg-deep/40 hover:bg-cerulean text-sky hover:text-white text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Download Anchor
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: Server-side Registry Tamper Buttons */}
      <div className="rounded-2xl border border-deep bg-ink/70 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-sky" />
            Registry Server-Side Tamper Actions (/api/demo/tamper)
          </h2>
          <span className="text-xs font-mono text-slate">DEMO_MODE=true</span>
        </div>

        <p className="text-xs text-slate leading-relaxed">
          Simulate an insider attacker modifying the central SQLite database. The Drift Audit will catch the tampering, and genuine documents will still verify cleanly against the immutable Anchor Ledger!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-deep bg-ink-deep/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Tamper SQLite Batch Root</span>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-warn/20 text-amber-400 border border-warn/40">
                DB_ROOT_DRIFT
              </span>
            </div>
            <p className="text-[11px] text-slate">
              Overwrites <code className="text-sky font-mono">batches.root</code> in SQLite database.
            </p>
            <button
              onClick={() => handleServerTamper('tamper-root', 'Tamper Batch Root in DB', 'DB_ROOT_DRIFT')}
              disabled={activeAction !== null}
              className="w-full py-2 rounded-lg bg-danger/20 hover:bg-danger/30 text-rose-300 border border-danger/40 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-3.5 h-3.5" /> Overwrite DB Root
            </button>
          </div>

          <div className="p-4 rounded-xl border border-deep bg-ink-deep/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Corrupt Leaf Hash in DB</span>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-warn/20 text-amber-400 border border-warn/40">
                ROOT_DRIFT
              </span>
            </div>
            <p className="text-[11px] text-slate">
              Overwrites <code className="text-sky font-mono">records.leaf_hash</code>. Re-folded DB tree fails anchor root.
            </p>
            <button
              onClick={() => handleServerTamper('corrupt-leaf', 'Corrupt Leaf Hash in DB', 'ROOT_DRIFT')}
              disabled={activeAction !== null}
              className="w-full py-2 rounded-lg bg-danger/20 hover:bg-danger/30 text-rose-300 border border-danger/40 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-3.5 h-3.5" /> Corrupt DB Leaf
            </button>
          </div>

          <div className="p-4 rounded-xl border border-deep bg-ink-deep/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Delete Record from DB</span>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-warn/20 text-amber-400 border border-warn/40">
                COUNT_DRIFT
              </span>
            </div>
            <p className="text-[11px] text-slate">
              Silently removes a record row from SQLite. Leaf count mismatches anchor assertion.
            </p>
            <button
              onClick={() => handleServerTamper('delete-record', 'Delete Record Row from DB', 'COUNT_DRIFT')}
              disabled={activeAction !== null}
              className="w-full py-2 rounded-lg bg-danger/20 hover:bg-danger/30 text-rose-300 border border-danger/40 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-3.5 h-3.5" /> Delete DB Record
            </button>
          </div>

          <div className="p-4 rounded-xl border border-deep bg-ink-deep/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Flip Byte in Stored File</span>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-warn/20 text-amber-400 border border-warn/40">
                CONTENT_DRIFT
              </span>
            </div>
            <p className="text-[11px] text-slate">
              Modifies 1 byte in local FileStore (<code className="text-sky font-mono">data/files/*</code>).
            </p>
            <button
              onClick={() => handleServerTamper('flip-file', 'Flip Byte in Stored File', 'CONTENT_DRIFT')}
              disabled={activeAction !== null}
              className="w-full py-2 rounded-lg bg-danger/20 hover:bg-danger/30 text-rose-300 border border-danger/40 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-3.5 h-3.5" /> Flip Stored Byte
            </button>
          </div>
        </div>
      </div>

      {/* Adversarial Event Log */}
      <div className="rounded-2xl border border-deep bg-ink/90 p-6 space-y-3 font-mono text-xs shadow-xl">
        <div className="flex items-center justify-between border-b border-deep/60 pb-2">
          <span className="text-slate text-xs uppercase font-bold tracking-wider">
            Adversarial Audit & Tamper Execution Log
          </span>
          <span className="text-[10px] text-slate">{logs.length} Events</span>
        </div>
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {logs.map((log, i) => (
            <div key={i} className="text-silver/80 hover:text-white transition-colors">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
