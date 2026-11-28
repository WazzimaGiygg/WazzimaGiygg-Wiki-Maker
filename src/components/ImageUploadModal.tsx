import React from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Check,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  Loader2,
  Lock,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { ImageUploadExtensionConfig } from '../lib/extensionsService';
import {
  deleteWikiMediaAsset,
  formatBytes,
  getImageUploadBlockedReason,
  subscribeWikiMediaAssets,
  uploadWikiImage,
} from '../lib/imageUploadService';
import { formatRelativeTime } from '../lib/markdownUtils';
import type { WikiMediaAsset } from '../types/wiki';

interface ImageUploadModalProps {
  isOpen: boolean;
  currentUser: User | null;
  isAdmin?: boolean;
  pageSlug?: string;
  imageUploadConfig: ImageUploadExtensionConfig;
  onInsertImage: (markdownSnippet: string, imageUrl: string, altText: string) => void;
  onClose: () => void;
}

type ModalTab = 'upload' | 'library';

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  currentUser,
  isAdmin = false,
  pageSlug,
  imageUploadConfig,
  onInsertImage,
  onClose,
}) => {
  const [activeTab, setActiveTab] = React.useState<ModalTab>('upload');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string>('');
  const [altText, setAltText] = React.useState('');
  const [externalUrl, setExternalUrl] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [mediaAssets, setMediaAssets] = React.useState<WikiMediaAsset[]>([]);
  const [mediaLoading, setMediaLoading] = React.useState(false);
  const [mediaSearch, setMediaSearch] = React.useState('');
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const blockedReason = React.useMemo(
    () => getImageUploadBlockedReason(imageUploadConfig),
    [imageUploadConfig]
  );

  // Clean up object URL when selected file changes or modal closes
  React.useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return;
    }
    const objUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objUrl);
    return () => {
      URL.revokeObjectURL(objUrl);
    };
  }, [selectedFile]);

  // Reset form state when modal opens
  React.useEffect(() => {
    if (!isOpen) return;
    setActiveTab('upload');
    setSelectedFile(null);
    setAltText('');
    setExternalUrl('');
    setIsUploading(false);
    setUploadProgress(0);
    setErrorMsg(null);
    setConfirmDeleteId(null);
  }, [isOpen]);

  // Subscribe to uploaded wiki media library while modal is open
  React.useEffect(() => {
    if (!isOpen) return;
    setMediaLoading(true);
    const unsub = subscribeWikiMediaAssets(
      (items) => {
        setMediaAssets(items);
        setMediaLoading(false);
      },
      (err) => {
        setErrorMsg(err.message);
        setMediaLoading(false);
      }
    );
    return () => unsub();
  }, [isOpen]);

  // Escape key to close modal (unless actively uploading)
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [isOpen, isUploading, onClose]);

  const handleFileChosen = (file: File | null) => {
    if (!file) return;
    setErrorMsg(null);
    setSelectedFile(file);
    if (!altText.trim()) {
      const cleaned = file.name.replace(/\.[a-z0-9]{1,8}$/i, '').replace(/[_-]+/g, ' ').trim();
      setAltText(cleaned || 'Wiki image');
    }
  };

  const buildMarkdown = (url: string, alt: string) => {
    const safeAlt = (alt || 'Image').replace(/[\r\n[\]]+/g, ' ').trim() || 'Image';
    return `![${safeAlt}](${url})`;
  };

  const handleUploadAndInsert = async () => {
    if (!selectedFile) return;
    if (!currentUser) {
      setErrorMsg('Sign in with Google to upload images to Firebase Storage.');
      return;
    }

    setErrorMsg(null);
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const asset = await uploadWikiImage({
        file: selectedFile,
        user: currentUser,
        config: imageUploadConfig,
        pageSlug,
        altText: altText.trim(),
        onProgress: setUploadProgress,
      });
      const finalAlt = asset.altText || altText.trim() || asset.fileName;
      onInsertImage(buildMarkdown(asset.downloadUrl, finalAlt), asset.downloadUrl, finalAlt);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to upload image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInsertExternalUrl = () => {
    const trimmed = externalUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(trimmed)) {
      setErrorMsg('Please enter a valid http:// or https:// image URL.');
      return;
    }
    const finalAlt = altText.trim() || 'Image';
    onInsertImage(buildMarkdown(trimmed, finalAlt), trimmed, finalAlt);
    onClose();
  };

  const handleDeleteAsset = async (asset: WikiMediaAsset) => {
    setDeletingId(asset.id);
    setErrorMsg(null);
    try {
      await deleteWikiMediaAsset(asset);
      setConfirmDeleteId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not delete uploaded image.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAssets = React.useMemo(() => {
    const q = mediaSearch.trim().toLowerCase();
    if (!q) return mediaAssets;
    return mediaAssets.filter(
      (a) =>
        a.fileName.toLowerCase().includes(q) ||
        a.altText.toLowerCase().includes(q) ||
        a.uploadedByName.toLowerCase().includes(q) ||
        a.pageSlug.toLowerCase().includes(q)
    );
  }, [mediaAssets, mediaSearch]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wiki-image-upload-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/55 backdrop-blur-[2px] print:hidden"
      onClick={() => {
        if (!isUploading) onClose();
      }}
    >
      <div
        data-wiki-surface="panel"
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1623] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ImageIcon className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
            <h2
              id="wiki-image-upload-modal-title"
              className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 truncate"
            >
              Insert or Upload Wiki Image
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div
              role="tablist"
              aria-label="Image source tabs"
              className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'upload'}
                onClick={() => setActiveTab('upload')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload / URL</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'library'}
                onClick={() => setActiveTab('library')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'library'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Media ({mediaAssets.length})</span>
              </button>
            </div>

            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              aria-label="Close image modal"
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-45"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-xs text-red-900 dark:text-red-200 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'upload' ? (
            <div className="space-y-4">
              {blockedReason ? (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
                    <Lock className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
                    <span>{blockedReason.title}</span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    {blockedReason.detail}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] font-mono text-amber-900 dark:text-amber-200">
                    <div className="px-2.5 py-1 rounded border border-amber-300/60 dark:border-amber-800 bg-white/70 dark:bg-[#0b0f17]/70">
                      Extension (:image-upload):{' '}
                      {imageUploadConfig.extensionEnabled ? 'Active' : 'Disabled'}
                    </div>
                    <div className="px-2.5 py-1 rounded border border-amber-300/60 dark:border-amber-800 bg-white/70 dark:bg-[#0b0f17]/70">
                      Firebase Blaze Plan:{' '}
                      {imageUploadConfig.blazePlanConfirmed ? 'Confirmed' : 'Not confirmed'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                    onChange={(e) => handleFileChosen(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFileChosen(e.dataTransfer.files?.[0] ?? null);
                    }}
                    onClick={() => {
                      if (!isUploading) fileInputRef.current?.click();
                    }}
                    className="p-5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-[#0b0f17] hover:border-blue-600 dark:hover:border-blue-500 transition-colors text-center space-y-2 cursor-pointer"
                  >
                    <Upload className="w-6 h-6 mx-auto text-blue-700 dark:text-blue-400" />
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {selectedFile
                        ? `Selected: ${selectedFile.name} (${formatBytes(selectedFile.size)})`
                        : 'Click to select or drag an image file here'}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      PNG, JPG, WebP, GIF, AVIF · Max {imageUploadConfig.maxUploadSizeMb} MB · Folder:{' '}
                      {imageUploadConfig.storageFolder}
                    </p>
                  </div>

                  {previewUrl && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f17] p-2 flex items-center justify-center max-h-52 overflow-hidden">
                      <img
                        src={previewUrl}
                        alt={altText || 'Selected image preview'}
                        className="max-h-48 w-auto rounded object-contain"
                      />
                    </div>
                  )}

                  {isUploading && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-300">
                        <span>Uploading to Firebase Storage...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-700 dark:bg-blue-500 transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Alt Text */}
              <div className="space-y-1">
                <label
                  htmlFor="wiki-image-alt-input"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Alt Text / Caption Description
                </label>
                <input
                  id="wiki-image-alt-input"
                  type="text"
                  maxLength={200}
                  value={altText}
                  disabled={isUploading}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe the image for accessibility and Markdown alt text..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>

              {/* Upload action if file chosen */}
              {!blockedReason && selectedFile && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isUploading || !currentUser}
                    onClick={() => void handleUploadAndInsert()}
                    data-wiki-surface="accent"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{isUploading ? 'Uploading...' : 'Upload & Insert Image'}</span>
                  </button>
                </div>
              )}

              {/* External HTTPS URL fallback */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <label
                  htmlFor="wiki-image-external-url-input"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  <Link2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Or insert external image URL (https://)</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="wiki-image-external-url-input"
                    type="url"
                    value={externalUrl}
                    disabled={isUploading}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://example.com/diagram.png"
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  />
                  <button
                    type="button"
                    disabled={isUploading || !externalUrl.trim()}
                    onClick={handleInsertExternalUrl}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Insert URL</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  placeholder="Search uploaded Wiki images by filename, alt text, or uploader..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>

              {mediaLoading ? (
                <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading uploaded media...</span>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="py-10 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0b0f17]">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {mediaAssets.length === 0
                      ? 'No images have been uploaded via Firebase Storage yet.'
                      : 'No uploaded images match your search.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredAssets.map((asset) => {
                    const canDelete = Boolean(
                      currentUser && (currentUser.uid === asset.uploadedBy || isAdmin)
                    );
                    const isConfirmingDelete = confirmDeleteId === asset.id;

                    return (
                      <div
                        key={asset.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f17] overflow-hidden flex flex-col"
                      >
                        <div className="h-32 bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                          <img
                            src={asset.downloadUrl}
                            alt={asset.altText || asset.fileName}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                          <div className="space-y-0.5 min-w-0">
                            <p
                              className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate"
                              title={asset.fileName}
                            >
                              {asset.fileName}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                              {asset.width > 0 && asset.height > 0
                                ? `${asset.width}x${asset.height} · `
                                : ''}
                              {formatBytes(asset.sizeBytes)} · {formatRelativeTime(asset.createdAt)}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              By {asset.uploadedByName}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const finalAlt = asset.altText || asset.fileName;
                                onInsertImage(
                                  buildMarkdown(asset.downloadUrl, finalAlt),
                                  asset.downloadUrl,
                                  finalAlt
                                );
                                onClose();
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-700 text-white hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <Check className="w-3 h-3" />
                              <span>Insert</span>
                            </button>

                            {canDelete &&
                              (isConfirmingDelete ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={deletingId === asset.id}
                                    onClick={() => void handleDeleteAsset(asset)}
                                    className="px-2 py-1 text-[11px] font-semibold rounded bg-red-700 text-white hover:bg-red-800 cursor-pointer disabled:opacity-50"
                                  >
                                    {deletingId === asset.id ? 'Removing...' : 'Confirm'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 text-[11px] rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(asset.id)}
                                  title="Delete image"
                                  aria-label={`Delete ${asset.fileName}`}
                                  className="p-1.5 rounded-md text-slate-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
