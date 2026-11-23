import React from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Bold,
  Braces,
  CheckCircle2,
  ExternalLink,
  Italic,
  Link2,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { deletePageAsAdmin } from '../lib/adminService';
import { formatAbsoluteTime, formatRelativeTime, toWikiSlug } from '../lib/markdownUtils';
import { createWikiPage, updateWikiPage } from '../lib/wikiService';
import {
  extractTemplateDocumentation,
  extractTemplateParameters,
  isTemplatePage,
  validateTemplateSyntax,
} from '../services/templateService';
import { type PageVisibility, VALIDATION_LIMITS, type WikiPage } from '../types/wiki';
import { ArticleViewer } from './ArticleViewer';

interface AdminTemplatesPanelProps {
  pages: WikiPage[];
  allWikiPages: WikiPage[];
  currentUser: User;
  onSelectPage: (slug: string) => void;
  onReloadData: () => Promise<void>;
  onFeedback: (message: string | null) => void;
  onError: (message: string | null) => void;
  externalLinkPrefix?: string;
  encodeExternalLinkTarget?: boolean;
}

type TemplateNamespaceFilter = 'all' | 'predefinicao' | 'template' | 'private';

const DEFAULT_NEW_TEMPLATE_CONTENT = `<noinclude>
Reusable MediaWiki-style template documentation. Content inside \`<noinclude>\` appears only on the template page.

## Usage

\`\`\`markdown
{{Template:Custom Notice|title=Editorial Note|text=Your message here.}}
\`\`\`

</noinclude>{{Notice|type=warning|title={{{title|Editorial Note}}}|text={{{text|Template content goes here.}}}}}`;

