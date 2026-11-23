import type { User } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { VALIDATION_LIMITS } from '../types/wiki';
import { storage } from './firebase';
import { toWikiSlug } from './markdownUtils';

const ALLOWED_RASTER_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const MAX_INPUT_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const STORAGE_MAX_WIDTH = 1600;
const INLINE_FALLBACK_MAX_CHARS = 175000;
const STORAGE_UPLOAD_TIMEOUT_MS = 8000;

const DATA_IMAGE_PATTERN =
  /^data:image\/(png|jpeg|jpg|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/i;

export interface HeaderImageUploadResult {
  url: string;
  provider: 'firebase-storage' | 'optimized-inline';
}

export function isValidHeaderImageUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.length > VALIDATION_LIMITS.HEADER_IMAGE_URL_MAX_LENGTH) return false;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.length <= VALIDATION_LIMITS.HEADER_IMAGE_EXTERNAL_URL_MAX_LENGTH;
  }

  return DATA_IMAGE_PATTERN.test(trimmed);
}

export function sanitizeHeaderImageUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (/^(javascript|vbscript|file):/i.test(trimmed)) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const normalized = trimmed.replace(/^https?:\/\//i, (scheme) => scheme.toLowerCase());
    return normalized.length <= VALIDATION_LIMITS.HEADER_IMAGE_EXTERNAL_URL_MAX_LENGTH
      ? normalized
      : '';
  }

  if (
    trimmed.length <= VALIDATION_LIMITS.HEADER_IMAGE_URL_MAX_LENGTH &&
    DATA_IMAGE_PATTERN.test(trimmed)
  ) {
    return trimmed;
  }

  return '';
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode the selected image file.'));
    };
    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function renderScaledCanvas(
  img: HTMLImageElement,
  maxWidth: number
): Promise<HTMLCanvasElement> {
  const naturalWidth = img.naturalWidth || 1200;
  const naturalHeight = img.naturalHeight || 480;
  const scale = naturalWidth > maxWidth ? maxWidth / naturalWidth : 1;
  const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
  const targetHeight = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser canvas context is unavailable.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  return canvas;
}

async function createStorageUploadPayload(
  file: File,
  img: HTMLImageElement
): Promise<{ blob: Blob; contentType: string; ext: string }> {
  if (file.type === 'image/gif' && file.size <= 2 * 1024 * 1024) {
    return { blob: file, contentType: 'image/gif', ext: 'gif' };
  }

  const canvas = await renderScaledCanvas(img, STORAGE_MAX_WIDTH);
  const webpBlob = await canvasToBlob(canvas, 'image/webp', 0.86);
  if (webpBlob && webpBlob.type === 'image/webp') {
    return { blob: webpBlob, contentType: 'image/webp', ext: 'webp' };
  }

  const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', 0.86);
  if (jpegBlob) {
    return { blob: jpegBlob, contentType: 'image/jpeg', ext: 'jpg' };
  }

  return {
    blob: file,
    contentType: file.type || 'image/png',
    ext: file.type.split('/')[1] || 'png',
  };
}

async function createCompactInlineDataUrl(img: HTMLImageElement): Promise<string> {
  const widthSteps = [1280, 1024, 840, 640];
  const qualitySteps = [0.82, 0.7, 0.58, 0.45, 0.34];

  for (const width of widthSteps) {
    const canvas = await renderScaledCanvas(img, width);
    for (const mime of ['image/webp', 'image/jpeg']) {
      for (const quality of qualitySteps) {
        const dataUrl = canvas.toDataURL(mime, quality);
        if (
          dataUrl.length <= INLINE_FALLBACK_MAX_CHARS &&
          DATA_IMAGE_PATTERN.test(dataUrl)
        ) {
          return dataUrl;
        }
      }
    }
  }

  throw new Error(
    'This image is too complex to optimize within metadata size limits. Try a smaller banner image or paste an HTTPS image URL.'
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Storage upload timed out.'));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

export async function uploadPageHeaderImage(
  file: File,
  slugHint: string,
  user: User
): Promise<HeaderImageUploadResult> {
  if (!ALLOWED_RASTER_MIME_TYPES.has(file.type)) {
    throw new Error(
      'Unsupported image format. Please choose a PNG, JPEG, WebP, GIF, or AVIF image.'
    );
  }

  if (file.size <= 0 || file.size > MAX_INPUT_FILE_BYTES) {
    throw new Error('Image file must be smaller than 10 MB.');
  }

  const img = await loadImageElement(file);
  const safeSlug = toWikiSlug(slugHint || 'page').slice(0, 64) || 'page';
  const safeUid = user.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'user';

  try {
    const payload = await createStorageUploadPayload(file, img);
    const fileRef = ref(
      storage,
      `wiki-headers/${safeSlug}/${safeUid}-${Date.now()}.${payload.ext}`
    );

    await withTimeout(
      uploadBytes(fileRef, payload.blob, {
        contentType: payload.contentType,
        cacheControl: 'public, max-age=31536000',
      }),
      STORAGE_UPLOAD_TIMEOUT_MS
    );

    const downloadUrl = await withTimeout(
      getDownloadURL(fileRef),
      STORAGE_UPLOAD_TIMEOUT_MS
    );
    const sanitized = sanitizeHeaderImageUrl(downloadUrl);
    if (sanitized) {
      return { url: sanitized, provider: 'firebase-storage' };
    }
  } catch (storageErr) {
    console.warn(
      'Firebase Storage header upload unavailable, falling back to compact banner URL:',
      storageErr
    );
  }

  const compactUrl = await createCompactInlineDataUrl(img);
  return { url: compactUrl, provider: 'optimized-inline' };
}
