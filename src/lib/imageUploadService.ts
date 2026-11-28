import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
  where,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import {
  VALIDATION_LIMITS,
  type WikiMediaAsset,
  type WikiMediaContentType,
} from '../types/wiki';
import type { ImageUploadExtensionConfig } from './extensionsService';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  db,
  handleFirestoreError,
  OperationType,
  storage,
} from './firebase';
import { toWikiSlug } from './markdownUtils';

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIREBASE_STORAGE_BUCKET = firebaseConfig.storageBucket;

export const FIREBASE_BLAZE_UPGRADE_URL = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/usage/details`;
export const FIREBASE_STORAGE_CONSOLE_URL = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/storage`;
export const FIREBASE_STORAGE_RULES_URL = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/storage/rules`;

export const RECOMMENDED_STORAGE_RULES = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{folder}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.email_verified == true
        && request.resource.size <= 25 * 1024 * 1024
        && request.resource.contentType.matches('image/(png|jpeg|webp|gif|avif)');
    }
  }
}`;

export const ALLOWED_UPLOAD_MIME_TYPES = new Set<WikiMediaContentType>([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const EXTENSION_BY_MIME: Record<WikiMediaContentType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export interface ImageUploadBlockedReason {
  code: 'extension-disabled' | 'blaze-unconfirmed' | 'both-missing';
  title: string;
  detail: string;
}

export function getImageUploadBlockedReason(
  config: ImageUploadExtensionConfig
): ImageUploadBlockedReason | null {
  if (config.canUpload) return null;
  if (!config.extensionEnabled && !config.blazePlanConfirmed) {
    return {
      code: 'both-missing',
      title: 'Image upload disabled (Extension & Firebase Blaze required)',
      detail:
        'Image uploads are disabled by default. A Bureaucrat must enable the Image Upload extension (:image-upload) and confirm that the Firebase Blaze paid plan is active.',
    };
  }
  if (!config.extensionEnabled) {
    return {
      code: 'extension-disabled',
      title: 'Image Upload extension is disabled',
      detail:
        'A Bureaucrat must activate the Image Upload extension (:image-upload) in the Admin Console -> Extensions Manager before files can be uploaded.',
    };
  }
  return {
    code: 'blaze-unconfirmed',
    title: 'Firebase Blaze plan confirmation required',
    detail:
      'The Image Upload extension is enabled, but a Bureaucrat must confirm inside the extension settings that the Firebase Blaze paid plan and Cloud Storage are active.',
  };
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = Number.isFinite(img.naturalWidth) ? Math.max(0, Math.round(img.naturalWidth)) : 0;
      const height = Number.isFinite(img.naturalHeight) ? Math.max(0, Math.round(img.naturalHeight)) : 0;
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: 0, height: 0 });
    };
    img.src = objectUrl;
  });
}

function sanitizeBaseFileName(rawName: string): string {
  const withoutExt = rawName.replace(/\.[a-z0-9]{1,8}$/i, '');
  const slug = toWikiSlug(withoutExt).slice(0, 48);
  return slug || 'image';
}

function mapStorageUploadError(error: unknown): Error {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const message = error instanceof Error ? error.message : String(error);

  if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') {
    return new Error(
      'Firebase Storage rejected the upload (unauthorized). Verify that your Firebase Storage security rules allow verified users to write images and that the Blaze plan is active.'
    );
  }
  if (code === 'storage/quota-exceeded') {
    return new Error(
      'Firebase Storage quota exceeded. Verify your Firebase Blaze billing plan and Storage quota in the Firebase Console.'
    );
  }
  if (code === 'storage/retry-limit-exceeded' || /cors|network|timeout|bucket/i.test(message)) {
    return new Error(
      `Could not complete upload to Firebase Storage bucket (${FIREBASE_STORAGE_BUCKET}). Make sure the Firebase Blaze paid plan and Cloud Storage are activated in Firebase Console.`
    );
  }
  if (code === 'storage/canceled') {
    return new Error('Image upload was canceled.');
  }
  return new Error(
    message ||
      'Image upload failed. Confirm that the Firebase Blaze plan and Cloud Storage are enabled.'
  );
}

