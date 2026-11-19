import React from 'react';
import { Lock, Plus, Search } from 'lucide-react';
import { WIKI_CATEGORIES, type WikiPage } from '../types/wiki';
import { formatRelativeTime } from '../lib/markdownUtils';

interface PageIndexViewProps {
  mode: 'index' | 'recent';
  pages: WikiPage[];
  isSignedIn: boolean;
  onSelectPage: (slug: string) => void;
  onNewPage: () => void;
}

export const PageIndexView: React.FC<PageIndexViewProps> = ({
  mode,
  pages,
  isSignedIn,
  onSelectPage,
  onNewPage,
}) => {
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');

  const sortedAndFiltered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = pages.filter((p) => {
      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchesQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.lastEditorName.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });

    if (mode === 'recent') {
      return [...filtered].sort((a, b) => {
        const ta = a.updatedAt?.toMillis() ?? 0;
        const tb = b.updatedAt?.toMillis() ?? 0;
        return tb - ta;
      });
    }

    return [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'en-US'));
  }, [pages, search, categoryFilter, mode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            wiki / {mode === 'recent' ? 'recent-changes' : 'page-index'}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {mode === 'recent' ? 'Recent Changes' : 'Page Index'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {mode === 'recent'
              ? 'Latest collaborative edits and page creations stored in Firestore.'
              : 'Complete catalog of wiki pages available in this workspace.'}
          </p>
        </div>

        {isSignedIn && (
          <button
            type="button"
            onClick={onNewPage}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Page</span>
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
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
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === cat.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
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

      {/* Data Table */}
      {sortedAndFiltered.length === 0 ? (
        <div className="py-12 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#0f1623]">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No pages found for the selected filters.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0f1623]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0b0f17] text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-4">Page</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Last editor</th>
                  <th className="py-2.5 px-4 text-right">Version</th>
                  <th className="py-2.5 px-4 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {sortedAndFiltered.map((page) => {
                  const catLabel =
                    WIKI_CATEGORIES.find((c) => c.id === page.category)?.label ?? page.category;
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
                        {catLabel}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {page.lastEditorName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        v{page.version}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatRelativeTime(page.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
