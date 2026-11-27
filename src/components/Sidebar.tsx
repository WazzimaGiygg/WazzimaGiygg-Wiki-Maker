import React from 'react';
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  Clock,
  Compass,
  FileText,
  FolderOpen,
  FolderTree,
  Keyboard,
  Layers,
  List,
  Lock,
  LogOut,
  MessageSquare,
  Monitor,
  Moon,
  Palette,
  Plus,
  Search,
  Shield,
  Shuffle,
  Sun,
  Tag,
  User as UserIcon,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  type GovernanceRole,
  type ThemePreference,
  WIKI_CATEGORIES,
  type WatchlistItem,
  type WikiPage,
} from '../types/wiki';
import { formatRelativeTime, toWikiSlug } from '../lib/markdownUtils';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  siteTitle?: string;
  pages: WikiPage[];
  activeSlug: string | null;
  isOpenMobile: boolean;
  gestureDisabled?: boolean;
  user: User | null;
  personalPageSlug?: string | null;
  discussionPageSlug?: string | null;
  governanceRole?: GovernanceRole;
  isAdminViewActive?: boolean;
  isEcosystemViewActive?: boolean;
  isCategoriesViewActive?: boolean;
  isTagsViewActive?: boolean;
  isSpecialViewActive?: boolean;
  isAllPagesViewActive?: boolean;
  isAppearanceViewActive?: boolean;
  isDark: boolean;
  themePreference?: ThemePreference;
  canToggleTheme?: boolean;
  forcedColorMode?: 'light' | 'dark';
  showQuickCreate?: boolean;
  showSidebarFilter?: boolean;
  activeTagFilter?: string | null;
  onSelectTagFilter?: (tag: string | null) => void;
  onClearTagFilter?: () => void;
  showUserProfileLinks?: boolean;
  showPwaInstall?: boolean;
  showWatchlist?: boolean;
  watchlistItems?: WatchlistItem[];
  watchlistLoading?: boolean;
  isBlocked?: boolean;
  onWatchCurrentPage?: () => void;
  onRemoveWatchlistItem?: (slug: string) => void;
  onOpenMobile?: () => void;
  onCloseMobile: () => void;
  onSelectPage: (slug: string) => void;
  onRandomPage?: () => void;
  onQuickCreateSlug: (slug: string) => void;
  onOpenAdmin?: () => void;
  onOpenEcosystem?: () => void;
  onOpenCategories?: (categorySlug?: string) => void;
  onOpenTags?: () => void;
  onOpenSpecialPages?: () => void;
  onOpenAllPages?: () => void;
  onOpenAppearance?: () => void;
  onOpenShortcuts?: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
  onToggleTheme: () => void;
}

const SIDEBAR_RECENT_LIMIT = 6;
const SIDEBAR_SEARCH_LIMIT = 15;

const MOBILE_BREAKPOINT_PX = 1024;
const EDGE_ACTIVATION_PX = 48;
const AXIS_LOCK_THRESHOLD_PX = 10;
const DRAWER_SWIPE_THRESHOLD_RATIO = 0.32;
const SWIPE_VELOCITY_THRESHOLD = 0.35;

function isConflictingTouchTarget(target: EventTarget | null): boolean {
  let node = target instanceof HTMLElement ? target : null;
  while (node && node !== document.body) {
    const tag = node.tagName;
    if (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      node.isContentEditable
    ) {
      return true;
    }
    if (node.scrollWidth > node.clientWidth + 4) {
      const style = window.getComputedStyle(node);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
        return true;
      }
    }
    node = node.parentElement;
  }
  return false;
}

function hasOtherBlockingDialog(): boolean {
  const dialogs = document.querySelectorAll('[role="dialog"]');
  for (const el of dialogs) {
    if (el.getAttribute('data-sidebar-drawer') !== 'true') {
      return true;
    }
  }
  return false;
}

