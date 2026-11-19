import React from 'react';
import { FileEdit, MessageSquare } from 'lucide-react';
import type { UserEdit } from '../types/wiki';
import { formatAbsoluteTime, formatRelativeTime } from '../lib/markdownUtils';

interface UserEditsPanelProps {
  authorName: string;
  edits: UserEdit[];
  loading: boolean;
  discussionPageSlug: string | null;
  onSelectPage: (slug: string) => void;
}

export const UserEditsPanel: React.FC<UserEditsPanelProps> = ({
  authorName,
  edits,
  loading,
  discussionPageSlug,
  onSelectPage,
}) => {
  return (
    <section
      aria-label={`Edits by ${authorName}`}
      className="pt-6 mt-8 border-t border-slate-200 dark:border-slate-800 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            Edit History by {authorName}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            All pages created or edited by {authorName} ({edits.length})
          </p>
        </div>

        {discussionPageSlug && (
          <button
            type="button"
            onClick={() => onSelectPage(discussionPageSlug)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>Open Discussion Page</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="h-11 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      ) : edits.length === 0 ? (
        <div className="py-8 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-[#0b0f17]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No public edits recorded yet for {authorName}.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17]">
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
                {edits.map((edit) => (
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
    </section>
  );
};
