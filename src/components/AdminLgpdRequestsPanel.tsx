import React from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Clock,
  Plus,
  ShieldCheck,
  Trash2,
  UserX,
  XCircle,
} from 'lucide-react';
import {
  deleteLgpdRequest,
  submitLgpdRequest,
  updateLgpdRequestStatus,
} from '../lib/adminGovernanceService';
import { type AdminUserRow, executeLgpdUserRemoval } from '../lib/adminService';
import { LEGAL_GOVERNANCE } from '../lib/legalConfig';
import { formatAbsoluteTime, formatRelativeTime } from '../lib/markdownUtils';
import {
  type LgpdErasureLog,
  type LgpdRequest,
  type LgpdRequestStatus,
  type LgpdRequestType,
  VALIDATION_LIMITS,
} from '../types/wiki';

interface AdminLgpdRequestsPanelProps {
  currentUser: User;
  isBureaucrat: boolean;
  users: AdminUserRow[];
  requests: LgpdRequest[];
  lgpdLogs: LgpdErasureLog[];
  onReloadData: () => Promise<void>;
  onFeedback: (msg: string) => void;
  onError: (msg: string) => void;
}

const REQUEST_STATUS_STYLE: Record<LgpdRequestStatus, string> = {
  pending:
    'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/35 text-amber-800 dark:text-amber-300',
  'in-review':
    'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/35 text-blue-800 dark:text-blue-300',
  completed:
    'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-300',
  rejected:
    'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/35 text-red-700 dark:text-red-300',
};

const REQUEST_TYPE_LABELS: Record<LgpdRequestType, string> = {
  anonymize: 'Anonymize + Erase PII',
  purge: 'Complete Account & Content Purge',
  access: 'Data Access / Export',
  correction: 'Data Correction',
};

