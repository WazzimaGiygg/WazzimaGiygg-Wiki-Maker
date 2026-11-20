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
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { type GovernanceRole, WIKI_CATEGORIES, type WikiPage } from '../types/wiki';
import { toWikiSlug } from '../lib/markdownUtils';

interface SidebarProps {
  pages: WikiPage[];
  activeSlug: string | null;
  isOpenMobile: boolean;
  user: User | null;
  personalPageSlug?: string | null;
  discussionPageSlug?: string | null;
  governanceRole?: GovernanceRole;
  isAdminViewActive?: boolean;
  isDark: boolean;
  onCloseMobile: () => void;
  onSelectPage: (slug: string) => void;
  onQuickCreateSlug: (slug: string) => void;
  onOpenAdmin?: () => void;
  onOpenShortcuts?: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  pages,
  activeSlug,
  isOpenMobile,
  user,
  personalPageSlug,
  discussionPageSlug,
  governanceRole = 'member',
  isAdminViewActive = false,
  isDark,
  onCloseMobile,
  onSelectPage,
  onQuickCreateSlug,
  onOpenAdmin,
  onOpenShortcuts,
  onSignOut,
  onSignIn,
  onToggleTheme,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [quickSlugInput, setQuickSlugInput] = React.useState('');

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

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0f1623] border-r border-slate-200 dark:border-slate-800">
      <div className="p-4 space-y-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between lg:hidden">
          <span className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Wiki Navigation
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wikidot-style Quick Page Creator */}
        <form onSubmit={handleQuickCreateSubmit} className="space-y-1.5">
          <label
            htmlFor="quick-slug-creator"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Quick create by slug
          </label>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] px-2.5">
              <span className="text-xs font-mono text-slate-400 select-none">:</span>
              <input
                id="quick-slug-creator"
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
            id="sidebar-page-filter"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter pages... (Ctrl+K)"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
          />
        </div>
      </div>

      {/* Category Tree */}
      <nav aria-label="Category index" className="flex-1 overflow-y-auto p-3 space-y-5">
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
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/70 dark:bg-[#0b0f17]/70">
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
                  <div className="w-7 h-7 rounded-full bg-blue-700 text-white text-xs font-semibold flex items-center justify-center shrink-0">
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
            onClick={onToggleTheme}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <aside className="relative z-50 w-[280px] max-w-[85vw] h-full">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
};
