# 🤖 Yash's Prompts (AI Services, Smart Contracts & Side-2 Backend)

> **Branch:** `Yash`  
> **Command to start:** `git checkout -b Yash` (or `git checkout Yash`)  
> **Ownership:** `packages/ai`, `contracts/` (Solidity `RootAnchor.sol`, Hardhat), `apps/registry/src/routes/{ai,manifests,works,claims}.ts`, `scripts/seed.ts`, `samples/`

---

## 📌 PROMPT 1: Deterministic AI Engine (Rules, Naive Bayes & SimHash)

### 📋 Copy-Paste into Antigravity:
```text
You are working on the 'Yash' branch of ProofChain.
Goal: Implement the deterministic Tier 1 AI module in packages/ai.

Strict Rules:
- All operations must work 100% offline without external AI services (AI_MODE=rules).
- Zero imports in packages/core or packages/verifier.

1. Create `packages/ai/package.json` with pdf-parse and @proofchain/core.
2. Create `packages/ai/src/extract/textFromFile.ts`:
   - Extracts plain text from PDF bytes (pdf-parse) or UTF-8 text files.
3. Create `packages/ai/src/extract/rules.ts`:
   - Extracts: issuer, documentDate, documentType, title, parties, referenceNo with confidence score and source snippet.
   - Any extracted field without a source snippet in the document is discarded!
4. Create `packages/ai/src/categorize/trainingSet.json` & `naiveBayes.ts`:
   - 60 fictional labelled items across Legal, Academic, Creative, Financial, Identity.
   - Pure in-memory Multinomial Naive Bayes classifier returning top 3 labels with probabilities.
5. Create `packages/ai/src/similarity/simhash.ts` & `dhash.ts`:
   - 64-bit text SimHash over 3-word shingles with Hamming distance.
   - Image dHash distance calculator.
6. Create `packages/ai/src/index.ts` and unit tests in `packages/ai/test/ai.test.ts`.

Run `npm test --filter=@proofchain/ai` to verify.
```

### 💾 Git Commit Command:
```bash
git add packages/ai
git commit -m "ai: implement rules extractor, Naive Bayes classifier, and SimHash algorithms"
```

---

## 📌 PROMPT 2: Solidity RootAnchor Contract & Hardhat Toolchain

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Yash' branch of ProofChain.
Goal: Build the Solidity RootAnchor smart contract and Hardhat toolchain in contracts/.

Requirements:
1. Setup `contracts/package.json` with hardhat, @nomicfoundation/hardhat-toolbox, ethers v6.
2. Create `contracts/contracts/RootAnchor.sol`:
   - Struct: Anchor { bytes32 batchKey; bytes32 root; uint32 leafCount; uint64 timestamp; }
   - Append-only storage: Anchor[] public anchors; mapping(bytes32 => uint256) public batchToAnchorId;
   - Function `publish(bytes32 batchKey, bytes32 root, uint32 leafCount) external returns (uint256)`:
     Only callable by deployer/publisher. Reverts if batchKey was already published. Emits Anchored.
   - Function `get(uint256 id) external view returns (bytes32, bytes32, uint32, uint64)`
   - Function `count() external view returns (uint256)`
   - Function `findByBatchKey(bytes32 batchKey) external view returns (uint256, bytes32, uint32, uint64)`
   - Strictly NO delete, NO update, NO owner backdoor.
3. Create `contracts/test/RootAnchor.test.ts`:
   - Test publishing roots, retrieval, duplicate batchKey rejection.
4. Create `contracts/scripts/deploy.ts`:
   - Deploys RootAnchor to Hardhat node (:8545).
   - Writes `{ chainId, contract, rpcUrls, blockTag: 'latest' }` to `apps/web/src/generated/pinnedEthereum.ts`.
5. Create `contracts/scripts/chain-reset.ts` for demo tamper simulations.

