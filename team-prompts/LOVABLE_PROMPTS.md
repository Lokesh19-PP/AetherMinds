# 🎨 Complete Single Lovable Prompt & UI Placement Guide

This document gives you:
1. **The Exact Folder Locations** where every Lovable file must be placed in the project.
2. **One Single Complete Master Prompt** to copy and paste directly into Lovable in a single shot.
3. **The Git Commit Command** after placing the files.

---

## 📂 EXACT FOLDER LOCATIONS: WHERE TO PLACE LOVABLE FILES

When you download or export files from Lovable, place them directly into `apps/web/src/` as shown below:

```
c:\Users\lokes\OneDrive\Desktop\GIT-REPO\AetherMinds\AetherMinds\apps\web\src\
│
├── components/                      <--- ALL REUSABLE UI COMPONENTS GO HERE
│   ├── Navbar.tsx                   (Top navigation with brand toggle)
│   ├── HealthStrip.tsx              (Status pill: :4000, :4100, :4200, :8545)
│   ├── FileDrop.tsx                 (Drag & drop file upload zone with hash progress)
│   ├── HashProgress.tsx             (Progress bar for chunked file hashing)
│   ├── ThreeLineResult.tsx          (3-line integrity, registration, attribution card)
│   ├── StepList.tsx                 (S1-S8 cryptographic step accordion)
│   ├── MerkleTree.tsx               (Interactive SVG Merkle Tree diagram)
│   ├── TrailTimeline.tsx            (Creation trail version history timeline)
│   ├── ClaimsPanel.tsx              (Duplicate content warning banner)
│   └── CertificateView.tsx          (Printable dark luxury certificate card)
│
└── pages/                           <--- ALL MAIN PAGE SCREENS GO HERE
    ├── Landing.tsx                  (Path: / -> Dual hero landing page)
    ├── Verify.tsx                   (Path: /verify -> Public standalone verifier)
    │
    ├── proofchain/                  <--- SIDE 1 ISSUER PAGES GO HERE
    │   ├── Dashboard.tsx            (Path: /proofchain -> Issuer overview)
    │   ├── Register.tsx             (Path: /proofchain/register -> Multi-file AI confirm)
    │   ├── Batches.tsx              (Path: /proofchain/batches -> List of batches)
    │   ├── BatchDetail.tsx          (Path: /proofchain/batches/:id -> Merkle tree & records)
    │   ├── Audit.tsx                (Path: /proofchain/audit -> Registry drift audit)
    │   └── TamperLab.tsx            (Path: /proofchain/tamper-lab -> Demo tamper buttons)
    │
    └── creator/                     <--- SIDE 2 CREATORPROOF PAGES GO HERE
        ├── Home.tsx                 (Path: /creator -> Key manager & works)
        ├── NewWork.tsx              (Path: /creator/new -> 6-step signing wizard)
        ├── WorkDetail.tsx           (Path: /creator/works/:id -> Version trail)
        └── Certificate.tsx          (Path: /creator/certificate/:id -> Certificate + QR)
```

---

## 🚀 THE COMPLETE SINGLE MASTER PROMPT FOR LOVABLE

Copy and paste everything inside this code block directly into Lovable in **one single prompt**:

