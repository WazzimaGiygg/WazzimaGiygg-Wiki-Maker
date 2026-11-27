import React from 'react';
import { FileText, FolderOpen, FolderTree, Lock, Search } from 'lucide-react';
import {
  groupPagesAlphabetically,
  type WikiCategoryPageItem,
  type WikiCategorySubcategoryItem,
} from '../lib/categoryUtils';

interface CategoryMembersSectionProps {
  displayName: string;
  categorySlug: string;
  pages: WikiCategoryPageItem[];
  subcategories: WikiCategorySubcategoryItem[];
  onSelectPage: (slug: string) => void;
  onSelectCategory: (slug: string) => void;
  onOpenAllCategories?: () => void;
}

export const CategoryMembersSection: React.FC<CategoryMembersSectionProps> = ({
  displayName,
  categorySlug,
  pages,
  subcategories,
  onSelectPage,
  onSelectCategory,
  onOpenAllCategories,
}) => {
  const [pageSearch, setPageSearch] = React.useState('');

  React.useEffect(() => {
    setPageSearch('');
  }, [categorySlug]);

  const filteredPages = React.useMemo(() => {
    const q = pageSearch.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (item) =>
        item.page.title.toLowerCase().includes(q) ||
        item.page.slug.toLowerCase().includes(q) ||
        item.sortKey.toLowerCase().includes(q)
    );
  }, [pages, pageSearch]);

  const groupedByLetter = React.useMemo(
    () => groupPagesAlphabetically(filteredPages),
    [filteredPages]
  );

  return (
    <div className="space-y-6">
      {/* Subcategories Section */}
      {subcategories.length > 0 && (
        <section
          aria-label="Subcategories"
          className="space-y-3 pb-4 border-b border-slate-200 dark:border-slate-800"
        >
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            Subcategories
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This category has the following {subcategories.length}{' '}
            {subcategories.length === 1 ? 'subcategory' : 'subcategories'}.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {subcategories.map((sub) => (
              <li key={sub.slug}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(sub.slug)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17] hover:border-blue-700/60 dark:hover:border-blue-500/60 transition-colors cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2 min-w-0 font-medium text-blue-700 dark:text-blue-400">
                    <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{sub.name}</span>
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                    ({sub.pageCount})
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Pages in Category (Automatic Alphabetical A–Z Index) */}
      <section aria-label={`Pages in category ${displayName}`} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
              Pages in category &ldquo;{displayName}&rdquo;
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {pages.length === 0
                ? 'No articles are currently linked or tagged to this category.'
                : `The following ${pages.length} ${
                    pages.length === 1 ? 'page is' : 'pages are'
                  } listed alphabetically in this category (via page tags, [[Category:${displayName}]], or category links).`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {pages.length > 6 && (
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={pageSearch}
                  onChange={(e) => setPageSearch(e.target.value)}
                  placeholder="Filter pages in category..."
                  aria-label="Filter pages in this category"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
            )}

            {onOpenAllCategories && (
              <button
                type="button"
                onClick={onOpenAllCategories}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FolderTree className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>All Categories</span>
              </button>
            )}
          </div>
        </div>

        {groupedByLetter.length === 0 ? (
          <div className="py-10 px-4 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-[#0b0f17]/60 space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {pageSearch.trim()
                ? `No pages match "${pageSearch.trim()}" inside Category:${displayName}.`
                : `No pages belong to Category:${displayName} yet.`}
            </p>
            {!pageSearch.trim() && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tag any page with <code className="font-mono">#{categorySlug}</code>, add{' '}
                <code className="font-mono">[[Category:{displayName}]]</code>, or insert{' '}
                <code className="font-mono">[[:Category:{displayName}]]</code> inside an article to
                cite it here automatically.
              </p>
            )}
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-7 pt-1">
            {groupedByLetter.map((group) => (
              <div key={group.letter} className="break-inside-avoid mb-6 space-y-2">
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 pb-1 border-b border-slate-200 dark:border-slate-800">
                  {group.letter}
                </h3>
                <ul className="space-y-1.5 text-sm">
                  {group.items.map(({ page, sortKey }) => (
                    <li key={page.slug} className="flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 mt-1 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onSelectPage(page.slug)}
                          title={
                            sortKey !== page.title
                              ? `Sorted under "${sortKey}" · :${page.slug}`
                              : `:${page.slug}`
                          }
                          className="text-left text-blue-700 dark:text-blue-400 hover:underline font-medium cursor-pointer break-words"
                        >
                          {page.title}
                        </button>
                        {(page.isLocked || page.visibility === 'private') && (
                          <Lock
                            className="w-3 h-3 inline ml-1.5 text-slate-400 align-baseline"
                            aria-label={
                              page.visibility === 'private' ? 'Private page' : 'Editing locked'
                            }
                          />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
