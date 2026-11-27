import React from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Lock,
  MessageSquare,
  Pin,
  PinOff,
  Plus,
  Search,
  Send,
  Shield,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  createAdminDiscussionThread,
  deleteAdminDiscussionPost,
  deleteAdminDiscussionThread,
  fetchAdminDiscussionPosts,
  replyAdminDiscussionThread,
  updateAdminDiscussionPin,
  updateAdminDiscussionStatus,
} from '../lib/adminGovernanceService';
import { formatAbsoluteTime, formatRelativeTime } from '../lib/markdownUtils';
import {
  type AdminDiscussionCategory,
  type AdminDiscussionPost,
  type AdminDiscussionStatus,
  type AdminDiscussionThread,
  VALIDATION_LIMITS,
} from '../types/wiki';

interface AdminDiscussionPanelProps {
  currentUser: User;
  isBureaucrat: boolean;
  threads: AdminDiscussionThread[];
  onReloadThreads: () => Promise<void>;
  onFeedback: (msg: string) => void;
  onError: (msg: string) => void;
}

const CATEGORY_LABELS: Record<AdminDiscussionCategory, string> = {
  general: 'General',
  sockpuppets: 'Sockpuppets',
  lgpd: 'LGPD',
  policy: 'Policy',
  incident: 'Incident',
};

const STATUS_BADGE: Record<AdminDiscussionStatus, string> = {
  open: 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/35 text-blue-800 dark:text-blue-300',
  resolved:
    'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-300',
  archived:
    'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
};

