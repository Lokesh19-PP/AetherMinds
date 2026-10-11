/**
 * textFromFile.ts
 * Extracts plain text from a file's raw bytes.
 *
 * Supported modes:
 *  - PDF  → uses pdf-parse (import via the /lib path to avoid the index.js test-file bug)
 *  - Text → UTF-8 decode (handles .txt, .json, .md, .csv, etc.)
 *  - Other → returns empty string (images, binaries are not text-extractable here;
 *             image similarity is handled via dHash in the browser)
 *
 * NOTE: Import pdf-parse via the /lib subpath!
 * The package root `pdf-parse` attempts to read a test PDF on import,
 * which throws in environments that don't have that file (e.g., CI, prod).
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
  dataBuffer: Buffer,
  options?: Record<string, unknown>,
) => Promise<{ text: string; numpages: number; info: Record<string, unknown> }>;

export type FileKind = 'pdf' | 'text' | 'unknown';

export interface ExtractedText {
  /** The extracted plain text. Empty string if extraction is not possible. */
  text: string;
  /** Detected file kind. */
  kind: FileKind;
  /** Number of pages (PDFs only). */
  pageCount?: number;
}

/**
 * Detect file kind by magic bytes (PDF) or assume UTF-8 text.
 */
function detectKind(bytes: Uint8Array): FileKind {
  // PDF magic: %PDF
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return 'pdf';
  }

  // Heuristic: if the first 512 bytes are printable UTF-8, treat as text.
  // Binary files often have null bytes or control characters early.
  const sample = bytes.slice(0, Math.min(512, bytes.length));
  let nullCount = 0;
  for (const b of sample) {
    if (b === 0x00) nullCount++;
  }
  if (nullCount === 0) return 'text';

  return 'unknown';
}

/**
 * Extract plain text from raw file bytes.
 *
 * @param bytes  - Raw file bytes (Uint8Array or Buffer).
 * @param hint   - Optional explicit MIME type hint, e.g. "application/pdf" or "text/plain".
 * @returns      ExtractedText with `.text`, `.kind`, and optional `.pageCount`.
 */
export async function textFromFile(
  bytes: Uint8Array,
  hint?: string,
): Promise<ExtractedText> {
  // Resolve kind from hint or magic bytes
  let kind: FileKind;
  if (hint === 'application/pdf' || hint === 'pdf') {
    kind = 'pdf';
  } else if (hint != null && hint.startsWith('text/')) {
    kind = 'text';
  } else {
    kind = detectKind(bytes);
  }

  if (kind === 'pdf') {
    try {
      const buf = Buffer.from(bytes);
      const result = await pdfParse(buf, {
        // Disable test file loading
        version: 'default',
      });
      return {
        text: result.text,
        kind: 'pdf',
        pageCount: result.numpages,
      };
    } catch {
      // PDF parse failed – return empty rather than crashing the extraction pipeline
      return { text: '', kind: 'pdf', pageCount: 0 };
    }
  }

  if (kind === 'text') {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(bytes);
    return { text, kind: 'text' };
  }

  // Binary / unknown – not extractable as text
  return { text: '', kind: 'unknown' };
}
