import React from 'react';
import {
  ArrowLeft,
  Edit3,
  FilePlus2,
  FolderOpen,
  FolderTree,
  Search,
} from 'lucide-react';
import type { WikiPage } from '../types/wiki';
import {
  buildWikiCategoryDirectory,
  formatCategoryDisplayName,
  getCategoryDescriptionPageSlug,
} from '../lib/categoryUtils';
import { formatRelativeTime } from '../lib/markdownUtils';
import { ArticleViewer } from './ArticleViewer';
import { CategoryMembersSection } from './CategoryMembersSection';

interface CategoryViewProps {
  siteTitle?: string;
  selectedCategorySlug: string | null;
  pages: WikiPage[];
  existingSlugs: Set<string>;
  isSignedIn: boolean;
  isBlocked?: boolean;
  enableInfoboxes?: boolean;
  enableReferences?: boolean;
  enableTemplates?: boolean;
  referencesTitle?: string;
  externalLinkPrefix?: string;
  encodeExternalLinkTarget?: boolean;
  onSelectCategory: (slug: string | null) => void;
  onSelectPage: (slug: string) => void;
  onCreateCategoryDescription: (descPageSlug: string, categoryDisplayName: string) => void;
  onNewPage: () => void;
}

type DirectoryFilter = 'all' | 'with-pages' | 'builtin';
type DirectorySort = 'alpha' | 'count';

