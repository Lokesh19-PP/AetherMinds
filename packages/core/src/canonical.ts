import { CoreError } from './index';

/**
 * Produces deterministic canonical JSON according to Section 6.1:
 * 1. Object keys sorted by UTF-16 code-unit order.
 * 2. No whitespace between tokens.
 * 3. Every string is Unicode NFC normalized.
 * 4. Allowed types: object, array, string, boolean, null, and integers only.
 *    Any float, NaN, Infinity, undefined, or function throws CoreError('CANON_UNSUPPORTED').
 * 5. Duplicate keys after NFC normalization throw.
 */
export function canonicalJson(value: unknown): string {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    throw new CoreError('CANON_UNSUPPORTED', 'Unsupported type for canonical JSON');
  }

  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new CoreError('CANON_UNSUPPORTED', 'Only integers are allowed in canonical JSON');
    }
    return value.toString();
  }

  if (typeof value === 'string') {
    const normalized = value.normalize('NFC');
    return JSON.stringify(normalized);
  }

  if (Array.isArray(value)) {
    const elements = value.map(canonicalJson);
    return `[${elements.join(',')}]`;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const rawKeys = Object.keys(obj);

    const keyMap = new Map<string, string>();
    for (const k of rawKeys) {
      const nfcKey = k.normalize('NFC');
      if (keyMap.has(nfcKey)) {
        throw new CoreError('CANON_DUPLICATE_KEY', `Duplicate key after NFC normalization: ${nfcKey}`);
      }
      keyMap.set(nfcKey, k);
    }

    const sortedNfcKeys = Array.from(keyMap.keys()).sort();
    const pairs: string[] = [];
    for (const nfcKey of sortedNfcKeys) {
      const originalKey = keyMap.get(nfcKey)!;
      const val = obj[originalKey];
      if (val === undefined) {
        throw new CoreError('CANON_UNSUPPORTED', `Undefined value for key ${nfcKey}`);
      }
      pairs.push(`${JSON.stringify(nfcKey)}:${canonicalJson(val)}`);
    }
    return `{${pairs.join(',')}}`;
  }

  throw new CoreError('CANON_UNSUPPORTED', 'Unsupported value in canonical JSON');
}
