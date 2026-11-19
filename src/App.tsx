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
} from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MarkdownEditor } from './components/MarkdownEditor';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { PageComments } from './components/PageComments';
import { PageIndexView } from './components/PageIndexView';
import { RevisionHistory } from './components/RevisionHistory';
import { Sidebar } from './components/Sidebar';
import { ADMIN_EMAIL, auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { extractToc, formatRelativeTime, slugToTitle, toWikiSlug } from './lib/markdownUtils';
import {
  addPageComment,
  createWikiPage,
  deletePageComment,
  deleteWikiPage,
  fetchPageRevisions,
  restorePageRevision,
  seedStarterWiki,
  syncUserDocuments,
  updateWikiPage,
} from './lib/wikiService';
import {
  type PageComment,
  type PageRevision,
  type PageTab,
  type PageVisibility,
  WIKI_CATEGORIES,
  type WikiPage,
  type WorkspaceView,
} from './types/wiki';

function parseHashRoute(): { view: WorkspaceView; slug: string } {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash === 'paginas') return { view: 'index', slug: 'start' };
  if (hash === 'recentes') return { view: 'recent', slug: 'start' };
  if (hash.startsWith('nova')) {
    const [, rawSlug] = hash.split('/');
    return { view: 'create', slug: rawSlug ? toWikiSlug(rawSlug) : '' };
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

  // Auth listener
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        void syncUserDocuments(currentUser);
      }
    });
    return unsub;
  }, []);

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
    return Array.from(bySlug.values()).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
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

  const navigateToPage = (slug: string) => {
    const normalized = toWikiSlug(slug) || 'start';
    setActiveSlug(normalized);
    setView('page');
    setActiveTab('read');
    setSaveError(null);
    setConfirmDeleteOpen(false);
    window.location.hash = `#/pagina/${normalized}`;
  };

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
    window.location.hash = normalized ? `#/nova/${normalized}` : '#/nova';
  };

  const navigateToIndex = (mode: 'index' | 'recent') => {
    setView(mode);
    setSaveError(null);
    setConfirmDeleteOpen(false);
    window.location.hash = mode === 'recent' ? '#/recentes' : '#/paginas';
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Erro ao autenticar com Google:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const isAdmin = Boolean(user?.email && user.email === ADMIN_EMAIL && user.emailVerified);
  const canManageActiveMeta = Boolean(
    user && activePage && (activePage.authorId === user.uid || isAdmin)
  );
  const canEditActivePage = Boolean(
    user &&
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
      setSaveError(err instanceof Error ? err.message : 'Erro ao criar página.');
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
      setSaveError(err instanceof Error ? err.message : 'Erro ao atualizar página.');
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
              aria-label="Abrir navegação da wiki"
              className="lg:hidden p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <a
              href="#/pagina/start"
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
            aria-label="Navegação principal"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <a
              href="#/pagina/start"
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
              Início
            </a>
            <a
              href="#/paginas"
              onClick={(e) => {
                e.preventDefault();
                navigateToIndex('index');
              }}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                view === 'index' ? 'text-blue-700 dark:text-blue-400 underline underline-offset-8' : ''
              }`}
            >
              Páginas
            </a>
            <a
              href="#/recentes"
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
              Recentes
            </a>
            <a
              href="#/pagina/guia-markdown"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('guia-markdown');
              }}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                view === 'page' && activeSlug === 'guia-markdown'
                  ? 'text-blue-700 dark:text-blue-400 underline underline-offset-8'
                  : ''
              }`}
            >
              Guia Markdown
            </a>
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => navigateToCreate('')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Página</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSignIn()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
              >
                Entrar com Google
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
          isDark={isDark}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onSelectPage={navigateToPage}
          onQuickCreateSlug={navigateToCreate}
          onSignOut={() => void handleSignOut()}
          onSignIn={() => void handleSignIn()}
          onToggleTheme={() => setIsDark((prev) => !prev)}
        />

        <main className="flex-1 min-w-0 p-5 sm:p-8 lg:p-10">
          {!pagesLoaded ? (
            <div className="max-w-3xl space-y-4">
              <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-9 w-2/3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800 animate-pulse mt-6" />
              <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
          ) : view === 'create' ? (
            <div className="max-w-5xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
              <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  wiki / nova-pagina{createPresetSlug ? ` / :${createPresetSlug}` : ''}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  Criar Nova Página Colaborativa
                </h1>
              </div>

              {user ? (
                <MarkdownEditor
                  mode="create"
                  initialSlug={createPresetSlug}
                  initialTitle={createPresetSlug ? slugToTitle(createPresetSlug) : ''}
                  initialContent=""
                  initialCategory="geral"
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
              ) : (
                <div className="py-8 space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Para criar e publicar novas páginas no WazzimaGiygg Maker, faça login com sua
                    conta Google.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleSignIn()}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors"
                  >
                    Entrar com Google
                  </button>
                </div>
              )}
            </div>
          ) : view === 'index' || view === 'recent' ? (
            <div className="max-w-5xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8">
              <PageIndexView
                mode={view}
                pages={allPages}
                isSignedIn={Boolean(user)}
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
                    ? 'WazzimaGiygg Maker está pronto para começar'
                    : `A página ":${activeSlug}" ainda não existe`}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  {allPages.length === 0 && activeSlug === 'start'
                    ? 'Este espaço wiki no Firebase ainda não possui páginas publicadas. Você pode inicializar automaticamente com páginas de exemplo em Markdown ou criar a primeira página do zero.'
                    : 'No estilo clássico do Wikidot, qualquer identificador inexistente pode ser transformado em uma página colaborativa com um clique.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigateToCreate(activeSlug)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
                    >
                      <FilePlus2 className="w-4 h-4" />
                      <span>Criar página :{activeSlug}</span>
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
                          {seeding ? 'Criando páginas modelo...' : 'Inicializar com páginas modelo'}
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
                    Entrar com Google para criar :{activeSlug}
                  </button>
                )}

                {allPages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigateToIndex('index')}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Ver todas as páginas
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
                    {activePage.visibility === 'private' ? 'Privada' : 'Pública'}
                    {activePage.isLocked ? ' · Bloqueada' : ''}
                  </div>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4">
                  <h1 className="font-display text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
                    {activePage.title}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>Criado por {activePage.authorName}</span>
                  <span aria-hidden="true">·</span>
                  <span>Última edição por {activePage.lastEditorName}</span>
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
                      <span>Ler</span>
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
                          ? 'Entre com Google para editar'
                          : !canEditActivePage
                          ? 'Esta página está bloqueada pelo autor'
                          : 'Editar conteúdo Markdown'
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
                      <span>Editar</span>
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
                      <span>Histórico</span>
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
                      <span>Discussão ({comments.length})</span>
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
                      <span>Fonte</span>
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
                          <span>Excluir</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-700 dark:text-red-400 font-medium">
                            Confirmar exclusão?
                          </span>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => void handleDeletePage()}
                            className="px-3 py-1 text-xs font-medium rounded-md bg-red-700 text-white hover:bg-red-800 transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteOpen(false)}
                            className="px-3 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            Cancelar
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
                    <MarkdownRenderer
                      content={activePage.content}
                      existingSlugs={existingSlugs}
                      onNavigateSlug={navigateToPage}
                    />
                  </article>

                  {toc.length > 0 && (
                    <aside className="xl:col-span-3 xl:sticky xl:top-20 border-t xl:border-t-0 xl:border-l border-slate-200 dark:border-slate-800 pt-4 xl:pt-0 xl:pl-5 space-y-2.5">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Nesta página
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
                  isSignedIn={Boolean(user)}
                  onAddComment={async (body) => {
                    if (!user) return;
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
                      {activePage.slug}.md · {activePage.content.length.toLocaleString('pt-BR')}{' '}
                      caracteres
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
                        <span>{copiedSource ? 'Copiado' : 'Copiar Markdown'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadMarkdown}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar .md</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f17] text-xs font-mono leading-relaxed text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
                    {activePage.content || '(vazio)'}
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