Run `cd contracts && npx hardhat test` to verify.
```

### 💾 Git Commit Command:
```bash
git add contracts
git commit -m "contracts: implement append-only RootAnchor.sol, Hardhat deployment, and tests"
```

---

## 📌 PROMPT 3: Side-2 CreatorProof Routes (Manifests, Works & Claims)

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Yash' branch of ProofChain.
Goal: Implement CreatorProof backend routes in apps/registry/src/routes/.

Requirements:
1. Create `apps/registry/src/routes/manifests.ts`:
   - POST /api/manifests:
     - Does NOT require issuer token because it is authenticated by the creator's Ed25519 signature!
     - Verifies manifest signature using @proofchain/core (`verifyManifest`).
     - Inserts record with kind = 'manifest', leaf_hash = hash(canonicalJson(manifest)).
     - Returns record ID and pending status.
2. Create `apps/registry/src/routes/works.ts`:
   - GET /api/works/:workId:
     - Returns creation trail: all versions linked via parentLeaf, sorted chronologically with version numbers, timestamps, and anchor status.
3. Create `apps/registry/src/routes/claims.ts`:
   - GET /api/claims?contentHash=...:
     - Returns registered records matching content hash or high SimHash similarity, proving priority of registration.
4. Add unit tests in `apps/registry/test/side2.test.ts`.

Run `npm test --filter=@proofchain/registry` to verify.
```

### 💾 Git Commit Command:
```bash
git add apps/registry/src/routes/manifests.ts apps/registry/src/routes/works.ts apps/registry/src/routes/claims.ts
git commit -m "registry: implement CreatorProof manifest verification, creation trail, and claims routes"
```

---

## 📌 PROMPT 4: AI Failure Explainer with Anti-Hallucination Guard

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Yash' branch of ProofChain.
Goal: Build the AI failure explainer with strict guard and Ollama fallback in packages/ai and apps/registry.

Requirements:
1. Create `packages/ai/src/explain/guard.ts`:
   - Strict Anti-Hallucination Guard:
     - Discards LLM text containing forbidden words: 'authentic', 'genuine', 'proves', 'forged', 'fraud', 'tampered by', 'hacked'.
     - Discards text > 600 characters.
     - Discards text that states or contradicts the actual VerifyResult.verdict.
     - On discard, falls back to deterministic template from messages.ts.
2. Create `packages/ai/src/explain/explain.ts` & `src/ollama.ts`:
   - explainResult(verifyResult): Returns { explanation, aiPath }.
   - Ollama wrapper with 8-second timeout. Gracefully falls back to rules if Ollama is unreachable.
3. Create `apps/registry/src/routes/ai.ts`:
   - POST /api/extract: Runs rules extractor + Naive Bayes, returns suggestions with confidence.
   - POST /api/explain: Accepts VerifyResult, passes through guard, returns explanation.
4. Add tests in `packages/ai/test/guard.test.ts`.

Run `npm test --filter=@proofchain/ai` to verify.
```

### 💾 Git Commit Command:
```bash
git add packages/ai apps/registry/src/routes/ai.ts
git commit -m "ai: implement anti-hallucination explainer guard and registry AI endpoints"
```

---

## 📌 PROMPT 5: Deterministic Fictional Seed Data Generator

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Yash' branch of ProofChain.
Goal: Implement scripts/seed.ts using pdf-lib with deterministic timestamps for identical byte hashes across all laptops.

Requirements:
1. Batch b-0001 (Side 1 - 5 PDF Certificates):
   - Use `pdf-lib` to generate 5 fictional graduation certificates (e.g., "Aarambh Institute of Fictional Studies").
   - Explicitly set creationDate and modificationDate (`setCreationDate(new Date('2026-01-01T00:00:00Z'))`) so SHA-256 byte hashes are 100% identical on every machine!
   - Register all 5 certificates, extract AI metadata, confirm, and seal into Batch b-0001.
2. Batch b-0002 (Side 2 - CreatorProof Works):
   - Creator A: 3-version work (draft -> revision -> final).
   - Creator B: Duplicate registration attempt of Creator A's final artwork (competing claims demo).
   - Seal into Batch b-0002.
3. Generate pre-tampered copies in `samples/tamper/`:
   - Tampered certificate.pdf (flipped byte) -> triggers DOC_MODIFIED.
   - Tampered proof bundle -> triggers ROOT_MISMATCH.
4. Create `packages/ai/test/eval.test.ts` computing Naive Bayes 80/20 train/test accuracy.

Run `npm run seed` to verify deterministic generation.
```

### 💾 Git Commit Command:
```bash
git add scripts/seed.ts samples/ packages/ai/test/eval.test.ts
git commit -m "seed: generate deterministic fictional datasets and AI evaluation metrics"
```
