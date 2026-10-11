# 🛡️ Lokesh's Prompts (Crypto Engine & Verifier)

> **Branch:** `Lokesh`  
> **Command to start:** `git checkout -b Lokesh` (or `git checkout Lokesh`)  
> **Ownership:** `packages/core`, `packages/verifier`, `apps/verifier-cli`, `scripts/checkVerifierPurity.ts`, `scripts/demoTamper.ts`, `apps/web/src/lib/creatorKey.ts`

---

## 📌 PROMPT 1: Types, Errors, Byte Utilities & Test Vectors

### 📋 Copy-Paste into Antigravity:
```text
You are working on the 'Lokesh' branch of ProofChain.
Goal: Build the frozen types, error handling, byte utilities, and test vectors for packages/core.

Strict Rules:
- Pure TypeScript. Only @noble/hashes and @noble/curves dependencies.
- Zero dependencies on apps/ or packages/ai.

1. Create `packages/core/package.json` with name "@proofchain/core", dependencies: "@noble/hashes": "^1.4.0", "@noble/curves": "^1.4.0".
2. Create `packages/core/src/types.ts`:
   - Define: ProofBundle, AnchorEntry, CreatorManifest, StepResult, VerifyResult, PinnedConfig.
   - Enforce exact types from PROOFCHAIN_PROJECT_GUIDE.md section 6 & 9.
3. Create `packages/core/src/errors.ts`:
   - CoreError class with machine-readable codes.
4. Create `packages/core/src/bytes.ts`:
   - hexToBytes, bytesToHex, concatBytes, constantTimeEqual, utf8ToBytes.
5. Create `packages/core/test/vectors.test.ts`:
   - SHA-256 test vectors matching section 6.7 of the guide.
6. Create `packages/core/src/index.ts` exporting all the above.

Run `npm test --filter=@proofchain/core` to verify.
```

### 💾 Git Commit Command:
```bash
git add packages/core
git commit -m "core: define frozen types, error models, and initial crypto vectors"
```

---

## 📌 PROMPT 2: Canonical JSON, SHA-256 & RFC 6962 Merkle Tree

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Lokesh' branch of ProofChain.
Goal: Implement RFC 8785 canonical JSON, domain-separated hashing, and the RFC 6962 Merkle Tree engine in packages/core.

1. Create `packages/core/src/canonical.ts`:
   - RFC 8785 canonical JSON serializer: lexicographical key sorting, Unicode NFC normalization, strict rejection of non-integer floats, NaN, or Infinity.
2. Create `packages/core/src/hash.ts`:
   - Domain-separated hashing via @noble/hashes/sha256:
   - sha256(bytes) & sha256Hex(bytes)
   - leafHash(documentBytes): SHA-256( 0x00 || documentBytes ) returning 64-char lowercase hex.
   - nodeHash(leftHex, rightHex): SHA-256( 0x01 || hexToBytes(leftHex) || hexToBytes(rightHex) ) in lowercase hex.
3. Create `packages/core/src/merkle.ts`:
   - RFC 6962 Merkle tree algorithm:
   - buildTree(leaves: string[]): { root: string, levels: string[][] }
   - expectedPathLength(leafIndex, leafCount): number
   - proofFor(leafIndex, leaves): { side: 'L'|'R', hash: string }[]
   - verifyPath(leaf, path): string (returns recomputed root)
   - Odd leaves must be promoted up without duplicate hashing.
4. Add comprehensive unit tests in `packages/core/test/merkle.test.ts` for leaves count n = 1 to 33, ensuring second-preimage attack resistance.
5. Export everything in `packages/core/src/index.ts`.

Run `npm test --filter=@proofchain/core` to verify all tests pass.
```

### 💾 Git Commit Command:
```bash
git add packages/core
git commit -m "core: implement canonical JSON, domain-separated hashing, and Merkle tree engine"
```

---

## 📌 PROMPT 3: Proof Bundle Packaging, Anchor Signatures & Manifests

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Lokesh' branch of ProofChain.
Goal: Implement proof bundle packaging, Ed25519 anchor entry signing, and Creator Manifest verification in packages/core.

1. Create `packages/core/src/bundle.ts`:
   - makeBundle(input: { leafHash, leafIndex, leafCount, path, batchId, anchors, manifest? }): ProofBundle
   - validateBundleShape(bundle: unknown): { valid: boolean, error?: string }
   - Ensure hand-written validation without zod (format === 'proofchain/1.1', lowercase 64-char hex, valid path length, anchors length 1-2).
2. Create `packages/core/src/anchorEntry.ts`:
   - entryHash(entry): canonical JSON hash of { seq, prevHash, root, batchId, leafCount, anchoredAt }.
   - signEntry(entry, privateKeyHex): Ed25519 signature using @noble/curves/ed25519.
   - verifyEntrySignature(entry, publicKeyHex): boolean.
   - GENESIS_PREV constant: 64 zeros.
3. Create `packages/core/src/manifest.ts`:
   - manifestSigningBytes(manifest)
   - signManifest(manifest, privateKeyHex): CreatorManifest
   - verifyManifest(manifest: CreatorManifest): boolean
4. Update `packages/core/src/index.ts` and add tests in `packages/core/test/bundle.test.ts`.

Run `npm test --filter=@proofchain/core` to verify.
```