export const CategoryView: React.FC<CategoryViewProps> = ({
  siteTitle,
  selectedCategorySlug,
  pages,
  existingSlugs,
  isSignedIn,
  isBlocked = false,
  enableInfoboxes = true,
  enableReferences = true,
  enableTemplates = true,
  referencesTitle = 'References',
  externalLinkPrefix,
  encodeExternalLinkTarget = false,
  onSelectCategory,
  onSelectPage,
  onCreateCategoryDescription,
  onNewPage,
}) => {
  const [directorySearch, setDirectorySearch] = React.useState('');
  const [directoryFilter, setDirectoryFilter] = React.useState<DirectoryFilter>('all');
  const [directorySort, setDirectorySort] = React.useState<DirectorySort>('alpha');

  const directory = React.useMemo(
    () =>
      buildWikiCategoryDirectory(pages, {
        enableTemplates,
        ensureCategorySlugs: selectedCategorySlug ? [selectedCategorySlug] : undefined,
      }),
    [pages, enableTemplates, selectedCategorySlug]
  );

  const selectedCategory = React.useMemo(() => {
    if (!selectedCategorySlug) return null;
    return directory.find((c) => c.slug === selectedCategorySlug) ?? null;
  }, [directory, selectedCategorySlug]);

  const categoryPages = selectedCategory?.pages ?? [];

  const filteredDirectory = React.useMemo(() => {
    const q = directorySearch.trim().toLowerCase();
    const filtered = directory.filter((cat) => {
      if (directoryFilter === 'with-pages' && cat.totalCount === 0) return false;
      if (directoryFilter === 'builtin' && !cat.isBuiltinPrimary) return false;
      if (q) {
        return (
          cat.name.toLowerCase().includes(q) ||
          cat.slug.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (directorySort === 'count') {
      return [...filtered].sort((a, b) => {
        if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
        return a.name.localeCompare(b.name, 'en-US', { sensitivity: 'base' });
      });
    }
    return filtered;
  }, [directory, directorySearch, directoryFilter, directorySort]);

  // Single Category Page View (#/category/<slug>)
  if (selectedCategorySlug) {
    const displayName = selectedCategory?.name ?? formatCategoryDisplayName(selectedCategorySlug);
    const descriptionSlug = getCategoryDescriptionPageSlug(selectedCategorySlug);
    const descriptionPage = selectedCategory?.descriptionPage ?? null;
    const subcategories = selectedCategory?.subcategories ?? [];

    return (
      <div className="space-y-6">
        <div className="space-y-2 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="font-mono flex flex-wrap items-center gap-1">
              <span>wiki</span>
              <span>/</span>
              <button
                type="button"
                onClick={() => onSelectCategory(null)}
                className="text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
              >
                categories
              </button>
              <span>/</span>
              <span>:{selectedCategorySlug}</span>
            </div>
            <div className="font-mono tabular-nums">
              {categoryPages.length} {categoryPages.length === 1 ? 'page' : 'pages'}
              {subcategories.length > 0
                ? ` · ${subcategories.length} ${
                    subcategories.length === 1 ? 'subcategory' : 'subcategories'
                  }`
                : ''}
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
              Category:{displayName}
            </h1>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onSelectCategory(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Categories</span>
              </button>

              {descriptionPage ? (
                <button
                  type="button"
                  onClick={() => onSelectPage(descriptionPage.slug)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-blue-700 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Open description page</span>
                </button>
              ) : (
                isSignedIn &&
                !isBlocked && (
                  <button
                    type="button"
                    onClick={() => onCreateCategoryDescription(descriptionSlug, displayName)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors cursor-pointer"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>Add category description</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Category Description (editable wiki page category-<slug>, MediaWiki style) */}
        {descriptionPage ? (
          <div className="pb-5 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <ArticleViewer
              content={descriptionPage.content}
              existingSlugs={existingSlugs}
              wikiPages={pages}
              currentSlug={descriptionPage.slug}
              currentTitle={descriptionPage.title}
              onNavigateSlug={onSelectPage}
              onSelectCategory={(slug) => onSelectCategory(slug)}
              showToc={false}
              enableReferences={enableReferences}
              referencesTitle={referencesTitle}
              enableInfoboxes={enableInfoboxes}
              enableTemplates={enableTemplates}
              showReferencesFooter={false}
              externalLinkPrefix={externalLinkPrefix}
              encodeExternalLinkTarget={encodeExternalLinkTarget}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Pages below are listed alphabetically in <strong>Category:{displayName}</strong> via
            their page tags, primary folder, <code className="font-mono">[[Category:{displayName}]]</code>{' '}
            tags, or category links inside articles.
          </p>
        )}

        <CategoryMembersSection
          displayName={displayName}
          categorySlug={selectedCategorySlug}
          pages={categoryPages}
          subcategories={subcategories}
          onSelectPage={onSelectPage}
          onSelectCategory={(slug) => onSelectCategory(slug)}
        />
      </div>
    );
  }

  // All Categories Directory View (#/categories)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            wiki / categories
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            Categories
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Browse every Wikipedia-style category and folder index across {siteTitle || 'this wiki'}.
            Use <code className="font-mono text-xs">[[Category:Name]]</code> in any article to join
            or create a category.
          </p>
        </div>

        {isSignedIn && !isBlocked && (
          <button
            type="button"
            onClick={onNewPage}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>New Page</span>
          </button>
        )}
      </div>

      {/* Controls: Search, Filter & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={directorySearch}
            onChange={(e) => setDirectorySearch(e.target.value)}
            placeholder="Search categories by name..."
            aria-label="Search categories"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={directoryFilter}
            onChange={(e) => setDirectoryFilter(e.target.value as DirectoryFilter)}
            aria-label="Filter categories"
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-700"
          >
            <option value="all">All categories ({directory.length})</option>
            <option value="with-pages">
              Non-empty ({directory.filter((c) => c.totalCount > 0).length})
            </option>
            <option value="builtin">
              Primary folders ({directory.filter((c) => c.isBuiltinPrimary).length})
            </option>
          </select>

          <select
            value={directorySort}
            onChange={(e) => setDirectorySort(e.target.value as DirectorySort)}
            aria-label="Sort categories"
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-700"
          >
            <option value="alpha">Sort: A–Z</option>
            <option value="count">Sort: Most pages</option>
          </select>
        </div>
      </div>

      {filteredDirectory.length === 0 ? (
        <div className="py-12 px-4 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-[#0b0f17]/50 text-sm text-slate-600 dark:text-slate-400">
          No categories match your current filter.
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0f1623]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0b0f17] text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4 text-right">Pages</th>
                  <th className="py-2.5 px-4 text-right">Subcategories</th>
                  <th className="py-2.5 px-4 text-right">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredDirectory.map((cat) => (
                  <tr
                    key={cat.slug}
                    onClick={() => onSelectCategory(cat.slug)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-400 hover:underline">
                        <FolderOpen className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        <span>{cat.name}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Category:{cat.name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {cat.isBuiltinPrimary ? 'Primary folder' : 'Article tag'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-700 dark:text-slate-200">
                      {cat.pages.length}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {cat.subcategories.length}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {cat.descriptionPage ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          Updated {formatRelativeTime(cat.descriptionPage.updatedAt)}
                        </span>
                      ) : (
                        <span>Auto-indexed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
