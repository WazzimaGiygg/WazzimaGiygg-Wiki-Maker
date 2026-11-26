import React from 'react';
import type { User } from 'firebase/auth';
import {
  Check,
  Database,
  Puzzle,
  RotateCcw,
  Save,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  EXTENSION_CATEGORY_LABELS,
  EXTENSION_SETTING_DESCRIPTORS,
  type SiteExtensionsState,
  saveExtensionConfigAsBureaucrat,
  syncAllExtensionsAsBureaucrat,
} from '../lib/extensionsService';
import { formatAbsoluteTime, formatRelativeTime } from '../lib/markdownUtils';
import type {
  ResolvedWikiExtension,
  WikiExtensionCategory,
  WikiExtensionId,
  WikiExtensionSettings,
} from '../types/wiki';

interface ExtensionsManagerPanelProps {
  currentUser: User;
  isBureaucrat: boolean;
  extensionsState: SiteExtensionsState;
}

interface ExtensionDraft {
  enabled: boolean;
  settings: WikiExtensionSettings;
}

function areSettingsEqual(a: WikiExtensionSettings, b: WikiExtensionSettings): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<
    keyof WikiExtensionSettings
  >;
  for (const key of keys) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

export const ExtensionsManagerPanel: React.FC<ExtensionsManagerPanelProps> = ({
  currentUser,
  isBureaucrat,
  extensionsState,
}) => {
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<'all' | WikiExtensionCategory>('all');
  const [drafts, setDrafts] = React.useState<Record<string, ExtensionDraft>>({});
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = React.useState<string | null>(null);

  // Sync pristine drafts whenever Firestore extension state updates
  React.useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, ExtensionDraft> = {};
      for (const ext of extensionsState.list) {
        const existing = prev[ext.id];
        if (existing) {
          next[ext.id] = existing;
        } else {
          next[ext.id] = {
            enabled: ext.enabled,
            settings: { ...ext.settings },
          };
        }
      }
      return next;
    });
  }, [extensionsState.list]);

  const getDraft = (ext: ResolvedWikiExtension): ExtensionDraft => {
    return (
      drafts[ext.id] ?? {
        enabled: ext.enabled,
        settings: { ...ext.settings },
      }
    );
  };

  const isExtDirty = (ext: ResolvedWikiExtension): boolean => {
    const draft = drafts[ext.id];
    if (!draft) return false;
    return draft.enabled !== ext.enabled || !areSettingsEqual(draft.settings, ext.settings);
  };

  const updateDraftSetting = (
    ext: ResolvedWikiExtension,
    key: keyof WikiExtensionSettings,
    value: boolean | number | string
  ) => {
    const current = getDraft(ext);
    setDrafts((prev) => ({
      ...prev,
      [ext.id]: {
        enabled: current.enabled,
        settings: {
          ...current.settings,
          [key]: value,
        },
      },
    }));
  };

  const discardDraft = (ext: ResolvedWikiExtension) => {
    setDrafts((prev) => ({
      ...prev,
      [ext.id]: {
        enabled: ext.enabled,
        settings: { ...ext.settings },
      },
    }));
  };

  const handleToggleExtension = async (ext: ResolvedWikiExtension) => {
    if (!isBureaucrat) return;
    const current = getDraft(ext);
    const nextEnabled = !current.enabled;

    setDrafts((prev) => ({
      ...prev,
      [ext.id]: {
        enabled: nextEnabled,
        settings: { ...current.settings },
      },
    }));

    setBusyKey(`ext:${ext.id}`);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      await saveExtensionConfigAsBureaucrat(
        {
          id: ext.id,
          enabled: nextEnabled,
          settings: current.settings,
        },
        currentUser
      );
      setDrafts((prev) => ({
        ...prev,
        [ext.id]: {
          enabled: nextEnabled,
          settings: { ...current.settings },
        },
      }));
      setFeedbackMsg(
        `Extension "${ext.name}" ${nextEnabled ? 'enabled' : 'disabled'} and saved to Firebase.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save extension state.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveExtension = async (ext: ResolvedWikiExtension) => {
    if (!isBureaucrat) return;
    const draft = getDraft(ext);
    setBusyKey(`save:${ext.id}`);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      await saveExtensionConfigAsBureaucrat(
        {
          id: ext.id,
          enabled: draft.enabled,
          settings: draft.settings,
        },
        currentUser
      );
      setDrafts((prev) => {
        const copy = { ...prev };
        delete copy[ext.id];
        return copy;
      });
      setFeedbackMsg(`Settings for "${ext.name}" saved to Firebase.`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to save extension settings.'
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleBulkSync = async (mode: 'seed-missing' | 'reset-all') => {
    if (!isBureaucrat) return;
    setBusyKey(`bulk:${mode}`);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      const count = await syncAllExtensionsAsBureaucrat(currentUser, mode);
      setDrafts({});
      setConfirmResetOpen(false);
      if (mode === 'seed-missing') {
        setFeedbackMsg(
          count > 0
            ? `${count} extensions initialized in Firebase with default settings.`
            : 'All extensions are already registered in Firebase.'
        );
      } else {
        setFeedbackMsg(
          `${count} extensions restored to default settings in Firebase.`
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to sync extensions.');
    } finally {
      setBusyKey(null);
    }
  };

  const filteredExtensions = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return extensionsState.list.filter((ext) => {
      if (categoryFilter !== 'all' && ext.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        ext.name.toLowerCase().includes(q) ||
        ext.id.toLowerCase().includes(q) ||
        ext.description.toLowerCase().includes(q)
      );
    });
  }, [extensionsState.list, categoryFilter, search]);

  const enabledCount = extensionsState.list.filter((e) => e.enabled).length;
  const persistedCount = extensionsState.list.filter((e) => e.persisted).length;
  const hasMissingInFirestore = persistedCount < extensionsState.list.length;

  return (
    <div className="space-y-5">
      {/* Header Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17]">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
            <Puzzle className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
            <span>Wiki Extensions Management</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Settings configured by Bureaucrats are persisted in the Firebase{' '}
            <code className="font-mono text-[11px]">extensions</code> collection and loaded
            automatically when the Wiki-site opens for all readers and collaborators.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
          <div>
            Active:{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {enabledCount}/{extensionsState.list.length}
            </strong>
          </div>
          <div>
            Saved in Firebase:{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {persistedCount}/{extensionsState.list.length}
            </strong>
          </div>
        </div>
      </div>

      {!isBureaucrat && (
        <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
          Read-only view — only <strong>Bureaucrats</strong> can modify and save
          extension settings in Firebase.
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-xs text-red-800 dark:text-red-300"
        >
          {errorMsg}
        </div>
      )}

      {feedbackMsg && (
        <div
          role="status"
          className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 text-xs text-emerald-800 dark:text-emerald-300"
        >
          {feedbackMsg}
        </div>
      )}

      {/* Filter & Bureaucrat Bulk Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              All
            </button>
            {(Object.keys(EXTENSION_CATEGORY_LABELS) as WikiExtensionCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {EXTENSION_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter extensions..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
            />
          </div>
        </div>

        {isBureaucrat && (
          <div className="flex flex-wrap items-center gap-2">
            {hasMissingInFirestore && (
              <button
                type="button"
                disabled={busyKey !== null}
                onClick={() => void handleBulkSync('seed-missing')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {busyKey === 'bulk:seed-missing'
                    ? 'Initializing...'
                    : 'Save pending defaults to Firebase'}
                </span>
              </button>
            )}

            {!confirmResetOpen ? (
              <button
                type="button"
                disabled={busyKey !== null}
                onClick={() => setConfirmResetOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset defaults</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() => void handleBulkSync('reset-all')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-700 text-white hover:bg-amber-800 whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  {busyKey === 'bulk:reset-all' ? 'Resetting...' : 'Confirm reset'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(false)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Extensions Grid */}
      {filteredExtensions.length === 0 ? (
        <div className="py-10 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No extensions match the current filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredExtensions.map((ext) => {
            const draft = getDraft(ext);
            const descriptors = EXTENSION_SETTING_DESCRIPTORS[ext.id as WikiExtensionId] ?? [];
            const dirty = isExtDirty(ext);
            const isCardBusy = busyKey === `ext:${ext.id}` || busyKey === `save:${ext.id}`;

            return (
              <section
                key={ext.id}
                aria-label={`Extension ${ext.name}`}
                className="flex flex-col justify-between p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] space-y-4"
              >
                <div className="space-y-3">
                  {/* Card Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                          {ext.name}
                        </h3>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          :{ext.id}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{EXTENSION_CATEGORY_LABELS[ext.category]}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Database className="w-3 h-3 shrink-0" />
                          <span>{ext.persisted ? 'Firebase' : 'Local default'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Accessible Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={draft.enabled}
                      aria-label={`Toggle extension ${ext.name}`}
                      disabled={!isBureaucrat || isCardBusy}
                      onClick={() => void handleToggleExtension(ext)}
                      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed ${
                        draft.enabled
                          ? 'border-blue-700 bg-blue-700 text-white hover:bg-blue-800'
                          : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          draft.enabled ? 'bg-emerald-300' : 'bg-slate-400 dark:bg-slate-500'
                        }`}
                      />
                      <span>{draft.enabled ? 'Active' : 'Disabled'}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {ext.description}
                  </p>

                  {/* Per-extension settings */}
                  {descriptors.length > 0 && (
                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                      {descriptors.map((field) => {
                        const fieldId = `ext-${ext.id}-${field.key}`;
                        const value = draft.settings[field.key];

                        if (field.type === 'boolean') {
                          const checked = Boolean(value);
                          return (
                            <label
                              key={field.key}
                              htmlFor={fieldId}
                              className={`flex items-start justify-between gap-3 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f1623] ${
                                isBureaucrat ? 'cursor-pointer' : 'opacity-75 cursor-not-allowed'
                              }`}
                            >
                              <div className="text-xs">
                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                  {field.label}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {field.hint}
                                </div>
                              </div>
                              <input
                                id={fieldId}
                                type="checkbox"
                                checked={checked}
                                disabled={!isBureaucrat || isCardBusy}
                                onChange={(e) =>
                                  updateDraftSetting(ext, field.key, e.target.checked)
                                }
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
                              />
                            </label>
                          );
                        }

                        if (field.type === 'number') {
                          const numVal = typeof value === 'number' ? value : field.min ?? 1;
                          return (
                            <div
                              key={field.key}
                              className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f1623]"
                            >
                              <label htmlFor={fieldId} className="text-xs min-w-0">
                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                  {field.label}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {field.hint}
                                </div>
                              </label>
                              <input
                                id={fieldId}
                                type="number"
                                min={field.min ?? 1}
                                max={field.max ?? 10}
                                value={numVal}
                                disabled={!isBureaucrat || isCardBusy}
                                onChange={(e) => {
                                  const raw = Number.parseInt(e.target.value, 10);
                                  const clamped = Number.isNaN(raw)
                                    ? field.min ?? 1
                                    : Math.max(field.min ?? 1, Math.min(field.max ?? 10, raw));
                                  updateDraftSetting(ext, field.key, clamped);
                                }}
                                className="w-16 px-2.5 py-1 text-xs font-mono tabular-nums text-right rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 disabled:opacity-60"
                              />
                            </div>
                          );
                        }

                        if (field.type === 'select' && field.options && field.options.length > 0) {
                          const currentOptionValue =
                            typeof value === 'string' && value
                              ? value
                              : field.options[0].value;
                          const hasVisualSwatches = field.options.some((opt) =>
                            Boolean(opt.lightSwatches)
                          );

                          if (hasVisualSwatches) {
                            return (
                              <div
                                key={field.key}
                                className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f1623] space-y-2.5"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                    {field.label}
                                  </span>
                                  <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                                    {field.options.length} available themes
                                  </span>
                                </div>

                                <div
                                  role="radiogroup"
                                  aria-label={field.label}
                                  className="grid grid-cols-1 gap-2"
                                >
                                  {field.options.map((opt) => {
                                    const selected = currentOptionValue === opt.value;
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        disabled={!isBureaucrat || isCardBusy}
                                        onClick={() =>
                                          updateDraftSetting(ext, field.key, opt.value)
                                        }
                                        className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                          selected
                                            ? 'border-blue-700 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/35'
                                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                      >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                          <div className="min-w-0 space-y-0.5">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                                {opt.label}
                                              </span>
                                              {opt.editionLabel && (
                                                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                                  · {opt.editionLabel}
                                                </span>
                                              )}
                                            </div>
                                            {opt.hint && (
                                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                                                {opt.hint}
                                              </p>
                                            )}
                                            {opt.typographyLabel && (
                                              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-0.5">
                                                Typography: {opt.typographyLabel}
                                              </p>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-2 shrink-0 pt-0.5">
                                            {opt.lightSwatches && (
                                              <div
                                                className="flex items-center gap-1 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70"
                                                title="Light mode palette"
                                              >
                                                <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 pr-0.5">
                                                  L
                                                </span>
                                                {opt.lightSwatches.map((bgCls, idx) => (
                                                  <span
                                                    key={idx}
                                                    className={`w-3 h-3 rounded-xs border border-slate-300/80 dark:border-slate-600 ${bgCls}`}
                                                  />
                                                ))}
                                              </div>
                                            )}
                                            {opt.darkSwatches && (
                                              <div
                                                className="flex items-center gap-1 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-900/90"
                                                title="Dark mode palette"
                                              >
                                                <span className="text-[9px] font-mono text-slate-300 pr-0.5">
                                                  D
                                                </span>
                                                {opt.darkSwatches.map((bgCls, idx) => (
                                                  <span
                                                    key={idx}
                                                    className={`w-3 h-3 rounded-xs border border-slate-700 ${bgCls}`}
                                                  />
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>

                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                  {field.hint}
                                </p>
                              </div>
                            );
                          }

                          const activeHint =
                            field.options.find((opt) => opt.value === currentOptionValue)?.hint ??
                            field.hint;

                          return (
                            <div
                              key={field.key}
                              className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f1623] space-y-1.5"
                            >
                              <label
                                htmlFor={fieldId}
                                className="block text-xs font-medium text-slate-800 dark:text-slate-200"
                              >
                                {field.label}
                              </label>
                              <select
                                id={fieldId}
                                value={currentOptionValue}
                                disabled={!isBureaucrat || isCardBusy}
                                onChange={(e) =>
                                  updateDraftSetting(ext, field.key, e.target.value)
                                }
                                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 disabled:opacity-60"
                              >
                                {field.options.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {activeHint}
                              </p>
                            </div>
                          );
                        }

                        const textVal = typeof value === 'string' ? value : '';
                        return (
                          <div
                            key={field.key}
                            className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f1623] space-y-1.5"
                          >
                            <label
                              htmlFor={fieldId}
                              className="block text-xs font-medium text-slate-800 dark:text-slate-200"
                            >
                              {field.label}
                            </label>
                            <input
                              id={fieldId}
                              type="text"
                              maxLength={field.maxLength ?? 80}
                              value={textVal}
                              disabled={!isBureaucrat || isCardBusy}
                              onChange={(e) => updateDraftSetting(ext, field.key, e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700 disabled:opacity-60"
                            />
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {field.hint}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Card Audit & Save Footer */}
                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <div
                    className="truncate"
                    title={ext.updatedAt ? formatAbsoluteTime(ext.updatedAt) : undefined}
                  >
                    {ext.persisted ? (
                      <span>
                        Configured by <strong>{ext.updatedByName}</strong> ·{' '}
                        <span className="font-mono tabular-nums">
                          {formatRelativeTime(ext.updatedAt)}
                        </span>
                      </span>
                    ) : (
                      <span>Awaiting initial save by Bureaucrat</span>
                    )}
                  </div>

                  {isBureaucrat && (dirty || !ext.persisted) && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {dirty && (
                        <button
                          type="button"
                          disabled={isCardBusy}
                          onClick={() => discardDraft(ext)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                        >
                          Discard
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isCardBusy}
                        onClick={() => void handleSaveExtension(ext)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-700 text-white hover:bg-blue-800 whitespace-nowrap disabled:opacity-50 cursor-pointer"
                      >
                        {busyKey === `save:${ext.id}` ? (
                          <span>Saving...</span>
                        ) : !dirty && !ext.persisted ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Pin to Firebase</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3 h-3" />
                            <span>Save to Firebase</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
