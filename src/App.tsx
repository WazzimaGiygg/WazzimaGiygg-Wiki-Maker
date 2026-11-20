import React from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  BookOpen,
  Check,
  Code2,
  Copy,
  Download,
  Edit3,
  FilePlus2,
  History,
  Lock,
  Menu,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { AdminConsoleView } from './components/AdminConsoleView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MarkdownEditor } from './components/MarkdownEditor';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { PageComments } from './components/PageComments';
import { PageIndexView } from './components/PageIndexView';
import { RevisionHistory } from './components/RevisionHistory';
import { Sidebar } from './components/Sidebar';
import { UserEditsPanel } from './components/UserEditsPanel';
import { fetchCurrentUserGovernance } from './lib/adminService';
import { ADMIN_EMAIL, auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { extractToc, formatRelativeTime, slugToTitle, toWikiSlug } from './lib/markdownUtils';
import {
  addPageComment,
  createWikiPage,
  deletePageComment,
  deleteWikiPage,
  fetchCollaboratorProfile,
  fetchPageRevisions,
  fetchUserEdits,
  restorePageRevision,
  seedStarterWiki,
  syncUserDocuments,
  updateWikiPage,
} from './lib/wikiService';
import {
  type BlockedUser,
  type CollaboratorProfile,
  type GovernanceRole,
  type PageComment,
  type PageRevision,
  type PageTab,
  type PageVisibility,
  type UserEdit,
  WIKI_CATEGORIES,
  type WikiPage,
  type WorkspaceView,
} from './types/wiki';

function parseHashRoute(): { view: WorkspaceView; slug: string } {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash === 'admin') return { view: 'admin', slug: 'start' };
  if (hash === 'pages' || hash === 'paginas') return { view: 'index', slug: 'start' };
  if (hash === 'recent' || hash === 'recentes') return { view: 'recent', slug: 'start' };
  if (hash.startsWith('new') || hash.startsWith('nova')) {
    const [, rawSlug] = hash.split('/');
    return { view: 'create', slug: rawSlug ? toWikiSlug(rawSlug) : '' };
  }
  if (hash.startsWith('page/')) {
    const slug = toWikiSlug(hash.slice('page/'.length)) || 'start';
    return { view: 'page', slug };
  }
  if (hash.startsWith('pagina/')) {
    const slug = toWikiSlug(hash.slice('pagina/'.length)) || 'start';
    return { view: 'page', slug };
  }
  return { view: 'page', slug: 'start' };
}

