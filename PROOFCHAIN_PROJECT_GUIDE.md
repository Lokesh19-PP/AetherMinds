# ProofChain + CreatorProof — Team Project Guide

> **Hackathon:** VORTEXA 3.0 (12 hours, team of 4) · **Problem:** B-01 ProofChain — Verifiable Records & Tamper Detection
> **Deliverable:** one website with two sides, one shared cryptographic engine, one standalone verifier
> **Stack in one line:** TypeScript monorepo · Node 20/22 · React + Vite + Tailwind · Express + SQLite · `@noble` crypto · **Ethereum (EVM): Solidity + Hardhat local chain** · local-first AI (rules + Naive Bayes + optional Ollama)
> **Version:** 1.1

---

## Changes in v1.1 (read these first if you saw v1.0)

1. **New section 19: File storage policy.** Default is hash-only (no files stored). Optional previews and copies go through a `FileStore` interface. Cloudinary or any other host is allowed only under the rules in 19.4. Sections 7 and 8 gained the matching columns and routes.
2. **Blockchain decision: Ethereum (EVM).** New section 20. A Solidity contract, `RootAnchor`, is deployed to a **local Hardhat chain** (Sepolia testnet optional, mainnet never). It runs **alongside** the signed ledger and witness, not instead of them.
3. **Proof bundle format changed:** `anchor` became `anchors[]` (section 6.4).
4. **Verifier interface changed:** `readers[]` instead of a single `anchor` (section 9 was rewritten). New code `ANCHOR_DISAGREEMENT`.
5. **Process count is now five** (web, registry, anchor, witness, chain).
6. **Schedule:** Ollama and image dHash moved to stretch to make room. New gate **G3E** at hour 9:30 (section 14.4).

---

## 0. How to use this document

1. Everyone reads sections 1–5 (what, why, stack, architecture, repo layout).
2. Sections **6–9 are the frozen contract** (crypto format, data model, API, verifier). They are fixed by **hour 1**. Any change is a PR to this file that all four approve.
3. Then read your own role in section 14. Ownership is by directory, so we rarely touch each other's files.
4. Section 17 is what we say to the judges. Read it before the demo rehearsal.

**Three rules that override everything else**

- **R-A: The verifier never trusts the registry.** It uses only the document, the proof file and the anchor. No registry import, no registry HTTP call, no database.
- **R-B: No AI in the verification path.** AI may suggest, extract and explain. It can never decide a verdict. This is enforced by an automated purity check (section 16).
- **R-C: We never claim authorship.** We prove *integrity* and *priority of registration*, and we show *attribution evidence*. Never say "proves who made it".

---

## 1. What we are building

### 1.1 One engine, two sides

| | **Side 1 — ProofChain** (the product) | **Side 2 — CreatorProof** (the business demo) |
|---|---|---|
| Purpose | Satisfy every B-01 requirement | Show who pays and why |
| Users | Issuers (universities, offices) and anyone verifying | Creators, agencies, marketplaces |
| Registers | Raw documents (PDF, image, text, JSON) | A signed **manifest** (file hash + title + license + creator key + version link) |
| Output | Proof file `.pcproof.json` per record | Certificate page with QR + creation trail |
| Effort share | ~75% | ~25% |

Both sides call the **same registry API**, put records into the **same Merkle batches**, anchor to the **same anchor**, and are checked by the **same verifier**. Side 2 is not a second backend.

### 1.2 What we prove, and what we do not

| We prove | We do **not** prove |
|---|---|
| This exact content existed and was registered, unchanged since | Who created the document |
| Which batch it is in and when that batch was anchored | That the contents are true |
| The anchor entry is signed and consistent with an independent witness | That the creator's key belongs to a real person |
| (Side 2) a specific key signed the manifest | That the key holder is the original author |

Side 2 adds **attribution evidence** (signature, version trail, competing-claims panel). Evidence is not proof, and the UI uses the word *evidence*.

### 1.3 Non-goals (do not build these)

Social feed, likes, comments, follows, notifications, accounts with passwords, payments, mobile apps, Ethereum mainnet or any real-money chain (never), paid RPC plans, revocation (stretch only), real people's data.

---

## 2. Organizer requirements → our feature → where it lives

| # | Organizer requirement (B-01) | Our feature | Location | How we show it |
|---|---|---|---|---|
| R1 | SHA-256 over a defined, reproducible form | Canonicalization spec (section 6.1), domain-separated leaf hash | `packages/core` | Known-answer test vectors |
| R2 | Records grouped into batches with a Merkle tree | Batch sealing, RFC 6962-style tree | `packages/core`, `apps/registry` | Batch page with tree diagram |
| R3 | Membership proof per record | `.pcproof.json` bundle | `packages/core` | Download button on every record |
| R4 | Roots stored where the registry cannot silently rewrite them | Separate **anchor** process (own key, own files, append-only signed hash chain) + **witness** process, plus an **Ethereum (EVM) contract** that only accepts new roots (`ANCHOR_MODE=both`) | `apps/anchor`, `apps/witness`, `contracts/` | Registry has no write access to the ledger files. Roots are also readable from the chain |
| R5 | Verifier uses only document + proof + published root | Standalone verifier library, CLI and in-browser page | `packages/verifier` | DevTools network tab shows no call to the registry |
| R6 | Reports which check failed | Failure codes + step-by-step result | `packages/verifier` | Verify page, CLI |
| R7 | Detect modified doc / invalid proof / record no longer matching its published reference | `DOC_MODIFIED`, `PROOF_INVALID`/`ROOT_MISMATCH`, `REGISTRY_DRIFT` audit | verifier + `apps/registry/audit` | Tamper lab |
| R8 | Tampered document rejected even if registry DB altered | Verifier never reads DB | `packages/verifier` | Edit DB live, re-verify |
| R9 | AI: extract metadata, suggest categories, explain failures; human confirms; AI never affects verification | `packages/ai` + confirm screen + purity check | `packages/ai`, `apps/web` | Confirm form, explainer panel labelled "not part of verification" |
| R10 | Genuine crypto checking, not a visual indicator | Real SHA-256 and Ed25519 recomputation, visible steps | `packages/core` | Judges can read ~150 lines |
| R11 | Core demo works without paid APIs or cloud, with local fallback | Everything runs on localhost; AI has a rules fallback | whole repo | Pull the network cable demo |
| Global | Working MVP, fictional data only, reproducible | `npm run seed`, fixed demo data | `scripts/` | Fresh-clone run in section 15 |

---

## 3. Tech stack

### 3.1 Prerequisites on every laptop (install in hour 0)

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS or 22 LTS | Test vectors in this document were generated on Node 22 |
| npm | 10+ | We use **npm workspaces** (no pnpm/yarn, so nothing extra to install) |
| Git | any recent | |
| Ollama | optional | Local LLM. Core demo must work without it |
| VS Code | recommended | Extensions: ESLint, Prettier, Tailwind CSS IntelliSense |

> **Windows note:** several of us may be on Windows. Use only cross-platform npm scripts (`concurrently`, `cross-env`), build paths with `path.join`, never use bash-only scripts, and never hard-code `/`.

### 3.2 Chosen stack

| Layer | Choice | Version | Why |
|---|---|---|---|
| Language | **TypeScript** (strict) everywhere | 5.5+ | One language for server, browser and CLI. The **same verifier code** runs in Node and in the browser |
| Monorepo | npm workspaces | npm 10 | Zero extra tooling. Packages export TS source directly (`"main": "src/index.ts"`), so no build step for shared code |
| Run TS on server | `tsx` | ^4 | No compile step in dev |
| Frontend framework | **React 18 + Vite** | react ^18.3, vite ^5.4 | Fast, familiar, instant reload |
| Routing | React Router | ^6.26 | |
| Styling | **Tailwind CSS 3** (build-time, **not** the CDN script) | ^3.4 | Works offline. Tokens from our palette (section 11.1) |
| Server state | TanStack Query | ^5 | Loading and error states for free |
| Icons | `lucide-react` | latest 0.x | |
| Fonts | `@fontsource/plus-jakarta-sans`, `@fontsource/jetbrains-mono` | latest | **Self-hosted** via npm. No Google Fonts request, so the offline demo looks identical |
| QR codes | `qrcode` | ^1.5 | Renders to SVG/canvas in the browser |
| Backend | **Express 4** | ^4.19 | Most familiar to the team |
| Upload parsing | `multer` (memory storage, 10 MB limit) | ^1.4.5-lts.1 | |
| Validation (server only) | `zod` | ^3.23 | Not used inside `core` or `verifier` (keep them dependency-light) |
| Database | **SQLite** via `better-sqlite3` | ^11 | One file, no server, synchronous API. See risk note below |
| Hashing | `@noble/hashes` (`sha256`) | **1.x line** | Pure JS, audited, runs in browser and Node with identical output |
| Signatures | `@noble/curves` (`ed25519`) | **1.x line** | Same code in browser and Node. Do not upgrade to 2.x mid-event (import paths changed) |
| Canonical JSON | our own ~40-line function in `core` | n/a | Spec in 6.1, covered by tests |
| PDF text extraction | `pdf-parse` | ^1.1.1 | **Import `pdf-parse/lib/pdf-parse.js`**, not the package root. The root has a known bug that tries to read a test PDF on import |
| Seed PDF generation | `pdf-lib` (dev) | ^1.17 | Generate fictional certificates for demos |
| Tests | `vitest` + `supertest` | vitest ^2, supertest ^7 | |
| Dev runner | `concurrently` | ^9 | One command starts all four processes |
| Lint/format | ESLint + Prettier | latest | Only one custom rule matters: the verifier purity rule (section 16) |
| Local LLM (optional) | **Ollama** at `http://localhost:11434` with `qwen2.5:3b` or `llama3.2:3b` | n/a | Small enough for laptop CPU |
| **Blockchain** | **Ethereum (EVM)**: local **Hardhat** network, chain id 31337. Sepolia (11155111) optional | n/a | Mature local tooling with no internet, and the same contract deploys to any EVM chain (section 20) |
| Smart contract | Solidity `^0.8.20`, Hardhat **2.x** (pin it; do not follow a tutorial for another major version) | | `contracts/RootAnchor.sol` compiled clean with solc 0.8.26 |
| Chain client | `ethers` ^6 in `apps/registry` (publisher) and `contracts/` (tests, deploy) **only** | | The verifier talks to the chain with raw JSON-RPC `fetch`, so it stays dependency-light and browser-safe |

**Risk note: `better-sqlite3`** is a native module. Test `npm install` on every laptop in hour 0. If it fails on someone's machine, the fallback is Node 22's built-in `node:sqlite`, wrapped behind `apps/registry/src/db/index.ts` so only that one file changes.

