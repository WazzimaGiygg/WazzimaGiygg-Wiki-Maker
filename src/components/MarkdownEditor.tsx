import React from 'react';
import type { User } from 'firebase/auth';
import {
  Bold,
  BookMarked,
  Braces,
  Code,
  ExternalLink,
  Eye,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListChecks,
  Lock,
  PanelRight,
  Quote,
  Save,
  SplitSquareHorizontal,
  Table,
  Unlock,
} from 'lucide-react';
import {
  type PageVisibility,
  VALIDATION_LIMITS,
  WIKI_CATEGORIES,
  type WikiPage,
} from '../types/wiki';
import { toWikiSlug } from '../lib/markdownUtils';
import { ArticleViewer } from './ArticleViewer';
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
  canManageMeta: boolean;
  existingSlugs: Set<string>;
  wikiPages?: WikiPage[];
  currentSlug?: string;
  currentUser?: User | null;
  isSaving: boolean;
  errorMessage: string | null;
  enableInfoboxToolbar?: boolean;
  enableReferencesToolbar?: boolean;
  enableInfoboxPreview?: boolean;
  enableReferencesPreview?: boolean;
  showTocPreview?: boolean;
  tocDefaultExpanded?: boolean;
  tocMinHeadings?: number;
  referencesTitle?: string;
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
    summary: string;
    adminNotice?: {
      send: boolean;
      reason: string;
    };
  }) => Promise<void>;
  onCancel: () => void;
  onNavigateSlug: (slug: string) => void;
}

