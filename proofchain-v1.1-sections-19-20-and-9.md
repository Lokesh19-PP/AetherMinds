# ProofChain v1.1 — Missing Sections (19, 20), Rewritten Section 9, and Consistency Patches

> The v1.1 header says sections 19 and 20 exist and that section 9 was rewritten for `readers[]`. In the pasted document, sections 19 and 20 were not in the body and section 9 still had the v1.0 single-`anchor` interface. This file contains all three, plus a list of small edits elsewhere so the whole guide agrees with itself.
>
> **How to apply:** paste section 19 and 20 after section 18 (before Appendix A), replace section 9 completely, then apply the patch list at the end.

---

## 9. Verifier specification (FROZEN at hour 1) — REPLACES the old section 9

### 9.1 Interface

```ts
// Ledger (signed hash chain) reader
interface LedgerReader   { getEntry(seq: number): Promise<AnchorEntry | null>; }   // throws AnchorUnreachableError
// Ethereum reader (raw JSON-RPC, no ethers)
interface ChainReader    { getAnchor(id: number): Promise<ChainAnchor | null>; }  // throws AnchorUnreachableError
interface WitnessReader  { getEntry(seq: number): Promise<{ seq: number; entryHash: string } | null>; }

interface ChainAnchor { batchKey: string; root: string; leafCount: number; timestamp: number } // hex without 0x

interface PinnedConfig {
  ledgerPublicKey: string;                       // hex, from build/config/CLI flag, NEVER from the bundle
  ethereum?: { chainId: number; contract: string; rpcUrls: string[]; blockTag: string };
}

verifyBundle(input: {
  documentBytes: Uint8Array;                     // the file the person holds
  bundle: unknown;                               // untrusted JSON
  readers: { ledger?: LedgerReader; ethereum?: ChainReader };
  witness?: WitnessReader;                       // optional, adds one extra check on the ledger
  pinned: PinnedConfig;
}): Promise<VerifyResult>
```

Implementations: `HttpLedgerReader(baseUrl)`, `StaticLedgerReader(entries)` (offline, pasted JSON), `EthereumReader(pinned.ethereum)` (multi-RPC, see 20.6).

### 9.2 Steps, in order

Steps S1–S3 run once. S4–S6 run **once per anchor reference** in `bundle.anchors[]` (step ids get a suffix: `S4_ANCHOR_FETCH:ledger`, `S4_ANCHOR_FETCH:ethereum`). Then S6B, S7 and S8 run once.

**Stop rule:** stop at the first failure in S1–S3 (mark the rest `skipped`). For S4–S6, run **every** anchor reference even if one fails, so the person sees which anchor failed.

| Step id | Check | Fails with |
|---|---|---|
| `S1_PARSE` | Bundle shape: `format`, hex fields are 64 lowercase chars, `side` ∈ `L/R`, `0 ≤ leafIndex < leafCount`, `path.length == expectedPathLength(leafIndex, leafCount)`, `anchors` has 1–2 entries with at most one per `kind`, `manifest` present iff kind is `manifest` | `PROOF_INVALID` |
| `S2_LEAF` | Recompute the leaf from `documentBytes` (file kind) or from the manifest (manifest kind: also `sha256(documentBytes) == manifest.fileHash`). Compare with `bundle.leafHash` | `DOC_MODIFIED` |
| `S3_ROOT` | Fold the **recomputed** leaf through `path` to get a root | (internal) |
| `S4_ANCHOR_FETCH:<kind>` | Ledger: `getEntry(anchors[].seq)`. Ethereum: `getAnchor(anchors[].id)` | `ROOT_NOT_FOUND` (null), `ANCHOR_UNREACHABLE` (network) |
| `S5_ANCHOR_AUTH:ledger` | Recompute `entryHash`; Ed25519-verify `sig` with the **pinned** key; fetch `seq−1`, check `prevHash` linkage and its signature; `entry.batchId == bundle.batchId`, `entry.leafCount == bundle.leafCount` | `ANCHOR_INVALID`, or `ROOT_MISMATCH` if batch or count differ |
| `S5_ANCHOR_AUTH:ethereum` | `eth_chainId` equals pinned chain id (every RPC); bundle's `chainId` and `contract` equal the pinned ones; `batchKey == keccak256(utf8(bundle.batchId))`; `leafCount` equals the bundle's | `ANCHOR_INVALID`, or `ROOT_MISMATCH` if batch or count differ |
| `S6_ROOT_COMPARE:<kind>` | Root from S3 equals that anchor's root | `ROOT_MISMATCH` |
| `S6B_CROSS_CHECK` | Only when two anchors were read: root, `leafCount` and batch binding are identical across both | `ANCHOR_DISAGREEMENT` |
| `S7_WITNESS` | If a witness is configured and reachable: its `entryHash` for the ledger `seq` equals the ledger's. Unreachable witness is a **warning** | `WITNESS_MISMATCH` |
| `S8_SIGNATURE` | Manifest kind only: Ed25519 signature over the signing bytes (6.5) verifies with `manifest.creator.publicKey` | `SIGNATURE_INVALID` |