### 3.3 Considered and rejected

| Rejected | Reason |
|---|---|
| Flutter (the CreatorProof app stack) | We are building a website; Flutter web adds build weight and a second language |
| Firebase / Firestore | Violates R-A (a DB holding proof status is exactly the trust problem B-01 describes) and the no-cloud rule |
| Cloudinary | External dependency; hash-only registration also protects privacy |
| Public testnets (Sepolia, Polygon Amoy) as a hard dependency | Need internet, an RPC key and faucet funds, any of which can fail at the venue. Optional extras only |
| Ethereum **mainnet** | Real money and real gas. Violates the brief's "no real cryptocurrency / no paid services" spirit. Never |
| Algorand (AlgoKit LocalNet) | Needs Docker and a different contract toolchain, with no benefit for this brief. See the comparison in 20.1 |
| Python backend | Would force a second verifier implementation for the browser |
| Next.js | SSR is unnecessary; adds concepts the team must learn |
| Tailwind CDN script | Not offline-safe |
| Web3.js / ethers inside `core` or `verifier` | Forbidden by the purity check. `ethers` is allowed only in the registry publisher and the contract tests |

---

## 4. Architecture

### 4.1 Processes and ports

```
┌──────────────────────── Browser (apps/web, :5173) ───────────────────────┐
│  Side 1 pages     Side 2 pages     /verify  ← runs packages/verifier      │
└──────┬──────────────────┬───────────────────────────┬────────────────────┘
       │ register/seal    │ manifests                 │ reads anchors + RPC
       ▼                  ▼                           │ (NEVER the registry)
┌───────────────────────────────┐                     │
│ Registry  apps/registry :4000 │                     │
│ SQLite · batching · proofs    │                     │
│ AI endpoints · audit          │                     │
└───────┬───────────────┬───────┘                     │
        │ root + token  │ root as an Ethereum tx      │
        ▼               ▼                             ▼
┌───────────────────┐  ┌───────────────────────────────────────────┐
│ Ledger anchor     │  │ Ethereum chain (Hardhat, EVM)  :8545       │
│ apps/anchor :4100 │  │ RootAnchor.sol: append-only roots          │
│ own Ed25519 key   │  └───────────────────────────────────────────┘
│ signed hash chain │
└─────────▲─────────┘
          │ polls every 5 s
┌─────────┴─────────┐
│ Witness  :4200    │  keeps its own copy of every ledger entry
└───────────────────┘
```

| Process | Port | Data directory | May write to |
|---|---|---|---|
| web (Vite) | 5173 | none | nothing |
| registry | 4000 | `data/` (`registry.db`, optional `files/`, `previews/`) | its own `data/` only; sends roots to the anchor and to the chain |
| anchor | 4100 | `anchor-data/` (`anchor.key`, `ledger.jsonl`) | its own folder only |
| witness | 4200 | `witness-data/` (`entries.jsonl`) | its own folder only |
| chain (Hardhat node) | 8545 | in memory (see 20.4) | accepts transactions from the publisher key only for `publish` |
| Ollama (optional) | 11434 | n/a | n/a |

### 4.2 Trust boundaries (memorize this)

| Component | Trusted for | Not trusted for |
|---|---|---|
| Ledger anchor (signed chain) | The published roots, if its signature and chain link verify | Being the only copy (hence the witness and the chain) |
| Witness | Detecting rewrites of ledger history | Producing roots |
| Ethereum contract | Refusing to overwrite or edit a published root (enforced by contract code), and portability to a public chain | **On local Hardhat: immutability.** Whoever runs the node can reset it (we demo this). Also the honesty of the RPC endpoint (section 20.7) |
| Registry | Convenience: storing records, building proofs | **Anything the verifier relies on.** A proof bundle fetched from the registry is untrusted data |
| AI module | Suggestions | Any decision |
| Browser | Running the verifier | Holding trusted state (the anchor public key and contract address are pinned at build time) |

**Honest limit (say it first, before judges ask):** on one laptop nothing is truly immutable, because we run every process, including the chain. What we do is publish each root to **two independent mechanisms** (a signed ledger with a witness, and an Ethereum contract) outside the registry's write path. If the registry rewrites its history, it is detected. Defeating verification would require rewriting both at once, and the verifier flags any disagreement between them. In production the chain would be a public network, which no single party can reset.

### 4.3 Why a proof bundle from the registry is safe

The verifier checks the bundle against the anchor. A forged or altered bundle fails. So the registry can serve bundles, and the QR code on a certificate can point to the registry, without weakening trust.

---

## 5. Repository structure

```
proofchain/
├── package.json                  # workspaces + root scripts (section 15)
├── tsconfig.base.json            # strict TS settings shared by all packages
├── .eslintrc.cjs                 # includes verifier no-restricted-imports rule
├── .prettierrc
├── .env.example                  # every env var, documented (section 15.3)
├── .gitignore                    # node_modules, data/, anchor-data/, witness-data/, .env, dist/
├── README.md                     # 2-minute quickstart + trust model summary (written last, hour 11)
│
├── packages/
│   ├── core/                     # OWNER: P1.  Pure functions. No I/O, no network, no AI, no zod.
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts          # public exports (frozen API, hour 1)
│   │       ├── types.ts          # Bundle, AnchorEntry, Manifest, Step, VerifyResult types
│   │       ├── bytes.ts          # hex <-> bytes, concat, constant-time-ish compare
│   │       ├── hash.ts           # sha256, leafHash(), nodeHash()
│   │       ├── canonical.ts      # canonicalJson(), NFC normalization, float rejection
│   │       ├── merkle.ts         # buildTree(), rootOf(), proofFor(), expectedPathLength()
│   │       ├── bundle.ts         # makeBundle(), validateBundleShape() (hand-written, no zod)
│   │       ├── anchorEntry.ts    # entryHash(), signEntry(), verifyEntry(), GENESIS_PREV
│   │       ├── manifest.ts       # manifestSigningBytes(), signManifest(), verifyManifest()
│   │       └── errors.ts         # CoreError with machine-readable codes
│   │
│   ├── verifier/                 # OWNER: P1.  Depends ONLY on @proofchain/core and @noble/*.
│   │   └── src/
│   │       ├── index.ts
│   │       ├── verify.ts         # verifyBundle(docBytes, bundle, deps) -> VerifyResult
│   │       ├── codes.ts          # failure code enum + severity
│   │       ├── messages.ts       # deterministic code -> plain-language template table
│   │       ├── threeLine.ts      # VerifyResult -> {integrity, registration, attribution}
│   │       ├── anchorReader.ts   # interface AnchorReader / WitnessReader
│   │       ├── httpLedgerReader.ts   # fetch() based, works in browser and Node; checks sig + chain link
│   │       ├── staticLedgerReader.ts # reads a pasted/offline ledger entry JSON
│   │       └── ethereumReader.ts     # raw JSON-RPC eth_call, pinned chain id + contract, multi-RPC agreement
│   │
│   └── ai/                       # OWNER: P3.  Used ONLY by apps/registry. Never by verifier or core.
│       └── src/
│           ├── index.ts
│           ├── extract/
│           │   ├── rules.ts      # regex/keyword extractor (issuer, date, type, title, parties)
│           │   ├── llm.ts        # Ollama JSON-mode extractor, zod-validated output
│           │   └── textFromFile.ts   # pdf-parse (PDF), utf8 (txt/json), none for images
│           ├── categorize/
│           │   ├── naiveBayes.ts # tiny multinomial NB classifier, runs with no LLM
│           │   └── trainingSet.json  # fictional labelled examples (~60 items)
│           ├── similarity/
│           │   ├── simhash.ts    # 64-bit SimHash for text + hamming distance
│           │   └── dhash.ts      # compare precomputed image dHash hex values
│           ├── explain/
│           │   ├── explain.ts    # LLM paraphrase of a verification result, with guard
│           │   └── guard.ts      # rejects LLM text that states/contradicts the verdict
│           ├── ollama.ts         # health check + generate wrapper, 8 s timeout
│           └── prompts/          # *.txt prompt templates (versioned, reviewable)
│
├── apps/
│   ├── registry/                 # OWNER: P2.  Express API :4000
│   │   └── src/
│   │       ├── server.ts         # app wiring, CORS (web origin only), error handler
│   │       ├── config.ts         # env parsing
│   │       ├── db/
│   │       │   ├── index.ts      # the ONLY file that imports better-sqlite3
│   │       │   ├── schema.sql    # section 7
│   │       │   └── migrate.ts    # create tables if missing
│   │       ├── routes/
│   │       │   ├── records.ts    # POST /api/records, GET record, GET proof
│   │       │   ├── manifests.ts  # POST /api/manifests (Side 2)
│   │       │   ├── batches.ts    # list, detail, seal
│   │       │   ├── works.ts      # creation trail
│   │       │   ├── claims.ts     # competing claims by content hash
│   │       │   ├── ai.ts         # /api/extract, /api/explain
│   │       │   ├── audit.ts      # run + latest
│   │       │   ├── previews.ts   # preview upload/get/delete + stored-file download (section 19)
│   │       │   ├── health.ts
│   │       │   └── demo.ts       # tamper lab, only mounted when DEMO_MODE=true
│   │       ├── storage/
│   │       │   ├── FileStore.ts      # interface (section 19.3)
│   │       │   ├── localDisk.ts      # default adapter, content-addressed
│   │       │   ├── s3.ts             # STRETCH (S3-compatible, e.g. local MinIO)
│   │       │   └── cloudinary.ts     # STRETCH, previews only, server-signed
│   │       ├── services/
│   │       │   ├── batching.ts   # seal: order leaves, build tree, publish, store anchor ref
│   │       │   ├── anchorClient.ts   # POST /publish with token
│   │       │   ├── ethPublisher.ts   # ethers v6: find(batchId) then publish(); idempotent retry
│   │       │   ├── proofService.ts   # builds a bundle from DB + core
│   │       │   └── audit.ts      # REGISTRY_DRIFT detection (section 12)
│   │       └── middleware/
│   │           ├── auth.ts       # bearer token on write routes
│   │           └── errors.ts     # { error: { code, message, details? } }
│   │
│   ├── anchor/                   # OWNER: P2.  Express :4100.  Imports @proofchain/core only.
│   │   └── src/
│   │       ├── server.ts
│   │       ├── ledger.ts         # append-only JSONL, load + verify chain on boot
│   │       ├── keys.ts           # create/read Ed25519 key in anchor-data/
│   │       └── routes.ts         # /publish /anchors/:seq /head /ledger /pubkey
│   │
│   ├── witness/                  # OWNER: P2.  Express :4200.  Imports @proofchain/core only.
│   │   └── src/
│   │       ├── server.ts
│   │       ├── poller.ts         # fetch anchor /ledger every 5 s, validate, append new entries
│   │       ├── store.ts          # witness-data/entries.jsonl
│   │       └── routes.ts         # /heads /entries/:seq /status
│   │
│   ├── verifier-cli/             # OWNER: P1.  `npx proofchain-verify <doc> <proof.json>`
│   │   └── src/cli.ts            # prints steps + verdict, exit code 0/1/2
│   │
│   └── web/                      # OWNER: P4 (P1 and P3 contribute pages, see section 14)
│       ├── index.html
│       ├── vite.config.ts        # alias @proofchain/*, dev proxy /api -> :4000
│       ├── tailwind.config.ts    # palette + fonts (section 11.1)
│       └── src/
│           ├── main.tsx
│           ├── App.tsx           # router
│           ├── generated/
│           │   ├── anchorPub.ts  # pinned ledger public key, written by `npm run setup`
│           │   └── pinnedEthereum.ts # {chainId, contract, rpcUrls, blockTag}, written by `npm run chain:deploy`
│           ├── lib/
│           │   ├── api.ts        # typed fetch client for registry
│           │   ├── fileHash.ts   # chunked streaming sha256 (works for huge videos) via @noble/hashes
│           │   ├── thumbnail.ts  # canvas thumbnail / video poster frame for optional previews
│           │   ├── similarity.ts # browser dHash (canvas) for images
│           │   └── creatorKey.ts # Ed25519 key create/import/export (localStorage + file)
│           ├── components/       # see section 11.3
│           └── pages/
│               ├── Landing.tsx
│               ├── Verify.tsx            # shared by both sides
│               ├── proofchain/           # Dashboard, Register, Batches, BatchDetail, Record, Audit, TamperLab
│               └── creator/              # Home, NewWork, Works, WorkDetail, Certificate, ForPlatforms
│
├── contracts/                    # OWNER: P3.  Hardhat 2.x project (section 20)
│   ├── package.json
│   ├── hardhat.config.ts         # networks: hardhat/localhost (31337), sepolia (optional, from .env)
│   ├── contracts/RootAnchor.sol  # append-only Merkle-root registry
│   ├── test/RootAnchor.test.ts   # normal + adversarial tests (section 20.3)
│   └── scripts/deploy.ts         # makes a fresh publisher key, funds it, deploys, writes .env + pinnedEthereum.ts
│
├── scripts/
│   ├── setup.ts                  # generate anchor key, write pinned pub key + .env
│   ├── seed.ts                   # create fictional samples, register + seal 2 batches
│   ├── demoTamper.ts             # runs every tamper case and prints the verdicts
│   ├── resetDemo.ts              # wipe data dirs for a clean run
│   └── checkVerifierPurity.ts    # fails if verifier/core import anything forbidden
│
├── samples/                      # ALL FICTIONAL
│   ├── certificates/             # generated PDFs: "Pune Institute of Fictional Studies" etc.
│   ├── creator-works/            # images/text we generate or draw ourselves
│   └── tamper/                   # pre-made modified copies for quick demos
│
└── docs/
    ├── TRUST_MODEL.md            # the honest-limit statement + threat table
    ├── CRYPTO_SPEC.md            # copy of section 6 (judges may read it)
    ├── API.md                    # copy of section 8
    ├── DEMO_SCRIPT.md           # copy of section 13
    └── JUDGE_QA.md              # copy of section 17
```

