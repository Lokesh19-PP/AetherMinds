import { CoreError } from './errors.js';

export function canonicalJson(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  const type = typeof value;

  if (type === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (type === 'number') {
    if (!Number.isInteger(value)) {
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
      const keyStr = JSON.stringify(entry.normKey);
      const valStr = canonicalJson(entry.val);
      return `${keyStr}:${valStr}`;
    });

    return `{${pairs.join(',')}}`;
  }

  throw new CoreError('CANON_UNSUPPORTED', `Unsupported value type in canonical JSON: ${type}`);
}