### 9.2b Combining several anchors (the policy)

1. **A failure on any anchor is a failure.** If the ledger passes and Ethereum fails (or the other way around), the verdict is `INVALID` with the failing code. We never let one good anchor hide a bad one.
2. **Unreachable anchors are warnings, unless none was reachable.** If at least one anchor was fetched and passed all checks, and the other was unreachable, the verdict is `VALID` with a warning (*"Ethereum anchor could not be reached; relied on the ledger only"*). If **no** anchor could be fetched, the verdict is `INCONCLUSIVE` / `ANCHOR_UNREACHABLE`.
3. **Both anchors read and both pass their own checks, but they disagree** (different root, count or batch) → `ANCHOR_DISAGREEMENT`.
4. The bundle may carry one anchor only (when `ANCHOR_MODE` was `ledger` or `ethereum`). Then S6B is skipped.

### 9.3 Failure codes

| Code | Verdict | Meaning | Demo trigger |
|---|---|---|---|
| `OK` | VALID | All checks passed | genuine file + genuine proof |
| `DOC_MODIFIED` | INVALID | The document no longer hashes to the leaf recorded in the proof | flip one byte of the file |
| `PROOF_INVALID` | INVALID | The proof is malformed: wrong length, bad hex, bad side, index out of range, bad `anchors` list | delete one path step |
| `ROOT_MISMATCH` | INVALID | Well-formed proof that does not lead to an anchored root (or belongs to a different batch) | edit one path hash, or flip a side |
| `ROOT_NOT_FOUND` | INVALID | An anchor has no such entry | set `anchors[].seq` or `id` to 999 |
| `ANCHOR_INVALID` | INVALID | Ledger entry hash, signature or chain link fails; or the chain id, contract or batch binding differs from the pinned values | edit `ledger.jsonl`; point the bundle at another contract |
| `ANCHOR_DISAGREEMENT` | INVALID | The ledger and the Ethereum anchor are each readable but say different things | `npm run demo:tamper -- chain-reset` then re-seal one side (20.9) |
| `WITNESS_MISMATCH` | INVALID | The ledger's history differs from the witness's independent copy | edit **and re-sign** the ledger |
| `SIGNATURE_INVALID` | INVALID | The creator's signature on the manifest does not verify | unit test only |
| `ANCHOR_UNREACHABLE` | INCONCLUSIVE | No anchor could be fetched. This is **not** a pass | stop the anchor **and** the chain |

**Honest note on `DOC_MODIFIED`:** it means "this document and this proof do not belong together". Editing the proof's `leafHash` looks identical to editing the document, and the verifier cannot tell which one changed from its inputs. Say that in the explanation text.

**Registry audit code (not a verifier code):** `REGISTRY_DRIFT`, produced by `apps/registry/services/audit.ts` (section 12).

### 9.4 Result shape

