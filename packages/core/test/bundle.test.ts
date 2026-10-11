import { describe, it, expect } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519';
import { bytesToHex, hexToBytes, utf8ToBytes } from '../src/bytes.js';
import { entryHash, signEntry, verifyEntrySignature, GENESIS_PREV } from '../src/anchorEntry.js';
import { makeBundle, validateBundleShape } from '../src/bundle.js';
import { signManifest, verifyManifest, UnsignedCreatorManifest } from '../src/manifest.js';

describe('Bundle, AnchorEntry & Manifest Verification', () => {
  const testSeed = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
  const expectedPub = '03a107bff3ce10be1d70dd18e74bc09967e4d6309ba50d5f1ddc8664125531b8';

  it('Ed25519 public key matches Section 6.7 vector', () => {
    const privKeyBytes = hexToBytes(testSeed);
    const pubBytes = ed25519.getPublicKey(privKeyBytes);
    expect(bytesToHex(pubBytes)).toBe(expectedPub);
  });

  it('Anchor entry hash and signature match Section 6.7 vectors', () => {
    const root = 'aa'.repeat(32);
    const prevHash = '00'.repeat(32);

    const unsignedEntry = {
      seq: 0,
      batchId: 'b-0001',
      root,
      leafCount: 5,
      issuer: 'demo-registry',
      ts: '2026-10-11T09:00:00Z',
      prevHash
    };

    const computedEntryHash = entryHash(unsignedEntry);
    expect(computedEntryHash).toBe('b2dea792d0302caf8b355661b9bd8ff907916494d8d24c016cdeb7f4b77399fc');

    const signed = signEntry(unsignedEntry, testSeed);
    expect(signed.sig).toBe(
      '9fab7877a8b16872c9c9e4c4d8052814ef060e984d8238887b433feba89dba501c0df863e6655f5214bb91348d06fe2c93f591915a79f175392e4791276bd108'
    );

    expect(verifyEntrySignature(signed, expectedPub)).toBe(true);

    // Tampering any field must fail signature verification
    const tampered = { ...signed, leafCount: 6 };
    expect(verifyEntrySignature(tampered, expectedPub)).toBe(false);
  });

  it('Creator manifest signs and verifies accurately', () => {
    const unsignedManifest: UnsignedCreatorManifest = {
      schema: 'creatorproof/manifest/1',
      workId: '123e4567-e89b-12d3-a456-426614174000',
      version: 1,
      parentLeaf: null,
      fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      fileName: 'artwork.png',
      mime: 'image/png',
      size: 1024,
      title: 'Sunrise',
      description: 'Test Artwork',
      category: 'Digital Art',
      tags: ['digital'],
      license: 'CC_BY',
      licenseText: null,
      creator: {
        publicKey: expectedPub,
        displayName: 'Asha K.'
      },
      createdAtClaimed: '2026-10-11T08:30:00Z'
    };

    const signed = signManifest(unsignedManifest, testSeed);
    expect(signed.signature.length).toBe(128);
    expect(verifyManifest(signed)).toBe(true);

    // Tampering title fails signature check
    const tampered = { ...signed, title: 'Sunrise Tampered' };
    expect(verifyManifest(tampered)).toBe(false);
  });

  it('validateBundleShape validates valid bundle and rejects invalid bundle', () => {
    const validBundle = makeBundle({
      batchId: 'b-0001',
      leafIndex: 4,
      leafCount: 5,
      leafHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      path: [{ hash: '37846ad6dff69d7052778d7483b8011d319fa38aa2d70c9dd053a7e848e485d4', side: 'L' }],
      anchors: [{ kind: 'ledger', seq: 0 }]
    });

    const result = validateBundleShape(validBundle);
    expect(result.valid).toBe(true);

    // Bad path length fails
    const badPathBundle = { ...validBundle, path: [] };
    const badResult = validateBundleShape(badPathBundle);
    expect(badResult.valid).toBe(false);
  });
});
