import React from 'react';
import type { User } from 'firebase/auth';
import {
  Clock,
  Compass,
  FileText,
  FolderTree,
  Layers,
  List,
  Lock,
  Plus,
  Search,
  Shield,
  Shuffle,
  Tag,
} from 'lucide-react';
import type { WikiPage } from '../types/wiki';
import {
  buildWikiCategoryDirectory,
  formatCategoryDisplayName,
  isCategoryDescriptionSlug,
} from '../lib/categoryUtils';
import { formatAbsoluteTime, formatRelativeTime } from '../lib/markdownUtils';
import { buildTagDirectory } from '../lib/tagUtils';
import { CategoryExplorer } from './CategoryExplorer';
import { TagManagementPanel } from './TagManagementPanel';

export type SpecialPagesTab = 'categories' | 'tags' | 'directory' | 'recent';

type MaintenanceSlice = 'locked' | 'private' | 'untagged' | 'category-docs';

interface SpecialPagesHubProps {
  siteTitle?: string;
  pages: WikiPage[];
  user: User | null;
  isAdmin: boolean;
  isBlocked: boolean;
  enableTemplates?: boolean;
  enablePageIndex?: boolean;
  enableRandomArticle?: boolean;
  enableEcosystem?: boolean;
  initialTab?: SpecialPagesTab;
  initialCategorySlug?: string | null;
  onTabChange?: (tab: SpecialPagesTab) => void;
  onSelectPage: (slug: string) => void;
  onOpenCategoryPage: (categorySlug?: string) => void;
  onOpenPageIndex: (mode: 'index' | 'recent') => void;
  onRandomPage?: () => void;
  onOpenEcosystem?: () => void;
  onOpenAdmin?: () => void;
  onOpenLegal?: (section: 'privacy' | 'terms') => void;
  onCreatePage: (presetSlug?: string) => void;
  onSignIn?: () => void;
  onNotify?: (notice: {
    tone: 'success' | 'info' | 'warning';
    title: string;
    description: string;
  }) => void;
}

