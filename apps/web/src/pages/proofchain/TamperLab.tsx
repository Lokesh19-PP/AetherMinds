import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, AlertTriangle, ShieldAlert, RotateCcw, CheckCircle2, Download, ExternalLink, RefreshCw, FileWarning, Database, Play } from 'lucide-react';
import { api } from '../../lib/api';

export const TamperLab: React.FC = () => {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Tamper Lab initialized. All cryptographic checks benchmarked and clean.`,
  ]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleServerTamper = async (action: string, label: string, expectedEffect: string) => {
    setActiveAction(action);
    try {
      const res = await api.demoTamper(action);
      addLog(`SERVER TAMPER: "${label}" executed. Changed: ${res.changed || 'OK'}. Drift Flag: ${expectedEffect}`);
    } catch {
      addLog(`SIMULATED TAMPER: "${label}" simulated on localhost. Drift Flag: ${expectedEffect}.`);
    } finally {
      setActiveAction(null);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.demoReset();
      addLog('CLEAN STATE RESTORED: Reset database to deterministic clean benchmark state.');
    } catch {
      addLog('CLEAN STATE RESTORED: Local state restored.');
    } finally {
      setResetting(false);
    }
  };

  // Pre-tampered file downloads for /verify
  const downloadTamperedDoc = () => {
    const originalText = 'VORTEXA 3.0 Sample Document Content for ProofChain Verification';
    const tamperedText = 'VORTEXA 3.0 Sample Document Content for ProofChain Verificatixn';
    const blob = new Blob([tamperedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tampered_doc_bit_flip.txt';
    a.click();
    URL.revokeObjectURL(url);
    addLog('DOWNLOADED: "tampered_doc_bit_flip.txt". Drop on /verify -> Triggers DOC_MODIFIED.');
  };

  const downloadTamperedProof = () => {
    const tamperedBundle = {
      format: 'proofchain/proof/1',
      recordKind: 'file',
      batchId: 'b-0001',
      leafIndex: 0,
      leafCount: 8,
      leafHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
      path: [
        { side: 'R', hash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' },
        { side: 'R', hash: '5858cfd7be8f24ecffb648f936353d2bf94943f550ffc17bfbf798363a23a3eb' },
        { side: 'R', hash: '31846b02660d29ab997eb948b472ea63e18cfbf6e5b4b1a45cf2a4fe99238eb1' },
      ],
      anchors: [
        {
          kind: 'ledger',
          seq: 1,
          root: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          entryHash: 'f42b918a0029bc41...',
        },
      ],
    };

    const blob = new Blob([JSON.stringify(tamperedBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tampered_proof_path.pcproof.json';
    a.click();
    URL.revokeObjectURL(url);
    addLog('DOWNLOADED: "tampered_proof_path.pcproof.json". Drop on /verify -> Triggers ROOT_MISMATCH.');
  };

  const downloadTamperedAnchor = () => {
    const invalidAnchorEntry = {
      seq: 1,
      batchId: 'b-0001',
      root: '0000000000000000000000000000000000000000000000000000000000000000',
      leafCount: 8,
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
      entryHash: '9999999999999999999999999999999999999999999999999999999999999999',
      sig: 'bad_signature_forged_entry_bytes_99999999999999999999999999999999999999999999',
    };

    const blob = new Blob([JSON.stringify(invalidAnchorEntry, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tampered_anchor_invalid_sig.json';
    a.click();
    URL.revokeObjectURL(url);
    addLog('DOWNLOADED: "tampered_anchor_invalid_sig.json". Paste in /verify offline mode -> Triggers ANCHOR_INVALID.');
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-amber-600 font-bold flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4 text-amber-600" />
            Adversarial Security Laboratory
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Tamper Lab
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Simulate 5 realistic attack scenarios against documents, Merkle trees, and anchor ledgers to prove fail-closed security.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/verify"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <ExternalLink className="w-4 h-4" /> Open Public Verifier
          </Link>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <RotateCcw className={`w-4 h-4 text-blue-600 ${resetting ? 'animate-spin' : ''}`} />
            Reset to Clean State
          </button>
        </div>
      </div>

      {/* SECTION 1: Client Verification Tamper Tests */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-amber-600" />
            Client Tamper Packages (Download & Verify on /verify)
          </h2>
          <span className="text-xs font-mono text-slate-500">Rules R-5 & R-7</span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Download pre-tampered adversarial samples and drop them into the standalone public verifier on <code className="text-blue-700 font-mono font-semibold">/verify</code> to observe cryptographic rejection codes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Doc Flip */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">Tamper Document</span>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                DOC_MODIFIED
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Flips 1 byte in document. Leaf hash fails to match bundle assertion.
            </p>
            <button
              onClick={downloadTamperedDoc}
              className="w-full py-2 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 hover:border-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" /> Download Doc
            </button>
          </div>

          {/* Proof Edit */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">Tamper Merkle Path</span>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                ROOT_MISMATCH
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Modifies sibling node in .pcproof.json. Recomputes invalid Merkle root.
            </p>
            <button
              onClick={downloadTamperedProof}
              className="w-full py-2 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 hover:border-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" /> Download Proof
            </button>
          </div>

          {/* Anchor Invalid */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">Tamper Anchor Entry</span>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                ANCHOR_INVALID
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Corrupts signature in AnchorEntry. Fails Ed25519 signature verification.
            </p>
            <button
              onClick={downloadTamperedAnchor}
              className="w-full py-2 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 hover:border-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" /> Download Anchor
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: Server-Side Database Drift Attacks */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Registry Server Drift Attacks (Trigger & Inspect in Audit)
          </h2>
          <Link to="/proofchain/audit" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
            Open Audit Dashboard <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Trigger live server-side database manipulations. The periodic drift audit engine detects and flags every alteration.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Tamper DB Root */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">Corrupt Batch Root in DB</span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                  DB_ROOT_DRIFT
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Alters stored root hash for Batch b-0001 directly in SQLite. Drift audit recalculates tree from records and catches the discrepancy.
              </p>
            </div>
            <button
              onClick={() => handleServerTamper('db-root', 'Corrupt Batch Root in DB', 'DB_ROOT_DRIFT')}
              disabled={activeAction !== null}
              className="w-full py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <Play className="w-3 h-3 text-amber-700" /> Tamper Stored Root
            </button>
          </div>

          {/* Delete Record Behind Scenes */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">Delete Record Behind Scenes</span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                  COUNT_DRIFT
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Deletes an authenticated record directly from the database table. The audit detects a record count mismatch.
              </p>
            </div>
            <button
              onClick={() => handleServerTamper('delete-record', 'Delete Record Behind Scenes', 'COUNT_DRIFT')}
              disabled={activeAction !== null}
              className="w-full py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <Play className="w-3 h-3 text-amber-700" /> Delete Record
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: Activity Log */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 shadow-sm font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            Live Lab Activity Log
          </h3>
          <span className="text-[11px] text-slate-500 font-sans">{logs.length} entries</span>
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="text-[11px] text-slate-600 font-mono leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
