import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { createDatabase, RegistryDB } from '../src/db';
import { signManifest, CreatorManifest } from '@proofchain/core';
import { ed25519 } from '@noble/curves/ed25519';

describe('CreatorProof Side 2 Backend Routes', () => {
  let db: RegistryDB;
  let app: ReturnType<typeof createApp>;

  // Creator A credentials
  const seedA = new Uint8Array(32).fill(1);
  const privHexA = Buffer.from(seedA).toString('hex');
  const pubHexA = Buffer.from(ed25519.getPublicKey(seedA)).toString('hex');

  // Creator B credentials
  const seedB = new Uint8Array(32).fill(2);
  const privHexB = Buffer.from(seedB).toString('hex');
  const pubHexB = Buffer.from(ed25519.getPublicKey(seedB)).toString('hex');

  const FAKE_FILE_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  beforeEach(() => {
    db = createDatabase(':memory:');
    app = createApp({ db });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. POST /api/manifests
  // ═══════════════════════════════════════════════════════════════════════════
  describe('POST /api/manifests', () => {
    it('accepts a valid signed manifest without issuer auth token and returns 201 pending', async () => {
      const unsignedManifest = {
        schema: 'creatorproof/manifest/1',
        workId: 'work-1001',
        version: 1,
        parentLeaf: null,
        fileHash: FAKE_FILE_HASH,
        fileName: 'art-draft.png',
        mime: 'image/png',
        size: 1024,
        title: 'Celestial Dawn',
        description: 'First digital draft',
        category: 'Digital Art',
        tags: ['celestial', 'dawn'],
        license: 'CC_BY_NC',
        licenseText: null,
        creator: {
          publicKey: pubHexA,
          displayName: 'Asha K.',
        },
        createdAtClaimed: '2026-10-11T10:00:00Z',
      };

      const manifest = signManifest(unsignedManifest, privHexA);

      const res = await request(app)
        .post('/api/manifests')
        .send({ manifest });

      expect(res.status).toBe(201);
      expect(res.body.recordId).toBeDefined();
      expect(res.body.leafHash).toBeDefined();
      expect(res.body.status).toBe('pending');
      expect(res.body.batchId).toBe('b-0001');

      // Verify DB record has kind = 'manifest'
      const record = db
        .prepare('SELECT * FROM records WHERE id = ?')
        .get(res.body.recordId);
      expect(record).toBeDefined();
      expect(record.kind).toBe('manifest');
      expect(record.leaf_hash).toBe(res.body.leafHash);
      expect(record.creator_pub).toBe(pubHexA);
      expect(record.work_id).toBe('work-1001');
      expect(record.version_no).toBe(1);

      // Verify creator was added to creators table
      const creator = db
        .prepare('SELECT * FROM creators WHERE public_key = ?')
        .get(pubHexA);
      expect(creator).toBeDefined();
      expect(creator.display_name).toBe('Asha K.');
    });

    it('rejects a manifest with an invalid Ed25519 signature (422 SIGNATURE_INVALID)', async () => {
      const unsignedManifest = {
        schema: 'creatorproof/manifest/1',
        workId: 'work-1002',
        version: 1,
        parentLeaf: null,
        fileHash: FAKE_FILE_HASH,
        fileName: 'tampered.png',
        mime: 'image/png',
        size: 500,
        title: 'Tampered Artwork',
        category: 'Digital Art',
        license: 'CC_BY',
        creator: {
          publicKey: pubHexA,
          displayName: 'Asha K.',
        },
        createdAtClaimed: '2026-10-11T10:00:00Z',
      };

      const signed = signManifest(unsignedManifest, privHexA);
      // Tamper signature by flipping characters
      signed.signature = '00'.repeat(64);

      const res = await request(app)
        .post('/api/manifests')
        .send({ manifest: signed });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('SIGNATURE_INVALID');
    });

    it('rejects duplicate manifest registration (409 DUPLICATE)', async () => {
      const unsignedManifest = {
        schema: 'creatorproof/manifest/1',
        workId: 'work-1003',
        version: 1,
        parentLeaf: null,
        fileHash: FAKE_FILE_HASH,
        fileName: 'artwork.png',
        mime: 'image/png',
        size: 2048,
        title: 'Unique Piece',
        category: 'Digital Art',
        license: 'ALL_RIGHTS_RESERVED',
        creator: {
          publicKey: pubHexA,
          displayName: 'Asha K.',
        },
        createdAtClaimed: '2026-10-11T10:00:00Z',
      };

      const manifest = signManifest(unsignedManifest, privHexA);

      const res1 = await request(app).post('/api/manifests').send({ manifest });
      expect(res1.status).toBe(201);

      const res2 = await request(app).post('/api/manifests').send({ manifest });
      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('DUPLICATE');
    });

    it('rejects missing manifest with 422 VALIDATION_ERROR', async () => {
      const res = await request(app).post('/api/manifests').send({});
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. GET /api/works/:workId (Creation Trail)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('GET /api/works/:workId', () => {
    it('returns a multi-version creation trail linked via parentLeaf', async () => {
      const workId = 'work-trail-2026';

      // Version 1: Initial Draft (parentLeaf = null)
      const v1Unsigned = {
        schema: 'creatorproof/manifest/1',
        workId,
        version: 1,
        parentLeaf: null,
        fileHash: '1111111111111111111111111111111111111111111111111111111111111111',
        fileName: 'sketch_v1.png',
        mime: 'image/png',
        size: 1000,
        title: 'Sunset Harbor',
        category: 'Digital Art',
        license: 'CC_BY',
        creator: { publicKey: pubHexA, displayName: 'Asha K.' },
        createdAtClaimed: '2026-10-11T09:00:00Z',
      };
      const v1 = signManifest(v1Unsigned, privHexA);
      const res1 = await request(app).post('/api/manifests').send({ manifest: v1 });
      expect(res1.status).toBe(201);
      const v1LeafHash = res1.body.leafHash;

      // Version 2: Colors & Inking (parentLeaf = v1LeafHash)
      const v2Unsigned = {
        schema: 'creatorproof/manifest/1',
        workId,
        version: 2,
        parentLeaf: v1LeafHash,
        fileHash: '2222222222222222222222222222222222222222222222222222222222222222',
        fileName: 'colors_v2.png',
        mime: 'image/png',
        size: 2000,
        title: 'Sunset Harbor - Inked',
        category: 'Digital Art',
        license: 'CC_BY',
        creator: { publicKey: pubHexA, displayName: 'Asha K.' },
        createdAtClaimed: '2026-10-11T10:00:00Z',
      };
      const v2 = signManifest(v2Unsigned, privHexA);
      const res2 = await request(app).post('/api/manifests').send({ manifest: v2 });
      expect(res2.status).toBe(201);
      const v2LeafHash = res2.body.leafHash;

      // Version 3: Final Master (parentLeaf = v2LeafHash)
      const v3Unsigned = {
        schema: 'creatorproof/manifest/1',
        workId,
        version: 3,
        parentLeaf: v2LeafHash,
        fileHash: '3333333333333333333333333333333333333333333333333333333333333333',
        fileName: 'final_v3.png',
        mime: 'image/png',
        size: 3000,
        title: 'Sunset Harbor - Final',
        category: 'Digital Art',
        license: 'ALL_RIGHTS_RESERVED',
        creator: { publicKey: pubHexA, displayName: 'Asha K.' },
        createdAtClaimed: '2026-10-11T11:00:00Z',
      };
      const v3 = signManifest(v3Unsigned, privHexA);
      const res3 = await request(app).post('/api/manifests').send({ manifest: v3 });
      expect(res3.status).toBe(201);
      const v3LeafHash = res3.body.leafHash;

      // Query the creation trail
      const trailRes = await request(app).get(`/api/works/${workId}`);
      expect(trailRes.status).toBe(200);
      expect(trailRes.body.workId).toBe(workId);
      expect(trailRes.body.versionCount).toBe(3);

      const versions = trailRes.body.versions;
      expect(versions).toHaveLength(3);

      // Verify order and linkages
      expect(versions[0].version).toBe(1);
      expect(versions[0].leafHash).toBe(v1LeafHash);
      expect(versions[0].parentLeaf).toBeNull();
      expect(versions[0].status).toBe('pending');

      expect(versions[1].version).toBe(2);
      expect(versions[1].leafHash).toBe(v2LeafHash);
      expect(versions[1].parentLeaf).toBe(v1LeafHash);

      expect(versions[2].version).toBe(3);
      expect(versions[2].leafHash).toBe(v3LeafHash);
      expect(versions[2].parentLeaf).toBe(v2LeafHash);
    });

    it('returns 404 for non-existent workId', async () => {
      const res = await request(app).get('/api/works/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. GET /api/claims (Competing Claims & Priority Proving)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('GET /api/claims', () => {
    it('returns competing claims ordered chronologically, proving registration priority', async () => {
      const SHARED_CONTENT_HASH = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      // Creator A registers first
      const manifestA = signManifest(
        {
          schema: 'creatorproof/manifest/1',
          workId: 'work-creator-a',
          version: 1,
          parentLeaf: null,
          fileHash: SHARED_CONTENT_HASH,
          fileName: 'original-art.png',
          mime: 'image/png',
          size: 5000,
          title: 'Original Artwork by Asha',
          category: 'Digital Art',
          license: 'CC_BY',
          creator: { publicKey: pubHexA, displayName: 'Asha K. (Original Creator)' },
          createdAtClaimed: '2026-10-11T08:00:00Z',
        },
        privHexA
      );

      const resA = await request(app).post('/api/manifests').send({ manifest: manifestA });
      expect(resA.status).toBe(201);

      // Creator B attempts to register the same content later
      const manifestB = signManifest(
        {
          schema: 'creatorproof/manifest/1',
          workId: 'work-creator-b',
          version: 1,
          parentLeaf: null,
          fileHash: SHARED_CONTENT_HASH,
          fileName: 'copied-art.png',
          mime: 'image/png',
          size: 5000,
          title: 'Copied Artwork by Bob',
          category: 'Digital Art',
          license: 'ALL_RIGHTS_RESERVED',
          creator: { publicKey: pubHexB, displayName: 'Bob T. (Later Claimant)' },
          createdAtClaimed: '2026-10-11T09:30:00Z',
        },
        privHexB
      );

      const resB = await request(app).post('/api/manifests').send({ manifest: manifestB });
      expect(resB.status).toBe(201);

      // Query claims for the shared content hash
      const claimsRes = await request(app).get(`/api/claims?contentHash=${SHARED_CONTENT_HASH}`);
      expect(claimsRes.status).toBe(200);
      expect(claimsRes.body.count).toBe(2);

      const claims = claimsRes.body.claims;
      // Creator A must be first because they registered first (priority of registration proven!)
      expect(claims[0].creatorPub).toBe(pubHexA);
      expect(claims[0].displayName).toBe('Asha K. (Original Creator)');
      expect(claims[0].matchType).toBe('exact');

      expect(claims[1].creatorPub).toBe(pubHexB);
      expect(claims[1].displayName).toBe('Bob T. (Later Claimant)');
      expect(claims[1].matchType).toBe('exact');
    });

    it('matches near-duplicate records via SimHash similarity', async () => {
      // Register document with SimHash
      const simHashA = '0123456789abcdef';
      // 1 bit flipped from simHashA (high similarity)
      const simHashSimilar = '0123456789abcdee';

      const manifest = signManifest(
        {
          schema: 'creatorproof/manifest/1',
          workId: 'work-simhash-test',
          version: 1,
          parentLeaf: null,
          fileHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          fileName: 'essay.txt',
          mime: 'text/plain',
          size: 1200,
          title: 'AI Governance Essay',
          category: 'Academic',
          license: 'CC_BY',
          creator: { publicKey: pubHexA, displayName: 'Asha K.' },
          createdAtClaimed: '2026-10-11T08:00:00Z',
        },
        privHexA
      );

      // Register with similarity metadata
      await request(app).post('/api/manifests').send({
        manifest,
        similarity: { kind: 'text-simhash', value: simHashA },
      });

      // Query claims with near-duplicate simHash
      const res = await request(app).get(`/api/claims?simHash=${simHashSimilar}`);
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.claims[0].matchType).toBe('similar');
      expect(res.body.claims[0].similarityScore).toBeGreaterThanOrEqual(0.85);
    });

    it('returns 400 when neither contentHash nor simHash is provided', async () => {
      const res = await request(app).get('/api/claims');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. POST /api/extract & POST /api/explain
  // ═══════════════════════════════════════════════════════════════════════════
  describe('AI Endpoints: /api/extract & /api/explain', () => {
    it('POST /api/extract extracts metadata and predicts category using rules and Naive Bayes', async () => {
      const sampleText =
        'INVOICE\\nIssuer: Acme Corp Ltd\\nInvoice Number: INV-9901\\nDate: 2026-03-15\\nTotal: $1,250.00\\nPayment terms: Net 30';

      const res = await request(app).post('/api/extract').send({ text: sampleText });
      expect(res.status).toBe(200);
      expect(res.body.fields).toBeDefined();
      expect(res.body.category).toBeDefined();
      expect(res.body.category.label).toBeDefined();
      expect(res.body.aiPath).toBe('rules');
      expect(res.body.simhash).toBeDefined();
    });

    it('POST /api/explain receives VerifyResult and returns guarded plain-language explanation', async () => {
      const verifyResult = {
        verdict: 'INVALID',
        code: 'DOC_MODIFIED',
        message: 'Byte mismatch',
        warnings: [],
      };

      const res = await request(app).post('/api/explain').send({ verifyResult });
      expect(res.status).toBe(200);
      expect(res.body.explanation).toBeDefined();
      expect(res.body.explanation).toContain('does not match the leaf');
      expect(res.body.aiPath).toBeDefined();
    });
  });
});

