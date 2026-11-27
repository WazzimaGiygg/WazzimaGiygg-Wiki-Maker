import React from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  GitCompare,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
} from 'lucide-react';
import {
  analyzeSockpuppetSignals,
  createSockpuppetCase,
  deleteSockpuppetCase,
  type SockpuppetSignalPair,
  updateSockpuppetCase,
} from '../lib/adminGovernanceService';
import type { AdminEditEntry, AdminUserRow } from '../lib/adminService';
import { formatAbsoluteTime, formatRelativeTime } from '../lib/markdownUtils';
import {
  type SockpuppetCase,
  type SockpuppetCaseStatus,
  VALIDATION_LIMITS,
} from '../types/wiki';

interface AdminSockpuppetPanelProps {
  currentUser: User;
  isBureaucrat: boolean;
  users: AdminUserRow[];
  recentEdits: AdminEditEntry[];
  cases: SockpuppetCase[];
  onSelectPage: (slug: string) => void;
  onBlockUser: (target: { uid: string; displayName: string }) => void;
  onReloadCases: () => Promise<void>;
  onFeedback: (msg: string) => void;
  onError: (msg: string) => void;
}

const STATUS_STYLE: Record<SockpuppetCaseStatus, string> = {
  open: 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/35 text-amber-800 dark:text-amber-300',
  confirmed:
    'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/35 text-red-700 dark:text-red-300',
  inconclusive:
    'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  dismissed:
    'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-300',
};

const CONFIDENCE_STYLE = {
  high: 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/35 text-red-700 dark:text-red-300',
  medium:
    'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/35 text-amber-800 dark:text-amber-300',
  low: 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
};

