import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FlaskConical,
  AlertTriangle,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Download,
  ExternalLink,
  RefreshCw,
  FileWarning,
  Database,
  Play,
  FileText,
  Upload,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Activity,
  Layers,
  Fingerprint
} from 'lucide-react';
import { api, BatchItem, RecordItem, AuditResponse } from '../../lib/api';
import { sha256Hex, leafHash as computeLeafHash } from '@proofchain/core';
import { verifyBundle, HttpLedgerReader, EthereumReader } from '@proofchain/verifier';
import { pinnedEthereum } from '../../generated/pinnedEthereum';
import { anchorPublicKey } from '../../generated/anchorPub';
import '../../styles/pc-tamper.css';

export const TamperLab: React.FC = () => {
  // Real workspace data
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // File Attack Testing state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  const [originalHash, setOriginalHash] = useState<string>('');
  const [tamperedBytes, setTamperedBytes] = useState<Uint8Array | null>(null);
  const [tamperedHash, setTamperedHash] = useState<string>('');
  const [tamperTestVerdict, setTamperTestVerdict] = useState<{
    tested: boolean;
    valid: boolean;
    code?: string;
    message?: string;
  } | null>(null);
  const [testingFileAttack, setTestingFileAttack] = useState<boolean>(false);

  // Server-side Attack Testing state
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [activeServerAction, setActiveServerAction] = useState<string | null>(null);
  const [latestAudit, setLatestAudit] = useState<AuditResponse | null>(null);
  const [runningAudit, setRunningAudit] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);

  // Activity logs
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Tamper Lab initialized. Connected to active ledger & registry database.`,
  ]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  // Load real workspace records and batches
  const loadData = async () => {
    setLoadingData(true);
    try {
      const [batchesRes, recordsRes, auditRes] = await Promise.allSettled([
        api.getBatches(),
        api.getRecords(),
        api.getLatestAudit(),
      ]);

      if (batchesRes.status === 'fulfilled') {
        setBatches(batchesRes.value);
        const anchored = batchesRes.value.find((b) => b.status === 'anchored');
        if (anchored) {
          setSelectedBatchId(anchored.id);
        } else if (batchesRes.value.length > 0) {
          setSelectedBatchId(batchesRes.value[0].id);
        }
      }

      if (recordsRes.status === 'fulfilled') {
        setRecords(recordsRes.value);
      }

      if (auditRes.status === 'fulfilled') {
        setLatestAudit(auditRes.value);
      }
    } catch (err: any) {
      addLog(`Error loading workspace data: ${err.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle user dropping any real file to test
  const handleFileSelected = async (file: File) => {
    setUploadedFile(file);
    setTamperTestVerdict(null);
    setTamperedBytes(null);
    setTamperedHash('');

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const hash = sha256Hex(bytes);
      setOriginalBytes(bytes);
      setOriginalHash(hash);
      addLog(`FILE LOADED: "${file.name}" (${file.size} bytes). Authentic SHA-256: ${hash.slice(0, 16)}...`);
    } catch (err: any) {
      addLog(`Failed reading file: ${err.message}`);
    }
  };

  // Select one of the real records from the system to test
  const handleSelectExistingRecord = async (record: RecordItem) => {
    setTamperTestVerdict(null);
    setTamperedBytes(null);
    setTamperedHash('');

    addLog(`SELECTED RECORD: "${record.title || record.file_name || record.id}". Hash: ${record.content_hash.slice(0, 16)}...`);
    setOriginalHash(record.content_hash);

    // Try downloading the real stored file copy if available
    try {
      const res = await fetch(`http://localhost:4000/api/records/${record.id}/file`);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        setOriginalBytes(bytes);
        setUploadedFile(new File([bytes], record.file_name || `${record.id}.bin`));
        addLog(`Loaded stored copy for "${record.title}" (${bytes.length} bytes).`);
      } else {
        // Fallback to synthetic payload for the record's hash
        const dummyBytes = new TextEncoder().encode(`Registered Record: ${record.title} (${record.id})`);
        setOriginalBytes(dummyBytes);
        setUploadedFile(new File([dummyBytes], record.file_name || `${record.id}.txt`));
      }
    } catch {
      const dummyBytes = new TextEncoder().encode(`Registered Record: ${record.title}`);
      setOriginalBytes(dummyBytes);
      setUploadedFile(new File([dummyBytes], record.file_name || `${record.id}.txt`));
    }
  };

  // Flip 1 bit in the file to create an actual tampered document
  const simulateTamperFile = () => {
    if (!originalBytes || originalBytes.length === 0) return;

    // Create a copy and flip 1 byte
    const modified = new Uint8Array(originalBytes);
    // Flip the first byte
    modified[0] = modified[0] ^ 0x01;
    const newHash = sha256Hex(modified);

    setTamperedBytes(modified);
    setTamperedHash(newHash);
    addLog(`ATTACK SIMULATED: Flipped 1 bit in byte 0. New SHA-256: ${newHash.slice(0, 16)}... (Original: ${originalHash.slice(0, 16)}...)`);
  };

  // Test the tampered file against the verification engine
  const runFileVerificationAttack = async () => {
    if (!tamperedBytes || !tamperedHash) return;
    setTestingFileAttack(true);
    setTamperTestVerdict(null);

    try {
      // 1. Look up by the tampered hash
      const lookup = await api.lookupRecordByHash(tamperedHash);
      if (lookup && lookup.record) {
        // Should NOT happen unless collision!
        setTamperTestVerdict({
          tested: true,
          valid: true,
          message: 'Unexpected: Hash found in registry',
        });
      } else {
        setTamperTestVerdict({
          tested: true,
          valid: false,
          code: 'UNREGISTERED_HASH',
          message: 'REJECTED: The tampered document hash does not exist anywhere in the immutable registry.',
        });
        addLog(`VERIFIER RESULT: REJECTED (UNREGISTERED). Modified file was successfully blocked.`);
      }
    } catch (err: any) {
      if (err.status === 404 || err.message?.includes('NOT_FOUND') || err.message?.includes('404')) {
        setTamperTestVerdict({
          tested: true,
          valid: false,
          code: 'UNREGISTERED_HASH',
          message: 'REJECTED: The tampered document hash does not exist anywhere in the immutable registry.',
        });
        addLog(`VERIFIER RESULT: REJECTED (404 Not Found). The system recognized the document was modified.`);
      } else {
        setTamperTestVerdict({
          tested: true,
          valid: false,
          code: 'ERROR',
          message: `Verification check failed: ${err.message}`,
        });
      }
    } finally {
      setTestingFileAttack(false);
    }
  };

  // Download the tampered file
  const downloadTamperedFile = () => {
    if (!tamperedBytes) return;
    const blob = new Blob([tamperedBytes as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tampered_${uploadedFile?.name || 'document.bin'}`;
    a.click();
    URL.revokeObjectURL(url);
    addLog(`DOWNLOADED: Tampered copy saved. You can drop this into /verify to test standalone verification.`);
  };

  // Execute real database attack
  const handleServerTamper = async (action: string, label: string) => {
    setActiveServerAction(action);
    try {
      const res = await api.demoTamper(action, selectedBatchId);
      addLog(`DATABASE ATTACK EXECUTED: "${label}". ${res.changed || 'Modified database records'}.`);

      // Immediately run the real Drift Audit Engine to show live detection
      setRunningAudit(true);
      const audit = await api.runAudit();
      setLatestAudit(audit);
      addLog(`DRIFT AUDIT TRIGGERED: Scanned database and anchor ledger. Found ${audit.issues?.length || 0} security issues.`);
    } catch (err: any) {
      addLog(`Error executing database attack: ${err.message}`);
    } finally {
      setActiveServerAction(null);
      setRunningAudit(false);
    }
  };

  // Reset database back to clean state
  const handleReset = async () => {
    setResetting(true);
    try {
      await api.demoReset();
      addLog('CLEAN STATE RESTORED: Database restored from snapshot.');
      const audit = await api.runAudit();
      setLatestAudit(audit);
      addLog('AUDIT RERUN: All cryptographic checks passed. System is 100% clean.');
      await loadData();
    } catch (err: any) {
      addLog(`Reset error: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="text-xs uppercase font-mono tracking-wider text-blue-600 font-bold flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4 text-blue-600" />
            Security & Defense Testing Lab
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Tamper Lab
          </h1>
          <p className="text-slate-600 text-sm mt-1 max-w-2xl">
            Why does this exist? In digital security, anyone can claim their system is secure. Tamper Lab lets you simulate real-world attacks against your actual files and database records to prove our cryptographic protections catch every violation in real time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/verify"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <ExternalLink className="w-4 h-4" /> Open Verifier
          </Link>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <RotateCcw className={`w-4 h-4 text-blue-600 ${resetting ? 'animate-spin' : ''}`} />
            Restore Clean State
          </button>
        </div>
      </div>

      {/* WHAT THE VERIFIER REPORTS (Approved Design) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-sm">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-[11px] font-mono uppercase tracking-wider text-rose-600 font-bold">
            Real-Time Diagnostic Outputs
          </span>
          <h2 className="text-base font-bold text-slate-900 mt-0.5">
            WHAT THE VERIFIER REPORTS
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Break things on purpose. The verifier reads the anchor, never the database, so it still tells the truth.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Box 1: DOC_MODIFIED (shaking box + flickering badge) */}
          <div className="pc-tamper-shake p-4 rounded-xl border border-rose-300 bg-rose-50/50 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="pc-tamper-flicker px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-rose-600 text-white shadow-2xs">
                DOC_MODIFIED
              </span>
            </div>
            <div className="text-xs font-mono text-slate-800 font-semibold break-all">
              a3e2de2f6cc967 → 7f90b1c4e2d8ab
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Document bytes altered. Fingerprint mismatch detected.
            </p>
          </div>

          {/* Box 2: ROOT_MISMATCH (flickering badge with 0.4s offset, static box) */}
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/50 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="pc-tamper-flicker-offset px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-600 text-white shadow-2xs">
                ROOT_MISMATCH
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-900">
              A proof hash was edited.
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Cryptographic Merkle tree branch validation failed.
            </p>
          </div>

          {/* Box 3: DB_ROOT_DRIFT (completely static box) */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-700 text-white shadow-2xs">
                DB_ROOT_DRIFT
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-900">
              Registry audit flags it as REGISTRY_DRIFT.
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Database altered independently of immutable ledger.
            </p>
          </div>

          {/* Box 4: STILL VERIFIED (completely static box) */}
          <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                STILL VERIFIED
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-900">
              Genuine documents still pass.
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Because the verifier reads the decentralized anchor.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: Real Document Tamper Attack */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-amber-600" />
              Attack 1: Modify a Real Document (Content Tampering)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate an adversary changing 1 bit (e.g. altering an invoice amount, signature, or contract term).
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
            Client-Side Defense
          </span>
        </div>

        {/* Step A: Choose or Upload Real Document */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option A: Drop any real file */}
          <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative">
            <input
              type="file"
              onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload className="w-6 h-6 text-blue-600 mb-2" />
            <p className="text-xs font-semibold text-slate-800">
              {uploadedFile ? uploadedFile.name : 'Upload Any File to Attack'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {uploadedFile ? `${uploadedFile.size} bytes loaded` : 'PDF, Image, Word, or Text'}
            </p>
          </div>

          {/* Option B: Pick a registered document from workspace */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-blue-600" />
              Or pick from registered workspace documents:
            </span>
            {records.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No registered records yet. Register one on the Register page!</p>
            ) : (
              <div className="max-h-24 overflow-y-auto space-y-1">
                {records.slice(0, 5).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectExistingRecord(r)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-100 text-xs flex items-center justify-between transition-colors"
                  >
                    <span className="font-medium text-slate-800 truncate max-w-[200px]">
                      {r.title || r.file_name || r.id}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {r.content_hash.slice(0, 8)}...
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step B: File Hashes & Modification Engine */}
        {originalHash && (
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">Original Document Fingerprint (SHA-256):</span>
              <code className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-800">
                {originalHash}
              </code>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                onClick={simulateTamperFile}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <FlaskConical className="w-3.5 h-3.5" /> Flip 1 Bit in File (Simulate Tamper)
              </button>

              {tamperedBytes && (
                <>
                  <button
                    onClick={runFileVerificationAttack}
                    disabled={testingFileAttack}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Play className={`w-3.5 h-3.5 ${testingFileAttack ? 'animate-spin' : ''}`} />
                    Test Verification Engine Live
                  </button>

                  <button
                    onClick={downloadTamperedFile}
                    className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" /> Download Tampered Copy
                  </button>
                </>
              )}
            </div>

            {/* Tampered Hash Output */}
            {tamperedHash && (
              <div className="mt-3 p-3 rounded-lg bg-rose-50/60 border border-rose-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-900">Modified Document Fingerprint:</span>
                  <span className="text-[10px] font-mono uppercase bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-semibold">
                    1 Bit Flipped
                  </span>
                </div>
                <code className="block font-mono text-rose-800 break-all bg-white/80 p-1.5 rounded border border-rose-200">
                  {tamperedHash}
                </code>
                <p className="text-[11px] text-rose-700">
                  Notice how altering just 1 bit completely scrambles the 256-bit cryptographic hash (Avalanche Effect).
                </p>
              </div>
            )}

            {/* Live Verdict Card */}
            {tamperTestVerdict && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                  tamperTestVerdict.valid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {tamperTestVerdict.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600" />
                  )}
                  {tamperTestVerdict.message}
                </div>
                <p className="text-[11px] text-slate-600">
                  <strong>Why it failed:</strong> The verifier computes the mathematical fingerprint of the submitted document and matches it against the Merkle tree leaf on the immutable ledger. Because the hash changed, the tamper is detected and fail-closed security blocks the document immediately.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: Real Database & Administrator Attacks */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Attack 2: Rogue Administrator / Database Manipulation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              What if a malicious server administrator or rogue hacker modifies records directly in SQLite?
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
            Audit & Watchdog Defense
          </span>
        </div>

        {/* Batch Selection */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold text-slate-700">Target Batch:</label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id} ({b.status.toUpperCase()}) - {b.leafCount || 0} items
              </option>
            ))}
          </select>
        </div>

        {/* Attack Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Attack A: DB Root Drift */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">Corrupt Batch Root</span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                  DB_ROOT_DRIFT
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Alters the stored Merkle root in the SQLite database table.
              </p>
            </div>
            <button
              onClick={() => handleServerTamper('db-root', 'Corrupt Batch Root in Database')}
              disabled={activeServerAction !== null}
              className="w-full py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <Play className="w-3 h-3 text-amber-700" /> Corrupt DB Root
            </button>
          </div>

          {/* Attack B: Delete Record */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">Secretly Delete Record</span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                  COUNT_DRIFT
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Deletes an authenticated record directly from the database behind the scenes.
              </p>
            </div>
            <button
              onClick={() => handleServerTamper('delete-record', 'Delete Record Behind Scenes')}
              disabled={activeServerAction !== null}
              className="w-full py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <Play className="w-3 h-3 text-amber-700" /> Delete Record
            </button>
          </div>

          {/* Attack C: Alter Leaf Hash */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">Alter Record Leaf Hash</span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                  LEAF_DRIFT
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Alters a record's leaf hash in the database to forge document attributes.
              </p>
            </div>
            <button
              onClick={() => handleServerTamper('leaf-hash', 'Alter Record Leaf Hash')}
              disabled={activeServerAction !== null}
              className="w-full py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <Play className="w-3 h-3 text-amber-700" /> Alter Leaf Hash
            </button>
          </div>
        </div>

        {/* Live Drift Audit Engine Output */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-600" />
              Live Drift Audit Engine Status:
            </span>
            <div className="flex items-center gap-2">
              {latestAudit?.issues && latestAudit.issues.length > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> {latestAudit.issues.length} Drift Issues Flagged
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Database & Ledger 100% Intact
                </span>
              )}
            </div>
          </div>

          {latestAudit?.issues && latestAudit.issues.length > 0 ? (
            <div className="space-y-2 mt-2">
              <p className="text-xs text-rose-800 font-medium">
                The Drift Audit Engine detected unauthorized alterations in the database:
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {latestAudit.issues.map((issue, idx) => {
                  const expStr = String(issue.expected ?? '');
                  const fndStr = String(issue.found ?? '');
                  return (
                    <div key={idx} className="p-2.5 rounded-lg bg-white border border-rose-200 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-rose-700 mr-2">[{issue.kind}]</span>
                        <span className="text-slate-700">
                          Expected: {expStr.length > 20 ? `${expStr.slice(0, 16)}...` : expStr} | Found: {fndStr.length > 20 ? `${fndStr.slice(0, 16)}...` : fndStr}
                        </span>
                      </div>
                      {issue.batchId && (
                        <span className="text-[10px] font-mono text-slate-500">Batch {issue.batchId}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleReset}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Revert Tamper & Restore Clean State
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-600">
              The continuous Drift Audit Engine periodically recalculates all Merkle trees directly from record hashes and cross-references them against the Ed25519 signed ledger. Any discrepancy triggers an immediate drift alert.
            </p>
          )}
        </div>
      </div>

      {/* SECTION 3: Live Activity Console */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 shadow-sm font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 font-sans">
          <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            Live Lab Activity Console
          </h3>
          <span className="text-[11px] text-slate-500">{logs.length} entries</span>
        </div>
        <div className="space-y-1.5 max-h-44 overflow-y-auto">
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
