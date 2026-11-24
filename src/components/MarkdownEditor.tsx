import React from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Bold,
  BookMarked,
  Braces,
  ChevronDown,
  ChevronUp,
  Code,
  Code2,
  ExternalLink,
  Eye,
  FileText,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListChecks,
  Loader2,
  Lock,
  PanelRight,
  Quote,
  Redo2,
  Replace,
  Save,
  SplitSquareHorizontal,
  Table,
  Trash2,
  Undo2,
  Unlock,
  Upload,
  X,
} from 'lucide-react';
import {
  type PageVisibility,
  VALIDATION_LIMITS,
  WIKI_CATEGORIES,
  type WikiPage,
} from '../types/wiki';
import {
  isValidHeaderImageUrl,
  sanitizeHeaderImageUrl,
  uploadPageHeaderImage,
} from '../lib/headerImageService';
import { toWikiSlug } from '../lib/markdownUtils';
import { ArticleViewer } from './ArticleViewer';
import {
  type ActiveRichFormats,
  FormattedMarkdownPane,
  type FormattedEditorHandle,
  type RichFormatCommand,
} from './FormattedMarkdownPane';
import { InfoboxBuilderModal } from './InfoboxBuilderModal';
import { TemplatePickerModal } from './TemplatePickerModal';

