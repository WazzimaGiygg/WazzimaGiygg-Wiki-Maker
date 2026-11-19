import React from 'react';
import { Eye, RotateCcw } from 'lucide-react';
import type { PageRevision } from '../types/wiki';
import { formatAbsoluteTime, formatRelativeTime } from '../lib/markdownUtils';
import { MarkdownRenderer } from './MarkdownRenderer';

interface RevisionHistoryProps {
  revisions: PageRevision[];
  loading: boolean;
  canEdit: boolean;
  restoringVersion: number | null;
  existingSlugs: Set<string>;
  onRestore: (revision: PageRevision) => Promise<void>;
  onNavigateSlug: (slug: string) => void;
}

export const RevisionHistory: React.FC<RevisionHistoryProps> = ({
  revisions,
  loading,
  canEdit,
  restoringVersion,
  existingSlugs,
  onRestore,
  onNavigateSlug,
}) => {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (revisions.length > 0 && !revisions.some((r) => r.id === selectedId)) {
      setSelectedId(revisions[0].id);
    }
  }, [revisions, selectedId]);

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3].map((row) => (
          <div
            key={row}
            className="h-11 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (revisions.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-6">
        Nenhuma revisão registrada para esta página ainda.
      </p>
    );
  }

  const selectedRevision = revisions.find((r) => r.id === selectedId) ?? revisions[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 space-y-2">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-800">
          Revisões registradas ({revisions.length})
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17]">
          {revisions.map((rev, index) => {
            const isSelected = rev.id === selectedRevision.id;
            return (
              <div
                key={rev.id}
                className={`p-3.5 transition-colors ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-blue-950/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(rev.id)}
                    className="flex items-center gap-2 text-left min-w-0 flex-1"
                  >
                    <span className="font-mono text-xs font-semibold tabular-nums text-blue-700 dark:text-blue-400 shrink-0">
                      v{rev.version}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {rev.summary || 'Sem descrição'}
                    </span>
                  </button>
                  {index === 0 && (
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 shrink-0">
                      Atual
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="truncate">
                    {rev.editorName} ·{' '}
                    <span className="tabular-nums" title={formatAbsoluteTime(rev.createdAt)}>
                      {formatRelativeTime(rev.createdAt)}
                    </span>
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedId(rev.id)}
                      className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver</span>
                    </button>
                    {canEdit && index > 0 && (
                      <button
                        type="button"
                        disabled={restoringVersion !== null}
                        onClick={() => void onRestore(rev)}
                        className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 hover:underline disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>
                          {restoringVersion === rev.version ? 'Restaurando...' : 'Restaurar'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-7">
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-[#0d131f]">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Visualizando revisão v{selectedRevision.version} ·{' '}
                {formatAbsoluteTime(selectedRevision.createdAt)}
              </div>
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {selectedRevision.title}
              </h3>
            </div>
            {canEdit && selectedRevision.version !== revisions[0].version && (
              <button
                type="button"
                disabled={restoringVersion !== null}
                onClick={() => void onRestore(selectedRevision)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar esta versão</span>
              </button>
            )}
          </div>

          <MarkdownRenderer
            content={selectedRevision.content}
            existingSlugs={existingSlugs}
            onNavigateSlug={onNavigateSlug}
          />
        </div>
      </div>
    </div>
  );
};
