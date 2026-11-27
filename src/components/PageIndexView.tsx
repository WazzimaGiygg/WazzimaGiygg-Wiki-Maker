import React from 'react';
import type { User } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';
import {
  Archive,
  Calendar,
  Check,
  FolderTree,
  History,
  List,
  Loader2,
  Lock,
  Plus,
  Search,
  SlidersHorizontal,
  Tag,
  User as UserIcon,
  X,
} from 'lucide-react';
import { WIKI_CATEGORIES, type WikiPage } from '../types/wiki';
import { exportPublicWikiArchiveZip } from '../lib/archiveExportService';
import { extractArticleCategories, formatAbsoluteTime, formatRelativeTime } from '../lib/markdownUtils';
import { buildTagDirectory } from '../lib/tagUtils';
import { TagManagementPanel } from './TagManagementPanel';

type DateFilterMode = 'exact' | 'from' | 'to' | 'range';

interface PageIndexViewProps {
  mode: 'index' | 'recent' | 'tags';
  siteTitle?: string;
  pages: WikiPage[];
  isSignedIn: boolean;
  user?: User | null;
  isAdmin?: boolean;
  isBlocked?: boolean;
  enableZipExport?: boolean;
  onSelectPage: (slug: string) => void;
  onOpenCategories?: (categorySlug?: string) => void;
  onNewPage: () => void;
  onSignIn?: () => void;
  onNotify?: (notice: {
    tone: 'success' | 'info' | 'warning';
    title: string;
    description: string;
  }) => void;
}

