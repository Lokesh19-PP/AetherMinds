import { CoreError } from './errors.js';

/**
 * Produces deterministic canonical JSON according to Section 6.1:
 * 1. Object keys sorted by UTF-16 code-unit order.
 * 2. No whitespace between tokens.
 * 3. Every string is Unicode NFC normalized.
 * 4. Allowed types: object, array, string, boolean, null, and integers only.
 *    Any float, NaN, Infinity, undefined, or function throws CoreError('CANON_UNSUPPORTED').
 * 5. Duplicate keys after NFC normalization throw CoreError('CANON_DUPLICATE_KEY').
 */
export function canonicalJson(value: unknown): string {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    throw new CoreError('CANON_UNSUPPORTED', `Unsupported value type in canonical JSON: ${typeof value}`);
  }

  if (value === null) {
    return 'null';
  }

  const type = typeof value;

  if (type === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (type === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new CoreError('CANON_UNSUPPORTED', `Only integers are supported in canonical JSON, got ${value}`);
    }
    return (value as number).toString();
  }

  if (type === 'string') {
    const normalized = (value as string).normalize('NFC');
    return JSON.stringify(normalized);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalJson(item));
    return `[${items.join(',')}]`;
  }

  if (type === 'object') {
    const obj = value as Record<string, unknown>;
    const seenNormalizedKeys = new Set<string>();
    const normalizedEntries: { rawKey: string; normKey: string; val: unknown }[] = [];

    for (const rawKey of Object.keys(obj)) {
      const normKey = rawKey.normalize('NFC');
      if (seenNormalizedKeys.has(normKey)) {
        throw new CoreError('CANON_DUPLICATE_KEY', `Duplicate key after NFC normalization: ${normKey}`);
      }
      seenNormalizedKeys.add(normKey);
      normalizedEntries.push({ rawKey, normKey, val: obj[rawKey] });
    }

    normalizedEntries.sort((a, b) => {
      if (a.normKey < b.normKey) return -1;
      if (a.normKey > b.normKey) return 1;
      return 0;
    });

    const pairs = normalizedEntries.map((entry) => {
      if (entry.val === undefined) {
        throw new CoreError('CANON_UNSUPPORTED', `Undefined value for key ${entry.normKey}`);
      }
      const keyStr = JSON.stringify(entry.normKey);
      const valStr = canonicalJson(entry.val);
      return `${keyStr}:${valStr}`;
    });

    return `{${pairs.join(',')}}`;
  }

  throw new CoreError('CANON_UNSUPPORTED', `Unsupported value type in canonical JSON: ${type}`);
}
