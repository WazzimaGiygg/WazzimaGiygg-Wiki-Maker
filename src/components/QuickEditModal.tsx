import React from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Bold,
  Code,
  Edit3,
  Eye,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link2,
  Loader2,
  Quote,
  Save,
  SplitSquareHorizontal,
  X,
} from 'lucide-react';
import type { ImageUploadExtensionConfig } from '../lib/extensionsService';
import { checkArticleProfanity } from '../lib/profanityFilter';
import { VALIDATION_LIMITS, type WikiPage } from '../types/wiki';
import { ArticleViewer } from './ArticleViewer';
import { ImageUploadModal } from './ImageUploadModal';

type QuickEditPaneMode = 'write' | 'split' | 'preview';

const DEFAULT_IMAGE_UPLOAD_CONFIG: ImageUploadExtensionConfig = {
  extensionEnabled: false,
  blazePlanConfirmed: false,
  canUpload: false,
  maxUploadSizeMb: 5,
  storageFolder: 'wiki-images',
};

interface QuickEditModalProps {
  isOpen: boolean;
  page: WikiPage;
  existingSlugs: Set<string>;
  wikiPages: WikiPage[];
  currentUser?: User | null;
  isAdmin?: boolean;
  imageUploadConfig?: ImageUploadExtensionConfig;
  isSaving: boolean;
  errorMessage: string | null;
  enableInfoboxPreview?: boolean;
  enableReferencesPreview?: boolean;
  enableTemplatesPreview?: boolean;
  referencesTitle?: string;
  externalLinkPrefix?: string;
  encodeExternalLinkTarget?: boolean;
  onSave: (data: { title: string; content: string; summary: string }) => Promise<void>;
  onClose: () => void;
  onNavigateSlug: (slug: string) => void;
}