---

## 6. Cryptographic specification (FROZEN at hour 1)

All hex is **lowercase**, no `0x` prefix. All text is **UTF-8**. All timestamps are **ISO 8601 UTC** with `Z`.

### 6.1 What gets hashed (the "defined, reproducible form")

| Record kind | Bytes that are hashed |
|---|---|
| `file` (Side 1) | The raw file bytes, exactly as uploaded. Any re-save, re-compression or re-export is a different document. State this honestly. |
| `manifest` (Side 2) | The UTF-8 bytes of `canonicalJson(manifest)`, where the manifest includes its `signature` field |
| structured JSON documents (optional Side 1 mode) | `canonicalJson(document)` so formatting differences do not change the hash |

**`canonicalJson(value)` rules** (a JCS-style subset):

1. Object keys sorted by UTF-16 code-unit order (the default `Array.prototype.sort()` on keys).
2. No whitespace between tokens.
3. Every string (keys and values) is **Unicode NFC normalized** before serialization, then serialized with `JSON.stringify` escaping.
4. Allowed types: object, array, string, boolean, `null`, and **integers only**. Any non-integer number, `NaN`, `Infinity`, `undefined`, or function throws `CoreError('CANON_UNSUPPORTED')`.
5. Duplicate keys after NFC normalization throw.

### 6.2 Hash functions (domain separation)

```
H(x)           = SHA-256(x)
leafHash(b)    = H( 0x00 || b )            // b = bytes from section 6.1
nodeHash(l,r)  = H( 0x01 || l || r )       // l, r = 32-byte child hashes
```

The `0x00` / `0x01` prefixes stop a leaf from being passed off as an internal node (second-preimage attack).

### 6.3 Tree shape

Equivalent to the RFC 6962 Merkle Tree Hash. Build iteratively, level by level:

- Pair neighbours left to right: `parent = nodeHash(left, right)`.
- **If a level has an odd number of nodes, the last node is promoted unchanged to the next level. It is never duplicated.**
- A tree with one leaf has `root = leafHash`.
- `leafCount` is bound into the anchor entry, so the shape cannot be misrepresented.

> **Change from an earlier idea:** an earlier draft duplicated the last node on odd levels. That has a known ambiguity (two different leaf lists can give the same root). Promotion avoids it. Do not implement duplication.

```ts
// reference implementation sketch (core/src/merkle.ts)
export function buildTree(leaves: Uint8Array[]): Uint8Array[][] {
  if (leaves.length === 0) throw new CoreError('EMPTY_TREE');
  const levels = [leaves];
  while (levels[levels.length - 1].length > 1) {
    const cur = levels[levels.length - 1], next: Uint8Array[] = [];
    for (let i = 0; i < cur.length; i += 2)
      next.push(i + 1 < cur.length ? nodeHash(cur[i], cur[i + 1]) : cur[i]); // promote odd
    levels.push(next);
  }
  return levels; // levels.at(-1)[0] is the root
}

export function proofFor(levels: Uint8Array[][], index: number) {
  const path: { hash: string; side: 'L' | 'R' }[] = [];
  let idx = index;
  for (const lvl of levels.slice(0, -1)) {
    const sib = idx ^ 1;
    if (sib < lvl.length) path.push({ hash: toHex(lvl[sib]), side: sib < idx ? 'L' : 'R' });
    idx >>= 1;          // no sibling => this node is promoted, no path step
  }
  return path;
}

// how many steps a valid path must have for (index, leafCount)
export function expectedPathLength(index: number, leafCount: number): number {
  let steps = 0, idx = index, size = leafCount;
  while (size > 1) {
    if (idx % 2 === 1 || idx + 1 < size) steps++;
    idx = Math.floor(idx / 2);
    size = Math.ceil(size / 2);
  }
  return steps;
}
```

`side` describes where the **sibling** is: `"L"` means `nodeHash(sibling, current)`, `"R"` means `nodeHash(current, sibling)`.

### 6.4 Proof bundle (`*.pcproof.json`)

```json
{
  "format": "proofchain/proof/1",
  "recordKind": "file",
  "batchId": "b-0001",
  "leafIndex": 2,
  "leafCount": 5,
  "leafHash": "<64 hex>",
  "path": [ { "hash": "<64 hex>", "side": "R" } ],
  "anchors": [
    { "kind": "ledger",   "seq": 0, "url": "http://localhost:4100", "entryHash": "<64 hex>" },
    { "kind": "ethereum", "chainId": 31337, "contract": "0x…", "id": 0, "txHash": "0x…" }
  ],
  "manifest": { }
}
```

- `manifest` is present **only** when `recordKind` is `"manifest"`.
- `anchors` holds **one or two** references, at most one per `kind`. Which kinds appear depends on `ANCHOR_MODE` at sealing time (`ledger`, `ethereum` or `both`). This replaces the single `anchor` field of v1.0.
- `url`, `txHash` and `entryHash` are hints. The verifier uses its **own pinned** ledger key, chain id and contract address, never values from the bundle. A bundle that names a different chain or contract is rejected as `ANCHOR_INVALID`.
- Nothing in the bundle is trusted. Every field is checked (section 9).

### 6.5 Creator manifest (Side 2)

```json
{
  "schema": "creatorproof/manifest/1",
  "workId": "<uuid>",
  "version": 1,
  "parentLeaf": null,
  "fileHash": "<sha256 hex of the work file>",
  "fileName": "sunrise-over-fictional-bay.png",
  "mime": "image/png",
  "size": 482113,
  "title": "Sunrise Over Fictional Bay",
  "description": "…",
  "category": "Digital Art",
  "tags": ["landscape", "digital"],
  "license": "CC_BY_NC",
  "licenseText": null,
  "creator": { "publicKey": "<ed25519 public key, 64 hex>", "displayName": "Asha K. (fictional)" },
  "createdAtClaimed": "2026-10-11T08:30:00Z",
  "signature": "<ed25519 signature, 128 hex>"
}
```

- `license` ∈ `ALL_RIGHTS_RESERVED | CC_BY | CC_BY_NC | COMMERCIAL | CUSTOM` (`licenseText` required when `CUSTOM`).
- `version` is an integer ≥ 1. `parentLeaf` is the **leaf hash of the previous version's manifest** (or `null` for version 1). This is the creation trail.
- `createdAtClaimed` is **self-asserted and not trusted**. The only trusted time is the anchor's timestamp.
- Signing input = UTF-8 bytes of `"creatorproof/manifest/1\n" + canonicalJson(manifest without "signature")`. The signature is Ed25519 over those bytes.
- Leaf bytes = `canonicalJson(manifest with "signature")`.
- Because the license is inside the signed manifest, it cannot be changed later without breaking the proof.

### 6.6 Anchor entry and the signed hash chain

```json
{
  "seq": 0,
  "batchId": "b-0001",
  "root": "<64 hex>",
  "leafCount": 5,
  "issuer": "demo-registry",
  "ts": "2026-10-11T09:00:00Z",
  "prevHash": "<64 hex>",
  "entryHash": "<64 hex>",
  "sig": "<128 hex>"
}
```

