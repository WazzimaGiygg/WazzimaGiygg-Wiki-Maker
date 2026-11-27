import React from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Edit3,
  Hash,
  ListChecks,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { formatAbsoluteTime, formatRelativeTime } from '../lib/markdownUtils';
import {
  buildTagDirectory,
  type BulkTagOperation,
  canUserEditPageTags,
  computeNextTagsForPage,
  isProtectedPageRecord,
  normalizeSingleTag,
  parseTagInputList,
} from '../lib/tagUtils';
import { bulkUpdatePagesTags, type BulkTagUpdateProgress } from '../lib/wikiService';
import { VALIDATION_LIMITS, WIKI_CATEGORIES, type WikiPage } from '../types/wiki';

type TagSortMode = 'count' | 'alpha';
type TagFilterMatchMode = 'any' | 'all' | 'untagged';
type BulkActionTab = 'add' | 'remove' | 'rename' | 'replace';
type PageScopeFilter = 'all' | 'editable' | 'public' | 'private-or-locked';

interface TagManagementPanelProps {
  pages: WikiPage[];
  user: User | null;
  isAdmin: boolean;
  isBlocked: boolean;
  onSelectPage: (slug: string) => void;
  onSignIn?: () => void;
  onAfterBulkUpdate?: () => Promise<void> | void;
  onNotify?: (notice: {
    tone: 'success' | 'info' | 'warning';
    title: string;
    description: string;
  }) => void;
}