export const QuickEditModal: React.FC<QuickEditModalProps> = ({
  isOpen,
  page,
  existingSlugs,
  wikiPages,
  currentUser = null,
  isAdmin = false,
  imageUploadConfig = DEFAULT_IMAGE_UPLOAD_CONFIG,
  isSaving,
  errorMessage,
  enableInfoboxPreview = true,
  enableReferencesPreview = true,
  enableTemplatesPreview = true,
  referencesTitle = 'References',
  externalLinkPrefix,
  encodeExternalLinkTarget = false,
  onSave,
  onClose,
  onNavigateSlug,
}) => {
  const [title, setTitle] = React.useState(page.title);
  const [content, setContent] = React.useState(page.content);
  const [summary, setSummary] = React.useState('');
  const [paneMode, setPaneMode] = React.useState<QuickEditPaneMode>('write');
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = React.useState(false);
  const [imageModalOpen, setImageModalOpen] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const titleInputId = React.useId();
  const contentTextareaId = React.useId();
  const summaryInputId = React.useId();

  // Re-initialize form values whenever modal opens for a page
  React.useEffect(() => {
    if (!isOpen) return;
    setTitle(page.title);
    setContent(page.content);
    setSummary('');
    setLocalError(null);
    setConfirmDiscardOpen(false);
    setPaneMode('write');

    const focusTimer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 20);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen, page.slug, page.title, page.content]);

  const isDirty = title !== page.title || content !== page.content;

  // Lock background page scroll while modal is open
  React.useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const requestClose = React.useCallback(() => {
    if (isSaving) return;
    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    onClose();
  }, [isSaving, isDirty, onClose]);

  const insertSnippet = (before: string, after = '', fallbackText = 'text') => {
    const el = textareaRef.current;
    if (!el) {
      setContent((prev) => `${prev}${before}${fallbackText}${after}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || fallbackText;
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + before.length;
      el.setSelectionRange(cursorStart, cursorStart + selected.length);
    });
  };

  const handleSubmit = React.useCallback(async () => {
    setLocalError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setLocalError('Please enter a page title.');
      return;
    }
    if (content.length > VALIDATION_LIMITS.CONTENT_MAX_LENGTH) {
      setLocalError(
        `Content exceeds the maximum limit of ${VALIDATION_LIMITS.CONTENT_MAX_LENGTH.toLocaleString(
          'en-US'
        )} characters.`
      );
      return;
    }

    const profanity = checkArticleProfanity({
      title: trimmedTitle,
      content,
      summary: summary.trim(),
    });
    if (profanity.hasProfanity) {
      setLocalError(
        `Language filter: disallowed terms found (${profanity.uniqueMaskedTerms
          .slice(0, 5)
          .join(', ')}). Remove or replace them before saving.`
      );
      return;
    }

    await onSave({
      title: trimmedTitle,
      content,
      summary: summary.trim() || 'Quick edit',
    });
  }, [title, content, summary, onSave]);

  // Handle Esc to close and Ctrl/Cmd+S or Ctrl/Cmd+Enter to save inside modal
  React.useEffect(() => {
    if (!isOpen || imageModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (confirmDiscardOpen) {
          setConfirmDiscardOpen(false);
        } else {
          requestClose();
        }
        return;
      }
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && !e.altKey && (e.key.toLowerCase() === 's' || e.key === 'Enter')) {
        e.preventDefault();
        e.stopPropagation();
        if (!isSaving) {
          void handleSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, imageModalOpen, confirmDiscardOpen, requestClose, isSaving, handleSubmit]);

  if (!isOpen) return null;

  const displayedError = localError || errorMessage;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-edit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/55 backdrop-blur-[2px] print:hidden"
      onClick={requestClose}
    >
      <div
        data-wiki-surface="panel"
        className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1623] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
              <h2
                id="quick-edit-modal-title"
                className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 truncate"
              >
                Quick Edit — {page.title}
              </h2>
            </div>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              :{page.slug} · v{page.version} · {page.visibility === 'private' ? 'Private' : 'Public'}
              {page.isLocked ? ' · Locked' : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div
              role="tablist"
              aria-label="Quick edit view mode"
              className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80"
            >
              <button
                type="button"
                role="tab"
                aria-selected={paneMode === 'write'}
                onClick={() => setPaneMode('write')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  paneMode === 'write'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Write</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={paneMode === 'split'}
                onClick={() => setPaneMode('split')}
                className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  paneMode === 'split'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" />
                <span>Split</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={paneMode === 'preview'}
                onClick={() => setPaneMode('preview')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  paneMode === 'preview'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            </div>

            <button
              type="button"
              onClick={requestClose}
              disabled={isSaving}
              aria-label="Close quick edit modal"
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-45"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {displayedError && (
            <div
              role="alert"
              className="p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-xs text-red-900 dark:text-red-200 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-400" />
              <span>{displayedError}</span>
            </div>
          )}

          {/* Title & Quick Formatting Toolbar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-7 space-y-1">
              <label
                htmlFor={titleInputId}
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Page Title
              </label>
              <input
                id={titleInputId}
                type="text"
                maxLength={VALIDATION_LIMITS.TITLE_MAX_LENGTH}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>

            <div className="md:col-span-5 space-y-1">
              <label
                htmlFor={summaryInputId}
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Edit Summary
              </label>
              <input
                id={summaryInputId}
                type="text"
                maxLength={VALIDATION_LIMITS.SUMMARY_MAX_LENGTH}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Quick edit (optional summary)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>

          {paneMode !== 'preview' && (
            <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17]">
              <button
                type="button"
                onClick={() => insertSnippet('**', '**', 'bold text')}
                title="Bold"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('*', '*', 'italic text')}
                title="Italic"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('\n## ', '\n', 'Section Heading')}
                title="Section heading"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('[[', '|Link Label]]', 'target-slug')}
                title="Internal wiki link"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('\n> ', '\n', 'Quoted text')}
                title="Blockquote"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('`', '`', 'code')}
                title="Inline code"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('<ref>', '</ref>', 'Author, Title (Year)')}
                title="Inline MediaWiki reference (<ref>)"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                &lt;ref&gt;
              </button>
              <button
                type="button"
                onClick={() => setImageModalOpen(true)}
                title={
                  imageUploadConfig.canUpload
                    ? 'Upload or insert image'
                    : 'Insert image (file upload requires Image Upload extension + Blaze plan)'
                }
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Image</span>
              </button>
            </div>
          )}

          {/* Editor / Preview Split Area */}
          <div
            className={`grid gap-4 ${
              paneMode === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {paneMode !== 'preview' && (
              <div className="space-y-1.5">
                <label htmlFor={contentTextareaId} className="sr-only">
                  Markdown content
                </label>
                <textarea
                  ref={textareaRef}
                  id={contentTextareaId}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={16}
                  placeholder="Write article Markdown or wikitext..."
                  className="w-full min-h-[340px] p-3.5 text-xs sm:text-sm font-mono leading-relaxed rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 resize-y"
                />
              </div>
            )}

            {(paneMode === 'preview' || paneMode === 'split') && (
              <div className="min-h-[340px] max-h-[480px] overflow-y-auto p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f17]">
                <ArticleViewer
                  content={content}
                  existingSlugs={existingSlugs}
                  wikiPages={wikiPages}
                  currentSlug={page.slug}
                  currentTitle={title || page.title}
                  onNavigateSlug={(targetSlug) => {
                    requestClose();
                    onNavigateSlug(targetSlug);
                  }}
                  showToc={false}
                  enableInfoboxes={enableInfoboxPreview}
                  enableReferences={enableReferencesPreview}
                  enableTemplates={enableTemplatesPreview}
                  referencesTitle={referencesTitle}
                  showReferencesFooter={enableReferencesPreview}
                  externalLinkPrefix={externalLinkPrefix}
                  encodeExternalLinkTarget={encodeExternalLinkTarget}
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17]/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {content.length.toLocaleString('en-US')} /{' '}
            {VALIDATION_LIMITS.CONTENT_MAX_LENGTH.toLocaleString('en-US')} chars
            {isDirty ? ' · Unsaved edits' : ''} · Ctrl+S to save
          </div>

          {confirmDiscardOpen ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                Discard unsaved changes?
              </span>
              <button
                type="button"
                onClick={() => setConfirmDiscardOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDiscardOpen(false);
                  onClose();
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Discard
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isSaving}
                onClick={requestClose}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving || !title.trim()}
                onClick={() => void handleSubmit()}
                data-wiki-surface="accent"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <Save className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ImageUploadModal
        isOpen={imageModalOpen}
        currentUser={currentUser}
        isAdmin={isAdmin}
        pageSlug={page.slug}
        imageUploadConfig={imageUploadConfig}
        onInsertImage={(markdownSnippet) => {
          insertSnippet(`\n${markdownSnippet}\n`, '', '');
        }}
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
};
