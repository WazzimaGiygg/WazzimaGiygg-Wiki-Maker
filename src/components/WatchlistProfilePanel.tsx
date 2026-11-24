import React from 'react';
import { Bookmark, BookmarkX, FileText, Lock } from 'lucide-react';
import { formatRelativeTime } from '../lib/markdownUtils';
import { WIKI_CATEGORIES, type WatchlistItem, type WikiPage } from '../types/wiki';

interface WatchlistProfilePanelProps {
  authorName: string;
  watchlistItems: WatchlistItem[];
  allPages: WikiPage[];
  isBlocked: boolean;
  onSelectPage: (slug: string) => void;
  onRemoveFromWatchlist: (slug: string) => Promise<void>;
}

export const WatchlistProfilePanel: React.FC<WatchlistProfilePanelProps> = ({
  authorName,
  watchlistItems,
  allPages,
  isBlocked,
  onSelectPage,
  onRemoveFromWatchlist,
}) => {
  const [removingSlug, setRemovingSlug] = React.useState<string | null>(null);

  const pageBySlug = React.useMemo(() => {
    const map = new Map<string, WikiPage>();
    for (const p of allPages) {
      map.set(p.slug, p);
    }
    return map;
  }, [allPages]);

  const handleUnwatch = async (slug: string) => {
    if (isBlocked || removingSlug === slug) return;
    setRemovingSlug(slug);
    try {
      await onRemoveFromWatchlist(slug);
    } finally {
      setRemovingSlug((prev) => (prev === slug ? null : prev));
    }
  };

  return (
    <section
      aria-label="Personal watchlist"
      data-wiki-chrome="personal-watchlist"
      className="pt-6 mt-8 border-t border-slate-200 dark:border-slate-800 space-y-4 print:hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            Watchlist
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            ({watchlistItems.length})
          </span>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Articles bookmarked in {authorName}&apos;s profile
        </span>
      </div>

      {watchlistItems.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 py-3">
          No articles watched yet. Click Watch in any article&apos;s header to bookmark it to your
          profile and access it from the sidebar Watchlist view.
        </p>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17]">
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {watchlistItems.map((item) => {
              const livePage = pageBySlug.get(item.pageSlug);
              const title = livePage?.title ?? item.pageTitle;
              const categoryId = livePage?.category ?? item.pageCategory;
              const categoryLabel =
                WIKI_CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId;
              const visibility = livePage?.visibility ?? item.pageVisibility;
              const isLocked = livePage?.isLocked ?? false;
              const isRemoved = !livePage;
              const busy = removingSlug === item.pageSlug;

              return (
                <li
                  key={item.pageSlug}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <button
                        type="button"
                        onClick={() => onSelectPage(item.pageSlug)}
                        className="text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline truncate text-left cursor-pointer"
                      >
                        {title}
                      </button>
                      {(isLocked || visibility === 'private') && (
                        <Lock
                          className="w-3.5 h-3.5 text-slate-400 shrink-0"
                          aria-label={visibility === 'private' ? 'Private page' : 'Editing locked'}
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono">:{item.pageSlug}</span>
                      <span aria-hidden="true">·</span>
                      <span>{categoryLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {isRemoved
                          ? 'Removed or unavailable'
                          : livePage?.updatedAt
                          ? `Updated ${formatRelativeTime(livePage.updatedAt)}`
                          : `Watched ${formatRelativeTime(item.createdAt)}`}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isBlocked || busy}
                    onClick={() => void handleUnwatch(item.pageSlug)}
                    title={`Remove "${title}" from Watchlist`}
                    aria-label={`Remove ${title} from Watchlist`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50/70 dark:hover:bg-red-950/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <BookmarkX className="w-3.5 h-3.5 shrink-0" />
                    <span>{busy ? 'Removing...' : 'Unwatch'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};