```text
Build a complete, production-grade, state-of-the-art web application called "ProofChain + CreatorProof" using React, Tailwind CSS, Lucide icons, and React Router.

### 1. BRAND IDENTITY & DESIGN SYSTEM
- Theme: Cryptographic security, high-trust fintech, dark luxury & glassmorphism.
- Color Tokens:
  - Background: #000B0F (ink-deep)
  - Card Surfaces: #00171F (ink) with glassmorphism border #003459 (deep)
  - Primary Accent: #007EA7 (cerulean)
  - Glow / Secondary Accent: #00A8E8 (sky)
  - Neutral Borders: #D4DEE2 (silver)
  - Secondary Text: #66747A (slate)
  - Success (Integrity / Registration only): #1E8F53 (emerald)
  - Danger (Failures / Tamper): #D93838
  - Warning / Advisories: #DD8E4B
  - Attribution Accent: #007EA7 (info - CRITICAL RULE: Attribution must NEVER be styled green!)
- Fonts: 'Plus Jakarta Sans' for UI, 'JetBrains Mono' for hashes, addresses, and keys.
- Copywriting Rules:
  - NEVER use the words 'authentic', 'genuine', 'original', or 'proof of ownership'.
  - ALWAYS use 'matches the registered record', 'evidence', 'priority of registration'.

### 2. NAVIGATION & LIVE STATUS (Navbar.tsx & HealthStrip.tsx)
- Top Sticky Navbar:
  - Left: Logo "ProofChain" with toggle switcher to "CreatorProof".
  - Center Links: Public Verifier, Registry Batches, Creator Studio, Tamper Lab, Audit.
  - Right: Live Health Pill showing 4 status lights (:4000 Registry, :4100 Anchor Ledger, :4200 Witness, :8545 Ethereum EVM).
  - Rightmost: "Issuer Access" button opening a token input modal.

### 3. LANDING PAGE (`/` - Landing.tsx)
- Hero section with gradient glow and headline: "Verify Any Record Without Trusting The Registry."
- Subtitle: "A cryptographic proof engine backed by Ed25519 signed append-only ledgers and local Ethereum smart contracts. Zero AI in the trust path."
- Two big interactive entry cards:
  1. "ProofChain for Issuers": Document registration, RFC 6962 Merkle batching, tamper audits.
  2. "CreatorProof for Creators": Client-side Ed25519 signatures, version trails, competing claims.
- Architectural trust badges: "Standalone In-Browser Verifier", "Dual Root Anchoring", "Deterministic AI with Human Confirm".

### 4. PUBLIC STANDALONE VERIFIER (`/verify` - Verify.tsx)
- Dual drag-and-drop zone: Left "Drop Document File" + Right "Drop Proof (.pcproof.json)".
- Cerulean "Verify Record" button + "Offline Mode" link (modal to paste ledger entry JSON).
- Three-Line Result Card (ThreeLineResult.tsx):
  - Line 1 (Integrity): Bold green (#1E8F53) checkmark "Matches the registered record" or red (#D93838) failure code (e.g. DOC_MODIFIED, ROOT_MISMATCH).
  - Line 2 (Registration): Sub-lines for both anchors:
    - "Ledger: batch b-0007 · entry #7 · 2026-10-11 09:00 UTC (anchor-asserted time)"
    - "Ethereum (local Hardhat 31337): anchor #7 · block time 2026-10-11 09:00 UTC (chain-asserted)"
  - Line 3 (Attribution): Styled in neutral blue/slate (#007EA7, NEVER GREEN):
    - "Signed by key 03a1...31b8 (signature valid). The key holder's identity is not verified."
- Cryptographic Steps Accordion (StepList.tsx): S1_PARSE, S2_LEAF, S3_ROOT, S4_ANCHOR_FETCH, S5_ANCHOR_AUTH, S6_ROOT_COMPARE, S6B_CROSS_CHECK, S7_WITNESS, S8_SIGNATURE.
- AI Explainer Card: Plain English explanation with prominent disclaimer chip: "Explanation (AI-assisted, not part of verification)".

### 5. SIDE 1: ISSUER REGISTRATION & INTERACTIVE MERKLE TREE
- `/proofchain/register` (Register.tsx):
  - Multi-file drop zone.
  - Per-file AI extraction preview card: Issuer, Document Date, Type, Title, Reference No with confidence chips and source snippet quotes.
  - Mandatory checkbox: "I have reviewed and confirmed these values" (Submit disabled until ticked).
  - Near-duplicate advisory banner if Hamming distance is small.
- `/proofchain/batches/:id` (BatchDetail.tsx & MerkleTree.tsx):
  - Batch header with ID, status ('open' | 'sealed' | 'anchored'), root hash, and "Seal Batch" button.
  - Hand-crafted interactive SVG Merkle Tree (NO chart libraries):
    - Leaves at bottom, Merkle root at top, monospace 6-hex labels with full hash tooltip on hover.
    - Clicking any leaf highlights its proof path in cerulean (#007EA7) and sibling path hashes outlined in sky (#00A8E8).
    - Side drawer showing step-by-step fold calculation: `nodeHash(sibling, current) -> parent`.
    - Promoted odd nodes drawn with dashed links and labelled "promoted".
  - Records table with "Download Proof (.pcproof.json)" and "Verify" links.

### 6. TAMPER LAB & REGISTRY DRIFT AUDIT
- `/proofchain/tamper-lab` (TamperLab.tsx):
  - Banner: "DEMO & HACKATHON EVALUATION MODE ONLY".
  - Action cards:
    - "Tamper DB Root": Overwrites root in database -> Demonstrates that the verifier still passes genuine documents because truth lives in the anchor!
    - "Corrupt DB Leaf" -> Triggers ROOT_DRIFT in audit.
    - "Delete DB Record" -> Triggers COUNT_DRIFT.
    - "Download Pre-Tampered Documents" (tampered PDF and tampered proof buttons).
    - Green "Restore Clean Database Backup" button.
- `/proofchain/audit` (Audit.tsx):
  - "Run Registry Audit" button.
  - Real-time audit table showing ROOT_DRIFT, DB_ROOT_DRIFT, COUNT_DRIFT with expected vs found hashes in red monospace.

### 7. SIDE 2: CREATORPROOF STUDIO & PRINTABLE CERTIFICATE
- `/creator` (Home.tsx): Local Ed25519 key manager (Generate key, Export JSON, Import JSON, display public key fingerprint).
- `/creator/new` (NewWork.tsx - 6-step Wizard):
  - Step 1: File drop with progress bar and duplicate content check (shows ClaimsPanel if file was registered before).
  - Step 2: Title, description, AI suggested category chips.
  - Step 3: License selector (CC-BY-4.0, MIT, CC0, Commercial, Custom).
  - Step 4: Versioning toggle ("New Work" vs "New Version of Existing Work").
  - Step 5: Canonical manifest review with "Sign with My Key" button.
  - Step 6: Submit to registry and "Seal Now" demo button.
- `/creator/works/:id` (WorkDetail.tsx & TrailTimeline.tsx):
  - Visual timeline linking draft -> revision -> final release with anchor timestamps and verification badges.
  - Competing Claims Panel showing who registered first.
- `/creator/certificate/:id` (Certificate.tsx & CertificateView.tsx):
  - Luxurious dark certificate card (#000B0F background, sky/gold border).
  - Work Title, Content Hash, Batch ID, Anchor Entry #, Ethereum Anchor ID, Timestamp.
  - QR Code pointing to `/verify?record={recordId}`.
  - EXACT MANDATORY LEGAL DISCLAIMER:
    "This certificate states that a record matching the file hash below was registered in batch {batchId} and anchored as entry #{seq} at {time} (anchor-asserted time). It does not establish who created the work or that its contents are true. Verify independently at {origin}/verify."
  - "Print / Export PDF" button with @media print CSS styling.

Generate all components and pages cleanly divided into modular files matching the folder structure.
```

---

## 💾 GIT COMMIT COMMAND (After placing the files)

Once you place the downloaded files into `apps/web/src/components/` and `apps/web/src/pages/`, run this in your terminal:

```bash
git checkout Sarthak
git add apps/web/src
git commit -m "web: integrate complete Lovable UI system, pages, and components"
```
