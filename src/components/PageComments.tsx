import React from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import type { PageComment } from '../types/wiki';
import { VALIDATION_LIMITS } from '../types/wiki';
import { formatAbsoluteTime, formatRelativeTime } from '../lib/markdownUtils';

interface PageCommentsProps {
  comments: PageComment[];
  currentUserId: string | null;
  canModerate: boolean;
  isSignedIn: boolean;
  onAddComment: (body: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onSignIn: () => void;
}

export const PageComments: React.FC<PageCommentsProps> = ({
  comments,
  currentUserId,
  canModerate,
  isSignedIn,
  onAddComment,
  onDeleteComment,
  onSignIn,
}) => {
  const [body, setBody] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAddComment(body.trim());
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {isSignedIn ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <label
            htmlFor="comment-textarea"
            className="block text-sm font-medium text-slate-800 dark:text-slate-200"
          >
            Add a discussion note
          </label>
          <textarea
            id="comment-textarea"
            rows={3}
            value={body}
            maxLength={VALIDATION_LIMITS.COMMENT_BODY_MAX_LENGTH}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share feedback, questions, or notes about this page..."
            className="w-full p-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 resize-y"
          />
          {error && <p className="text-xs text-red-700 dark:text-red-400">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {body.length} / {VALIDATION_LIMITS.COMMENT_BODY_MAX_LENGTH}
            </span>
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Posting...' : 'Post comment'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>Sign in with your Google account to join the discussion on this page.</span>
          </div>
          <button
            type="button"
            onClick={onSignIn}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            Sign in with Google
          </button>
        </div>
      )}

      <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
        {comments.length === 0 ? (
          <p className="py-6 text-sm text-slate-500 dark:text-slate-400">
            No comments posted yet. Be the first to start the conversation.
          </p>
        ) : (
          comments.map((comment) => {
            const canDelete = canModerate || (currentUserId && comment.authorId === currentUserId);
            return (
              <div key={comment.id} className="py-4 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {comment.authorName}
                    </span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span
                      className="tabular-nums"
                      title={formatAbsoluteTime(comment.createdAt)}
                    >
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void onDeleteComment(comment.id)}
                      title="Delete comment"
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {comment.body}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