interface MarkdownEditorProps {
  mode: 'create' | 'edit';
  initialSlug: string;
  initialTitle: string;
  initialContent: string;
  initialCategory: string;
  initialTags: string[];
  initialVisibility: PageVisibility;
  initialIsLocked: boolean;
  initialHeaderImageUrl?: string;
  canManageMeta: boolean;
  existingSlugs: Set<string>;
  wikiPages?: WikiPage[];
  currentSlug?: string;
  currentUser?: User | null;
  isSaving: boolean;
  errorMessage: string | null;
  enableHeaderBanner?: boolean;
  enableInfoboxToolbar?: boolean;
  enableReferencesToolbar?: boolean;
  enableVisualToolbar?: boolean;
  enableTemplatesToolbar?: boolean;
  enableInfoboxPreview?: boolean;
  enableReferencesPreview?: boolean;
  enableTemplatesPreview?: boolean;
  showTocPreview?: boolean;
  tocDefaultExpanded?: boolean;
  tocMinHeadings?: number;
  referencesTitle?: string;
  externalLinkPrefix?: string;
  encodeExternalLinkTarget?: boolean;
  isAdminEditingOtherPage?: boolean;
  targetEditorDisplayName?: string;
  onSave: (data: {
    slug: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    visibility: PageVisibility;
    isLocked: boolean;
    headerImageUrl: string;
    summary: string;
    adminNotice?: {
      send: boolean;
      reason: string;
    };
  }) => Promise<void>;
  onCancel: () => void;
  onNavigateSlug: (slug: string) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

type EditorPaneMode = 'formatted' | 'code' | 'split' | 'preview';

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  mode,
  initialSlug,
  initialTitle,
  initialContent,
  initialCategory,
  initialTags,
  initialVisibility,
  initialIsLocked,
  initialHeaderImageUrl = '',
  canManageMeta,
  existingSlugs,
  wikiPages,
  currentSlug,
  currentUser = null,
  isSaving,
  errorMessage,
  enableHeaderBanner = true,
  enableInfoboxToolbar = true,
  enableReferencesToolbar = true,
  enableVisualToolbar = true,
  enableTemplatesToolbar = true,
  enableInfoboxPreview = true,
  enableReferencesPreview = true,
  enableTemplatesPreview = true,
  showTocPreview = true,
  tocDefaultExpanded = true,
  tocMinHeadings = 2,
  referencesTitle = 'Referências',
  externalLinkPrefix,
  encodeExternalLinkTarget = false,
  isAdminEditingOtherPage = false,
  targetEditorDisplayName,
  onSave,
  onCancel,
  onNavigateSlug,
  onDirtyChange,
}) => {
  const [slug, setSlug] = React.useState(initialSlug);
  const [slugTouched, setSlugTouched] = React.useState(mode === 'edit' || Boolean(initialSlug));
  const [title, setTitle] = React.useState(initialTitle);
  const [content, setContent] = React.useState(initialContent);
  const [category, setCategory] = React.useState(initialCategory || 'general');
  const [tagsText, setTagsText] = React.useState(initialTags.join(', '));
  const [visibility, setVisibility] = React.useState<PageVisibility>(initialVisibility);
  const [isLocked, setIsLocked] = React.useState(initialIsLocked);
  const [headerImageUrl, setHeaderImageUrl] = React.useState(initialHeaderImageUrl);
  const [isUploadingBanner, setIsUploadingBanner] = React.useState(false);
  const [bannerUploadError, setBannerUploadError] = React.useState<string | null>(null);
  const [bannerPreviewFailed, setBannerPreviewFailed] = React.useState(false);
  const [summary, setSummary] = React.useState('');
  const [sendAdminNotice, setSendAdminNotice] = React.useState(false);
  const [adminNoticeReason, setAdminNoticeReason] = React.useState('');
  const [paneMode, setPaneMode] = React.useState<EditorPaneMode>('split');
  const [focusedPane, setFocusedPane] = React.useState<'code' | 'formatted'>('code');
  const [activeRichFormats, setActiveRichFormats] = React.useState<ActiveRichFormats>({
    bold: false,
    italic: false,
    blockTag: '',
    unorderedList: false,
    orderedList: false,
  });
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [infoboxModalOpen, setInfoboxModalOpen] = React.useState(false);
  const [templateModalOpen, setTemplateModalOpen] = React.useState(false);

  // Unified Undo (Ctrl+Z) / Redo (Ctrl+R) content history
  const historyStackRef = React.useRef<{
    items: string[];
    index: number;
    lastPushAt: number;
  }>({
    items: [initialContent],
    index: 0,
    lastPushAt: 0,
  });
  const [historyMeta, setHistoryMeta] = React.useState<{ canUndo: boolean; canRedo: boolean }>({
    canUndo: false,
    canRedo: false,
  });

  // Find & Replace (Ctrl+H) state
  const [findReplaceOpen, setFindReplaceOpen] = React.useState(false);
  const [findQuery, setFindQuery] = React.useState('');
  const [replaceQuery, setReplaceQuery] = React.useState('');
  const [findCaseSensitive, setFindCaseSensitive] = React.useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = React.useState(0);
  const [replaceStatus, setReplaceStatus] = React.useState<string | null>(null);

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const formattedPaneRef = React.useRef<FormattedEditorHandle | null>(null);
  const bannerFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const findInputRef = React.useRef<HTMLInputElement | null>(null);
  const replaceInputRef = React.useRef<HTMLInputElement | null>(null);
  const contentRef = React.useRef(content);
  contentRef.current = content;

  const isDirty = React.useMemo(() => {
    const baselineCategory = initialCategory || 'general';
    const baselineTags = initialTags.join(', ');
    return (
      title !== initialTitle ||
      (mode === 'create' && slug !== initialSlug) ||
      content !== initialContent ||
      category !== baselineCategory ||
      tagsText !== baselineTags ||
      visibility !== initialVisibility ||
      isLocked !== initialIsLocked ||
      headerImageUrl !== initialHeaderImageUrl ||
      summary.trim().length > 0
    );
  }, [
    mode,
    slug,
    initialSlug,
    title,
    initialTitle,
    content,
    initialContent,
    category,
    initialCategory,
    tagsText,
    initialTags,
    visibility,
    initialVisibility,
    isLocked,
    initialIsLocked,
    headerImageUrl,
    initialHeaderImageUrl,
    summary,
  ]);

  React.useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  React.useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  React.useEffect(() => {
    setSlug(initialSlug);
    setSlugTouched(mode === 'edit' || Boolean(initialSlug));
    setTitle(initialTitle);
    setContent(initialContent);
    setCategory(initialCategory || 'general');
    setTagsText(initialTags.join(', '));
    setVisibility(initialVisibility);
    setIsLocked(initialIsLocked);
    setHeaderImageUrl(initialHeaderImageUrl);
    setBannerUploadError(null);
    setBannerPreviewFailed(false);
    setSummary('');
    setSendAdminNotice(false);
    setAdminNoticeReason('');
    setLocalError(null);
    setFindReplaceOpen(false);
    setReplaceStatus(null);
    historyStackRef.current = {
      items: [initialContent],
      index: 0,
      lastPushAt: 0,
    };
    setHistoryMeta({ canUndo: false, canRedo: false });
  }, [
    mode,
    initialSlug,
    initialTitle,
    initialContent,
    initialCategory,
    initialTags,
    initialVisibility,
    initialIsLocked,
    initialHeaderImageUrl,
  ]);

  const syncHistoryMeta = React.useCallback(() => {
    const stack = historyStackRef.current;
    setHistoryMeta({
      canUndo: stack.index > 0,
      canRedo: stack.index < stack.items.length - 1,
    });
  }, []);

  const commitContentChange = React.useCallback(
    (nextRaw: string, discrete = false) => {
      const capped = nextRaw.slice(0, VALIDATION_LIMITS.CONTENT_MAX_LENGTH);
      setContent(capped);
      const stack = historyStackRef.current;
      const currentSnap = stack.items[stack.index] ?? '';
      if (capped === currentSnap) return;

      const now = Date.now();
      const canCoalesce =
        !discrete &&
        stack.index > 0 &&
        stack.index === stack.items.length - 1 &&
        now - stack.lastPushAt < 550 &&
        Math.abs(capped.length - currentSnap.length) <= 2 &&
        !capped.endsWith('\n') &&
        !currentSnap.endsWith('\n');

      if (canCoalesce) {
        stack.items[stack.index] = capped;
      } else {
        const sliced = stack.items.slice(0, stack.index + 1);
        sliced.push(capped);
        if (sliced.length > 150) {
          sliced.shift();
        }
        stack.items = sliced;
        stack.index = sliced.length - 1;
      }
      stack.lastPushAt = discrete ? 0 : now;
      syncHistoryMeta();
    },
    [syncHistoryMeta]
  );

  const handleUndo = React.useCallback(() => {
    const stack = historyStackRef.current;
    if (stack.index <= 0) return;
    stack.index -= 1;
    stack.lastPushAt = 0;
    const targetValue = stack.items[stack.index] ?? '';
    setContent(targetValue);
    syncHistoryMeta();
  }, [syncHistoryMeta]);

  const handleRedo = React.useCallback(() => {
    const stack = historyStackRef.current;
    if (stack.index >= stack.items.length - 1) return;
    stack.index += 1;
    stack.lastPushAt = 0;
    const targetValue = stack.items[stack.index] ?? '';
    setContent(targetValue);
    syncHistoryMeta();
  }, [syncHistoryMeta]);

  const findMatches = React.useMemo(() => {
    if (!findQuery) return [] as { start: number; end: number }[];
    const haystack = findCaseSensitive ? content : content.toLowerCase();
    const needle = findCaseSensitive ? findQuery : findQuery.toLowerCase();
    if (!needle) return [] as { start: number; end: number }[];

    const matches: { start: number; end: number }[] = [];
    let pos = 0;
    while (pos <= haystack.length) {
      const idx = haystack.indexOf(needle, pos);
      if (idx === -1) break;
      matches.push({ start: idx, end: idx + needle.length });
      pos = idx + Math.max(1, needle.length);
      if (matches.length >= 2000) break;
    }
    return matches;
  }, [content, findQuery, findCaseSensitive]);

  React.useEffect(() => {
    if (findMatches.length === 0) {
      setActiveMatchIndex(0);
    } else if (activeMatchIndex >= findMatches.length) {
      setActiveMatchIndex(0);
    }
  }, [findMatches.length, activeMatchIndex]);

  const highlightMatchInTextarea = React.useCallback((match: { start: number; end: number }) => {
    const el = textareaRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(match.start, match.end);
    });
  }, []);

  const navigateMatch = React.useCallback(
    (delta: number) => {
      if (findMatches.length === 0) return;
      const nextIdx = (activeMatchIndex + delta + findMatches.length) % findMatches.length;
      setActiveMatchIndex(nextIdx);
      setReplaceStatus(null);
      if (paneMode === 'code' || paneMode === 'split') {
        highlightMatchInTextarea(findMatches[nextIdx]);
      }
    },
    [findMatches, activeMatchIndex, paneMode, highlightMatchInTextarea]
  );

  const handleReplaceCurrent = React.useCallback(() => {
    if (findMatches.length === 0) return;
    const safeIdx = Math.min(activeMatchIndex, findMatches.length - 1);
    const match = findMatches[safeIdx];
    const nextContent =
      content.slice(0, match.start) + replaceQuery + content.slice(match.end);
    commitContentChange(nextContent, true);
    setReplaceStatus('1 substituição aplicada');
  }, [findMatches, activeMatchIndex, content, replaceQuery, commitContentChange]);

  const handleReplaceAll = React.useCallback(() => {
    if (findMatches.length === 0) return;
    const count = findMatches.length;
    let rebuilt = '';
    let cursor = 0;
    for (const m of findMatches) {
      rebuilt += content.slice(cursor, m.start) + replaceQuery;
      cursor = m.end;
    }
    rebuilt += content.slice(cursor);
    commitContentChange(rebuilt, true);
    setActiveMatchIndex(0);
    setReplaceStatus(
      count === 1 ? '1 substituição aplicada' : `${count} substituições aplicadas`
    );
  }, [findMatches, content, replaceQuery, commitContentChange]);

  const openFindReplace = React.useCallback(() => {
    let seedQuery = '';
    const el = textareaRef.current;
    if (el && document.activeElement === el && el.selectionEnd > el.selectionStart) {
      const selected = contentRef.current.slice(el.selectionStart, el.selectionEnd);
      if (!selected.includes('\n') && selected.length <= 120) {
        seedQuery = selected;
      }
    } else {
      const sel = window.getSelection()?.toString() || '';
      if (sel && !sel.includes('\n') && sel.length <= 120) {
        seedQuery = sel;
      }
    }
    if (seedQuery) {
      setFindQuery(seedQuery);
    }
    setReplaceStatus(null);
    setFindReplaceOpen(true);
    if (paneMode === 'preview') {
      setPaneMode('code');
      setFocusedPane('code');
    }
    requestAnimationFrame(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    });
  }, [paneMode]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (mode === 'create' && !slugTouched) {
      setSlug(toWikiSlug(value));
    }
  };

  const insertSnippet = (before: string, after = '', fallbackText = 'text') => {
    const el = textareaRef.current;
    if (!el) {
      commitContentChange(`${contentRef.current}${before}${fallbackText}${after}`, true);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentVal = contentRef.current;
    const selected = currentVal.slice(start, end) || fallbackText;
    const next = currentVal.slice(0, start) + before + selected + after + currentVal.slice(end);
    commitContentChange(next, true);

    requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + selected.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const insertBlockAtCursor = (blockText: string) => {
    const el = textareaRef.current;
    const currentVal = contentRef.current;
    if (!el) {
      commitContentChange(
        currentVal.trim() ? `${blockText}\n\n${currentVal}` : `${blockText}\n`,
        true
      );
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = currentVal.slice(0, start);
    const after = currentVal.slice(end);
    const prefix = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const suffix = after && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : '\n';
    const next = `${before}${prefix}${blockText}${suffix}${after}`;
    commitContentChange(next, true);

    const nextCaret = before.length + prefix.length + blockText.length + suffix.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const targetIsFormatted =
    paneMode === 'formatted' || (paneMode === 'split' && focusedPane === 'formatted');

  const switchPaneMode = (nextMode: EditorPaneMode) => {
    setPaneMode(nextMode);
    if (nextMode === 'formatted') {
      setFocusedPane('formatted');
      requestAnimationFrame(() => formattedPaneRef.current?.focus());
    } else if (nextMode === 'code') {
      setFocusedPane('code');
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const handleToolbarFormat = (richCmd: RichFormatCommand, codeAction: () => void) => {
    if (targetIsFormatted) {
      formattedPaneRef.current?.applyFormat(richCmd);
      return;
    }
    codeAction();
  };

  const handleInsertWikiStructure = (blockText: string) => {
    if (targetIsFormatted) {
      formattedPaneRef.current?.insertRawWikiSnippet(blockText);
      return;
    }
    insertBlockAtCursor(blockText);
  };

  const handleInsertReference = () => {
    if (targetIsFormatted) {
      formattedPaneRef.current?.insertRawWikiSnippet(
        '<ref>Autor, Título (Ano). https://...</ref>'
      );
      return;
    }
    insertSnippet('<ref>', '</ref>', 'Autor, Título (Ano). https://...');
  };

  const handleBannerFileSelected = async (file: File | null) => {
    if (!file) return;
    if (!currentUser) {
      setBannerUploadError('Sign in with Google to upload a header image.');
      return;
    }

    setBannerUploadError(null);
    setIsUploadingBanner(true);
    try {
      const result = await uploadPageHeaderImage(
        file,
        slug || initialSlug || title || 'page',
        currentUser
      );
      setHeaderImageUrl(result.url);
      setBannerPreviewFailed(false);
    } catch (err) {
      setBannerUploadError(
        err instanceof Error ? err.message : 'Failed to process header image.'
      );
    } finally {
      setIsUploadingBanner(false);
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
    }
  };

  const submitForm = async () => {
    setLocalError(null);
    if (isUploadingBanner) {
      setLocalError('Please wait for the header image upload to finish before saving.');
      return;
    }
    const normalizedSlug = mode === 'create' ? toWikiSlug(slug) : initialSlug;
    if (!normalizedSlug) {
      setLocalError('Please provide a valid page identifier (:slug).');
      return;
    }
    if (!title.trim()) {
      setLocalError('Please enter a page title.');
      return;
    }

    const trimmedHeaderUrl = headerImageUrl.trim();
    if (trimmedHeaderUrl && !isValidHeaderImageUrl(trimmedHeaderUrl)) {
      setLocalError(
        'Header image URL must start with https:// or http:// (max 1,000 characters), or be uploaded directly.'
      );
      return;
    }

    const parsedTags = tagsText
      .split(',')
      .map((t) => t.trim().slice(0, VALIDATION_LIMITS.TAG_MAX_LENGTH))
      .filter(Boolean)
      .slice(0, VALIDATION_LIMITS.TAGS_MAX_COUNT);

    await onSave({
      slug: normalizedSlug,
      title: title.trim(),
      content,
      category,
      tags: parsedTags,
      visibility,
      isLocked,
      headerImageUrl: sanitizeHeaderImageUrl(trimmedHeaderUrl),
      summary: summary.trim(),
      adminNotice: isAdminEditingOtherPage
        ? {
            send: sendAdminNotice || isLocked !== initialIsLocked,
            reason: adminNoticeReason.trim() || summary.trim(),
          }
        : undefined,
    });
  };

  // Capture Ctrl+H (Find & Replace), Ctrl+Z (Undo), Ctrl+R (Redo) safely so browser defaults (history/reload) never fire while editing
  React.useEffect(() => {
    const handleCaptureShortcuts = (e: KeyboardEvent) => {
      if (e.isComposing || infoboxModalOpen || templateModalOpen) return;
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.altKey) return;

      const keyLower = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const isSingleLineInput = target?.tagName === 'INPUT';

      if (!e.shiftKey && keyLower === 'h') {
        e.preventDefault();
        e.stopPropagation();
        openFindReplace();
        return;
      }

      if (!e.shiftKey && keyLower === 'r') {
        e.preventDefault();
        e.stopPropagation();
        handleRedo();
        return;
      }

      if (keyLower === 'z' && !isSingleLineInput) {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if (!e.shiftKey && keyLower === 'y' && !isSingleLineInput) {
        e.preventDefault();
        e.stopPropagation();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleCaptureShortcuts, true);
    return () => window.removeEventListener('keydown', handleCaptureShortcuts, true);
  }, [infoboxModalOpen, templateModalOpen, openFindReplace, handleUndo, handleRedo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || infoboxModalOpen || templateModalOpen) return;

    const isMod = e.metaKey || e.ctrlKey;
    const keyLower = e.key.toLowerCase();

    if (isMod && (e.key === 'Enter' || keyLower === 's')) {
      e.preventDefault();
      if (!isSaving) {
        void submitForm();
      }
      return;
    }

    if (isMod && e.shiftKey && keyLower === 'i' && enableInfoboxToolbar) {
      e.preventDefault();
      setInfoboxModalOpen(true);
      return;
    }

    if (isMod && e.shiftKey && keyLower === 't' && enableTemplatesToolbar) {
      e.preventDefault();
      setTemplateModalOpen(true);
      return;
    }

    if (isMod && e.shiftKey && keyLower === 'p') {
      e.preventDefault();
      const order: EditorPaneMode[] = ['formatted', 'code', 'split', 'preview'];
      const next = order[(order.indexOf(paneMode) + 1) % order.length];
      switchPaneMode(next);
      return;
    }

    if (isMod && e.shiftKey && keyLower === 'l' && enableVisualToolbar) {
      e.preventDefault();
      handleToolbarFormat('wikilink', () =>
        insertSnippet('[[', ']]', 'page-slug|Link Label')
      );
      return;
    }

    if (isMod && e.shiftKey && keyLower === 'r' && enableReferencesToolbar) {
      e.preventDefault();
      handleInsertReference();
      return;
    }

    if (enableVisualToolbar && document.activeElement === textareaRef.current && isMod && !e.shiftKey) {
      if (keyLower === 'b') {
        e.preventDefault();
        insertSnippet('**', '**', 'bold');
      } else if (keyLower === 'i') {
        e.preventDefault();
        insertSnippet('*', '*', 'italic');
      }
    }
  };

  const activeError = localError || errorMessage;

  return (
    <div className="space-y-5" onKeyDown={handleKeyDown}>
      {activeError && (
        <div
          role="alert"
          className="px-4 py-3 text-sm rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300"
        >
          {activeError}
        </div>
      )}

      {isDirty && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Alterações não salvas:</strong> se você sair deste artigo sem salvar, perderá
            todas as modificações feitas.
          </span>
        </div>
      )}

      {/* Page Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="md:col-span-5">
          <label
            htmlFor="wiki-title-input"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
          >
            Page title
          </label>
          <input
            id="wiki-title-input"
            type="text"
            value={title}
            maxLength={VALIDATION_LIMITS.TITLE_MAX_LENGTH}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g., System Architecture"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
          />
        </div>

        <div className="md:col-span-4">
          <label
            htmlFor="wiki-slug-input"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
          >
            Identifier (:slug)
          </label>
          <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1623] overflow-hidden">
            <span className="px-2.5 text-xs font-mono text-slate-500 dark:text-slate-400 select-none">
              :
            </span>
            <input
              id="wiki-slug-input"
              type="text"
              value={slug}
              disabled={mode === 'edit'}
              maxLength={VALIDATION_LIMITS.SLUG_MAX_LENGTH}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              onBlur={() => {
                if (mode === 'create') setSlug(toWikiSlug(slug));
              }}
              placeholder="system-architecture"
              className="w-full py-2 pr-3 text-sm font-mono bg-transparent text-slate-900 dark:text-slate-100 disabled:text-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="md:col-span-3">
          <label
            htmlFor="wiki-category-select"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
          >
            Category
          </label>
          <select
            id="wiki-category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
          >
            {WIKI_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-6">
          <label
            htmlFor="wiki-tags-input"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
          >
            Tags (comma-separated, max {VALIDATION_LIMITS.TAGS_MAX_COUNT})
          </label>
          <input
            id="wiki-tags-input"
            type="text"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="guide, backend, api"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
          />
        </div>

        <div className="md:col-span-6 flex flex-wrap items-end gap-4">
          {canManageMeta ? (
            <>
              <div className="flex-1 min-w-[150px]">
                <label
                  htmlFor="wiki-visibility-select"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
                >
                  Visibility
                </label>
                <select
                  id="wiki-visibility-select"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as PageVisibility)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                >
                  <option value="public">Public (collaborative)</option>
                  <option value="private">Private (only you)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsLocked((prev) => !prev)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  isLocked
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {isLocked ? 'Editing locked' : 'Open editing'}
              </button>
            </>
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-400 py-2">
              Editing as collaborator on an open public page.
            </div>
          )}
        </div>

        {enableHeaderBanner && (
          <div className="md:col-span-12 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="wiki-header-image-url-input"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Header banner image (optional)</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                PNG, JPG, WebP, GIF, or AVIF · displayed across the top of the reading view
              </span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files?.[0] ?? null;
                void handleBannerFileSelected(droppedFile);
              }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
            >
              <input
                ref={bannerFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                onChange={(e) => void handleBannerFileSelected(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploadingBanner || isSaving}
                onClick={() => bannerFileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {isUploadingBanner ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-700 dark:text-blue-400" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                )}
                <span>{isUploadingBanner ? 'Uploading image...' : 'Upload image'}</span>
              </button>

              <input
                id="wiki-header-image-url-input"
                type="text"
                value={headerImageUrl.startsWith('data:image/') ? '' : headerImageUrl}
                disabled={isUploadingBanner}
                maxLength={VALIDATION_LIMITS.HEADER_IMAGE_EXTERNAL_URL_MAX_LENGTH}
                onChange={(e) => {
                  setBannerUploadError(null);
                  setBannerPreviewFailed(false);
                  setHeaderImageUrl(e.target.value);
                }}
                placeholder={
                  headerImageUrl.startsWith('data:image/')
                    ? 'Uploaded banner image attached (or paste an https:// URL to replace)'
                    : 'Or paste an external https:// image URL...'
                }
                className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 disabled:opacity-60"
              />

              {headerImageUrl.trim() && (
                <button
                  type="button"
                  disabled={isUploadingBanner || isSaving}
                  onClick={() => {
                    setHeaderImageUrl('');
                    setBannerUploadError(null);
                    setBannerPreviewFailed(false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            {bannerUploadError && (
              <p role="alert" className="text-xs text-red-700 dark:text-red-400">
                {bannerUploadError}
              </p>
            )}

            {sanitizeHeaderImageUrl(headerImageUrl) && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f17] overflow-hidden">
                {!bannerPreviewFailed ? (
                  <img
                    src={sanitizeHeaderImageUrl(headerImageUrl)}
                    alt="Header banner preview"
                    onError={() => setBannerPreviewFailed(true)}
                    className="w-full h-32 sm:h-36 object-cover object-center block"
                  />
                ) : (
                  <div className="px-3 py-4 text-xs text-amber-700 dark:text-amber-300">
                    Unable to load image preview from this URL. Verify that the link is publicly reachable.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor Header: View Mode Switcher & Quick Structure Tools */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {enableInfoboxToolbar && (
            <button
              type="button"
              title="Inserir Infobox (Ctrl+Shift+I)"
              onClick={() => setInfoboxModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PanelRight className="w-3.5 h-3.5" />
              <span>Infobox</span>
            </button>
          )}
          {enableTemplatesToolbar && (
            <button
              type="button"
              title="Inserir Pré-definição MediaWiki {{...}} (Ctrl+Shift+T)"
              onClick={() => setTemplateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Braces className="w-3.5 h-3.5" />
              <span>Pré-definições</span>
            </button>
          )}
          {enableReferencesToolbar && (
            <button
              type="button"
              title="Inserir citação bibliográfica <ref> (Ctrl+Shift+R)"
              onMouseDown={(e) => {
                if (targetIsFormatted) e.preventDefault();
              }}
              onClick={handleInsertReference}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookMarked className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>&lt;ref&gt;</span>
            </button>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Modo de edição"
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg"
        >
          <button
            type="button"
            role="tab"
            aria-selected={paneMode === 'formatted'}
            onClick={() => switchPaneMode('formatted')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              paneMode === 'formatted'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Formatado</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={paneMode === 'code'}
            onClick={() => switchPaneMode('code')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              paneMode === 'code'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Código</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={paneMode === 'split'}
            onClick={() => switchPaneMode('split')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              paneMode === 'split'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <SplitSquareHorizontal className="w-3.5 h-3.5" />
            <span>Lado a lado</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={paneMode === 'preview'}
            onClick={() => switchPaneMode('preview')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              paneMode === 'preview'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Visualizar</span>
          </button>
        </div>
      </div>

      {/* Editor Area: Visual Toolbar + Formatted / Code / Side-by-Side / Preview */}
      {paneMode !== 'preview' ? (
        <div className="flex flex-col">
          {enableVisualToolbar && (
            <div
              role="toolbar"
              aria-label="Barra de ferramentas de edição"
              className={`flex flex-wrap items-center justify-between gap-2 px-2.5 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50/90 dark:bg-[#0f1623] ${
                paneMode === 'split' ? 'rounded-xl mb-3' : 'rounded-t-xl border-b-0'
              }`}
            >
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  title="Desfazer (Ctrl+Z)"
                  disabled={!historyMeta.canUndo}
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={handleUndo}
                  className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Refazer (Ctrl+R)"
                  disabled={!historyMeta.canRedo}
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={handleRedo}
                  className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Localizar e substituir no editor (Ctrl+H)"
                  aria-pressed={findReplaceOpen}
                  onClick={() => {
                    if (findReplaceOpen) {
                      setFindReplaceOpen(false);
                    } else {
                      openFindReplace();
                    }
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    findReplaceOpen
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Replace className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Substituir</span>
                </button>

                <span
                  aria-hidden="true"
                  className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5"
                />

                <button
                  type="button"
                  title="Negrito (**texto**) — Ctrl+B"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('bold', () =>
                      insertSnippet('**', '**', 'texto em negrito')
                    )
                  }
                  className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    targetIsFormatted && activeRichFormats.bold
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Bold className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Negrito</span>
                </button>
                <button
                  type="button"
                  title="Itálico (*texto*) — Ctrl+I"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('italic', () =>
                      insertSnippet('*', '*', 'texto em itálico')
                    )
                  }
                  className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    targetIsFormatted && activeRichFormats.italic
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Italic className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Itálico</span>
                </button>

                <span
                  aria-hidden="true"
                  className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5"
                />

                <button
                  type="button"
                  title="Título de seção (## Título)"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('heading2', () =>
                      insertSnippet('## ', '', 'Título da Seção')
                    )
                  }
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    targetIsFormatted && activeRichFormats.blockTag === 'h2'
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Subtítulo (### Subtítulo)"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('heading3', () =>
                      insertSnippet('### ', '', 'Subtítulo')
                    )
                  }
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    targetIsFormatted && activeRichFormats.blockTag === 'h3'
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Heading3 className="w-4 h-4" />
                </button>

                <span
                  aria-hidden="true"
                  className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5"
                />

                <button
                  type="button"
                  title="Link interno do wiki ([[slug|Texto]]) — Ctrl+Shift+L"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('wikilink', () =>
                      insertSnippet('[[', ']]', 'slug-da-pagina|Texto do Link')
                    )
                  }
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>Link</span>
                </button>
                <button
                  type="button"
                  title="Link externo ([Texto](https://...))"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('externallink', () =>
                      insertSnippet('[', '](https://exemplo.com)', 'Texto do Link')
                    )
                  }
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">URL</span>
                </button>

                <span
                  aria-hidden="true"
                  className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5"
                />

                <button
                  type="button"
                  title="Lista com marcadores (- Item)"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('bulletList', () =>
                      insertSnippet('\n- ', '', 'Item da lista')
                    )
                  }
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    targetIsFormatted && activeRichFormats.unorderedList
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Checklist (- [ ] Tarefa)"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('checklist', () =>
                      insertSnippet('\n- [ ] ', '', 'Tarefa pendente')
                    )
                  }
                  className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ListChecks className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Bloco de citação (> Texto)"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('blockquote', () =>
                      insertSnippet('\n> ', '', 'Texto citado ou nota editorial.')
                    )
                  }
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    targetIsFormatted && activeRichFormats.blockTag === 'blockquote'
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Quote className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Bloco de código"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('codeBlock', () =>
                      insertSnippet('\n```ts\n', '\n```\n', 'const exemplo = "wiki";')
                    )
                  }
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    targetIsFormatted && activeRichFormats.blockTag === 'pre'
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Code className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Inserir tabela wikitexto/Markdown"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('table', () =>
                      insertSnippet(
                        '\n| Coluna 1 | Coluna 2 |\n| --- | --- |\n| ',
                        ' | Valor 2 |\n| Linha 2A | Linha 2B |\n',
                        'Valor 1'
                      )
                    )
                  }
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Tabela</span>
                </button>
              </div>

              {paneMode === 'split' && (
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 px-1.5">
                  Alvo: {focusedPane === 'formatted' ? 'Formatado' : 'Código'}
                </span>
              )}
            </div>
          )}

          {findReplaceOpen && (
            <div
              role="region"
              aria-label="Localizar e substituir no editor"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setFindReplaceOpen(false);
                }
              }}
              className="mb-3 p-3 rounded-xl border border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-[#0f1623] space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[170px] flex items-center gap-1.5">
                  <input
                    ref={findInputRef}
                    type="text"
                    value={findQuery}
                    onChange={(e) => {
                      setFindQuery(e.target.value);
                      setReplaceStatus(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        navigateMatch(e.shiftKey ? -1 : 1);
                      }
                    }}
                    placeholder="Localizar texto..."
                    aria-label="Texto para localizar"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  />
                  <button
                    type="button"
                    aria-pressed={findCaseSensitive}
                    onClick={() => setFindCaseSensitive((v) => !v)}
                    title="Diferenciar maiúsculas e minúsculas"
                    className={`px-2 py-1.5 text-xs font-mono rounded-lg border transition-colors cursor-pointer shrink-0 ${
                      findCaseSensitive
                        ? 'border-blue-700 bg-blue-700 text-white'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Aa
                  </button>
                </div>

                <div className="flex-1 min-w-[170px]">
                  <input
                    ref={replaceInputRef}
                    type="text"
                    value={replaceQuery}
                    onChange={(e) => {
                      setReplaceQuery(e.target.value);
                      setReplaceStatus(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleReplaceCurrent();
                      }
                    }}
                    placeholder="Substituir por..."
                    aria-label="Substituir por"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 px-1">
                    {findQuery
                      ? findMatches.length > 0
                        ? `${activeMatchIndex + 1} / ${findMatches.length}`
                        : '0 / 0'
                      : '—'}
                  </span>

                  <button
                    type="button"
                    disabled={findMatches.length === 0}
                    onClick={() => navigateMatch(-1)}
                    title="Ocorrência anterior (Shift+Enter)"
                    aria-label="Ocorrência anterior"
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={findMatches.length === 0}
                    onClick={() => navigateMatch(1)}
                    title="Próxima ocorrência (Enter)"
                    aria-label="Próxima ocorrência"
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={findMatches.length === 0}
                    onClick={handleReplaceCurrent}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-400 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Substituir
                  </button>
                  <button
                    type="button"
                    disabled={findMatches.length === 0}
                    onClick={handleReplaceAll}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Substituir tudo
                  </button>

                  <button
                    type="button"
                    onClick={() => setFindReplaceOpen(false)}
                    aria-label="Fechar localizar e substituir"
                    title="Fechar (Esc)"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {replaceStatus && (
                <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  {replaceStatus}
                </p>
              )}
            </div>
          )}

          <div
            className={`grid gap-4 ${
              paneMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {(paneMode === 'code' || paneMode === 'split') && (
              <div className="flex flex-col min-w-0">
                {paneMode === 'split' && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-t-xl border border-b-0 border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-900/70 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      Código (Markdown)
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      wikitexto bruto
                    </span>
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={content}
                  maxLength={VALIDATION_LIMITS.CONTENT_MAX_LENGTH}
                  onFocus={() => setFocusedPane('code')}
                  onChange={(e) => commitContentChange(e.target.value, false)}
                  placeholder="Write in Markdown... Use [[slug]] for links, {{Notice|...}} or {{Aviso|...}} for MediaWiki templates, or :::infobox for infoboxes. Press Ctrl+Enter to save."
                  className={`w-full min-h-[420px] p-4 text-sm font-mono leading-relaxed ${
                    paneMode === 'split' || enableVisualToolbar ? 'rounded-b-xl' : 'rounded-xl'
                  } border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 resize-y`}
                />
              </div>
            )}

            {(paneMode === 'formatted' || paneMode === 'split') && (
              <div
                className="flex flex-col min-w-0"
                onFocusCapture={() => setFocusedPane('formatted')}
              >
                {paneMode === 'split' && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-t-xl border border-b-0 border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-900/70 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                      Edição Formatada
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      visual interativo
                    </span>
                  </div>
                )}
                <FormattedMarkdownPane
                  ref={formattedPaneRef}
                  value={content}
                  onChange={(nextMarkdown) => commitContentChange(nextMarkdown, false)}
                  onActiveFormatsChange={setActiveRichFormats}
                  roundedClassName={
                    paneMode === 'split' || enableVisualToolbar ? 'rounded-b-xl' : 'rounded-xl'
                  }
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            <span>
              Ctrl+Z desfazer · Ctrl+R refazer · Ctrl+H substituir · Ctrl+Enter salvar
            </span>
            <span>
              {content.length.toLocaleString('en-US')} /{' '}
              {VALIDATION_LIMITS.CONTENT_MAX_LENGTH.toLocaleString('en-US')}
            </span>
          </div>
        </div>
      ) : (
        <div className="min-h-[420px] p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0d131f] overflow-y-auto space-y-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 pb-3 border-b border-slate-200 dark:border-slate-800">
            Visualização completa do artigo
          </div>
          {enableHeaderBanner && sanitizeHeaderImageUrl(headerImageUrl) && !bannerPreviewFailed && (
            <figure className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
              <img
                src={sanitizeHeaderImageUrl(headerImageUrl)}
                alt={`${title || 'Page'} banner preview`}
                className="w-full h-36 sm:h-44 object-cover object-center block"
              />
            </figure>
          )}
          <ArticleViewer
            content={content}
            existingSlugs={existingSlugs}
            wikiPages={wikiPages}
            currentSlug={currentSlug}
            onNavigateSlug={onNavigateSlug}
            showToc={showTocPreview}
            tocDefaultExpanded={tocDefaultExpanded}
            tocMinHeadings={tocMinHeadings}
            enableReferences={enableReferencesPreview}
            referencesTitle={referencesTitle}
            enableInfoboxes={enableInfoboxPreview}
            enableTemplates={enableTemplatesPreview}
            externalLinkPrefix={externalLinkPrefix}
            encodeExternalLinkTarget={encodeExternalLinkTarget}
          />
        </div>
      )}

      {/* Admin/Bureaucrat Discussion Notification Toggle when moderating another user's page/edit */}
      {isAdminEditingOtherPage && mode === 'edit' && (
        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 space-y-2.5">
          <label className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={sendAdminNotice || isLocked !== initialIsLocked}
              onChange={(e) => setSendAdminNotice(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 dark:border-slate-700"
            />
            <span>
              <strong>Notificar {targetEditorDisplayName || 'o editor'} na página de discussão</strong>{' '}
              — insere automaticamente uma notificação administrativa dentro da página de discussão
              sobre esta intervenção/sanção na edição
              {isLocked !== initialIsLocked ? ' (obrigatório ao bloquear/desbloquear edição)' : ''}.
            </span>
          </label>
          {(sendAdminNotice || isLocked !== initialIsLocked) && (
            <input
              type="text"
              value={adminNoticeReason}
              maxLength={300}
              onChange={(e) => setAdminNoticeReason(e.target.value)}
              placeholder="Motivo da aplicação administrativa / sanção (usa o resumo se vazio)..."
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-300/80 dark:border-amber-800 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
            />
          )}
        </div>
      )}

      {/* Summary & Save Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex-1">
          <input
            type="text"
            value={summary}
            maxLength={VALIDATION_LIMITS.SUMMARY_MAX_LENGTH}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={
              mode === 'create'
                ? 'Initial creation note (optional)...'
                : 'Change summary for history (e.g., Update code examples)...'
            }
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
          />
        </div>

        <div className="flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            title="Cancel editing (Esc)"
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            title="Save changes (Ctrl+Enter or Ctrl+S)"
            onClick={() => void submitForm()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : mode === 'create' ? 'Publish Page' : 'Save Revision'}</span>
          </button>
        </div>
      </div>

      <InfoboxBuilderModal
        isOpen={infoboxModalOpen}
        existingSlugs={existingSlugs}
        onClose={() => setInfoboxModalOpen(false)}
        onInsert={handleInsertWikiStructure}
        onNavigateSlug={onNavigateSlug}
      />

      {enableTemplatesToolbar && (
        <TemplatePickerModal
          isOpen={templateModalOpen}
          existingSlugs={existingSlugs}
          wikiPages={wikiPages}
          currentUser={currentUser}
          onClose={() => setTemplateModalOpen(false)}
          onInsert={handleInsertWikiStructure}
          onNavigateSlug={onNavigateSlug}
          externalLinkPrefix={externalLinkPrefix}
          encodeExternalLinkTarget={encodeExternalLinkTarget}
        />
      )}
    </div>
  );
};

export const EditView = MarkdownEditor;
