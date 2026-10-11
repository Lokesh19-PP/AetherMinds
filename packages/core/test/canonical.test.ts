import { describe, it, expect } from 'vitest';
import { canonicalJson } from '../src/canonical.js';
import { sha256Hex } from '../src/hash.js';
import { utf8ToBytes } from '../src/bytes.js';
import { CoreError } from '../src/errors.js';

describe('Canonical JSON (RFC 8785 subset)', () => {
  it('matches known test vector from Section 6.7', () => {
    // Input {"b":1,"a":"e\u0301","c":[true,null]}
    const input = {
      b: 1,
      a: 'e\u0301',
      c: [true, null]
    };
    const canonical = canonicalJson(input);
    expect(canonical).toBe('{"a":"é","b":1,"c":[true,null]}');

    const hash = sha256Hex(utf8ToBytes(canonical));
    expect(hash).toBe('9351126962ec151dbc6c007b85647facd7b1dd4a3a24f1640444422ec639773f');
  });

  it('rejects non-integer floating point numbers', () => {
    expect(() => canonicalJson({ val: 3.14 })).toThrowError(CoreError);
  });

  it('rejects NaN and Infinity', () => {
    expect(() => canonicalJson({ val: NaN })).toThrowError(CoreError);
    expect(() => canonicalJson({ val: Infinity })).toThrowError(CoreError);
  });

  it('sorts keys lexicographically by UTF-16 code units', () => {
    const input = { z: 1, a: 2, m: 3, B: 4 };
    expect(canonicalJson(input)).toBe('{"B":4,"a":2,"m":3,"z":1}');
  });

  it('preserves boolean, null, and integer values', () => {
    expect(canonicalJson([true, false, null, 0, -42])).toBe('[true,false,null,0,-42]');
  });
});