```
prevHash(seq 0) = 64 zeros
entryHash       = SHA-256( utf8( canonicalJson({seq, batchId, root, leafCount, issuer, ts, prevHash}) ) )
sig             = Ed25519-sign(anchorPrivateKey, entryHash as 32 raw bytes)
```

Anchor rules (append-only enforcement):

1. `seq` is assigned by the anchor: 0, 1, 2, …
2. `prevHash` of entry N must equal `entryHash` of entry N−1. The anchor refuses to start if its own ledger does not verify.
3. `POST /publish` with an existing `batchId` and the **same** root returns the existing entry (idempotent). With a **different** root it returns `409 BATCH_ALREADY_ANCHORED`.
4. There is no update or delete endpoint.
5. The timestamp is the anchor's own clock. It is *anchor-asserted time*, weaker than a block timestamp. Say so.

### 6.7 Known-answer test vectors (generated with the exact rules above)

Use these in `packages/core/test/vectors.test.ts`. If your output differs, your implementation is wrong.

**SHA-256**

```
sha256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
```

**Merkle**. Leaf `i` = `leafHash(utf8("doc-" + i))`

| n | root |
|---|---|
| 1 | `6615aa816816f3de2de16d76a8545906c23fcb0c0b37b894ce938b1fe38c2231` (equals leaf 0) |
| 2 | `252e49fa5b3ce0eb215f1ac8387fdbd696957bdc2359a567687e3267a9226113` |
| 3 | `67f7693e164ba57d779c3aff9de3ba90df0820cca9cef61552b2ce6b9dd9201c` |
| 5 | `d2b27b44535297753c26e8e316fd04a113409741ae379b27ed574ae1464766ff` |
| 7 | `9bdea726571e6dc151c0194f52082e116e08ef86a791e65630f2146d9ef8b0e9` |

Path lengths for n = 5: indices 0..3 have 3 steps, index 4 has **1** step. For n = 7: indices 0..5 have 3 steps, index 6 has 2.

n = 5, index 4 (promoted leaf):

```json
[ { "hash": "37846ad6dff69d7052778d7483b8011d319fa38aa2d70c9dd053a7e848e485d4", "side": "L" } ]
```

n = 5, index 2:

```json
[
  { "hash": "28a570fc5b9e7981c28a035b5a6de3177224240e74ef1162f03d1ad51b691eab", "side": "R" },
  { "hash": "252e49fa5b3ce0eb215f1ac8387fdbd696957bdc2359a567687e3267a9226113", "side": "L" },
  { "hash": "14ed5e67fbd519a4de42170da88484e2762e7c58b244d503ba4bc80469ee2772", "side": "R" }
]
```

**Canonical JSON.** Input `{"b":1,"a":"e\u0301","c":[true,null]}` (the `a` value is `e` + combining accent, which NFC turns into `é` U+00E9)

```
canonical = {"a":"é","b":1,"c":[true,null]}
sha256    = 9351126962ec151dbc6c007b85647facd7b1dd4a3a24f1640444422ec639773f
```

**Ed25519.** Seed = bytes `00 01 02 … 1f`

```
seed = 000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f
pub  = 03a107bff3ce10be1d70dd18e74bc09967e4d6309ba50d5f1ddc8664125531b8
msg  = utf8("proofchain-test")
sig  = ff72dcfdfbd359d39cca2d43bbedc3efc013f279c88c19dd65dbc449f5d651029ecc9c974d7b9b26b8752982599b0ec0e2bb5e1a262c2c03370bf93b1fe21a07
```

**Anchor entry** (signed with the same seed)

```
fields    = { seq:0, batchId:"b-0001", root:"aa"×32, leafCount:5, issuer:"demo-registry",
              ts:"2026-10-11T09:00:00Z", prevHash:"00"×32 }
entryHash = b2dea792d0302caf8b355661b9bd8ff907916494d8d24c016cdeb7f4b77399fc
sig       = 9fab7877a8b16872c9c9e4c4d8052814ef060e984d8238887b433feba89dba501c0df863e6655f5214bb91348d06fe2c93f591915a79f175392e4791276bd108
```

---

## 7. Data model (SQLite, `apps/registry/src/db/schema.sql`)

> This database is **never** part of the trust path. Assume an attacker can edit it. The audit (section 12) exists to detect that.

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS batches (
  id               TEXT PRIMARY KEY,                       -- 'b-0001' (zero-padded sequential)
  status           TEXT NOT NULL CHECK (status IN ('open','sealed','anchored')),
  created_at       TEXT NOT NULL,
  sealed_at        TEXT,
  root             TEXT,                                   -- hex, set at seal
  leaf_count       INTEGER,
  anchor_seq       INTEGER,                                -- ledger anchor sequence number
  anchor_entry_json TEXT,                                  -- full ledger entry as returned by the anchor
  eth_chain_id     INTEGER,                                -- Ethereum anchor (NULL if ANCHOR_MODE=ledger)
  eth_contract     TEXT,
  eth_anchor_id    INTEGER,                                -- id returned by RootAnchor.publish
  eth_tx_hash      TEXT
);

CREATE TABLE IF NOT EXISTS records (
  id               TEXT PRIMARY KEY,                       -- crypto.randomUUID()
  batch_id         TEXT NOT NULL REFERENCES batches(id),
  leaf_index       INTEGER,                                -- assigned at seal; NULL while open
  kind             TEXT NOT NULL CHECK (kind IN ('file','manifest')),
  leaf_hash        TEXT NOT NULL,
  content_hash     TEXT NOT NULL,                          -- sha256 of the raw file bytes
  file_name        TEXT, mime TEXT, size INTEGER,
  metadata_json    TEXT NOT NULL,                          -- HUMAN-CONFIRMED metadata only
  ai_suggestion_json TEXT,                                 -- what the AI proposed (kept for transparency)
  confirmed_by     TEXT NOT NULL,
  confirmed_at     TEXT NOT NULL,
  manifest_json    TEXT,                                   -- kind='manifest': the exact canonical text that was hashed
  storage_mode     TEXT NOT NULL DEFAULT 'none' CHECK (storage_mode IN ('none','preview','copy')),  -- section 19
  file_ref         TEXT,                                   -- FileStore reference, only when storage_mode='copy'
  preview_ref      TEXT,                                   -- FileStore reference for the optional preview
  preview_sha256   TEXT,                                   -- hash of the preview bytes (NOT the registered file)
  visibility       TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  sim_kind         TEXT, sim_value TEXT,                   -- 'text-simhash' | 'image-dhash' (advisory)
  work_id          TEXT, version_no INTEGER, parent_leaf TEXT,
  creator_pub      TEXT,
  created_at       TEXT NOT NULL,
  UNIQUE (leaf_hash),
  UNIQUE (batch_id, leaf_index)
);
CREATE INDEX IF NOT EXISTS idx_records_content ON records(content_hash);
CREATE INDEX IF NOT EXISTS idx_records_work    ON records(work_id, version_no);
CREATE INDEX IF NOT EXISTS idx_records_creator ON records(creator_pub);

