# 🎨 Google Stitch UI Master Prompt & Drop Guide

This guide contains:
1. **The Exact Folder Location** where you should place the UI files generated from Stitch.
2. **The Complete Single Master Prompt** to paste directly into **Stitch**.
3. **Next Step:** Once you drop the files into the folder, tell Antigravity: *"I placed the Stitch UI files, now polish and connect them"* and Antigravity will wire them up to the real crypto engine, verifier, and APIs!

---

## 📂 WHERE TO PLACE THE STITCH GENERATED UI FILES

When Stitch generates your files, download them and place them into:

```
c:\Users\lokes\OneDrive\Desktop\GIT-REPO\AetherMinds\AetherMinds\apps\web\src\
│
├── components/                      <--- DROP REUSABLE UI COMPONENTS HERE
│   ├── Navbar.tsx                   (Top navigation with brand switcher)
│   ├── HealthStrip.tsx              (Live status pill: :4000, :4100, :4200, :8545)
│   ├── FileDrop.tsx                 (Drag-and-drop file upload zone)
│   ├── HashProgress.tsx             (Progress bar for chunked file hashing)
│   ├── ThreeLineResult.tsx          (3-line integrity, registration, attribution card)
│   ├── StepList.tsx                 (S1-S8 cryptographic step accordion)
│   ├── MerkleTree.tsx               (Interactive SVG Merkle tree diagram)
│   ├── TrailTimeline.tsx            (Creation trail version history timeline)
│   ├── ClaimsPanel.tsx              (Duplicate content warning banner)
│   └── CertificateView.tsx          (Printable dark luxury certificate card)
│
└── pages/                           <--- DROP PAGE SCREENS HERE
    ├── Landing.tsx                  (Path: / -> Dual hero landing page)
    ├── Verify.tsx                   (Path: /verify -> Public standalone verifier)
    │
    ├── proofchain/                  <--- SIDE 1 ISSUER PAGES
    │   ├── Dashboard.tsx            (Path: /proofchain -> Issuer overview)
    │   ├── Register.tsx             (Path: /proofchain/register -> Multi-file AI confirm)
    │   ├── Batches.tsx              (Path: /proofchain/batches -> List of batches)
    │   ├── BatchDetail.tsx          (Path: /proofchain/batches/:id -> Merkle tree & records)
    │   ├── Audit.tsx                (Path: /proofchain/audit -> Registry drift audit)
    │   └── TamperLab.tsx            (Path: /proofchain/tamper-lab -> Demo tamper buttons)
    │
    └── creator/                     <--- SIDE 2 CREATORPROOF PAGES
        ├── Home.tsx                 (Path: /creator -> Key manager & works)
        ├── NewWork.tsx              (Path: /creator/new -> 6-step signing wizard)
        ├── WorkDetail.tsx           (Path: /creator/works/:id -> Version trail)
        └── Certificate.tsx          (Path: /creator/certificate/:id -> Certificate + QR)
```

*(Note: Even if Stitch gives you a single bundle or slightly different file names, just drop the files into `apps/web/src/` and Antigravity will automatically organize and refine them!)*

---

## 🚀 COMPLETE SINGLE MASTER PROMPT FOR STITCH

Copy and paste everything inside this block into **Stitch** in a single prompt:

```text
Create a modern, ultra-premium, high-trust web application called "ProofChain + CreatorProof". The design must look like a tier-1 cryptographic security platform and fintech infrastructure with dark luxury surfaces, glassmorphism cards, glowing accents, and clean JetBrains Mono typography for cryptographic hashes.

### 🎨 DESIGN SYSTEM & PALETTE
- Theme: Dark Mode by default. High visual fidelity, subtle borders, sleek micro-interactions.
- Palette:
  - Deep Background: #000B0F
  - Card Surfaces: #00171F with subtle glassmorphic borders #003459
  - Primary Accent: #007EA7 (cerulean)
  - Glow & Links: #00A8E8 (sky)
  - Muted Borders: #D4DEE2
  - Secondary Text: #66747A
  - Success (Integrity / Registration only): #1E8F53 (emerald)
  - Danger (Tamper / Failures): #D93838
  - Warning (Advisories): #DD8E4B
  - Attribution Accent: #007EA7 (info - NEVER style attribution green!)
- Fonts: 'Plus Jakarta Sans' for headings and UI, 'JetBrains Mono' for hashes, IDs, and keys.
- Strict Copywriting Rules:
  - NEVER use the words 'authentic', 'genuine', 'original', or 'proof of ownership'.
  - ALWAYS use 'matches the registered record', 'evidence', 'priority of registration'.

### 🖥️ SCREENS & COMPONENTS TO DESIGN

1. TOP NAVIGATION & LIVE HEALTH (Navbar.tsx & HealthStrip.tsx)
   - Sticky navbar with logo "ProofChain" and dynamic brand toggle between "ProofChain (Registry)" and "CreatorProof (Attribution)".
   - Navigation links: "Public Verifier", "Batches & Tree", "Creator Studio", "Tamper Lab", "Audit".
   - Live Health Status Pill displaying 4 real-time green dots: Registry (:4000), Anchor Ledger (:4100), Witness (:4200), and Ethereum EVM (:8545).
   - "Issuer Access" action button with modal to enter access token.

2. DUAL-SIDED HERO LANDING PAGE (/ - Landing.tsx)
   - Headline: "Verify Any Record Without Trusting The Registry."
   - Subtitle: "A cryptographic proof engine backed by Ed25519 signed append-only ledgers and local Ethereum smart contracts. Zero AI in the trust path."
   - Two large interactive gateway cards:
     - Card A: "ProofChain for Issuers" -> Register documents, Merkle batch sealing, tamper audit dashboard.
     - Card B: "CreatorProof for Creators" -> Sign creations with browser Ed25519 keys, build creation trails, detect competing claims.
   - Trust badges: "Standalone In-Browser Verifier", "Dual Root Anchoring", "Deterministic AI with Human Confirmation".

3. STANDALONE PUBLIC VERIFIER (/verify - Verify.tsx)
   - Split upload zone: "Drop Document File" + "Drop Proof (.pcproof.json)".
   - Glowing cerulean button: "Verify Record", plus "Offline Mode" link to paste raw ledger JSON.
   - Three-Line Result Card (ThreeLineResult.tsx):
     - Line 1 (Integrity): Bold emerald checkmark "Matches the registered record" or red failure code (DOC_MODIFIED, ROOT_MISMATCH).
     - Line 2 (Registration): Displays dual anchor status:
       - "Ledger: batch b-0007 · entry #7 · 2026-10-11 09:00 UTC (anchor-asserted time)"
       - "Ethereum (local Hardhat 31337): anchor #7 · block time 2026-10-11 09:00 UTC (chain-asserted)"
     - Line 3 (Attribution): Styled in neutral blue (#007EA7, NEVER GREEN):
       - "Signed by key 03a1...31b8 (signature valid). The key holder's identity is not verified."
   - Cryptographic Steps Breakdown Accordion: S1_PARSE, S2_LEAF, S3_ROOT, S4_ANCHOR_FETCH, S5_ANCHOR_AUTH, S6_ROOT_COMPARE, S6B_CROSS_CHECK, S7_WITNESS, S8_SIGNATURE with pass/fail badges.
   - AI Explainer Card: Plain English explanation with notice pill: "Explanation (AI-assisted, not part of verification)".

4. SIDE 1: ISSUER REGISTRATION (/proofchain/register - Register.tsx)
   - Multi-file drop zone with live progress indicators.
   - For each uploaded file: An AI-extracted metadata card showing Issuer, Document Date, Document Type, Title, and Reference No with confidence chips and source snippet quotes.
   - Mandatory Checkbox: "I have reviewed and confirmed these values" (Submit disabled until ticked).
   - Near-duplicate advisory warning banner if file is similar to an existing document.

5. BATCH EXPLORER & INTERACTIVE MERKLE TREE (/proofchain/batches/:id - BatchDetail.tsx)
   - Batch header showing Batch ID, status badge ('open', 'sealed', 'anchored'), root hash, and "Seal Batch" button.
   - Hand-crafted interactive SVG Merkle Tree Diagram:
     - Root node at top, branches, and leaf nodes at bottom. Nodes are monospace pills with 6-hex characters (full hash on hover).
     - Clicking any leaf node highlights its proof path: selected leaf & ancestors in cerulean (#007EA7), sibling nodes in illuminated sky border (#00A8E8).
     - Side drawer displays step-by-step folding calculation: `nodeHash(sibling, current) -> parent`.
   - Records table with "Download Proof" and "Verify Now" actions.

6. TAMPER LAB & DRIFT AUDIT (/proofchain/tamper-lab & /proofchain/audit)
   - Tamper Lab: Simulation action cards for demo:
     - "Tamper DB Root": Overwrites database root (verifier still passes genuine docs because root lives in the anchor!).
     - "Corrupt DB Leaf" & "Delete DB Record" triggers.
     - "Download Tampered Files" buttons (tampered PDF and tampered proof).
     - Big green "Restore Clean Database Backup" button.
   - Drift Audit: "Run Registry Audit" button and real-time drift results table showing expected vs found hashes in red monospace.

7. SIDE 2: CREATORPROOF STUDIO & CERTIFICATE (/creator/new & /creator/certificate/:id)
   - 6-Step Creator Wizard: File upload with duplicate check, Metadata details, License selector, Versioning toggle, Canonical JSON review, and "Sign with My Key" button.
   - Creation Trail Timeline: Visual vertical timeline connecting versions (v1 Draft -> v2 Revision -> v3 Final) with anchor timestamps and verification badges.
   - Competing Claims Panel: Displays if another party attempted to register the same content hash later.
   - Printable Luxury Dark Certificate: Dark background (#000B0F) with sky/gold accents, work title, content hash, anchor entries, embedded QR code, and mandatory disclaimer:
     "This certificate states that a record matching the file hash below was registered in batch {batchId} and anchored as entry #{seq} at {time}... It does not establish who created the work or that its contents are true. Verify independently at {origin}/verify."
   - Print button with @media print clean formatting.
```

---

## ⚡ WHAT TO DO AFTER YOU GET THE STITCH FILES

1. Download or copy the files generated by Stitch.
2. Put them into `apps/web/src/components/` and `apps/web/src/pages/` (or directly in `apps/web/src/`).
3. Message Antigravity:
   > *"I have placed the Stitch UI files into apps/web/src/. Please polish them, fix any missing imports, and wire them to @proofchain/verifier and the backend API."*
4. Antigravity will handle all TypeScript types, state, API fetching, and complete the frontend!