type EditorPaneMode = 'write' | 'split' | 'preview';

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  mode,
  initialSlug,
  initialTitle,
  initialContent,
  initialCategory,
  initialTags,
  initialVisibility,
  initialIsLocked,
  canManageMeta,
  existingSlugs,
  wikiPages,
  currentSlug,
  currentUser = null,
  isSaving,
  errorMessage,
  enableInfoboxToolbar = true,
  enableReferencesToolbar = true,
  enableInfoboxPreview = true,
  enableReferencesPreview = true,
  showTocPreview = true,
  tocDefaultExpanded = true,
  tocMinHeadings = 1,
  referencesTitle = 'Referências',
  isAdminEditingOtherPage = false,
  targetEditorDisplayName,
  onSave,
  onCancel,
  onNavigateSlug,
}) => {
  const [slug, setSlug] = React.useState(initialSlug);
  const [slugTouched, setSlugTouched] = React.useState(mode === 'edit' || Boolean(initialSlug));
  const [title, setTitle] = React.useState(initialTitle);
  const [content, setContent] = React.useState(initialContent);
  const [category, setCategory] = React.useState(initialCategory || 'general');
  const [tagsText, setTagsText] = React.useState(initialTags.join(', '));
  const [visibility, setVisibility] = React.useState<PageVisibility>(initialVisibility);
  const [isLocked, setIsLocked] = React.useState(initialIsLocked);
  const [summary, setSummary] = React.useState('');
  const [sendAdminNotice, setSendAdminNotice] = React.useState(false);
  const [adminNoticeReason, setAdminNoticeReason] = React.useState('');
  const [paneMode, setPaneMode] = React.useState<EditorPaneMode>('split');
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [infoboxModalOpen, setInfoboxModalOpen] = React.useState(false);
  const [templateModalOpen, setTemplateModalOpen] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    setSlug(initialSlug);
    setSlugTouched(mode === 'edit' || Boolean(initialSlug));
    setTitle(initialTitle);
    setContent(initialContent);
    setCategory(initialCategory || 'general');
    setTagsText(initialTags.join(', '));
    setVisibility(initialVisibility);
    setIsLocked(initialIsLocked);
    setSummary('');
    setSendAdminNotice(false);
    setAdminNoticeReason('');
    setLocalError(null);
  }, [
    mode,
    initialSlug,
    initialTitle,
    initialContent,
    initialCategory,
    initialTags,
    initialVisibility,
    initialIsLocked,
  ]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (mode === 'create' && !slugTouched) {
      setSlug(toWikiSlug(value));
    }
  };

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
      const cursorEnd = cursorStart + selected.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const insertBlockAtCursor = (blockText: string) => {
    const el = textareaRef.current;
    if (!el) {
      setContent((prev) => (prev.trim() ? `${blockText}\n\n${prev}` : `${blockText}\n`));
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const prefix = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const suffix = after && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : '\n';
    const next = `${before}${prefix}${blockText}${suffix}${after}`;
    setContent(next);

    const nextCaret = before.length + prefix.length + blockText.length + suffix.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const submitForm = async () => {
    setLocalError(null);
    const normalizedSlug = mode === 'create' ? toWikiSlug(slug) : initialSlug;
    if (!normalizedSlug) {
      setLocalError('Please provide a valid page identifier (:slug).');
      return;
    }
    if (!title.trim()) {
      setLocalError('Please enter a page title.');
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
      summary: summary.trim(),
      adminNotice: isAdminEditingOtherPage
        ? {
            send: sendAdminNotice || isLocked !== initialIsLocked,
            reason: adminNoticeReason.trim() || summary.trim(),
          }
        : undefined,
    });
  };

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

    if (isMod && e.shiftKey && keyLower === 't') {
      e.preventDefault();
      setTemplateModalOpen(true);
      return;
    }

    if (isMod && e.shiftKey && keyLower === 'p') {
      e.preventDefault();
      setPaneMode((prev) => (prev === 'write' ? 'split' : prev === 'split' ? 'preview' : 'write'));
      return;
    }

    if (isMod && e.shiftKey && keyLower === 'l') {
      e.preventDefault();
      insertSnippet('[[', ']]', 'page-slug|Link Label');
      return;
    }

    if (isMod && e.shiftKey && keyLower === 'r' && enableReferencesToolbar) {
      e.preventDefault();
      insertSnippet('<ref>', '</ref>', 'Autor, Título (Ano). https://...');
      return;
    }

    if (document.activeElement === textareaRef.current && isMod && !e.shiftKey) {
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
          <button
            type="button"
            title="Inserir Pré-definição MediaWiki {{...}} (Ctrl+Shift+T)"
            onClick={() => setTemplateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Braces className="w-3.5 h-3.5" />
            <span>Pré-definições</span>
          </button>
          {enableReferencesToolbar && (
            <button
              type="button"
              title="Inserir citação bibliográfica <ref> (Ctrl+Shift+R)"
              onClick={() =>
                insertSnippet('<ref>', '</ref>', 'Autor, Título (Ano). https://...')
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookMarked className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>&lt;ref&gt;</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
          <button
            type="button"
            onClick={() => setPaneMode('write')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              paneMode === 'write'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setPaneMode('split')}
            className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              paneMode === 'split'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <SplitSquareHorizontal className="w-3.5 h-3.5" />
            Split
          </button>
          <button
            type="button"
            onClick={() => setPaneMode('preview')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              paneMode === 'preview'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>
      </div>

      {/* Markdown Input + Live Preview */}
      <div
        className={`grid gap-5 ${
          paneMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {paneMode !== 'preview' && (
          <div className="flex flex-col">
            {/* Visual Wikitext Formatting Toolbar directly above the textarea */}
            <div
              role="toolbar"
              aria-label="Barra de ferramentas de wikitexto"
              className="flex flex-wrap items-center gap-1 px-2.5 py-2 rounded-t-xl border border-b-0 border-slate-300 dark:border-slate-700 bg-slate-50/90 dark:bg-[#0f1623]"
            >
              <button
                type="button"
                title="Negrito (**texto**) — Ctrl+B"
                onClick={() => insertSnippet('**', '**', 'texto em negrito')}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Bold className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Negrito</span>
              </button>
              <button
                type="button"
                title="Itálico (*texto*) — Ctrl+I"
                onClick={() => insertSnippet('*', '*', 'texto em itálico')}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Italic className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Itálico</span>
              </button>

              <span aria-hidden="true" className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

              <button
                type="button"
                title="Título de seção (## Título)"
                onClick={() => insertSnippet('## ', '', 'Título da Seção')}
                className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Subtítulo (### Subtítulo)"
                onClick={() => insertSnippet('### ', '', 'Subtítulo')}
                className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Heading3 className="w-4 h-4" />
              </button>

              <span aria-hidden="true" className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

              <button
                type="button"
                title="Link interno do wiki ([[slug|Texto]]) — Ctrl+Shift+L"
                onClick={() => insertSnippet('[[', ']]', 'slug-da-pagina|Texto do Link')}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Link</span>
              </button>
              <button
                type="button"
                title="Link externo ([Texto](https://...))"
                onClick={() => insertSnippet('[', '](https://exemplo.com)', 'Texto do Link')}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">URL</span>
              </button>

              <span aria-hidden="true" className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

              <button
                type="button"
                title="Lista com marcadores (- Item)"
                onClick={() => insertSnippet('\n- ', '', 'Item da lista')}
                className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Checklist (- [ ] Tarefa)"
                onClick={() => insertSnippet('\n- [ ] ', '', 'Tarefa pendente')}
                className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ListChecks className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Bloco de citação (> Texto)"
                onClick={() => insertSnippet('\n> ', '', 'Texto citado ou nota editorial.')}
                className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Bloco de código"
                onClick={() => insertSnippet('\n```ts\n', '\n```\n', 'const exemplo = "wiki";')}
                className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Inserir tabela wikitexto/Markdown"
                onClick={() =>
                  insertSnippet(
                    '\n| Coluna 1 | Coluna 2 |\n| --- | --- |\n| ',
                    ' | Valor 2 |\n| Linha 2A | Linha 2B |\n',
                    'Valor 1'
                  )
                }
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabela</span>
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              maxLength={VALIDATION_LIMITS.CONTENT_MAX_LENGTH}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write in Markdown... Use [[slug]] for links, {{Notice|...}} or {{Aviso|...}} for MediaWiki templates, or :::infobox for infoboxes. Press Ctrl+Enter to save."
              className="w-full min-h-[420px] p-4 text-sm font-mono leading-relaxed rounded-b-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 resize-y"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              <span>GFM, {'{{Predefinições}}'}, :::infobox, &lt;ref&gt; &amp; [[links]] · Ctrl+Enter to save</span>
              <span>
                {content.length.toLocaleString('en-US')} /{' '}
                {VALIDATION_LIMITS.CONTENT_MAX_LENGTH.toLocaleString('en-US')}
              </span>
            </div>
          </div>
        )}

        {paneMode !== 'write' && (
          <div className="min-h-[420px] p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0d131f] overflow-y-auto">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              Live preview
            </div>
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
            />
          </div>
        )}
      </div>

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
        onInsert={insertBlockAtCursor}
        onNavigateSlug={onNavigateSlug}
      />

      <TemplatePickerModal
        isOpen={templateModalOpen}
        existingSlugs={existingSlugs}
        wikiPages={wikiPages}
        currentUser={currentUser}
        onClose={() => setTemplateModalOpen(false)}
        onInsert={insertBlockAtCursor}
        onNavigateSlug={onNavigateSlug}
      />
    </div>
  );
};

export const EditView = MarkdownEditor;