export const SpecialPagesHub: React.FC<SpecialPagesHubProps> = ({
  siteTitle,
  pages,
  user,
  isAdmin,
  isBlocked,
  enableTemplates = true,
  enablePageIndex = true,
  enableRandomArticle = true,
  enableEcosystem = true,
  initialTab = 'categories',
  initialCategorySlug = null,
  onTabChange,
  onSelectPage,
  onOpenCategoryPage,
  onOpenPageIndex,
  onRandomPage,
  onOpenEcosystem,
  onOpenAdmin,
  onOpenLegal,
  onCreatePage,
  onSignIn,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = React.useState<SpecialPagesTab>(initialTab);
  const [maintenanceSlice, setMaintenanceSlice] = React.useState<MaintenanceSlice>('untagged');
  const [recentSearch, setRecentSearch] = React.useState('');

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleSelectTab = (next: SpecialPagesTab) => {
    setActiveTab(next);
    onTabChange?.(next);
  };

  const categoryCount = React.useMemo(
    () => buildWikiCategoryDirectory(pages, { enableTemplates }).length,
    [pages, enableTemplates]
  );

  const tagStats = React.useMemo(
    () => buildTagDirectory(pages, user, isAdmin, isBlocked),
    [pages, user, isAdmin, isBlocked]
  );

  const maintenanceGroups = React.useMemo(() => {
    const locked = pages.filter((p) => p.isLocked);
    const priv = pages.filter((p) => p.visibility === 'private');
    const untagged = pages.filter((p) => (p.tags ?? []).filter((t) => t.trim()).length === 0);
    const categoryDocs = pages.filter((p) => isCategoryDescriptionSlug(p.slug));
    return { locked, private: priv, untagged, 'category-docs': categoryDocs };
  }, [pages]);

  const activeSlicePages = React.useMemo(() => {
    const list = maintenanceGroups[maintenanceSlice];
    return [...list].sort((a, b) => a.title.localeCompare(b.title, 'en-US'));
  }, [maintenanceGroups, maintenanceSlice]);

  const recentPages = React.useMemo(() => {
    const q = recentSearch.trim().toLowerCase();
    const sorted = [...pages].sort((a, b) => {
      const ta = a.updatedAt?.toMillis() ?? 0;
      const tb = b.updatedAt?.toMillis() ?? 0;
      if (tb !== ta) return tb - ta;
      return a.title.localeCompare(b.title, 'en-US');
    });
    if (!q) return sorted.slice(0, 40);
    return sorted
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.lastEditorName.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [pages, recentSearch]);

  const tabItems: Array<{ id: SpecialPagesTab; label: string; count?: number }> = [
    { id: 'categories', label: 'Category Explorer', count: categoryCount },
    { id: 'tags', label: 'Tag Management', count: tagStats.tags.length },
    { id: 'directory', label: 'Special Directory' },
    { id: 'recent', label: 'Recent Activity', count: pages.length },
  ];

  return (
    <div className="space-y-6">
      {/* Hub Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            wiki / special-pages
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            Special Pages Hub
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Explore every category and its associated articles, bulk-manage tags, and inspect
            special maintenance lists across {siteTitle || 'this wiki'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {enableRandomArticle && onRandomPage && (
            <button
              type="button"
              disabled={pages.length === 0}
              onClick={onRandomPage}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Shuffle className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Random Article</span>
            </button>
          )}

          {user && !isBlocked && (
            <button
              type="button"
              onClick={() => onCreatePage('')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Page</span>
            </button>
          )}
        </div>
      </div>

      {/* Special Pages Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Special pages sections"
        className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg w-fit"
      >
        {tabItems.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activeTab === item.id}
            onClick={() => handleSelectTab(item.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === item.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {item.id === 'categories' && (
              <FolderTree className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
            )}
            {item.id === 'tags' && (
              <Tag className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
            )}
            {item.id === 'directory' && (
              <Compass className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
            )}
            {item.id === 'recent' && (
              <Clock className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
            )}
            <span>{item.label}</span>
            {typeof item.count === 'number' && (
              <span className="font-mono text-[11px] tabular-nums opacity-70">
                ({item.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Category Explorer */}
      {activeTab === 'categories' && (
        <CategoryExplorer
          pages={pages}
          enableTemplates={enableTemplates}
          initialCategorySlug={initialCategorySlug}
          isSignedIn={Boolean(user)}
          isBlocked={isBlocked}
          onSelectPage={onSelectPage}
          onOpenCategoryPage={(slug) => onOpenCategoryPage(slug)}
          onCreateCategoryDescription={(descSlug) => onCreatePage(descSlug)}
        />
      )}

      {/* Tab 2: Tag Management */}
      {activeTab === 'tags' && (
        <TagManagementPanel
          pages={pages}
          user={user}
          isAdmin={isAdmin}
          isBlocked={isBlocked}
          onSelectPage={onSelectPage}
          onSignIn={onSignIn}
          onNotify={onNotify}
        />
      )}

      {/* Tab 3: Special Directory & Maintenance Lists */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Quick Links Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => handleSelectTab('categories')}
              className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f17] hover:border-blue-700/60 dark:hover:border-blue-500/60 transition-colors cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <FolderTree className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>Category Explorer</span>
                </span>
                <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {categoryCount}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Browse every category and inspect all articles assigned to each folder or tag.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('tags')}
              className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f17] hover:border-blue-700/60 dark:hover:border-blue-500/60 transition-colors cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Tag className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>Tag Management</span>
                </span>
                <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {tagStats.tags.length}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Filter pages by tag combinations and run bulk tag renames, removals, or additions.
              </p>
            </button>

            {enablePageIndex && (
              <button
                type="button"
                onClick={() => onOpenPageIndex('index')}
                className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f17] hover:border-blue-700/60 dark:hover:border-blue-500/60 transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <List className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                    <span>Complete Page Index</span>
                  </span>
                  <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {pages.length}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Full alphabetical index with advanced date, editor, and ZIP export tools.
                </p>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenCategoryPage()}
              className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f17] hover:border-blue-700/60 dark:hover:border-blue-500/60 transition-colors cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <FolderTree className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>MediaWiki Categories Index</span>
                </span>
                <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {categoryCount}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Standalone table of categories and individual Category:Slug landing pages.
              </p>
            </button>

            {enableEcosystem && onOpenEcosystem && (
              <button
                type="button"
                onClick={onOpenEcosystem}
                className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f17] hover:border-blue-700/60 dark:hover:border-blue-500/60 transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <Layers className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                    <span>WazzimaGiygg Ecosystem</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Directory of official WazzimaGiygg platforms, services, and public dossiers.
                </p>
              </button>
            )}

            {isAdmin && onOpenAdmin ? (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f17] hover:border-blue-700/60 dark:hover:border-blue-500/60 transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <Shield className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                    <span>Administration Console</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Manage extensions, collaborator governance, revisions, and LGPD compliance.
                </p>
              </button>
            ) : (
              onOpenLegal && (
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f17] hover:border-blue-700/60 dark:hover:border-blue-500/60 transition-colors cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      <Shield className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                      <span>Privacy &amp; Usage Rules</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    LGPD data protection disclosures, terms of use, and governance policies.
                  </p>
                </button>
              )
            )}
          </div>

          {/* Maintenance Lists */}
          <section aria-label="Maintenance reports" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Maintenance Reports
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Inspect special subsets of wiki pages for housekeeping and curation.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
                {(
                  [
                    {
                      id: 'untagged',
                      label: 'Untagged',
                      count: maintenanceGroups.untagged.length,
                    },
                    {
                      id: 'locked',
                      label: 'Locked',
                      count: maintenanceGroups.locked.length,
                    },
                    {
                      id: 'private',
                      label: 'Private',
                      count: maintenanceGroups.private.length,
                    },
                    {
                      id: 'category-docs',
                      label: 'Category descriptions',
                      count: maintenanceGroups['category-docs'].length,
                    },
                  ] as Array<{ id: MaintenanceSlice; label: string; count: number }>
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMaintenanceSlice(item.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      maintenanceSlice === item.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {item.label}{' '}
                    <span className="font-mono text-[11px] tabular-nums opacity-70">
                      ({item.count})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {activeSlicePages.length === 0 ? (
              <div className="py-10 px-4 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17] text-xs text-slate-500 dark:text-slate-400">
                No pages match this maintenance report.
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f1623] text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <th className="py-2.5 px-4">Page</th>
                        <th className="py-2.5 px-4">Category</th>
                        <th className="py-2.5 px-4">Last Editor</th>
                        <th className="py-2.5 px-4 text-right">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                      {activeSlicePages.map((page) => (
                        <tr
                          key={page.slug}
                          className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                        >
                          <td className="py-2.5 px-4">
                            <button
                              type="button"
                              onClick={() => onSelectPage(page.slug)}
                              className="text-left font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              {page.title}
                            </button>
                            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <span>:{page.slug}</span>
                              <span>·</span>
                              <span className="tabular-nums">v{page.version}</span>
                              {(page.isLocked || page.visibility === 'private') && (
                                <Lock className="w-3 h-3 inline ml-0.5" />
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {formatCategoryDisplayName(page.category)}
                          </td>
                          <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                            {page.lastEditorName || page.authorName}
                          </td>
                          <td
                            className="py-2.5 px-4 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap"
                            title={formatAbsoluteTime(page.updatedAt)}
                          >
                            {formatRelativeTime(page.updatedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tab 4: Recent Activity */}
      {activeTab === 'recent' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={recentSearch}
                onChange={(e) => setRecentSearch(e.target.value)}
                placeholder="Filter recent pages by title, :slug, or editor..."
                aria-label="Filter recent pages"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>

            {enablePageIndex && (
              <button
                type="button"
                onClick={() => onOpenPageIndex('recent')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Open Full Recent Changes</span>
              </button>
            )}
          </div>

          {recentPages.length === 0 ? (
            <div className="py-12 px-4 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17] text-xs text-slate-500 dark:text-slate-400">
              No recently edited pages match your filter.
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f1623] text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <th className="py-2.5 px-4">Article</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Last Editor</th>
                      <th className="py-2.5 px-4 text-right">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                    {recentPages.map((page) => (
                      <tr
                        key={page.slug}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <td className="py-2.5 px-4">
                          <div className="flex items-start gap-2">
                            <FileText className="w-3.5 h-3.5 mt-1 text-slate-400 shrink-0" />
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => onSelectPage(page.slug)}
                                className="text-left font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                              >
                                {page.title}
                              </button>
                              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                :{page.slug} · v{page.version}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatCategoryDisplayName(page.category)}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                          {page.lastEditorName || page.authorName}
                        </td>
                        <td
                          className="py-2.5 px-4 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap"
                          title={formatAbsoluteTime(page.updatedAt)}
                        >
                          {formatRelativeTime(page.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
