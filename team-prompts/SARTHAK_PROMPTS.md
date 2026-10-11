# 🎨 Sarthak's Prompts (Web Frontend & UI Integration)

> **Branch:** `Sarthak`  
> **Command to start:** `git checkout -b Sarthak` (or `git checkout Sarthak`)  
> **Ownership:** `apps/web` (React + Vite, Tailwind, routing, state, API client, client hashing, interactive Merkle Tree, wiring Lovable UI)

---

## 📌 PROMPT 1: Web Scaffold, Design Tokens & Router

### 📋 Copy-Paste into Antigravity:
```text
You are working on the 'Sarthak' branch of ProofChain.
Goal: Scaffold apps/web with Vite, React, Tailwind CSS, Lucide icons, and React Router.

1. Setup `apps/web/package.json` with react, react-dom, react-router-dom, lucide-react, @proofchain/core, @proofchain/verifier.
2. Create `apps/web/tailwind.config.ts`:
   - Colors:
     - `ink`: '#00171F'
     - `ink-deep`: '#000B0F'
     - `slate`: '#66747A'
     - `cerulean`: '#007EA7'
     - `sky`: '#00A8E8'
     - `deep`: '#003459'
     - `silver`: '#D4DEE2'
     - `success`: '#1E8F53' (for integrity & registration ONLY)
     - `danger`: '#D93838'
     - `warn`: '#DD8E4B'
     - `info`: '#007EA7' (for attribution - NEVER green!)
   - Fonts: 'Plus Jakarta Sans', monospace: 'JetBrains Mono'.
3. Create `apps/web/vite.config.ts`:
   - Proxy `/api` to `http://localhost:4000`.
   - Setup aliases for @proofchain/*.
4. Create `apps/web/src/App.tsx` routing:
   - `/` (Landing)
   - `/verify` (Public Verifier)
   - `/proofchain` (Dashboard)
   - `/proofchain/register` (Register)
   - `/proofchain/batches` & `/proofchain/batches/:id` (Batches & Merkle Tree)
   - `/proofchain/audit` (Audit)
   - `/proofchain/tamper-lab` (Tamper Lab)
   - `/creator` (Creator Home)
   - `/creator/new` (6-step Wizard)
   - `/creator/works/:id` (Creation Trail)
   - `/creator/certificate/:id` (Certificate)
5. Create `apps/web/src/components/Navbar.tsx` & `HealthStrip.tsx` polling `/api/health`.

Run `npm run dev` to verify the frontend loads at http://localhost:5173.
```

### 💾 Git Commit Command:
```bash
git add apps/web
git commit -m "web: scaffold Vite application with design system, router, and health strip"
```

---

## 📌 PROMPT 2: Client-side Streaming Hasher, Thumbnail & API Client

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Sarthak' branch of ProofChain.
Goal: Implement browser streaming file hashing, canvas thumbnailer, and typed API client in apps/web/src/lib.

Requirements:
1. Create `apps/web/src/lib/fileHash.ts`:
   - Chunked streaming SHA-256 using @noble/hashes/sha256 via FileReader/Streams.
   - Provides onProgress(0 to 100) callback for UI progress bars.
   - Returns lowercase 64-char hex and Uint8Array.
2. Create `apps/web/src/lib/thumbnail.ts`:
   - Browser-side canvas thumbnail generator: scales images down, outputs JPEG (max 200KB), stripping EXIF/GPS data.
3. Create `apps/web/src/lib/similarity.ts`:
   - Computes 64-bit dHash on canvas for image similarity.
4. Create `apps/web/src/lib/api.ts`:
   - Typed fetch client for registry (:4000) with sessionStorage issuer token support.
5. Create `apps/web/src/components/FileDrop.tsx` & `HashProgress.tsx`.

Run `npm test --filter=@proofchain/web` to verify.
```

### 💾 Git Commit Command:
```bash
git add apps/web/src/lib apps/web/src/components/FileDrop.tsx apps/web/src/components/HashProgress.tsx
git commit -m "web: implement streaming client-side file hasher, thumbnailer, and typed API client"
```

---

## 📌 PROMPT 3: Interactive SVG Merkle Tree Diagram & Batch Explorer

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Sarthak' branch of ProofChain.
Goal: Build the interactive SVG Merkle Tree component (no chart libraries!) and Batch Explorer in apps/web.

Requirements:
1. Create `apps/web/src/components/MerkleTree.tsx`:
   - Hand-crafted SVG diagram taking `levels: string[][]`.
   - Leaves at the bottom, Merkle root at top. Monospace 6-hex labels with full hash tooltip on hover.
   - Interactive proof path visualization:
     - Clicking a leaf highlights that leaf and all direct ancestors in cerulean (#007EA7).
     - Sibling hashes in path highlighted with illuminated sky border (#00A8E8).
     - Side drawer displays each fold: `nodeHash(sibling, current) -> parent`.
   - Promoted odd nodes drawn with dashed lines and labelled "promoted".
2. Create `apps/web/src/pages/proofchain/Batches.tsx` & `BatchDetail.tsx`:
   - Shows batch status, MerkleTree diagram, anchor entry details, list of records, and "Seal Batch" button.

Test by navigating to /proofchain/batches in the browser.
```

### 💾 Git Commit Command:
```bash
git add apps/web/src/components/MerkleTree.tsx apps/web/src/pages/proofchain
git commit -m "web: build interactive SVG Merkle tree visualization and batch explorer"
```

---

## 📌 PROMPT 4: Public Verifier Integration & Tamper Lab UI

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Sarthak' branch of ProofChain.
Goal: Connect in-browser verification via packages/verifier on `/verify` and implement Tamper Lab.

Strict Rule:The verifier on `/verify` must run 100% in the browser. NEVER call the registry API!

1. Create `apps/web/src/pages/Verify.tsx`:
   - Two drag-and-drop zones: Document File + `.pcproof.json` bundle.
   - Calls `verifyBundle()` from @proofchain/verifier using:
     - HttpLedgerReader (:4100)
     - EthereumReader (:8545 using pinned config from `apps/web/src/generated/pinnedEthereum.ts`)
     - Offline mode modal where user can paste ledger JSON directly.
   - Displays:
     - `ThreeLineResult.tsx`: Line 1 Integrity, Line 2 Registration, Line 3 Attribution (never green!).
     - `StepList.tsx`: S1-S8 check details with pass/fail badges.
     - AI Explainer card with label: "Explanation (AI-assisted, not part of verification)".
2. Create `apps/web/src/pages/proofchain/TamperLab.tsx`:
   - Interactive buttons calling `/api/demo/tamper/*` (Tamper DB root, Corrupt leaf, Delete record, Restore backup).
   - Buttons to download pre-tampered files to verify live on `/verify`.
3. Create `apps/web/src/pages/proofchain/Audit.tsx`:
   - "Run Registry Audit" button displaying detected drift rows.

Verify by dropping sample document + proof on /verify.
```

### 💾 Git Commit Command:
```bash
git add apps/web/src/pages/Verify.tsx apps/web/src/pages/proofchain/TamperLab.tsx apps/web/src/pages/proofchain/Audit.tsx apps/web/src/components/ThreeLineResult.tsx apps/web/src/components/StepList.tsx
git commit -m "web: integrate standalone in-browser verifier, 3-line results, and tamper lab"
```

---

## 📌 PROMPT 5: Creator 6-Step Wizard, Creation Trail & Certificate

### 📋 Copy-Paste into Antigravity:
```text
You are continuing on the 'Sarthak' branch of ProofChain.
Goal: Build the CreatorProof experience: 6-step creation wizard, version trail timeline, and printable certificate.

Requirements:
1. Create `apps/web/src/pages/creator/NewWork.tsx` (6-step Wizard):
   - Step 1: Stream hash file, query `/api/claims`. If match exists, show ClaimsPanel warning.
   - Step 2: Title, description, category chips (suggested by AI).
   - Step 3: License selection.
   - Step 4: Versioning (New work or version of existing parent).
   - Step 5: Canonical manifest review, "Sign with Key" button (signs locally with creatorKey.ts).
   - Step 6: Submit to `/api/manifests`.
2. Create `apps/web/src/pages/creator/WorkDetail.tsx` & `TrailTimeline.tsx`:
   - Visual timeline linking versions with anchor timestamps and verification badges.
   - Competing Claims Panel showing priority of registration.
3. Create `apps/web/src/pages/creator/Certificate.tsx` & `CertificateView.tsx`:
   - Luxurious dark certificate card (#000B0F background, sky/gold accents).
   - Mandatory disclaimer text:
     "This certificate states that a record matching the file hash below was registered in batch {batchId} and anchored as entry #{seq} at {time}... It does not establish who created the work or that its contents are true."
   - Embedded QR code linking to `{WEB_ORIGIN}/verify?record={recordId}`.
   - Print CSS `@media print` support.

Test the complete creation wizard at /creator/new.
```

### 💾 Git Commit Command:
```bash
git add apps/web/src/pages/creator apps/web/src/components/TrailTimeline.tsx apps/web/src/components/ClaimsPanel.tsx apps/web/src/components/CertificateView.tsx
git commit -m "web: implement CreatorProof 6-step wizard, version trail timeline, and printable certificate"
```
