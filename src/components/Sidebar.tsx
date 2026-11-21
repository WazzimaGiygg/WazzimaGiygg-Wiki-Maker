import React from 'react';
import {
  FileText,
  FolderOpen,
  Keyboard,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Shield,
  Shuffle,
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { type GovernanceRole, WIKI_CATEGORIES, type WikiPage } from '../types/wiki';
import { toWikiSlug } from '../lib/markdownUtils';
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
  isDark: boolean;
  canToggleTheme?: boolean;
  forcedColorMode?: 'light' | 'dark';
  onOpenMobile?: () => void;
  onCloseMobile: () => void;
  onSelectPage: (slug: string) => void;
  onRandomPage?: () => void;
  onQuickCreateSlug: (slug: string) => void;
  onOpenAdmin?: () => void;
  onOpenShortcuts?: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
  onToggleTheme: () => void;
}

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
  isDark,
  canToggleTheme = true,
  forcedColorMode,
  onOpenMobile,
  onCloseMobile,
  onSelectPage,
  onRandomPage,
  onQuickCreateSlug,
  onOpenAdmin,
  onOpenShortcuts,
  onSignOut,
  onSignIn,
  onToggleTheme,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [quickSlugInput, setQuickSlugInput] = React.useState('');
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
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [pages, searchQuery]);

  const groupedByCategory = React.useMemo(() => {
    const legacyMap: Record<string, string> = {
      geral: 'general',
      guias: 'guides',
      referencia: 'reference',
      projetos: 'projects',
      rascunhos: 'drafts',
    };
    const map = new Map<string, WikiPage[]>();
    for (const cat of WIKI_CATEGORIES) {
      map.set(cat.id, []);
    }
    for (const page of filteredPages) {
      const catKey = legacyMap[page.category] ?? page.category;
      const list = map.get(catKey) ?? map.get('general') ?? [];
      list.push(page);
      map.set(map.has(catKey) ? catKey : 'general', list);
    }
    return map;
  }, [filteredPages]);

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

          {/* Live Sidebar Filter */}
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

          {onRandomPage && (
            <button
              type="button"
              disabled={pages.length === 0}
              onClick={() => {
                onRandomPage();
                onCloseMobile();
              }}
              title="Abrir um artigo aleatório da base de conhecimento"
              data-wiki-surface="inset"
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-700/60 dark:hover:border-blue-500/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Shuffle className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" data-wiki-surface="link" />
              <span>Artigo aleatório</span>
            </button>
          )}
        </div>

        {/* Category Tree */}
        <nav aria-label="Category index" className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-5">
        {filteredPages.length === 0 ? (
          <div className="px-2 py-4 text-xs text-slate-500 dark:text-slate-400">
            {pages.length === 0
              ? 'No pages published yet.'
              : 'No pages match your filter.'}
          </div>
        ) : (
          WIKI_CATEGORIES.map((cat) => {
            const items = groupedByCategory.get(cat.id) ?? [];
            if (items.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </span>
                  <span className="font-mono tabular-nums text-[11px]">{items.length}</span>
                </div>

                <ul className="space-y-0.5">
                  {items.map((page) => {
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
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs rounded-md transition-colors ${
                            isActive
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 shrink-0 opacity-70" />
                            <span className="truncate">{page.title}</span>
                          </span>
                          {(page.isLocked || page.visibility === 'private') && (
                            <Lock
                              className="w-3 h-3 shrink-0 text-slate-400"
                              aria-label={
                                page.visibility === 'private' ? 'Private page' : 'Editing locked'
                              }
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
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

            {personalPageSlug && discussionPageSlug && (
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

        <PWAInstallButton siteTitle={siteTitle} />

        <div className="flex items-center justify-between gap-2 pt-1">
          {onOpenShortcuts ? (
            <button
              type="button"
              onClick={onOpenShortcuts}
              title="Keyboard shortcuts (?)"
              className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Shortcuts</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Theme</span>
          )}
          <button
            type="button"
            disabled={!canToggleTheme}
            onClick={onToggleTheme}
            title={
              !canToggleTheme
                ? `Esquema ${forcedColorMode === 'dark' ? 'escuro' : 'claro'} definido pela burocracia nas extensões do site`
                : isDark
                ? 'Switch to Light mode'
                : 'Switch to Dark mode'
            }
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>
              {!canToggleTheme
                ? forcedColorMode === 'dark'
                  ? 'Dark (fixo)'
                  : 'Light (fixo)'
                : isDark
                ? 'Light mode'
                : 'Dark mode'}
            </span>
          </button>
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