export const AdminSockpuppetPanel: React.FC<AdminSockpuppetPanelProps> = ({
  currentUser,
  isBureaucrat,
  users,
  recentEdits,
  cases,
  onSelectPage,
  onBlockUser,
  onReloadCases,
  onFeedback,
  onError,
}) => {
  const [subTab, setSubTab] = React.useState<'scanner' | 'compare' | 'cases'>('scanner');
  const [caseSearch, setCaseSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | SockpuppetCaseStatus>('all');

  // Side-by-side manual account comparator
  const [compareUidA, setCompareUidA] = React.useState<string>('');
  const [compareUidB, setCompareUidB] = React.useState<string>('');

  // Create/Edit case modal
  const [caseModalOpen, setCaseModalOpen] = React.useState(false);
  const [editingCase, setEditingCase] = React.useState<SockpuppetCase | null>(null);
  const [caseTitle, setCaseTitle] = React.useState('');
  const [caseMasterUid, setCaseMasterUid] = React.useState('');
  const [caseSuspectUids, setCaseSuspectUids] = React.useState<string[]>([]);
  const [caseEvidence, setCaseEvidence] = React.useState('');
  const [caseStatus, setCaseStatus] = React.useState<SockpuppetCaseStatus>('open');
  const [caseResolutionNotes, setCaseResolutionNotes] = React.useState('');
  const [savingCase, setSavingCase] = React.useState(false);
  const [busyCaseId, setBusyCaseId] = React.useState<string | null>(null);

  const userByUid = React.useMemo(() => {
    const map = new Map<string, AdminUserRow>();
    for (const u of users) map.set(u.uid, u);
    return map;
  }, [users]);

  const signalPairs = React.useMemo(
    () => analyzeSockpuppetSignals(users, recentEdits),
    [users, recentEdits]
  );

  const editsByUser = React.useMemo(() => {
    const map = new Map<string, AdminEditEntry[]>();
    for (const edit of recentEdits) {
      const list = map.get(edit.editorId) ?? [];
      list.push(edit);
      map.set(edit.editorId, list);
    }
    return map;
  }, [recentEdits]);

  const comparisonResult = React.useMemo(() => {
    if (!compareUidA || !compareUidB || compareUidA === compareUidB) return null;
    const uA = userByUid.get(compareUidA);
    const uB = userByUid.get(compareUidB);
    if (!uA || !uB) return null;
    const editsA = editsByUser.get(uA.uid) ?? [];
    const editsB = editsByUser.get(uB.uid) ?? [];
    const pagesA = new Map<string, AdminEditEntry[]>();
    for (const e of editsA) {
      const list = pagesA.get(e.pageSlug) ?? [];
      list.push(e);
      pagesA.set(e.pageSlug, list);
    }
    const sharedPages: Array<{
      slug: string;
      title: string;
      countA: number;
      countB: number;
      minGapMinutes: number | null;
    }> = [];
    const seen = new Set<string>();
    for (const eB of editsB) {
      if (seen.has(eB.pageSlug)) continue;
      const listA = pagesA.get(eB.pageSlug);
      if (!listA) continue;
      seen.add(eB.pageSlug);
      const listB = editsB.filter((x) => x.pageSlug === eB.pageSlug);
      let minGapMs: number | null = null;
      for (const aItem of listA) {
        for (const bItem of listB) {
          const ta = aItem.createdAt?.toMillis() ?? 0;
          const tb = bItem.createdAt?.toMillis() ?? 0;
          if (ta > 0 && tb > 0) {
            const diff = Math.abs(ta - tb);
            if (minGapMs === null || diff < minGapMs) minGapMs = diff;
          }
        }
      }
      sharedPages.push({
        slug: eB.pageSlug,
        title: eB.pageTitle,
        countA: listA.length,
        countB: listB.length,
        minGapMinutes: minGapMs !== null ? Math.round(minGapMs / 60000) : null,
      });
    }
    return { uA, uB, editsA, editsB, sharedPages };
  }, [compareUidA, compareUidB, userByUid, editsByUser]);

  const filteredCases = React.useMemo(() => {
    const q = caseSearch.trim().toLowerCase();
    return cases.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      const masterName = userByUid.get(c.masterUid)?.displayName.toLowerCase() ?? '';
      return (
        c.title.toLowerCase().includes(q) ||
        c.evidenceSummary.toLowerCase().includes(q) ||
        c.masterUid.toLowerCase().includes(q) ||
        masterName.includes(q) ||
        c.suspectedUids.some((id) => id.toLowerCase().includes(q))
      );
    });
  }, [cases, caseSearch, statusFilter, userByUid]);

  const openNewCaseFromPair = (pair?: SockpuppetSignalPair) => {
    setEditingCase(null);
    if (pair) {
      setCaseTitle(`Verification: ${pair.userA.displayName} & ${pair.userB.displayName}`);
      setCaseMasterUid(pair.userA.uid);
      setCaseSuspectUids([pair.userB.uid]);
      setCaseEvidence(
        [
          `Automated Check Signals (score ${pair.score}):`,
          ...pair.reasons.map((r) => `- ${r}`),
          pair.sharedPages.length > 0
            ? `Shared pages: ${pair.sharedPages.map((s) => `:${s}`).join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      );
    } else {
      const defaultFirst = users[0]?.uid ?? '';
      const defaultSecond = users[1]?.uid ?? '';
      setCaseTitle('');
      setCaseMasterUid(defaultFirst);
      setCaseSuspectUids(defaultSecond ? [defaultSecond] : []);
      setCaseEvidence('');
    }
    setCaseStatus('open');
    setCaseResolutionNotes('');
    setCaseModalOpen(true);
  };

  const openEditCase = (item: SockpuppetCase) => {
    setEditingCase(item);
    setCaseTitle(item.title);
    setCaseMasterUid(item.masterUid);
    setCaseSuspectUids(item.suspectedUids);
    setCaseEvidence(item.evidenceSummary);
    setCaseStatus(item.status);
    setCaseResolutionNotes(item.resolutionNotes);
    setCaseModalOpen(true);
  };

  const toggleSuspectUid = (uid: string) => {
    if (uid === caseMasterUid) return;
    setCaseSuspectUids((prev) => {
      if (prev.includes(uid)) return prev.filter((id) => id !== uid);
      if (prev.length >= VALIDATION_LIMITS.SOCKPUPPET_SUSPECTS_MAX_COUNT) return prev;
      return [...prev, uid];
    });
  };

  const handleSaveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseMasterUid || caseSuspectUids.length === 0) {
      onError('Select a primary (master) account and at least one suspected alternate account.');
      return;
    }
    setSavingCase(true);
    try {
      if (editingCase) {
        await updateSockpuppetCase(
          editingCase.id,
          {
            title: caseTitle,
            masterUid: caseMasterUid,
            suspectedUids: caseSuspectUids,
            evidenceSummary: caseEvidence,
            status: caseStatus,
            resolutionNotes: caseResolutionNotes,
          },
          currentUser
        );
        onFeedback(`Updated sockpuppet verification case "${caseTitle}".`);
      } else {
        await createSockpuppetCase({
          title: caseTitle,
          masterUid: caseMasterUid,
          suspectedUids: caseSuspectUids,
          evidenceSummary: caseEvidence,
          status: caseStatus,
          resolutionNotes: caseResolutionNotes,
          actor: currentUser,
        });
        onFeedback(`Opened new sockpuppet investigation case "${caseTitle}".`);
      }
      setCaseModalOpen(false);
      await onReloadCases();
      setSubTab('cases');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save verification case.');
    } finally {
      setSavingCase(false);
    }
  };

  const handleDeleteCase = async (item: SockpuppetCase) => {
    if (!isBureaucrat) return;
    setBusyCaseId(item.id);
    try {
      await deleteSockpuppetCase(item.id);
      onFeedback(`Deleted verification case "${item.title}".`);
      await onReloadCases();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete verification case.');
    } finally {
      setBusyCaseId(null);
    }
  };

  const openCasesCount = cases.filter((c) => c.status === 'open').length;

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17]">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
            <UserCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <span>Account Verification &amp; Sockpuppet Investigation (SPI)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Detect duplicate or block-evading accounts by correlating private email aliases, shared
            page edits, synchronized editing bursts, and handle patterns. Document formal cases and
            enforce blocks when sockpuppetry is confirmed.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openNewCaseFromPair()}
          disabled={users.length < 2}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Investigation Case</span>
        </button>
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setSubTab('scanner')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            subTab === 'scanner'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <FileSearch className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
          <span>Automated Signals ({signalPairs.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('compare')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            subTab === 'compare'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
          <span>Compare Two Accounts</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('cases')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            subTab === 'cases'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
          <span>
            Investigation Cases ({cases.length}
            {openCasesCount > 0 ? ` · ${openCasesCount} open` : ''})
          </span>
        </button>
      </div>

      {/* SUBTAB 1: AUTOMATED SIGNALS */}
      {subTab === 'scanner' && (
        <div className="space-y-3">
          {signalPairs.length === 0 ? (
            <div className="py-12 px-4 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17] space-y-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                No automated sockpuppet correlation signals detected
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Use &ldquo;Compare Two Accounts&rdquo; to manually inspect any pair of collaborators,
                or open a manual investigation case above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {signalPairs.map((pair) => (
                <div
                  key={pair.pairKey}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide rounded-md border ${CONFIDENCE_STYLE[pair.confidence]}`}
                        >
                          {pair.confidence} signal · {pair.score} pts
                        </span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {pair.userA.displayName}
                        </span>
                        <span className="text-xs text-slate-400">↔</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {pair.userB.displayName}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-0.5">
                        <span>
                          A: {pair.userA.email ?? 'no-email'} ({pair.userA.editCount} edits
                          {pair.userA.blocked ? ' · BLOCKED' : ''})
                        </span>
                        <span>
                          B: {pair.userB.email ?? 'no-email'} ({pair.userB.editCount} edits
                          {pair.userB.blocked ? ' · BLOCKED' : ''})
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setCompareUidA(pair.userA.uid);
                          setCompareUidB(pair.userB.uid);
                          setSubTab('compare');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                        <span>Compare</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openNewCaseFromPair(pair)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-blue-700 text-white hover:bg-blue-800 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Open Case</span>
                      </button>
                    </div>
                  </div>

                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 pl-4 list-disc">
                    {pair.reasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>

                  {pair.sharedPages.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-medium">Shared articles:</span>
                      {pair.sharedPages.slice(0, 8).map((slug) => (
                        <button
                          key={slug}
                          type="button"
                          onClick={() => onSelectPage(slug)}
                          className="font-mono px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1623] text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          :{slug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: COMPARE TWO ACCOUNTS */}
      {subTab === 'compare' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17]">
            <div className="space-y-1.5">
              <label
                htmlFor="spi-compare-a"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Account A (Suspected Master)
              </label>
              <select
                id="spi-compare-a"
                value={compareUidA}
                onChange={(e) => setCompareUidA(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              >
                <option value="">Select first account...</option>
                {users.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName} ({u.email ?? u.uid.slice(0, 10)})
                    {u.blocked ? ' [BLOCKED]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="spi-compare-b"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Account B (Suspected Sockpuppet)
              </label>
              <select
                id="spi-compare-b"
                value={compareUidB}
                onChange={(e) => setCompareUidB(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              >
                <option value="">Select second account...</option>
                {users.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName} ({u.email ?? u.uid.slice(0, 10)})
                    {u.blocked ? ' [BLOCKED]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!comparisonResult ? (
            <div className="py-10 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17] text-xs text-slate-500 dark:text-slate-400">
              Select two distinct collaborator accounts above to inspect private PII metadata, page
              overlaps, and revision timestamps side-by-side.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[comparisonResult.uA, comparisonResult.uB].map((account, idx) => (
                  <div
                    key={account.uid}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {idx === 0 ? 'Account A' : 'Account B'} · {account.role}
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {account.displayName}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-medium rounded-md border ${
                          account.blocked
                            ? 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/35 text-red-700 dark:text-red-300'
                            : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {account.blocked ? 'Blocked' : 'Active'}
                      </span>
                    </div>

                    <dl className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500 dark:text-slate-400">Email (PII):</dt>
                        <dd className="font-mono">{account.email ?? '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500 dark:text-slate-400">UID:</dt>
                        <dd className="font-mono truncate max-w-[200px]">{account.uid}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500 dark:text-slate-400">Registered:</dt>
                        <dd className="font-mono">
                          {account.createdAt ? formatAbsoluteTime(account.createdAt) : '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500 dark:text-slate-400">Pages / Edits:</dt>
                        <dd className="font-mono tabular-nums">
                          {account.pageCount} / {account.editCount}
                        </dd>
                      </div>
                    </dl>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      {account.personalPageSlug && (
                        <button
                          type="button"
                          onClick={() => onSelectPage(account.personalPageSlug!)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>User page</span>
                        </button>
                      )}
                      {!account.blocked &&
                        !account.isBootstrappedOwner &&
                        account.uid !== currentUser.uid &&
                        (isBureaucrat || account.role === 'member') && (
                          <button
                            type="button"
                            onClick={() =>
                              onBlockUser({ uid: account.uid, displayName: account.displayName })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Block account</span>
                          </button>
                        )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17]">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f1623] flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Shared Page Editing Overlap ({comparisonResult.sharedPages.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCase(null);
                      setCaseTitle(
                        `Verification: ${comparisonResult.uA.displayName} & ${comparisonResult.uB.displayName}`
                      );
                      setCaseMasterUid(comparisonResult.uA.uid);
                      setCaseSuspectUids([comparisonResult.uB.uid]);
                      setCaseEvidence(
                        `Manual comparison between ${comparisonResult.uA.displayName} and ${comparisonResult.uB.displayName}. Shared edited pages: ${comparisonResult.sharedPages.length}.`
                      );
                      setCaseStatus('open');
                      setCaseResolutionNotes('');
                      setCaseModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-700 text-white hover:bg-blue-800 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>File Investigation Case</span>
                  </button>
                </div>

                {comparisonResult.sharedPages.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    These two accounts have not edited any shared pages.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <th className="py-2 px-4">Article</th>
                        <th className="py-2 px-4 text-right">
                          {comparisonResult.uA.displayName} edits
                        </th>
                        <th className="py-2 px-4 text-right">
                          {comparisonResult.uB.displayName} edits
                        </th>
                        <th className="py-2 px-4 text-right">Closest edit gap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {comparisonResult.sharedPages.map((row) => (
                        <tr key={row.slug}>
                          <td className="py-2.5 px-4">
                            <button
                              type="button"
                              onClick={() => onSelectPage(row.slug)}
                              className="font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              {row.title}
                            </button>{' '}
                            <span className="font-mono text-slate-400">:{row.slug}</span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                            {row.countA}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                            {row.countB}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                            {row.minGapMinutes !== null ? `${row.minGapMinutes} min` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: SAVED INVESTIGATION CASES */}
      {subTab === 'cases' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
              {(['all', 'open', 'confirmed', 'inconclusive', 'dismissed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={caseSearch}
                onChange={(e) => setCaseSearch(e.target.value)}
                placeholder="Filter cases by title, UID, or evidence..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>

          {filteredCases.length === 0 ? (
            <div className="py-12 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17] text-xs text-slate-500 dark:text-slate-400">
              No sockpuppet investigation cases match the current filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCases.map((item) => {
                const master = userByUid.get(item.masterUid);
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[11px] font-semibold uppercase rounded-md border ${STATUS_STYLE[item.status]}`}
                          >
                            {item.status}
                          </span>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {item.title}
                          </h3>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Primary account:{' '}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {master?.displayName ?? item.masterUid}
                          </strong>{' '}
                          · Filed by {item.createdByName} · Updated{' '}
                          {formatRelativeTime(item.updatedAt)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditCase(item)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Update / Verdict
                        </button>
                        {isBureaucrat && (
                          <button
                            type="button"
                            disabled={busyCaseId === item.id}
                            onClick={() => void handleDeleteCase(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0f1623] text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {item.evidenceSummary}
                    </div>

                    {item.resolutionNotes && (
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-800 dark:text-slate-200">
                          Resolution notes:
                        </strong>{' '}
                        {item.resolutionNotes}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Suspected accounts:
                      </span>
                      {item.suspectedUids.map((uid) => {
                        const suspect = userByUid.get(uid);
                        const canBlock =
                          suspect &&
                          !suspect.blocked &&
                          !suspect.isBootstrappedOwner &&
                          suspect.uid !== currentUser.uid &&
                          (isBureaucrat || suspect.role === 'member');
                        return (
                          <span
                            key={uid}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1623]"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {suspect?.displayName ?? uid}
                            </span>
                            {suspect?.blocked ? (
                              <span className="text-[11px] text-red-700 dark:text-red-400 font-medium">
                                (Blocked)
                              </span>
                            ) : (
                              canBlock && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onBlockUser({
                                      uid: suspect.uid,
                                      displayName: suspect.displayName,
                                    })
                                  }
                                  className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-medium cursor-pointer"
                                >
                                  Block
                                </button>
                              )
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE / UPDATE INVESTIGATION CASE MODAL */}
      {caseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px]">
          <form
            onSubmit={handleSaveCase}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div>
              <p className="text-xs font-mono text-blue-700 dark:text-blue-400">
                Account Verification · Sockpuppet Investigation
              </p>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {editingCase ? 'Update Investigation Case' : 'Open Sockpuppet Investigation Case'}
              </h2>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="spi-case-title"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Case title
              </label>
              <input
                id="spi-case-title"
                type="text"
                required
                maxLength={VALIDATION_LIMITS.TITLE_MAX_LENGTH}
                value={caseTitle}
                onChange={(e) => setCaseTitle(e.target.value)}
                placeholder="e.g., Suspected duplicate accounts editing :MainPage"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="spi-master-uid"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Primary / Master Account
                </label>
                <select
                  id="spi-master-uid"
                  required
                  value={caseMasterUid}
                  onChange={(e) => {
                    const nextMaster = e.target.value;
                    setCaseMasterUid(nextMaster);
                    setCaseSuspectUids((prev) => prev.filter((id) => id !== nextMaster));
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                >
                  <option value="">Select primary account...</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName} ({u.email ?? u.uid.slice(0, 8)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="spi-case-status"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Case status / verdict
                </label>
                <select
                  id="spi-case-status"
                  value={caseStatus}
                  onChange={(e) => setCaseStatus(e.target.value as SockpuppetCaseStatus)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                >
                  <option value="open">Open (Under Investigation)</option>
                  <option value="confirmed">Confirmed Sockpuppetry</option>
                  <option value="inconclusive">Inconclusive</option>
                  <option value="dismissed">Dismissed / Unrelated</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Suspected Alternate Accounts (up to {VALIDATION_LIMITS.SOCKPUPPET_SUSPECTS_MAX_COUNT})
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {caseSuspectUids.length} selected
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f17] grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {users
                  .filter((u) => u.uid !== caseMasterUid)
                  .map((u) => {
                    const checked = caseSuspectUids.includes(u.uid);
                    return (
                      <label
                        key={u.uid}
                        className="flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/70"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSuspectUid(u.uid)}
                        />
                        <span className="truncate text-slate-800 dark:text-slate-200">
                          {u.displayName}
                          {u.blocked ? ' [BLOCKED]' : ''}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="spi-evidence"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Behavioral &amp; account evidence summary
              </label>
              <textarea
                id="spi-evidence"
                required
                rows={4}
                maxLength={VALIDATION_LIMITS.SOCKPUPPET_EVIDENCE_MAX_LENGTH}
                value={caseEvidence}
                onChange={(e) => setCaseEvidence(e.target.value)}
                placeholder="Document overlapping edits, email domain/alias matches, timing correlations..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="spi-resolution"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Resolution / CheckUser notes (optional)
              </label>
              <textarea
                id="spi-resolution"
                rows={2}
                maxLength={VALIDATION_LIMITS.SOCKPUPPET_RESOLUTION_MAX_LENGTH}
                value={caseResolutionNotes}
                onChange={(e) => setCaseResolutionNotes(e.target.value)}
                placeholder="Summary of administrative conclusion or actions applied..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>

            {caseStatus === 'confirmed' && (
              <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  After saving as Confirmed, use the Block buttons on the case card to suspend
                  confirmed sockpuppet accounts and post automated block notices.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCaseModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCase || !caseTitle.trim() || !caseEvidence.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
              >
                {savingCase ? 'Saving...' : editingCase ? 'Save Changes' : 'Create Case'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