export const AdminDiscussionPanel: React.FC<AdminDiscussionPanelProps> = ({
  currentUser,
  isBureaucrat,
  threads,
  onReloadThreads,
  onFeedback,
  onError,
}) => {
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(
    threads[0]?.id ?? null
  );
  const [posts, setPosts] = React.useState<AdminDiscussionPost[]>([]);
  const [loadingPosts, setLoadingPosts] = React.useState(false);

  const [categoryFilter, setCategoryFilter] = React.useState<'all' | AdminDiscussionCategory>('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | AdminDiscussionStatus>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // New thread modal
  const [newThreadOpen, setNewThreadOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newCategory, setNewCategory] = React.useState<AdminDiscussionCategory>('general');
  const [newBody, setNewBody] = React.useState('');
  const [newPinned, setNewPinned] = React.useState(false);
  const [creatingThread, setCreatingThread] = React.useState(false);

  // Reply state
  const [replyBody, setReplyBody] = React.useState('');
  const [sendingReply, setSendingReply] = React.useState(false);
  const [busyThreadOp, setBusyThreadOp] = React.useState(false);

  const filteredThreads = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return threads.filter((t) => {
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        t.authorName.toLowerCase().includes(q)
      );
    });
  }, [threads, categoryFilter, statusFilter, searchQuery]);

  const activeThread = React.useMemo(
    () => threads.find((t) => t.id === selectedThreadId) ?? filteredThreads[0] ?? null,
    [threads, selectedThreadId, filteredThreads]
  );

  React.useEffect(() => {
    if (!activeThread) {
      setPosts([]);
      return;
    }
    let cancelled = false;
    setLoadingPosts(true);
    fetchAdminDiscussionPosts(activeThread.id)
      .then((list) => {
        if (!cancelled) setPosts(list);
      })
      .catch((err) => {
        if (!cancelled) {
          onError(err instanceof Error ? err.message : 'Failed to load discussion replies.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPosts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeThread?.id, activeThread?.replyCount, onError]);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingThread(true);
    try {
      const created = await createAdminDiscussionThread({
        title: newTitle,
        category: newCategory,
        body: newBody,
        isPinned: newPinned,
        actor: currentUser,
        actorIsBureaucrat: isBureaucrat,
      });
      setNewThreadOpen(false);
      setNewTitle('');
      setNewBody('');
      setNewPinned(false);
      await onReloadThreads();
      setSelectedThreadId(created.id);
      onFeedback(`Started staff discussion thread "${created.title}".`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to create discussion thread.');
    } finally {
      setCreatingThread(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyBody.trim()) return;
    setSendingReply(true);
    try {
      await replyAdminDiscussionThread({
        thread: activeThread,
        body: replyBody,
        actor: currentUser,
        actorIsBureaucrat: isBureaucrat,
      });
      setReplyBody('');
      await onReloadThreads();
      const updatedPosts = await fetchAdminDiscussionPosts(activeThread.id);
      setPosts(updatedPosts);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to post reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleStatus = async (nextStatus: AdminDiscussionStatus) => {
    if (!activeThread) return;
    setBusyThreadOp(true);
    try {
      await updateAdminDiscussionStatus(activeThread.id, nextStatus);
      await onReloadThreads();
      onFeedback(`Thread "${activeThread.title}" marked as ${nextStatus}.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update thread status.');
    } finally {
      setBusyThreadOp(false);
    }
  };

  const handleTogglePin = async () => {
    if (!activeThread || !isBureaucrat) return;
    setBusyThreadOp(true);
    try {
      await updateAdminDiscussionPin(activeThread, !activeThread.isPinned);
      await onReloadThreads();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to toggle thread pin.');
    } finally {
      setBusyThreadOp(false);
    }
  };

  const handleDeleteThread = async () => {
    if (!activeThread) return;
    if (activeThread.authorId !== currentUser.uid && !isBureaucrat) return;
    setBusyThreadOp(true);
    try {
      await deleteAdminDiscussionThread(activeThread.id);
      setSelectedThreadId(null);
      await onReloadThreads();
      onFeedback(`Deleted discussion thread "${activeThread.title}".`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete discussion thread.');
    } finally {
      setBusyThreadOp(false);
    }
  };

  const handleDeletePost = async (post: AdminDiscussionPost) => {
    if (!activeThread) return;
    if (post.authorId !== currentUser.uid && !isBureaucrat) return;
    try {
      await deleteAdminDiscussionPost(activeThread.id, post.id);
      const updated = await fetchAdminDiscussionPosts(activeThread.id);
      setPosts(updated);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete reply.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Staff-only Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17]">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
            <Lock className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>Administrators &amp; Bureaucrats Discussion Area</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Confidential governance noticeboard protected by Firestore security rules. Only
            verified Administrators and Bureaucrats can view or post in these threads.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setNewThreadOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Staff Thread</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
            {(['all', 'general', 'sockpuppets', 'lgpd', 'policy', 'incident'] as const).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {cat === 'all' ? 'All topics' : CATEGORY_LABELS[cat]}
                </button>
              )
            )}
          </div>

          <select
            aria-label="Filter discussion status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | AdminDiscussionStatus)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff discussions..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
          />
        </div>
      </div>

      {/* Two-Column Thread List + Thread Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Thread List */}
        <div className="lg:col-span-5 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17] divide-y divide-slate-200 dark:divide-slate-800">
          {filteredThreads.length === 0 ? (
            <div className="py-12 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
              No staff discussion threads match the active filter.
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const selected = activeThread?.id === thread.id;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full text-left p-3.5 transition-colors cursor-pointer space-y-1.5 ${
                    selected
                      ? 'bg-blue-50/70 dark:bg-blue-950/30 border-l-2 border-l-blue-700'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {thread.isPinned && (
                        <Pin className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {thread.title}
                      </span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded border shrink-0 ${STATUS_BADGE[thread.status]}`}
                    >
                      {thread.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      {CATEGORY_LABELS[thread.category]} · {thread.authorName}
                    </span>
                    <span className="font-mono tabular-nums shrink-0">
                      {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'} ·{' '}
                      {formatRelativeTime(thread.lastActivityAt ?? thread.updatedAt)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Active Thread Detail */}
        <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#0b0f17] p-5 space-y-4">
          {!activeThread ? (
            <div className="py-16 text-center space-y-2">
              <MessageSquare className="w-5 h-5 text-slate-400 mx-auto" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Select or start a staff discussion thread
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Coordinate sockpuppet investigations, LGPD escalations, and policy decisions here.
              </p>
            </div>
          ) : (
            <>
              <div className="pb-4 border-b border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold uppercase rounded-md border ${STATUS_BADGE[activeThread.status]}`}
                      >
                        {activeThread.status}
                      </span>
                      <span className="px-2 py-0.5 text-[11px] font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1623] text-slate-700 dark:text-slate-300">
                        {CATEGORY_LABELS[activeThread.category]}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {activeThread.title}
                    </h3>
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {activeThread.authorRole === 'bureaucrat' ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                      )}
                      <span>
                        Opened by{' '}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {activeThread.authorName}
                        </strong>{' '}
                        ({activeThread.authorRole}) ·{' '}
                        <span title={formatAbsoluteTime(activeThread.createdAt)}>
                          {formatRelativeTime(activeThread.createdAt)}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {isBureaucrat && (
                      <button
                        type="button"
                        disabled={busyThreadOp}
                        onClick={() => void handleTogglePin()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        {activeThread.isPinned ? (
                          <>
                            <PinOff className="w-3 h-3" />
                            <span>Unpin</span>
                          </>
                        ) : (
                          <>
                            <Pin className="w-3 h-3" />
                            <span>Pin</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busyThreadOp}
                      onClick={() =>
                        void handleToggleStatus(
                          activeThread.status === 'resolved' ? 'open' : 'resolved'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>
                        {activeThread.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
                      </span>
                    </button>

                    {(activeThread.authorId === currentUser.uid || isBureaucrat) && (
                      <button
                        type="button"
                        disabled={busyThreadOp}
                        onClick={() => void handleDeleteThread()}
                        title="Delete thread"
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0f1623] text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {activeThread.body}
                </div>
              </div>

              {/* Replies List */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Replies ({posts.length})
                </div>

                {loadingPosts ? (
                  <div className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
                ) : posts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    No replies yet. Add the first staff comment below.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-[#0f1623] space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="inline-flex items-center gap-1.5">
                            {post.authorRole === 'bureaucrat' ? (
                              <ShieldAlert className="w-3 h-3 text-blue-700 dark:text-blue-400" />
                            ) : (
                              <Shield className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                            )}
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {post.authorName}
                            </span>
                            <span className="font-mono text-[10px] uppercase text-slate-500 dark:text-slate-400">
                              {post.authorRole}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className="font-mono text-[11px] text-slate-500 dark:text-slate-400"
                              title={formatAbsoluteTime(post.createdAt)}
                            >
                              {formatRelativeTime(post.createdAt)}
                            </span>
                            {(post.authorId === currentUser.uid || isBureaucrat) && (
                              <button
                                type="button"
                                onClick={() => void handleDeletePost(post)}
                                title="Delete reply"
                                className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {post.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply Composer */}
              <form onSubmit={handleReply} className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <textarea
                  rows={2}
                  required
                  maxLength={VALIDATION_LIMITS.ADMIN_POST_BODY_MAX_LENGTH}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Write a staff reply..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={sendingReply || !replyBody.trim()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingReply ? 'Posting...' : 'Post Reply'}</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* NEW STAFF DISCUSSION MODAL */}
      {newThreadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px]">
          <form
            onSubmit={handleCreateThread}
            className="w-full max-w-lg bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div>
              <p className="text-xs font-mono text-blue-700 dark:text-blue-400">
                Staff-Only Governance Noticeboard
              </p>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                Start Administrator Discussion Thread
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label
                  htmlFor="adm-thread-title"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Thread title
                </label>
                <input
                  id="adm-thread-title"
                  type="text"
                  required
                  maxLength={VALIDATION_LIMITS.TITLE_MAX_LENGTH}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Policy consensus on sockpuppet blocks"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="adm-thread-category"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Topic
                </label>
                <select
                  id="adm-thread-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as AdminDiscussionCategory)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                >
                  <option value="general">General</option>
                  <option value="sockpuppets">Sockpuppets</option>
                  <option value="lgpd">LGPD</option>
                  <option value="policy">Policy</option>
                  <option value="incident">Incident</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="adm-thread-body"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Discussion opening statement
              </label>
              <textarea
                id="adm-thread-body"
                required
                rows={5}
                maxLength={VALIDATION_LIMITS.ADMIN_THREAD_BODY_MAX_LENGTH}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Provide context, relevant :slugs, UIDs, or proposals for fellow admins & bureaucrats..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>

            {isBureaucrat && (
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPinned}
                  onChange={(e) => setNewPinned(e.target.checked)}
                />
                <span>Pin thread to top of Administrator Discussion Area</span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewThreadOpen(false)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingThread || !newTitle.trim() || !newBody.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
              >
                {creatingThread ? 'Creating...' : 'Create Thread'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