function toLocalDateInputValue(timestamp: Timestamp | null | undefined): string | null {
  if (!timestamp) return null;
  const date = timestamp.toDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const PageIndexView: React.FC<PageIndexViewProps> = ({
  mode,
  siteTitle,
  pages,
  isSignedIn,
  user = null,
  isAdmin = false,
  isBlocked = false,
  enableZipExport = true,
  onSelectPage,
  onOpenCategories,
  onNewPage,
  onSignIn,
  onNotify,
}) => {
  const [dashboardTab, setDashboardTab] = React.useState<'pages' | 'tags'>(
    mode === 'tags' ? 'tags' : 'pages'
  );
  React.useEffect(() => {
    setDashboardTab(mode === 'tags' ? 'tags' : 'pages');
  }, [mode]);

  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [onlyLastFiveEdits, setOnlyLastFiveEdits] = React.useState(false);
  const [advancedSearchOpen, setAdvancedSearchOpen] = React.useState(false);
  const [dateMode, setDateMode] = React.useState<DateFilterMode>('exact');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [editorFilter, setEditorFilter] = React.useState('');
  const [pageIdFilter, setPageIdFilter] = React.useState('');
  const [exportingZip, setExportingZip] = React.useState(false);
  const [exportNotice, setExportNotice] = React.useState<string | null>(null);
  const [exportError, setExportError] = React.useState<string | null>(null);

  const editorDatalistId = React.useId();

  const totalUniqueTags = React.useMemo(
    () => buildTagDirectory(pages, user, isAdmin, isBlocked).tags.length,
    [pages, user, isAdmin, isBlocked]
  );

  const publicPagesCount = React.useMemo(
    () => pages.filter((p) => p.visibility === 'public').length,
    [pages]
  );

  const availableEditors = React.useMemo(() => {
    const names = new Set<string>();
    for (const page of pages) {
      if (page.lastEditorName.trim()) {
        names.add(page.lastEditorName.trim());
      }
      for (const entry of page.recentEditors ?? []) {
        if (entry.name.trim()) {
          names.add(entry.name.trim());
        }
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [pages]);

  const hasActiveDateFilter =
    dateMode === 'range' ? Boolean(dateFrom || dateTo) : Boolean(dateFrom);
  const activeAdvancedCount =
    (hasActiveDateFilter ? 1 : 0) +
    (editorFilter.trim() ? 1 : 0) +
    (pageIdFilter.trim() ? 1 : 0);
  const hasAnyFilter =
    categoryFilter !== 'all' || Boolean(search.trim()) || activeAdvancedCount > 0;

  const clearAdvancedFilters = () => {
    setDateMode('exact');
    setDateFrom('');
    setDateTo('');
    setEditorFilter('');
    setPageIdFilter('');
  };

  const clearAllFilters = () => {
    setCategoryFilter('all');
    setSearch('');
    clearAdvancedFilters();
  };

  const handleExportArchive = async () => {
    setExportingZip(true);
    setExportNotice(null);
    setExportError(null);
    try {
      const result = await exportPublicWikiArchiveZip(pages, siteTitle);
      const sizeKb = Math.max(1, Math.round(result.byteSize / 1024));
      setExportNotice(
        `Exported ${result.pageCount} public Markdown ${
          result.pageCount === 1 ? 'file' : 'files'
        } into ${result.fileName} (${sizeKb} KB).`
      );
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to create ZIP archive.');
    } finally {
      setExportingZip(false);
    }
  };

  const sortedAndFiltered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const eq = editorFilter.trim().toLowerCase();
    const idq = pageIdFilter.trim().replace(/^:+/, '').toLowerCase();

    const filtered = pages.filter((p) => {
      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
      if (!matchesCat) return false;

      if (q) {
        const matchesQuick =
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.lastEditorName.toLowerCase().includes(q) ||
          (p.recentEditors ?? []).some((ed) => ed.name.toLowerCase().includes(q));
        if (!matchesQuick) return false;
      }

      if (hasActiveDateFilter) {
        const updatedKey = toLocalDateInputValue(p.updatedAt);
        if (!updatedKey) return false;
        if (dateMode === 'exact' && updatedKey !== dateFrom) return false;
        if (dateMode === 'from' && updatedKey < dateFrom) return false;
        if (dateMode === 'to' && updatedKey > dateFrom) return false;
        if (dateMode === 'range') {
          if (dateFrom && dateTo) {
            const [minDate, maxDate] =
              dateFrom <= dateTo ? [dateFrom, dateTo] : [dateTo, dateFrom];
            if (updatedKey < minDate || updatedKey > maxDate) return false;
          } else if (dateFrom && updatedKey < dateFrom) {
            return false;
          } else if (dateTo && updatedKey > dateTo) {
            return false;
          }
        }
      }

      if (eq) {
        const matchesEditor =
          p.lastEditorName.toLowerCase().includes(eq) ||
          p.lastEditorId.toLowerCase().includes(eq) ||
          (p.recentEditors ?? []).some(
            (ed) =>
              ed.name.toLowerCase().includes(eq) || ed.uid.toLowerCase().includes(eq)
          );
        if (!matchesEditor) return false;
      }

      if (idq) {
        if (!p.slug.toLowerCase().includes(idq)) return false;
      }

      return true;
    });

    if (mode === 'recent' || onlyLastFiveEdits) {
      return [...filtered].sort((a, b) => {
        const ta = a.updatedAt?.toMillis() ?? 0;
        const tb = b.updatedAt?.toMillis() ?? 0;
        if (tb !== ta) return tb - ta;
        return a.title.localeCompare(b.title, 'en-US');
      });
    }

    return [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'en-US'));
  }, [
    pages,
    search,
    categoryFilter,
    mode,
    onlyLastFiveEdits,
    hasActiveDateFilter,
    dateMode,
    dateFrom,
    dateTo,
    editorFilter,
    pageIdFilter,
  ]);

  const displayedPages = React.useMemo(
    () => (onlyLastFiveEdits ? sortedAndFiltered.slice(0, 5) : sortedAndFiltered),
    [onlyLastFiveEdits, sortedAndFiltered]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            wiki /{' '}
            {dashboardTab === 'tags'
              ? 'tag-management'
              : mode === 'recent'
              ? 'recent-changes'
              : 'page-index'}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {dashboardTab === 'tags'
              ? 'Tag Management'
              : mode === 'recent'
              ? 'Recent Changes'
              : 'Page Index'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {dashboardTab === 'tags'
              ? 'Inspect wiki tags, filter articles by tag combinations, and bulk-manage tags across editable pages.'
              : mode === 'recent'
              ? 'Latest collaborative edits and page creations stored in Firestore.'
              : 'Complete catalog of wiki pages available in this workspace.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Dashboard Switcher: Pages Directory vs Tag Management */}
          <div
            role="tablist"
            aria-label="Dashboard view mode"
            className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg"
          >
            <button
              type="button"
              role="tab"
              aria-selected={dashboardTab === 'pages'}
              onClick={() => setDashboardTab('pages')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                dashboardTab === 'pages'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <List className="w-3.5 h-3.5 shrink-0" />
              <span>{mode === 'recent' ? 'Recent Pages' : 'Page Directory'}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={dashboardTab === 'tags'}
              onClick={() => setDashboardTab('tags')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                dashboardTab === 'tags'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Tag className="w-3.5 h-3.5 shrink-0 text-blue-700 dark:text-blue-400" />
              <span className="tabular-nums">Tag Management ({totalUniqueTags})</span>
            </button>
          </div>

          {onOpenCategories && (
            <button
              type="button"
              onClick={() => onOpenCategories()}
              title="Browse Wikipedia-style category pages and tags"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderTree className="w-4 h-4 shrink-0 text-blue-700 dark:text-blue-400" />
              <span>Categories</span>
            </button>
          )}

          {enableZipExport && (
            <button
              type="button"
              disabled={exportingZip || publicPagesCount === 0}
              onClick={() => void handleExportArchive()}
              title="Download all public wiki pages as individual Markdown files in a ZIP archive"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportingZip ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <Archive className="w-4 h-4 shrink-0 text-blue-700 dark:text-blue-400" />
              )}
              <span className="tabular-nums">
                {exportingZip ? 'Archiving...' : `Export Public ZIP (${publicPagesCount})`}
              </span>
            </button>
          )}

          {isSignedIn && (
            <button
              type="button"
              onClick={onNewPage}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Page</span>
            </button>
          )}
        </div>
      </div>

      {exportNotice && (
        <div
          role="status"
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-xs text-emerald-900 dark:text-emerald-200"
        >
          <Check className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
          <span>{exportNotice}</span>
        </div>
      )}

      {exportError && (
        <div
          role="alert"
          className="px-3.5 py-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-xs text-red-900 dark:text-red-200"
        >
          {exportError}
        </div>
      )}

      {dashboardTab === 'tags' ? (
        <TagManagementPanel
          pages={pages}
          user={user}
          isAdmin={isAdmin}
          isBlocked={isBlocked}
          onSelectPage={onSelectPage}
          onSignIn={onSignIn}
          onNotify={onNotify}
        />
      ) : (
        <>
      {/* Filters Row */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              All ({pages.length})
            </button>
            {WIKI_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              aria-pressed={onlyLastFiveEdits}
              onClick={() => setOnlyLastFiveEdits((prev) => !prev)}
              data-wiki-surface={onlyLastFiveEdits ? 'accent' : 'inset'}
              title="Show only the 5 most recently edited pages"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                onlyLastFiveEdits
                  ? 'border-blue-700 bg-blue-700 text-white hover:bg-blue-800'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span>Last 5 edits</span>
            </button>

            <button
              type="button"
              aria-expanded={advancedSearchOpen}
              onClick={() => setAdvancedSearchOpen((prev) => !prev)}
              data-wiki-surface={
                advancedSearchOpen || activeAdvancedCount > 0 ? 'nav-active' : 'inset'
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                advancedSearchOpen || activeAdvancedCount > 0
                  ? 'border-blue-700/60 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span>Advanced search</span>
              {activeAdvancedCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-700 text-white font-mono text-[10px] tabular-nums">
                  {activeAdvancedCount}
                </span>
              )}
            </button>

            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, :slug, or author..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>
        </div>

        {/* Advanced Search Panel */}
        {advancedSearchOpen && (
          <section
            aria-label="Advanced page search"
            data-wiki-surface="inset"
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0b0f17] space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Advanced search by date, editor, or page ID</span>
              </div>
              {activeAdvancedCount > 0 && (
                <button
                  type="button"
                  onClick={clearAdvancedFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Clear advanced search</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Date Filter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="page-index-date-from"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Edit date</span>
                  </label>
                  <select
                    aria-label="Date filter mode"
                    value={dateMode}
                    onChange={(e) => {
                      const nextMode = e.target.value as DateFilterMode;
                      setDateMode(nextMode);
                      if (nextMode !== 'range') {
                        setDateTo('');
                      }
                    }}
                    className="px-2 py-0.5 text-[11px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-700"
                  >
                    <option value="exact">Exact day</option>
                    <option value="from">From</option>
                    <option value="to">Up to</option>
                    <option value="range">Range</option>
                  </select>
                </div>

                <div className={`grid gap-2 ${dateMode === 'range' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <input
                    id="page-index-date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    aria-label={dateMode === 'range' ? 'Start edit date' : 'Edit date'}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  />
                  {dateMode === 'range' && (
                    <input
                      id="page-index-date-to"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      aria-label="End edit date"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                    />
                  )}
                </div>
              </div>

              {/* Editor Filter */}
              <div className="space-y-1.5">
                <label
                  htmlFor="page-index-editor-filter"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Editor</span>
                </label>
                <div className="relative">
                  <input
                    id="page-index-editor-filter"
                    type="text"
                    list={editorDatalistId}
                    value={editorFilter}
                    onChange={(e) => setEditorFilter(e.target.value)}
                    placeholder="Editor name or UID..."
                    className="w-full px-3 py-1.5 pr-7 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  />
                  {editorFilter && (
                    <button
                      type="button"
                      onClick={() => setEditorFilter('')}
                      aria-label="Clear editor filter"
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <datalist id={editorDatalistId}>
                    {availableEditors.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Page ID (:slug) Filter */}
              <div className="space-y-1.5">
                <label
                  htmlFor="page-index-id-filter"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  <span className="font-mono text-slate-400">:</span>
                  <span>Page ID (:slug)</span>
                </label>
                <div className="relative flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] overflow-hidden focus-within:border-blue-700">
                  <span className="pl-2.5 pr-1 text-xs font-mono text-slate-400 select-none">
                    :
                  </span>
                  <input
                    id="page-index-id-filter"
                    type="text"
                    value={pageIdFilter}
                    onChange={(e) => setPageIdFilter(e.target.value)}
                    placeholder="start, markdown-guide..."
                    className="w-full py-1.5 pr-7 text-xs font-mono bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                  {pageIdFilter && (
                    <button
                      type="button"
                      onClick={() => setPageIdFilter('')}
                      aria-label="Clear page ID filter"
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Active Limit / Filter Summary Bar */}
        {(onlyLastFiveEdits || hasAnyFilter) && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tabular-nums">
                {onlyLastFiveEdits ? (
                  <>
                    Showing{' '}
                    <strong className="font-semibold text-slate-900 dark:text-slate-100">
                      {displayedPages.length}
                    </strong>{' '}
                    {displayedPages.length === 1 ? 'most recent edit' : 'most recent edits'}
                    {sortedAndFiltered.length > displayedPages.length && (
                      <> (of {sortedAndFiltered.length} matching pages)</>
                    )}
                  </>
                ) : (
                  <>
                    Showing{' '}
                    <strong className="font-semibold text-slate-900 dark:text-slate-100">
                      {displayedPages.length}
                    </strong>{' '}
                    of {pages.length} {pages.length === 1 ? 'page' : 'pages'}
                  </>
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onlyLastFiveEdits && sortedAndFiltered.length > 5 && (
                <button
                  type="button"
                  onClick={() => setOnlyLastFiveEdits(false)}
                  className="text-blue-700 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                >
                  Show all ({sortedAndFiltered.length})
                </button>
              )}
              {hasAnyFilter && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      {displayedPages.length === 0 ? (
        <div className="py-12 px-4 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#0f1623] space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No pages found for the selected filters.
          </p>
          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0f1623]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0b0f17] text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-4">Page</th>
                  <th className="py-2.5 px-4">Categories</th>
                  <th className="py-2.5 px-4">Last editor</th>
                  <th className="py-2.5 px-4 text-right">Version</th>
                  <th className="py-2.5 px-4 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {displayedPages.map((page) => {
                  const catLabel =
                    WIKI_CATEGORIES.find((c) => c.id === page.category)?.label ?? page.category;
                  const extraCats = extractArticleCategories(page.content).categories.filter(
                    (c) => c.slug !== page.category
                  );
                  return (
                    <tr
                      key={page.slug}
                      onClick={() => onSelectPage(page.slug)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-700 dark:text-blue-400 hover:underline">
                            {page.title}
                          </span>
                          {(page.isLocked || page.visibility === 'private') && (
                            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          :{page.slug}
                          {page.visibility === 'private' ? ' · Private' : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          {onOpenCategories ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenCategories(page.category);
                              }}
                              className="text-blue-700 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                            >
                              {catLabel}
                            </button>
                          ) : (
                            <span>{catLabel}</span>
                          )}
                          {extraCats.slice(0, 3).map((extra) => (
                            <React.Fragment key={extra.slug}>
                              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                                |
                              </span>
                              {onOpenCategories ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenCategories(extra.slug);
                                  }}
                                  className="text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                                >
                                  {extra.name}
                                </button>
                              ) : (
                                <span>{extra.name}</span>
                              )}
                            </React.Fragment>
                          ))}
                          {extraCats.length > 3 && (
                            <span className="text-[11px] text-slate-400">
                              +{extraCats.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {page.lastEditorName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        v{page.version}
                      </td>
                      <td
                        className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap"
                        title={formatAbsoluteTime(page.updatedAt)}
                      >
                        <div>{formatRelativeTime(page.updatedAt)}</div>
                        {page.updatedAt && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            {formatAbsoluteTime(page.updatedAt)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