export const AdminLgpdRequestsPanel: React.FC<AdminLgpdRequestsPanelProps> = ({
  currentUser,
  isBureaucrat,
  users,
  requests,
  lgpdLogs,
  onReloadData,
  onFeedback,
  onError,
}) => {
  const [statusFilter, setStatusFilter] = React.useState<'all' | LgpdRequestStatus>('all');
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // Manual DPO intake modal
  const [intakeOpen, setIntakeOpen] = React.useState(false);
  const [intakeUid, setIntakeUid] = React.useState('');
  const [intakeType, setIntakeType] = React.useState<LgpdRequestType>('anonymize');
  const [intakeDetails, setIntakeDetails] = React.useState('');
  const [submittingIntake, setSubmittingIntake] = React.useState(false);

  // Review/resolve modal
  const [resolveTarget, setResolveTarget] = React.useState<LgpdRequest | null>(null);
  const [resolveAction, setResolveAction] = React.useState<'in-review' | 'completed' | 'rejected'>(
    'completed'
  );
  const [resolveNote, setResolveNote] = React.useState('');
  const [executeErasureNow, setExecuteErasureNow] = React.useState(false);
  const [confirmWord, setConfirmWord] = React.useState('');

  const userByUid = React.useMemo(() => {
    const map = new Map<string, AdminUserRow>();
    for (const u of users) map.set(u.uid, u);
    return map;
  }, [users]);

  const filteredRequests = React.useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  const pendingCount = requests.filter(
    (r) => r.status === 'pending' || r.status === 'in-review'
  ).length;

  const handleCreateIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedUser = userByUid.get(intakeUid);
    if (!selectedUser) {
      onError('Select a valid collaborator account for the LGPD request.');
      return;
    }
    setSubmittingIntake(true);
    try {
      await submitLgpdRequest({
        requesterUid: selectedUser.uid,
        requesterName: selectedUser.displayName,
        requestType: intakeType,
        details: intakeDetails,
      });
      onFeedback(`Logged LGPD request for ${selectedUser.displayName}.`);
      setIntakeOpen(false);
      setIntakeDetails('');
      await onReloadData();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to log LGPD request.');
    } finally {
      setSubmittingIntake(false);
    }
  };

  const openResolveModal = (
    req: LgpdRequest,
    action: 'in-review' | 'completed' | 'rejected'
  ) => {
    setResolveTarget(req);
    setResolveAction(action);
    setResolveNote(req.resolutionNote || '');
    setExecuteErasureNow(
      action === 'completed' && (req.requestType === 'anonymize' || req.requestType === 'purge')
    );
    setConfirmWord('');
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTarget) return;

    const needsErasure =
      resolveAction === 'completed' &&
      executeErasureNow &&
      (resolveTarget.requestType === 'anonymize' || resolveTarget.requestType === 'purge');

    if (needsErasure && confirmWord.trim().toUpperCase() !== 'ERASE') {
      return;
    }

    setBusyId(resolveTarget.id);
    try {
      let noteToSave = resolveNote.trim();
      if (needsErasure) {
        const erasureMode = resolveTarget.requestType === 'purge' ? 'purge' : 'anonymize';
        const res = await executeLgpdUserRemoval(
          resolveTarget.requesterUid,
          erasureMode,
          currentUser,
          isBureaucrat
        );
        noteToSave = noteToSave ? `${noteToSave} (${res.summary})` : res.summary;
      }

      await updateLgpdRequestStatus(
        resolveTarget.id,
        resolveAction,
        noteToSave || `Request marked as ${resolveAction} by DPO/administration.`,
        currentUser
      );

      onFeedback(
        needsErasure
          ? `Executed LGPD erasure and completed request for ${resolveTarget.requesterName}.`
          : `Updated LGPD request for ${resolveTarget.requesterName} to "${resolveAction}".`
      );
      setResolveTarget(null);
      await onReloadData();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to process LGPD request.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteRequest = async (req: LgpdRequest) => {
    if (!isBureaucrat) return;
    setBusyId(req.id);
    try {
      await deleteLgpdRequest(req.id);
      onFeedback(`Removed LGPD request record for ${req.requesterName}.`);
      await onReloadData();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to delete LGPD request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* DPO Governance Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17] text-xs">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
            <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <span>LGPD Requests Queue &amp; Compliance Audit (Art. 18, Law No. 13.709/2018)</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Review data subject requests submitted through the Privacy Portal or logged by the DPO (
            <strong>{LEGAL_GOVERNANCE.dpoName}</strong> ·{' '}
            <a
              href={`mailto:${LEGAL_GOVERNANCE.dpoEmail}`}
              className="font-mono text-blue-700 dark:text-blue-400 hover:underline"
            >
              {LEGAL_GOVERNANCE.dpoEmail}
            </a>
            ).
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIntakeUid(users.find((u) => !u.isBootstrappedOwner)?.uid ?? users[0]?.uid ?? '');
            setIntakeType('anonymize');
            setIntakeDetails('');
            setIntakeOpen(true);
          }}
          disabled={users.length === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log DPO Request</span>
        </button>
      </div>

      {/* Section 1: Incoming LGPD Requests */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Incoming LGPD Requests ({requests.length}
            {pendingCount > 0 ? ` · ${pendingCount} active` : ''})
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
            {(['all', 'pending', 'in-review', 'completed', 'rejected'] as const).map((st) => (
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
        </div>

        {filteredRequests.length === 0 ? (
          <div className="py-10 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17] text-xs text-slate-500 dark:text-slate-400">
            No LGPD requests match the selected status filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((req) => {
              const matchedUser = userByUid.get(req.requesterUid);
              const isLockedTarget =
                matchedUser?.isBootstrappedOwner || req.requesterUid === currentUser.uid;
              const isClosed = req.status === 'completed' || req.status === 'rejected';
              const canEdit = !isClosed || isBureaucrat;

              return (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[11px] font-semibold uppercase rounded-md border ${REQUEST_STATUS_STYLE[req.status]}`}
                        >
                          {req.status}
                        </span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {req.requesterName}
                        </span>
                        <span className="px-2 py-0.5 text-[11px] font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f1623] text-slate-700 dark:text-slate-300">
                          {REQUEST_TYPE_LABELS[req.requestType]}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        UID: {req.requesterUid}
                        {matchedUser?.email ? ` · ${matchedUser.email}` : ''} · Submitted{' '}
                        {formatRelativeTime(req.createdAt)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {canEdit && req.status === 'pending' && (
                        <button
                          type="button"
                          disabled={busyId === req.id}
                          onClick={() => openResolveModal(req, 'in-review')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Mark In Review</span>
                        </button>
                      )}

                      {canEdit && !isLockedTarget && (
                        <button
                          type="button"
                          disabled={busyId === req.id}
                          onClick={() => openResolveModal(req, 'completed')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>
                            {req.requestType === 'anonymize' || req.requestType === 'purge'
                              ? 'Process & Execute'
                              : 'Complete'}
                          </span>
                        </button>
                      )}

                      {canEdit && (
                        <button
                          type="button"
                          disabled={busyId === req.id}
                          onClick={() => openResolveModal(req, 'rejected')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      )}

                      {isBureaucrat && (
                        <button
                          type="button"
                          disabled={busyId === req.id}
                          onClick={() => void handleDeleteRequest(req)}
                          title="Delete LGPD request record"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0f1623] whitespace-pre-wrap">
                    {req.details}
                  </p>

                  {req.resolutionNote && (
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      <strong className="text-slate-800 dark:text-slate-200">
                        Resolution ({req.reviewedByName || 'Administration'}):
                      </strong>{' '}
                      {req.resolutionNote}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2: Immutable LGPD Audit Log */}
      <section className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Immutable LGPD Erasure Audit Log ({lgpdLogs.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Permanent audit trail of executed anonymization and purge actions without retaining
            deleted personal data ({LEGAL_GOVERNANCE.marcoCivilLaw}).
          </p>
        </div>

        {lgpdLogs.length === 0 ? (
          <div className="py-10 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17] text-xs text-slate-500 dark:text-slate-400">
            No LGPD data erasure executions have been logged yet.
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
                  {lgpdLogs.map((log) => (
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
      </section>

      {/* LOG EXTERNAL DPO REQUEST MODAL */}
      {intakeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px]">
          <form
            onSubmit={handleCreateIntake}
            className="w-full max-w-md bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div>
              <p className="text-xs font-mono text-blue-700 dark:text-blue-400">
                LGPD Intake · DPO Queue
              </p>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                Log Formal LGPD Request
              </h2>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="lgpd-intake-uid"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Data Subject Account
              </label>
              <select
                id="lgpd-intake-uid"
                required
                value={intakeUid}
                onChange={(e) => setIntakeUid(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              >
                {users.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName} ({u.email ?? u.uid.slice(0, 8)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="lgpd-intake-type"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Request Type (Art. 18, LGPD)
              </label>
              <select
                id="lgpd-intake-type"
                value={intakeType}
                onChange={(e) => setIntakeType(e.target.value as LgpdRequestType)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              >
                <option value="anonymize">Anonymize + Erase PII</option>
                <option value="purge">Complete Account &amp; Content Purge</option>
                <option value="access">Data Access / Export Review</option>
                <option value="correction">Data Correction</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="lgpd-intake-details"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Request details / DPO reference
              </label>
              <textarea
                id="lgpd-intake-details"
                required
                rows={3}
                maxLength={VALIDATION_LIMITS.LGPD_REQUEST_DETAILS_MAX_LENGTH}
                value={intakeDetails}
                onChange={(e) => setIntakeDetails(e.target.value)}
                placeholder="Summarize the user's formal LGPD request..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIntakeOpen(false)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingIntake || !intakeDetails.trim()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
              >
                {submittingIntake ? 'Saving...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REVIEW / PROCESS LGPD REQUEST MODAL */}
      {resolveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px]">
          <form
            onSubmit={handleConfirmResolve}
            className="w-full max-w-md bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div>
              <p className="text-xs font-mono text-blue-700 dark:text-blue-400">
                LGPD Request Resolution · {REQUEST_TYPE_LABELS[resolveTarget.requestType]}
              </p>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {resolveAction === 'completed'
                  ? `Complete Request: ${resolveTarget.requesterName}`
                  : resolveAction === 'rejected'
                  ? `Reject Request: ${resolveTarget.requesterName}`
                  : `Move to Review: ${resolveTarget.requesterName}`}
              </h2>
            </div>

            {resolveAction === 'completed' &&
              (resolveTarget.requestType === 'anonymize' ||
                resolveTarget.requestType === 'purge') && (
                <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 space-y-2.5 text-xs">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={executeErasureNow}
                      onChange={(e) => setExecuteErasureNow(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span className="text-red-900 dark:text-red-200">
                      <strong>
                        Execute{' '}
                        {resolveTarget.requestType === 'purge'
                          ? 'Full Account & Content Purge'
                          : 'PII Erasure & Anonymization'}{' '}
                        now
                      </strong>{' '}
                      and write an entry to the immutable LGPD audit log.
                    </span>
                  </label>

                  {executeErasureNow && (
                    <div className="space-y-1">
                      <label
                        htmlFor="lgpd-req-erase-confirm"
                        className="block font-medium text-red-800 dark:text-red-300"
                      >
                        Type <span className="font-mono font-bold">ERASE</span> to confirm
                        permanent execution:
                      </label>
                      <input
                        id="lgpd-req-erase-confirm"
                        type="text"
                        required
                        value={confirmWord}
                        onChange={(e) => setConfirmWord(e.target.value)}
                        placeholder="ERASE"
                        className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  )}
                </div>
              )}

            <div className="space-y-1.5">
              <label
                htmlFor="lgpd-resolve-note"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Resolution / DPO note
              </label>
              <textarea
                id="lgpd-resolve-note"
                required={resolveAction === 'rejected'}
                rows={3}
                maxLength={VALIDATION_LIMITS.LGPD_REQUEST_RESOLUTION_MAX_LENGTH}
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="Document the administrative decision or action taken..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolveTarget(null)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  busyId === resolveTarget.id ||
                  (resolveAction === 'completed' &&
                    executeErasureNow &&
                    (resolveTarget.requestType === 'anonymize' ||
                      resolveTarget.requestType === 'purge') &&
                    confirmWord.trim().toUpperCase() !== 'ERASE')
                }
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white disabled:opacity-50 cursor-pointer ${
                  resolveAction === 'rejected'
                    ? 'bg-red-700 hover:bg-red-800'
                    : 'bg-blue-700 hover:bg-blue-800'
                }`}
              >
                {executeErasureNow && resolveAction === 'completed' && (
                  <UserX className="w-3.5 h-3.5" />
                )}
                <span>{busyId === resolveTarget.id ? 'Processing...' : 'Confirm'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
