import React from 'react';
import {
  Edit3,
  ExternalLink,
  FilePlus2,
  FileText,
  FolderOpen,
  FolderTree,
  Lock,
  Search,
  X,
} from 'lucide-react';
import type { WikiPage } from '../types/wiki';
import {
  buildWikiCategoryDirectory,
  formatCategoryDisplayName,
  getCategoryDescriptionPageSlug,
  type WikiCategorySummary,
} from '../lib/categoryUtils';
import { formatAbsoluteTime, formatRelativeTime } from '../lib/markdownUtils';

type CategorySortMode = 'alpha' | 'count';
type CategoryFilterMode = 'all' | 'non-empty';
type ArticleSortMode = 'alpha' | 'recent';

export interface CategoryExplorerProps {
  pages: WikiPage[];
  enableTemplates?: boolean;
  initialCategorySlug?: string | null;
  isSignedIn?: boolean;
  isBlocked?: boolean;
  onSelectPage: (slug: string) => void;
  onOpenCategoryPage?: (categorySlug: string) => void;
  onCreateCategoryDescription?: (descPageSlug: string, categoryDisplayName: string) => void;
}

export const CategoryExplorer: React.FC<CategoryExplorerProps> = ({
  pages,
  enableTemplates = true,
  initialCategorySlug = null,
  isSignedIn = false,
  isBlocked = false,
  onSelectPage,
  onOpenCategoryPage,
  onCreateCategoryDescription,
}) => {
  const [categorySearch, setCategorySearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<CategoryFilterMode>('all');
  const [categorySort, setCategorySort] = React.useState<CategorySortMode>('alpha');

  const [articleSearch, setArticleSearch] = React.useState('');
  const [articleSort, setArticleSort] = React.useState<ArticleSortMode>('alpha');

  const directory = React.useMemo(
    () => buildWikiCategoryDirectory(pages, { enableTemplates }),
    [pages, enableTemplates]
  );

  const [selectedSlug, setSelectedSlug] = React.useState<string | null>(() => {
    if (initialCategorySlug) return initialCategorySlug;
    return null;
  });

  // Sync if caller passes an explicit initialCategorySlug
  React.useEffect(() => {
    if (initialCategorySlug) {
      setSelectedSlug(initialCategorySlug);
    }
  }, [initialCategorySlug]);

  // Ensure selectedSlug points to an available category (preferring non-empty on first mount)
  React.useEffect(() => {
    if (directory.length === 0) {
      if (selectedSlug !== null) setSelectedSlug(null);
      return;
    }
    if (selectedSlug && directory.some((cat) => cat.slug === selectedSlug)) {
      return;
    }
    const firstActive = directory.find((cat) => cat.pages.length > 0) ?? directory[0];
    setSelectedSlug(firstActive?.slug ?? null);
  }, [directory, selectedSlug]);

  const activeCategoriesCount = React.useMemo(
    () => directory.filter((cat) => cat.pages.length > 0).length,
    [directory]
  );

  const categorizedArticlesCount = React.useMemo(() => {
    const slugs = new Set<string>();
    for (const cat of directory) {
      for (const item of cat.pages) {
        slugs.add(item.page.slug);
      }
    }
    return slugs.size;
  }, [directory]);

  const filteredCategories = React.useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    const list = directory.filter((cat) => {
      if (categoryFilter === 'non-empty' && cat.pages.length === 0) return false;
      if (!q) return true;
      return cat.name.toLowerCase().includes(q) || cat.slug.toLowerCase().includes(q);
    });

    if (categorySort === 'count') {
      return [...list].sort((a, b) => {
        if (b.pages.length !== a.pages.length) return b.pages.length - a.pages.length;
        return a.name.localeCompare(b.name, 'en-US', { sensitivity: 'base' });
      });
    }
    return list;
  }, [directory, categorySearch, categoryFilter, categorySort]);

  const selectedCategory: WikiCategorySummary | null = React.useMemo(() => {
    if (!selectedSlug) return null;
    return directory.find((cat) => cat.slug === selectedSlug) ?? null;
  }, [directory, selectedSlug]);

  const filteredArticles = React.useMemo(() => {
    if (!selectedCategory) return [];
    const q = articleSearch.trim().toLowerCase();
    const base = q
      ? selectedCategory.pages.filter(
          (item) =>
            item.page.title.toLowerCase().includes(q) ||
            item.page.slug.toLowerCase().includes(q) ||
            item.page.authorName.toLowerCase().includes(q) ||
            item.sortKey.toLowerCase().includes(q)
        )
      : selectedCategory.pages;

    if (articleSort === 'recent') {
      return [...base].sort((a, b) => {
        const ta = a.page.updatedAt?.toMillis() ?? 0;
        const tb = b.page.updatedAt?.toMillis() ?? 0;
        if (tb !== ta) return tb - ta;
        return a.page.title.localeCompare(b.page.title, 'en-US', { sensitivity: 'base' });
      });
    }
    return base;
  }, [selectedCategory, articleSearch, articleSort]);

  const handleSelectCategory = (slug: string) => {
    setSelectedSlug(slug);
    setArticleSearch('');
  };

  return (
    <div className="space-y-6">
      {/* 4-Column Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 dark:border-slate-800 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 bg-slate-50/60 dark:bg-[#0b0f17]">
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Categories</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {directory.length}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Active Categories</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {activeCategoriesCount}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Categorized Articles</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {categorizedArticlesCount}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {selectedCategory ? `In ${selectedCategory.name}` : 'Selected Category'}
          </div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {selectedCategory ? selectedCategory.pages.length : 0}
          </div>
        </div>
      </div>

      {/* Master-Detail Workspace: Category Directory + Associated Articles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Existing Categories */}
        <section
          aria-label="All wiki categories"
          className="lg:col-span-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17] overflow-hidden"
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <FolderTree className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                <span>Categories</span>
              </h2>
              <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-md">
                <button
                  type="button"
                  onClick={() => setCategorySort('alpha')}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    categorySort === 'alpha'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  A–Z
                </button>
                <button
                  type="button"
                  onClick={() => setCategorySort('count')}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    categorySort === 'count'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Most used
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Find categories..."
                aria-label="Filter categories"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-lg">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                All ({directory.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('non-empty')}
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'non-empty'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                With articles ({activeCategoriesCount})
              </button>
            </div>
          </div>

          <div
            role="listbox"
            aria-label="Category list"
            className="max-h-[480px] overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-800/80"
          >
            {filteredCategories.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <p>No categories match your current filter.</p>
                {(categorySearch.trim() || categoryFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategorySearch('');
                      setCategoryFilter('all');
                    }}
                    className="text-blue-700 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                  >
                    Reset filter
                  </button>
                )}
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isSelected = selectedCategory?.slug === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectCategory(cat.slug)}
                    className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/40'
                        : 'hover:bg-slate-100/80 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className={`flex items-center gap-1.5 text-xs font-medium truncate ${
                          isSelected
                            ? 'text-blue-800 dark:text-blue-200 font-semibold'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        <FolderOpen
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected
                              ? 'text-blue-700 dark:text-blue-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate pl-5 mt-0.5">
                        {cat.isBuiltinPrimary ? 'Primary folder' : 'Wiki category'}
                        {cat.subcategories.length > 0 && (
                          <span className="tabular-nums">
                            {' '}
                            · {cat.subcategories.length}{' '}
                            {cat.subcategories.length === 1 ? 'subcategory' : 'subcategories'}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`font-mono text-xs tabular-nums shrink-0 ${
                        isSelected
                          ? 'text-blue-800 dark:text-blue-200 font-semibold'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {cat.pages.length}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Right Pane: Associated Articles */}
        <section
          aria-label="Articles in selected category"
          className="lg:col-span-8 space-y-4"
        >
          {!selectedCategory ? (
            <div className="py-14 px-6 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17] space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Select a category to inspect its associated articles
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose any category from the directory on the left to list every page assigned to it.
              </p>
            </div>
          ) : (
            <>
              {/* Category Detail Header */}
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/60 dark:bg-[#0b0f17] space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Category:{selectedCategory.name} ·{' '}
                      {selectedCategory.isBuiltinPrimary ? 'Primary folder' : 'Article tag'}
                    </div>
                    <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                      {selectedCategory.name}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
                      {selectedCategory.pages.length}{' '}
                      {selectedCategory.pages.length === 1 ? 'article' : 'articles'}
                      {selectedCategory.subcategories.length > 0 &&
                        ` · ${selectedCategory.subcategories.length} ${
                          selectedCategory.subcategories.length === 1
                            ? 'subcategory'
                            : 'subcategories'
                        }`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {onOpenCategoryPage && (
                      <button
                        type="button"
                        onClick={() => onOpenCategoryPage(selectedCategory.slug)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                        <span>Open Category Page</span>
                      </button>
                    )}

                    {selectedCategory.descriptionPage ? (
                      <button
                        type="button"
                        onClick={() => onSelectPage(selectedCategory.descriptionPage!.slug)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-blue-700 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Description Page</span>
                      </button>
                    ) : (
                      isSignedIn &&
                      !isBlocked &&
                      onCreateCategoryDescription && (
                        <button
                          type="button"
                          onClick={() =>
                            onCreateCategoryDescription(
                              getCategoryDescriptionPageSlug(selectedCategory.slug),
                              selectedCategory.name
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <FilePlus2 className="w-3.5 h-3.5" />
                          <span>Add Description</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Subcategories strip if present */}
                {selectedCategory.subcategories.length > 0 && (
                  <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Subcategories:
                    </span>
                    {selectedCategory.subcategories.map((sub, idx) => (
                      <React.Fragment key={sub.slug}>
                        {idx > 0 && (
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                            ·
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSelectCategory(sub.slug)}
                          className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                        >
                          <span>{sub.name}</span>
                          <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                            ({sub.pageCount})
                          </span>
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {/* Article Filter & Sort Bar */}
              {selectedCategory.pages.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={articleSearch}
                      onChange={(e) => setArticleSearch(e.target.value)}
                      placeholder={`Filter articles in ${selectedCategory.name}...`}
                      aria-label={`Filter articles in ${selectedCategory.name}`}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                    />
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setArticleSort('alpha')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        articleSort === 'alpha'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      A–Z
                    </button>
                    <button
                      type="button"
                      onClick={() => setArticleSort('recent')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        articleSort === 'recent'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      Recently updated
                    </button>
                  </div>
                </div>
              )}

              {/* Associated Articles List */}
              {selectedCategory.pages.length === 0 ? (
                <div className="py-12 px-5 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#0b0f17] space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No articles are assigned to &ldquo;{selectedCategory.name}&rdquo; yet.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add{' '}
                    <code className="font-mono">
                      [[Category:{selectedCategory.name}]]
                    </code>{' '}
                    to any article or assign it as a primary folder to list it here.
                  </p>
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="py-10 px-5 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#0b0f17] space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No articles match &ldquo;{articleSearch.trim()}&rdquo; in{' '}
                    {selectedCategory.name}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setArticleSearch('')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear filter</span>
                  </button>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f1623] text-xs font-semibold text-slate-600 dark:text-slate-400">
                          <th className="py-2.5 px-4">Article</th>
                          <th className="py-2.5 px-4">Primary Folder</th>
                          <th className="py-2.5 px-4">Last Editor</th>
                          <th className="py-2.5 px-4 text-right">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                        {filteredArticles.map(({ page, sortKey }) => (
                          <tr
                            key={page.slug}
                            className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                          >
                            <td className="py-2.5 px-4 align-top">
                              <div className="flex items-start gap-2">
                                <FileText className="w-3.5 h-3.5 mt-1 text-slate-400 shrink-0" />
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => onSelectPage(page.slug)}
                                    className="text-left font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer break-words"
                                  >
                                    {page.title}
                                  </button>
                                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                                    <span>:{page.slug}</span>
                                    <span>·</span>
                                    <span className="tabular-nums">v{page.version}</span>
                                    {(page.isLocked || page.visibility === 'private') && (
                                      <>
                                        <span>·</span>
                                        <span className="inline-flex items-center gap-1">
                                          <Lock className="w-3 h-3" />
                                          <span>
                                            {page.visibility === 'private' ? 'Private' : 'Locked'}
                                          </span>
                                        </span>
                                      </>
                                    )}
                                    {sortKey !== page.title && (
                                      <>
                                        <span>·</span>
                                        <span>Sorted as {sortKey}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap align-top">
                              {formatCategoryDisplayName(page.category)}
                            </td>
                            <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300 align-top">
                              {page.lastEditorName || page.authorName}
                            </td>
                            <td
                              className="py-2.5 px-4 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap align-top"
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
            </>
          )}
        </section>
      </div>
    </div>
  );
};