export const AdminTemplatesPanel: React.FC<AdminTemplatesPanelProps> = ({
  pages,
  allWikiPages,
  currentUser,
  onSelectPage,
  onReloadData,
  onFeedback,
  onError,
  externalLinkPrefix,
  encodeExternalLinkTarget = false,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [nsFilter, setNsFilter] = React.useState<TemplateNamespaceFilter>('all');
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [confirmDeleteSlug, setConfirmDeleteSlug] = React.useState<string | null>(null);

  // Create / Edit modal state
  const [editorMode, setEditorMode] = React.useState<'create' | 'edit' | null>(null);
  const [editingPage, setEditingPage] = React.useState<WikiPage | null>(null);
  const [draftNamespace, setDraftNamespace] = React.useState<'Template:' | 'Predefinição:'>('Template:');
  const [draftName, setDraftName] = React.useState('');
  const [draftSlug, setDraftSlug] = React.useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false);
  const [draftContent, setDraftContent] = React.useState(DEFAULT_NEW_TEMPLATE_CONTENT);
  const [draftTags, setDraftTags] = React.useState('template, predefinicao');
  const [draftVisibility, setDraftVisibility] = React.useState<PageVisibility>('public');
  const [draftLocked, setDraftLocked] = React.useState(false);
  const [draftSummary, setDraftSummary] = React.useState('');
  const [modalError, setModalError] = React.useState<string | null>(null);

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const templatePages = React.useMemo(
    () =>
      [...pages]
        .filter((p) => isTemplatePage(p))
        .sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0)),
    [pages]
  );

  const existingSlugs = React.useMemo(
    () => new Set(allWikiPages.map((p) => p.slug)),
    [allWikiPages]
  );

  const filteredTemplates = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return templatePages.filter((page) => {
      if (nsFilter === 'predefinicao' && !page.slug.startsWith('predefinicao-')) return false;
      if (nsFilter === 'template' && !page.slug.startsWith('template-')) return false;
      if (nsFilter === 'private' && page.visibility !== 'private') return false;
      if (!q) return true;
      const paramsText = extractTemplateParameters(page.content)
        .map((p) => p.name)
        .join(' ')
        .toLowerCase();
      return (
        page.title.toLowerCase().includes(q) ||
        page.slug.toLowerCase().includes(q) ||
        page.authorName.toLowerCase().includes(q) ||
        page.tags.some((t) => t.toLowerCase().includes(q)) ||
        paramsText.includes(q)
      );
    });
  }, [templatePages, nsFilter, searchQuery]);

  const computeSlugForCreate = (ns: 'Template:' | 'Predefinição:', rawName: string) => {
    const cleanName = rawName
      .replace(/^(predefini[cç][aã]o|predefinicao|template)\s*:\s*/i, '')
      .trim();
    const base = toWikiSlug(cleanName);
    if (!base) return '';
    const prefix = ns === 'Template:' ? 'template-' : 'predefinicao-';
    if (base.startsWith('template-') || base.startsWith('predefinicao-')) {
      return base.slice(0, VALIDATION_LIMITS.SLUG_MAX_LENGTH);
    }
    return toWikiSlug(`${prefix}${base}`);
  };

  const formatFullTitle = (ns: 'Template:' | 'Predefinição:', rawName: string) => {
    const cleanName = rawName
      .replace(/^(predefini[cç][aã]o|predefinicao|template)\s*:\s*/i, '')
      .trim();
    return `${ns}${cleanName || 'Untitled'}`.slice(0, VALIDATION_LIMITS.TITLE_MAX_LENGTH);
  };

  const openCreateModal = () => {
    setEditorMode('create');
    setEditingPage(null);
    setDraftNamespace('Template:');
    setDraftName('');
    setDraftSlug('');
    setSlugManuallyEdited(false);
    setDraftContent(DEFAULT_NEW_TEMPLATE_CONTENT);
    setDraftTags('template, predefinicao');
    setDraftVisibility('public');
    setDraftLocked(false);
    setDraftSummary('Admin: created community template');
    setModalError(null);
  };

  const openEditModal = (page: WikiPage) => {
    const isEn = /^template\s*:/i.test(page.title) || page.slug.startsWith('template-');
    const cleanName = page.title
      .replace(/^(predefini[cç][aã]o|predefinicao|template)\s*:\s*/i, '')
      .trim();
    setEditorMode('edit');
    setEditingPage(page);
    setDraftNamespace(isEn ? 'Template:' : 'Predefinição:');
    setDraftName(cleanName || page.title);
    setDraftSlug(page.slug);
    setSlugManuallyEdited(true);
    setDraftContent(page.content);
    setDraftTags(page.tags.join(', '));
    setDraftVisibility(page.visibility);
    setDraftLocked(page.isLocked);
    setDraftSummary(`Admin: updated ${page.title}`);
    setModalError(null);
  };

  const closeModal = () => {
    setEditorMode(null);
    setEditingPage(null);
    setModalError(null);
  };

  const resolvedTitle =
    editorMode === 'edit' && editingPage
      ? formatFullTitle(draftNamespace, draftName)
      : formatFullTitle(draftNamespace, draftName);

  const syntaxCheck = React.useMemo(
    () => validateTemplateSyntax(draftContent, resolvedTitle),
    [draftContent, resolvedTitle]
  );

  const livePreviewContent = React.useMemo(() => {
    const transcludable = draftContent
      .replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, '')
      .replace(/<\/?includeonly>/gi, '')
      .trim();
    return transcludable.replace(
      /\{\{\{([^{}|]+?)(?:\|([^{}]*?))?\}\}\}/g,
      (_m, rawKey: string, defVal?: string) => (defVal?.trim() ? defVal.trim() : rawKey.trim())
    );
  }, [draftContent]);

  const insertInTemplateTextarea = (before: string, after = '', fallback = 'text') => {
    const el = textareaRef.current;
    if (!el) {
      setDraftContent((prev) => `${prev}${before}${fallback}${after}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = draftContent.slice(start, end) || fallback;
    const next = draftContent.slice(0, start) + before + selected + after + draftContent.slice(end);
    setDraftContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const s = start + before.length;
      el.setSelectionRange(s, s + selected.length);
    });
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    onError(null);
    onFeedback(null);

    const cleanName = draftName.trim();
    if (!cleanName) {
      setModalError('Template name is required.');
      return;
    }

    if (!syntaxCheck.valid) {
      setModalError(syntaxCheck.errors[0]);
      return;
    }

    const parsedTags = Array.from(
      new Set([
        'template',
        'predefinicao',
        ...draftTags
          .split(',')
          .map((t) => t.trim().slice(0, VALIDATION_LIMITS.TAG_MAX_LENGTH))
          .filter(Boolean),
      ])
    ).slice(0, VALIDATION_LIMITS.TAGS_MAX_COUNT);

    if (editorMode === 'create') {
      const targetSlug = toWikiSlug(draftSlug || computeSlugForCreate(draftNamespace, cleanName));
      if (
        !targetSlug ||
        (!targetSlug.startsWith('template-') && !targetSlug.startsWith('predefinicao-'))
      ) {
        setModalError('Slug must start with "template-" or "predefinicao-".');
        return;
      }
      if (existingSlugs.has(targetSlug)) {
        setModalError(`A page already exists at :${targetSlug}. Choose a different template name.`);
        return;
      }

      setBusyKey('save:new');
      try {
        await createWikiPage(
          {
            slug: targetSlug,
            title: resolvedTitle,
            content: draftContent,
            category: 'reference',
            tags: parsedTags,
            visibility: draftVisibility,
            isLocked: draftLocked,
            summary: draftSummary.trim() || `Admin: created ${resolvedTitle}`,
          },
          currentUser
        );
        onFeedback(`Created template "${resolvedTitle}" (:${targetSlug}).`);
        closeModal();
        await onReloadData();
      } catch (err) {
        setModalError(err instanceof Error ? err.message : 'Failed to create template.');
      } finally {
        setBusyKey(null);
      }
      return;
    }

    if (editorMode === 'edit' && editingPage) {
      setBusyKey(`save:${editingPage.slug}`);
      try {
        await updateWikiPage(
          editingPage,
          {
            slug: editingPage.slug,
            title: resolvedTitle,
            content: draftContent,
            category: editingPage.category || 'reference',
            tags: parsedTags,
            visibility: draftVisibility,
            isLocked: draftLocked,
            summary: draftSummary.trim() || `Admin: updated ${resolvedTitle}`,
          },
          currentUser,
          true
        );
        onFeedback(`Saved changes to template "${resolvedTitle}" (:${editingPage.slug}).`);
        closeModal();
        await onReloadData();
      } catch (err) {
        setModalError(err instanceof Error ? err.message : 'Failed to update template.');
      } finally {
        setBusyKey(null);
      }
    }
  };

  const handleDeleteTemplate = async (page: WikiPage) => {
    setBusyKey(`delete:${page.slug}`);
    onError(null);
    onFeedback(null);
    try {
      await deletePageAsAdmin(page.slug);
      setConfirmDeleteSlug(null);
      onFeedback(`Deleted template "${page.title}" (:${page.slug}) and all revisions.`);
      await onReloadData();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete template.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
          {(
            [
              { id: 'all', label: `All Templates (${templatePages.length})` },
              {
                id: 'template',
                label: `Template:* (${templatePages.filter((p) => p.slug.startsWith('template-')).length})`,
              },
              {
                id: 'predefinicao',
                label: `Predefinição:* (${templatePages.filter((p) => p.slug.startsWith('predefinicao-')).length})`,
              },
              {
                id: 'private',
                label: `Private (${templatePages.filter((p) => p.visibility === 'private').length})`,
              },
            ] as { id: TemplateNamespaceFilter; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setNsFilter(item.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                nsFilter === item.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter templates, :slug, or {{{param}}}..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
            />
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Templates Table */}
      {filteredTemplates.length === 0 ? (
        <div className="py-12 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17] space-y-3">
          <Braces className="w-6 h-6 mx-auto text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {templatePages.length === 0
              ? 'No community templates stored in Firestore yet.'
              : 'No templates match your search or namespace filter.'}
          </p>
          {templatePages.length === 0 && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Community Template</span>
            </button>
          )}
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f1623] text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-4">Template</th>
                  <th className="py-2.5 px-4">Detected Parameters</th>
                  <th className="py-2.5 px-4">Author &amp; Access</th>
                  <th className="py-2.5 px-4 text-right">Updated</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredTemplates.map((tpl) => {
                  const params = extractTemplateParameters(tpl.content);
                  const docsSnippet = extractTemplateDocumentation(tpl.content);
                  const isDeleting = busyKey === `delete:${tpl.slug}`;

                  return (
                    <tr
                      key={tpl.slug}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectPage(tpl.slug)}
                            className="text-left font-medium text-blue-700 dark:text-blue-400 hover:underline truncate cursor-pointer"
                          >
                            {tpl.title}
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectPage(tpl.slug)}
                            title={`Open :${tpl.slug}`}
                            className="text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 shrink-0 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          :{tpl.slug} · v{tpl.version}
                        </div>
                        {docsSnippet && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {docsSnippet}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                        {params.length > 0 ? (
                          <span className="break-all">
                            {params.map((p) => `{{{${p.name}}}}`).join(' · ')}
                          </span>
                        ) : (
                          <span className="text-slate-400">No parameters</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                        <div>{tpl.lastEditorName || tpl.authorName}</div>
                        <div className="text-slate-500 dark:text-slate-400">
                          {tpl.visibility === 'private' ? 'Private' : 'Public'}
                          {tpl.isLocked ? ' · Locked' : ''}
                        </div>
                      </td>

                      <td
                        className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap"
                        title={formatAbsoluteTime(tpl.updatedAt)}
                      >
                        {formatRelativeTime(tpl.updatedAt)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(tpl)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          {confirmDeleteSlug === tpl.slug ? (
                            <>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => void handleDeleteTemplate(tpl)}
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-700 text-white hover:bg-red-800 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
                              >
                                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                              </button>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setConfirmDeleteSlug(null)}
                                className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteSlug(tpl.slug)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT COMMUNITY TEMPLATE MODAL */}
      {editorMode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-template-editor-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
          onClick={closeModal}
        >
          <form
            onSubmit={handleSaveTemplate}
            onClick={(e) => e.stopPropagation()}
            data-wiki-surface="panel"
            className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1623] shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  admin / templates / {editorMode === 'create' ? 'new' : `:${editingPage?.slug}`}
                </p>
                <h2
                  id="admin-template-editor-title"
                  className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 truncate"
                >
                  {editorMode === 'create'
                    ? 'Create Community Template'
                    : `Edit Template: ${editingPage?.title}`}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close template editor"
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-xs text-red-800 dark:text-red-300">
                  {modalError}
                </div>
              )}

              {/* Metadata Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Namespace
                  </label>
                  <select
                    value={draftNamespace}
                    onChange={(e) => {
                      const nextNs = e.target.value as 'Template:' | 'Predefinição:';
                      setDraftNamespace(nextNs);
                      if (editorMode === 'create' && !slugManuallyEdited) {
                        setDraftSlug(computeSlugForCreate(nextNs, draftName));
                      }
                    }}
                    className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  >
                    <option value="Template:">Template:</option>
                    <option value="Predefinição:">Predefinição:</option>
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    required
                    value={draftName}
                    maxLength={VALIDATION_LIMITS.TITLE_MAX_LENGTH - 15}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraftName(val);
                      if (editorMode === 'create' && !slugManuallyEdited) {
                        setDraftSlug(computeSlugForCreate(draftNamespace, val));
                      }
                    }}
                    placeholder="Editorial Note"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Database Slug
                  </label>
                  <input
                    type="text"
                    value={draftSlug}
                    disabled={editorMode === 'edit'}
                    maxLength={VALIDATION_LIMITS.SLUG_MAX_LENGTH}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setDraftSlug(e.target.value);
                    }}
                    onBlur={() => {
                      if (editorMode === 'create') {
                        setDraftSlug(toWikiSlug(draftSlug));
                      }
                    }}
                    placeholder="template-editorial-note"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 disabled:text-slate-500 focus:outline-none focus:border-blue-700"
                  />
                </div>

                <div className="md:col-span-3 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Visibility
                    </label>
                    <select
                      value={draftVisibility}
                      onChange={(e) => setDraftVisibility(e.target.value as PageVisibility)}
                      className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDraftLocked((prev) => !prev)}
                    title={draftLocked ? 'Unlock editing' : 'Lock editing to admins'}
                    className={`px-2.5 py-2 text-xs font-medium rounded-lg border inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 ${
                      draftLocked
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                        : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {draftLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{draftLocked ? 'Locked' : 'Open'}</span>
                  </button>
                </div>
              </div>

              {/* Editor + Live Preview Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  {/* Visual Wikitext Toolbar directly above textarea */}
                  <div className="flex flex-wrap items-center gap-1 px-2.5 py-2 rounded-t-xl border border-b-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17]">
                    <button
                      type="button"
                      title="Insert parameter placeholder {{{param|default}}}"
                      onClick={() => insertInTemplateTextarea('{{{', '|default}}}', 'param')}
                      className="px-2 py-1 text-[11px] font-mono rounded text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                    >
                      {'{{{param}}}'}
                    </button>
                    <button
                      type="button"
                      title="Insert <noinclude> documentation block"
                      onClick={() =>
                        insertInTemplateTextarea('<noinclude>\n', '\n</noinclude>', 'Template docs')
                      }
                      className="px-2 py-1 text-[11px] font-mono rounded text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {'<noinclude>'}
                    </button>
                    <button
                      type="button"
                      title="Insert <includeonly> transclusion block"
                      onClick={() =>
                        insertInTemplateTextarea(
                          '<includeonly>',
                          '</includeonly>',
                          'Transcluded only'
                        )
                      }
                      className="px-2 py-1 text-[11px] font-mono rounded text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {'<includeonly>'}
                    </button>
                    <button
                      type="button"
                      title="Bold"
                      onClick={() => insertInTemplateTextarea('**', '**', 'bold')}
                      className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Italic"
                      onClick={() => insertInTemplateTextarea('*', '*', 'italic')}
                      className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Internal Wiki Link"
                      onClick={() => insertInTemplateTextarea('[[', ']]', 'start|Home')}
                      className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Insert {{Notice}} wrapper"
                      onClick={() =>
                        insertInTemplateTextarea(
                          '{{Notice|type=warning|title={{{title|Notice}}}|text=',
                          '}}',
                          '{{{1|Body}}}'
                        )
                      }
                      className="px-2 py-1 text-[11px] font-mono rounded text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {'{{Notice}}'}
                    </button>
                  </div>

                  <textarea
                    ref={textareaRef}
                    rows={12}
                    required
                    value={draftContent}
                    maxLength={VALIDATION_LIMITS.CONTENT_MAX_LENGTH}
                    onChange={(e) => setDraftContent(e.target.value)}
                    placeholder="Write MediaWiki template wikitext with {{{params}}}..."
                    className="w-full p-3.5 text-xs font-mono leading-relaxed rounded-b-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 resize-y"
                  />

                  {/* Live Syntax Validation Feedback */}
                  <div className="mt-2 space-y-1.5 text-xs">
                    {syntaxCheck.valid ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Syntax valid ·{' '}
                          {syntaxCheck.detectedParams.length > 0
                            ? `${syntaxCheck.detectedParams.length} param(s): ${syntaxCheck.detectedParams
                                .map((p) => p.name)
                                .join(', ')}`
                            : 'No placeholders'}
                        </span>
                      </div>
                    ) : (
                      syntaxCheck.errors.map((errMsg, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-1.5 text-red-700 dark:text-red-400"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{errMsg}</span>
                        </div>
                      ))
                    )}
                    {syntaxCheck.warnings.map((warnMsg, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{warnMsg}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Transclusion Preview */}
                <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17] p-4 overflow-y-auto max-h-[360px]">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
                    Transclusion Preview ({resolvedTitle})
                  </div>
                  {livePreviewContent ? (
                    <ArticleViewer
                      content={livePreviewContent}
                      existingSlugs={existingSlugs}
                      wikiPages={allWikiPages}
                      currentSlug={draftSlug || undefined}
                      currentTitle={resolvedTitle}
                      onNavigateSlug={onSelectPage}
                      showToc={false}
                      showReferencesFooter={true}
                      externalLinkPrefix={externalLinkPrefix}
                      encodeExternalLinkTarget={encodeExternalLinkTarget}
                    />
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Nothing transcludable outside &lt;noinclude&gt;.
                    </p>
                  )}
                </div>
              </div>

              {/* Tags + Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={draftTags}
                    onChange={(e) => setDraftTags(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Revision Summary
                  </label>
                  <input
                    type="text"
                    value={draftSummary}
                    maxLength={VALIDATION_LIMITS.SUMMARY_MAX_LENGTH}
                    onChange={(e) => setDraftSummary(e.target.value)}
                    placeholder="Describe template update..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50/70 dark:bg-[#0b0f17]">
              <button
                type="button"
                onClick={closeModal}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!syntaxCheck.valid || busyKey !== null}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
              >
                {busyKey?.startsWith('save:')
                  ? 'Saving...'
                  : editorMode === 'create'
                  ? 'Publish Template'
                  : 'Save Template Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
