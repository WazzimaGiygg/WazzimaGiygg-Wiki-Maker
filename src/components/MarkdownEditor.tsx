import React from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Blocks,
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
  FolderTree,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  LayoutList,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Loader2,
  Lock,
  PanelRight,
  Plus,
  Quote,
  Redo2,
  Replace,
  Save,
  ShieldAlert,
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
} from '../lib/headerImageService';
import type { ImageUploadExtensionConfig } from '../lib/extensionsService';
import {
  getImageUploadBlockedReason,
  uploadWikiImage,
} from '../lib/imageUploadService';
import {
  buildWikiCategoryDirectory,
  removeCategoryTagFromMarkdown,
  upsertCategoryTagInMarkdown,
} from '../lib/categoryUtils';
import { extractArticleCategories, toWikiSlug } from '../lib/markdownUtils';
import { checkArticleProfanity } from '../lib/profanityFilter';
import { ArticleViewer } from './ArticleViewer';
import {
  type ActiveRichFormats,
  FormattedMarkdownPane,
  type FormattedEditorHandle,
  type RichFormatCommand,
} from './FormattedMarkdownPane';
import { CitationBuilderModal } from './CitationBuilderModal';
import { ImageUploadModal } from './ImageUploadModal';
import { InfoboxBuilderModal } from './InfoboxBuilderModal';
import { TemplateManagementPanel } from './TemplateManagementPanel';
import { TemplatePickerModal } from './TemplatePickerModal';
import { listCommunityTemplates, WIKI_TEMPLATE_CATALOG } from '../services/templateService';

