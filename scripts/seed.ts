/**
 * scripts/seed.ts
 *
 * Deterministic fictional seed data generator for ProofChain + CreatorProof.
 * (ProofChain Section 13.1 & Team Guide)
 *
 * Requirements:
 * 1. Batch b-0001 (Side 1 - 5 PDF Certificates):
 *    - Use pdf-lib with fixed metadata and fixed timestamps ('2026-01-01T00:00:00Z')
 *      so SHA-256 byte hashes are 100% identical on every machine.
 *    - Register all 5 certificates, extract AI metadata, confirm, and seal into Batch b-0001.
 * 2. Batch b-0002 (Side 2 - CreatorProof Works):
 *    - Creator A: 3-version work (draft -> revision -> final).
 *    - Creator B: Duplicate registration attempt of Creator A's final artwork.
 *    - Seal into Batch b-0002.
 * 3. Pre-tampered demo copies in samples/tamper/:
 *    - Tampered certificate.pdf (flipped byte) -> triggers DOC_MODIFIED.
 *    - Tampered proof bundle -> triggers ROOT_MISMATCH.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { sha256 } from '@noble/hashes/sha256';
import { ed25519 } from '@noble/curves/ed25519';
import {
  extractWithRules,
  classify,
  textSimhashHex,
  textFromFile,
} from '../packages/ai/src';
import {
  canonicalJson,
  signManifest,
  CreatorManifest,
} from '../packages/core/src';
import { createDatabase } from '../apps/registry/src/db';

// ── Directory Paths ───────────────────────────────────────────────────────────
const ROOT_DIR = path.resolve(__dirname, '..');
const SAMPLES_DIR = path.join(ROOT_DIR, 'samples');
const CERTS_DIR = path.join(SAMPLES_DIR, 'certificates');
const CREATOR_DIR = path.join(SAMPLES_DIR, 'creator-works');
const TAMPER_DIR = path.join(SAMPLES_DIR, 'tamper');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'registry.db');

// Fixed timestamp for 100% deterministic generation
const FIXED_TIMESTAMP = '2026-01-01T00:00:00Z';
const FIXED_DATE = new Date(FIXED_TIMESTAMP);

// ── Cryptographic Helpers (Section 6.2 & 6.3) ─────────────────────────────────

function sha256Hex(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return Buffer.from(sha256(bytes)).toString('hex');
}

function leafHash(bytes: Uint8Array): Uint8Array {
  const buf = new Uint8Array(1 + bytes.length);
  buf[0] = 0x00; // Domain separation: 0x00 for leaves
  buf.set(bytes, 1);
  return sha256(buf);
}

function nodeHash(left: Uint8Array, right: Uint8Array): Uint8Array {
  const buf = new Uint8Array(1 + 32 + 32);
  buf[0] = 0x01; // Domain separation: 0x01 for internal nodes
  buf.set(left, 1);
  buf.set(right, 33);
  return sha256(buf);
}

function buildTree(leaves: Uint8Array[]): Uint8Array[][] {
  if (leaves.length === 0) throw new Error('EMPTY_TREE');
  const levels = [leaves];
  while (levels[levels.length - 1].length > 1) {
    const cur = levels[levels.length - 1];
    const next: Uint8Array[] = [];
    for (let i = 0; i < cur.length; i += 2) {
      next.push(i + 1 < cur.length ? nodeHash(cur[i], cur[i + 1]) : cur[i]); // Promote odd leaf
    }
    levels.push(next);
  }
  return levels;
}

function proofFor(levels: Uint8Array[][], index: number) {
  const pathSteps: { hash: string; side: 'L' | 'R' }[] = [];
  let idx = index;
  for (const lvl of levels.slice(0, -1)) {
    const sib = idx ^ 1;
    if (sib < lvl.length) {
      pathSteps.push({
        hash: Buffer.from(lvl[sib]).toString('hex'),
        side: sib < idx ? 'L' : 'R',
      });
    }
    idx >>= 1;
  }
  return pathSteps;
}

// ── Deterministic PDF Generation ──────────────────────────────────────────────

interface StudentInfo {
  name: string;
  degree: string;
  refNo: string;
  major: string;
}

const STUDENTS: StudentInfo[] = [
  {
    name: 'Priya Sharma',
    degree: 'Bachelor of Fictional Arts',
    major: 'Creative Computation & Digital Ethics',
    refNo: 'AIFS-2026-001',
  },
  {
    name: 'Rahul Verma',
    degree: 'Master of Imaginary Science',
    major: 'Applied Cryptography & Distributed Systems',
    refNo: 'AIFS-2026-002',
  },
  {
    name: 'Ananya Patel',
    degree: 'Diploma in Speculative Design',
    major: 'Digital Provenance & Information Architecture',
    refNo: 'AIFS-2026-003',
  },
  {
    name: 'Rohan Nair',
    degree: 'Bachelor of Virtual Architecture',
    major: 'Immutable Data Systems & Zero Trust',
    refNo: 'AIFS-2026-004',
  },
  {
    name: 'Kavita Iyer',
    degree: 'Certificate in Fictional Governance',
    major: 'Public Key Infrastructure & Registry Policy',
    refNo: 'AIFS-2026-005',
  },
];

async function generateCertificatePdf(student: StudentInfo): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  // Strict deterministic metadata to guarantee identical hashes across all systems
  doc.setTitle(`Certificate of Completion - ${student.name}`);
  doc.setAuthor('Aarambh Institute of Fictional Studies');
  doc.setSubject('Official Degree Certificate');
  doc.setKeywords(['certificate', 'graduation', 'fictional', student.refNo]);
  doc.setProducer('ProofChain Deterministic PDF Engine');
  doc.setCreator('ProofChain Seeder v1.0');
  doc.setCreationDate(FIXED_DATE);
  doc.setModificationDate(FIXED_DATE);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([600, 420]);

  // Border decoration
  page.drawRectangle({
    x: 20,
    y: 20,
    width: 560,
    height: 380,
    borderWidth: 2,
    borderColor: rgb(0.15, 0.25, 0.45),
    color: rgb(0.98, 0.99, 1.0),
  });

  page.drawRectangle({
    x: 30,
    y: 30,
    width: 540,
    height: 360,
    borderWidth: 1,
    borderColor: rgb(0.65, 0.75, 0.85),
  });

  // Header
  page.drawText('AARAMBH INSTITUTE OF FICTIONAL STUDIES', {
    x: 75,
    y: 350,
    size: 18,
    font: fontBold,
    color: rgb(0.12, 0.22, 0.42),
  });

  page.drawText('OFFICIAL CERTIFICATE OF GRADUATION', {
    x: 155,
    y: 320,
    size: 12,
    font: fontBold,
    color: rgb(0.35, 0.45, 0.55),
  });

  // Body text
  page.drawText('This is to certify that', {
    x: 235,
    y: 275,
    size: 12,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(student.name, {
    x: 180,
    y: 240,
    size: 22,
    font: fontBold,
    color: rgb(0.08, 0.16, 0.35),
  });

  page.drawText(`has successfully fulfilled all academic requirements for the award of`, {
    x: 105,
    y: 205,
    size: 11,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });

  page.drawText(student.degree, {
    x: 150,
    y: 175,
    size: 16,
    font: fontBold,
    color: rgb(0.15, 0.35, 0.25),
  });

  page.drawText(`Specialization in ${student.major}`, {
    x: 160,
    y: 150,
    size: 11,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Metadata Footer
  page.drawText(`Date of Issue: 2026-01-01`, {
    x: 60,
    y: 80,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawText(`Reference No: ${student.refNo}`, {
    x: 390,
    y: 80,
    size: 10,
    font: fontBold,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawText(`Issuer: Aarambh Institute of Fictional Studies`, {
    x: 60,
    y: 60,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText(`Verification: https://proofchain.demo/verify`, {
    x: 370,
    y: 60,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await doc.save();
}

// ── Main Seeder ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n=============================================================');
  console.log(' 🌱 ProofChain Fictional Seed Data Generator');
  console.log('=============================================================\n');

  // Ensure directories exist
  for (const dir of [CERTS_DIR, CREATOR_DIR, TAMPER_DIR, DATA_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Initialize SQLite database
  const db = createDatabase(DB_PATH);
  console.log(`📦 Database connected: ${path.relative(ROOT_DIR, DB_PATH)}`);

  // Clear existing seed batches to ensure clean idempotent run
  db.exec(`
    DELETE FROM records WHERE batch_id IN ('b-0001', 'b-0002');
    DELETE FROM batches WHERE id IN ('b-0001', 'b-0002');
  `);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. BATCH b-0001: Side 1 — 5 PDF Certificates
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- [Batch b-0001] Generating 5 Fictional PDF Certificates ---');

  // Insert open batch b-0001 first to satisfy foreign key constraint
  db.prepare(`
    INSERT INTO batches (id, status, created_at)
    VALUES ('b-0001', 'open', ?)
  `).run(FIXED_TIMESTAMP);

  const certLeaves: Uint8Array[] = [];
  const certLeafHexes: string[] = [];
  const certContentHexes: string[] = [];
  const certFiles: string[] = [];
  const certRecordIds: string[] = [];

  for (let i = 0; i < STUDENTS.length; i++) {
    const student = STUDENTS[i];
    const pdfBytes = await generateCertificatePdf(student);
    const contentHash = sha256Hex(pdfBytes);
    const leaf = leafHash(pdfBytes);
    const leafHex = Buffer.from(leaf).toString('hex');

    certLeaves.push(leaf);
    certLeafHexes.push(leafHex);
    certContentHexes.push(contentHash);

    const pdfPath = path.join(CERTS_DIR, `certificate-${i + 1}.pdf`);
    fs.writeFileSync(pdfPath, pdfBytes);
    certFiles.push(pdfPath);

    // Extract text and AI metadata
    const extracted = await textFromFile(pdfBytes, 'application/pdf');
    const aiExtraction = extractWithRules(extracted.text);
    const aiCategory = classify(extracted.text);
    const simhash = textSimhashHex(extracted.text);

    const confirmedMetadata = {
      title: `Certificate of Completion - ${student.name}`,
      issuer: 'Aarambh Institute of Fictional Studies',
      documentDate: '2026-01-01',
      documentType: 'Graduation Certificate',
      parties: [student.name, 'Aarambh Institute of Fictional Studies'],
      referenceNo: student.refNo,
      recipient: student.name,
      degree: student.degree,
      major: student.major,
    };

    const recordId = crypto.randomUUID();
    certRecordIds.push(recordId);

    db.prepare(`
      INSERT INTO records (
        id, batch_id, leaf_index, kind, leaf_hash, content_hash, file_name, mime, size,
        metadata_json, ai_suggestion_json, confirmed_by, confirmed_at,
        storage_mode, visibility, sim_kind, sim_value, created_at
      ) VALUES (
        ?, 'b-0001', ?, 'file', ?, ?, ?, 'application/pdf', ?,
        ?, ?, 'Issuer Admin (AIFS)', ?,
        'none', 'public', 'text-simhash', ?, ?
      )
    `).run(
      recordId,
      i,
      leafHex,
      contentHash,
      `certificate-${i + 1}.pdf`,
      pdfBytes.length,
      JSON.stringify(confirmedMetadata),
      JSON.stringify({ extraction: aiExtraction, category: aiCategory[0] }),
      FIXED_TIMESTAMP,
      simhash,
      FIXED_TIMESTAMP
    );

    console.log(`  ✓ Cert #${i + 1}: ${student.name.padEnd(16)} | Hash: ${contentHash.slice(0, 16)}... | Leaf: ${leafHex.slice(0, 16)}...`);
  }

  // Compute Merkle tree for Batch b-0001
  const tree1 = buildTree(certLeaves);
  const root1 = Buffer.from(tree1[tree1.length - 1][0]).toString('hex');

  // Seal Batch b-0001
  db.prepare(`
    UPDATE batches SET
      status = 'anchored',
      sealed_at = ?,
      root = ?,
      leaf_count = 5,
      anchor_seq = 0,
      anchor_entry_json = ?,
      eth_chain_id = 31337,
      eth_contract = '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      eth_anchor_id = 0,
      eth_tx_hash = '0x1111111111111111111111111111111111111111111111111111111111111111'
    WHERE id = 'b-0001'
  `).run(
    FIXED_TIMESTAMP,
    root1,
    JSON.stringify({ seq: 0, batchId: 'b-0001', root: root1, leafCount: 5 })
  );

  console.log(`  🔗 Batch b-0001 Merkle Root: ${root1}`);

  // Write proof bundles for each certificate
  for (let i = 0; i < STUDENTS.length; i++) {
    const proofPath = proofFor(tree1, i);
    const proofBundle = {
      format: 'proofchain/proof/1',
      recordKind: 'file',
      batchId: 'b-0001',
      leafIndex: i,
      leafCount: 5,
      leafHash: certLeafHexes[i],
      path: proofPath,
      anchors: [
        {
          kind: 'ledger',
          seq: 0,
          url: 'http://localhost:4100',
          entryHash: '00'.repeat(32),
        },
        {
          kind: 'ethereum',
          chainId: 31337,
          contract: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          id: 0,
          txHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
        },
      ],
    };

    const bundleFile = path.join(CERTS_DIR, `certificate-${i + 1}.pcproof.json`);
    fs.writeFileSync(bundleFile, JSON.stringify(proofBundle, null, 2), 'utf-8');
  }
  console.log(`  ✓ Generated 5 proof bundles in samples/certificates/`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. BATCH b-0002: Side 2 — CreatorProof Works (Creation Trail & Priority)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- [Batch b-0002] Generating CreatorProof Creation Trail & Claims ---');

  // Insert open batch b-0002 first to satisfy foreign key constraint
  db.prepare(`
    INSERT INTO batches (id, status, created_at)
    VALUES ('b-0002', 'open', ?)
  `).run(FIXED_TIMESTAMP);

  // Creator A (Original Creator)
  const seedA = new Uint8Array(32).fill(10);
  const privA = Buffer.from(seedA).toString('hex');
  const pubA = Buffer.from(ed25519.getPublicKey(seedA)).toString('hex');

  // Creator B (Competing Claimant)
  const seedB = new Uint8Array(32).fill(20);
  const privB = Buffer.from(seedB).toString('hex');
  const pubB = Buffer.from(ed25519.getPublicKey(seedB)).toString('hex');

  // Upsert creators into creators directory table
  db.prepare(`
    INSERT OR IGNORE INTO creators (public_key, display_name, created_at)
    VALUES (?, 'Asha K. (Digital Artist)', ?), (?, 'Bob T. (Later Claimant)', ?)
  `).run(pubA, FIXED_TIMESTAMP, pubB, FIXED_TIMESTAMP);

  const workId = 'work-sunrise-2026';

  // Work Artwork bytes
  const artworkV1Bytes = new TextEncoder().encode(
    'CREATIVE WORK: Sunrise Over Fictional Bay - Version 1 (Rough Concept Draft)\nCreator: Asha K.\nFormat: Concept Sketch\nPalette: Monochrome'
  );
  const artworkV2Bytes = new TextEncoder().encode(
    'CREATIVE WORK: Sunrise Over Fictional Bay - Version 2 (Inked Outlines & Shading)\nCreator: Asha K.\nFormat: Vector Art\nPalette: Duotone Blue/Gold'
  );
  const artworkV3Bytes = new TextEncoder().encode(
    'CREATIVE WORK: Sunrise Over Fictional Bay - Version 3 (Full Color Master Final)\nCreator: Asha K.\nFormat: High-Res Master\nPalette: Warm Vibrant Sunrise'
  );

  fs.writeFileSync(path.join(CREATOR_DIR, 'creatorA-draft.txt'), artworkV1Bytes);
  fs.writeFileSync(path.join(CREATOR_DIR, 'creatorA-revision.txt'), artworkV2Bytes);
  fs.writeFileSync(path.join(CREATOR_DIR, 'creatorA-final.txt'), artworkV3Bytes);

  const v1FileHash = sha256Hex(artworkV1Bytes);
  const v2FileHash = sha256Hex(artworkV2Bytes);
  const v3FileHash = sha256Hex(artworkV3Bytes);

  // Manifest 1: Draft (parentLeaf = null)
  const m1Unsigned: Omit<CreatorManifest, 'signature'> = {
    schema: 'creatorproof/manifest/1',
    workId,
    version: 1,
    parentLeaf: null,
    fileHash: v1FileHash,
    fileName: 'creatorA-draft.txt',
    mime: 'text/plain',
    size: artworkV1Bytes.length,
    title: 'Sunrise Over Fictional Bay (Draft)',
    category: 'Creative',
    license: 'CC_BY_NC',
    creator: { publicKey: pubA, displayName: 'Asha K.' },
    createdAtClaimed: '2026-01-01T08:00:00Z',
  };
  const m1 = signManifest(m1Unsigned, privA);
  const m1Leaf = leafHash(new TextEncoder().encode(canonicalJson(m1)));
  const m1LeafHex = Buffer.from(m1Leaf).toString('hex');

  // Manifest 2: Revision (parentLeaf = m1LeafHex)
  const m2Unsigned: Omit<CreatorManifest, 'signature'> = {
    schema: 'creatorproof/manifest/1',
    workId,
    version: 2,
    parentLeaf: m1LeafHex,
    fileHash: v2FileHash,
    fileName: 'creatorA-revision.txt',
    mime: 'text/plain',
    size: artworkV2Bytes.length,
    title: 'Sunrise Over Fictional Bay (Inked Revision)',
    category: 'Creative',
    license: 'CC_BY_NC',
    creator: { publicKey: pubA, displayName: 'Asha K.' },
    createdAtClaimed: '2026-01-01T10:00:00Z',
  };
  const m2 = signManifest(m2Unsigned, privA);
  const m2Leaf = leafHash(new TextEncoder().encode(canonicalJson(m2)));
  const m2LeafHex = Buffer.from(m2Leaf).toString('hex');

  // Manifest 3: Final Artwork (parentLeaf = m2LeafHex)
  const m3Unsigned: Omit<CreatorManifest, 'signature'> = {
    schema: 'creatorproof/manifest/1',
    workId,
    version: 3,
    parentLeaf: m2LeafHex,
    fileHash: v3FileHash,
    fileName: 'creatorA-final.txt',
    mime: 'text/plain',
    size: artworkV3Bytes.length,
    title: 'Sunrise Over Fictional Bay (Final Master)',
    category: 'Creative',
    license: 'ALL_RIGHTS_RESERVED',
    creator: { publicKey: pubA, displayName: 'Asha K.' },
    createdAtClaimed: '2026-01-01T12:00:00Z',
  };
  const m3 = signManifest(m3Unsigned, privA);
  const m3Leaf = leafHash(new TextEncoder().encode(canonicalJson(m3)));
  const m3LeafHex = Buffer.from(m3Leaf).toString('hex');

  // Creator B: Duplicate registration of Creator A's final artwork (competing claim)
  const mBUnsigned: Omit<CreatorManifest, 'signature'> = {
    schema: 'creatorproof/manifest/1',
    workId: 'work-bob-infringing',
    version: 1,
    parentLeaf: null,
    fileHash: v3FileHash, // SAME FILE HASH!
    fileName: 'copied-sunrise.txt',
    mime: 'text/plain',
    size: artworkV3Bytes.length,
    title: 'Sunrise Painting by Bob',
    category: 'Creative',
    license: 'ALL_RIGHTS_RESERVED',
    creator: { publicKey: pubB, displayName: 'Bob T. (Later Claimant)' },
    createdAtClaimed: '2026-01-01T15:00:00Z',
  };
  const mB = signManifest(mBUnsigned, privB);
  const mBLeaf = leafHash(new TextEncoder().encode(canonicalJson(mB)));
  const mBLeafHex = Buffer.from(mBLeaf).toString('hex');

  fs.writeFileSync(path.join(CREATOR_DIR, 'creatorA-v1.manifest.json'), JSON.stringify(m1, null, 2));
  fs.writeFileSync(path.join(CREATOR_DIR, 'creatorA-v2.manifest.json'), JSON.stringify(m2, null, 2));
  fs.writeFileSync(path.join(CREATOR_DIR, 'creatorA-final.manifest.json'), JSON.stringify(m3, null, 2));
  fs.writeFileSync(path.join(CREATOR_DIR, 'creatorB-competing.manifest.json'), JSON.stringify(mB, null, 2));

  const batch2Manifests = [
    { m: m1, leaf: m1Leaf, leafHex: m1LeafHex, fileHash: v1FileHash, ts: '2026-01-01T08:00:00Z' },
    { m: m2, leaf: m2Leaf, leafHex: m2LeafHex, fileHash: v2FileHash, ts: '2026-01-01T10:00:00Z' },
    { m: m3, leaf: m3Leaf, leafHex: m3LeafHex, fileHash: v3FileHash, ts: '2026-01-01T12:00:00Z' },
    { m: mB, leaf: mBLeaf, leafHex: mBLeafHex, fileHash: v3FileHash, ts: '2026-01-01T15:00:00Z' },
  ];

  for (let idx = 0; idx < batch2Manifests.length; idx++) {
    const item = batch2Manifests[idx];
    const recId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO records (
        id, batch_id, leaf_index, kind, leaf_hash, content_hash, file_name, mime, size,
        metadata_json, confirmed_by, confirmed_at, manifest_json,
        work_id, version_no, parent_leaf, creator_pub, storage_mode, visibility, created_at
      ) VALUES (
        ?, 'b-0002', ?, 'manifest', ?, ?, ?, 'text/plain', ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, 'none', 'public', ?
      )
    `).run(
      recId,
      idx,
      item.leafHex,
      item.fileHash,
      item.m.fileName,
      item.m.size,
      JSON.stringify(item.m),
      item.m.creator.displayName || item.m.creator.publicKey,
      item.ts,
      canonicalJson(item.m),
      item.m.workId,
      item.m.version,
      item.m.parentLeaf || null,
      item.m.creator.publicKey,
      item.ts
    );
  }

  // Build Merkle tree for Batch b-0002
  const tree2 = buildTree(batch2Manifests.map((b) => b.leaf));
  const root2 = Buffer.from(tree2[tree2.length - 1][0]).toString('hex');

  db.prepare(`
    UPDATE batches SET
      status = 'anchored',
      sealed_at = ?,
      root = ?,
      leaf_count = 4,
      anchor_seq = 1,
      anchor_entry_json = ?,
      eth_chain_id = 31337,
      eth_contract = '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      eth_anchor_id = 1,
      eth_tx_hash = '0x2222222222222222222222222222222222222222222222222222222222222222'
    WHERE id = 'b-0002'
  `).run(
    '2026-01-01T16:00:00Z',
    root2,
    JSON.stringify({ seq: 1, batchId: 'b-0002', root: root2, leafCount: 4 })
  );

  console.log(`  ✓ Registered Creator A 3-version work (trail linked via parentLeaf)`);
  console.log(`  ✓ Registered Creator B competing claim for identical content hash (${v3FileHash.slice(0, 16)}...)`);
  console.log(`  🔗 Batch b-0002 Merkle Root: ${root2}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Pre-tampered copies in samples/tamper/ (Section 13.1)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Generating Pre-Tampered Copies in samples/tamper/ ---');

  // Copy genuine certificate & proof as baseline
  const genuinePdfPath = path.join(CERTS_DIR, 'certificate-1.pdf');
  const genuineProofPath = path.join(CERTS_DIR, 'certificate-1.pcproof.json');

  const genuinePdfBytes = fs.readFileSync(genuinePdfPath);
  const genuineProofText = fs.readFileSync(genuineProofPath, 'utf-8');

  fs.writeFileSync(path.join(TAMPER_DIR, 'original-certificate.pdf'), genuinePdfBytes);
  fs.writeFileSync(path.join(TAMPER_DIR, 'original-proof.pcproof.json'), genuineProofText);

  // 1. Tampered certificate.pdf: Flip 1 byte at index 180 (triggers DOC_MODIFIED)
  const tamperedPdf = new Uint8Array(genuinePdfBytes);
  tamperedPdf[180] = tamperedPdf[180] ^ 0xff;
  fs.writeFileSync(path.join(TAMPER_DIR, 'tampered-certificate.pdf'), tamperedPdf);
  console.log(`  ✓ Created samples/tamper/tampered-certificate.pdf (flipped byte 180 -> triggers DOC_MODIFIED)`);

  // 2. Tampered proof bundle: Modify first path step hash (triggers ROOT_MISMATCH)
  const proofObj = JSON.parse(genuineProofText);
  if (proofObj.path && proofObj.path.length > 0) {
    const origHash = proofObj.path[0].hash;
    const flippedHash = (origHash[0] === 'a' ? 'b' : 'a') + origHash.slice(1);
    proofObj.path[0].hash = flippedHash;
  }
  fs.writeFileSync(
    path.join(TAMPER_DIR, 'tampered-proof.pcproof.json'),
    JSON.stringify(proofObj, null, 2),
    'utf-8'
  );
  console.log(`  ✓ Created samples/tamper/tampered-proof.pcproof.json (corrupted Merkle step -> triggers ROOT_MISMATCH)`);

  console.log('\n=============================================================');
  console.log(' ✅ Deterministic Seed Complete!');
  console.log(`    Batch b-0001 Root: ${root1}`);
  console.log(`    Batch b-0002 Root: ${root2}`);
  console.log('=============================================================\n');
}

main().catch((err) => {
  console.error('Seed generation failed:', err);
  process.exit(1);
});