```ts
interface VerifyResult {
  verdict: 'VALID' | 'INVALID' | 'INCONCLUSIVE';
  code: Code;                                   // 'OK' when valid
  steps: { id: string; label: string; status: 'pass'|'fail'|'skipped'|'warn'; detail?: string }[];
  warnings: string[];
  registrations?: { kind: 'ledger' | 'ethereum'; batchId: string; ref: number; anchoredAt: string; root: string }[];
  attribution?: { kind: 'none' | 'signed'; publicKey?: string; signatureValid?: boolean };
  message: string;                              // from messages.ts template table
}
```

`ref` is the ledger `seq` or the Ethereum anchor `id`.

### 9.5 Three-line output (`threeLine.ts`)

| Line | Passing text | Failing / other |
|---|---|---|
| **Integrity** | ✅ "Matches the registered record" | ❌ code + template message |
| **Registration** | ✅ one sub-line per anchor: "Ledger: batch b-0007 · entry #7 · 2026-10-11 09:00 UTC (anchor-asserted time)" and "Ethereum (local Hardhat 31337): anchor #7 · block time 2026-10-11 09:00 UTC (chain-asserted, local chain)" | ❌ / ⚪ "Could not reach the anchor" / ⚠️ "Ethereum unreachable, ledger only" |
| **Attribution** | ℹ️ file kind: "No creator signature in this record. Authorship is not established." · manifest kind: "Signed by key 03a1…31b8 (signature valid). The key holder's identity is not verified." | ❌ "Signature invalid" |

**UI language rules (unchanged).** The attribution line is never green. Never use *authentic, genuine, original, proof of ownership*.

### 9.6 Where the verifier runs

- **Browser (`/verify`):** drop the file and the `*.pcproof.json`, press Verify. It contacts only the ledger (`:4100`), the witness (`:4200`) and the Ethereum RPC (`:8545`, raw JSON-RPC `fetch`). Never the registry. Pinned values come from `generated/anchorPub.ts` and `generated/pinnedEthereum.ts`. **Offline mode** accepts a pasted ledger entry (`StaticLedgerReader`); the chain cannot be read offline, so an offline result carries the warning "Ethereum anchor not checked".
- **CLI:** `npm run verify -- <file> <proof.json> [--anchor URL] [--witness URL] [--pub HEX] [--entry entry.json] [--rpc URL] [--chain-id N] [--contract 0x…]`. Exit code `0` valid, `1` invalid, `2` inconclusive or usage error.
- **Library:** `import { verifyBundle } from '@proofchain/verifier'`.

**Pinned values limitation (state it):** the first trust in the ledger public key, the chain id and the contract address is established out of band (setup and deploy write them into the build). A real deployment would publish them through an independent channel.

---

## 19. File storage policy

### 19.1 Principle

**The proof never depends on where a file is stored, or whether it is stored at all.** The leaf hash is computed from the bytes. Storage is a convenience layer (previews, retrieval, backups) outside the trust path. The verifier never reads any `FileStore`.

### 19.2 Three storage modes (column `records.storage_mode`)

| Mode | What is stored | Default? | Typical use | Where it may live |
|---|---|---|---|---|
| `none` | Nothing. The file never leaves the user's browser; only its hash (and metadata) is registered | **Yes** | Everything by default. Best for privacy and for the offline demo | n/a |
| `preview` | A small JPEG thumbnail (or video poster frame), **not** the registered file | No (opt-in per record) | Showing a picture on the certificate or in "My works" | Any adapter |
| `copy` | The exact registered bytes | No (opt-in per record, issuer-approved) | Issuer wants the registry to hold the original for later download | Any adapter that preserves bytes exactly (see 19.4 rule 4) |

### 19.3 `FileStore` interface (`apps/registry/src/storage/FileStore.ts`)

```ts
export type StoreKind = 'file' | 'preview';

export interface FileStore {
  readonly name: string;                         // 'local' | 's3' | 'cloudinary' | anything you add
  put(input: { bytes: Uint8Array; sha256: string; mime: string; kind: StoreKind }): Promise<{ ref: string }>;
  get(ref: string): Promise<{ bytes: Uint8Array; mime: string }>;
  remove(ref: string): Promise<void>;            // used for previews and for stored copies
  health(): Promise<{ ok: boolean; detail?: string }>;
}
```

Rules every adapter inherits from the registry wrapper (adapters do not implement these themselves):