function WikiWorkspace() {
  const initialRoute = React.useMemo(() => parseHashRoute(), []);

  const [user, setUser] = React.useState<User | null>(null);
  const [authReady, setAuthReady] = React.useState(false);
  const [currentCollaborator, setCurrentCollaborator] = React.useState<CollaboratorProfile | null>(null);
  const [governanceRole, setGovernanceRole] = React.useState<GovernanceRole>('member');
  const [blockedRecord, setBlockedRecord] = React.useState<BlockedUser | null>(null);

  const [publicPages, setPublicPages] = React.useState<WikiPage[]>([]);
  const [privatePages, setPrivatePages] = React.useState<WikiPage[]>([]);
  const [pagesLoaded, setPagesLoaded] = React.useState(false);

  const [view, setView] = React.useState<WorkspaceView>(initialRoute.view);
  const [activeSlug, setActiveSlug] = React.useState<string>(initialRoute.slug || 'start');
  const [createPresetSlug, setCreatePresetSlug] = React.useState<string>(
    initialRoute.view === 'create' ? initialRoute.slug : ''
  );
  const [activeTab, setActiveTab] = React.useState<PageTab>('read');

  const [revisions, setRevisions] = React.useState<PageRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = React.useState(false);
  const [comments, setComments] = React.useState<PageComment[]>([]);
  const [personalAuthorProfile, setPersonalAuthorProfile] = React.useState<CollaboratorProfile | null>(null);
  const [personalUserEdits, setPersonalUserEdits] = React.useState<UserEdit[]>([]);
  const [personalEditsLoading, setPersonalEditsLoading] = React.useState(false);

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [restoringVersion, setRestoringVersion] = React.useState<number | null>(null);
  const [seeding, setSeeding] = React.useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [copiedSource, setCopiedSource] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('wazzimagiygg-theme') === 'dark';
  });

  // Sync theme class on <html>
  React.useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('wazzimagiygg-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('wazzimagiygg-theme', 'light');
    }
  }, [isDark]);

  // Listen for browser back/forward hash navigation
  React.useEffect(() => {
    const handleHashChange = () => {
      const next = parseHashRoute();
      setView(next.view);
      if (next.view === 'create') {
        setCreatePresetSlug(next.slug);
      } else if (next.slug) {
        setActiveSlug(next.slug);
      }
      setActiveTab('read');
      setSaveError(null);
      setConfirmDeleteOpen(false);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToPage = React.useCallback((slug: string) => {
    const normalized = toWikiSlug(slug) || 'start';
    setActiveSlug(normalized);
    setView('page');
    setActiveTab('read');
    setSaveError(null);
    setConfirmDeleteOpen(false);
    window.location.hash = `#/page/${normalized}`;
  }, []);

  // Auth listener
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        void (async () => {
          const gov = await fetchCurrentUserGovernance(currentUser);
          setGovernanceRole(gov.role);
          setBlockedRecord(gov.blocked);
          if (!gov.blocked) {
            const result = await syncUserDocuments(currentUser);
            setCurrentCollaborator(result.profile);
            const currentHash = window.location.hash;
            const isOnDefaultEntry =
              !currentHash || currentHash === '#/' || currentHash === '#/page/start';
            if (result.isNewUser && isOnDefaultEntry) {
              navigateToPage(result.profile.personalPageSlug);
            }
          }
        })();
      } else {
        setCurrentCollaborator(null);
        setGovernanceRole('member');
        setBlockedRecord(null);
      }
    });
    return unsub;
  }, [navigateToPage]);

  // Subscribe to public pages (always allowed by rules)
  React.useEffect(() => {
    if (!authReady) return;
    const q = query(collection(db, 'pages'), where('visibility', '==', 'public'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => d.data() as WikiPage);
        setPublicPages(docs);
        setPagesLoaded(true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'pages');
      }
    );
    return unsub;
  }, [authReady]);

  // Subscribe to current user's private pages when authenticated
  React.useEffect(() => {
    if (!authReady || !user) {
      setPrivatePages([]);
      return;
    }
    const q = query(collection(db, 'pages'), where('authorId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs
          .map((d) => d.data() as WikiPage)
          .filter((p) => p.visibility === 'private');
        setPrivatePages(docs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'pages');
      }
    );
    return unsub;
  }, [authReady, user]);

  // Merge public & user's private pages cleanly
  const allPages = React.useMemo(() => {
    const bySlug = new Map<string, WikiPage>();
    for (const p of publicPages) bySlug.set(p.slug, p);
    for (const p of privatePages) bySlug.set(p.slug, p);
    return Array.from(bySlug.values()).sort((a, b) => a.title.localeCompare(b.title, 'en-US'));
  }, [publicPages, privatePages]);

  const existingSlugs = React.useMemo(() => new Set(allPages.map((p) => p.slug)), [allPages]);
  const activePage = React.useMemo(
    () => allPages.find((p) => p.slug === activeSlug) ?? null,
    [allPages, activeSlug]
  );

  // Subscribe to active page comments
  React.useEffect(() => {
    if (!authReady || view !== 'page' || !activePage) {
      setComments([]);
      return;
    }
    const commentsPath = `pages/${activePage.slug}/comments`;
    const filterField = activePage.visibility === 'public' ? 'pageVisibility' : 'pageAuthorId';
    const filterValue = activePage.visibility === 'public' ? 'public' : activePage.authorId;
    const q = query(
      collection(db, 'pages', activePage.slug, 'comments'),
      where(filterField, '==', filterValue)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PageComment, 'id'>),
        }));
        list.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        setComments(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, commentsPath);
      }
    );
    return unsub;
  }, [authReady, view, activePage?.slug, activePage?.visibility, activePage?.authorId]);

  // Fetch revisions whenever user switches to History tab
  React.useEffect(() => {
    if (view !== 'page' || activeTab !== 'history' || !activePage) return;
    let cancelled = false;
    setRevisionsLoading(true);
    fetchPageRevisions(activePage)
      .then((list) => {
        if (!cancelled) setRevisions(list);
      })
      .finally(() => {
        if (!cancelled) setRevisionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, activeTab, activePage?.slug, activePage?.version, activePage?.visibility]);

  const isPersonalProfilePage = Boolean(
    activePage &&
      activePage.tags.includes('personal') &&
      !activePage.slug.endsWith('-discussion') &&
      !activePage.tags.includes('discussion')
  );
  const isPersonalDiscussionPage = Boolean(
    activePage &&
      activePage.tags.includes('personal') &&
      (activePage.slug.endsWith('-discussion') || activePage.tags.includes('discussion'))
  );

  // Load personal collaborator profile & edit log when viewing a personal or personal-discussion page
  React.useEffect(() => {
    if (!authReady || view !== 'page' || !activePage || (!isPersonalProfilePage && !isPersonalDiscussionPage)) {
      setPersonalAuthorProfile(null);
      setPersonalUserEdits([]);
      return;
    }

    let cancelled = false;
    setPersonalEditsLoading(isPersonalProfilePage);

    const profilePromise = fetchCollaboratorProfile(activePage.authorId);
    const editsPromise = isPersonalProfilePage
      ? fetchUserEdits(activePage.authorId, user?.uid ?? null)
      : Promise.resolve<UserEdit[]>([]);

    Promise.all([profilePromise, editsPromise])
      .then(([profile, edits]) => {
        if (!cancelled) {
          setPersonalAuthorProfile(profile);
          setPersonalUserEdits(edits);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPersonalEditsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    authReady,
    view,
    activePage?.slug,
    activePage?.authorId,
    activePage?.version,
    isPersonalProfilePage,
    isPersonalDiscussionPage,
    user?.uid,
    allPages.length,
  ]);

  const navigateToCreate = (presetSlug = '') => {
    const normalized = presetSlug ? toWikiSlug(presetSlug) : '';
    if (normalized && existingSlugs.has(normalized)) {
      navigateToPage(normalized);
      return;
    }
    setCreatePresetSlug(normalized);
    setView('create');
    setSaveError(null);
    setConfirmDeleteOpen(false);
    window.location.hash = normalized ? `#/new/${normalized}` : '#/new';
  };

  const navigateToIndex = (mode: 'index' | 'recent') => {
    setView(mode);
    setSaveError(null);
    setConfirmDeleteOpen(false);
    window.location.hash = mode === 'recent' ? '#/recent' : '#/pages';
  };

  const navigateToAdmin = () => {
    setView('admin');
    setSaveError(null);
    setConfirmDeleteOpen(false);
    window.location.hash = '#/admin';
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const isAdmin = Boolean(
    user &&
      ((user.email && user.email === ADMIN_EMAIL && user.emailVerified) ||
        governanceRole === 'admin' ||
        governanceRole === 'bureaucrat')
  );
  const isBlocked = Boolean(blockedRecord);
  const canManageActiveMeta = Boolean(
    user && !isBlocked && activePage && (activePage.authorId === user.uid || isAdmin)
  );
  const canEditActivePage = Boolean(
    user &&
      !isBlocked &&
      activePage &&
      ((activePage.visibility === 'public' && !activePage.isLocked) ||
        activePage.authorId === user.uid ||
        isAdmin)
  );
  const canDeleteActivePage = canManageActiveMeta;

  const handleCreateSave = async (data: {
    slug: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    visibility: PageVisibility;
    isLocked: boolean;
    summary: string;
  }) => {
    if (!user) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const createdSlug = await createWikiPage(data, user);
      navigateToPage(createdSlug);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to create page.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSave = async (data: {
    slug: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    visibility: PageVisibility;
    isLocked: boolean;
    summary: string;
  }) => {
    if (!user || !activePage) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateWikiPage(activePage, data, user, canManageActiveMeta);
      setActiveTab('read');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update page.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreRevision = async (rev: PageRevision) => {
    if (!user || !activePage) return;
    setRestoringVersion(rev.version);
    try {
      await restorePageRevision(activePage, rev, user, canManageActiveMeta);
      setActiveTab('read');
    } finally {
      setRestoringVersion(null);
    }
  };

  const handleDeletePage = async () => {
    if (!activePage) return;
    setIsDeleting(true);
    try {
      await deleteWikiPage(activePage);
      setConfirmDeleteOpen(false);
      navigateToIndex('index');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSeedStarter = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      await seedStarterWiki(user);
      navigateToPage('start');
    } finally {
      setSeeding(false);
    }
  };

  const handleCopySource = async () => {
    if (!activePage) return;
    await navigator.clipboard.writeText(activePage.content);
    setCopiedSource(true);
    setTimeout(() => setCopiedSource(false), 1800);
  };

  const handleDownloadMarkdown = () => {
    if (!activePage) return;
    const blob = new Blob([`# ${activePage.title}\n\n${activePage.content}`], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePage.slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toc = React.useMemo(
    () => (activePage ? extractToc(activePage.content) : []),
    [activePage?.content]
  );

  const activeCategoryLabel = activePage
    ? WIKI_CATEGORIES.find((c) => c.id === activePage.category)?.label ?? activePage.category
    : '';

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0f1623]/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open wiki navigation"
              className="lg:hidden p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <a
              href="#/page/start"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('start');
              }}
              className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0"
            >
              WazzimaGiygg Maker
            </a>
          </div>

          {/* Zone 2: 4 Clean Single-Line Nav Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <a
              href="#/page/start"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('start');
              }}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                view === 'page' && activeSlug === 'start'
                  ? 'text-blue-700 dark:text-blue-400 underline underline-offset-8'
                  : ''
              }`}
            >
              Home
            </a>
            <a
              href="#/pages"
              onClick={(e) => {
                e.preventDefault();
                navigateToIndex('index');
              }}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                view === 'index' ? 'text-blue-700 dark:text-blue-400 underline underline-offset-8' : ''
              }`}
            >
              Pages
            </a>
            <a
              href="#/recent"
              onClick={(e) => {
                e.preventDefault();
                navigateToIndex('recent');
              }}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                view === 'recent'
                  ? 'text-blue-700 dark:text-blue-400 underline underline-offset-8'
                  : ''
              }`}
            >
              Recent
            </a>
            <a
              href="#/page/markdown-guide"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('markdown-guide');
              }}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                view === 'page' && activeSlug === 'markdown-guide'
                  ? 'text-blue-700 dark:text-blue-400 underline underline-offset-8'
                  : ''
              }`}
            >
              Markdown Guide
            </a>
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center shrink-0">
            {user ? (
              <button
                type="button"
                disabled={isBlocked}
                onClick={() => navigateToCreate('')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Page</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSignIn()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        <Sidebar
          pages={allPages}
          activeSlug={view === 'page' ? activeSlug : null}
          isOpenMobile={mobileMenuOpen}
          user={user}
          personalPageSlug={currentCollaborator?.personalPageSlug}
          discussionPageSlug={currentCollaborator?.discussionPageSlug}
          governanceRole={governanceRole}
          isAdminViewActive={view === 'admin'}
          isDark={isDark}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onSelectPage={navigateToPage}
          onQuickCreateSlug={navigateToCreate}
          onOpenAdmin={navigateToAdmin}
          onSignOut={() => void handleSignOut()}
          onSignIn={() => void handleSignIn()}
          onToggleTheme={() => setIsDark((prev) => !prev)}
        />

        <main className="flex-1 min-w-0 p-5 sm:p-8 lg:p-10">
          {blockedRecord && (
            <div className="max-w-5xl mb-6 p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-xs text-red-900 dark:text-red-200 space-y-1">
              <div className="font-semibold">
                Account write access suspended by wiki administration
              </div>
              <div>
                Reason: {blockedRecord.reason} · Moderator: {blockedRecord.blockedByName}
              </div>
            </div>
          )}

          {!pagesLoaded ? (
            <div className="max-w-3xl space-y-4">
              <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-9 w-2/3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800 animate-pulse mt-6" />
              <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
          ) : view === 'admin' ? (
            <div className="max-w-6xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8">
              {user && isAdmin ? (
                <AdminConsoleView
                  currentUser={user}
                  currentUserRole={
                    user.email === ADMIN_EMAIL && user.emailVerified ? 'bureaucrat' : governanceRole
                  }
                  onSelectPage={navigateToPage}
                />
              ) : (
                <div className="py-10 space-y-4">
                  <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    Administration Access Restricted
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                    This console is reserved for WazzimaGiygg Maker Bureaucrats and Administrators.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigateToPage('start')}
                    className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Return to Home
                  </button>
                </div>
              )}
            </div>
          ) : view === 'create' ? (
            <div className="max-w-5xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
              <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  wiki / new-page{createPresetSlug ? ` / :${createPresetSlug}` : ''}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  Create New Collaborative Page
                </h1>
              </div>

              {user && !isBlocked ? (
                <MarkdownEditor
                  mode="create"
                  initialSlug={createPresetSlug}
                  initialTitle={createPresetSlug ? slugToTitle(createPresetSlug) : ''}
                  initialContent=""
                  initialCategory="general"
                  initialTags={[]}
                  initialVisibility="public"
                  initialIsLocked={false}
                  canManageMeta={true}
                  existingSlugs={existingSlugs}
                  isSaving={isSaving}
                  errorMessage={saveError}
                  onSave={handleCreateSave}
                  onCancel={() => navigateToPage('start')}
                  onNavigateSlug={navigateToPage}
                />
              ) : user && isBlocked ? (
                <div className="py-8 space-y-4">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Your account is currently blocked from creating or editing wiki pages.
                  </p>
                </div>
              ) : (
                <div className="py-8 space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Sign in with your Google account to create and publish pages on WazzimaGiygg
                    Maker.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleSignIn()}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors"
                  >
                    Sign in with Google
                  </button>
                </div>
              )}
            </div>
          ) : view === 'index' || view === 'recent' ? (
            <div className="max-w-5xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8">
              <PageIndexView
                mode={view}
                pages={allPages}
                isSignedIn={Boolean(user && !isBlocked)}
                onSelectPage={navigateToPage}
                onNewPage={() => navigateToCreate('')}
              />
            </div>
          ) : !activePage ? (
            /* Page does not exist yet — Wikidot-style instant create prompt */
            <div className="max-w-3xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  wiki / :{activeSlug}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100">
                  {allPages.length === 0 && activeSlug === 'start'
                    ? 'WazzimaGiygg Maker is ready to begin'
                    : `The page ":${activeSlug}" does not exist yet`}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  {allPages.length === 0 && activeSlug === 'start'
                    ? 'This Firebase wiki workspace does not have any published pages yet. You can initialize it with starter Markdown pages or create your first page from scratch.'
                    : 'In classic Wikidot fashion, any missing page identifier can be turned into a collaborative Markdown page with one click.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {user && !isBlocked ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigateToCreate(activeSlug)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
                    >
                      <FilePlus2 className="w-4 h-4" />
                      <span>Create page :{activeSlug}</span>
                    </button>

                    {allPages.length === 0 && (
                      <button
                        type="button"
                        disabled={seeding}
                        onClick={() => void handleSeedStarter()}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {seeding ? 'Creating starter pages...' : 'Initialize with starter pages'}
                        </span>
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleSignIn()}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors"
                  >
                    Sign in with Google to create :{activeSlug}
                  </button>
                )}

                {allPages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigateToIndex('index')}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Browse all pages
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Active Wiki Page View */
            <div className="max-w-6xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
              {/* Page Header & Clean Unboxed Metadata */}
              <div className="space-y-3 pb-5 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="font-mono">
                    wiki / {activeCategoryLabel.toLowerCase()} / :{activePage.slug}
                  </div>
                  <div className="font-mono tabular-nums">
                    v{activePage.version} ·{' '}
                    {activePage.visibility === 'private' ? 'Private' : 'Public'}
                    {activePage.isLocked ? ' · Locked' : ''}
                  </div>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4">
                  <h1 className="font-display text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
                    {activePage.title}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>Created by {activePage.authorName}</span>
                  <span aria-hidden="true">·</span>
                  <span>Last edited by {activePage.lastEditorName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{formatRelativeTime(activePage.updatedAt)}</span>
                  {activePage.tags.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300">
                        {activePage.tags.map((t) => `#${t}`).join('  ')}
                      </span>
                    </>
                  )}
                </div>

                {/* Wikidot Action Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setActiveTab('read')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        activeTab === 'read'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Read</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!user) {
                          void handleSignIn();
                          return;
                        }
                        if (canEditActivePage) {
                          setSaveError(null);
                          setActiveTab('edit');
                        }
                      }}
                      disabled={Boolean(user && !canEditActivePage)}
                      title={
                        !user
                          ? 'Sign in with Google to edit'
                          : !canEditActivePage
                          ? 'This page is locked by the author'
                          : 'Edit Markdown content'
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-45 disabled:cursor-not-allowed ${
                        activeTab === 'edit'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      {activePage.isLocked && !canEditActivePage ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Edit3 className="w-3.5 h-3.5" />
                      )}
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        activeTab === 'history'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>History</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('comments')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        activeTab === 'comments'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Discussion ({comments.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('source')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        activeTab === 'source'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Source</span>
                    </button>
                  </div>

                  {canDeleteActivePage && (
                    <div className="flex items-center gap-2">
                      {!confirmDeleteOpen ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors whitespace-nowrap shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-700 dark:text-red-400 font-medium">
                            Confirm delete?
                          </span>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => void handleDeletePage()}
                            className="px-3 py-1 text-xs font-medium rounded-md bg-red-700 text-white hover:bg-red-800 transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? 'Deleting...' : 'Yes, delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteOpen(false)}
                            className="px-3 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Active Tab Content */}
              {activeTab === 'read' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                  <article className={toc.length > 0 ? 'xl:col-span-9' : 'xl:col-span-12'}>
                    {(isPersonalProfilePage || isPersonalDiscussionPage) && (
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                          {isPersonalDiscussionPage ? (
                            <MessageSquare className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                          ) : (
                            <UserIcon className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                          )}
                          <span>
                            {isPersonalDiscussionPage
                              ? `Personal Discussion Page for ${activePage.authorName}`
                              : `Personal Collaborator Page for ${activePage.authorName}`}
                          </span>
                        </div>

                        {isPersonalProfilePage && (
                          <button
                            type="button"
                            onClick={() =>
                              navigateToPage(
                                personalAuthorProfile?.discussionPageSlug ??
                                  `${activePage.slug}-discussion`
                              )
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Go to Discussion Page</span>
                          </button>
                        )}

                        {isPersonalDiscussionPage && (
                          <button
                            type="button"
                            onClick={() =>
                              navigateToPage(
                                personalAuthorProfile?.personalPageSlug ??
                                  activePage.slug.replace(/-discussion$/, '')
                              )
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                          >
                            <UserIcon className="w-3.5 h-3.5" />
                            <span>Back to Personal Page</span>
                          </button>
                        )}
                      </div>
                    )}

                    <MarkdownRenderer
                      content={activePage.content}
                      existingSlugs={existingSlugs}
                      onNavigateSlug={navigateToPage}
                    />

                    {isPersonalProfilePage && (
                      <UserEditsPanel
                        authorName={activePage.authorName}
                        edits={personalUserEdits}
                        loading={personalEditsLoading}
                        discussionPageSlug={
                          personalAuthorProfile?.discussionPageSlug ??
                          `${activePage.slug}-discussion`
                        }
                        onSelectPage={navigateToPage}
                      />
                    )}

                    {isPersonalDiscussionPage && (
                      <section
                        aria-label="Personal discussion thread"
                        className="pt-6 mt-8 border-t border-slate-200 dark:border-slate-800 space-y-4"
                      >
                        <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
                          Discussion Thread
                        </h2>
                        <PageComments
                          comments={comments}
                          currentUserId={user?.uid ?? null}
                          canModerate={canManageActiveMeta}
                          isSignedIn={Boolean(user && !isBlocked)}
                          onAddComment={async (body) => {
                            if (!user || isBlocked) return;
                            await addPageComment(activePage, body, user);
                          }}
                          onDeleteComment={async (commentId) => {
                            await deletePageComment(activePage.slug, commentId);
                          }}
                          onSignIn={() => void handleSignIn()}
                        />
                      </section>
                    )}
                  </article>

                  {toc.length > 0 && (
                    <aside className="xl:col-span-3 xl:sticky xl:top-20 border-t xl:border-t-0 xl:border-l border-slate-200 dark:border-slate-800 pt-4 xl:pt-0 xl:pl-5 space-y-2.5">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        On this page
                      </div>
                      <ul className="space-y-1.5 text-xs">
                        {toc.map((item, idx) => (
                          <li key={`${item.id}-${idx}`} className={item.level === 3 ? 'pl-3' : ''}>
                            <a
                              href={`#${item.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(item.id)?.scrollIntoView({
                                  behavior: 'smooth',
                                });
                              }}
                              className="block text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors truncate"
                            >
                              {item.text}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </aside>
                  )}
                </div>
              )}

              {activeTab === 'edit' && user && (
                <MarkdownEditor
                  mode="edit"
                  initialSlug={activePage.slug}
                  initialTitle={activePage.title}
                  initialContent={activePage.content}
                  initialCategory={activePage.category}
                  initialTags={activePage.tags}
                  initialVisibility={activePage.visibility}
                  initialIsLocked={activePage.isLocked}
                  canManageMeta={canManageActiveMeta}
                  existingSlugs={existingSlugs}
                  isSaving={isSaving}
                  errorMessage={saveError}
                  onSave={handleEditSave}
                  onCancel={() => setActiveTab('read')}
                  onNavigateSlug={navigateToPage}
                />
              )}

              {activeTab === 'history' && (
                <RevisionHistory
                  revisions={revisions}
                  loading={revisionsLoading}
                  canEdit={canEditActivePage}
                  restoringVersion={restoringVersion}
                  existingSlugs={existingSlugs}
                  onRestore={handleRestoreRevision}
                  onNavigateSlug={navigateToPage}
                />
              )}

              {activeTab === 'comments' && (
                <PageComments
                  comments={comments}
                  currentUserId={user?.uid ?? null}
                  canModerate={canManageActiveMeta}
                  isSignedIn={Boolean(user && !isBlocked)}
                  onAddComment={async (body) => {
                    if (!user || isBlocked) return;
                    await addPageComment(activePage, body, user);
                  }}
                  onDeleteComment={async (commentId) => {
                    await deletePageComment(activePage.slug, commentId);
                  }}
                  onSignIn={() => void handleSignIn()}
                />
              )}

              {activeTab === 'source' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {activePage.slug}.md · {activePage.content.length.toLocaleString('en-US')}{' '}
                      characters
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCopySource()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        {copiedSource ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedSource ? 'Copied' : 'Copy Markdown'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadMarkdown}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .md</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f17] text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
                    {activePage.content || '(empty)'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WikiWorkspace />
    </ErrorBoundary>
  );
}
