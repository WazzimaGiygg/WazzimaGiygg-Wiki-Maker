import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileEdit,
  History,
  Layers,
  MessageSquare,
  Search,
  X,
} from 'lucide-react';
import type { UserEdit } from '../types/wiki';
import { formatAbsoluteTime, formatRelativeTime } from '../lib/markdownUtils';

interface UserEditsPanelProps {
  authorName: string;
  edits: UserEdit[];
  loading: boolean;
  discussionPageSlug: string | null;
  onSelectPage: (slug: string) => void;
}

interface GroupedPageContribution {
  pageSlug: string;
  pageTitle: string;
  pageVisibility: UserEdit['pageVisibility'];
  latestEdit: UserEdit;
  edits: UserEdit[];
}

const INITIAL_VISIBLE_COUNT = 5;
const LOAD_MORE_STEP = 10;

export const UserEditsPanel: React.FC<UserEditsPanelProps> = ({
  authorName,
  edits,
  loading,
  discussionPageSlug,
  onSelectPage,
}) => {
  const [viewMode, setViewMode] = React.useState<'grouped' | 'timeline'>('grouped');
  const [visibleCount, setVisibleCount] = React.useState(INITIAL_VISIBLE_COUNT);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedPageSlug, setExpandedPageSlug] = React.useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  React.useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    setSearchQuery('');
    setExpandedPageSlug(null);
    setIsCollapsed(false);
  }, [authorName, discussionPageSlug]);

  const groupedContributions = React.useMemo<GroupedPageContribution[]>(() => {
    const bySlug = new Map<string, GroupedPageContribution>();
    for (const edit of edits) {
      const existing = bySlug.get(edit.pageSlug);
      if (!existing) {
        bySlug.set(edit.pageSlug, {
          pageSlug: edit.pageSlug,
          pageTitle: edit.pageTitle,
          pageVisibility: edit.pageVisibility,
          latestEdit: edit,
          edits: [edit],
        });
      } else {
        existing.edits.push(edit);
      }
    }
    return Array.from(bySlug.values());
  }, [edits]);

  const filteredGroups = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groupedContributions;
    return groupedContributions.filter(
      (group) =>
        group.pageTitle.toLowerCase().includes(q) ||
        group.pageSlug.toLowerCase().includes(q) ||
        group.edits.some((ed) => ed.summary.toLowerCase().includes(q))
    );
  }, [groupedContributions, searchQuery]);

  const filteredTimeline = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return edits;
    return edits.filter(
      (edit) =>
        edit.pageTitle.toLowerCase().includes(q) ||
        edit.pageSlug.toLowerCase().includes(q) ||
        edit.summary.toLowerCase().includes(q)
    );
  }, [edits, searchQuery]);

  const totalFilteredCount =
    viewMode === 'grouped' ? filteredGroups.length : filteredTimeline.length;
  const visibleGroups = React.useMemo(
    () => filteredGroups.slice(0, visibleCount),
    [filteredGroups, visibleCount]
  );
  const visibleTimeline = React.useMemo(
    () => filteredTimeline.slice(0, visibleCount),
    [filteredTimeline, visibleCount]
  );
  const shownCount = viewMode === 'grouped' ? visibleGroups.length : visibleTimeline.length;
  const remainingCount = Math.max(0, totalFilteredCount - shownCount);

  return (
    <section
      aria-label={`Contributions by ${authorName}`}
      className="pt-6 mt-8 border-t border-slate-200 dark:border-slate-800 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            Contribuições de {authorName}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            {edits.length === 0
              ? `Nenhuma edição pública registrada para ${authorName}`
              : `${edits.length} ${edits.length === 1 ? 'edição' : 'edições'} em ${
                  groupedContributions.length
                } ${groupedContributions.length === 1 ? 'página' : 'páginas'} · última ${formatRelativeTime(
                  edits[0]?.createdAt
                )}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {edits.length > 0 && (
            <button
              type="button"
              aria-expanded={!isCollapsed}
              onClick={() => setIsCollapsed((prev) => !prev)}
              data-wiki-surface="inset"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Expandir</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Recolher</span>
                </>
              )}
            </button>
          )}

          {discussionPageSlug && (
            <button
              type="button"
              onClick={() => onSelectPage(discussionPageSlug)}
              data-wiki-surface="inset"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" data-wiki-surface="link" />
              <span>Open Discussion Page</span>
            </button>
          )}
        </div>
      </div>

      {isCollapsed ? null : loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="h-11 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      ) : edits.length === 0 ? (
        <div
          data-wiki-surface="inset"
          className="py-8 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-[#0b0f17]"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No public edits recorded yet for {authorName}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Compact Mode Switcher & Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div
              role="tablist"
              aria-label="Modo de visualização das contribuições"
              className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80"
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'grouped'}
                onClick={() => {
                  setViewMode('grouped');
                  setVisibleCount(INITIAL_VISIBLE_COUNT);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Por página ({groupedContributions.length})</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'timeline'}
                onClick={() => {
                  setViewMode('timeline');
                  setVisibleCount(INITIAL_VISIBLE_COUNT);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <History className="w-3.5 h-3.5 shrink-0" />
                <span>Cronológico ({edits.length})</span>
              </button>
            </div>

            {edits.length > INITIAL_VISIBLE_COUNT && (
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(INITIAL_VISIBLE_COUNT);
                  }}
                  placeholder="Filtrar por página, :slug ou resumo..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Limpar filtro de contribuições"
                    className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {totalFilteredCount === 0 ? (
            <div className="py-8 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-[#0b0f17] space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nenhuma contribuição encontrada para &ldquo;{searchQuery.trim()}&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Limpar filtro
              </button>
            </div>
          ) : viewMode === 'grouped' ? (
            <div
              data-wiki-surface="panel"
              className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17]"
            >
              <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {visibleGroups.map((group) => {
                  const isExpanded = expandedPageSlug === group.pageSlug;
                  return (
                    <li key={group.pageSlug} className="transition-colors">
                      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-900/50">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileEdit className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <button
                              type="button"
                              onClick={() => onSelectPage(group.pageSlug)}
                              className="text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline truncate text-left cursor-pointer"
                            >
                              {group.pageTitle}
                            </button>
                            <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                              v{group.latestEdit.version}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 pl-5.5">
                            <span className="font-mono">
                              :{group.pageSlug}
                              {group.pageVisibility === 'private' ? ' · Private' : ''}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-md">
                              {group.latestEdit.summary || 'Page update'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span
                            className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap"
                            title={formatAbsoluteTime(group.latestEdit.createdAt)}
                          >
                            {formatRelativeTime(group.latestEdit.createdAt)}
                          </span>

                          {group.edits.length > 1 ? (
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              onClick={() =>
                                setExpandedPageSlug((prev) =>
                                  prev === group.pageSlug ? null : group.pageSlug
                                )
                              }
                              data-wiki-surface="inset"
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <span className="tabular-nums">{group.edits.length} edições</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 px-1.5">
                              1 edição
                            </span>
                          )}
                        </div>
                      </div>

                      {isExpanded && group.edits.length > 1 && (
                        <div className="bg-slate-50/70 dark:bg-[#0f1623]/70 border-t border-slate-200/80 dark:border-slate-800/80 px-4 py-2.5 pl-9 space-y-1.5">
                          {group.edits.slice(0, 8).map((ed) => (
                            <div
                              key={ed.id}
                              onClick={() => onSelectPage(ed.pageSlug)}
                              className="flex flex-wrap items-center justify-between gap-2 text-xs py-1 px-2 rounded hover:bg-white dark:hover:bg-slate-900/70 cursor-pointer"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                                  v{ed.version}
                                </span>
                                <span className="text-slate-700 dark:text-slate-300 truncate">
                                  {ed.summary || 'Page update'}
                                </span>
                              </div>
                              <span
                                className="font-mono text-[11px] tabular-nums text-slate-400 dark:text-slate-500 shrink-0"
                                title={formatAbsoluteTime(ed.createdAt)}
                              >
                                {formatRelativeTime(ed.createdAt)}
                              </span>
                            </div>
                          ))}
                          {group.edits.length > 8 && (
                            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <span>
                                Exibindo as 8 revisões mais recentes desta página (de {group.edits.length}).
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setViewMode('timeline');
                                  setSearchQuery(group.pageSlug);
                                  setVisibleCount(25);
                                }}
                                className="text-blue-700 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                              >
                                Ver todas na linha do tempo
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div
              data-wiki-surface="panel"
              className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17]"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f1623] text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <th className="py-2.5 px-4">Page</th>
                      <th className="py-2.5 px-4">Change summary</th>
                      <th className="py-2.5 px-4 text-right">Version</th>
                      <th className="py-2.5 px-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                    {visibleTimeline.map((edit) => (
                      <tr
                        key={edit.id}
                        onClick={() => onSelectPage(edit.pageSlug)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FileEdit className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-blue-700 dark:text-blue-400 hover:underline">
                              {edit.pageTitle}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 pl-5.5">
                            :{edit.pageSlug}
                            {edit.pageVisibility === 'private' ? ' · Private' : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                          {edit.summary || 'Page update'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                          v{edit.version}
                        </td>
                        <td
                          className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap"
                          title={formatAbsoluteTime(edit.createdAt)}
                        >
                          {formatRelativeTime(edit.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination Footer */}
          {totalFilteredCount > INITIAL_VISIBLE_COUNT && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="tabular-nums">
                Exibindo <strong className="text-slate-800 dark:text-slate-200">{shownCount}</strong> de{' '}
                {totalFilteredCount}{' '}
                {viewMode === 'grouped'
                  ? totalFilteredCount === 1
                    ? 'página'
                    : 'páginas'
                  : totalFilteredCount === 1
                  ? 'edição'
                  : 'edições'}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {remainingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_STEP)}
                    data-wiki-surface="inset"
                    className="px-3 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors cursor-pointer"
                  >
                    Mostrar mais (+{Math.min(LOAD_MORE_STEP, remainingCount)})
                  </button>
                )}
                {remainingCount > LOAD_MORE_STEP && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount(totalFilteredCount)}
                    className="text-blue-700 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                  >
                    Ver tudo ({totalFilteredCount})
                  </button>
                )}
                {visibleCount > INITIAL_VISIBLE_COUNT && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount(INITIAL_VISIBLE_COUNT)}
                    className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer"
                  >
                    Mostrar apenas {INITIAL_VISIBLE_COUNT}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
