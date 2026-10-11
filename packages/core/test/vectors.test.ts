import { describe, it, expect } from 'vitest';
import { utf8ToBytes, bytesToHex, hexToBytes, concatBytes, constantTimeEqual } from '../src/bytes.js';
import { sha256 } from '@noble/hashes/sha256';

describe('Known-Answer Vectors - Section 6.7', () => {
  it('SHA-256("abc") matches known vector', () => {
    const input = utf8ToBytes('abc');
    const hash = sha256(input);
    const hex = bytesToHex(hash);
    expect(hex).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('Byte utilities round-trip hex conversions correctly', () => {
    const originalHex = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
    const bytes = hexToBytes(originalHex);
    expect(bytes.length).toBe(32);
    expect(bytesToHex(bytes)).toBe(originalHex);
  });

  it('constantTimeEqual correctly compares byte arrays', () => {
    const a = hexToBytes('abcdef01');
    const b = hexToBytes('abcdef01');
    const c = hexToBytes('abcdef02');
    expect(constantTimeEqual(a, b)).toBe(true);
    expect(constantTimeEqual(a, c)).toBe(false);
  });

  it('concatBytes joins arrays in order', () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3, 4]);
    const combined = concatBytes(a, b);
    expect(Array.from(combined)).toEqual([1, 2, 3, 4]);
  });
});