1. On **put**, the registry recomputes `sha256(bytes)` and rejects a mismatch with `STORAGE_MISMATCH`. For `copy`, the hash must also equal the record's `content_hash`.
2. On **get** (download or audit), the registry recomputes the hash again and refuses to serve bytes that no longer match (`STORAGE_MISMATCH`). The audit reports it as `CONTENT_DRIFT`.
3. The `ref` is opaque to the rest of the system. For local disk it is the content hash; for cloud services it is whatever the service returns. Only the adapter interprets it.
4. Any adapter error leaves the record and its proof untouched. Registration, sealing and anchoring never wait on storage.

### 19.4 Which storage services are allowed, and the rules

Any service is allowed **if** it is wrapped in a `FileStore` adapter and follows these rules.

| # | Rule |
|---|---|
| 1 | **Off by default.** `FILE_STORE=none`. The core demo and the offline demo run with `none` or `local` (R11). Cloud adapters are optional extras and never part of the stage demo path. |
| 2 | **Adapters we plan for:** `localDisk` (default, content-addressed under `data/files/` and `data/previews/`), `s3` (S3-compatible: AWS S3, MinIO, Cloudflare R2, Backblaze B2), `cloudinary` (previews only). Anyone can add another adapter (Supabase Storage, Firebase Storage, IPFS pinning, GCS) by implementing the interface. Only `localDisk` is required for done. `s3` and `cloudinary` are stretch. |
| 3 | **Fictional data only on any hosted service.** Never register or upload a real person's document to a third-party host during the hackathon. |
| 4 | **Cloudinary and other media CDNs may transform bytes** (re-encode, strip metadata, convert format). Therefore: **previews only** on Cloudinary. If a media service is ever used for `copy`, it must use a raw/untransformed resource type, and the download is still re-hashed (rule 19.3.2). A copy that fails the hash check is never served. |
| 5 | **Credentials stay on the server.** They live in `.env` (never committed), are read in `config.ts`, and are never sent to the browser or put in a proof bundle. Browsers upload only to the registry endpoint (section 8), never directly to a storage service. The registry then uploads (Cloudinary: server-signed upload). |
| 6 | **A preview is never the registered file.** Every preview is served with `X-Not-Registered-File: true`, shown under the label *"Preview (not the registered file)"*, and stored with its own `preview_sha256`. A preview is never hashed into the Merkle tree and never used by the verifier. |
| 7 | **Privacy defaults.** `visibility='private'`. Public only if the creator/issuer opts in. Private previews and copies are served through the registry with the issuer token or a short-lived signed URL, never as a permanent public link. |
| 8 | **Previews are small and clean.** JPEG only, `PREVIEW_MAX_BYTES` (default 200 KB), generated in the browser from a canvas (this also strips EXIF/GPS). Full copies obey the 10 MB limit (`MAX_UPLOAD_BYTES`). |
| 9 | **No deleting records.** Previews can be deleted by the creator or issuer. A stored **copy** can be removed by the issuer (`DELETE /api/records/:id/file`, new route), which sets `storage_mode='none'` and clears `file_ref`. The record, its leaf and its proof stay. |
| 10 | **Storage outage is not a verification failure.** If the store is down: registration still works (hash only), the preview or copy upload shows an error and can be retried, and verification is unaffected. |
| 11 | **Claim honestly.** We never say a stored copy "proves" anything. A stored copy is verified against the leaf like any other file, and the UI says *"Stored copy matches the registered hash"* or *"Stored copy no longer matches."* |

### 19.5 Environment variables (add to the table in 15.3)

| Variable | Default | Meaning |
|---|---|---|
| `FILE_STORE` | `none` | `none`, `local`, `s3`, `cloudinary` |
| `ALLOW_COPIES` | `false` | If `false`, `storeCopy=true` is rejected with `VALIDATION_ERROR` |
| `ALLOW_PREVIEWS` | `true` | Previews allowed when a store is configured |
| `PREVIEW_MAX_BYTES` | `204800` | Hard limit for preview uploads |
| `PREVIEWS_STORE` | same as `FILE_STORE` | Lets previews go to Cloudinary while copies stay on `local` |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | empty | S3-compatible adapter |
| `CLOUDINARY_URL` | empty | `cloudinary://key:secret@cloud_name`. Server-side only |
| `CLOUDINARY_FOLDER` | `proofchain-previews` | Upload folder |