### 💾 Git Commit Command:
```bash
git add packages/core
git commit -m "core: add proof bundle validation, anchor entry chaining, and manifest signing"
```

---

## 📌 PROMPT 4: Standalone Verifier Engine & Dual-Anchor Readers

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Lokesh' branch of ProofChain.
Goal: Build packages/verifier containing the standalone verification pipeline (S1-S8), readers, and 3-line summaries.

Strict Rule:packages/verifier must NEVER import apps/registry or SQLite! Only @proofchain/core, @noble/hashes, @noble/curves.

1. Create `packages/verifier/package.json` with name "@proofchain/verifier".
2. Create `packages/verifier/src/codes.ts`:
   - Failure codes: OK, DOC_MODIFIED, PROOF_INVALID, ROOT_MISMATCH, ROOT_NOT_FOUND, ANCHOR_INVALID, ANCHOR_DISAGREEMENT, WITNESS_MISMATCH, SIGNATURE_INVALID, ANCHOR_UNREACHABLE.
3. Create `packages/verifier/src/messages.ts`:
   - Deterministic plain-language messages for each code.
4. Create `packages/verifier/src/threeLine.ts`:
   - Returns { integrity, registration, attribution }. Attribution must NEVER be styled green!
5. Create reader implementations:
   - `src/httpLedgerReader.ts`: fetches /anchors/:seq and /anchors/:seq-1, checks Ed25519 sig with pinned public key.
   - `src/staticLedgerReader.ts`: offline reader taking pasted entries JSON.
   - `src/ethereumReader.ts`: raw fetch JSON-RPC eth_call for RootAnchor.get(id) with multi-RPC agreement.
6. Create `packages/verifier/src/verify.ts`:
   - verifyBundle() running steps S1 to S8.
   - S6B_CROSS_CHECK: flags ANCHOR_DISAGREEMENT if ledger and chain disagree.
7. Add unit tests in `packages/verifier/test/verifier.test.ts` for all failure codes using StaticLedgerReader.

Run `npm test --filter=@proofchain/verifier` to verify.
```

### 💾 Git Commit Command:
```bash
git add packages/verifier
git commit -m "verifier: implement S1-S8 verification pipeline, readers, and dual-anchor cross-check"
```

---

## 📌 PROMPT 5: CLI Verifier, Purity Enforcement & Tamper Demo Scripts

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Lokesh' branch of ProofChain.
Goal: Build the CLI verifier tool, the automated build-time verifier purity checker, and the tamper simulation runner.

1. Create `apps/verifier-cli/src/cli.ts`:
   - Standalone CLI command: `npx proofchain-verify <file> <proof.json> [--anchor URL] [--witness URL] [--rpc URL] [--contract 0x...]`.
   - Formats step checks with [PASS], [FAIL], [WARN] and outputs the 3-line verdict.
   - Exits with code 0 (valid), 1 (invalid), 2 (unreachable/error).
2. Create `scripts/checkVerifierPurity.ts`:
   - Script that scans AST/imports of packages/core and packages/verifier.
   - Fails if any forbidden import (express, sqlite, zod, ai, node:fs, node:path) or words ('ollama', 'openai', 'llm') are found.
3. Create `scripts/demoTamper.ts`:
   - CLI script running tamper scenarios: doc-flip, proof-edit, anchor-edit, anchor-resign, chain-reset.
4. Create `apps/web/src/lib/creatorKey.ts`:
   - Browser utility: generate random Ed25519 key, export/import JSON, save to localStorage ('cp.key').

Run `npx tsx scripts/checkVerifierPurity.ts` to ensure purity passes 100%.
```

### 💾 Git Commit Command:
```bash
git add apps/verifier-cli scripts/checkVerifierPurity.ts scripts/demoTamper.ts apps/web/src/lib/creatorKey.ts
git commit -m "verifier: complete verifier CLI, build purity enforcement, and tamper test suite"
```
