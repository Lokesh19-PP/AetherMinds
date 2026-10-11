# ⚓ Shreyash's Prompts (Anchor, Witness & Registry Backend)

> **Branch:** `Shreyash`  
> **Command to start:** `git checkout -b Shreyash` (or `git checkout Shreyash`)  
> **Ownership:** `apps/anchor`, `apps/witness`, `apps/registry` (core DB, batching, FileStore, audit, ethPublisher), `scripts/setup.ts`, `scripts/resetDemo.ts`

---

## 📌 PROMPT 1: Anchor Signed Hash Chain Service (:4100)

### 📋 Copy-Paste into Antigravity:
```text
You are working on the 'Shreyash' branch of ProofChain.
Goal: Build the isolated Anchor process in apps/anchor running on port 4100.

Requirements:
1. Create `apps/anchor/package.json` with Express and @proofchain/core.
2. Create `apps/anchor/src/keys.ts`:
   - Read or create Ed25519 private key in `anchor-data/anchor.key`.
   - Provide `getAnchorPublicKey(): string` in lowercase hex.
3. Create `apps/anchor/src/ledger.ts`:
   - Append-only JSONL file in `anchor-data/ledger.jsonl`.
   - On boot: read every line, recompute entryHash, verify Ed25519 signature, and check that prevHash matches the previous entry. Refuse to start if corrupted!
   - Genesis prevHash = 64 zeros.
4. Create `apps/anchor/src/routes.ts`:
   - POST /publish: Requires Bearer ANCHOR_PUBLISH_TOKEN. Receives { root, batchId, leafCount }.
     - Idempotent: If batchId exists with identical root and leafCount, return it. If root differs, return 409 Conflict.
     - Appends signed entry, increments seq, returns entry.
   - GET /anchors/:seq: Returns AnchorEntry.
   - GET /head: Returns latest AnchorEntry.
   - GET /ledger: Returns entire array of entries.
   - GET /pubkey: Returns anchor public key hex.
5. Create `apps/anchor/src/server.ts` running on ANCHOR_PORT (default 4100).

Run `npm test --filter=@proofchain/anchor` to verify.
```

### 💾 Git Commit Command:
```bash
git add apps/anchor
git commit -m "anchor: implement append-only signed hash chain ledger on port 4100"
```

---

## 📌 PROMPT 2: Independent Witness Watchdog Service (:4200)

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Shreyash' branch of ProofChain.
Goal: Build the independent Witness service in apps/witness running on port 4200.

Requirements:
1. Create `apps/witness/package.json` with Express and @proofchain/core.
2. Create `apps/witness/src/store.ts`:
   - Reads and appends to `witness-data/entries.jsonl` with { seq, entryHash, observedAt }.
3. Create `apps/witness/src/poller.ts`:
   - Polls `GET ${ANCHOR_URL}/ledger` every 5 seconds.
   - Verifies Ed25519 signature of every entry with pinned public key.
   - Detects FORK: If anchor returns a known seq with a different entryHash, log critical alert.
   - Detects ROLLBACK: If anchor reports fewer entries than witnessed, log alert.
   - Appends verified entries to entries.jsonl.
4. Create `apps/witness/src/routes.ts`:
   - GET /entries/:seq: Return recorded entryHash.
   - GET /heads: Return latest witnessed seq and entryHash.
   - GET /status: Return sync status.
5. Create `apps/witness/src/server.ts` running on WITNESS_PORT (default 4200).

Run `npm test --filter=@proofchain/witness` to verify.
```

### 💾 Git Commit Command:
```bash
git add apps/witness
git commit -m "witness: implement independent poller and fork detection on port 4200"
```

---

## 📌 PROMPT 3: Registry Core, SQLite WAL Database & FileStore

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Shreyash' branch of ProofChain.
Goal: Setup the Registry backend in apps/registry (:4000) with SQLite WAL and FileStore.

Requirements:
1. Create `apps/registry/package.json` with Express, better-sqlite3, cors.
2. Create `apps/registry/src/db/schema.sql`:
   - `batches`: id TEXT PRIMARY KEY, status TEXT ('open'|'sealed'|'anchored'), root TEXT, leaf_count INTEGER, created_at TEXT, sealed_at TEXT, anchored_at TEXT, anchor_seq INTEGER, anchor_entry_json TEXT, ethereum_tx_hash TEXT, ethereum_anchor_id INTEGER.
   - `records`: id TEXT PRIMARY KEY, batch_id TEXT, leaf_index INTEGER, content_hash TEXT NOT NULL, leaf_hash TEXT NOT NULL, kind TEXT, title TEXT, storage_mode TEXT DEFAULT 'none', file_ref TEXT, preview_ref TEXT, preview_sha256 TEXT, visibility TEXT DEFAULT 'private', store_name TEXT, metadata_json TEXT, ai_suggestion_json TEXT, confirmed_by TEXT, created_at TEXT.
   - `audit_log`: id INTEGER PRIMARY KEY AUTOINCREMENT, run_at TEXT, issue_count INTEGER, result_json TEXT.
3. Create `apps/registry/src/db/index.ts` & `migrate.ts` using better-sqlite3 in WAL mode.
4. Create `apps/registry/src/storage/FileStore.ts` & `localDisk.ts`:
   - Enforce Section 19 storage policy: Default is 'none' (hash only).
   - If localDisk is used, store in `data/files/<sha256>`.
   - Recompute SHA-256 on put and get; throw STORAGE_MISMATCH on corruption.
5. Create `apps/registry/src/server.ts` with CORS configured for WEB_ORIGIN and auth middleware for issuer token.

Run `npm test --filter=@proofchain/registry` to verify.
```