### 19.6 Adapter notes

- **localDisk:** path = `data/files/<sha256>` or `data/previews/<sha256>.jpg`. Build paths with `path.join` (Windows). The folder is writable by the registry only.
- **s3:** use the AWS SDK v3 `S3Client` with `forcePathStyle` for MinIO. Object key = `files/<sha256>`. Private bucket, pre-signed GET with ≤ 5-minute expiry for private objects.
- **cloudinary:** server-signed upload, `type: "authenticated"` for private previews, `public_id` = preview hash, `resource_type: "image"`. Never serve the registered file from Cloudinary (rule 4).

### 19.7 Data model and API deltas

- Columns already in section 7: `storage_mode`, `file_ref`, `preview_ref`, `preview_sha256`, `visibility`.
- Add one column: `store_name TEXT` (which adapter holds the `ref`, so switching adapters later does not orphan old refs).
- Routes already in section 8: preview upload/get/delete, `GET /api/records/:id/file`.
- **New route:** `DELETE /api/records/:id/file` (issuer token) → `204`. Sets `storage_mode='none'`.
- Error codes `STORAGE_MISMATCH` and `PREVIEW_TOO_LARGE` are already listed in 8.4.

### 19.8 Tests

Local adapter round trip; a tampered stored file fails `get` with `STORAGE_MISMATCH` and the audit reports `CONTENT_DRIFT`; `storeCopy` rejected when `ALLOW_COPIES=false`; oversize preview → `PREVIEW_TOO_LARGE`; deleting a copy leaves the proof valid; a fake `FileStore` that always throws leaves register + seal + verify working.

### 19.9 Judge Q&A additions

| Question | Answer |
|---|---|
| Do you store our documents? | By default no. We store only a hash and the confirmed metadata. Storage is opt-in per record and sits outside the verification path |
| Can you use Cloudinary or S3? | Yes, behind one interface. Cloudinary is previews-only because it can re-encode images. Any stored copy is re-hashed on every read |
| What if the storage service is hacked or goes down? | Verification does not read it. A tampered copy fails the hash check and the audit flags `CONTENT_DRIFT`. An outage only blocks previews and downloads |

---

## 20. Blockchain decision: Ethereum (EVM)

### 20.1 Decision

We use **Ethereum (EVM)**: a Solidity contract `RootAnchor` on a **local Hardhat chain** (chain id 31337). Sepolia (11155111) is an optional extra. **Ethereum mainnet is never used.**

| | **Ethereum (EVM)** — chosen | Polygon | Algorand |
|---|---|---|---|
| Works fully offline on a laptop | Yes (Hardhat node) | Only through an EVM local node (it is the same tooling as Ethereum) | Yes, but needs Docker (AlgoKit LocalNet) |
| Contract language / toolchain | Solidity + Hardhat, widest docs and examples | Same as Ethereum | Different stack (TEAL / Algorand Python or TypeScript) |
| Extra setup risk at the venue | Low | Low locally; public testnet needs internet and faucet | Higher (Docker, new SDK) |
| Public deployment later | Sepolia or mainnet | Amoy testnet / Polygon PoS, **same contract unchanged** | Algorand TestNet |
| Benefit for B-01 | Meets "stored where the registry cannot silently rewrite" with a standard, recognised design | No benefit for the hackathon over Ethereum | No benefit for this brief |

**Why Ethereum:** the team picks the best-documented option with zero cloud dependency. Because it is plain EVM, the same `RootAnchor.sol` can later be pointed at Polygon (Amoy or PoS) by changing the RPC URL and chain id. Polygon is therefore a **future deployment target, not a different design**. Algorand is rejected for toolchain and Docker cost.

### 20.2 What it adds, and what it does not replace

The chain runs **alongside** the signed ledger and the witness, not instead of them. `ANCHOR_MODE`:

| Value | Seal publishes to | Bundle `anchors[]` |
|---|---|---|
| `ledger` | ledger only (fallback if the chain breaks at the venue) | 1 entry |
| `ethereum` | contract only | 1 entry |
| `both` (default when the chain is running) | ledger **and** contract | 2 entries |

### 20.3 Contract: `contracts/contracts/RootAnchor.sol`

Design: append-only. There is no update function, no delete function, no owner-changeable state. Only the publisher address (set at deploy) can add a root. One `batchId` can be anchored once.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RootAnchor {
    struct Anchor {
        bytes32 batchKey;   // keccak256(bytes(batchId))
        bytes32 root;       // Merkle root (SHA-256 based, see section 6)
        uint32  leafCount;
        uint64  timestamp;  // block.timestamp
    }

    address public immutable publisher;
    Anchor[] private anchors;
    mapping(bytes32 => uint256) private idPlusOne;   // batchKey => id + 1 (0 = not found)

    event RootPublished(
        uint256 indexed id,
        bytes32 indexed batchKey,
        string batchId,
        bytes32 root,
        uint32 leafCount,
        uint64 timestamp
    );

    error NotPublisher();
    error EmptyBatchId();
    error ZeroRoot();
    error ZeroLeafCount();
    error BatchAlreadyAnchored(uint256 id);
    error UnknownId();

    constructor(address _publisher) {
        publisher = _publisher;
    }

    function publish(string calldata batchId, bytes32 root, uint32 leafCount)
        external
        returns (uint256 id)
    {
        if (msg.sender != publisher) revert NotPublisher();
        if (bytes(batchId).length == 0) revert EmptyBatchId();
        if (root == bytes32(0)) revert ZeroRoot();
        if (leafCount == 0) revert ZeroLeafCount();

        bytes32 key = keccak256(bytes(batchId));
        uint256 existing = idPlusOne[key];
        if (existing != 0) revert BatchAlreadyAnchored(existing - 1);

        id = anchors.length;
        anchors.push(Anchor(key, root, leafCount, uint64(block.timestamp)));
        idPlusOne[key] = id + 1;

        emit RootPublished(id, key, batchId, root, leafCount, uint64(block.timestamp));
    }

    function get(uint256 id)
        external
        view
        returns (bytes32 batchKey, bytes32 root, uint32 leafCount, uint64 timestamp)
    {
        if (id >= anchors.length) revert UnknownId();
        Anchor storage a = anchors[id];
        return (a.batchKey, a.root, a.leafCount, a.timestamp);
    }

    function find(string calldata batchId) external view returns (bool found, uint256 id) {
        uint256 v = idPlusOne[keccak256(bytes(batchId))];
        if (v == 0) return (false, 0);
        return (true, v - 1);
    }

    function count() external view returns (uint256) {
        return anchors.length;
    }
}
```

> **Status:** this code has been written but **not yet compiled or tested**. P3 compiles it in hour 3 with solc 0.8.26 and Hardhat 2.x. Until then, remove the phrase "compiled clean with solc 0.8.26" from section 3.2.

**Contract tests (`contracts/test/RootAnchor.test.ts`)**

| Kind | Test |
|---|---|
| Normal | publish returns id 0, 1, 2; `get` returns the same root, count, a non-zero timestamp; `find` finds it; `count` increments; event emitted |
| Adversarial | non-publisher call reverts `NotPublisher`; second publish of the same `batchId` reverts `BatchAlreadyAnchored` even with a different root; zero root, zero leaf count and empty batch id revert; `get` of an unknown id reverts; there is no function that changes or removes a stored anchor (check the ABI has only `publish` as a state-changing function) |

### 20.4 Local chain and deploy

- `npm run chain` → `hardhat node --hostname 127.0.0.1` (port 8545, chain id 31337). **State is in memory.** Restarting the node erases it (this is a limit and also a demo, see 20.9).
- `npm run chain:deploy` (`contracts/scripts/deploy.ts`):
  1. Generates a **fresh publisher key** (do **not** use the well-known Hardhat account #0 key, since it is public).
  2. Funds it from the Hardhat dev account.
  3. Deploys `RootAnchor(publisherAddress)`.
  4. Writes `CHAIN_PUBLISHER_KEY` and `RPC_URL` to `.env` and writes `apps/web/src/generated/pinnedEthereum.ts` with `{ chainId, contract, rpcUrls, blockTag }`.
- `npm run dev` starts **five** processes: web, registry, anchor, witness, chain. A `chain:ensure` step deploys the contract if none exists at the pinned address.
- After a chain restart, run `npm run reset && npm run seed` (the old `eth_anchor_id` values would point at nothing).

### 20.5 Registry publisher (`apps/registry/src/services/ethPublisher.ts`, ethers v6)

1. `find(batchId)`. If found, read `get(id)`: same root → treat as success and store the refs; different root → `409 BATCH_ALREADY_ANCHORED`.
2. If not found: `publish(batchId, 0x+root, leafCount)`, wait for 1 confirmation, store `eth_chain_id`, `eth_contract`, `eth_anchor_id`, `eth_tx_hash`.
3. Chain unreachable → batch stays `sealed`, `502 ANCHOR_UNREACHABLE`; `retry-anchor` is safe to repeat.

### 20.6 Verifier reader (`packages/verifier/src/ethereumReader.ts`)

- **Raw JSON-RPC over `fetch`.** No `ethers`, no `web3` (purity check).
- Calls `eth_chainId` and compares to the pinned chain id; calls `eth_call` with `to = pinned contract`, `data = selector(get(uint256)) + uint256(id)`. The selector is the first 4 bytes of `keccak256("get(uint256)")`. Decode four 32-byte words: `batchKey, root, leafCount, timestamp`.
- Keccak comes from `@noble/hashes/sha3` (`keccak_256`), already inside the allowed `@noble/hashes` dependency.
- **Multi-RPC:** `rpcUrls` may list several endpoints (one is enough locally). If more than one is listed, all must return the same result, or the reader throws `ANCHOR_DISAGREEMENT`. On a public chain this protects against one lying RPC node.
- Bundle values (`chainId`, `contract`, `txHash`) are hints. The reader uses only the **pinned** values (section 6.4 rule).
- `block tag`: `latest` locally. On a public network use `finalized` or a fixed confirmation depth.

### 20.7 Honest limits (say them before judges ask)

1. **Local Hardhat is not immutable.** Whoever runs the node can reset it. We demonstrate that in 20.9. Immutability needs a public network that no single party can reset.
2. **The RPC endpoint is trusted for honesty** unless multiple independent endpoints are used. The verifier cannot detect a lying single RPC.
3. **Block timestamp** on a local chain is the laptop's clock. It is *chain-asserted time*, not independent. On a public chain it is bounded by consensus rules but still approximate.
4. **Gas and cost:** local gas is free. On a public chain the cost per **batch** is one transaction, which is the reason for Merkle batching.
5. We still say *tamper-evident*, not *tamper-proof*, and we do not say *blockchain-secured* for the local demo.

### 20.8 Optional public deployment

Sepolia (testnet) needs internet, an RPC URL, and a faucet-funded key. Set `SEPOLIA_RPC_URL` and `SEPOLIA_PRIVATE_KEY` in `.env`, run `npx hardhat run scripts/deploy.ts --network sepolia`. Polygon Amoy works the same way with a different network entry. **Never mainnet. Never a key that holds real funds.** Stretch only, and never on the stage demo path.

### 20.9 Demo additions

| Step | What it shows | Expected |
|---|---|---|
| Verify a genuine file | Both anchors read, root matches, cross-check passes | ✅ `OK`, registration shows 2 lines |
| Stop the chain, re-verify | Ethereum unreachable, ledger passes | ✅ `VALID` + warning "Ethereum unreachable; ledger only" |
| `npm run demo:tamper -- chain-reset` | Restarts the node and re-deploys, then a new batch with the same id but different data is sealed on the chain only | `ANCHOR_DISAGREEMENT` |
| Say | "We run the chain ourselves, so we can reset it. The verifier notices because the ledger and the chain no longer agree. On a public chain no one could reset it." | |

### 20.10 Judge Q&A updates (replace the matching rows in 17.3)

| Question | Answer |
|---|---|
| Is this a blockchain? | Yes, in addition to a signed ledger and witness we publish each root to an Ethereum smart contract (local Hardhat chain for the demo, same code deploys to Sepolia or Polygon). We do not claim the local chain is immutable |
| Why Ethereum and not Polygon or Algorand? | Best tooling, works offline with Hardhat, and the EVM contract is portable: Polygon is a config change. Algorand would add Docker and a second toolchain for no benefit here |
| What if the witness is compromised too? | The Ethereum anchor is a second independent record. Defeating verification means rewriting both, and the verifier flags any disagreement |

---

## Patch list for the rest of the guide

Apply each edit so the document stops contradicting itself.

| Where | Change |
|---|---|
| Header stack line, 3.2 "Dev runner", 15.1, 15.2, G0 | "all four processes" → **five** (web, registry, anchor, witness, chain). G0: "5 green" and add `chain:ensure` |
| 3.2 "Smart contract" row | Remove "compiled clean with solc 0.8.26" until P3 actually compiles it |
| 3.3 Cloudinary row | Change to: "Not used for registered files. Allowed only as an optional previews adapter (section 19)" |
| 4.2 trust table, last paragraph | Fine as written; add a link to 20.7 |
| 5 repo tree, `contracts/scripts` | Add `chain-ensure.ts` and `chain-reset.ts` (used by `chain:ensure` and the demo) |
| 6.4 | Add: "`contract`, `txHash`, `chainId` use Ethereum conventions (`0x` prefix); every other hex field stays lowercase without `0x`" |
| 8.1 table | Add `DELETE /api/records/:id/file` (19.7) |
| 8.4 error codes | Add `ANCHOR_DISAGREEMENT` is a verifier code, not an API error; no change needed here |
| 12.2 tamper lab | Add terminal case `npm run demo:tamper -- chain-reset` (20.9) |
| 14.1 ownership | P3 additionally owns `contracts/`. P2 owns `ethPublisher.ts`. P1 owns `ethereumReader.ts` |
| 14.3 schedule | P3 hours 3–6: contract + tests + deploy script (move Ollama path later). P2 hours 6–9: `ethPublisher.ts`, `ANCHOR_MODE`, health `chain` block. P1 hours 8–9:30: `ethereumReader.ts`, S6B cross-check, browser wiring |
| 14.4 gates | **G3** (hour 8): remove "Stretch adapter cancelled". **Add G3E at 9:30:** "Seal publishes to ledger and Hardhat; verifier passes with two anchors; `ANCHOR_DISAGREEMENT` demo works." If missed: set `ANCHOR_MODE=ledger`, keep the contract and tests, show the chain on one slide |
| 15.3 env table | Add: `ANCHOR_MODE`, `RPC_URL`, `CHAIN_ID`, `CHAIN_PUBLISHER_KEY`, `SEPOLIA_RPC_URL`, `SEPOLIA_PRIVATE_KEY` (optional), plus the storage variables from 19.5 |
| 16.1 tests | Add the contract tests (20.3), the storage tests (19.8), and a verifier test per new behaviour: two anchors agree, they disagree, ledger fails while chain passes, chain unreachable while ledger passes, wrong pinned contract, wrong chain id |
| 17.2 claims table | Row "Blockchain-secured": change to "We never say it for the local demo. We say: *anchored on a local Ethereum chain, portable to a public network*" |
| 17.3 | Replace the two rows listed in 20.10, and add the three rows from 19.9 |
| 18 cut order | Replace item 1 "Hardhat adapter" with: 1) Ollama paths · 2) `/creator/for-platforms` · 3) image dHash · 4) Cloudinary/S3 adapters · 5) Sepolia/Polygon deploy · 6) witness status UI polish · 7) trail visual polish · 8) competing-claims panel. **Last resort:** `ANCHOR_MODE=ledger` (chain becomes a slide) |
| 18 "Never cut" | Add: `FileStore` hash re-check (19.3) |
