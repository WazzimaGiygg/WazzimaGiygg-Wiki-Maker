import React from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Archive,
  Ban,
  ExternalLink,
  Loader2,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  Unlock,
  UserX,
} from 'lucide-react';
import {
  type AdminDashboardSnapshot,
  type AdminEditEntry,
  type AdminUserRow,
  applySanctionToUser,
  blockUserAccount,
  deletePageAsAdmin,
  executeLgpdUserRemoval,
  fetchAdminDashboardData,
  notifyUserDiscussionPage,
  removeRevisionEditAsAdmin,
  type SanctionSeverity,
  setUserGovernanceRole,
  unblockUserAccount,
} from '../lib/adminService';
import { exportPublicWikiArchiveZip } from '../lib/archiveExportService';
import { formatAbsoluteTime, formatRelativeTime } from '../lib/markdownUtils';
import {
  resolveExternalLinkConfig,
  type SiteExtensionsState,
} from '../lib/extensionsService';
import { LEGAL_GOVERNANCE } from '../lib/legalConfig';
import { updateWikiPage } from '../lib/wikiService';
import { isTemplatePage } from '../services/templateService';
import type { GovernanceRole, LgpdErasureMode, WikiPage } from '../types/wiki';
import { AdminTemplatesPanel } from './AdminTemplatesPanel';
import { ExtensionsManagerPanel } from './ExtensionsManagerPanel';
import { RepoUpdatesPanel } from './RepoUpdatesPanel';

type AdminTab =
  | 'users'
  | 'edits'
  | 'pages'
  | 'templates'
  | 'lgpd'
  | 'extensions'
  | 'updates';

interface AdminConsoleViewProps {
  currentUser: User;
  currentUserRole: GovernanceRole;
  extensionsState: SiteExtensionsState;
  siteTitle?: string;
  allPublicPages?: WikiPage[];
  onSelectPage: (slug: string) => void;
  onRefreshGlobalPages?: () => void;
}

