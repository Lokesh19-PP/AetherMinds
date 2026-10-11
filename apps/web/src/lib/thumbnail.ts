export interface ThumbnailResult {
  blob: Blob;
  bytes: Uint8Array;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
}

export interface ThumbnailOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxBytes?: number; // Defaults to 204800 (200 KB) as specified in section 19
  initialQuality?: number;
}

export const PREVIEW_MAX_BYTES = 204800; // 200 KB hard limit

/**
 * Generates an optimized JPEG thumbnail from an image or video file using HTML5 Canvas.
 * Automatically strips all EXIF, GPS, and device metadata by re-encoding via canvas.
 * Iteratively tunes JPEG compression to guarantee output size <= maxBytes.
 */
export async function generateThumbnail(
  file: File | Blob,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult> {
  const maxWidth = options.maxWidth ?? 800;
  const maxHeight = options.maxHeight ?? 800;
  const maxBytes = options.maxBytes ?? PREVIEW_MAX_BYTES;
  const initialQuality = options.initialQuality ?? 0.82;

  // Determine source type
  const isVideo = file.type.startsWith('video/');

  let sourceWidth = 0;
  let sourceHeight = 0;
  let drawable: CanvasImageSource;

  if (isVideo) {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const url = URL.createObjectURL(file);
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => {
        video.currentTime = Math.min(0.5, video.duration / 2 || 0);
      };
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video poster frame'));
    });

    sourceWidth = video.videoWidth;
    sourceHeight = video.videoHeight;
    drawable = video;
  } else {
    // Image loading
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for thumbnail generation'));
    });

    sourceWidth = img.naturalWidth || img.width;
    sourceHeight = img.naturalHeight || img.height;
    drawable = img;
  }

  // Calculate scaled dimensions maintaining aspect ratio
  let targetWidth = sourceWidth;
  let targetHeight = sourceHeight;

  if (targetWidth > maxWidth || targetHeight > maxHeight) {
    const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
    targetWidth = Math.round(targetWidth * ratio);
    targetHeight = Math.round(targetHeight * ratio);
  }

  // Render to canvas (strips all EXIF/GPS)
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(drawable, 0, 0, targetWidth, targetHeight);

  // Iteratively compress as JPEG to ensure size <= maxBytes
  let quality = initialQuality;
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
    });

    if (!blob) {
      throw new Error('Failed to convert canvas to JPEG Blob');
    }

    if (blob.size <= maxBytes || quality <= 0.4) {
      break;
    }

    // Reduce quality proportionally to overshoot
    quality = Math.max(0.35, quality * (maxBytes / blob.size) * 0.95);
  }

  if (!blob) {
    throw new Error('Unable to create thumbnail Blob');
  }

  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);

  return {
    blob,
    bytes,
    dataUrl,
    width: targetWidth,
    height: targetHeight,
    size: blob.size,
  };
}