export const Sidebar: React.FC<SidebarProps> = ({
  siteTitle,
  pages,
  activeSlug,
  isOpenMobile,
  gestureDisabled = false,
  user,
  personalPageSlug,
  discussionPageSlug,
  governanceRole = 'member',
  isAdminViewActive = false,
  isEcosystemViewActive = false,
  isCategoriesViewActive = false,
  isTagsViewActive = false,
  isSpecialViewActive = false,
  isAllPagesViewActive = false,
  isAppearanceViewActive = false,
  isDark,
  themePreference = 'system',
  canToggleTheme = true,
  forcedColorMode,
  showQuickCreate = true,
  showSidebarFilter = true,
  activeTagFilter = null,
  onSelectTagFilter,
  onClearTagFilter,
  showUserProfileLinks = true,
  showPwaInstall = true,
  showWatchlist = true,
  watchlistItems = [],
  watchlistLoading = false,
  isBlocked = false,
  onWatchCurrentPage,
  onRemoveWatchlistItem,
  onOpenMobile,
  onCloseMobile,
  onSelectPage,
  onRandomPage,
  onQuickCreateSlug,
  onOpenAdmin,
  onOpenEcosystem,
  onOpenCategories,
  onOpenTags,
  onOpenSpecialPages,
  onOpenAllPages,
  onOpenAppearance,
  onOpenShortcuts,
  onSignOut,
  onSignIn,
  onToggleTheme,
}) => {
  const [sidebarMode, setSidebarMode] = React.useState<'pages' | 'watchlist'>('pages');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [openTagDropdownVariant, setOpenTagDropdownVariant] = React.useState<
    'desktop' | 'mobile' | null
  >(null);
  const [tagSearchQuery, setTagSearchQuery] = React.useState('');
  const [quickSlugInput, setQuickSlugInput] = React.useState('');
  const desktopTagMenuRef = React.useRef<HTMLDivElement | null>(null);
  const mobileTagMenuRef = React.useRef<HTMLDivElement | null>(null);
  const desktopTagSearchRef = React.useRef<HTMLInputElement | null>(null);
  const mobileTagSearchRef = React.useRef<HTMLInputElement | null>(null);
  const mobileBackdropRef = React.useRef<HTMLDivElement | null>(null);
  const mobileDrawerRef = React.useRef<HTMLElement | null>(null);
  const touchSessionRef = React.useRef<{
    active: boolean;
    mode: 'open' | 'close';
    axisLocked: 'none' | 'horizontal' | 'vertical';
    startX: number;
    startY: number;
    startTime: number;
    drawerWidth: number;
    lastDeltaX: number;
  }>({
    active: false,
    mode: 'open',
    axisLocked: 'none',
    startX: 0,
    startY: 0,
    startTime: 0,
    drawerWidth: 280,
    lastDeltaX: 0,
  });

  // Lock background page scroll while mobile drawer is open
  React.useEffect(() => {
    if (!isOpenMobile || typeof window === 'undefined') return;
    if (window.innerWidth >= MOBILE_BREAKPOINT_PX) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpenMobile]);

  // Swipe-to-open (from left viewport edge) and swipe-to-close gestures for touch screens
  React.useEffect(() => {
    if (gestureDisabled || typeof window === 'undefined') return;

    const resetImperativeStyles = () => {
      const drawer = mobileDrawerRef.current;
      const backdrop = mobileBackdropRef.current;
      if (drawer) {
        drawer.style.transform = '';
        drawer.style.transition = '';
        drawer.style.visibility = '';
      }
      if (backdrop) {
        backdrop.style.opacity = '';
        backdrop.style.transition = '';
        backdrop.style.visibility = '';
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (window.innerWidth >= MOBILE_BREAKPOINT_PX) return;
      if (e.touches.length !== 1) return;
      if (hasOtherBlockingDialog()) return;

      const touch = e.touches[0];
      if (!isOpenMobile) {
        if (!onOpenMobile || touch.clientX > EDGE_ACTIVATION_PX) return;
        if (isConflictingTouchTarget(e.target)) return;
      } else {
        const targetEl = e.target instanceof HTMLElement ? e.target : null;
        if (
          targetEl &&
          (targetEl.tagName === 'INPUT' || targetEl.tagName === 'TEXTAREA')
        ) {
          return;
        }
      }

      const drawerRectWidth =
        mobileDrawerRef.current?.getBoundingClientRect().width || 0;
      const drawerWidth =
        drawerRectWidth > 0
          ? drawerRectWidth
          : Math.min(280, Math.round(window.innerWidth * 0.85));

      touchSessionRef.current = {
        active: true,
        mode: isOpenMobile ? 'close' : 'open',
        axisLocked: 'none',
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: performance.now(),
        drawerWidth,
        lastDeltaX: 0,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      const session = touchSessionRef.current;
      if (!session.active) return;

      if (e.touches.length !== 1) {
        session.active = false;
        resetImperativeStyles();
        return;
      }

      const touch = e.touches[0];
      const deltaX = touch.clientX - session.startX;
      const deltaY = touch.clientY - session.startY;

      if (session.axisLocked === 'none') {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (absX < AXIS_LOCK_THRESHOLD_PX && absY < AXIS_LOCK_THRESHOLD_PX) {
          return;
        }
        if (absY >= absX) {
          session.axisLocked = 'vertical';
          session.active = false;
          return;
        }
        if (session.mode === 'open' && deltaX > 0 && deltaX > absY * 1.15) {
          session.axisLocked = 'horizontal';
        } else if (session.mode === 'close' && deltaX < 0 && absX > absY * 1.15) {
          session.axisLocked = 'horizontal';
        } else {
          session.axisLocked = 'vertical';
          session.active = false;
          return;
        }
      }

      if (session.axisLocked !== 'horizontal') return;

      if (e.cancelable) {
        e.preventDefault();
      }
      session.lastDeltaX = deltaX;

      const width = session.drawerWidth || 280;
      const offsetPx =
        session.mode === 'open'
          ? Math.max(-width, Math.min(0, -width + deltaX))
          : Math.max(-width, Math.min(0, deltaX));
      const progress = Math.max(0, Math.min(1, (width + offsetPx) / width));

      const drawer = mobileDrawerRef.current;
      const backdrop = mobileBackdropRef.current;
      if (drawer) {
        drawer.style.transition = 'none';
        drawer.style.visibility = 'visible';
        drawer.style.transform = `translate3d(${offsetPx}px, 0, 0)`;
      }
      if (backdrop) {
        backdrop.style.transition = 'none';
        backdrop.style.visibility = 'visible';
        backdrop.style.opacity = String(progress);
      }
    };

    const handleTouchEnd = () => {
      const session = touchSessionRef.current;
      if (!session.active) return;
      session.active = false;

      const wasHorizontal = session.axisLocked === 'horizontal';
      const deltaX = session.lastDeltaX;
      const width = session.drawerWidth || 280;
      const elapsedMs = Math.max(1, performance.now() - session.startTime);
      const velocityX = Math.abs(deltaX) / elapsedMs;

      resetImperativeStyles();

      if (!wasHorizontal) return;

      if (session.mode === 'open') {
        const shouldOpen =
          deltaX >= width * DRAWER_SWIPE_THRESHOLD_RATIO ||
          (deltaX >= 32 && velocityX >= SWIPE_VELOCITY_THRESHOLD);
        if (shouldOpen) {
          onOpenMobile?.();
        }
      } else {
        const shouldClose =
          -deltaX >= width * DRAWER_SWIPE_THRESHOLD_RATIO ||
          (-deltaX >= 32 && velocityX >= SWIPE_VELOCITY_THRESHOLD);
        if (shouldClose) {
          onCloseMobile();
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      resetImperativeStyles();
    };
  }, [isOpenMobile, gestureDisabled, onOpenMobile, onCloseMobile]);

  const filteredPages = React.useMemo(() => {
    if (!showSidebarFilter) return pages;
    const normalizedTag = activeTagFilter?.trim().toLowerCase() ?? '';
    const q = searchQuery.trim().toLowerCase();
    if (!normalizedTag && !q) return pages;
    return pages.filter((p) => {
      if (normalizedTag && !p.tags.some((t) => t.toLowerCase() === normalizedTag)) {
        return false;
      }
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [pages, searchQuery, activeTagFilter, showSidebarFilter]);

  React.useEffect(() => {
    if (!showWatchlist && sidebarMode === 'watchlist') {
      setSidebarMode('pages');
    }
  }, [showWatchlist, sidebarMode]);

  React.useEffect(() => {
    if (activeTagFilter) {
      setSidebarMode('pages');
    }
  }, [activeTagFilter]);

  React.useEffect(() => {
    if (!showSidebarFilter && openTagDropdownVariant !== null) {
      setOpenTagDropdownVariant(null);
      setTagSearchQuery('');
    }
  }, [showSidebarFilter, openTagDropdownVariant]);

  React.useEffect(() => {
    if (!isOpenMobile && openTagDropdownVariant === 'mobile') {
      setOpenTagDropdownVariant(null);
      setTagSearchQuery('');
    }
  }, [isOpenMobile, openTagDropdownVariant]);

  React.useEffect(() => {
    if (!openTagDropdownVariant) return;
    const focusTimer = window.setTimeout(() => {
      const targetInput =
        openTagDropdownVariant === 'mobile'
          ? mobileTagSearchRef.current
          : desktopTagSearchRef.current;
      targetInput?.focus();
    }, 15);

    const handleMouseDown = (e: MouseEvent) => {
      const activeContainer =
        openTagDropdownVariant === 'mobile'
          ? mobileTagMenuRef.current
          : desktopTagMenuRef.current;
      if (activeContainer && !activeContainer.contains(e.target as Node)) {
        setOpenTagDropdownVariant(null);
        setTagSearchQuery('');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setOpenTagDropdownVariant(null);
        setTagSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openTagDropdownVariant]);

  const availableTags = React.useMemo(() => {
    const map = new Map<string, { tag: string; slugs: Set<string> }>();
    for (const page of pages) {
      for (const rawTag of page.tags) {
        const trimmed = rawTag.trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.slugs.add(page.slug);
        } else {
          map.set(key, { tag: trimmed, slugs: new Set([page.slug]) });
        }
      }
    }
    return Array.from(map.values())
      .map((entry) => ({ tag: entry.tag, count: entry.slugs.size }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'en-US'));
  }, [pages]);

  const filteredAvailableTags = React.useMemo(() => {
    const q = tagSearchQuery.trim().toLowerCase();
    if (!q) return availableTags;
    return availableTags.filter((entry) => entry.tag.toLowerCase().includes(q));
  }, [availableTags, tagSearchQuery]);

  const handleChooseTag = (tag: string | null) => {
    if (tag === null) {
      if (onSelectTagFilter) {
        onSelectTagFilter(null);
      } else {
        onClearTagFilter?.();
      }
    } else if (
      activeTagFilter &&
      activeTagFilter.toLowerCase() === tag.toLowerCase()
    ) {
      if (onSelectTagFilter) {
        onSelectTagFilter(null);
      } else {
        onClearTagFilter?.();
      }
    } else {
      onSelectTagFilter?.(tag);
      setSidebarMode('pages');
    }
    setOpenTagDropdownVariant(null);
    setTagSearchQuery('');
  };

  const pageBySlug = React.useMemo(() => {
    const map = new Map<string, WikiPage>();
    for (const p of pages) {
      map.set(p.slug, p);
    }
    return map;
  }, [pages]);

  const filteredWatchlist = React.useMemo(() => {
    if (!showWatchlist) return [];
    const q = showSidebarFilter ? searchQuery.trim().toLowerCase() : '';
    return watchlistItems.filter((item) => {
      const livePage = pageBySlug.get(item.pageSlug);
      if (!q) return true;
      const title = (livePage?.title ?? item.pageTitle).toLowerCase();
      const slug = item.pageSlug.toLowerCase();
      const matchesTags = livePage ? livePage.tags.some((t) => t.toLowerCase().includes(q)) : false;
      return title.includes(q) || slug.includes(q) || matchesTags;
    });
  }, [showWatchlist, showSidebarFilter, watchlistItems, pageBySlug, searchQuery]);

  const isFilteringSidebar = Boolean(
    showSidebarFilter && (searchQuery.trim() || activeTagFilter)
  );

  const recentSidebarPages = React.useMemo(() => {
    const sorted = [...filteredPages].sort((a, b) => {
      const ta = a.updatedAt?.toMillis() ?? a.createdAt?.toMillis() ?? 0;
      const tb = b.updatedAt?.toMillis() ?? b.createdAt?.toMillis() ?? 0;
      if (tb !== ta) return tb - ta;
      return a.title.localeCompare(b.title, 'en-US');
    });
    const limit = isFilteringSidebar ? SIDEBAR_SEARCH_LIMIT : SIDEBAR_RECENT_LIMIT;
    return sorted.slice(0, limit);
  }, [filteredPages, isFilteringSidebar]);

  const handleQuickCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = toWikiSlug(quickSlugInput);
    if (!slug) return;
    setQuickSlugInput('');
    onQuickCreateSlug(slug);
    onCloseMobile();
  };

  const renderSidebarContent = (variant: 'desktop' | 'mobile') => {
    const quickCreatorId =
      variant === 'mobile' ? 'quick-slug-creator-mobile' : 'quick-slug-creator';
    const filterInputId =
      variant === 'mobile' ? 'sidebar-page-filter-mobile' : 'sidebar-page-filter';
    const tagSearchInputId =
      variant === 'mobile' ? 'sidebar-tag-search-mobile' : 'sidebar-tag-search';
    const isTagMenuOpen = openTagDropdownVariant === variant;

    return (
      <div
        data-wiki-surface="panel"
        className="flex flex-col h-full bg-white dark:bg-[#0f1623] border-r border-slate-200 dark:border-slate-800"
      >
        <div className="p-4 space-y-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between lg:hidden">
            <span className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Wiki Navigation
            </span>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close sidebar"
              className="p-2 -mr-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Wikidot-style Quick Page Creator */}
          {showQuickCreate && (
            <form onSubmit={handleQuickCreateSubmit} className="space-y-1.5">
              <label
                htmlFor={quickCreatorId}
                className="block text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Quick create by slug
              </label>
              <div className="flex items-center gap-1.5">
                <div
                  data-wiki-surface="inset"
                  className="flex-1 flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] px-2.5"
                >
                  <span className="text-xs font-mono text-slate-400 select-none">:</span>
                  <input
                    id={quickCreatorId}
                    type="text"
                    value={quickSlugInput}
                    onChange={(e) => setQuickSlugInput(e.target.value)}
                    placeholder="new-page"
                    className="w-full py-1.5 pl-1 text-xs font-mono bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  title="Create or open page"
                  disabled={!toWikiSlug(quickSlugInput)}
                  className="p-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors disabled:opacity-40 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* Live Sidebar Filter & Tag Browser */}
          {showSidebarFilter && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id={filterInputId}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter pages... (Ctrl+K)"
                  data-wiki-surface="inset"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>

              <div
                ref={variant === 'mobile' ? mobileTagMenuRef : desktopTagMenuRef}
                className="relative"
              >
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-expanded={isTagMenuOpen}
                    aria-haspopup="listbox"
                    onClick={() => {
                      if (isTagMenuOpen) {
                        setOpenTagDropdownVariant(null);
                        setTagSearchQuery('');
                      } else {
                        setTagSearchQuery('');
                        setOpenTagDropdownVariant(variant);
                      }
                    }}
                    data-wiki-surface={activeTagFilter ? 'nav-active' : 'inset'}
                    className={`flex-1 min-w-0 flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                      activeTagFilter
                        ? 'border-blue-300 dark:border-blue-800/80 bg-blue-50/90 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-medium'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f17] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <Tag
                        className={`w-3.5 h-3.5 shrink-0 ${
                          activeTagFilter
                            ? 'text-blue-700 dark:text-blue-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      />
                      <span className="truncate font-mono">
                        {activeTagFilter ? `#${activeTagFilter}` : 'Browse by tag'}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <span
                        className={`font-mono tabular-nums text-[11px] ${
                          activeTagFilter
                            ? 'text-blue-700/85 dark:text-blue-300/85'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        ({activeTagFilter ? filteredPages.length : availableTags.length})
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-150 ${
                          isTagMenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </span>
                  </button>

                  {activeTagFilter && (
                    <button
                      type="button"
                      onClick={() => handleChooseTag(null)}
                      aria-label={`Clear tag filter #${activeTagFilter}`}
                      title="Clear tag filter"
                      className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-800/80 bg-blue-50/90 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isTagMenuOpen && (
                  <div
                    data-wiki-surface="panel"
                    className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f1623] shadow-lg overflow-hidden"
                  >
                    <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17]/70">
                      <label htmlFor={tagSearchInputId} className="sr-only">
                        Search available tags
                      </label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          ref={
                            variant === 'mobile'
                              ? mobileTagSearchRef
                              : desktopTagSearchRef
                          }
                          id={tagSearchInputId}
                          type="text"
                          value={tagSearchQuery}
                          onChange={(e) => setTagSearchQuery(e.target.value)}
                          placeholder="Search tags..."
                          autoComplete="off"
                          data-wiki-surface="inset"
                          className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                        />
                        {tagSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setTagSearchQuery('')}
                            aria-label="Clear tag search"
                            className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      role="listbox"
                      aria-label="Available wiki tags"
                      className="max-h-56 overflow-y-auto overscroll-contain p-1.5 space-y-0.5"
                    >
                      {activeTagFilter && !tagSearchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => handleChooseTag(null)}
                          className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                        >
                          <span className="truncate">All pages (clear #{activeTagFilter})</span>
                          <X className="w-3 h-3 shrink-0 opacity-70" />
                        </button>
                      )}

                      {availableTags.length === 0 ? (
                        <div className="px-2.5 py-3 text-xs text-slate-500 dark:text-slate-400">
                          No tags available across wiki pages yet.
                        </div>
                      ) : filteredAvailableTags.length === 0 ? (
                        <div className="px-2.5 py-3 text-xs text-slate-500 dark:text-slate-400">
                          No tags match &ldquo;{tagSearchQuery.trim()}&rdquo;.
                        </div>
                      ) : (
                        filteredAvailableTags.map((entry) => {
                          const isSelected =
                            activeTagFilter !== null &&
                            activeTagFilter.toLowerCase() === entry.tag.toLowerCase();
                          return (
                            <button
                              key={entry.tag.toLowerCase()}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => handleChooseTag(entry.tag)}
                              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 font-semibold'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                              }`}
                            >
                              <span className="inline-flex items-center gap-1.5 min-w-0 font-mono truncate">
                                <span className="text-slate-400 dark:text-slate-500 shrink-0">#</span>
                                <span className="truncate">{entry.tag}</span>
                              </span>
                              <span className="inline-flex items-center gap-1.5 shrink-0 font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                                <span>{entry.count}</span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                                )}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {onRandomPage && (
            <button
              type="button"
              disabled={pages.length === 0}
              onClick={() => {
                onRandomPage();
                onCloseMobile();
              }}
              title="Open a random article from the knowledge base"
              data-wiki-surface="inset"
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-700/60 dark:hover:border-blue-500/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Shuffle className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" data-wiki-surface="link" />
              <span>Random Article</span>
            </button>
          )}

          {onOpenCategories && (
            <button
              type="button"
              onClick={() => {
                onOpenCategories();
                onCloseMobile();
              }}
              data-wiki-surface={isCategoriesViewActive ? 'nav-active' : 'inset'}
              className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isCategoriesViewActive
                  ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-semibold'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-700/60 dark:hover:border-blue-500/60'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" data-wiki-surface="link" />
              <span>Categories</span>
            </button>
          )}

          {onOpenTags && (
            <button
              type="button"
              onClick={() => {
                onOpenTags();
                onCloseMobile();
              }}
              data-wiki-surface={isTagsViewActive ? 'nav-active' : 'inset'}
              className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isTagsViewActive
                  ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-semibold'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-700/60 dark:hover:border-blue-500/60'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" data-wiki-surface="link" />
              <span>Tag Management</span>
            </button>
          )}

          {onOpenSpecialPages && (
            <button
              type="button"
              onClick={() => {
                onOpenSpecialPages();
                onCloseMobile();
              }}
              data-wiki-surface={isSpecialViewActive ? 'nav-active' : 'inset'}
              className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isSpecialViewActive
                  ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-semibold'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-700/60 dark:hover:border-blue-500/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" data-wiki-surface="link" />
              <span>Special Pages Hub</span>
            </button>
          )}

          {onOpenEcosystem && (
            <button
              type="button"
              onClick={() => {
                onOpenEcosystem();
                onCloseMobile();
              }}
              data-wiki-surface={isEcosystemViewActive ? 'nav-active' : 'inset'}
              className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isEcosystemViewActive
                  ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-semibold'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-700/60 dark:hover:border-blue-500/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" data-wiki-surface="link" />
              <span>WazzimaGiygg Ecosystem</span>
            </button>
          )}
        </div>

        {/* Sidebar View Switcher (Pages / Watchlist) */}
        {showWatchlist && (
          <div className="px-3 pt-3 pb-1 shrink-0">
            <div
              role="tablist"
              aria-label="Sidebar view"
              className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80"
            >
              <button
                type="button"
                role="tab"
                aria-selected={sidebarMode === 'pages'}
                onClick={() => setSidebarMode('pages')}
                className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sidebarMode === 'pages'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Pages</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sidebarMode === 'watchlist'}
                onClick={() => setSidebarMode('watchlist')}
                className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sidebarMode === 'watchlist'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 shrink-0" />
                <span>Watchlist</span>
                {user && (
                  <span className="font-mono text-[10px] tabular-nums opacity-75">
                    ({watchlistItems.length})
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Category Tree or Watchlist View */}
        <nav
          aria-label={
            showWatchlist && sidebarMode === 'watchlist' ? 'Watchlist bookmarks' : 'Category index'
          }
          className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-5"
        >
        {showWatchlist && sidebarMode === 'watchlist' ? (
          !user ? (
            <div className="px-2 py-4 space-y-3 text-xs text-slate-600 dark:text-slate-400">
              <p className="leading-relaxed">
                Sign in with your Google account to bookmark articles to your personal Watchlist.
              </p>
              <button
                type="button"
                onClick={() => {
                  onSignIn();
                  onCloseMobile();
                }}
                className="w-full py-1.5 px-3 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Sign in to use Watchlist
              </button>
            </div>
          ) : watchlistLoading ? (
            <div className="px-2 py-2 space-y-2.5" aria-busy="true" aria-label="Loading watchlist">
              <div className="h-7 rounded-md bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
              <div className="h-7 rounded-md bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
              <div className="h-7 rounded-md bg-slate-200/80 dark:bg-slate-800 animate-pulse" />
            </div>
          ) : watchlistItems.length === 0 ? (
            <div className="px-2 py-4 space-y-3 text-xs text-slate-500 dark:text-slate-400">
              <p className="font-medium text-slate-700 dark:text-slate-300">
                No watched articles yet.
              </p>
              <p className="leading-relaxed">
                Use the <span className="font-medium text-slate-700 dark:text-slate-200">Watch</span>{' '}
                button in any article header to bookmark pages to your profile.
              </p>
              {activeSlug && onWatchCurrentPage && !isBlocked && (
                <button
                  type="button"
                  onClick={onWatchCurrentPage}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-blue-700/40 dark:border-blue-500/40 bg-blue-50/70 dark:bg-blue-950/35 text-xs font-medium text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5 shrink-0" />
                  <span>Watch current page</span>
                </button>
              )}
            </div>
          ) : filteredWatchlist.length === 0 ? (
            <div className="px-2 py-4 text-xs text-slate-500 dark:text-slate-400">
              No watched pages match your filter.
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Watched Articles</span>
                </span>
                <span className="font-mono tabular-nums text-[11px]">
                  {filteredWatchlist.length}
                </span>
              </div>
              <ul className="space-y-1">
                {filteredWatchlist.map((item) => {
                  const livePage = pageBySlug.get(item.pageSlug);
                  const title = livePage?.title ?? item.pageTitle;
                  const categoryId = livePage?.category ?? item.pageCategory;
                  const categoryLabel =
                    WIKI_CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId;
                  const isActive = activeSlug === item.pageSlug;
                  const isPrivateOrLocked = Boolean(
                    livePage?.isLocked || (livePage?.visibility ?? item.pageVisibility) === 'private'
                  );

                  return (
                    <li
                      key={item.pageSlug}
                      className={`group flex items-center justify-between gap-1 rounded-md transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPage(item.pageSlug);
                          onCloseMobile();
                        }}
                        data-wiki-surface={isActive ? 'nav-active' : undefined}
                        className="flex-1 min-w-0 flex items-start gap-2 px-2.5 py-1.5 text-left cursor-pointer"
                      >
                        <Bookmark
                          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                            isActive
                              ? 'text-blue-700 dark:text-blue-400 fill-current'
                              : 'text-blue-700/80 dark:text-blue-400/80'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-xs truncate ${
                              isActive ? 'font-semibold' : 'font-medium'
                            }`}
                          >
                            {title}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                            :{item.pageSlug} · {livePage ? categoryLabel : 'Unavailable'}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-0.5 pr-1 shrink-0">
                        {isPrivateOrLocked && (
                          <Lock
                            className="w-3 h-3 text-slate-400 shrink-0"
                            aria-label={
                              (livePage?.visibility ?? item.pageVisibility) === 'private'
                                ? 'Private page'
                                : 'Editing locked'
                            }
                          />
                        )}
                        {onRemoveWatchlistItem && !isBlocked && (
                          <button
                            type="button"
                            onClick={() => onRemoveWatchlistItem(item.pageSlug)}
                            title={`Remove "${title}" from Watchlist`}
                            aria-label={`Remove ${title} from Watchlist`}
                            className="p-1 rounded text-slate-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 opacity-75 group-hover:opacity-100 focus:opacity-100 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )
        ) : filteredPages.length === 0 ? (
          <div className="px-2 py-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
            <p>
              {pages.length === 0
                ? 'No pages published yet.'
                : activeTagFilter
                  ? `No pages tagged #${activeTagFilter}${searchQuery.trim() ? ` matching "${searchQuery.trim()}"` : ''}.`
                  : 'No pages match your filter.'}
            </p>
            {activeTagFilter && onClearTagFilter && (
              <button
                type="button"
                onClick={onClearTagFilter}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Clear tag filter</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{isFilteringSidebar ? 'Matching Pages' : 'Recent Pages'}</span>
              </span>
              <span className="font-mono tabular-nums text-[11px]">
                {recentSidebarPages.length}
                {filteredPages.length > recentSidebarPages.length
                  ? ` / ${filteredPages.length}`
                  : ''}
              </span>
            </div>

            <ul className="space-y-0.5">
              {recentSidebarPages.map((page) => {
                const isActive = activeSlug === page.slug;
                return (
                  <li key={page.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPage(page.slug);
                        onCloseMobile();
                      }}
                      data-wiki-surface={isActive ? 'nav-active' : undefined}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs rounded-md transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{page.title}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                        {(page.isLocked || page.visibility === 'private') && (
                          <Lock
                            className="w-3 h-3 shrink-0"
                            aria-label={
                              page.visibility === 'private' ? 'Private page' : 'Editing locked'
                            }
                          />
                        )}
                        <span>{formatRelativeTime(page.updatedAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {onOpenAllPages && pages.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    onOpenAllPages();
                    onCloseMobile();
                  }}
                  data-wiki-surface={isAllPagesViewActive ? 'nav-active' : 'inset'}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    isAllPagesViewActive
                      ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-blue-700/50'
                  }`}
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <List className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                    <span className="truncate">List all pages ({pages.length})</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Account & Theme Footer */}
      <div
        data-wiki-surface="inset"
        className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/70 dark:bg-[#0b0f17]/70"
      >
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName ?? 'Collaborator'}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div
                    data-wiki-surface="accent"
                    className="w-7 h-7 rounded-full bg-blue-700 text-white text-xs font-semibold flex items-center justify-center shrink-0"
                  >
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                    {user.displayName || 'Collaborator'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                title="Sign out"
                className="p-1.5 rounded-md text-slate-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {showUserProfileLinks && personalPageSlug && discussionPageSlug && (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onSelectPage(personalPageSlug);
                    onCloseMobile();
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                    !isAdminViewActive && activeSlug === personalPageSlug
                      ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <UserIcon className="w-3 h-3 shrink-0" />
                  <span>My Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectPage(discussionPageSlug);
                    onCloseMobile();
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                    !isAdminViewActive && activeSlug === discussionPageSlug
                      ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3 h-3 shrink-0" />
                  <span>Discussion</span>
                </button>
              </div>
            )}

            {(governanceRole === 'admin' || governanceRole === 'bureaucrat') && onOpenAdmin && (
              <button
                type="button"
                onClick={() => {
                  onOpenAdmin();
                  onCloseMobile();
                }}
                className={`w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                  isAdminViewActive
                    ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {governanceRole === 'bureaucrat' ? 'Bureaucrat & Admin' : 'Admin Console'}
                </span>
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="w-full py-1.5 px-3 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Sign in to collaborate
          </button>
        )}

        {showPwaInstall && <PWAInstallButton siteTitle={siteTitle} />}

        <div className="flex items-center justify-between gap-1.5 pt-1">
          {onOpenShortcuts ? (
            <button
              type="button"
              onClick={onOpenShortcuts}
              title="Keyboard shortcuts (?)"
              className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Shortcuts</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Theme</span>
          )}

          <div className="flex items-center gap-1 shrink-0">
            {onOpenAppearance && (
              <button
                type="button"
                onClick={() => {
                  onOpenAppearance();
                  onCloseMobile();
                }}
                title="Appearance & theme settings"
                className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isAppearanceViewActive
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <Palette className="w-3.5 h-3.5 shrink-0" />
                <span>Appearance</span>
              </button>
            )}

            <button
              type="button"
              disabled={!canToggleTheme}
              onClick={onToggleTheme}
              aria-label={
                !canToggleTheme
                  ? `${forcedColorMode === 'dark' ? 'Dark' : 'Light'} color scheme enforced by site extensions`
                  : isDark
                  ? 'Switch to Light mode'
                  : 'Switch to Dark mode'
              }
              title={
                !canToggleTheme
                  ? `${forcedColorMode === 'dark' ? 'Dark' : 'Light'} color scheme enforced by site extensions`
                  : themePreference === 'system'
                  ? `Following System (${isDark ? 'Dark' : 'Light'}) — click to override`
                  : isDark
                  ? 'Dark mode — click to switch to Light'
                  : 'Light mode — click to switch to Dark'
              }
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {themePreference === 'system' && canToggleTheme ? (
                <Monitor className="w-3.5 h-3.5" />
              ) : isDark ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
              {!onOpenAppearance && (
                <span>
                  {!canToggleTheme
                    ? forcedColorMode === 'dark'
                      ? 'Dark (locked)'
                      : 'Light (locked)'
                    : themePreference === 'system'
                    ? `System (${isDark ? 'Dark' : 'Light'})`
                    : isDark
                    ? 'Light mode'
                    : 'Dark mode'}
                </span>
              )}
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside data-wiki-chrome="sidebar" className="hidden lg:block w-[264px] shrink-0 print:hidden">
        {renderSidebarContent('desktop')}
      </aside>

      {/* Mobile Swipeable Drawer */}
      <div
        data-wiki-chrome="sidebar"
        aria-hidden={!isOpenMobile}
        className={`fixed inset-0 z-40 lg:hidden flex print:hidden ${
          isOpenMobile ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div
          ref={mobileBackdropRef}
          onClick={onCloseMobile}
          className={`fixed inset-0 bg-slate-950/40 backdrop-blur-[1px] transition-[opacity,visibility] duration-200 ease-out motion-reduce:transition-none ${
            isOpenMobile
              ? 'opacity-100 visible pointer-events-auto'
              : 'opacity-0 invisible pointer-events-none'
          }`}
        />
        <aside
          ref={mobileDrawerRef}
          data-sidebar-drawer="true"
          role={isOpenMobile ? 'dialog' : undefined}
          aria-modal={isOpenMobile ? true : undefined}
          aria-label="Wiki navigation drawer"
          className={`relative z-50 w-[280px] max-w-[85vw] h-full shadow-xl transition-[transform,visibility] duration-200 ease-out motion-reduce:transition-none will-change-transform ${
            isOpenMobile
              ? 'translate-x-0 visible pointer-events-auto'
              : '-translate-x-full invisible pointer-events-none'
          }`}
        >
          {renderSidebarContent('mobile')}
        </aside>
      </div>
    </>
  );
};