export const TagManagementPanel: React.FC<TagManagementPanelProps> = ({
  pages,
  user,
  isAdmin,
  isBlocked,
  onSelectPage,
  onSignIn,
  onAfterBulkUpdate,
  onNotify,
}) => {
  const [tagSearch, setTagSearch] = React.useState('');
  const [tagSort, setTagSort] = React.useState<TagSortMode>('count');
  const [matchMode, setMatchMode] = React.useState<TagFilterMatchMode>('any');
  const [selectedFilterTags, setSelectedFilterTags] = React.useState<string[]>([]);

  const [pageSearch, setPageSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [scopeFilter, setScopeFilter] = React.useState<PageScopeFilter>('all');

  const [selectedSlugs, setSelectedSlugs] = React.useState<Set<string>>(() => new Set());
  const [bulkTab, setBulkTab] = React.useState<BulkActionTab>('add');
  const [addInput, setAddInput] = React.useState('');
  const [removeInput, setRemoveInput] = React.useState('');
  const [renameFrom, setRenameFrom] = React.useState('');
  const [renameTo, setRenameTo] = React.useState('');
  const [replaceInput, setReplaceInput] = React.useState('');

  const [bulkMenuOpen, setBulkMenuOpen] = React.useState(false);

  const [isUpdating, setIsUpdating] = React.useState(false);
  const [progress, setProgress] = React.useState<BulkTagUpdateProgress | null>(null);
  const [inlineBusySlug, setInlineBusySlug] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<{
    tone: 'success' | 'warning' | 'error';
    text: string;
    failures?: Array<{ slug: string; title: string; reason: string }>;
  } | null>(null);

  const tagDatalistId = React.useId();
  const bulkSectionRef = React.useRef<HTMLDivElement | null>(null);
  const bulkMenuRef = React.useRef<HTMLDivElement | null>(null);
  const addInputRef = React.useRef<HTMLInputElement | null>(null);
  const removeInputRef = React.useRef<HTMLInputElement | null>(null);
  const renameFromInputRef = React.useRef<HTMLInputElement | null>(null);
  const replaceInputRef = React.useRef<HTMLInputElement | null>(null);

  const directory = React.useMemo(
    () => buildTagDirectory(pages, user, isAdmin, isBlocked),
    [pages, user, isAdmin, isBlocked]
  );

  const editableSlugsSet = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of pages) {
      if (canUserEditPageTags(p, user, isAdmin, isBlocked)) {
        set.add(p.slug);
      }
    }
    return set;
  }, [pages, user, isAdmin, isBlocked]);

  // Keep selectedSlugs synced with still-existing editable pages
  React.useEffect(() => {
    setSelectedSlugs((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const slug of prev) {
        if (editableSlugsSet.has(slug)) {
          next.add(slug);
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [editableSlugsSet]);

  const sortedAndFilteredDirectoryTags = React.useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    const list = directory.tags.filter((entry) =>
      q ? entry.tag.toLowerCase().includes(q) : true
    );
    if (tagSort === 'alpha') {
      return [...list].sort((a, b) => a.tag.localeCompare(b.tag, 'en-US'));
    }
    return list;
  }, [directory.tags, tagSearch, tagSort]);

  const selectedFilterKeys = React.useMemo(
    () => selectedFilterTags.map((t) => t.toLowerCase()),
    [selectedFilterTags]
  );

  const filteredPages = React.useMemo(() => {
    const q = pageSearch.trim().toLowerCase();

    return pages
      .filter((page) => {
        const pageTagKeys = (page.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);

        if (matchMode === 'untagged') {
          if (pageTagKeys.length > 0) return false;
        } else if (selectedFilterKeys.length > 0) {
          if (matchMode === 'all') {
            const hasAll = selectedFilterKeys.every((key) => pageTagKeys.includes(key));
            if (!hasAll) return false;
          } else {
            const hasAny = selectedFilterKeys.some((key) => pageTagKeys.includes(key));
            if (!hasAny) return false;
          }
        }

        if (categoryFilter !== 'all' && page.category !== categoryFilter) {
          return false;
        }

        if (scopeFilter === 'editable' && !editableSlugsSet.has(page.slug)) {
          return false;
        }
        if (scopeFilter === 'public' && page.visibility !== 'public') {
          return false;
        }
        if (scopeFilter === 'private-or-locked' && page.visibility !== 'private' && !page.isLocked) {
          return false;
        }

        if (q) {
          const matchesSearch =
            page.title.toLowerCase().includes(q) ||
            page.slug.toLowerCase().includes(q) ||
            page.authorName.toLowerCase().includes(q) ||
            page.lastEditorName.toLowerCase().includes(q) ||
            (page.tags ?? []).some((t) => t.toLowerCase().includes(q));
          if (!matchesSearch) return false;
        }

        return true;
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'en-US'));
  }, [
    pages,
    matchMode,
    selectedFilterKeys,
    categoryFilter,
    scopeFilter,
    editableSlugsSet,
    pageSearch,
  ]);

  const filteredEditablePages = React.useMemo(
    () => filteredPages.filter((p) => editableSlugsSet.has(p.slug)),
    [filteredPages, editableSlugsSet]
  );

  const selectedPageObjects = React.useMemo(
    () => pages.filter((p) => selectedSlugs.has(p.slug)),
    [pages, selectedSlugs]
  );

  // Tags present across currently selected pages (for Remove / Rename dropdowns)
  const tagsOnSelectedPages = React.useMemo(() => {
    const counts = new Map<string, { tag: string; count: number }>();
    for (const page of selectedPageObjects) {
      const seen = new Set<string>();
      for (const raw of page.tags ?? []) {
        const clean = raw.trim();
        if (!clean) continue;
        const key = clean.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const existing = counts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(key, { tag: clean, count: 1 });
        }
      }
    }
    return Array.from(counts.values()).sort(
      (a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'en-US')
    );
  }, [selectedPageObjects]);

  const allFilteredEditableSelected =
    filteredEditablePages.length > 0 &&
    filteredEditablePages.every((p) => selectedSlugs.has(p.slug));

  // Close the bulk actions menu on outside click or Escape
  React.useEffect(() => {
    if (!bulkMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) {
        setBulkMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBulkMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [bulkMenuOpen]);

  // Close the bulk menu if selection becomes empty
  React.useEffect(() => {
    if (selectedSlugs.size === 0 && bulkMenuOpen) {
      setBulkMenuOpen(false);
    }
  }, [selectedSlugs.size, bulkMenuOpen]);

  const activeBulkPreview = React.useMemo(() => {
    if (selectedPageObjects.length === 0) return null;

    let op: BulkTagOperation | null = null;
    if (bulkTab === 'add') {
      const tags = parseTagInputList(addInput);
      if (tags.length > 0) op = { type: 'add', tags };
    } else if (bulkTab === 'remove') {
      const tags = parseTagInputList(removeInput);
      if (tags.length > 0) op = { type: 'remove', tags };
    } else if (bulkTab === 'rename') {
      const fromClean = normalizeSingleTag(renameFrom);
      const toClean = normalizeSingleTag(renameTo);
      if (fromClean && toClean) {
        op = { type: 'rename', fromTag: fromClean, toTag: toClean };
      } else if (fromClean) {
        const key = fromClean.toLowerCase();
        const matchingCount = selectedPageObjects.filter((p) =>
          (p.tags ?? []).some((t) => t.trim().toLowerCase() === key)
        ).length;
        return {
          ready: false,
          willUpdate: matchingCount,
          blockedOrError: 0,
          firstError: null as string | null,
          summaryText: `${matchingCount} of ${selectedPageObjects.length} selected ${
            selectedPageObjects.length === 1 ? 'page carries' : 'pages carry'
          } #${fromClean}. Enter the replacement tag name.`,
        };
      }
    } else if (bulkTab === 'replace') {
      const tags = parseTagInputList(replaceInput);
      op = { type: 'replace', tags };
    }

    if (!op) return null;

    let willUpdate = 0;
    let blockedOrError = 0;
    let firstError: string | null = null;

    for (const page of selectedPageObjects) {
      const res = computeNextTagsForPage(page, op, isAdmin);
      if (res.error) {
        blockedOrError += 1;
        if (!firstError) firstError = res.error;
      } else if (res.changed) {
        willUpdate += 1;
      }
    }

    return {
      ready: true,
      willUpdate,
      blockedOrError,
      firstError,
      summaryText:
        willUpdate > 0
          ? `Ready to update ${willUpdate} of ${selectedPageObjects.length} selected ${
              selectedPageObjects.length === 1 ? 'page' : 'pages'
            }${blockedOrError > 0 ? ` (${blockedOrError} blocked)` : ''}.`
          : blockedOrError > 0 && firstError
          ? firstError
          : `None of the ${selectedPageObjects.length} selected pages would change.`,
    };
  }, [
    selectedPageObjects,
    bulkTab,
    addInput,
    removeInput,
    renameFrom,
    renameTo,
    replaceInput,
    isAdmin,
  ]);

  const handleOpenBulkActionFromMenu = (action: BulkActionTab) => {
    setBulkMenuOpen(false);
    setBulkTab(action);
    setStatusMessage(null);

    if (action === 'rename' && !renameFrom && tagsOnSelectedPages.length > 0) {
      setRenameFrom(tagsOnSelectedPages[0].tag);
    }
    if (action === 'remove' && !removeInput && tagsOnSelectedPages.length > 0) {
      setRemoveInput(tagsOnSelectedPages[0].tag);
    }

    bulkSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    window.setTimeout(() => {
      if (action === 'add') addInputRef.current?.focus();
      if (action === 'remove') removeInputRef.current?.focus();
      if (action === 'rename') renameFromInputRef.current?.focus();
      if (action === 'replace') replaceInputRef.current?.focus();
    }, 60);
  };

  const toggleTagFilter = (tag: string) => {
    if (matchMode === 'untagged') {
      setMatchMode('any');
    }
    const key = tag.toLowerCase();
    setSelectedFilterTags((prev) =>
      prev.some((item) => item.toLowerCase() === key)
        ? prev.filter((item) => item.toLowerCase() !== key)
        : [...prev, tag]
    );
  };

  const handleToggleSelectPage = (slug: string) => {
    if (!editableSlugsSet.has(slug)) return;
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (allFilteredEditableSelected) {
        for (const p of filteredEditablePages) {
          next.delete(p.slug);
        }
      } else {
        for (const p of filteredEditablePages) {
          next.add(p.slug);
        }
      }
      return next;
    });
  };

  const handlePrepareRenameFromDirectory = (tagName: string) => {
    const key = tagName.toLowerCase();
    const matchingEditable = pages.filter(
      (p) => editableSlugsSet.has(p.slug) && (p.tags ?? []).some((t) => t.toLowerCase() === key)
    );
    setMatchMode('any');
    setSelectedFilterTags([tagName]);
    setSelectedSlugs(new Set(matchingEditable.map((p) => p.slug)));
    setBulkTab('rename');
    setRenameFrom(tagName);
    setRenameTo('');
    bulkSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const clearAllFilters = () => {
    setMatchMode('any');
    setSelectedFilterTags([]);
    setPageSearch('');
    setCategoryFilter('all');
    setScopeFilter('all');
    setTagSearch('');
  };

  const hasActivePageFilters =
    matchMode === 'untagged' ||
    selectedFilterTags.length > 0 ||
    Boolean(pageSearch.trim()) ||
    categoryFilter !== 'all' ||
    scopeFilter !== 'all';

  const executeBulkOperation = async (targetPages: WikiPage[], operation: BulkTagOperation) => {
    if (!user || isBlocked || targetPages.length === 0 || isUpdating) return;
    setIsUpdating(true);
    setStatusMessage(null);
    setProgress({ processed: 0, total: targetPages.length, currentTitle: targetPages[0].title });

    try {
      const result = await bulkUpdatePagesTags({
        pages: targetPages,
        operation,
        user,
        isAdmin,
        isBlocked,
        onProgress: (p) => setProgress(p),
      });

      const updatedCount = result.updatedSlugs.length;
      const skippedCount = result.skippedSlugs.length;
      const failedCount = result.failed.length;

      if (failedCount === 0 && updatedCount > 0) {
        const msg = `Updated tags on ${updatedCount} ${
          updatedCount === 1 ? 'page' : 'pages'
        }${skippedCount > 0 ? ` (${skippedCount} already matched)` : ''}.`;
        setStatusMessage({ tone: 'success', text: msg });
        onNotify?.({ tone: 'success', title: 'Bulk tag update complete', description: msg });
        if (operation.type === 'add') setAddInput('');
        if (operation.type === 'remove') setRemoveInput('');
        if (operation.type === 'rename') {
          const oldKey = normalizeSingleTag(operation.fromTag).toLowerCase();
          const newTag = normalizeSingleTag(operation.toTag);
          if (oldKey && newTag) {
            setSelectedFilterTags((prev) =>
              prev.map((t) => (t.toLowerCase() === oldKey ? newTag : t))
            );
          }
          setRenameFrom('');
          setRenameTo('');
        }
      } else if (failedCount === 0 && updatedCount === 0) {
        const msg = 'No pages needed changes for this tag operation.';
        setStatusMessage({ tone: 'warning', text: msg });
      } else {
        const msg = `Updated ${updatedCount} ${
          updatedCount === 1 ? 'page' : 'pages'
        }, skipped ${skippedCount}, and ${failedCount} failed.`;
        setStatusMessage({
          tone: updatedCount > 0 ? 'warning' : 'error',
          text: msg,
          failures: result.failed,
        });
        onNotify?.({
          tone: 'warning',
          title: 'Bulk tag update finished with warnings',
          description: msg,
        });
      }

      if (updatedCount > 0 && onAfterBulkUpdate) {
        await onAfterBulkUpdate();
      }
    } catch (err) {
      const errText = err instanceof Error ? err.message : 'Failed to execute bulk tag update.';
      setStatusMessage({ tone: 'error', text: errText });
    } finally {
      setIsUpdating(false);
      setProgress(null);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isBlocked || selectedPageObjects.length === 0) return;

    if (bulkTab === 'add') {
      const tags = parseTagInputList(addInput);
      if (tags.length === 0) {
        setStatusMessage({ tone: 'error', text: 'Enter one or more comma-separated tags to add.' });
        return;
      }
      await executeBulkOperation(selectedPageObjects, { type: 'add', tags });
    } else if (bulkTab === 'remove') {
      const tags = parseTagInputList(removeInput);
      if (tags.length === 0) {
        setStatusMessage({
          tone: 'error',
          text: 'Select or enter one or more tags to remove from the selected pages.',
        });
        return;
      }
      await executeBulkOperation(selectedPageObjects, { type: 'remove', tags });
    } else if (bulkTab === 'rename') {
      const fromClean = normalizeSingleTag(renameFrom);
      const toClean = normalizeSingleTag(renameTo);
      if (!fromClean || !toClean) {
        setStatusMessage({
          tone: 'error',
          text: 'Specify both the source tag and the new target tag.',
        });
        return;
      }
      if (fromClean.toLowerCase() === toClean.toLowerCase() && fromClean === toClean) {
        setStatusMessage({
          tone: 'warning',
          text: 'The new tag name matches the existing tag.',
        });
        return;
      }
      await executeBulkOperation(selectedPageObjects, {
        type: 'rename',
        fromTag: fromClean,
        toTag: toClean,
      });
    } else if (bulkTab === 'replace') {
      const tags = parseTagInputList(replaceInput);
      await executeBulkOperation(selectedPageObjects, { type: 'replace', tags });
    }
  };

  const handleInlineRemoveSingleTag = async (page: WikiPage, tagToRemove: string) => {
    if (!user || isBlocked || isUpdating || inlineBusySlug) return;
    if (!canUserEditPageTags(page, user, isAdmin, isBlocked)) return;

    setInlineBusySlug(`${page.slug}:${tagToRemove}`);
    setStatusMessage(null);
    try {
      const result = await bulkUpdatePagesTags({
        pages: [page],
        operation: { type: 'remove', tags: [tagToRemove] },
        user,
        isAdmin,
        isBlocked,
      });
      if (result.failed.length > 0) {
        setStatusMessage({
          tone: 'error',
          text: result.failed[0].reason,
        });
      } else if (result.updatedSlugs.length > 0) {
        onNotify?.({
          tone: 'info',
          title: 'Tag removed',
          description: `Removed #${tagToRemove} from "${page.title}".`,
        });
        if (onAfterBulkUpdate) {
          await onAfterBulkUpdate();
        }
      }
    } catch (err) {
      setStatusMessage({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Could not remove tag.',
      });
    } finally {
      setInlineBusySlug(null);
    }
  };

  const canModifyTags = Boolean(user && user.emailVerified && !isBlocked);

  return (
    <div className="space-y-6">
      {/* 4-Column Summary Strip (Single Elevation Hairline Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 dark:border-slate-800 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 bg-slate-50/60 dark:bg-[#0b0f17]">
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Unique Tags</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {directory.tags.length}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Tagged Pages</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {directory.taggedPagesCount}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Untagged Pages</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {directory.untaggedPagesCount}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {selectedSlugs.size > 0 ? 'Selected for Bulk Edit' : 'Editable by You'}
          </div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {selectedSlugs.size > 0 ? selectedSlugs.size : editableSlugsSet.size}
          </div>
        </div>
      </div>

      {/* Feedback & Error Notices */}
      {statusMessage && (
        <div
          role={statusMessage.tone === 'error' ? 'alert' : 'status'}
          className={`p-3.5 rounded-xl border text-xs space-y-2 ${
            statusMessage.tone === 'success'
              ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
              : statusMessage.tone === 'warning'
              ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
              : 'border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-red-900 dark:text-red-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {statusMessage.tone === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              aria-label="Dismiss notice"
              className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {statusMessage.failures && statusMessage.failures.length > 0 && (
            <ul className="pl-6 list-disc space-y-0.5 text-[11px] opacity-90">
              {statusMessage.failures.slice(0, 6).map((item) => (
                <li key={item.slug}>
                  <span className="font-semibold">{item.title}</span> (:{item.slug}) —{' '}
                  {item.reason}
                </li>
              ))}
              {statusMessage.failures.length > 6 && (
                <li>And {statusMessage.failures.length - 6} more pages.</li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Split Workspace: Tag Directory + Filtered Pages & Bulk Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Tag Directory */}
        <section
          aria-label="Tag inventory"
          className="lg:col-span-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-[#0b0f17] overflow-hidden"
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                <span>Tag Directory</span>
              </h2>
              <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-md">
                <button
                  type="button"
                  onClick={() => setTagSort('count')}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    tagSort === 'count'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Most used
                </button>
                <button
                  type="button"
                  onClick={() => setTagSort('alpha')}
                  className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    tagSort === 'alpha'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  A–Z
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Find tags..."
                aria-label="Filter tag directory"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>

            {/* Filter Match Mode */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-lg">
              <button
                type="button"
                onClick={() => setMatchMode('any')}
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  matchMode === 'any'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Match any
              </button>
              <button
                type="button"
                onClick={() => setMatchMode('all')}
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  matchMode === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Match all
              </button>
              <button
                type="button"
                onClick={() => {
                  setMatchMode('untagged');
                  setSelectedFilterTags([]);
                }}
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  matchMode === 'untagged'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Untagged ({directory.untaggedPagesCount})
              </button>
            </div>
          </div>

          {/* Tag List */}
          <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-800/80">
            {directory.tags.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No tags have been assigned to any pages yet. Select pages on the right to add tags.
              </div>
            ) : sortedAndFilteredDirectoryTags.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No tags match &ldquo;{tagSearch.trim()}&rdquo;.
              </div>
            ) : (
              sortedAndFilteredDirectoryTags.map((entry) => {
                const isSelected =
                  matchMode !== 'untagged' &&
                  selectedFilterKeys.includes(entry.normalizedKey);
                return (
                  <div
                    key={entry.normalizedKey}
                    className={`flex items-center justify-between gap-2 px-3.5 py-2 text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/40'
                        : 'hover:bg-slate-100/80 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTagFilter(entry.tag)}
                      aria-pressed={isSelected}
                      className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left cursor-pointer py-0.5"
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 min-w-0 font-mono truncate ${
                          isSelected
                            ? 'font-semibold text-blue-800 dark:text-blue-200'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <Hash className="w-3 h-3 shrink-0 text-slate-400 dark:text-slate-500" />
                        <span className="truncate">{entry.tag}</span>
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                        {entry.pageCount}
                      </span>
                    </button>

                    {canModifyTags && entry.editableCount > 0 && (
                      <button
                        type="button"
                        onClick={() => handlePrepareRenameFromDirectory(entry.tag)}
                        title={`Select ${entry.editableCount} editable ${
                          entry.editableCount === 1 ? 'page' : 'pages'
                        } with #${entry.tag} to rename or merge`}
                        aria-label={`Rename or merge tag #${entry.tag}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Panel: Filtered Pages & Bulk Tag Actions */}
        <section aria-label="Filtered pages and bulk tag management" className="lg:col-span-8 space-y-4">
          {/* Page Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={pageSearch}
                onChange={(e) => setPageSearch(e.target.value)}
                placeholder="Filter pages by title, :slug, author, or tag..."
                aria-label="Filter pages"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>

            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-700"
            >
              <option value="all">All categories</option>
              {WIKI_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by access scope"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as PageScopeFilter)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-700"
            >
              <option value="all">All pages</option>
              {canModifyTags && <option value="editable">Editable by me</option>}
              <option value="public">Public only</option>
              <option value="private-or-locked">Private or locked</option>
            </select>

            {hasActivePageFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear filters</span>
              </button>
            )}
          </div>

          {/* Active Tag Filter Summary Row */}
          {(selectedFilterTags.length > 0 || matchMode === 'untagged') && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-500 dark:text-slate-400">
                Active tag filter:
              </span>
              {matchMode === 'untagged' ? (
                <button
                  type="button"
                  onClick={() => setMatchMode('any')}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-blue-700/50 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 font-medium cursor-pointer"
                >
                  <span>Untagged pages only</span>
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <>
                  {selectedFilterTags.map((t) => (
                    <button
                      key={t.toLowerCase()}
                      type="button"
                      onClick={() => toggleTagFilter(t)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-blue-700/50 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 font-mono cursor-pointer"
                    >
                      <span>#{t}</span>
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                  {selectedFilterTags.length > 1 && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      ({matchMode === 'all' ? 'must have all' : 'must have any'})
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          {/* Bulk Action Menu & Operation Bar */}
          <div
            ref={bulkSectionRef}
            className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/60 dark:bg-[#0b0f17] p-4 space-y-3"
          >
            {!user ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Sign in with your Google account to select pages and rename, remove, add, or
                  replace tags in bulk.
                </div>
                {onSignIn && (
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Sign in with Google
                  </button>
                )}
              </div>
            ) : isBlocked ? (
              <div className="text-xs text-red-700 dark:text-red-400">
                Your account write access is currently suspended; bulk tag editing is disabled.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {selectedSlugs.size} {selectedSlugs.size === 1 ? 'page' : 'pages'} selected
                    </span>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                      ·
                    </span>
                    <button
                      type="button"
                      disabled={filteredEditablePages.length === 0 || isUpdating}
                      onClick={handleToggleSelectAllFiltered}
                      className="text-blue-700 dark:text-blue-400 hover:underline font-medium disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {allFilteredEditableSelected
                        ? `Deselect filtered (${filteredEditablePages.length})`
                        : `Select all filtered editable (${filteredEditablePages.length})`}
                    </button>
                    {selectedSlugs.size > 0 && (
                      <>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                          ·
                        </span>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => setSelectedSlugs(new Set())}
                          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline cursor-pointer disabled:opacity-45 whitespace-nowrap"
                        >
                          Clear selection
                        </button>
                      </>
                    )}
                  </div>

                  {/* Contextual Bulk Action Menu + Mode Tabs */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div ref={bulkMenuRef} className="relative">
                      <button
                        type="button"
                        disabled={selectedSlugs.size === 0 || isUpdating}
                        aria-haspopup="menu"
                        aria-expanded={bulkMenuOpen}
                        title={
                          selectedSlugs.size === 0
                            ? 'Select one or more pages below to use bulk actions'
                            : 'Open bulk tag action menu'
                        }
                        onClick={() => setBulkMenuOpen((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                      >
                        <ListChecks className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                        <span>Bulk actions</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                            bulkMenuOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {bulkMenuOpen && (
                        <div
                          role="menu"
                          aria-label="Bulk tag actions for selected pages"
                          className="absolute right-0 mt-1.5 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1623] shadow-lg z-30 py-1.5 text-xs"
                        >
                          <div className="px-3 py-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80 tabular-nums">
                            Apply to {selectedSlugs.size} selected{' '}
                            {selectedSlugs.size === 1 ? 'page' : 'pages'}
                          </div>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleOpenBulkActionFromMenu('rename')}
                            className="w-full px-3 py-2 text-left flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 mt-0.5 text-blue-700 dark:text-blue-400 shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                Rename a tag
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Rename or merge a tag across selected pages
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleOpenBulkActionFromMenu('remove')}
                            className="w-full px-3 py-2 text-left flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 mt-0.5 text-red-700 dark:text-red-400 shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                Remove a tag
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Strip one or more tags from selected pages
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleOpenBulkActionFromMenu('add')}
                            className="w-full px-3 py-2 text-left flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 mt-0.5 text-slate-600 dark:text-slate-300 shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                Add tags
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Append new tags without removing existing ones
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleOpenBulkActionFromMenu('replace')}
                            className="w-full px-3 py-2 text-left flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 mt-0.5 text-slate-600 dark:text-slate-300 shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                Replace all tags
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Overwrite tags or clear all non-system tags
                              </div>
                            </div>
                          </button>

                          <div className="my-1 border-t border-slate-100 dark:border-slate-800/80" />

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setSelectedSlugs(new Set());
                              setBulkMenuOpen(false);
                            }}
                            className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5 shrink-0" />
                            <span>Clear page selection</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-lg">
                      {(
                        [
                          { id: 'add', label: 'Add' },
                          { id: 'remove', label: 'Remove' },
                          { id: 'rename', label: 'Rename / Merge' },
                          { id: 'replace', label: 'Replace all' },
                        ] as Array<{ id: BulkActionTab; label: string }>
                      ).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setBulkTab(item.id)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            bulkTab === item.id
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Operation Inputs */}
                <form onSubmit={(e) => void handleBulkSubmit(e)} className="space-y-2.5">
                  <datalist id={tagDatalistId}>
                    {directory.tags.map((entry) => (
                      <option key={entry.normalizedKey} value={entry.tag} />
                    ))}
                  </datalist>

                  {bulkTab === 'add' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={addInputRef}
                        type="text"
                        list={tagDatalistId}
                        value={addInput}
                        onChange={(e) => setAddInput(e.target.value)}
                        placeholder="Tags to add (comma-separated, e.g. guide, syntax)"
                        aria-label="Tags to add to selected pages"
                        className="flex-1 min-w-[220px] px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                      />
                      <button
                        type="submit"
                        disabled={
                          isUpdating ||
                          selectedSlugs.size === 0 ||
                          parseTagInputList(addInput).length === 0 ||
                          (activeBulkPreview?.ready === true && activeBulkPreview.willUpdate === 0)
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Add to {selectedSlugs.size} selected</span>
                      </button>
                    </div>
                  )}

                  {bulkTab === 'remove' && (
                    <div className="flex flex-wrap items-center gap-2">
                      {tagsOnSelectedPages.length > 0 && (
                        <select
                          aria-label="Pick a tag present on selected pages to remove"
                          value={
                            tagsOnSelectedPages.some(
                              (entry) =>
                                entry.tag.toLowerCase() === removeInput.trim().toLowerCase()
                            )
                              ? tagsOnSelectedPages.find(
                                  (entry) =>
                                    entry.tag.toLowerCase() === removeInput.trim().toLowerCase()
                                )!.tag
                              : ''
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            setRemoveInput(val);
                          }}
                          className="px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-700"
                        >
                          <option value="">Pick tag on selected pages...</option>
                          {tagsOnSelectedPages.map((entry) => (
                            <option key={entry.tag.toLowerCase()} value={entry.tag}>
                              #{entry.tag} ({entry.count}/{selectedPageObjects.length})
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        ref={removeInputRef}
                        type="text"
                        list={tagDatalistId}
                        value={removeInput}
                        onChange={(e) => setRemoveInput(e.target.value)}
                        placeholder="Tag(s) to remove (e.g. draft or comma-separated)"
                        aria-label="Tags to remove from selected pages"
                        className="flex-1 min-w-[200px] px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                      />
                      <button
                        type="submit"
                        disabled={
                          isUpdating ||
                          selectedSlugs.size === 0 ||
                          parseTagInputList(removeInput).length === 0 ||
                          (activeBulkPreview?.ready === true && activeBulkPreview.willUpdate === 0)
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Remove from {selectedSlugs.size} selected</span>
                      </button>
                    </div>
                  )}

                  {bulkTab === 'rename' && (
                    <div className="flex flex-wrap items-center gap-2">
                      {tagsOnSelectedPages.length > 0 && (
                        <select
                          aria-label="Pick a tag present on selected pages to rename"
                          value={
                            tagsOnSelectedPages.some(
                              (entry) =>
                                entry.tag.toLowerCase() === renameFrom.trim().toLowerCase()
                            )
                              ? tagsOnSelectedPages.find(
                                  (entry) =>
                                    entry.tag.toLowerCase() === renameFrom.trim().toLowerCase()
                                )!.tag
                              : ''
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            setRenameFrom(val);
                          }}
                          className="px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-700"
                        >
                          <option value="">Pick tag on selected pages...</option>
                          {tagsOnSelectedPages.map((entry) => (
                            <option key={entry.tag.toLowerCase()} value={entry.tag}>
                              #{entry.tag} ({entry.count}/{selectedPageObjects.length})
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        ref={renameFromInputRef}
                        type="text"
                        list={tagDatalistId}
                        value={renameFrom}
                        onChange={(e) => setRenameFrom(e.target.value)}
                        placeholder="Existing tag (e.g. old-tag)"
                        aria-label="Existing tag to rename"
                        className="flex-1 min-w-[140px] px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                      />
                      <span className="text-xs text-slate-400 select-none">to</span>
                      <input
                        type="text"
                        list={tagDatalistId}
                        value={renameTo}
                        onChange={(e) => setRenameTo(e.target.value)}
                        placeholder="New / merged tag"
                        aria-label="Replacement tag name"
                        className="flex-1 min-w-[140px] px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                      />
                      <button
                        type="submit"
                        disabled={
                          isUpdating ||
                          selectedSlugs.size === 0 ||
                          !normalizeSingleTag(renameFrom) ||
                          !normalizeSingleTag(renameTo) ||
                          (activeBulkPreview?.ready === true && activeBulkPreview.willUpdate === 0)
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>Rename on {selectedSlugs.size} selected</span>
                      </button>
                    </div>
                  )}

                  {bulkTab === 'replace' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={replaceInputRef}
                        type="text"
                        list={tagDatalistId}
                        value={replaceInput}
                        onChange={(e) => setReplaceInput(e.target.value)}
                        placeholder="New tag set (leave blank to clear all non-system tags)"
                        aria-label="Replacement tag set"
                        className="flex-1 min-w-[220px] px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                      />
                      <button
                        type="submit"
                        disabled={
                          isUpdating ||
                          selectedSlugs.size === 0 ||
                          (activeBulkPreview?.ready === true && activeBulkPreview.willUpdate === 0)
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {parseTagInputList(replaceInput).length === 0
                            ? `Clear tags on ${selectedSlugs.size} selected`
                            : `Set tags on ${selectedSlugs.size} selected`}
                        </span>
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      {activeBulkPreview ? (
                        <span
                          className={
                            activeBulkPreview.ready && activeBulkPreview.willUpdate > 0
                              ? 'text-slate-700 dark:text-slate-300 font-medium'
                              : activeBulkPreview.firstError
                              ? 'text-amber-700 dark:text-amber-400 font-medium'
                              : ''
                          }
                        >
                          {activeBulkPreview.summaryText}
                        </span>
                      ) : (
                        <>
                          Maximum {VALIDATION_LIMITS.TAGS_MAX_COUNT} tags per page · Up to{' '}
                          {VALIDATION_LIMITS.TAG_MAX_LENGTH} characters per tag.
                        </>
                      )}
                    </span>
                    {progress && (
                      <span className="font-mono tabular-nums text-blue-700 dark:text-blue-400">
                        Updating {progress.processed}/{progress.total}: {progress.currentTitle}
                      </span>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>

          {/* Filtered Pages Table */}
          {filteredPages.length === 0 ? (
            <div className="py-12 px-4 text-center border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#0f1623] space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No pages match the selected tag and search filters.
              </p>
              {hasActivePageFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear filters</span>
                </button>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0b0f17]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f1623] text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <th className="py-2.5 px-3 w-10 text-center">
                        {canModifyTags && (
                          <input
                            type="checkbox"
                            checked={allFilteredEditableSelected}
                            disabled={filteredEditablePages.length === 0 || isUpdating}
                            onChange={handleToggleSelectAllFiltered}
                            aria-label="Select all editable filtered pages"
                            className="rounded border-slate-300 dark:border-slate-600 text-blue-700 focus:ring-blue-600 cursor-pointer"
                          />
                        )}
                      </th>
                      <th className="py-2.5 px-3">Page</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Associated Tags</th>
                      <th className="py-2.5 px-3 text-right">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                    {filteredPages.map((page) => {
                      const isEditable = editableSlugsSet.has(page.slug);
                      const isChecked = selectedSlugs.has(page.slug);
                      const isProtected = isProtectedPageRecord(page);
                      const catLabel =
                        WIKI_CATEGORIES.find((c) => c.id === page.category)?.label ?? page.category;
                      const pageTags = (page.tags ?? []).map((t) => t.trim()).filter(Boolean);

                      return (
                        <tr
                          key={page.slug}
                          className={`transition-colors ${
                            isChecked
                              ? 'bg-blue-50/60 dark:bg-blue-950/25'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center align-top pt-3">
                            {isEditable ? (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isUpdating}
                                onChange={() => handleToggleSelectPage(page.slug)}
                                aria-label={`Select ${page.title} for bulk tag management`}
                                className="rounded border-slate-300 dark:border-slate-600 text-blue-700 focus:ring-blue-600 cursor-pointer"
                              />
                            ) : (
                              <span
                                title={
                                  !user
                                    ? 'Sign in to select pages for bulk editing'
                                    : isBlocked
                                    ? 'Account write access is suspended'
                                    : page.isLocked
                                    ? 'Locked page — only the author or an administrator can edit tags'
                                    : 'Protected or private page — read-only for your account'
                                }
                                className="inline-flex items-center justify-center text-slate-400"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 align-top">
                            <button
                              type="button"
                              onClick={() => onSelectPage(page.slug)}
                              className="text-left font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              {page.title}
                            </button>
                            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              :{page.slug} · v{page.version}
                              {page.visibility === 'private' ? ' · Private' : ''}
                              {page.isLocked ? ' · Locked' : ''}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-300 align-top whitespace-nowrap">
                            {catLabel}
                          </td>

                          <td className="py-2.5 px-3 align-top">
                            {pageTags.length === 0 ? (
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                Untagged
                              </span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs">
                                {pageTags.map((t) => {
                                  const key = t.toLowerCase();
                                  const isFilterMatch =
                                    matchMode !== 'untagged' && selectedFilterKeys.includes(key);
                                  const isProtectedTag =
                                    isProtected &&
                                    !isAdmin &&
                                    (key === 'personal' || key === 'discussion');
                                  const busyThisTag = inlineBusySlug === `${page.slug}:${t}`;

                                  return (
                                    <span
                                      key={key}
                                      className="inline-flex items-center gap-0.5"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => toggleTagFilter(t)}
                                        title={
                                          isFilterMatch
                                            ? `Remove #${t} from filter`
                                            : `Filter pages by #${t}`
                                        }
                                        className={`hover:underline cursor-pointer ${
                                          isFilterMatch
                                            ? 'font-semibold text-blue-700 dark:text-blue-400'
                                            : 'text-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        #{t}
                                      </button>
                                      {isEditable && !isProtectedTag && (
                                        <button
                                          type="button"
                                          disabled={isUpdating || Boolean(inlineBusySlug)}
                                          onClick={() => void handleInlineRemoveSingleTag(page, t)}
                                          title={`Remove #${t} from ${page.title}`}
                                          aria-label={`Remove tag ${t} from ${page.title}`}
                                          className="p-0.5 rounded text-slate-400 hover:text-red-700 dark:hover:text-red-400 transition-colors cursor-pointer disabled:opacity-45"
                                        >
                                          {busyThisTag ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <X className="w-3 h-3" />
                                          )}
                                        </button>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          <td
                            className="py-2.5 px-3 text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap align-top"
                            title={formatAbsoluteTime(page.updatedAt)}
                          >
                            {formatRelativeTime(page.updatedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