CREATE TABLE IF NOT EXISTS creators (
  public_key   TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ran_at      TEXT NOT NULL,
  ok          INTEGER NOT NULL,
  result_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (          -- convenience log for the UI only; NOT tamper-evident
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  ts     TEXT NOT NULL,
  type   TEXT NOT NULL,
  detail TEXT
);
```

### 7.1 Record lifecycle

```
register → PENDING (in the open batch)
seal     → SEALED   (root computed, leaf_index assigned)
publish  → ANCHORED (every anchor required by ANCHOR_MODE has succeeded; proof available)
```

- Proofs exist only for `ANCHORED` records. A proof request for a pending record returns `409 NOT_ANCHORED`.
- Records are **never deleted or edited**. There is no delete route.
- If **any** required anchor (ledger or Ethereum) is down at seal time, the batch stays `sealed`. `POST /api/batches/:id/retry-anchor` is safe to repeat: the ledger anchor is idempotent, and the Ethereum publisher calls `find(batchId)` first and treats an existing identical root as success.

### 7.2 Batching and duplicates

- One `open` batch exists at a time. A batch is sealed by the **Seal batch** button (manual, for reproducible demos). Optional env `AUTO_SEAL_AT=N` seals at N records. Maximum 1024 records per batch.
- Leaf order = `(created_at, id)` ascending, fixed at seal time.
- **Duplicate policy:** the same leaf hash is rejected with `409 DUPLICATE` and a link to the existing record. For Side 2, two *different* creators registering the same file produce different manifests, so both are accepted and shown together in the **competing claims** panel, ordered by anchor time. We show the conflict; we do not decide it.

---

## 8. API contract (FROZEN at hour 1)

Format: JSON. Errors: `{ "error": { "code": "…", "message": "…", "details": {} } }`. Write routes need `Authorization: Bearer $REGISTRY_API_TOKEN`, **except** `POST /api/manifests` (Side 2), which is protected by its Ed25519 signature check instead. Upload size limit 10 MB (`MAX_UPLOAD_BYTES`; hash-only registration is not limited because the file never leaves the browser). Allowed types: `application/pdf`, `image/png`, `image/jpeg`, `text/plain`, `application/json`.

### 8.1 Registry (`:4000`)

| Method & path | Body → Response | Notes |
|---|---|---|
| `GET /api/health` | → `{ ok, ai:{mode, ollama:boolean}, anchor:{reachable, head}, witness:{reachable, consistent}, chain:{mode, reachable, chainId, contract, count}, demoMode }` | Shown in the UI header |
| `POST /api/extract` | multipart `file` → `{ fields:[{key,value,confidence,source}], category:{label,confidence}, similar:[{recordId,score,kind}], aiPath }` | Does **not** store the file. `aiPath` ∈ `llm`, `rules`, `llm-invalid-fallback` |
| `POST /api/records` | multipart: `file`, `metadata` (JSON, confirmed), `confirmedBy`, `storeCopy` (bool) → `201 { recordId, leafHash, status:"pending", batchId }` | `422 NOT_CONFIRMED` if metadata or `confirmedBy` missing. `409 DUPLICATE` |
| `POST /api/manifests` | JSON `{ manifest, similarity?:{kind,value}, confirmedBy }` → `201 { recordId, leafHash, status:"pending", batchId }` | Server verifies the manifest signature and schema. `422 SIGNATURE_INVALID`. File bytes are **not** uploaded (hash-only) |
| `GET /api/records/:id` | → record JSON (no file bytes) | |
| `POST /api/records/:id/preview` | multipart `preview` (`image/jpeg`, ≤ `PREVIEW_MAX_BYTES`) + `X-Signature` header → `201 { previewUrl }` | Side 2: Ed25519 signature by the record's creator key over `"preview:" + recordId + ":" + sha256(previewBytes)`. Side 1: issuer token. `413`/`422` if too large or bad signature |
| `GET /api/records/:id/preview` | → `image/jpeg` with header `X-Not-Registered-File: true` | `404` if none. Private previews need the issuer token |
| `DELETE /api/records/:id/preview` | signed like upload → `204` | Deletes the preview only. **No route ever deletes a record** |
| `GET /api/records/:id/file` | issuer token → stored copy with `X-Content-SHA256` | Only when `storage_mode='copy'` |
| `GET /api/records/:id/proof` | → proof bundle (6.4) | `409 NOT_ANCHORED` until sealed and anchored |
| `GET /api/works/:workId` | → `{ versions:[{version, recordId, leafHash, parentLeaf, status, anchoredAt}] }` | Creation trail |
| `GET /api/claims?contentHash=…` | → `{ claims:[{recordId, creatorPub, displayName, anchoredAt, status}] }` | Competing claims, ordered by anchor time |
| `GET /api/batches` | → `[{ id, status, leafCount, root, anchorSeq, ethAnchorId, ethTxHash, sealedAt }]` | |
| `GET /api/batches/:id` | → `{ ...batch, records:[…], levels:["hex[]", …] }` | `levels` feeds the tree diagram |
| `POST /api/batches/seal` | → `200 batch` | `409 EMPTY_BATCH`. Publishes to the anchors required by `ANCHOR_MODE`. `502 ANCHOR_UNREACHABLE` (any required anchor) leaves the batch `sealed` |
| `POST /api/batches/:id/retry-anchor` | → batch | |
| `POST /api/audit` | → `{ ok, issues:[{code:"REGISTRY_DRIFT", kind, batchId, recordId?, expected, found}] }` | Section 12 |
| `GET /api/audit/latest` | → last audit result | |
| `POST /api/explain` | body = a `VerifyResult` → `{ text, aiPath:"llm"\|"template" }` | Sends only the result JSON. Output never contains a verdict of its own |
| *(DEMO_MODE only)* `POST /api/demo/tamper` | `{ action, target? }` → `{ ok, changed }` | Section 12.2 |
| *(DEMO_MODE only)* `POST /api/demo/reset` | → `{ ok }` | |

### 8.2 Anchor (`:4100`). Reads are public, CORS `*`. Writes need `X-Publish-Token`

| Method & path | Response |
|---|---|
| `POST /publish` `{ batchId, root, leafCount }` | `201 entry`, or `200 entry` if identical repeat, or `409 BATCH_ALREADY_ANCHORED`, or `401` |
| `GET /anchors/:seq` | entry or `404` |
| `GET /anchors?batchId=…` | entry or `404` |
| `GET /head` | `{ seq, entryHash }` |
| `GET /ledger` | all entries in order |
| `GET /pubkey` | `{ publicKey }` (informational only; verifiers use the **pinned** key) |

### 8.3 Witness (`:4200`)

| Method & path | Response |
|---|---|
| `GET /heads` | `[{ seenAt, seq, entryHash }]` |
| `GET /entries/:seq` | `{ seq, entryHash, firstSeenAt }` or `404` |
| `GET /status` | `{ consistent: boolean, lastSeq, issues:[{kind:"FORK"\|"ROLLBACK"\|"BAD_SIGNATURE", seq}] }` |

The witness polls the anchor `/ledger` every 5 seconds. For each new entry it checks signature (pinned key), hash recomputation and `prevHash` linkage, then appends to its **own** file. If the anchor later shows a different `entryHash` for a seq the witness already holds, or a shorter ledger, the witness records `FORK` or `ROLLBACK`.

### 8.3b Ethereum chain (`:8545`, JSON-RPC)

Read-only from the verifier's point of view: `eth_chainId` and `eth_call` against the pinned contract (section 20.6). Writes come only from the registry's publisher key (`ethPublisher.ts`).

### 8.4 Error codes

`VALIDATION_ERROR`, `UNAUTHORIZED`, `NOT_CONFIRMED`, `DUPLICATE`, `SIGNATURE_INVALID`, `EMPTY_BATCH`, `NOT_ANCHORED`, `NOT_FOUND`, `ANCHOR_UNREACHABLE`, `FILE_TOO_LARGE`, `UNSUPPORTED_TYPE`, `BATCH_ALREADY_ANCHORED`, `STORAGE_MISMATCH`, `PREVIEW_TOO_LARGE`.

---

## 9. Verifier specification (FROZEN at hour 1)

### 9.1 Interface

```ts
interface AnchorReader  { getEntry(seq: number): Promise<AnchorEntry | null>; }  // throws AnchorUnreachableError
interface WitnessReader { getEntry(seq: number): Promise<{ seq: number; entryHash: string } | null>; }

verifyBundle(input: {
  documentBytes: Uint8Array;        // the file the person holds
  bundle: unknown;                  // untrusted JSON
  anchor: AnchorReader;
  witness?: WitnessReader;          // optional, adds one extra check
  pinnedAnchorPublicKey: string;    // hex, from build/config/CLI flag, NEVER from the bundle
}): Promise<VerifyResult>
```

Implementations of `AnchorReader`: `HttpAnchorReader(baseUrl)`, `StaticAnchorReader(entries)` (offline, pasted JSON), and later optionally a Hardhat reader.

### 9.2 Steps, in order (stop at the first failure; mark the rest `skipped`)

| Step id | Check | Fails with |
|---|---|---|
| `S1_PARSE` | Bundle shape: `format` string, hex fields are 64 chars, `side` ∈ `L/R`, `0 ≤ leafIndex < leafCount`, `path.length == expectedPathLength(leafIndex, leafCount)`, `manifest` present iff kind is `manifest` | `PROOF_INVALID` |
| `S2_LEAF` | Recompute the leaf from `documentBytes` (file kind) or from the manifest (manifest kind: also `sha256(documentBytes) == manifest.fileHash`). Compare with `bundle.leafHash` | `DOC_MODIFIED` |
| `S3_ROOT` | Fold the **recomputed** leaf through `path` to get a root | (internal) |
| `S4_ANCHOR_FETCH` | `anchor.getEntry(bundle.anchor.seq)` | `ROOT_NOT_FOUND` (null), `ANCHOR_UNREACHABLE` (network) |
| `S5_ANCHOR_AUTH` | Recompute `entryHash`; Ed25519-verify `sig` with the **pinned** key; fetch entry `seq−1` and check `prevHash` linkage (and its signature); `entry.batchId == bundle.batchId`, `entry.leafCount == bundle.leafCount` | `ANCHOR_INVALID`, or `ROOT_MISMATCH` if batch or count differ |
| `S6_ROOT_COMPARE` | Root from S3 equals `entry.root` | `ROOT_MISMATCH` |
| `S7_WITNESS` | If a witness is configured and reachable: its `entryHash` for `seq` equals the anchor's. Unreachable witness is a **warning**, not a failure | `WITNESS_MISMATCH` |
| `S8_SIGNATURE` | Manifest kind only: Ed25519 signature over the signing bytes (6.5) verifies with `manifest.creator.publicKey` | `SIGNATURE_INVALID` |

The verdict is computed from the S-steps only.

### 9.3 Failure codes

| Code | Verdict | Meaning | Demo trigger |
|---|---|---|---|
| `OK` | VALID | All checks passed | genuine file + genuine proof |
| `DOC_MODIFIED` | INVALID | The document no longer hashes to the leaf recorded in the proof | flip one byte of the file |
| `PROOF_INVALID` | INVALID | The proof is malformed: wrong length, bad hex, bad side, index out of range | delete one path step |
| `ROOT_MISMATCH` | INVALID | The proof is well-formed but does not lead to the anchored root (or belongs to a different batch) | edit one path hash, or flip a side |
| `ROOT_NOT_FOUND` | INVALID | The anchor has no such entry | set `anchor.seq` to 999 |
| `ANCHOR_INVALID` | INVALID | The anchor entry's hash, signature or chain link fails | edit `ledger.jsonl` |
| `WITNESS_MISMATCH` | INVALID | The anchor's history differs from the witness's independent copy | edit **and re-sign** the ledger |
| `SIGNATURE_INVALID` | INVALID | The creator's signature on the manifest does not verify | unit test only |
| `ANCHOR_UNREACHABLE` | INCONCLUSIVE | Could not fetch the anchor. This is **not** a pass | stop the anchor |

**Honest note on `DOC_MODIFIED`:** it means "this document and this proof do not belong together". Editing the proof's `leafHash` looks identical to editing the document, and the verifier cannot tell which one changed from its inputs. Say that in the explanation text; do not claim to know which was altered.

**Registry audit code (not a verifier code):** `REGISTRY_DRIFT`, produced by `apps/registry/services/audit.ts` (section 12).

### 9.4 Result shape

```ts
interface VerifyResult {
  verdict: 'VALID' | 'INVALID' | 'INCONCLUSIVE';
  code: Code;                                   // 'OK' when valid
  steps: { id: string; label: string; status: 'pass'|'fail'|'skipped'|'warn'; detail?: string }[];
  warnings: string[];                           // e.g. "No witness confirmation"
  registration?: { batchId: string; seq: number; anchoredAt: string; root: string };
  attribution?: { kind: 'none' | 'signed'; publicKey?: string; signatureValid?: boolean };
  message: string;                              // from messages.ts template table
}
```

### 9.5 Three-line output (`threeLine.ts`). Used on every verify screen

| Line | Passing text | Failing / other |
|---|---|---|
| **Integrity** | ✅ "Matches the registered record" | ❌ code + template message |
| **Registration** | ✅ "Batch b-0007 · anchor #7 · anchored 2026-10-11 09:00 UTC (anchor-asserted time)" | ❌ / ⚪ "Could not reach the anchor" |
| **Attribution** | ℹ️ file kind: "No creator signature in this record. Authorship is not established." · manifest kind: "Signed by key 03a1…31b8 (signature valid). The key holder's identity is not verified." | ❌ "Signature invalid" |

**UI language rules.** The attribution line is **never green**. Never use the words *authentic, genuine, original, proof of ownership* anywhere in the UI. Use *matches the registered record* and *evidence*.

### 9.6 Where the verifier runs

- **Browser (`/verify`):** drop the file, drop `*.pcproof.json`, press Verify. It fetches only from the anchor (`:4100`) and witness (`:4200`). The anchor public key comes from `generated/anchorPub.ts` (pinned at setup time). An **Offline mode** box accepts a pasted anchor entry JSON and uses `StaticAnchorReader`.
- **CLI:** `npm run verify -- <file> <proof.json> [--anchor URL] [--witness URL] [--pub HEX] [--entry entry.json]`. Prints each step with ✓/✗. Exit code `0` valid, `1` invalid, `2` inconclusive or usage error.
- **Library:** `import { verifyBundle } from '@proofchain/verifier'`. Third parties could embed it.

**Pinned-key limitation (state it):** the first trust in the anchor's public key is established out of band (setup writes it into the build). A real deployment would publish the key through an independent channel.

---

## 10. AI module (`packages/ai`, used only by the registry)

The brief requires AI to be used **meaningfully** and the demo to work **without external AI services**. Our design: a deterministic and classical-ML tier that always works, plus an optional local LLM tier.

### 10.1 What AI does

| # | Task | Input → Output | Tier 1 (always works) | Tier 2 (optional) | Human gate |
|---|---|---|---|---|---|
| A1 | **Metadata extraction** | file text → `{issuer, documentDate, documentType, title, parties, referenceNo}` each with `confidence` and a `source` snippet | Regex and keyword rules | Ollama in JSON mode, validated with zod | Confirm form. Server refuses to register without `metadata` and `confirmedBy` |
| A2 | **Category suggestion** | extracted text → top-3 labels with probabilities | Multinomial **Naive Bayes** trained on `trainingSet.json` (~60 fictional labelled examples) | none needed | Shown as a chip the user accepts or changes |
| A3 | **Near-duplicate advisory** | text SimHash or image dHash → list of similar registered records | 64-bit SimHash over 3-word shingles; dHash computed in the browser; Hamming distance | none | Advisory banner only. Never blocks registration |
| A4 | **Failure explainer** | `VerifyResult` JSON → 2–4 plain sentences | `messages.ts` template table | Ollama paraphrase of the template | Shown under a label: *"Explanation (AI-assisted, not part of verification)"* |

### 10.2 Rules for AI output

1. **Unsupported items are dropped.** An extracted field without a source snippet from the document is discarded (it cannot be verified by a person).
2. **Record the path.** Every suggestion stores `aiPath` ∈ `llm | rules | llm-invalid-fallback`, so we can say which path produced it.
3. **Schema-validate LLM output** (zod). Invalid, empty or timed-out (8 s) output falls back to Tier 1 silently. The UI shows a small "rules mode" chip.
4. **Explainer guard (`guard.ts`).** Reject LLM text that: contains *authentic, genuine, proves, forged, fraud, tampered by, hacked*; exceeds 600 characters; or states a verdict different from `VerifyResult.verdict`. On rejection, use the template. The explainer **receives** the verdict. It never produces one.
5. **No AI imports in `core` or `verifier`.** Enforced by the purity check.
6. **No document text leaves the machine.** Ollama runs locally. If anyone adds a hosted API, it must be behind `AI_MODE` and off by default.
7. Store the AI suggestion next to the human-confirmed value (`ai_suggestion_json` vs `metadata_json`). The record page shows "edited by human" where they differ.

### 10.3 Ollama setup (optional)

```bash
ollama pull qwen2.5:3b          # or llama3.2:3b
# Registry calls POST http://localhost:11434/api/generate
# body: { model, prompt, format: "json", stream: false, options: { temperature: 0 } }
```

`AI_MODE=auto` uses Ollama if the 30-second health check passes, otherwise rules. `AI_MODE=rules` forces Tier 1 (use this for the offline demo).

### 10.4 Evaluation we will report honestly

- A2: 80/20 split of `trainingSet.json`, report accuracy and confusion on the held-out 20%.
- A3: pick 6 sample pairs (identical, one-line change, unrelated) and report the distances and chosen thresholds. Starting points: text Hamming ≤ 6 "very similar", ≤ 12 "similar"; image dHash ≤ 10. Tune on the samples, then freeze.
- A1: 5 sample documents, count fields correct, missing and wrong. Put the table in the README, including misses.

---

## 11. Web app

### 11.1 Design tokens (`tailwind.config.ts`). Reuses the CreatorProof palette

| Token | Hex | Use |
|---|---|---|
| `ink` | `#00171F` | Primary text, dark surfaces |
| `ink-deep` | `#000B0F` | Certificate background |
| `slate` | `#66747A` | Secondary text, timestamps |
| `cerulean` | `#007EA7` | Primary buttons, Side 1 accent |
| `sky` | `#00A8E8` | Links, highlights, Side 2 accent |
| `deep` | `#003459` | Headers, cards on dark |
| `silver` | `#D4DEE2` | Borders |
| `success` | `#1E8F53` | **Integrity and registration lines only** |
| `danger` | `#D93838` | Failures |
| `warn` | `#DD8E4B` | Warnings, advisory flags |
| `info` | `#007EA7` | **Attribution line** (never green) |

Fonts: Plus Jakarta Sans (UI), JetBrains Mono (hashes, keys, JSON). Spacing scale 4/8/16/24/32/48. Radii 8/12/16/24. Dark mode is optional and not a priority.

### 11.2 Routes and pages

| Route | Side | Purpose | Key API / lib |
|---|---|---|---|
| `/` | both | Landing: two cards ("Registry & Verification" and "CreatorProof"), health strip (anchor/witness/AI status) | `GET /api/health` |
| `/verify` | both | **Public verifier.** Drop file + proof, 3-line result, step list, AI explainer panel, offline mode | `packages/verifier` + anchor + witness |
| `/proofchain` | 1 | Dashboard: batch count, record count, anchor head, last audit result | batches, audit |
| `/proofchain/register` | 1 | Multi-file drop → per-file AI extraction card → confirm form → add to open batch | `/api/extract`, `/api/records` |
| `/proofchain/batches` | 1 | List, **Seal batch** button, status chips | batches |
| `/proofchain/batches/:id` | 1 | **Merkle tree diagram**, anchor entry, records table, download proofs | batch detail |
| `/proofchain/records/:id` | 1 | Metadata (AI suggestion vs confirmed), download `.pcproof.json`, "verify this" link | record, proof |
| `/proofchain/audit` | 1 | Run registry audit, list `REGISTRY_DRIFT` issues | `/api/audit` |
| `/proofchain/tamper-lab` | 1 | DEMO_MODE only: tamper buttons and reset | `/api/demo/*` |
| `/creator` | 2 | Home: key setup (create/import/export), explainer, recent works | `creatorKey.ts` |
| `/creator/new` | 2 | Wizard (below) | manifests |
| `/creator/works` | 2 | My works with status (pending / anchored) | batches, records |
| `/creator/works/:id` | 2 | **Creation trail** timeline + competing-claims panel | `/api/works`, `/api/claims` |
| `/creator/certificate/:id` | 2 | Printable certificate + QR + three-line status | proof + verifier |
| `/creator/for-platforms` | 2 (stretch) | Business view: verify API snippet, embeddable badge | static |

### 11.3 Components (`apps/web/src/components`)

`Hash` (monospace, truncated, copy button) · `FileDrop` · `HashProgress` · `ConfirmMetadataForm` (confidence chips, source-snippet tooltip, "I have reviewed these values" checkbox, disabled submit until ticked) · `AiPathChip` · `VerdictBanner` · `ThreeLineResult` · `StepList` · `MerkleTree` (SVG, section 11.4) · `BatchCard` · `AnchorBadge` · `TrailTimeline` · `ClaimsPanel` · `AdvisoryBanner` · `Certificate` · `QrCode` · `DemoModeBanner` · `HealthStrip` · `IssuerAccessBox` (types the issuer access code once, kept in `sessionStorage`).

### 11.4 Merkle tree diagram (`MerkleTree.tsx`)

Hand-written SVG, no chart library. Input: `levels` from the batch detail API. Leaves at the bottom, root at the top, 6-hex-character labels (full hash on hover). Clicking a record highlights its **proof path**: the record's leaf and ancestors in cerulean, the sibling hashes in the path outlined in sky, and a side panel listing each fold `nodeHash(sibling, current)`. Promoted odd nodes are drawn with a dashed link and the label "promoted". This diagram is the best visual in the demo, so give it time.

### 11.5 Side 2 wizard (`/creator/new`)

1. **File.** Hash locally with `@noble/hashes` (progress bar). Compute dHash (images) or send text for SimHash. Query `/api/claims?contentHash=` and `/api/extract` for similar works. If another claim exists, show the `ClaimsPanel` warning *now*.
2. **Details.** Title, description, category (A2 suggestion chip), tags.
3. **License.** Five options. `CUSTOM` requires text.
4. **Version.** "New work" or "New version of …" (sets `workId`, `version`, `parentLeaf`).
5. **Review and sign.** Show the exact canonical manifest JSON and the signing key fingerprint. Press **Sign**. The browser signs with the creator key. The private key never leaves the browser.
6. **Submit** to `/api/manifests`. Status becomes *pending*. A **Seal now (demo)** button (issuer access required) seals the batch. After anchoring, the certificate becomes available.

### 11.6 Certificate wording (fixed text, do not improvise)

> *"This certificate states that a record matching the file hash below was registered in batch {batchId} and anchored as entry #{seq} at {time} (anchor-asserted time). It does not establish who created the work or that its contents are true. Verify independently at {origin}/verify."*

QR content: `{WEB_ORIGIN}/verify?record={recordId}`. The verify page fetches the bundle from the registry (untrusted, see 4.3) and asks the person to drop the file. If the bundle is under ~2 KB it may also be embedded as `/verify#bundle={base64url}` so it works without the registry.

### 11.7 Creator key handling (be honest in the UI)

`ed25519.utils.randomPrivateKey()` → stored in `localStorage` as `cp.key` with an **Export key** button (JSON file) and **Import key**. Permanent warning chip: *"Demo-grade key storage. Losing this key means you cannot add new versions. Do not use for real work."* A key is not an identity.

---

## 12. Registry audit and tamper lab

### 12.1 Registry audit (`apps/registry/src/services/audit.ts`)

For every `anchored` batch, fetch its anchor entry and compare:

| Issue kind | Detected when |
|---|---|
| `ROOT_DRIFT` | Root rebuilt from the leaf hashes **in the DB** ≠ anchor root |
| `DB_ROOT_DRIFT` | `batches.root` ≠ anchor root |
| `COUNT_DRIFT` | Number of records in the batch ≠ anchor `leafCount` |
| `LEAF_DRIFT` | A manifest record's stored text re-hashes to something other than `leaf_hash` |
| `CONTENT_DRIFT` | A stored file copy re-hashes to something other than `leaf_hash` / `content_hash` |
| `ANCHOR_REF_DRIFT` | The stored `anchor_entry_json` differs from what the anchor serves |

Result code for any issue: **`REGISTRY_DRIFT`**, listing `kind`, `batchId`, `recordId`, `expected`, `found`. The audit page shows red rows with expected vs found hashes. The audit runs on button press and on registry start-up.

### 12.2 Tamper lab (DEMO_MODE only; routes not mounted otherwise)

| Button | What it does | Expected result |
|---|---|---|
| Change a batch root in the DB | Overwrites `batches.root` | Audit → `DB_ROOT_DRIFT`. **Verifier still passes genuine docs** because it reads the anchor |
| Change a leaf hash in the DB | Overwrites `records.leaf_hash` | Audit → `ROOT_DRIFT` |
| Delete a record from the DB | Removes a row | Audit → `COUNT_DRIFT` |
| Flip one byte of a stored file | Modifies `data/files/…` | Audit → `CONTENT_DRIFT` |
| Download a tampered proof | Browser-side edit of a path hash or side | Verify → `ROOT_MISMATCH` |
| Download a tampered document | Browser-side flip of one byte | Verify → `DOC_MODIFIED` |
| Restore | Restores `registry.db.bak` taken before the first tamper | Clean state |

**Anchor tampering is done from a terminal, not from the registry,** because the registry must not have write access to `anchor-data/` (that is the point of R4):

```bash
npm run demo:tamper -- anchor-edit        # edits a root in ledger.jsonl            → ANCHOR_INVALID
npm run demo:tamper -- anchor-resign      # edits AND re-signs with the anchor key  → WITNESS_MISMATCH
npm run demo:tamper -- anchor-restore     # restores ledger.jsonl.bak
```

`anchor-resign` simulates a **compromised anchor**. It passes the anchor signature check and is caught only by the witness's independent copy. That is the justification for having a witness.

---

## 13. Demo data and demo script

### 13.1 Fictional seed data (`npm run seed`)

- **Batch b-0001 (Side 1):** 5 PDF certificates, e.g. *"Aarambh Institute of Fictional Studies. Certificate of Completion"* for fictional names. Generated with `pdf-lib`. **Set creation date, modification date, producer and creator explicitly** (`setCreationDate(new Date('2026-01-01T00:00:00Z'))` etc.) so the bytes, and therefore the hashes, are identical on every machine.
- **Batch b-0002 (Side 2):** 2 fictional creators. Creator A has a 3-version work (draft → revision → final). Creator B registers the **same image** as Creator A's final work later (the competing-claims demo). Plus 1 unrelated work.
- `samples/tamper/` holds pre-made tampered copies for quick demos.
- No real names, no real institutions, no real documents anywhere.

### 13.2 Five-minute demo script

| Min | Action | What to say |
|---|---|---|
| 0:00 | Landing page, health strip all green | "One engine, two markets. A registry anyone can verify without trusting it." |
| 0:30 | Side 1 → Register 5 certificates. Show AI extraction and the confirm screen. Seal batch | "AI suggests metadata, a person confirms it, AI never touches verification. One root is anchored for all five." |
| 1:15 | Batch page: Merkle tree, click a record, show the proof path | "Each record has a short proof. No need to download the registry." |
| 1:45 | `/verify`: drop a certificate + its proof → three lines, all steps ✓. Open DevTools network tab | "Only the anchor and witness are contacted. Never the registry." |
| 2:15 | Tamper: flip one byte → `DOC_MODIFIED`. Edit a proof hash → `ROOT_MISMATCH`. Click **Explain** | "Each failure has its own reason code and a plain-language explanation." |
| 2:45 | Tamper lab: change the DB root. Re-verify a genuine file: **still passes**. Run audit → `REGISTRY_DRIFT` | "The registry can lie to itself. It cannot lie to the verifier." |
| 3:15 | Terminal: `anchor-resign` → `WITNESS_MISMATCH` | "Even a compromised anchor is caught by an independent witness." |
| 3:40 | Side 2: creator signs a new version, seal, open certificate + QR. Show the trail and the competing-claims panel | "Same engine, creator-facing. We show evidence, we don't decide disputes." |
| 4:30 | Limits slide | "We prove integrity and priority of registration. Not authorship, not truth." |

### 13.3 Failure plan

1. `npm run seed` restores the exact demo state in about 10 seconds.
2. `AI_MODE=rules` for the stage demo. Ollama only if rehearsed twice.
3. A 90-second screen recording as backup, made at hour 11.
4. A second laptop with the same repo and seeded state.
5. If a judge's input differs: the verifier works on **any** file and proof, so invite them to bring their own file. Register it live and tamper it.

---

## 14. Team roles, ownership and schedule

### 14.1 Ownership by directory

| | Role | Owns | Reads/uses | "Done" means |
|---|---|---|---|---|
| **P1** | Crypto & Verifier lead | `packages/core`, `packages/verifier`, `apps/verifier-cli`, `scripts/checkVerifierPurity.ts`, `scripts/demoTamper.ts`, `apps/web/src/lib/creatorKey.ts` | | All vectors pass, every failure code reproducible in the CLI, purity check green |
| **P2** | Anchor & Registry lead | `apps/anchor`, `apps/witness`, `apps/registry` (except `routes/ai.ts`, `manifests.ts`, `works.ts`, `claims.ts`), `scripts/setup.ts`, `scripts/resetDemo.ts` | `packages/core` | Register → seal → anchor → proof works. Audit finds each drift kind |
| **P3** | AI & Side-2 backend | `packages/ai`, `apps/registry/routes/{ai,manifests,works,claims}.ts`, `scripts/seed.ts`, `samples/` | `packages/core` | Extraction, categorizer, similarity, explainer (with guard) all work in rules mode. Seed data deterministic |
| **P4** | Web lead | `apps/web` (except `lib/creatorKey.ts`), repo scaffold, `README.md`, slides | everything via the API | All pages in section 11.2 exist and match the demo script |

Shared files (root `package.json`, `.env.example`, this guide) change **only by PR** reviewed by one other person.

### 14.2 Interface-first rule

Within the **first 30 minutes** P1 commits `packages/core/src/types.ts` and stub functions (throwing `not implemented`) matching sections 6–9. P2, P3 and P4 code against those signatures immediately. P4 builds pages against **fixture JSON** shaped like section 8 until the real endpoints exist.

### 14.3 Hour-by-hour

| Hours | P1 | P2 | P3 | P4 |
|---|---|---|---|---|
| **0–1** | Freeze types and stubs; vectors test file (failing) | Anchor skeleton | `packages/ai` skeleton; start `trainingSet.json` | **Monorepo scaffold**, Vite, Tailwind, router, tokens, `npm run dev` runs all 4 processes |
| **1–3** | `canonical`, `hash`, `merkle` | Anchor ledger, keys, routes; witness poller | Rules extractor, `textFromFile`, Naive Bayes, SimHash | Layout, Landing, API client with fixtures, base components |
| **3–6** | `bundle`, `anchorEntry`, `manifest`, verifier steps, CLI, adversarial tests | Registry DB, records, batching/seal, proof service, anchor client | `/api/extract`, `/api/explain` + guard, manifests, works, claims routes | Register + ConfirmMetadataForm, Batches, BatchDetail + MerkleTree, Record |
| **6–8** | Browser verify integration with P4; `demoTamper.ts` | Audit, tamper-lab API, health; witness status | Ollama path, similarity wired in, `seed.ts` | `/verify` page, Audit, TamperLab |
| **8–11** | Creator key + browser signing; trail verification | Retry-anchor, edge cases, witness in verify; **stretch: Hardhat adapter** | Seed batch 2, competing claims data, evaluation numbers | Creator pages: NewWork wizard, Works, WorkDetail, Certificate + QR |
| **11–12** | **Freeze.** Bug fixes only. README, 2 rehearsals, fresh-clone test, backup video | | | |

### 14.4 Gates

| Gate | Time | Must be true | If missed |
|---|---|---|---|
| **G0** | 1:00 | `npm run dev` starts web + registry + anchor + witness, health strip shows 4 green (stubs allowed). Types frozen | Fix before anything else |
| **G1** | 3:00 | All core vectors pass. Anchor chains entries. Rules extractor returns fields on a sample | P1 and P2 pair up |
| **G2** | 6:00 | End to end in the CLI: register → seal → anchor → proof → `OK`. Tamper cases for `DOC_MODIFIED`, `ROOT_MISMATCH`, `ANCHOR_INVALID`, `REGISTRY_DRIFT` give the right codes | Everyone helps P1/P2; Side 2 work pauses |
| **G3** | 8:00 | Side 1 complete in the browser including verify page, audit, tamper lab | **Side 2 shrinks to certificate page + slide.** Stretch adapter cancelled |
| **G4** | 11:00 | **Feature freeze** | No new code except fixes |

### 14.5 Git workflow

- `main` is always runnable after G0. Branches: `p1/core-merkle`, `p2/anchor`, etc. Short-lived, merge at least hourly.
- Small PRs, one reviewer from another role. Never force-push `main`. Rebase before merging.
- Commit prefixes: `core:`, `verifier:`, `anchor:`, `witness:`, `registry:`, `ai:`, `web:`, `docs:`, `scripts:`.
- Do not commit `data/`, `anchor-data/`, `witness-data/`, `.env`, `node_modules/`.
- 10-minute stand-up every 90 minutes: done, blocked, next. Blockers go in one shared list.
- Do not reformat files you do not own.

---

## 15. Setup, run and configuration

### 15.1 First run

```bash
git clone <repo-url> proofchain && cd proofchain
npm install
npm run setup        # creates anchor key, publish token, registry token, pinned public key, .env
npm run seed         # fictional data, 2 batches   (optional)
npm run dev          # web :5173, registry :4000, anchor :4100, witness :4200
```

Open `http://localhost:5173`. `setup` prints the **issuer access code** (the registry token). Paste it into the Issuer Access box once.

### 15.2 Root scripts

| Script | Does |
|---|---|
| `npm run dev` | Starts all four processes with `concurrently` |
| `npm run setup` | One-time key and `.env` generation |
| `npm run seed` | Generates deterministic fictional data and seals 2 batches |
| `npm run reset` | Wipes `data/`, `anchor-data/`, `witness-data/` |
| `npm run verify -- <file> <proof>` | CLI verifier |
| `npm run demo:tamper -- <case>` | Runs a tamper case and prints the verdict |
| `npm test` | Vitest across all workspaces |
| `npm run check:purity` | Verifier/core import rules (section 16.2) |
| `npm run lint` | ESLint + Prettier check |

### 15.3 Environment variables (`.env.example`)

| Variable | Default | Meaning |
|---|---|---|
| `REGISTRY_PORT` / `ANCHOR_PORT` / `WITNESS_PORT` | 4000 / 4100 / 4200 | |
| `WEB_ORIGIN` | `http://localhost:5173` | CORS for the registry; QR origin |
| `ANCHOR_URL` / `WITNESS_URL` | `http://localhost:4100` / `:4200` | |
| `ANCHOR_PUBLISH_TOKEN` | generated | Shared secret between registry and anchor |
| `REGISTRY_API_TOKEN` | generated | The issuer access code |
| `DATA_DIR` / `ANCHOR_DATA_DIR` / `WITNESS_DATA_DIR` | `./data` / `./anchor-data` / `./witness-data` | Must be three different folders |
| `DEMO_MODE` | `true` | Mounts tamper-lab routes and shows the banner |
| `AI_MODE` | `auto` | `auto`, `rules`, or `ollama` |
| `OLLAMA_URL` / `OLLAMA_MODEL` | `http://localhost:11434` / `qwen2.5:3b` | |
| `AUTO_SEAL_AT` | `0` | `0` = manual sealing only |

**Token note:** `POST /api/manifests` (Side 2) is the one write route that does **not** need the issuer token, because the manifest's Ed25519 signature is checked server-side. All Side 1 write routes and sealing need the token.

### 15.4 Troubleshooting

| Problem | Fix |
|---|---|
| `better-sqlite3` fails to install | Use Node 20/22 LTS; on Windows install build tools; else switch `db/index.ts` to `node:sqlite` |
| Port already in use | Change the port in `.env`; `ANCHOR_URL` must match |
| Verifier says `ANCHOR_UNREACHABLE` | Anchor not running, or CORS/URL mismatch |
| `ANCHOR_INVALID` on a fresh setup | The pinned public key in `generated/anchorPub.ts` is from an older `setup`. Re-run `npm run setup` and restart |
| Hashes differ between laptops | Not using the seed's fixed PDF metadata, or a line-ending change in a text sample. Add `samples/** -text` to `.gitattributes` so Git never rewrites sample bytes |
| `pdf-parse` tries to open a test file | Import `pdf-parse/lib/pdf-parse.js` |

---

## 16. Testing

### 16.1 Required automated tests

| Area | Tests |
|---|---|
| **core / vectors** | Every vector in 6.7 |
| **core / canonical** | Key order, NFC, float rejection, duplicate keys after NFC, nested arrays |
| **core / merkle** | For n = 1…33: every index's proof verifies; `proofFor` length equals `expectedPathLength`; promoted-leaf proofs; flipping any bit of leaf, path or root fails; second-preimage attempt (internal node submitted as a leaf) fails thanks to domain separation |
| **verifier** | One test per code in 9.3 using `StaticAnchorReader` and a fake witness. Plus: uppercase hex rejected, wrong `batchId`, wrong `leafCount`, `side` flipped, empty path with n > 1, index out of range, replay of a valid bundle against a different seq |
| **anchor** | Chain links; idempotent republish; `409` on a changed root; refuses to boot with a corrupted ledger; rejects missing token |
| **witness** | Detects `FORK` (same seq, different hash) and `ROLLBACK` (shorter ledger); ignores a bad signature |
| **registry (supertest)** | Register → seal → proof → verify OK; unconfirmed metadata `422`; duplicate `409`; manifest with a bad signature `422`; anchor down leaves batch `sealed` and retry succeeds; audit flags each drift kind after a DB edit |
| **ai** | Extractor returns only fields that have a source; Naive Bayes holdout accuracy computed; guard rejects "authentic", over-length text and a contradicting verdict; Ollama down → rules fallback with `aiPath: "rules"` |

### 16.2 Verifier purity check (`scripts/checkVerifierPurity.ts`, also an ESLint rule)

Fails the build if any file in `packages/core` or `packages/verifier`:

- imports anything other than relative paths, `@noble/hashes`, `@noble/curves`, and (verifier only) `@proofchain/core`;
- imports `@proofchain/ai`, anything under `apps/`, `express`, `better-sqlite3`, `zod`, or any Node built-in (`node:*`, `fs`, `path`, `crypto`), because the verifier must run in the browser;
- contains the strings `ollama`, `openai`, `anthropic`, `llm` (case-insensitive).

Run it in `npm test`. On stage: *"The verifier has a build-time rule that it cannot import AI, the registry or the database."*

### 16.3 Manual checklist (run at hours 6, 8 and 11)

- [ ] Fresh clone → `setup` → `seed` → `dev` works on a second laptop
- [ ] Genuine file + proof → `OK` with the network tab showing only `:4100` and `:4200`
- [ ] Every row of the tamper table gives the expected code
- [ ] Anchor stopped → `ANCHOR_UNREACHABLE` (inconclusive, not pass); offline paste mode works
- [ ] Wi-Fi off → everything still works (`AI_MODE=rules`)
- [ ] No UI text says *authentic*, *genuine*, *original* or *proof of ownership*
- [ ] Certificate shows the fixed disclaimer
- [ ] Confirm screen cannot be skipped (try it)

---

## 17. Definition of done, claims and judge Q&A

### 17.1 Definition of done

- [ ] All 11 requirement rows in section 2 demonstrable live
- [ ] Verifier works with the registry **stopped**
- [ ] Verifier passes genuine documents and rejects tampered ones **while the DB is altered**
- [ ] 5 distinct failure codes shown, each with a plain-language explanation
- [ ] Audit detects registry drift
- [ ] AI used for extraction, classification, similarity and explanation, with a human confirm step and a rules fallback
- [ ] Purity check green
- [ ] Both sides share one registry, one anchor and one verifier
- [ ] README includes the trust model, the limits and the honest AI evaluation numbers
- [ ] Fictional data only
- [ ] Demo rehearsed twice, backup video recorded

### 17.2 Claims we make, and claims we never make

| We say | We never say |
|---|---|
| "Matches the registered record" | "Authentic", "genuine", "original" |
| "Registered and anchored at {time}" | "Proves who created it" |
| "Attribution evidence: signed by key …" | "Proves ownership" |
| "Tamper-evident" | "Tamper-proof" or "immutable" |
| "The anchor and witness are outside the registry's write path" | "Blockchain-secured" (we run local processes) |
| "AI assists; people confirm" | "AI verifies" |
| "Anchor-asserted time" | "Trusted timestamp" |

### 17.3 Likely judge questions

| Question | Answer |
|---|---|
| Why can't the registry cheat? | Roots live in the anchor, a separate process with its own key and files. The verifier reads only the anchor and never the registry DB. A rewrite by the registry is invisible to verification and visible to the audit |
| What if the anchor is compromised? | The witness keeps an independent copy and flags forks and rollbacks. We demonstrate this with `anchor-resign` |
| What if the witness is compromised too? | Then you need more independent witnesses or a public chain. Our `AnchorReader` interface supports swapping the anchor without touching the verifier |
| Is this a blockchain? | It uses blockchain properties (append-only, signed hash chain, independent replication). The brief says no public chain is required. A Hardhat adapter is optional |
| What if someone registers a document that isn't theirs? | We prove registration, not authorship. Side 2 adds signatures, a version trail and a competing-claims panel as *evidence*, and the UI says so |
| What if someone registers my work first? | Their registration earns an earlier anchor time, and we say so. Your creation trail with earlier draft versions is the evidence a dispute would use. We show both claims and do not decide |
| What changes the hash? | Any byte change. Re-saving a PDF makes a new document. For structured JSON we canonicalize first. Near-duplicates are only an advisory warning |
| Why a Merkle tree? | One anchor entry covers a whole batch, and each record needs only a log₂(n)-length proof. Anchoring N documents costs one entry instead of N |
| Does AI affect the result? | No. The verifier cannot import AI (build-time check). AI extraction needs human confirmation, and the explainer is guarded and labelled |
| Where does the AI actually matter? | Extraction from messy documents, category classification, near-duplicate detection, plain-language failure explanations. Each has a deterministic fallback and a measured accuracy |
| What are the limits? | Single-machine demo, anchor-asserted time, pinned key trust bootstrap, no revocation, demo-grade key storage, raw-byte hashing for files |
| How would it make money? | Verification API for marketplaces, issuer plans per batch, white-label certificates for institutions. The cost advantage is one anchor per batch |

---

## 18. Risks and cut list

| Risk | Mitigation |
|---|---|
| `better-sqlite3` install failure | Test in hour 0; `node:sqlite` fallback behind one file |
| Browser/Node verifier output mismatch | One shared package; vectors run in Vitest for both Node and a jsdom/browser-like environment |
| Frontend too big for one person | P1 and P3 each own pages after G2/G3; fixtures let P4 start before the API exists |
| Side 2 eats Side 1's time | **G3 at hour 8.** Miss it and Side 2 shrinks to certificate + slide |
| Ollama slow or flaky | `AI_MODE=rules` is the default for the stage demo |
| Hash differences across laptops | Deterministic PDFs, `.gitattributes` for samples, hash in code only |
| Over-claiming | Section 17.2, and a final UI copy review at hour 11 |
| Scope creep | Section 1.3 non-goals. Anyone proposing a feature after G2 must name what they will cut |

**Cut order if time runs short** (cut from the top): 1) Hardhat adapter · 2) `/creator/for-platforms` · 3) image dHash similarity · 4) Ollama paths · 5) witness status UI polish · 6) trail visual polish · 7) competing-claims panel.

**Never cut:** core + vectors, verifier + failure codes, anchor + witness, registry audit, tamper demo, human confirm screen, purity check, honest-limits slide.

---

## Appendix A. Glossary

| Term | Meaning |
|---|---|
| **Leaf / root / proof** | A leaf is a document's hash in the tree. The root summarizes a whole batch. A proof is the sibling hashes needed to recompute the root from one leaf |
| **Anchor** | The separate service that publishes roots as a signed, hash-chained, append-only ledger |
| **Witness** | An independent process that keeps its own copy of the ledger and detects rewrites |
| **Bundle** | The `.pcproof.json` file a person carries with their document |
| **Manifest** | The signed JSON record Side 2 registers instead of a raw file |
| **Pinned key** | The anchor public key compiled into the verifier, never read from the bundle |
| **Drift** | A mismatch between what the registry database says and what the anchor published |
| **aiPath** | A record of whether a suggestion came from the LLM, the rules, or a fallback |

*Authored for the VORTEXA 3.0 team. Contract sections 6–9 change only by unanimous PR.*
