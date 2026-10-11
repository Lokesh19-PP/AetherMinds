import { describe, it, expect } from 'vitest';
import { hammingDistance, isNearDuplicateImage } from '../src/lib/similarity';

describe('similarity.ts - 64-bit dHash and Hamming Distance', () => {
  it('computes 0 distance for identical hashes', () => {
    const hash = '0123456789abcdef';
    expect(hammingDistance(hash, hash)).toBe(0);
    expect(isNearDuplicateImage(hash, hash)).toBe(true);
  });

  it('computes exact bit difference for differing hashes', () => {
    // '0' is 0000, '1' is 0001 (1 bit difference)
    const hashA = '0000000000000000';
    const hashB = '0000000000000001';
    expect(hammingDistance(hashA, hashB)).toBe(1);
    expect(isNearDuplicateImage(hashA, hashB)).toBe(true);

    // 'f' is 1111 (4 bits difference per char)
    const hashC = 'ffffffffffffffff';
    expect(hammingDistance(hashA, hashC)).toBe(64);
    expect(isNearDuplicateImage(hashA, hashC)).toBe(false);
  });

  it('respects the frozen threshold of 10 for near-duplicates', () => {
    // 8 bits different
    const hashA = '0000000000000000';
    const hashB = '00000000000000ff'; // 'ff' has 8 bits set
    expect(hammingDistance(hashA, hashB)).toBe(8);
    expect(isNearDuplicateImage(hashA, hashB)).toBe(true);

    // 12 bits different
    const hashC = '0000000000000fff'; // 'fff' has 12 bits set
    expect(hammingDistance(hashA, hashC)).toBe(12);
    expect(isNearDuplicateImage(hashA, hashC)).toBe(false);
  });

  it('throws on mismatched hash lengths', () => {
    expect(() => hammingDistance('00', '0000')).toThrow(/Hash lengths do not match/);
  });
});
