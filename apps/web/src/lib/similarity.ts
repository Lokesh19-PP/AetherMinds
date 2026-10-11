/**
 * Computes 64-bit difference hash (dHash) on canvas for fast visual image similarity.
 * Downsamples image to 9x8, converts to grayscale, and compares adjacent horizontal pixels.
 * 8 rows x 8 comparisons = 64 bits, packed into a 16-character hexadecimal string.
 */
export async function computeDHash(imageSource: File | Blob | HTMLImageElement | HTMLCanvasElement): Promise<string> {
  let drawable: CanvasImageSource;

  if (imageSource instanceof HTMLImageElement || imageSource instanceof HTMLCanvasElement) {
    drawable = imageSource;
  } else {
    const img = new Image();
    const url = URL.createObjectURL(imageSource);
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for dHash computation'));
    });
    drawable = img;
  }

  // 9 columns by 8 rows canvas
  const canvas = document.createElement('canvas');
  canvas.width = 9;
  canvas.height = 8;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  ctx.drawImage(drawable, 0, 0, 9, 8);
  const imgData = ctx.getImageData(0, 0, 9, 8);
  const data = imgData.data;

  // Grayscale matrix 9x8
  const grays: number[][] = [];
  for (let y = 0; y < 8; y++) {
    const row: number[] = [];
    for (let x = 0; x < 9; x++) {
      const idx = (y * 9 + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Standard luminance weighting
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      row.push(gray);
    }
    grays.push(row);
  }

  // Compare adjacent pixels horizontally: row by row, 8 bits per row = 64 bits
  let hexString = '';
  for (let y = 0; y < 8; y++) {
    let rowBits = 0;
    for (let x = 0; x < 8; x++) {
      const bit = grays[y][x] > grays[y][x + 1] ? 1 : 0;
      rowBits = (rowBits << 1) | bit;
    }
    // 8 bits = 2 hex chars
    hexString += rowBits.toString(16).padStart(2, '0');
  }

  return hexString.toLowerCase();
}

/**
 * Computes Hamming distance (count of differing bit positions) between two 64-bit dHash hex strings.
 * Distance range: 0 (identical) to 64 (complete inverse).
 * Threshold per guide section 10.4: distance <= 10 denotes high visual similarity.
 */
export function hammingDistance(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) {
    throw new Error(`Hash lengths do not match: ${hashA.length} vs ${hashB.length}`);
  }

  let distance = 0;
  for (let i = 0; i < hashA.length; i++) {
    const valA = parseInt(hashA[i], 16);
    const valB = parseInt(hashB[i], 16);
    let xor = valA ^ valB;
    // Count bits set in xor nibble
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }

  return distance;
}

/**
 * Evaluates whether two images are near-duplicates according to the frozen guide threshold.
 */
export function isNearDuplicateImage(hashA: string, hashB: string, threshold = 10): boolean {
  return hammingDistance(hashA, hashB) <= threshold;
}