### 💾 Git Commit Command:
```bash
git add apps/registry
git commit -m "registry: setup SQLite WAL database, schema migrations, and FileStore engine"
```

---

## 📌 PROMPT 4: Batch Sealing, Proof Service & Ethereum Publisher

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Shreyash' branch of ProofChain.
Goal: Implement record registration, batch sealing, multi-anchor publishing, and proof generation in apps/registry.

Requirements:
1. Create `apps/registry/src/routes/records.ts`:
   - POST /api/records: Adds record to open batch (requires confirmed metadata).
   - GET /api/records/:id: Returns record details.
   - GET /api/records/:id/proof: Returns full .pcproof.json bundle.
   - DELETE /api/records/:id/file: Deletes stored file copy and sets storage_mode = 'none' without altering the proof!
2. Create `apps/registry/src/services/batching.ts` & `routes/batches.ts`:
   - POST /api/batches/seal:
     1. Freeze open batch (status -> 'sealed').
     2. Collect records, compute Merkle root using @proofchain/core.
     3. Publish to Anchor Ledger via `services/anchorClient.ts`.
     4. If ANCHOR_MODE is 'both' or 'ethereum', publish to RootAnchor Solidity contract via `services/ethPublisher.ts`.
     5. Update batch status -> 'anchored', store anchor references, and open a new batch.
3. Create `apps/registry/src/services/proofService.ts`:
   - Constructs ProofBundle with path, leafIndex, leafCount, and anchors[] list.
4. Create `apps/registry/src/services/ethPublisher.ts`:
   - Ethers v6 publisher calling RootAnchor.publish(batchKey, root, leafCount).

Run `npm test --filter=@proofchain/registry` to verify.
```

### 💾 Git Commit Command:
```bash
git add apps/registry
git commit -m "registry: implement batch sealing, proof bundle generation, and dual-anchor publishing"
```

---

## 📌 PROMPT 5: Drift Audit Engine, Tamper Lab API & Automation Scripts

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Shreyash' branch of ProofChain.
Goal: Build the Registry Audit service (detecting all 6 drift types), Demo Tamper Lab endpoints, and setup/reset scripts.

Requirements:
1. Create `apps/registry/src/services/audit.ts` & `routes/audit.ts`:
   - Inspect anchored batches against Anchor Ledger:
     - ROOT_DRIFT: Recomputed Merkle root from DB != anchor root.
     - DB_ROOT_DRIFT: batches.root in DB != anchor root.
     - COUNT_DRIFT: Record count != anchor leafCount.
     - LEAF_DRIFT: Stored manifest re-hashes to different leaf.
     - CONTENT_DRIFT: Stored file copy re-hashes to different hash.
     - ANCHOR_REF_DRIFT: DB anchor JSON != live anchor entry.
   - Expose POST /api/audit/run and GET /api/audit/latest.
2. Create `apps/registry/src/routes/demo.ts` (mounted only when DEMO_MODE=true):
   - POST /api/demo/tamper/db-root (overwrites batch root in DB).
   - POST /api/demo/tamper/leaf-hash.
   - POST /api/demo/tamper/delete-record.
   - POST /api/demo/restore (restores database backup).
3. Create `apps/registry/src/routes/health.ts`:
   - Health status for Registry, Anchor (:4100), Witness (:4200), and Hardhat chain (:8545).
4. Create `scripts/setup.ts`:
   - Generates anchor key, publisher key, tokens, .env, and writes `apps/web/src/generated/anchorPub.ts`.
5. Create `scripts/resetDemo.ts`:
   - Cleanly resets data/, anchor-data/, witness-data/.

Run `npm run setup` to test setup automation.
```

### 💾 Git Commit Command:
```bash
git add apps/registry scripts/setup.ts scripts/resetDemo.ts
git commit -m "registry: complete drift audit engine, demo tamper endpoints, and setup automation"
```