const DEFAULT_IMAGE_UPLOAD_CONFIG: ImageUploadExtensionConfig = {
  extensionEnabled: false,
  blazePlanConfirmed: false,
  canUpload: false,
  maxUploadSizeMb: 5,
  storageFolder: 'wiki-images',
};

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
  isAdmin?: boolean;
  imageUploadConfig?: ImageUploadExtensionConfig;
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
  onSelectCategory?: (slug: string) => void;
  onOpenAllCategories?: () => void;
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
  isAdmin = false,
  imageUploadConfig = DEFAULT_IMAGE_UPLOAD_CONFIG,
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
  referencesTitle = 'References',
  externalLinkPrefix,
  encodeExternalLinkTarget = false,
  isAdminEditingOtherPage = false,
  targetEditorDisplayName,
  onSave,
  onCancel,
  onNavigateSlug,
  onSelectCategory,
  onOpenAllCategories,
  onDirtyChange,
}) => {
  const [slug, setSlug] = React.useState(initialSlug);
  const [slugTouched, setSlugTouched] = React.useState(mode === 'edit' || Boolean(initialSlug));
  const [title, setTitle] = React.useState(initialTitle);
  const [content, setContent] = React.useState(initialContent);
  const [category, setCategory] = React.useState(initialCategory || 'general');
  const [tagsText, setTagsText] = React.useState(initialTags.join(', '));
  const [newWikiCategoryInput, setNewWikiCategoryInput] = React.useState('');
  const categoryDatalistId = React.useId();
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
  const [templateModalInitialView, setTemplateModalInitialView] = React.useState<'picker' | 'all-list'>('picker');
  const [templateManagerOpen, setTemplateManagerOpen] = React.useState(false);
  const [citationModalOpen, setCitationModalOpen] = React.useState(false);

  const totalTemplatesCount = React.useMemo(
    () => WIKI_TEMPLATE_CATALOG.length + listCommunityTemplates(wikiPages).length,
    [wikiPages]
  );

  const extractedWikiCategories = React.useMemo(
    () => extractArticleCategories(content).categories,
    [content]
  );

  const suggestedWikiCategories = React.useMemo(() => {
    const directory = buildWikiCategoryDirectory(wikiPages ?? [], {
      enableTemplates: enableTemplatesPreview,
    });
    const usedSlugs = new Set(extractedWikiCategories.map((c) => c.slug));
    return directory
      .filter((c) => !usedSlugs.has(c.slug))
      .map((c) => c.name);
  }, [wikiPages, enableTemplatesPreview, extractedWikiCategories]);

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
  const [imageModalOpen, setImageModalOpen] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const formattedPaneRef = React.useRef<FormattedEditorHandle | null>(null);
  const bannerFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const findInputRef = React.useRef<HTMLInputElement | null>(null);
  const replaceInputRef = React.useRef<HTMLInputElement | null>(null);
  const summaryInputRef = React.useRef<HTMLInputElement | null>(null);
  const profanityCursorRef = React.useRef(0);
  const contentRef = React.useRef(content);
  contentRef.current = content;

  const profanityCheck = React.useMemo(
    () =>
      checkArticleProfanity({
        title,
        slug: mode === 'create' ? slug : undefined,
        tags: tagsText,
        summary,
        content,
      }),
    [title, mode, slug, tagsText, summary, content]
  );

  const profanityFieldLabels = React.useMemo(
    () => Array.from(new Set(profanityCheck.matches.map((m) => m.fieldLabel))),
    [profanityCheck.matches]
  );

  React.useEffect(() => {
    if (!profanityCheck.hasProfanity) {
      profanityCursorRef.current = 0;
      setLocalError((prev) => (prev?.startsWith('Language filter:') ? null : prev));
    }
  }, [profanityCheck.hasProfanity]);

  const baselineCategory = initialCategory || 'general';
  const baselineTags = initialTags.join(', ');

  const isDirty = React.useMemo(() => {
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
    baselineCategory,
    tagsText,
    baselineTags,
    visibility,
    initialVisibility,
    isLocked,
    initialIsLocked,
    headerImageUrl,
    initialHeaderImageUrl,
    summary,
  ]);

  const isDirtyRef = React.useRef(isDirty);
  isDirtyRef.current = isDirty;
  const sessionIdentityRef = React.useRef(`${mode}:${initialSlug}`);

  React.useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  React.useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  React.useEffect(() => {
    const nextIdentity = `${mode}:${initialSlug}`;
    const isSameSession = sessionIdentityRef.current === nextIdentity;
    if (isSameSession && isDirtyRef.current) {
      return;
    }
    sessionIdentityRef.current = nextIdentity;

    setSlug(initialSlug);
    setSlugTouched(mode === 'edit' || Boolean(initialSlug));
    setTitle(initialTitle);
    setContent(initialContent);
    setCategory(baselineCategory);
    setTagsText(baselineTags);
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
    baselineCategory,
    baselineTags,
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
    setReplaceStatus('1 replacement applied');
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
      count === 1 ? '1 replacement applied' : `${count} replacements applied`
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

  const handleInsertInlineCitation = (snippet: string) => {
    if (targetIsFormatted) {
      formattedPaneRef.current?.insertRawWikiSnippet(snippet);
      return;
    }
    const el = textareaRef.current;
    const currentVal = contentRef.current;
    if (!el) {
      commitContentChange(`${currentVal}${snippet}`, true);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = currentVal.slice(0, start) + snippet + currentVal.slice(end);
    commitContentChange(next, true);
    const caret = start + snippet.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const handleInsertReference = () => {
    setCitationModalOpen(true);
  };

  const handleInsertReferenceList = () => {
    const listTag = enableTemplatesPreview ? '{{Reflist}}' : '<references />';
    handleInsertWikiStructure(`## ${referencesTitle}\n\n${listTag}`);
  };

  const handleBannerFileSelected = async (file: File | null) => {
    if (!file) return;
    const blockedReason = getImageUploadBlockedReason(imageUploadConfig);
    if (blockedReason) {
      setBannerUploadError(blockedReason.detail);
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
      return;
    }
    if (!currentUser) {
      setBannerUploadError('Sign in with Google to upload a header image.');
      return;
    }

    setBannerUploadError(null);
    setIsUploadingBanner(true);
    try {
      const asset = await uploadWikiImage({
        file,
        user: currentUser,
        config: imageUploadConfig,
        pageSlug: slug || initialSlug || title || 'page',
        altText: `${title || 'Page'} header banner`,
      });
      setHeaderImageUrl(asset.downloadUrl);
      setBannerPreviewFailed(false);
    } catch (err) {
      setBannerUploadError(
        err instanceof Error ? err.message : 'Failed to upload header image.'
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

    if (profanityCheck.hasProfanity) {
      const affectedFieldsText = profanityFieldLabels.join(', ');
      const maskedPreview = profanityCheck.uniqueMaskedTerms.slice(0, 5).join(', ');
      setLocalError(
        `Language filter: disallowed terms were found in ${affectedFieldsText} (${maskedPreview}). Remove or replace these words before saving.`
      );
      return;
    }

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
      if (e.isComposing || infoboxModalOpen || templateModalOpen || citationModalOpen) return;
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
  }, [infoboxModalOpen, templateModalOpen, citationModalOpen, openFindReplace, handleUndo, handleRedo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || infoboxModalOpen || templateModalOpen || citationModalOpen) return;

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

  const locateNextProfanityMatch = React.useCallback(() => {
    if (profanityCheck.matches.length === 0) return;
    const idx = profanityCursorRef.current % profanityCheck.matches.length;
    profanityCursorRef.current = idx + 1;
    const match = profanityCheck.matches[idx];

    if (match.field === 'content') {
      if (paneMode === 'preview' || paneMode === 'formatted') {
        setPaneMode('code');
        setFocusedPane('code');
      }
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(match.start, match.end);
        }
      });
      return;
    }

    if (match.field === 'summary') {
      summaryInputRef.current?.focus();
      summaryInputRef.current?.setSelectionRange(match.start, match.end);
      return;
    }

    const fieldIdMap: Record<'title' | 'slug' | 'tags', string> = {
      title: 'wiki-title-input',
      slug: 'wiki-slug-input',
      tags: 'wiki-tags-input',
    };
    const targetInput = document.getElementById(fieldIdMap[match.field]) as HTMLInputElement | null;
    if (targetInput) {
      targetInput.focus();
      targetInput.setSelectionRange(match.start, match.end);
    }
  }, [profanityCheck.matches, paneMode]);

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

      {profanityCheck.hasProfanity && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-xs rounded-lg border border-rose-300 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200"
        >
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <ShieldAlert className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                Automated moderation notice: disallowed terms detected before saving
              </p>
              <p className="text-rose-800 dark:text-rose-300">
                Affected fields: <strong>{profanityFieldLabels.join(', ')}</strong> · Flagged
                terms:{' '}
                <span className="font-mono">
                  {profanityCheck.uniqueMaskedTerms.slice(0, 6).join(', ')}
                  {profanityCheck.uniqueMaskedTerms.length > 6 ? '…' : ''}
                </span>{' '}
                ({profanityCheck.matches.length}{' '}
                {profanityCheck.matches.length === 1 ? 'match' : 'matches'}).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={locateNextProfanityMatch}
            className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-rose-300 dark:border-rose-700 bg-white dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Locate in editor
          </button>
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
            <strong>Unsaved changes:</strong> if you leave this article without saving, all
            changes will be lost.
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

        {/* Wikipedia Categories ([[Category:...]]) Manager */}
        <div className="md:col-span-12 pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="wiki-wikipedia-category-input"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              <FolderTree className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Wikipedia Categories (<code className="font-mono">[[Category:...]]</code>)</span>
            </label>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Stripped from body prose and shown in the bottom Wikipedia category bar
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              id="wiki-wikipedia-category-input"
              type="text"
              list={categoryDatalistId}
              value={newWikiCategoryInput}
              onChange={(e) => setNewWikiCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const trimmed = newWikiCategoryInput.trim();
                  if (!trimmed) return;
                  const [rawName, rawSortKey] = trimmed.split('|');
                  const nextContent = upsertCategoryTagInMarkdown(
                    content,
                    rawName,
                    rawSortKey
                  );
                  if (nextContent !== content) {
                    commitContentChange(nextContent, true);
                  }
                  setNewWikiCategoryInput('');
                }
              }}
              placeholder="Add category (e.g. Science, Governance, Guides|01)..."
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            />
            <datalist id={categoryDatalistId}>
              {suggestedWikiCategories.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <button
              type="button"
              disabled={!newWikiCategoryInput.trim()}
              onClick={() => {
                const trimmed = newWikiCategoryInput.trim();
                if (!trimmed) return;
                const [rawName, rawSortKey] = trimmed.split('|');
                const nextContent = upsertCategoryTagInMarkdown(
                  content,
                  rawName,
                  rawSortKey
                );
                if (nextContent !== content) {
                  commitContentChange(nextContent, true);
                }
                setNewWikiCategoryInput('');
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-45 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Add category</span>
            </button>
          </div>

          {extractedWikiCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {extractedWikiCategories.map((cat) => (
                <span
                  key={cat.slug}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200"
                >
                  <span className="font-medium">{cat.name}</span>
                  {cat.sortKey && (
                    <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      |{cat.sortKey}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const nextContent = removeCategoryTagFromMarkdown(content, cat.slug);
                      if (nextContent !== content) {
                        commitContentChange(nextContent, true);
                      }
                    }}
                    title={`Remove [[Category:${cat.name}]]`}
                    aria-label={`Remove category ${cat.name}`}
                    className="text-slate-400 hover:text-red-700 dark:hover:text-red-400 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
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
                disabled={isUploadingBanner || isSaving || !imageUploadConfig.canUpload}
                title={
                  imageUploadConfig.canUpload
                    ? 'Upload banner image to Firebase Storage'
                    : getImageUploadBlockedReason(imageUploadConfig)?.detail
                }
                onClick={() => bannerFileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
              >
                {isUploadingBanner ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-700 dark:text-blue-400" />
                ) : !imageUploadConfig.canUpload ? (
                  <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                )}
                <span>
                  {isUploadingBanner
                    ? 'Uploading image...'
                    : imageUploadConfig.canUpload
                    ? 'Upload image'
                    : 'Upload locked (Blaze + Extension)'}
                </span>
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
          {(enableTemplatesToolbar || enableInfoboxToolbar) && (
            <button
              type="button"
              aria-expanded={templateManagerOpen}
              title="Open Template Manager panel (Infoboxes, Alerts, and Navigation)"
              onClick={() => setTemplateManagerOpen((open) => !open)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                templateManagerOpen
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-blue-200 dark:border-blue-900/70 text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/35 hover:bg-blue-100/70 dark:hover:bg-blue-950/60'
              }`}
            >
              <Blocks className="w-3.5 h-3.5" />
              <span>Template Manager</span>
            </button>
          )}
          {enableInfoboxToolbar && (
            <button
              type="button"
              title="Insert Infobox (Ctrl+Shift+I)"
              onClick={() => setInfoboxModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PanelRight className="w-3.5 h-3.5" />
              <span>Infobox</span>
            </button>
          )}
          {enableTemplatesToolbar && (
            <>
              <button
                type="button"
                title="Insert MediaWiki Template {{...}} (Ctrl+Shift+T)"
                onClick={() => {
                  setTemplateModalInitialView('picker');
                  setTemplateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Braces className="w-3.5 h-3.5" />
                <span>Templates</span>
              </button>
              <button
                type="button"
                title="List all available templates ({{...}})"
                onClick={() => {
                  setTemplateModalInitialView('all-list');
                  setTemplateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LayoutList className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>List all ({totalTemplatesCount})</span>
              </button>
            </>
          )}
          {enableReferencesToolbar && (
            <>
              <button
                type="button"
                title="Insert bibliographic citation in MediaWiki / Wikipedia format (Ctrl+Shift+R)"
                onClick={handleInsertReference}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BookMarked className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Cite (&lt;ref&gt;)</span>
              </button>
              <button
                type="button"
                title="Insert Reference List section linked to citations {{Reflist}}"
                onMouseDown={(e) => {
                  if (targetIsFormatted) e.preventDefault();
                }}
                onClick={handleInsertReferenceList}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ListOrdered className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Reference List</span>
              </button>
            </>
          )}
          <button
            type="button"
            title="Insert Wikipedia category declaration ([[Category:Name]])"
            onMouseDown={(e) => {
              if (targetIsFormatted) e.preventDefault();
            }}
            onClick={() => insertSnippet('\n[[Category:', ']]', 'Category Name')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderTree className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>Category</span>
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Editor mode"
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
            <span>Formatted</span>
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
            <span>Code</span>
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
            <span>Split View</span>
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
            <span>Preview</span>
          </button>
        </div>
      </div>

      {templateManagerOpen && (enableTemplatesToolbar || enableInfoboxToolbar) && (
        <TemplateManagementPanel
          existingSlugs={existingSlugs}
          wikiPages={wikiPages}
          externalLinkPrefix={externalLinkPrefix}
          encodeExternalLinkTarget={encodeExternalLinkTarget}
          onInsert={handleInsertWikiStructure}
          onClose={() => setTemplateManagerOpen(false)}
          onOpenInfoboxBuilder={
            enableInfoboxToolbar ? () => setInfoboxModalOpen(true) : undefined
          }
          onOpenFullCatalog={
            enableTemplatesToolbar
              ? () => {
                  setTemplateModalInitialView('all-list');
                  setTemplateModalOpen(true);
                }
              : undefined
          }
        />
      )}

      {/* Editor Area: Visual Toolbar + Formatted / Code / Side-by-Side / Preview */}
      {paneMode !== 'preview' ? (
        <div className="flex flex-col">
          {enableVisualToolbar && (
            <div
              role="toolbar"
              aria-label="Editing toolbar"
              className={`flex flex-wrap items-center justify-between gap-2 px-2.5 py-2 border border-slate-300 dark:border-slate-700 bg-slate-50/90 dark:bg-[#0f1623] ${
                paneMode === 'split' ? 'rounded-xl mb-3' : 'rounded-t-xl border-b-0'
              }`}
            >
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  title="Undo (Ctrl+Z)"
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
                  title="Redo (Ctrl+R)"
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
                  title="Find and replace in editor (Ctrl+H)"
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
                  <span className="hidden md:inline">Replace</span>
                </button>

                <span
                  aria-hidden="true"
                  className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5"
                />

                <button
                  type="button"
                  title="Bold (**text**) — Ctrl+B"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('bold', () =>
                      insertSnippet('**', '**', 'bold text')
                    )
                  }
                  className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    targetIsFormatted && activeRichFormats.bold
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Bold className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bold</span>
                </button>
                <button
                  type="button"
                  title="Italic (*text*) — Ctrl+I"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('italic', () =>
                      insertSnippet('*', '*', 'italic text')
                    )
                  }
                  className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    targetIsFormatted && activeRichFormats.italic
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Italic className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Italic</span>
                </button>

                <span
                  aria-hidden="true"
                  className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5"
                />

                <button
                  type="button"
                  title="Section heading (## Heading)"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('heading2', () =>
                      insertSnippet('## ', '', 'Section Heading')
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
                  title="Subheading (### Subheading)"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('heading3', () =>
                      insertSnippet('### ', '', 'Subheading')
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
                  title="Internal wiki link ([[slug|Label]]) — Ctrl+Shift+L"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('wikilink', () =>
                      insertSnippet('[[', ']]', 'page-slug|Link Label')
                    )
                  }
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>Link</span>
                </button>
                <button
                  type="button"
                  title="External link ([Label](https://...))"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('externallink', () =>
                      insertSnippet('[', '](https://example.com)', 'Link Label')
                    )
                  }
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">URL</span>
                </button>
                <button
                  type="button"
                  title={
                    imageUploadConfig.canUpload
                      ? 'Upload or insert image into article'
                      : 'Insert image URL (file upload requires Image Upload extension + Firebase Blaze plan)'
                  }
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() => setImageModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>Image</span>
                </button>

                <span
                  aria-hidden="true"
                  className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5"
                />

                <button
                  type="button"
                  title="Bulleted list (- Item)"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('bulletList', () =>
                      insertSnippet('\n- ', '', 'List item')
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
                  title="Checklist (- [ ] Task)"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('checklist', () =>
                      insertSnippet('\n- [ ] ', '', 'Pending task')
                    )
                  }
                  className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ListChecks className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Blockquote (> Text)"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('blockquote', () =>
                      insertSnippet('\n> ', '', 'Quoted text or editorial note.')
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
                  title="Code block"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('codeBlock', () =>
                      insertSnippet('\n```ts\n', '\n```\n', 'const example = "wiki";')
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
                  title="Insert wikitext/Markdown table"
                  onMouseDown={(e) => {
                    if (targetIsFormatted) e.preventDefault();
                  }}
                  onClick={() =>
                    handleToolbarFormat('table', () =>
                      insertSnippet(
                        '\n| Column 1 | Column 2 |\n| --- | --- |\n| ',
                        ' | Value 2 |\n| Row 2A | Row 2B |\n',
                        'Value 1'
                      )
                    )
                  }
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
              </div>

              {paneMode === 'split' && (
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 px-1.5">
                  Target: {focusedPane === 'formatted' ? 'Formatted' : 'Code'}
                </span>
              )}
            </div>
          )}

          {findReplaceOpen && (
            <div
              role="region"
              aria-label="Find and replace in editor"
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
                    placeholder="Find text..."
                    aria-label="Text to find"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  />
                  <button
                    type="button"
                    aria-pressed={findCaseSensitive}
                    onClick={() => setFindCaseSensitive((v) => !v)}
                    title="Match case"
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
                    placeholder="Replace with..."
                    aria-label="Replace with"
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
                    title="Previous match (Shift+Enter)"
                    aria-label="Previous match"
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={findMatches.length === 0}
                    onClick={() => navigateMatch(1)}
                    title="Next match (Enter)"
                    aria-label="Next match"
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
                    Replace
                  </button>
                  <button
                    type="button"
                    disabled={findMatches.length === 0}
                    onClick={handleReplaceAll}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Replace all
                  </button>

                  <button
                    type="button"
                    onClick={() => setFindReplaceOpen(false)}
                    aria-label="Close find and replace"
                    title="Close (Esc)"
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
                      Code (Markdown)
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      raw wikitext
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
                      Formatted Editor
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      interactive visual
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
              Ctrl+Z undo · Ctrl+R redo · Ctrl+H replace · Ctrl+Enter save
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
            Full article preview
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
            onSelectCategory={onSelectCategory}
            onOpenAllCategories={onOpenAllCategories}
            showToc={showTocPreview}
            tocDefaultExpanded={tocDefaultExpanded}
            tocMinHeadings={tocMinHeadings}
            enableReferences={enableReferencesPreview}
            referencesTitle={referencesTitle}
            enableInfoboxes={enableInfoboxPreview}
            enableTemplates={enableTemplatesPreview}
            showCategoriesFooter={true}
            primaryCategory={category}
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
              <strong>Notify {targetEditorDisplayName || 'the editor'} on their discussion page</strong>{' '}
              — automatically posts an administrative notice on their talk page regarding this
              moderation action
              {isLocked !== initialIsLocked ? ' (required when locking/unlocking editing)' : ''}.
            </span>
          </label>
          {(sendAdminNotice || isLocked !== initialIsLocked) && (
            <input
              type="text"
              value={adminNoticeReason}
              maxLength={300}
              onChange={(e) => setAdminNoticeReason(e.target.value)}
              placeholder="Reason for administrative action / sanction (uses change summary if blank)..."
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-300/80 dark:border-amber-800 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
            />
          )}
        </div>
      )}

      {/* Pre-save Profanity Reminder near Save Controls */}
      {profanityCheck.hasProfanity && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 text-xs rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200"
        >
          <span className="inline-flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400 shrink-0" />
            <span>
              Review disallowed terms in{' '}
              <strong>{profanityFieldLabels.join(', ')}</strong> before saving.
            </span>
          </span>
          <button
            type="button"
            onClick={locateNextProfanityMatch}
            className="font-medium underline hover:no-underline cursor-pointer"
          >
            Jump to match
          </button>
        </div>
      )}

      {/* Summary & Save Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex-1">
          <input
            ref={summaryInputRef}
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
          initialViewMode={templateModalInitialView}
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

      {enableReferencesToolbar && (
        <CitationBuilderModal
          isOpen={citationModalOpen}
          currentContent={content}
          existingSlugs={existingSlugs}
          wikiPages={wikiPages}
          enableTemplates={enableTemplatesPreview}
          externalLinkPrefix={externalLinkPrefix}
          encodeExternalLinkTarget={encodeExternalLinkTarget}
          onClose={() => setCitationModalOpen(false)}
          onInsertInline={handleInsertInlineCitation}
          onInsertBlock={handleInsertWikiStructure}
        />
      )}

      <ImageUploadModal
        isOpen={imageModalOpen}
        currentUser={currentUser}
        isAdmin={isAdmin}
        pageSlug={slug || initialSlug || currentSlug}
        imageUploadConfig={imageUploadConfig}
        onInsertImage={(markdownSnippet) => {
          handleInsertWikiStructure(markdownSnippet);
        }}
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
};

export const EditView = MarkdownEditor;