export const AdminConsoleView: React.FC<AdminConsoleViewProps> = ({
  currentUser,
  currentUserRole,
  extensionsState,
  siteTitle,
  allPublicPages,
  onSelectPage,
}) => {
  const isBureaucrat = currentUserRole === 'bureaucrat';
  const isZipExportEnabled = extensionsState.byId['zip-archive']?.enabled !== false;
  const externalLinkConfig = React.useMemo(
    () => resolveExternalLinkConfig(extensionsState),
    [extensionsState]
  );

  const [tab, setTab] = React.useState<AdminTab>('users');
  const [snapshot, setSnapshot] = React.useState<AdminDashboardSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = React.useState<string | null>(null);
  const [feedbackDiscussionSlug, setFeedbackDiscussionSlug] = React.useState<string | null>(null);

  const [userSearch, setUserSearch] = React.useState('');
  const [userFilter, setUserFilter] = React.useState<'all' | 'staff' | 'blocked'>('all');
  const [editSearch, setEditSearch] = React.useState('');
  const [pageSearch, setPageSearch] = React.useState('');

  // Action states
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [blockModalUser, setBlockModalUser] = React.useState<{
    uid: string;
    displayName: string;
    pageSlug?: string;
    pageTitle?: string;
    version?: number;
  } | null>(null);
  const [blockReason, setBlockReason] = React.useState('');

  const [sanctionModalTarget, setSanctionModalTarget] = React.useState<{
    uid: string;
    displayName: string;
    pageSlug?: string;
    pageTitle?: string;
    version?: number;
  } | null>(null);
  const [sanctionSeverity, setSanctionSeverity] = React.useState<SanctionSeverity>('warning');
  const [sanctionLabel, setSanctionLabel] = React.useState('');
  const [sanctionReason, setSanctionReason] = React.useState('');

  const [lgpdModalUser, setLgpdModalUser] = React.useState<AdminUserRow | null>(null);
  const [lgpdMode, setLgpdMode] = React.useState<LgpdErasureMode>('anonymize');
  const [lgpdConfirmText, setLgpdConfirmText] = React.useState('');

  const [confirmDeletePageSlug, setConfirmDeletePageSlug] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchAdminDashboardData();
      setSnapshot(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load administration data.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const pagesBySlug = React.useMemo(() => {
    const map = new Map<string, WikiPage>();
    for (const p of snapshot?.pages ?? []) {
      map.set(p.slug, p);
    }
    return map;
  }, [snapshot?.pages]);

  const filteredUsers = React.useMemo(() => {
    const users = snapshot?.users ?? [];
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (userFilter === 'staff' && u.role === 'member') return false;
      if (userFilter === 'blocked' && !u.blocked) return false;
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
      );
    });
  }, [snapshot?.users, userSearch, userFilter]);

  const filteredEdits = React.useMemo(() => {
    const edits = snapshot?.recentEdits ?? [];
    const q = editSearch.trim().toLowerCase();
    if (!q) return edits;
    return edits.filter(
      (e) =>
        e.pageTitle.toLowerCase().includes(q) ||
        e.pageSlug.toLowerCase().includes(q) ||
        e.editorName.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q)
    );
  }, [snapshot?.recentEdits, editSearch]);

  const filteredPages = React.useMemo(() => {
    const pages = snapshot?.pages ?? [];
    const q = pageSearch.trim().toLowerCase();
    const sorted = [...pages].sort(
      (a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0)
    );
    if (!q) return sorted;
    return sorted.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.lastEditorName.toLowerCase().includes(q)
    );
  }, [snapshot?.pages, pageSearch]);

  const templatePages = React.useMemo(
    () => (snapshot?.pages ?? []).filter((p) => isTemplatePage(p)),
    [snapshot?.pages]
  );

  const exportSourcePages = React.useMemo(
    () => (allPublicPages && allPublicPages.length > 0 ? allPublicPages : snapshot?.pages ?? []),
    [allPublicPages, snapshot?.pages]
  );

  const publicArchiveCount = React.useMemo(
    () => exportSourcePages.filter((p) => p.visibility === 'public').length,
    [exportSourcePages]
  );

  const handleExportPublicZip = async () => {
    setBusyKey('export:zip');
    setErrorMsg(null);
    setFeedbackMsg(null);
    setFeedbackDiscussionSlug(null);
    try {
      const result = await exportPublicWikiArchiveZip(exportSourcePages, siteTitle);
      const sizeKb = Math.max(1, Math.round(result.byteSize / 1024));
      setFeedbackMsg(
        `Exported ${result.pageCount} public Markdown ${
          result.pageCount === 1 ? 'file' : 'files'
        } into ${result.fileName} (${sizeKb} KB).`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create ZIP archive.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRoleChange = async (target: AdminUserRow, nextRole: GovernanceRole) => {
    if (!isBureaucrat || target.isBootstrappedOwner || target.uid === currentUser.uid) return;
    setBusyKey(`role:${target.uid}`);
    setErrorMsg(null);
    setFeedbackMsg(null);
    setFeedbackDiscussionSlug(null);
    try {
      await setUserGovernanceRole(target.uid, nextRole, currentUser);
      setFeedbackMsg(`Updated role for ${target.displayName} to ${nextRole}.`);
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update governance role.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleConfirmBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockModalUser) return;
    setBusyKey(`block:${blockModalUser.uid}`);
    setErrorMsg(null);
    setFeedbackMsg(null);
    setFeedbackDiscussionSlug(null);
    try {
      const notice = await blockUserAccount(
        blockModalUser.uid,
        blockModalUser.displayName,
        blockReason || 'Blocked by wiki moderation',
        currentUser,
        {
          pageSlug: blockModalUser.pageSlug,
          pageTitle: blockModalUser.pageTitle,
          version: blockModalUser.version,
        }
      );
      setFeedbackMsg(
        [
          `Blocked user ${blockModalUser.displayName}. Write permissions revoked`,
          notice.personalPageSlug
            ? `{{Bloqueio}} inserted on :${notice.personalPageSlug}`
            : null,
          notice.notified && notice.discussionPageSlug
            ? `notification inserted into :${notice.discussionPageSlug}`
            : null,
        ]
          .filter(Boolean)
          .join('; ') + '.'
      );
      setFeedbackDiscussionSlug(notice.notified ? notice.discussionPageSlug : null);
      setBlockModalUser(null);
      setBlockReason('');
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to block user.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleUnblock = async (target: AdminUserRow) => {
    setBusyKey(`unblock:${target.uid}`);
    setErrorMsg(null);
    setFeedbackMsg(null);
    setFeedbackDiscussionSlug(null);
    try {
      const notice = await unblockUserAccount(target.uid, target.displayName, currentUser);
      setFeedbackMsg(
        notice.notified && notice.discussionPageSlug
          ? `Unblocked user ${target.displayName}. Notification inserted into :${notice.discussionPageSlug}.`
          : `Unblocked user ${target.displayName}.`
      );
      setFeedbackDiscussionSlug(notice.notified ? notice.discussionPageSlug : null);
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to unblock user.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleConfirmSanction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sanctionModalTarget) return;
    setBusyKey(`sanction:${sanctionModalTarget.uid}`);
    setErrorMsg(null);
    setFeedbackMsg(null);
    setFeedbackDiscussionSlug(null);
    try {
      const res = await applySanctionToUser({
        targetUid: sanctionModalTarget.uid,
        targetDisplayName: sanctionModalTarget.displayName,
        actor: currentUser,
        severity: sanctionSeverity,
        sanctionLabel: sanctionLabel.trim() || undefined,
        reason: sanctionReason.trim(),
        pageSlug: sanctionModalTarget.pageSlug,
        pageTitle: sanctionModalTarget.pageTitle,
        version: sanctionModalTarget.version,
      });
      const actionDesc = res.blockedApplied
        ? `Sanction & account block applied to ${sanctionModalTarget.displayName}`
        : `Sanction applied to ${sanctionModalTarget.displayName}`;
      setFeedbackMsg(
        [
          actionDesc,
          res.blockedApplied && res.personalPageSlug
            ? `{{Bloqueio}} inserted on :${res.personalPageSlug}`
            : null,
          res.notified && res.discussionPageSlug
            ? `Notification inserted into :${res.discussionPageSlug}`
            : null,
        ]
          .filter(Boolean)
          .join('. ') + '.'
      );
      setFeedbackDiscussionSlug(res.notified ? res.discussionPageSlug : null);
      setSanctionModalTarget(null);
      setSanctionLabel('');
      setSanctionReason('');
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to apply sanction.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRemoveEdit = async (edit: AdminEditEntry) => {
    const parentPage = pagesBySlug.get(edit.pageSlug);
    if (!parentPage) return;
    const revsForPage = (snapshot?.recentEdits ?? []).filter((r) => r.pageSlug === edit.pageSlug);

    setBusyKey(`edit:${edit.pageSlug}:${edit.id}`);
    setErrorMsg(null);
    setFeedbackMsg(null);
    setFeedbackDiscussionSlug(null);
    try {
      const { outcome, discussionPageSlug, notified } = await removeRevisionEditAsAdmin(
        parentPage,
        edit,
        revsForPage,
        currentUser
      );
      const noticeSuffix =
        notified && discussionPageSlug
          ? ` Notification inserted into :${discussionPageSlug}.`
          : '';
      if (outcome === 'deleted-page') {
        setFeedbackMsg(`Deleted single-revision page :${edit.pageSlug}.${noticeSuffix}`);
      } else if (outcome === 'reverted-and-removed') {
        setFeedbackMsg(
          `Reverted :${edit.pageSlug} to previous revision and removed edit v${edit.version}.${noticeSuffix}`
        );
      } else {
        setFeedbackMsg(
          `Removed revision v${edit.version} from :${edit.pageSlug}.${noticeSuffix}`
        );
      }
      setFeedbackDiscussionSlug(notified ? discussionPageSlug : null);
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to remove edit.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleTogglePageLock = async (page: WikiPage) => {
    setBusyKey(`lock:${page.slug}`);
    setErrorMsg(null);
    setFeedbackMsg(null);
    setFeedbackDiscussionSlug(null);
    try {
      const nextLocked = !page.isLocked;
      await updateWikiPage(
        page,
        {
          slug: page.slug,
          title: page.title,
          content: page.content,
          category: page.category,
          tags: page.tags,
          visibility: page.visibility,
          isLocked: nextLocked,
          summary: nextLocked ? 'Moderation: locked page' : 'Moderation: unlocked page',
        },
        currentUser,
        true
      );

      let noticeSlug: string | null = null;
      if (page.authorId !== currentUser.uid) {
        const notice = await notifyUserDiscussionPage({
          targetUid: page.authorId,
          targetDisplayName: page.authorName,
          actor: currentUser,
          kind: nextLocked ? 'page-locked' : 'page-unlocked',
          reason: nextLocked
            ? `A página :${page.slug} foi bloqueada para edição pela administração.`
            : `A proteção de edição da página :${page.slug} foi removida pela administração.`,
          pageSlug: page.slug,
          pageTitle: page.title,
          version: page.version + 1,
        });
        if (notice.notified && notice.discussionPageSlug) {
          noticeSlug = notice.discussionPageSlug;
        }
      }

      setFeedbackMsg(
        noticeSlug
          ? `${nextLocked ? 'Locked' : 'Unlocked'} page :${page.slug}. Notification inserted into :${noticeSlug}.`
          : `${nextLocked ? 'Locked' : 'Unlocked'} page :${page.slug}.`
      );
      setFeedbackDiscussionSlug(noticeSlug);
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update page lock.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeletePage = async (slug: string) => {
    setBusyKey(`delpage:${slug}`);
    setErrorMsg(null);
    setFeedbackMsg(null);
    setFeedbackDiscussionSlug(null);
    try {
      const notice = await deletePageAsAdmin(slug, currentUser);
      setConfirmDeletePageSlug(null);
      setFeedbackMsg(
        notice.notified && notice.discussionPageSlug
          ? `Deleted page :${slug} and all revisions/comments. Notification inserted into :${notice.discussionPageSlug}.`
          : `Deleted page :${slug} and all revisions/comments.`
      );
      setFeedbackDiscussionSlug(notice.notified ? notice.discussionPageSlug : null);
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete page.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleExecuteLgpd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lgpdModalUser || lgpdConfirmText.trim().toUpperCase() !== 'ERASE') return;

    setBusyKey(`lgpd:${lgpdModalUser.uid}`);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      const result = await executeLgpdUserRemoval(
        lgpdModalUser.uid,
        lgpdMode,
        currentUser,
        isBureaucrat
      );
      setFeedbackMsg(`LGPD erasure completed for ${lgpdModalUser.displayName}. ${result.summary}`);
      setLgpdModalUser(null);
      setLgpdConfirmText('');
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to execute LGPD data erasure.');
    } finally {
      setBusyKey(null);
    }
  };

  const blockedCount = (snapshot?.users ?? []).filter((u) => Boolean(u.blocked)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            wiki / governance / {isBureaucrat ? 'bureaucrat' : 'administrator'}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            Bureaucrats & Administrators Console
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage collaborators, review recent edits across all pages, enforce blocks, and process
            LGPD data erasure requests.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh data</span>
        </button>
      </div>

      {/* Feedback & Error Notices */}
      {errorMsg && (
        <div className="p-3.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-xs text-red-800 dark:text-red-300">
          {errorMsg}
        </div>
      )}
      {feedbackMsg && (
        <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 text-xs text-emerald-800 dark:text-emerald-300 flex flex-wrap items-center justify-between gap-2">
          <span>{feedbackMsg}</span>
          {feedbackDiscussionSlug && (
            <button
              type="button"
              onClick={() => onSelectPage(feedbackDiscussionSlug)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-400/60 dark:border-emerald-700 bg-white dark:bg-[#0b0f17] text-emerald-800 dark:text-emerald-300 font-medium hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Abrir página de discussão</span>
            </button>
          )}
        </div>
      )}

      {/* 4-Column Summary Strip (Single Elevation Hairline Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 dark:border-slate-800 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 bg-slate-50/60 dark:bg-[#0b0f17]">
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Collaborators</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {loading ? '—' : snapshot?.users.length ?? 0}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Blocked Accounts</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {loading ? '—' : blockedCount}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Pages</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {loading ? '—' : snapshot?.pages.length ?? 0}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Recorded Edits</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {loading ? '—' : snapshot?.recentEdits.length ?? 0}
          </div>
        </div>
      </div>

      {/* Segmented Console Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('users')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              tab === 'users'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Users & Roles ({snapshot?.users.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setTab('edits')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              tab === 'edits'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Recent Edits ({snapshot?.recentEdits.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setTab('pages')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              tab === 'pages'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            All Pages ({snapshot?.pages.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setTab('templates')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              tab === 'templates'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Templates ({templatePages.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('lgpd')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              tab === 'lgpd'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            LGPD Audit Log ({snapshot?.lgpdLogs.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setTab('extensions')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              tab === 'extensions'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Extensões ({extensionsState.list.filter((e) => e.enabled).length}/
            {extensionsState.list.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('updates')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              tab === 'updates'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Atualizações do Repo
          </button>
        </div>

        {!isBureaucrat && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Signed in as Administrator · Role promotions require Bureaucrat privileges
          </span>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && !snapshot ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((row) => (
            <div
              key={row}
              className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* TAB 1: USERS & ROLES */}
          {tab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setUserFilter('all')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      userFilter === 'all'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter('staff')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      userFilter === 'staff'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    Bureaucrats & Admins
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter('blocked')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      userFilter === 'blocked'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    Blocked ({blockedCount})
                  </button>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Filter by name, email, or UID..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="py-12 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17]">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No users match the selected filters.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f1623] text-xs font-semibold text-slate-600 dark:text-slate-400">
                          <th className="py-2.5 px-4">Collaborator</th>
                          <th className="py-2.5 px-4">Email (Private PII)</th>
                          <th className="py-2.5 px-4">Role</th>
                          <th className="py-2.5 px-4 text-right">Pages / Edits</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4 text-right">Moderation & LGPD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                        {filteredUsers.map((u) => {
                          const isSelf = u.uid === currentUser.uid;
                          const canModerateTarget =
                            !isSelf &&
                            !u.isBootstrappedOwner &&
                            (isBureaucrat || u.role === 'member');

                          return (
                            <tr
                              key={u.uid}
                              className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  {u.photoURL ? (
                                    <img
                                      src={u.photoURL}
                                      alt={u.displayName}
                                      referrerPolicy="no-referrer"
                                      className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center shrink-0">
                                      {u.displayName.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                        {u.displayName}
                                      </span>
                                      {u.personalPageSlug && (
                                        <button
                                          type="button"
                                          onClick={() => onSelectPage(u.personalPageSlug!)}
                                          title={`Open :${u.personalPageSlug}`}
                                          className="text-blue-700 dark:text-blue-400 hover:text-blue-800 shrink-0"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </button>
                                      )}
                                      {u.discussionPageSlug && (
                                        <button
                                          type="button"
                                          onClick={() => onSelectPage(u.discussionPageSlug!)}
                                          title={`Open discussion page :${u.discussionPageSlug}`}
                                          className="text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 shrink-0"
                                        >
                                          <MessageSquare className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                                      {u.uid}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                                {u.email ?? '—'}
                              </td>

                              <td className="py-3 px-4 text-xs">
                                {isBureaucrat && !u.isBootstrappedOwner && !isSelf ? (
                                  <select
                                    aria-label={`Governance role for ${u.displayName}`}
                                    value={u.role}
                                    disabled={busyKey === `role:${u.uid}`}
                                    onChange={(e) =>
                                      void handleRoleChange(u, e.target.value as GovernanceRole)
                                    }
                                    className="px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-700"
                                  >
                                    <option value="member">Member</option>
                                    <option value="admin">Administrator</option>
                                    <option value="bureaucrat">Bureaucrat</option>
                                  </select>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-1 font-medium ${
                                      u.role === 'bureaucrat'
                                        ? 'text-blue-700 dark:text-blue-400'
                                        : u.role === 'admin'
                                        ? 'text-slate-900 dark:text-slate-100'
                                        : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    {u.role === 'bureaucrat' && <ShieldAlert className="w-3.5 h-3.5" />}
                                    {u.role === 'admin' && <Shield className="w-3.5 h-3.5" />}
                                    <span>
                                      {u.role === 'bureaucrat'
                                        ? 'Bureaucrat'
                                        : u.role === 'admin'
                                        ? 'Administrator'
                                        : 'Member'}
                                    </span>
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                                {u.pageCount} / {u.editCount}
                              </td>

                              <td className="py-3 px-4 text-xs">
                                {u.blocked ? (
                                  <div>
                                    <span className="font-medium text-red-700 dark:text-red-400">
                                      Blocked
                                    </span>
                                    <div
                                      className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]"
                                      title={u.blocked.reason}
                                    >
                                      {u.blocked.reason}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                    Active
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center justify-end gap-2">
                                  {canModerateTarget ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSanctionModalTarget({
                                            uid: u.uid,
                                            displayName: u.displayName,
                                          });
                                          setSanctionSeverity('warning');
                                          setSanctionLabel('');
                                          setSanctionReason('');
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 whitespace-nowrap shrink-0"
                                      >
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>Sanction</span>
                                      </button>

                                      {u.blocked ? (
                                        <button
                                          type="button"
                                          disabled={busyKey === `unblock:${u.uid}`}
                                          onClick={() => void handleUnblock(u)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 disabled:opacity-50"
                                        >
                                          <Unlock className="w-3 h-3" />
                                          <span>Unblock</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setBlockModalUser({
                                              uid: u.uid,
                                              displayName: u.displayName,
                                            });
                                            setBlockReason('');
                                          }}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 whitespace-nowrap shrink-0"
                                        >
                                          <Ban className="w-3 h-3" />
                                          <span>Block</span>
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setLgpdModalUser(u);
                                          setLgpdMode('anonymize');
                                          setLgpdConfirmText('');
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 whitespace-nowrap shrink-0"
                                      >
                                        <UserX className="w-3 h-3" />
                                        <span>LGPD Erase</span>
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-xs text-slate-400">
                                      {isSelf
                                        ? 'Current session'
                                        : u.isBootstrappedOwner
                                        ? 'Primary Bureaucrat'
                                        : 'Protected'}
                                    </span>
                                  )}
                                </div>
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
          )}

          {/* TAB 2: RECENT EDITS MODERATION */}
          {tab === 'edits' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Every revision saved across all public and private pages. Removing a live edit
                  reverts the page to its previous clean snapshot.
                </p>

                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={editSearch}
                    onChange={(e) => setEditSearch(e.target.value)}
                    placeholder="Filter page, :slug, editor, or summary..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              {filteredEdits.length === 0 ? (
                <div className="py-12 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17]">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No edits match your search filter.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f1623] text-xs font-semibold text-slate-600 dark:text-slate-400">
                          <th className="py-2.5 px-4">Page</th>
                          <th className="py-2.5 px-4">Editor</th>
                          <th className="py-2.5 px-4">Change summary</th>
                          <th className="py-2.5 px-4 text-right">Version</th>
                          <th className="py-2.5 px-4 text-right">When</th>
                          <th className="py-2.5 px-4 text-right">Moderation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                        {filteredEdits.map((edit) => {
                          const editBusy = busyKey === `edit:${edit.pageSlug}:${edit.id}`;
                          const editorUser = (snapshot?.users ?? []).find(
                            (u) => u.uid === edit.editorId
                          );
                          const canBlockEditor =
                            edit.editorId !== currentUser.uid &&
                            edit.editorId !== 'lgpd-anonymized' &&
                            !editorUser?.isBootstrappedOwner &&
                            !editorUser?.blocked &&
                            (isBureaucrat || !editorUser || editorUser.role === 'member');

                          return (
                            <tr
                              key={`${edit.pageSlug}-${edit.id}`}
                              className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  onClick={() => onSelectPage(edit.pageSlug)}
                                  className="text-left font-medium text-blue-700 dark:text-blue-400 hover:underline"
                                >
                                  {edit.pageTitle}
                                </button>
                                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                  :{edit.pageSlug}
                                  {edit.pageVisibility === 'private' ? ' · Private' : ''}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                                <div>{edit.editorName}</div>
                                <div className="font-mono text-[11px] text-slate-400 truncate max-w-[140px]">
                                  {edit.editorId}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-[240px] truncate">
                                {edit.summary || 'No summary'}
                              </td>

                              <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                                v{edit.version}
                                {edit.isCurrentVersion ? ' · Live' : ''}
                              </td>

                              <td
                                className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap"
                                title={formatAbsoluteTime(edit.createdAt)}
                              >
                                {formatRelativeTime(edit.createdAt)}
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    disabled={editBusy}
                                    onClick={() => void handleRemoveEdit(edit)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 whitespace-nowrap shrink-0 disabled:opacity-50"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>
                                      {editBusy
                                        ? 'Removing...'
                                        : edit.isCurrentVersion
                                        ? 'Revert & Remove'
                                        : 'Remove'}
                                    </span>
                                  </button>

                                  {edit.editorId !== currentUser.uid &&
                                    edit.editorId !== 'lgpd-anonymized' &&
                                    !editorUser?.isBootstrappedOwner &&
                                    (isBureaucrat || !editorUser || editorUser.role === 'member') && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSanctionModalTarget({
                                            uid: edit.editorId,
                                            displayName: edit.editorName,
                                            pageSlug: edit.pageSlug,
                                            pageTitle: edit.pageTitle,
                                            version: edit.version,
                                          });
                                          setSanctionSeverity('edit-sanction');
                                          setSanctionLabel('');
                                          setSanctionReason(
                                            `Sanção aplicada sobre a edição v${edit.version} em :${edit.pageSlug}`
                                          );
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 whitespace-nowrap shrink-0"
                                      >
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>Sanction Edit</span>
                                      </button>
                                    )}

                                  {canBlockEditor && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBlockModalUser({
                                          uid: edit.editorId,
                                          displayName: edit.editorName,
                                          pageSlug: edit.pageSlug,
                                          pageTitle: edit.pageTitle,
                                          version: edit.version,
                                        });
                                        setBlockReason(
                                          `Moderation action on :${edit.pageSlug} (v${edit.version})`
                                        );
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 whitespace-nowrap shrink-0"
                                    >
                                      <Ban className="w-3 h-3" />
                                      <span>Block Editor</span>
                                    </button>
                                  )}
                                </div>
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
          )}

          {/* TAB 3: ALL PAGES */}
          {tab === 'pages' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Complete administrative view of all wiki pages including private drafts and
                  personal pages.
                </p>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                  {isZipExportEnabled && (
                    <button
                      type="button"
                      disabled={busyKey === 'export:zip' || publicArchiveCount === 0}
                      onClick={() => void handleExportPublicZip()}
                      title="Export all public wiki pages into a ZIP archive of Markdown files"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {busyKey === 'export:zip' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : (
                        <Archive className="w-3.5 h-3.5 shrink-0 text-blue-700 dark:text-blue-400" />
                      )}
                      <span className="tabular-nums">
                        {busyKey === 'export:zip'
                          ? 'Archiving...'
                          : `Export Public ZIP (${publicArchiveCount})`}
                      </span>
                    </button>
                  )}

                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={pageSearch}
                      onChange={(e) => setPageSearch(e.target.value)}
                      placeholder="Filter pages by title, :slug, or author..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                    />
                  </div>
                </div>
              </div>

              {filteredPages.length === 0 ? (
                <div className="py-12 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17]">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No pages match your search filter.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f1623] text-xs font-semibold text-slate-600 dark:text-slate-400">
                          <th className="py-2.5 px-4">Page</th>
                          <th className="py-2.5 px-4">Author / Last Editor</th>
                          <th className="py-2.5 px-4">Access</th>
                          <th className="py-2.5 px-4 text-right">Updated</th>
                          <th className="py-2.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                        {filteredPages.map((p) => (
                          <tr
                            key={p.slug}
                            className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => onSelectPage(p.slug)}
                                className="text-left font-medium text-blue-700 dark:text-blue-400 hover:underline"
                              >
                                {p.title}
                              </button>
                              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                :{p.slug} · v{p.version}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                              <div>By {p.authorName}</div>
                              <div className="text-slate-400">Edited by {p.lastEditorName}</div>
                            </td>

                            <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                              {p.visibility === 'private' ? 'Private' : 'Public'}
                              {p.isLocked ? ' · Locked' : ''}
                            </td>

                            <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {formatRelativeTime(p.updatedAt)}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={busyKey === `lock:${p.slug}`}
                                  onClick={() => void handleTogglePageLock(p)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 disabled:opacity-50"
                                >
                                  {p.isLocked ? (
                                    <>
                                      <Unlock className="w-3 h-3" />
                                      <span>Unlock</span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-3 h-3" />
                                      <span>Lock</span>
                                    </>
                                  )}
                                </button>

                                {confirmDeletePageSlug === p.slug ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={busyKey === `delpage:${p.slug}`}
                                      onClick={() => void handleDeletePage(p.slug)}
                                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-700 text-white hover:bg-red-800 whitespace-nowrap shrink-0 disabled:opacity-50"
                                    >
                                      Confirm Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeletePageSlug(null)}
                                      className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeletePageSlug(p.slug)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 whitespace-nowrap shrink-0"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3B: COMMUNITY TEMPLATES MANAGEMENT */}
          {tab === 'templates' && (
            <AdminTemplatesPanel
              pages={templatePages}
              allWikiPages={snapshot?.pages ?? []}
              currentUser={currentUser}
              onSelectPage={onSelectPage}
              onReloadData={loadData}
              onFeedback={setFeedbackMsg}
              onError={setErrorMsg}
              externalLinkPrefix={externalLinkConfig.prefix}
              encodeExternalLinkTarget={externalLinkConfig.encodeTargetUrl}
            />
          )}

          {/* TAB 4: LGPD AUDIT LOG */}
          {tab === 'lgpd' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17] text-xs">
                <p className="text-slate-600 dark:text-slate-300 max-w-2xl">
                  Immutable compliance log recording LGPD (Art. 18, VI) personal data erasure and
                  anonymization executions without storing deleted PII, aligned with{' '}
                  {LEGAL_GOVERNANCE.marcoCivilLaw}.
                </p>
                <div className="text-slate-600 dark:text-slate-300 shrink-0">
                  DPO: <strong>{LEGAL_GOVERNANCE.dpoName}</strong> (
                  <a
                    href={`mailto:${LEGAL_GOVERNANCE.dpoEmail}`}
                    className="font-mono text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    {LEGAL_GOVERNANCE.dpoEmail}
                  </a>
                  )
                </div>
              </div>

              {(snapshot?.lgpdLogs.length ?? 0) === 0 ? (
                <div className="py-12 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17]">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No LGPD data erasure requests have been executed yet.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f1623] text-xs font-semibold text-slate-600 dark:text-slate-400">
                          <th className="py-2.5 px-4">Target UID</th>
                          <th className="py-2.5 px-4">Mode</th>
                          <th className="py-2.5 px-4">Execution Summary</th>
                          <th className="py-2.5 px-4">Executed By</th>
                          <th className="py-2.5 px-4 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                        {(snapshot?.lgpdLogs ?? []).map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                            <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                              {log.targetUid}
                            </td>
                            <td className="py-3 px-4 text-xs font-medium text-slate-800 dark:text-slate-200">
                              {log.mode === 'purge' ? 'Full Purge' : 'Anonymize + Erase PII'}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                              {log.summary}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                              {log.executedByName}
                            </td>
                            <td
                              className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap"
                              title={formatAbsoluteTime(log.createdAt)}
                            >
                              {formatRelativeTime(log.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: EXTENSIONS MANAGEMENT (Bureaucrat Config) */}
          {tab === 'extensions' && (
            <ExtensionsManagerPanel
              currentUser={currentUser}
              isBureaucrat={isBureaucrat}
              extensionsState={extensionsState}
            />
          )}

          {/* TAB 6: GITHUB REPOSITORY UPDATES */}
          {tab === 'updates' && <RepoUpdatesPanel isBureaucrat={isBureaucrat} />}
        </>
      )}

      {/* BLOCK USER MODAL */}
      {blockModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px]">
          <form
            onSubmit={handleConfirmBlock}
            className="w-full max-w-md bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                Block Collaborator Account
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Blocking <strong>{blockModalUser.displayName}</strong> immediately revokes
                permission to create, edit, or delete pages and comments. Uma notificação será
                inserida automaticamente dentro da página de discussão do usuário.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="block-reason-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Reason for block
              </label>
              <textarea
                id="block-reason-input"
                required
                rows={3}
                maxLength={300}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g., Repeated spam edits or policy violation"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBlockModalUser(null)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyKey === `block:${blockModalUser.uid}` || !blockReason.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-50"
              >
                {busyKey === `block:${blockModalUser.uid}` ? 'Blocking...' : 'Confirm Block'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SANCTION / DISCUSSION NOTICE MODAL */}
      {sanctionModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px]">
          <form
            onSubmit={handleConfirmSanction}
            className="w-full max-w-md bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div>
              <p className="text-xs font-mono text-blue-700 dark:text-blue-400">
                Governance · Discussion Page Notification
              </p>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                Aplicar Sanção: {sanctionModalTarget.displayName}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                A notificação oficial desta sanção será inserida automaticamente dentro da página de
                discussão de <strong>{sanctionModalTarget.displayName}</strong>
                {sanctionModalTarget.pageSlug
                  ? ` (ref: :${sanctionModalTarget.pageSlug}${
                      typeof sanctionModalTarget.version === 'number'
                        ? ` v${sanctionModalTarget.version}`
                        : ''
                    })`
                  : ''}
                .
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="sanction-severity-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Tipo de sanção / aplicação
              </label>
              <select
                id="sanction-severity-select"
                value={sanctionSeverity}
                onChange={(e) => setSanctionSeverity(e.target.value as SanctionSeverity)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              >
                <option value="warning">Advertência formal (Aviso)</option>
                <option value="edit-sanction">Sanção / Revisão sobre edição</option>
                <option value="block">Sanção com bloqueio imediato da conta</option>
              </select>
            </div>

            {sanctionSeverity !== 'block' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="sanction-label-input"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Título curto da sanção (opcional)
                </label>
                <input
                  id="sanction-label-input"
                  type="text"
                  maxLength={100}
                  value={sanctionLabel}
                  onChange={(e) => setSanctionLabel(e.target.value)}
                  placeholder="Ex.: Advertência de conduta editorial"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="sanction-reason-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Motivo / Descrição da notificação
              </label>
              <textarea
                id="sanction-reason-input"
                required
                rows={3}
                maxLength={300}
                value={sanctionReason}
                onChange={(e) => setSanctionReason(e.target.value)}
                placeholder="Descreva a sanção ou determinação administrativa que aparecerá na página de discussão..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSanctionModalTarget(null)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyKey === `sanction:${sanctionModalTarget.uid}` || !sanctionReason.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {busyKey === `sanction:${sanctionModalTarget.uid}`
                  ? 'Aplicando...'
                  : 'Aplicar & Notificar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LGPD DATA ERASURE MODAL */}
      {lgpdModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px]">
          <form
            onSubmit={handleExecuteLgpd}
            className="w-full max-w-lg bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div>
              <p className="text-xs font-mono text-red-700 dark:text-red-400">
                LGPD Compliance · Art. 18, VI
              </p>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                Erase Personal Data: {lgpdModalUser.displayName}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                This permanently removes the user&apos;s private email, collaborator profile,
                activity log, personal pages, and private drafts from Firestore.
              </p>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <input
                  type="radio"
                  name="lgpd-mode"
                  checked={lgpdMode === 'anonymize'}
                  onChange={() => setLgpdMode('anonymize')}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    Erase PII & Anonymize Shared Contributions (Recommended)
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Deletes all personal/private data and personal pages, and replaces the
                    user&apos;s name/UID on shared public pages, revisions, and comments with
                    &ldquo;Removed User (LGPD)&rdquo;.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <input
                  type="radio"
                  name="lgpd-mode"
                  checked={lgpdMode === 'purge'}
                  onChange={() => setLgpdMode('purge')}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <div className="font-semibold text-red-700 dark:text-red-400">
                    Complete Account & Content Purge
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Deletes all PII, profile records, comments, and permanently deletes every page
                    originally created by this user across the entire wiki.
                  </div>
                </div>
              </label>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="lgpd-confirm-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Type <span className="font-mono font-semibold">ERASE</span> to confirm permanent
                execution
              </label>
              <input
                id="lgpd-confirm-input"
                type="text"
                required
                value={lgpdConfirmText}
                onChange={(e) => setLgpdConfirmText(e.target.value)}
                placeholder="ERASE"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-700"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLgpdModalUser(null)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  busyKey === `lgpd:${lgpdModalUser.uid}` ||
                  lgpdConfirmText.trim().toUpperCase() !== 'ERASE'
                }
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-700 text-white hover:bg-red-800 disabled:opacity-50"
              >
                {busyKey === `lgpd:${lgpdModalUser.uid}`
                  ? 'Executing LGPD Erasure...'
                  : 'Execute LGPD Erasure'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