export async function uploadWikiImage(params: {
  file: File;
  user: User;
  config: ImageUploadExtensionConfig;
  pageSlug?: string;
  altText?: string;
  onProgress?: (percent: number) => void;
}): Promise<WikiMediaAsset> {
  const { file, user, config, pageSlug, altText, onProgress } = params;

  const blocked = getImageUploadBlockedReason(config);
  if (blocked) {
    throw new Error(blocked.detail);
  }

  if (!user.emailVerified) {
    throw new Error('A verified Google account is required to upload images.');
  }

  if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type as WikiMediaContentType)) {
    throw new Error(
      'Unsupported image format. Please choose a PNG, JPEG, WebP, GIF, or AVIF image.'
    );
  }

  const contentType = file.type as WikiMediaContentType;
  const maxBytes = config.maxUploadSizeMb * 1024 * 1024;
  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error(
      `Image file size must be between 1 byte and ${config.maxUploadSizeMb} MB.`
    );
  }

  const dimensions = await readImageDimensions(file);
  const mediaId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const safeBaseName = sanitizeBaseFileName(file.name);
  const ext = EXTENSION_BY_MIME[contentType] || 'png';
  const safePageSlug = pageSlug ? toWikiSlug(pageSlug).slice(0, 128) : '';
  const folderSegment = safePageSlug || 'shared';
  const storagePath = `${config.storageFolder}/${folderSegment}/${mediaId}-${safeBaseName}.${ext}`;

  const storageRef = ref(storage, storagePath);

  let downloadUrl = '';
  try {
    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file, {
        contentType,
        cacheControl: 'public, max-age=31536000',
        customMetadata: {
          uploadedBy: user.uid,
          pageSlug: safePageSlug || 'shared',
        },
      });

      task.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            const pct = Math.min(
              100,
              Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            );
            onProgress(pct);
          }
        },
        (err) => reject(err),
        () => resolve()
      );
    });

    downloadUrl = await getDownloadURL(storageRef);
  } catch (err) {
    throw mapStorageUploadError(err);
  }

  if (!downloadUrl || !/^https:\/\//i.test(downloadUrl)) {
    throw new Error('Firebase Storage returned an invalid HTTPS download URL.');
  }

  const cleanFileName = (file.name || `${safeBaseName}.${ext}`)
    .trim()
    .slice(0, VALIDATION_LIMITS.MEDIA_FILE_NAME_MAX_LENGTH);
  const cleanAlt = (altText || cleanFileName.replace(/\.[a-z0-9]{1,8}$/i, ''))
    .trim()
    .slice(0, VALIDATION_LIMITS.MEDIA_ALT_TEXT_MAX_LENGTH);
  const uploaderName = (user.displayName || user.email || 'Collaborator')
    .trim()
    .slice(0, VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH);

  const assetDocRef = doc(db, 'wiki_media', mediaId);
  try {
    await setDoc(assetDocRef, {
      id: mediaId,
      scope: 'site',
      fileName: cleanFileName || `${safeBaseName}.${ext}`,
      altText: cleanAlt,
      downloadUrl: downloadUrl.slice(0, VALIDATION_LIMITS.MEDIA_DOWNLOAD_URL_MAX_LENGTH),
      storagePath: storagePath.slice(0, VALIDATION_LIMITS.MEDIA_STORAGE_PATH_MAX_LENGTH),
      contentType,
      sizeBytes: file.size,
      width: dimensions.width,
      height: dimensions.height,
      pageSlug: safePageSlug,
      uploadedBy: user.uid,
      uploadedByName: uploaderName,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `wiki_media/${mediaId}`);
  }

  onProgress?.(100);

  return {
    id: mediaId,
    scope: 'site',
    fileName: cleanFileName || `${safeBaseName}.${ext}`,
    altText: cleanAlt,
    downloadUrl,
    storagePath,
    contentType,
    sizeBytes: file.size,
    width: dimensions.width,
    height: dimensions.height,
    pageSlug: safePageSlug,
    uploadedBy: user.uid,
    uploadedByName: uploaderName,
    createdAt: null,
  };
}

export function subscribeWikiMediaAssets(
  onChange: (assets: WikiMediaAsset[]) => void,
  onError?: (err: Error) => void,
  maxItems = 60
): Unsubscribe {
  const q = query(
    collection(db, 'wiki_media'),
    where('scope', '==', 'site'),
    limit(maxItems)
  );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WikiMediaAsset, 'id'>),
        }))
        .sort((a, b) => {
          const aMs = a.createdAt ? a.createdAt.toMillis() : 0;
          const bMs = b.createdAt ? b.createdAt.toMillis() : 0;
          return bMs - aMs;
        });
      onChange(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'wiki_media');
      } catch (formatted) {
        onError?.(formatted instanceof Error ? formatted : new Error(String(formatted)));
      }
    }
  );
}

export async function deleteWikiMediaAsset(asset: WikiMediaAsset): Promise<void> {
  const docPath = `wiki_media/${asset.id}`;
  try {
    await deleteDoc(doc(db, 'wiki_media', asset.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }

  if (asset.storagePath) {
    try {
      await deleteObject(ref(storage, asset.storagePath));
    } catch (storageErr) {
      console.warn('Could not delete Firebase Storage object:', storageErr);
    }
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}
