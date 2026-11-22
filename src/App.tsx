import React from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  ArrowUp,
  BookOpen,
  Check,
  Code2,
  Copy,
  Download,
  Edit3,
  FileDown,
  FilePlus2,
  History,
  Link2,
  Loader2,
  Lock,
  Menu,
  MessageSquare,
  Plus,
  Printer,
  RefreshCw,
  ShieldAlert,
  Shuffle,
  Sparkles,
  Trash2,
  User as UserIcon,
  WifiOff,
  X,
} from 'lucide-react';
import { AdminConsoleView } from './components/AdminConsoleView';
import { ArticleViewer } from './components/ArticleViewer';
import { EcosystemProductsView } from './components/EcosystemProductsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FooterBadges } from './components/FooterBadges';
import { LegalComplianceView, type LegalSectionTab } from './components/LegalComplianceView';
import { MarkdownEditor } from './components/MarkdownEditor';
import { PageComments } from './components/PageComments';
import { PageIndexView } from './components/PageIndexView';
import { PrivacyNoticeBanner } from './components/PrivacyNoticeBanner';
import { ReadingProgressBar } from './components/ReadingProgressBar';
import { ReferencesFooter } from './components/ReferencesFooter';
import { RevisionHistory } from './components/RevisionHistory';
import { ShortcutsModal } from './components/ShortcutsModal';
import { Sidebar } from './components/Sidebar';
import { ToastContainer, type ToastNotification } from './components/ToastContainer';
import { UserEditsPanel } from './components/UserEditsPanel';
import { WikiInfobox } from './components/WikiInfobox';
import { fetchCurrentUserGovernance } from './lib/adminService';
import {
  bootAndSubscribeSiteExtensions,
  getInitialSiteExtensionsState,
  resolveSiteTheme,
  resolveSiteTitle,
  type SiteExtensionsState,
} from './lib/extensionsService';
import { ADMIN_EMAIL, auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { evaluateFrameContext } from './lib/frameGuard';
import {
  DOSSIER_PAGE_CATEGORY,
  DOSSIER_PAGE_CONTENT,
  DOSSIER_PAGE_SLUG,
  DOSSIER_PAGE_TAGS,
  DOSSIER_PAGE_TITLE,
} from './lib/dossierArticle';
import {
  ECOSYSTEM_PAGE_CATEGORY,
  ECOSYSTEM_PAGE_CONTENT,
  ECOSYSTEM_PAGE_SLUG,
  ECOSYSTEM_PAGE_TAGS,
  ECOSYSTEM_PAGE_TITLE,
  WIKIPEDIA_ABUSES_PAGE_CATEGORY,
  WIKIPEDIA_ABUSES_PAGE_CONTENT,
  WIKIPEDIA_ABUSES_PAGE_SLUG,
  WIKIPEDIA_ABUSES_PAGE_TAGS,
  WIKIPEDIA_ABUSES_PAGE_TITLE,
} from './lib/ecosystemContent';
import { LEGAL_GOVERNANCE } from './lib/legalConfig';
import {
  extractArticleReferences,
  extractToc,
  formatAbsoluteTime,
  formatRelativeTime,
  parseMarkdownWithInfoboxes,
  scrollToWikiAnchor,
  slugToTitle,
  toWikiSlug,
} from './lib/markdownUtils';
import { exportArticleToPdf } from './lib/pdfExportService';
import { buildWikiPrintStylesheet, PRINT_STYLESHEET_ID } from './lib/printStyles';
import {
  ENGLISH_COMMUNITY_TEMPLATES,
  expandTemplatesInWikitext,
  STARTER_TEMPLATE_CATEGORY,
  STARTER_TEMPLATE_CONTENT,
  STARTER_TEMPLATE_SLUG,
  STARTER_TEMPLATE_TAGS,
  STARTER_TEMPLATE_TITLE,
} from './services/templateService';
import {
  TEMPLATE_EXAMPLE_PAGE_CATEGORY,
  TEMPLATE_EXAMPLE_PAGE_CONTENT,
  TEMPLATE_EXAMPLE_PAGE_SLUG,
  TEMPLATE_EXAMPLE_PAGE_TAGS,
  TEMPLATE_EXAMPLE_PAGE_TITLE,
} from './lib/templateExampleArticle';
import {
  addPageComment,
  buildPersonalSlugs,
  createWikiPage,
  deletePageComment,
  deleteWikiPage,
  ensureDossierArticlePublished,
  fetchCollaboratorProfile,
  fetchPageRevisions,
  fetchUserEdits,
  isUserOrDiscussionPage,
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

function parseHashRoute(): {
  view: WorkspaceView;
  slug: string;
  legalSection?: LegalSectionTab;
} {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash === 'privacy' || hash === 'lgpd') {
    return { view: 'legal', slug: 'start', legalSection: 'privacy' };
  }
  if (hash === 'terms' || hash === 'marco-civil') {
    return { view: 'legal', slug: 'start', legalSection: 'terms' };
  }
  if (hash === 'ecosystem' || hash === 'ecossistema' || hash === 'produtos') {
    return { view: 'ecosystem', slug: 'start' };
  }
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
  const [governanceReady, setGovernanceReady] = React.useState(false);
  const [currentCollaborator, setCurrentCollaborator] = React.useState<CollaboratorProfile | null>(null);
  const [governanceRole, setGovernanceRole] = React.useState<GovernanceRole>('member');
  const [blockedRecord, setBlockedRecord] = React.useState<BlockedUser | null>(null);

  const [publicPages, setPublicPages] = React.useState<WikiPage[]>([]);
  const [privatePages, setPrivatePages] = React.useState<WikiPage[]>([]);
  const [pagesLoaded, setPagesLoaded] = React.useState(false);
  const [extensionsState, setExtensionsState] = React.useState<SiteExtensionsState>(() =>
    getInitialSiteExtensionsState()
  );
  const [extensionsBootStatus, setExtensionsBootStatus] = React.useState<
    'loading' | 'loaded' | 'error'
  >('loading');
  const [extensionsBootError, setExtensionsBootError] = React.useState<string | null>(null);
  const [extensionsReloadNonce, setExtensionsReloadNonce] = React.useState(0);

  const [view, setView] = React.useState<WorkspaceView>(initialRoute.view);
  const [legalSection, setLegalSection] = React.useState<LegalSectionTab>(
    initialRoute.legalSection ?? 'privacy'
  );
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
  const [copiedPageLink, setCopiedPageLink] = React.useState(false);
  const [exportingPdf, setExportingPdf] = React.useState(false);
  const [isPrintView, setIsPrintView] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const [showBackToTop, setShowBackToTop] = React.useState(false);
  const [toasts, setToasts] = React.useState<ToastNotification[]>([]);
  const [isOnline, setIsOnline] = React.useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('wazzimagiygg-theme') === 'dark';
  });

  const pushToast = React.useCallback((toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const { theme: activeTheme, colorScheme: themeColorScheme } = React.useMemo(
    () => resolveSiteTheme(extensionsState),
    [extensionsState]
  );

  const effectiveIsDark =
    themeColorScheme === 'dark' ? true : themeColorScheme === 'light' ? false : isDark;

  // Sync dark mode preference, active theme attribute, and browser theme-color on <html>
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-wiki-theme', activeTheme.id);

    if (effectiveIsDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (themeColorScheme === 'user') {
      localStorage.setItem('wazzimagiygg-theme', isDark ? 'dark' : 'light');
    }

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute(
        'content',
        effectiveIsDark ? activeTheme.metaThemeColor.dark : activeTheme.metaThemeColor.light
      );
    }
  }, [activeTheme, effectiveIsDark, isDark, themeColorScheme]);

  // Dynamically generate and mount the CSS print stylesheet when Print View is active
  React.useEffect(() => {
    const existing = document.getElementById(PRINT_STYLESHEET_ID);
    if (!isPrintView) {
      existing?.remove();
      return;
    }

    const styleEl =
      existing instanceof HTMLStyleElement
        ? existing
        : document.createElement('style');
    styleEl.id = PRINT_STYLESHEET_ID;
    styleEl.setAttribute('data-generated-by', 'wazzimagiygg-print-view');
    styleEl.textContent = buildWikiPrintStylesheet();

    if (!existing) {
      document.head.appendChild(styleEl);
    }

    return () => {
      document.getElementById(PRINT_STYLESHEET_ID)?.remove();
    };
  }, [isPrintView]);

  // Track online/offline browser connectivity for Service Worker / PWA status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show floating Back to Top control after scrolling down long pages
  React.useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 360);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const siteTitle = React.useMemo(() => resolveSiteTitle(extensionsState), [extensionsState]);
  const tocExt = extensionsState.byId.toc;
  const refsExt = extensionsState.byId.references;
  const infoboxExt = extensionsState.byId.infoboxes;
  const progressExt = extensionsState.byId['reading-progress'];
  const printExt = extensionsState.byId['print-view'];
  const randomExt = extensionsState.byId['random-article'];
  const copyLinkExt = extensionsState.byId['copy-link'];
  const realtimeExt = extensionsState.byId['realtime-toasts'];
  const discussionExt = extensionsState.byId['page-discussion'];

  const isBureaucrat = Boolean(
    user &&
      ((user.email && user.email === ADMIN_EMAIL && user.emailVerified) ||
        governanceRole === 'bureaucrat')
  );
  const isGovernanceSettled = authReady && (!user || governanceReady);
  const isWikiBootReady =
    isGovernanceSettled && (extensionsBootStatus === 'loaded' || isBureaucrat);

  const canViewDiscussion = Boolean(
    discussionExt.enabled && (user || discussionExt.settings.allowAnonymousRead !== false)
  );
  const autoExitPrintOnNavigate = printExt.settings.autoExitOnNavigate !== false;

  React.useEffect(() => {
    if (!printExt.enabled && isPrintView) {
      setIsPrintView(false);
    }
  }, [printExt.enabled, isPrintView]);

  React.useEffect(() => {
    if (!canViewDiscussion && activeTab === 'comments') {
      setActiveTab('read');
    }
  }, [canViewDiscussion, activeTab]);

  // Listen for browser back/forward hash navigation
  React.useEffect(() => {
    const handleHashChange = () => {
      const next = parseHashRoute();
      setView(next.view);
      if (next.legalSection) {
        setLegalSection(next.legalSection);
      }
      if (next.view === 'create') {
        setCreatePresetSlug(next.slug);
      } else if (next.slug) {
        setActiveSlug(next.slug);
      }
      setActiveTab('read');
      setSaveError(null);
      setConfirmDeleteOpen(false);
      if (autoExitPrintOnNavigate) {
        setIsPrintView(false);
      }
      setCopiedPageLink(false);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [autoExitPrintOnNavigate]);

  const navigateToPage = React.useCallback(
    (slug: string) => {
      const normalized = toWikiSlug(slug) || 'start';
      setActiveSlug(normalized);
      setView('page');
      setActiveTab('read');
      setSaveError(null);
      setConfirmDeleteOpen(false);
      if (autoExitPrintOnNavigate) {
        setIsPrintView(false);
      }
      setCopiedPageLink(false);
      window.location.hash = `#/page/${normalized}`;
    },
    [autoExitPrintOnNavigate]
  );

  // Auth listener
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        setGovernanceReady(false);
        void (async () => {
          try {
            const gov = await fetchCurrentUserGovernance(currentUser);
            setGovernanceRole(gov.role);
            setBlockedRecord(gov.blocked);
          } catch (error) {
            console.error('Failed to resolve user governance role:', error);
            setGovernanceRole('member');
            setBlockedRecord(null);
          } finally {
            setGovernanceReady(true);
          }
        })();
      } else {
        setCurrentCollaborator(null);
        setGovernanceRole('member');
        setBlockedRecord(null);
        setGovernanceReady(true);
      }
    });
    return unsub;
  }, []);

  // Load site-wide extension configurations from Firebase on Wiki boot (blocks wiki on failure unless Bureaucrat)
  React.useEffect(() => {
    if (!authReady) return;
    setExtensionsBootStatus('loading');
    setExtensionsBootError(null);
    return bootAndSubscribeSiteExtensions({
      onLoaded: (state) => {
        setExtensionsState(state);
        setExtensionsBootStatus('loaded');
        setExtensionsBootError(null);
      },
      onError: (message) => {
        setExtensionsBootStatus('error');
        setExtensionsBootError(message);
      },
    });
  }, [authReady, extensionsReloadNonce, user?.uid]);

  // Sync collaborator profile & dossier only once Wiki boot gate allows normal operation
  const syncedUserRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!user) {
      syncedUserRef.current = null;
      return;
    }
    if (!isWikiBootReady || blockedRecord) return;
    if (syncedUserRef.current === user.uid) return;
    syncedUserRef.current = user.uid;

    void (async () => {
      try {
        const result = await syncUserDocuments(user);
        setCurrentCollaborator(result.profile);
        const isElevatedAdmin =
          (user.email && user.email === ADMIN_EMAIL && user.emailVerified) ||
          governanceRole === 'bureaucrat' ||
          governanceRole === 'admin';
        if (isElevatedAdmin) {
          void ensureDossierArticlePublished(user);
        }
        const currentHash = window.location.hash;
        const isOnDefaultEntry =
          !currentHash || currentHash === '#/' || currentHash === '#/page/start';
        if (result.isNewUser && isOnDefaultEntry) {
          navigateToPage(result.profile.personalPageSlug);
        }
      } catch (error) {
        console.error('Failed to sync collaborator documents:', error);
      }
    })();
  }, [user, isWikiBootReady, blockedRecord, governanceRole, navigateToPage]);

  // Subscribe to public pages only after boot extensions loaded (or Bureaucrat bypass)
  React.useEffect(() => {
    if (!isWikiBootReady) return;
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
  }, [isWikiBootReady]);

  // Subscribe to current user's private pages when authenticated & boot ready
  React.useEffect(() => {
    if (!isWikiBootReady || !user) {
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

  // Merge public & user's private pages cleanly, ensuring built-in dossier fallback is always readable
  const allPages = React.useMemo(() => {
    const bySlug = new Map<string, WikiPage>();
    for (const p of publicPages) bySlug.set(p.slug, p);
    for (const p of privatePages) bySlug.set(p.slug, p);
    if (pagesLoaded && !bySlug.has(DOSSIER_PAGE_SLUG)) {
      bySlug.set(DOSSIER_PAGE_SLUG, {
        slug: DOSSIER_PAGE_SLUG,
        title: DOSSIER_PAGE_TITLE,
        content: DOSSIER_PAGE_CONTENT,
        category: DOSSIER_PAGE_CATEGORY,
        tags: DOSSIER_PAGE_TAGS,
        visibility: 'public',
        isLocked: false,
        authorId: 'builtin-editorial',
        authorName: LEGAL_GOVERNANCE.controllerName,
        lastEditorId: 'builtin-editorial',
        lastEditorName: LEGAL_GOVERNANCE.controllerName,
        version: 1,
        createdAt: null,
        updatedAt: null,
      });
    }
    if (pagesLoaded && !bySlug.has(ECOSYSTEM_PAGE_SLUG)) {
      bySlug.set(ECOSYSTEM_PAGE_SLUG, {
        slug: ECOSYSTEM_PAGE_SLUG,
        title: ECOSYSTEM_PAGE_TITLE,
        content: ECOSYSTEM_PAGE_CONTENT,
        category: ECOSYSTEM_PAGE_CATEGORY,
        tags: ECOSYSTEM_PAGE_TAGS,
        visibility: 'public',
        isLocked: false,
        authorId: 'builtin-editorial',
        authorName: LEGAL_GOVERNANCE.controllerName,
        lastEditorId: 'builtin-editorial',
        lastEditorName: LEGAL_GOVERNANCE.controllerName,
        version: 1,
        createdAt: null,
        updatedAt: null,
      });
    }
    if (pagesLoaded && !bySlug.has(WIKIPEDIA_ABUSES_PAGE_SLUG)) {
      bySlug.set(WIKIPEDIA_ABUSES_PAGE_SLUG, {
        slug: WIKIPEDIA_ABUSES_PAGE_SLUG,
        title: WIKIPEDIA_ABUSES_PAGE_TITLE,
        content: WIKIPEDIA_ABUSES_PAGE_CONTENT,
        category: WIKIPEDIA_ABUSES_PAGE_CATEGORY,
        tags: WIKIPEDIA_ABUSES_PAGE_TAGS,
        visibility: 'public',
        isLocked: false,
        authorId: 'builtin-editorial',
        authorName: LEGAL_GOVERNANCE.controllerName,
        lastEditorId: 'builtin-editorial',
        lastEditorName: LEGAL_GOVERNANCE.controllerName,
        version: 1,
        createdAt: null,
        updatedAt: null,
      });
    }
    if (pagesLoaded && !bySlug.has(STARTER_TEMPLATE_SLUG)) {
      bySlug.set(STARTER_TEMPLATE_SLUG, {
        slug: STARTER_TEMPLATE_SLUG,
        title: STARTER_TEMPLATE_TITLE,
        content: STARTER_TEMPLATE_CONTENT,
        category: STARTER_TEMPLATE_CATEGORY,
        tags: STARTER_TEMPLATE_TAGS,
        visibility: 'public',
        isLocked: false,
        authorId: 'builtin-editorial',
        authorName: LEGAL_GOVERNANCE.controllerName,
        lastEditorId: 'builtin-editorial',
        lastEditorName: LEGAL_GOVERNANCE.controllerName,
        version: 1,
        createdAt: null,
        updatedAt: null,
      });
    }
    if (pagesLoaded && !bySlug.has(TEMPLATE_EXAMPLE_PAGE_SLUG)) {
      bySlug.set(TEMPLATE_EXAMPLE_PAGE_SLUG, {
        slug: TEMPLATE_EXAMPLE_PAGE_SLUG,
        title: TEMPLATE_EXAMPLE_PAGE_TITLE,
        content: TEMPLATE_EXAMPLE_PAGE_CONTENT,
        category: TEMPLATE_EXAMPLE_PAGE_CATEGORY,
        tags: TEMPLATE_EXAMPLE_PAGE_TAGS,
        visibility: 'public',
        isLocked: false,
        authorId: 'builtin-editorial',
        authorName: LEGAL_GOVERNANCE.controllerName,
        lastEditorId: 'builtin-editorial',
        lastEditorName: LEGAL_GOVERNANCE.controllerName,
        version: 1,
        createdAt: null,
        updatedAt: null,
      });
    }
    if (pagesLoaded) {
      for (const tpl of ENGLISH_COMMUNITY_TEMPLATES) {
        if (!bySlug.has(tpl.slug)) {
          bySlug.set(tpl.slug, {
            slug: tpl.slug,
            title: tpl.title,
            content: tpl.content,
            category: tpl.category,
            tags: tpl.tags,
            visibility: 'public',
            isLocked: false,
            authorId: 'builtin-editorial',
            authorName: LEGAL_GOVERNANCE.controllerName,
            lastEditorId: 'builtin-editorial',
            lastEditorName: LEGAL_GOVERNANCE.controllerName,
            version: 1,
            createdAt: null,
            updatedAt: null,
          });
        }
      }
    }
    return Array.from(bySlug.values()).sort((a, b) => a.title.localeCompare(b.title, 'en-US'));
  }, [publicPages, privatePages, pagesLoaded]);

  const existingSlugs = React.useMemo(() => new Set(allPages.map((p) => p.slug)), [allPages]);
  const activePage = React.useMemo(
    () => allPages.find((p) => p.slug === activeSlug) ?? null,
    [allPages, activeSlug]
  );

  // Notify reader via toast when the currently open article is updated in Firestore by another collaborator
  const seenActivePageRef = React.useRef<{
    slug: string;
    version: number;
    updatedAtMs: number;
    authorId: string;
    content: string;
    title: string;
  } | null>(null);

  React.useEffect(() => {
    if (!pagesLoaded || view !== 'page' || !activePage) {
      seenActivePageRef.current = null;
      return;
    }

    const updatedAtMs = activePage.updatedAt?.toMillis() ?? 0;
    const prev = seenActivePageRef.current;

    if (!prev || prev.slug !== activePage.slug) {
      seenActivePageRef.current = {
        slug: activePage.slug,
        version: activePage.version,
        updatedAtMs,
        authorId: activePage.authorId,
        content: activePage.content,
        title: activePage.title,
      };
      return;
    }

    const versionAdvanced = activePage.version > prev.version;
    const timestampAdvanced =
      prev.updatedAtMs > 0 && updatedAtMs > 0 && updatedAtMs > prev.updatedAtMs;
    const bodyChanged =
      activePage.content !== prev.content || activePage.title !== prev.title;
    const editedByOtherCollaborator =
      activePage.lastEditorId !== 'builtin-editorial' &&
      (!user || activePage.lastEditorId !== user.uid);

    seenActivePageRef.current = {
      slug: activePage.slug,
      version: activePage.version,
      updatedAtMs,
      authorId: activePage.authorId,
      content: activePage.content,
      title: activePage.title,
    };

    if (
      realtimeExt.enabled &&
      editedByOtherCollaborator &&
      (versionAdvanced || timestampAdvanced || bodyChanged)
    ) {
      const isEditingNow = activeTab === 'edit';
      if (isEditingNow && realtimeExt.settings.notifyWhileEditing === false) {
        return;
      }
      pushToast({
        tone: isEditingNow ? 'warning' : 'info',
        title: isEditingNow
          ? 'Artigo atualizado enquanto você edita'
          : 'Artigo atualizado em tempo real',
        description: `${activePage.lastEditorName} publicou uma nova revisão de "${activePage.title}".`,
        meta: `v${activePage.version} · :${activePage.slug}`,
        actionLabel: 'Ver histórico',
        onAction: () => {
          setActiveTab('history');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        durationMs: isEditingNow ? 10000 : 7500,
      });
    }
  }, [
    pagesLoaded,
    view,
    activePage,
    activeTab,
    user,
    pushToast,
    realtimeExt.enabled,
    realtimeExt.settings.notifyWhileEditing,
  ]);

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
    setIsPrintView(false);
    window.location.hash = normalized ? `#/new/${normalized}` : '#/new';
  };

  const navigateToIndex = (mode: 'index' | 'recent') => {
    setView(mode);
    setSaveError(null);
    setConfirmDeleteOpen(false);
    setIsPrintView(false);
    window.location.hash = mode === 'recent' ? '#/recent' : '#/pages';
  };

  const navigateToAdmin = () => {
    setView('admin');
    setSaveError(null);
    setConfirmDeleteOpen(false);
    setIsPrintView(false);
    window.location.hash = '#/admin';
  };

  const navigateToLegal = (section: LegalSectionTab) => {
    setLegalSection(section);
    setView('legal');
    setSaveError(null);
    setConfirmDeleteOpen(false);
    setIsPrintView(false);
    window.location.hash = section === 'terms' ? '#/terms' : '#/privacy';
  };

  const navigateToEcosystem = () => {
    setView('ecosystem');
    setSaveError(null);
    setConfirmDeleteOpen(false);
    setIsPrintView(false);
    window.location.hash = '#/ecosystem';
  };

  const navigateToRandomPage = React.useCallback(() => {
    if (!randomExt.enabled || allPages.length === 0) return;
    const excludeDiscussions = randomExt.settings.excludeDiscussions !== false;
    const contentPages = excludeDiscussions
      ? allPages.filter((p) => !p.slug.endsWith('-discussion') && !p.tags.includes('discussion'))
      : allPages;
    const basePool = contentPages.length > 0 ? contentPages : allPages;
    const currentSlug = view === 'page' ? activeSlug : null;
    const candidates =
      currentSlug && basePool.length > 1
        ? basePool.filter((p) => p.slug !== currentSlug)
        : basePool;
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const chosen = candidates[randomIndex];
    if (chosen) {
      navigateToPage(chosen.slug);
    }
  }, [
    randomExt.enabled,
    randomExt.settings.excludeDiscussions,
    allPages,
    view,
    activeSlug,
    navigateToPage,
  ]);

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
  const isActiveUserOrDiscussionPage = Boolean(
    activePage && isUserOrDiscussionPage(activePage)
  );
  const canManageActiveMeta = Boolean(
    user && !isBlocked && activePage && (activePage.authorId === user.uid || isAdmin)
  );
  const canEditActivePage = Boolean(
    user &&
      !isBlocked &&
      activePage &&
      ((activePage.visibility === 'public' &&
        !activePage.isLocked &&
        !isActiveUserOrDiscussionPage) ||
        activePage.authorId === user.uid ||
        isAdmin)
  );
  const canDeleteActivePage = canManageActiveMeta && activePage?.authorId !== 'builtin-editorial';

  // Global keyboard shortcuts (Ctrl+E Read->Edit, Ctrl+K Search, Alt+N New Page, ? Help, Esc Cancel)
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;

      const isMod = e.metaKey || e.ctrlKey;
      const keyLower = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const isEditableTarget = Boolean(
        target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable)
      );

      // Ctrl/Cmd + E -> Switch from Read (or another page tab) to Edit mode
      if (isMod && !e.shiftKey && !e.altKey && keyLower === 'e') {
        if (view === 'page' && activePage) {
          e.preventDefault();
          if (activeTab !== 'edit') {
            if (!user) {
              void handleSignIn();
            } else if (canEditActivePage) {
              setSaveError(null);
              setActiveTab('edit');
            }
          }
        }
        return;
      }

      // Ctrl/Cmd + K -> Focus sidebar page search filter
      if (isMod && !e.shiftKey && !e.altKey && keyLower === 'k') {
        e.preventDefault();
        const isMobile = window.innerWidth < 1024;
        if (isMobile) {
          setMobileMenuOpen(true);
        }
        window.setTimeout(() => {
          const inputId = isMobile ? 'sidebar-page-filter-mobile' : 'sidebar-page-filter';
          const input = document.getElementById(inputId) as HTMLInputElement | null;
          input?.focus();
          input?.select();
        }, isMobile ? 40 : 0);
        return;
      }

      // Alt + N -> Open New Page creator
      if (e.altKey && !isMod && !e.shiftKey && keyLower === 'n') {
        e.preventDefault();
        if (user && !isBlocked) {
          navigateToCreate('');
        } else if (!user) {
          void handleSignIn();
        }
        return;
      }

      // '?' outside text fields -> Toggle keyboard shortcuts guide
      if (e.key === '?' && !isEditableTarget && !isMod && !e.altKey) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      // Esc -> Close confirmation/modal/drawer, exit Print View, or return from Edit to Read mode
      if (e.key === 'Escape') {
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
          return;
        }
        if (shortcutsOpen) {
          setShortcutsOpen(false);
          return;
        }
        if (isPrintView) {
          setIsPrintView(false);
          return;
        }
        if (confirmDeleteOpen) {
          setConfirmDeleteOpen(false);
          return;
        }
        if (view === 'page' && activeTab === 'edit' && !isSaving && target?.tagName !== 'SELECT') {
          setActiveTab('read');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    view,
    activePage,
    activeTab,
    user,
    isBlocked,
    canEditActivePage,
    mobileMenuOpen,
    shortcutsOpen,
    isPrintView,
    confirmDeleteOpen,
    isSaving,
  ]);

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
      if (activePage.authorId === 'builtin-editorial') {
        await createWikiPage({ ...data, slug: activePage.slug }, user);
      } else {
        await updateWikiPage(activePage, data, user, canManageActiveMeta);
      }
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

  const handleCopyPageLink = async () => {
    if (!activePage) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}#/page/${activePage.slug}`;
    let copied = false;

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      try {
        const tempInput = document.createElement('textarea');
        tempInput.value = shareUrl;
        tempInput.setAttribute('readonly', '');
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        document.body.appendChild(tempInput);
        tempInput.select();
        copied = document.execCommand('copy');
        document.body.removeChild(tempInput);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setCopiedPageLink(true);
      window.setTimeout(() => setCopiedPageLink(false), 2000);
      if (copyLinkExt.settings.showToastFeedback !== false) {
        pushToast({
          tone: 'success',
          title: 'Link copied to clipboard',
          description: `Direct URL for "${activePage.title}" is ready to share.`,
          meta: `#/page/${activePage.slug}`,
          durationMs: 3200,
        });
      }
    } else if (copyLinkExt.settings.showToastFeedback !== false) {
      pushToast({
        tone: 'warning',
        title: 'Could not copy link',
        description: 'Clipboard access was blocked by the browser.',
        meta: `#/page/${activePage.slug}`,
        durationMs: 4500,
      });
    }
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

  const handleExportPdf = async () => {
    if (!activePage || exportingPdf) return;
    setExportingPdf(true);
    try {
      const autoUserInfobox =
        isPersonalProfilePage &&
        infoboxExt.enabled &&
        infoboxExt.settings.allowAutoProfileCard !== false
          ? {
              type: 'user' as const,
              title: personalAuthorProfile?.displayName || activePage.authorName,
              subtitle: `${siteTitle} Collaborator`,
              image: personalAuthorProfile?.photoURL || undefined,
              layout: 'right' as const,
              fields: [
                { key: 'Handle', value: `:${activePage.slug}` },
                {
                  key: 'Member ID',
                  value: `\`${activePage.authorId.slice(0, 8)}\``,
                },
                {
                  key: 'Discussion',
                  value: `[[${
                    personalAuthorProfile?.discussionPageSlug ?? `${activePage.slug}-discussion`
                  }|Talk Page]]`,
                },
                { key: 'Role', value: 'Collaborator' },
                ...(activePage.createdAt
                  ? [
                      {
                        key: 'Joined',
                        value: activePage.createdAt.toDate().toISOString().slice(0, 10),
                      },
                    ]
                  : []),
                { key: 'Status', value: 'Active' },
              ],
            }
          : null;

      const result = await exportArticleToPdf({
        page: activePage,
        wikiPages: allPages,
        categoryLabel: activeCategoryLabel,
        siteTitle,
        isDark: effectiveIsDark,
        theme: activeTheme,
        existingSlugs,
        enableReferences: refsExt.enabled,
        referencesTitle: referencesSectionTitle,
        enableInfoboxes: infoboxExt.enabled,
        autoUserInfobox,
      });

      pushToast({
        tone: 'success',
        title: 'PDF exportado com sucesso',
        description: `${result.filename} (${result.pageCount} ${
          result.pageCount === 1 ? 'página' : 'páginas'
        }) — ${activeTheme.name} · ${effectiveIsDark ? 'Escuro' : 'Claro'}`,
        meta: `:${activePage.slug}`,
        durationMs: 3600,
      });
    } catch (err) {
      pushToast({
        tone: 'warning',
        title: 'Falha ao gerar PDF',
        description:
          err instanceof Error
            ? err.message
            : 'Não foi possível exportar o artigo para PDF.',
        meta: `:${activePage.slug}`,
        durationMs: 4500,
      });
    } finally {
      setExportingPdf(false);
    }
  };

  const expandedActiveContent = React.useMemo(
    () =>
      activePage
        ? expandTemplatesInWikitext(activePage.content, allPages, {
            currentSlug: activePage.slug,
            currentTitle: activePage.title,
          })
        : '',
    [activePage, allPages]
  );

  const toc = React.useMemo(
    () => (activePage ? extractToc(expandedActiveContent) : []),
    [activePage, expandedActiveContent]
  );

  const articleReferences = React.useMemo(
    () =>
      activePage && refsExt.enabled
        ? extractArticleReferences(expandedActiveContent).references
        : [],
    [activePage, expandedActiveContent, refsExt.enabled]
  );

  const tocMinHeadings = Math.max(1, tocExt.settings.minHeadings ?? 1);
  const outlineToc = tocExt.enabled && toc.length >= tocMinHeadings ? toc : [];
  const outlineRefs =
    refsExt.enabled && refsExt.settings.showOutlineLink !== false ? articleReferences : [];
  const referencesSectionTitle = refsExt.settings.footerTitle || 'Referências';

  const activeCategoryLabel = activePage
    ? WIKI_CATEGORIES.find((c) => c.id === activePage.category)?.label ?? activePage.category
    : '';

  // Sync per-page SEO title, meta description, OpenGraph, and robots indexing directive
  React.useEffect(() => {
    const defaultTitle = `${siteTitle} — Collaborative Markdown Wiki`;
    const defaultDesc =
      `Create, edit, and organize collaborative Markdown wiki pages, infoboxes, and revision histories in real time with ${siteTitle}.`;

    let nextTitle = defaultTitle;
    let nextDesc = defaultDesc;
    let robotsValue = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    if (!isWikiBootReady && extensionsBootStatus === 'error') {
      nextTitle = `Indisponível — ${siteTitle}`;
      robotsValue = 'noindex, nofollow';
    } else if (view === 'admin') {
      nextTitle = `Administration Console — ${siteTitle}`;
      robotsValue = 'noindex, nofollow';
    } else if (view === 'ecosystem') {
      nextTitle = `WazzimaGiygg Ecosystem Products & Dossier — ${siteTitle}`;
      nextDesc =
        'Official products of the WazzimaGiygg ecosystem (NotMediaWiki, WikiWazzimaGiygg, Jornal, Core, wazzimagiygg.com) and the Wikipedia dossier at wazzimagiygg.com/averdade/.';
    } else if (view === 'legal') {
      nextTitle =
        legalSection === 'terms'
          ? `Terms & Marco Civil Compliance — ${siteTitle}`
          : `Privacy Policy & LGPD — ${siteTitle}`;
      nextDesc = `LGPD (Law No. 13.709/2018) and Marco Civil da Internet compliance information. DPO: ${LEGAL_GOVERNANCE.dpoName}.`;
    } else if (view === 'create') {
      nextTitle = `Create New Page — ${siteTitle}`;
      robotsValue = 'noindex, follow';
    } else if (view === 'index') {
      nextTitle = `All Wiki Pages — ${siteTitle}`;
      nextDesc = `Browse every collaborative Markdown page published on ${siteTitle}.`;
    } else if (view === 'recent') {
      nextTitle = `Recent Wiki Changes — ${siteTitle}`;
      nextDesc = `Inspect recent collaborative edits and page updates on ${siteTitle}.`;
    } else if (view === 'page' && activePage) {
      nextTitle = `${activePage.title} — ${siteTitle}`;
      const plainExcerpt = activePage.content
        .replace(/:::(?:infobox|predefinicao)[\s\S]*?:::/g, '')
        .replace(/<\/?(?:noinclude|includeonly)>/gi, '')
        .replace(/[#>*_`[\]()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 155);
      if (plainExcerpt) {
        nextDesc = plainExcerpt;
      }
      if (activePage.visibility === 'private') {
        robotsValue = 'noindex, nofollow';
      }
    }

    document.title = nextTitle;
    const setMeta = (selector: string, content: string) => {
      document.querySelector(selector)?.setAttribute('content', content);
    };
    setMeta('meta[name="description"]', nextDesc);
    setMeta('meta[property="og:title"]', nextTitle);
    setMeta('meta[property="og:description"]', nextDesc);
    setMeta('meta[name="twitter:title"]', nextTitle);
    setMeta('meta[name="twitter:description"]', nextDesc);
    setMeta('meta[name="robots"]', robotsValue);
  }, [siteTitle, isWikiBootReady, extensionsBootStatus, view, legalSection, activePage]);

  const handleRetryExtensionsBoot = () => {
    setExtensionsBootStatus('loading');
    setExtensionsBootError(null);
    setExtensionsReloadNonce((n) => n + 1);
  };

  const handleBureaucratBypassSignIn = async () => {
    if (user) {
      await handleSignOut();
    }
    await handleSignIn();
  };

  // Boot Loading Gate: block wiki rendering until initial extension load succeeds (or Bureaucrat logs in)
  if (!isGovernanceSettled || (extensionsBootStatus === 'loading' && !isBureaucrat)) {
    return (
      <div
        data-wiki-surface="canvas"
        className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f8f9fa] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100"
      >
        <div
          data-wiki-surface="panel"
          className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1623] p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <RefreshCw className="w-4 h-4 text-blue-700 dark:text-blue-400 animate-spin shrink-0" data-wiki-surface="link" />
            <span>Carregando extensões de {siteTitle}...</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            As configurações das extensões são obtidas diretamente do Firebase na abertura do
            Wiki-site antes da liberação do espaço colaborativo.
          </p>
          <div className="space-y-2 pt-1">
            <div className="h-2.5 w-full rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-2.5 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Boot Failure Gate: Wiki cannot operate unless extensions load successfully OR user logs in as Bureaucrat
  if (extensionsBootStatus === 'error' && !isBureaucrat) {
    return (
      <div
        data-wiki-surface="canvas"
        className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f8f9fa] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100"
      >
        <div
          role="alert"
          data-wiki-surface="panel"
          className="w-full max-w-lg rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-[#0f1623] p-6 sm:p-7 space-y-5"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-mono text-red-700 dark:text-red-400">
                wiki / boot-extensions / unavailable
              </p>
              <h1 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
                Não foi possível carregar as extensões do Wiki-site
              </h1>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            As extensões do Firebase são carregadas obrigatoriamente na abertura de{' '}
            <strong>{siteTitle}</strong>. Como o carregamento falhou, o funcionamento do Wiki
            permanece bloqueado para leitura e edição — exceto mediante login com uma conta de{' '}
            <strong>Burocrata</strong>.
          </p>

          {extensionsBootError && (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f17] text-xs font-mono text-slate-700 dark:text-slate-300 break-words">
              {extensionsBootError}
            </div>
          )}

          {user && (
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
              Conectado atualmente como <strong>{user.displayName || user.email}</strong> (nível:{' '}
              <span className="font-mono">{governanceRole}</span>). Este nível não possui
              permissão de contingência de Burocrata.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleRetryExtensionsBoot}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>Tentar carregar novamente</span>
            </button>

            <button
              type="button"
              onClick={() => void handleBureaucratBypassSignIn()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {user ? 'Trocar para login de Burocrata' : 'Entrar como Burocrata (Google)'}
              </span>
            </button>

            {user && (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="px-3 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sair
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-wiki-surface="canvas"
      className={`min-h-screen flex flex-col bg-[#f8f9fa] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100${
        isPrintView ? ' wiki-print-view' : ''
      }`}
    >
      {/* Strict 3-Zone Top Bar Contract */}
      <header
        data-wiki-chrome="nav"
        data-wiki-surface="nav"
        className="sticky top-0 z-30 bg-white/95 dark:bg-[#0f1623]/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 print:hidden"
      >
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
              {siteTitle}
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
              href="#/ecosystem"
              onClick={(e) => {
                e.preventDefault();
                navigateToEcosystem();
              }}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                view === 'ecosystem'
                  ? 'text-blue-700 dark:text-blue-400 underline underline-offset-8'
                  : ''
              }`}
            >
              Ecosystem
            </a>
            {randomExt.enabled && randomExt.settings.showInNavbar !== false && (
              <button
                type="button"
                disabled={allPages.length === 0}
                onClick={navigateToRandomPage}
                title="Abrir um artigo aleatório da base de conhecimento"
                className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Shuffle className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                <span>Artigo aleatório</span>
              </button>
            )}
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center shrink-0">
            {user ? (
              <button
                type="button"
                disabled={isBlocked}
                onClick={() => navigateToCreate('')}
                data-wiki-surface="accent"
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
        <ReadingProgressBar
          visible={Boolean(
            progressExt.enabled &&
              pagesLoaded &&
              view === 'page' &&
              activePage &&
              activeTab === 'read' &&
              !isPrintView
          )}
          articleKey={activePage ? `${activePage.slug}-${activePage.version}-${activePage.content.length}` : undefined}
        />
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        <Sidebar
          siteTitle={siteTitle}
          pages={allPages}
          activeSlug={view === 'page' ? activeSlug : null}
          isOpenMobile={mobileMenuOpen}
          gestureDisabled={isPrintView}
          user={user}
          personalPageSlug={currentCollaborator?.personalPageSlug}
          discussionPageSlug={currentCollaborator?.discussionPageSlug}
          governanceRole={governanceRole}
          isAdminViewActive={view === 'admin'}
          isEcosystemViewActive={view === 'ecosystem'}
          isDark={effectiveIsDark}
          canToggleTheme={themeColorScheme === 'user'}
          forcedColorMode={themeColorScheme === 'user' ? undefined : themeColorScheme}
          onOpenMobile={() => setMobileMenuOpen(true)}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onSelectPage={navigateToPage}
          onRandomPage={
            randomExt.enabled && randomExt.settings.showInSidebar !== false
              ? navigateToRandomPage
              : undefined
          }
          onQuickCreateSlug={navigateToCreate}
          onOpenAdmin={navigateToAdmin}
          onOpenEcosystem={navigateToEcosystem}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onSignOut={() => void handleSignOut()}
          onSignIn={() => void handleSignIn()}
          onToggleTheme={() => setIsDark((prev) => !prev)}
        />

        <main className="flex-1 min-w-0 p-5 sm:p-8 lg:p-10">
          {extensionsBootStatus === 'error' && isBureaucrat && (
            <div
              data-wiki-chrome="floating"
              role="status"
              className="max-w-5xl mb-6 p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/35 text-xs text-amber-950 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3 print:hidden"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-semibold">
                    Acesso de contingência de Burocrata — falha ao carregar extensões na abertura
                  </div>
                  <div className="text-amber-900/90 dark:text-amber-200/80">
                    Visitantes e colaboradores permanecem bloqueados até que as extensões carreguem
                    do Firebase ({extensionsBootError || 'erro desconhecido'}).
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRetryExtensionsBoot}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-[#0b0f17] text-amber-950 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 whitespace-nowrap cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Recarregar</span>
                </button>
                <button
                  type="button"
                  onClick={navigateToAdmin}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-800 text-white hover:bg-amber-900 whitespace-nowrap cursor-pointer"
                >
                  Console de Burocratas
                </button>
              </div>
            </div>
          )}

          {!isOnline && (
            <div
              data-wiki-chrome="floating"
              role="status"
              aria-live="polite"
              className="max-w-5xl mb-6 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5 print:hidden"
            >
              <WifiOff className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
              <span>
                Offline mode — Cached static assets, Google Fonts, and locally synced wiki pages remain readable.
              </span>
            </div>
          )}

          {blockedRecord && (
            <div
              data-wiki-chrome="floating"
              className="max-w-5xl mb-6 p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-xs text-red-900 dark:text-red-200 space-y-1 print:hidden"
            >
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
          ) : view === 'ecosystem' ? (
            <div
              data-wiki-surface="panel"
              className="max-w-5xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8"
            >
              <EcosystemProductsView siteTitle={siteTitle} onSelectPage={navigateToPage} />
            </div>
          ) : view === 'legal' ? (
            <div
              data-wiki-surface="panel"
              className="max-w-5xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8"
            >
              <LegalComplianceView
                section={legalSection}
                user={user}
                collaboratorProfile={currentCollaborator}
                userPages={allPages.filter((p) => user && p.authorId === user.uid)}
                onSwitchSection={navigateToLegal}
                onSelectPage={navigateToPage}
                onSignIn={() => void handleSignIn()}
              />
            </div>
          ) : view === 'admin' ? (
            <div
              data-wiki-surface="panel"
              className="max-w-6xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8"
            >
              {user && isAdmin ? (
                <AdminConsoleView
                  currentUser={user}
                  currentUserRole={
                    user.email === ADMIN_EMAIL && user.emailVerified ? 'bureaucrat' : governanceRole
                  }
                  extensionsState={extensionsState}
                  onSelectPage={navigateToPage}
                />
              ) : (
                <div className="py-10 space-y-4">
                  <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    Administration Access Restricted
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                    This console is reserved for {siteTitle} Bureaucrats and Administrators.
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
            <div
              data-wiki-surface="panel"
              className="max-w-5xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6"
            >
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
                  initialTitle={
                    createPresetSlug.startsWith('predefinicao-')
                      ? `Predefinição:${slugToTitle(createPresetSlug.slice('predefinicao-'.length))}`
                      : createPresetSlug.startsWith('template-')
                      ? `Template:${slugToTitle(createPresetSlug.slice('template-'.length))}`
                      : createPresetSlug
                      ? slugToTitle(createPresetSlug)
                      : ''
                  }
                  initialContent={
                    createPresetSlug.startsWith('predefinicao-') ||
                    createPresetSlug.startsWith('template-')
                      ? `<noinclude>\nDocumentação desta predefinição. Uso: \`{{${
                          createPresetSlug.replace(/^(predefinicao-|template-)/, '')
                        }|texto=...}}\`\n</noinclude>{{Aviso|tipo=nota|título=Predefinição|texto={{{texto|Conteúdo da predefinição.}}}}}`
                      : ''
                  }
                  initialCategory={
                    createPresetSlug.startsWith('predefinicao-') ||
                    createPresetSlug.startsWith('template-')
                      ? 'reference'
                      : 'general'
                  }
                  initialTags={
                    createPresetSlug.startsWith('predefinicao-') ||
                    createPresetSlug.startsWith('template-')
                      ? ['predefinicao', 'template']
                      : []
                  }
                  initialVisibility="public"
                  initialIsLocked={false}
                  canManageMeta={true}
                  existingSlugs={existingSlugs}
                  wikiPages={allPages}
                  currentSlug={createPresetSlug || undefined}
                  currentUser={user}
                  isSaving={isSaving}
                  errorMessage={saveError}
                  enableInfoboxToolbar={infoboxExt.enabled && infoboxExt.settings.allowEditorToolbar !== false}
                  enableReferencesToolbar={refsExt.enabled && refsExt.settings.allowEditorToolbar !== false}
                  enableInfoboxPreview={infoboxExt.enabled}
                  enableReferencesPreview={refsExt.enabled}
                  showTocPreview={tocExt.enabled}
                  tocDefaultExpanded={tocExt.settings.defaultExpanded !== false}
                  tocMinHeadings={tocMinHeadings}
                  referencesTitle={referencesSectionTitle}
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
                    Sign in with your Google account to create and publish pages on {siteTitle}.
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
            <div
              data-wiki-surface="panel"
              className="max-w-5xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8"
            >
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
            <div
              data-wiki-surface="panel"
              className="max-w-3xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6"
            >
              <div className="space-y-2">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  wiki / :{activeSlug}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100">
                  {allPages.length === 0 && activeSlug === 'start'
                    ? `${siteTitle} is ready to begin`
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
            <>
              {isPrintView && (
                <div
                  data-wiki-print-bar="true"
                  className="max-w-[820px] mx-auto mb-4 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 flex flex-wrap items-center justify-between gap-3 shadow-xs print:hidden"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <Printer className="w-4 h-4 text-blue-700 shrink-0" />
                    <span className="font-semibold text-slate-900">Print View</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-slate-600">:{activePage.slug}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 shrink-0" />
                      <span>Print / Save PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPrintView(false)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 shrink-0" />
                      <span>Exit Print View</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Active Wiki Page View */}
              <div
                data-wiki-document="sheet"
                data-wiki-surface="panel"
                className="max-w-6xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6"
              >
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

                    <div
                      data-wiki-chrome="edit-tools"
                      className="print:hidden flex flex-wrap items-center gap-2 shrink-0"
                    >
                      {copyLinkExt.enabled && copyLinkExt.settings.showInHeader !== false && (
                        <button
                          type="button"
                          onClick={() => void handleCopyPageLink()}
                          title="Copy direct URL to this page"
                          aria-label="Copy link to current page"
                          data-wiki-surface="inset"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                          {copiedPageLink ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Link2 className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{copiedPageLink ? 'Copied' : 'Copy Link'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={exportingPdf}
                        onClick={() => void handleExportPdf()}
                        title={`Exportar artigo em PDF (${activeTheme.name} · ${
                          effectiveIsDark ? 'Escuro' : 'Claro'
                        })`}
                        aria-label="Exportar conteúdo do artigo como PDF"
                        data-wiki-surface="inset"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      >
                        {exportingPdf ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        ) : (
                          <FileDown className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{exportingPdf ? 'Gerando PDF...' : 'Exportar PDF'}</span>
                      </button>

                      {printExt.enabled && printExt.settings.showInHeader !== false && (
                        <button
                          type="button"
                          aria-pressed={isPrintView}
                          onClick={() => {
                            setIsPrintView((prev) => {
                              const next = !prev;
                              if (next) {
                                setActiveTab('read');
                              }
                              return next;
                            });
                          }}
                          title={
                            isPrintView
                              ? 'Exit document Print View (Esc)'
                              : 'Open clean, document-ready Print View'
                          }
                          data-wiki-surface={isPrintView ? 'accent' : 'inset'}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                            isPrintView
                              ? 'border-blue-700 bg-blue-700 text-white hover:bg-blue-800'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Printer className="w-3.5 h-3.5 shrink-0" />
                          <span>Print</span>
                        </button>
                      )}
                    </div>
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
                  <div
                    data-wiki-chrome="edit-tools"
                    className="flex flex-wrap items-center justify-between gap-3 pt-2 print:hidden"
                  >
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
                          ? 'Sign in with Google to edit (Ctrl+E)'
                          : !canEditActivePage
                          ? isActiveUserOrDiscussionPage
                            ? 'Only the page owner or an administrator can edit user and discussion pages'
                            : 'This page is locked by the author'
                          : 'Edit Markdown content (Ctrl+E)'
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-45 disabled:cursor-not-allowed ${
                        activeTab === 'edit'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      {(activePage.isLocked || isActiveUserOrDiscussionPage) &&
                      !canEditActivePage ? (
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

                    {canViewDiscussion && (
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
                    )}

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
                  <article
                    data-wiki-document="article"
                    className={
                      !isPrintView && (outlineToc.length > 0 || outlineRefs.length > 0)
                        ? 'xl:col-span-9'
                        : 'xl:col-span-12'
                    }
                  >
                    {(isPersonalProfilePage || isPersonalDiscussionPage) && (
                      <div
                        data-wiki-chrome="personal-actions"
                        className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200 dark:border-slate-800 print:hidden"
                      >
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

                    <div className="flow-root">
                      {isPersonalProfilePage &&
                        infoboxExt.enabled &&
                        infoboxExt.settings.allowAutoProfileCard !== false &&
                        !parseMarkdownWithInfoboxes(expandedActiveContent).some(
                          (seg) => seg.kind === 'infobox'
                        ) && (
                          <WikiInfobox
                            infobox={{
                              type: 'user',
                              title: personalAuthorProfile?.displayName || activePage.authorName,
                              subtitle: `${siteTitle} Collaborator`,
                              image: personalAuthorProfile?.photoURL || undefined,
                              layout: 'right',
                              fields: [
                                { key: 'Handle', value: `:${activePage.slug}` },
                                {
                                  key: 'Member ID',
                                  value: `\`${activePage.authorId.slice(0, 8)}\``,
                                },
                                {
                                  key: 'Discussion',
                                  value: `[[${
                                    personalAuthorProfile?.discussionPageSlug ??
                                    `${activePage.slug}-discussion`
                                  }|Talk Page]]`,
                                },
                                { key: 'Role', value: 'Collaborator' },
                                ...(activePage.createdAt
                                  ? [
                                      {
                                        key: 'Joined',
                                        value: activePage.createdAt
                                          .toDate()
                                          .toISOString()
                                          .slice(0, 10),
                                      },
                                    ]
                                  : []),
                                { key: 'Status', value: 'Active' },
                              ],
                            }}
                            existingSlugs={existingSlugs}
                            onNavigateSlug={navigateToPage}
                          />
                        )}

                      <ArticleViewer
                        content={activePage.content}
                        existingSlugs={existingSlugs}
                        wikiPages={allPages}
                        currentSlug={activePage.slug}
                        currentTitle={activePage.title}
                        onNavigateSlug={navigateToPage}
                        showToc={tocExt.enabled}
                        tocDefaultExpanded={tocExt.settings.defaultExpanded !== false}
                        tocMinHeadings={tocMinHeadings}
                        enableReferences={refsExt.enabled}
                        referencesTitle={referencesSectionTitle}
                        enableInfoboxes={infoboxExt.enabled}
                        showReferencesFooter={false}
                      />
                    </div>

                    {refsExt.enabled && (
                      <ReferencesFooter
                        references={articleReferences}
                        title={referencesSectionTitle}
                        existingSlugs={existingSlugs}
                        onNavigateSlug={navigateToPage}
                      />
                    )}

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

                    {isPersonalDiscussionPage && canViewDiscussion && (
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

                    {/* WikiWazzimaGiygg Article Footer */}
                    <footer className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          This page was last edited on{' '}
                          <span className="font-medium tabular-nums">
                            {formatAbsoluteTime(activePage.updatedAt)}
                          </span>{' '}
                          by{' '}
                          {activePage.lastEditorId === 'builtin-editorial' ? (
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {activePage.lastEditorName}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                navigateToPage(
                                  buildPersonalSlugs(
                                    activePage.lastEditorName,
                                    activePage.lastEditorId
                                  ).personalPageSlug
                                )
                              }
                              className="font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              {activePage.lastEditorName}
                            </button>
                          )}
                          .
                        </div>
                        <div className="font-mono tabular-nums text-[10px]">
                          Revision #{activePage.version} (:{activePage.slug})
                        </div>
                      </div>
                      <div>
                        Content is available under{' '}
                        <a
                          href="https://creativecommons.org/licenses/by-sa/4.0/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 dark:text-blue-400 hover:underline"
                          data-wiki-surface="link"
                        >
                          Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
                        </a>{' '}
                        and the GNU General Public License v2+.
                        {activeTheme.institutionMeta && (
                          <span>
                            {' '}
                            · {activeTheme.institutionMeta.notice}
                          </span>
                        )}
                      </div>
                    </footer>
                  </article>

                  {(outlineToc.length > 0 || outlineRefs.length > 0) && (
                    <aside
                      data-wiki-chrome="page-outline"
                      className="xl:col-span-3 xl:sticky xl:top-20 border-t xl:border-t-0 xl:border-l border-slate-200 dark:border-slate-800 pt-4 xl:pt-0 xl:pl-5 space-y-2.5 print:hidden"
                    >
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        On this page
                      </div>
                      <ul className="space-y-1.5 text-xs">
                        {outlineToc.map((item) => (
                          <li
                            key={item.id}
                            className={
                              item.level === 1
                                ? 'pl-0 font-medium'
                                : item.level === 2
                                ? 'pl-2'
                                : 'pl-4'
                            }
                          >
                            <a
                              href={`#${item.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(item.id)?.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'start',
                                });
                              }}
                              className="block text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors truncate"
                            >
                              {item.text}
                            </a>
                          </li>
                        ))}
                        {outlineRefs.length > 0 && (
                          <li
                            className={`pl-0 font-medium ${
                              outlineToc.length > 0
                                ? 'pt-1.5 mt-1.5 border-t border-slate-200/70 dark:border-slate-800/70'
                                : ''
                            }`}
                          >
                            <a
                              href="#referencias"
                              onClick={(e) => {
                                e.preventDefault();
                                scrollToWikiAnchor('referencias', 'start');
                              }}
                              className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                            >
                              <span className="truncate">{referencesSectionTitle}</span>
                              <span className="font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500 shrink-0">
                                {outlineRefs.length}
                              </span>
                            </a>
                          </li>
                        )}
                      </ul>
                    </aside>
                  )}
                </div>
              )}

              {activeTab === 'edit' && user && canEditActivePage && (
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
                  wikiPages={allPages}
                  currentSlug={activePage.slug}
                  currentUser={user}
                  isSaving={isSaving}
                  errorMessage={saveError}
                  enableInfoboxToolbar={infoboxExt.enabled && infoboxExt.settings.allowEditorToolbar !== false}
                  enableReferencesToolbar={refsExt.enabled && refsExt.settings.allowEditorToolbar !== false}
                  enableInfoboxPreview={infoboxExt.enabled}
                  enableReferencesPreview={refsExt.enabled}
                  showTocPreview={tocExt.enabled}
                  tocDefaultExpanded={tocExt.settings.defaultExpanded !== false}
                  tocMinHeadings={tocMinHeadings}
                  referencesTitle={referencesSectionTitle}
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

              {activeTab === 'comments' && canViewDiscussion && (
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
            </>
          )}
        </main>
      </div>

      {/* Global WikiWazzimaGiygg + LGPD / Marco Civil Compliance Footer */}
      <footer
        data-wiki-chrome="footer"
        data-wiki-surface="footer"
        className="border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f1623]/80 print:hidden"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 space-y-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div>
                <strong className="font-medium text-slate-700 dark:text-slate-200">
                  {siteTitle}
                </strong>{' '}
                · Content under{' '}
                <a
                  href="https://creativecommons.org/licenses/by-sa/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 dark:text-blue-400 hover:underline"
                >
                  CC BY-SA 4.0
                </a>{' '}
                &amp; GNU GPL v2+ · Aligned with {LEGAL_GOVERNANCE.lgpdLaw} &amp;{' '}
                {LEGAL_GOVERNANCE.marcoCivilLaw}
              </div>
              <div>
                Controller &amp; DPO (PDO):{' '}
                <span className="text-slate-700 dark:text-slate-200 font-medium">
                  {LEGAL_GOVERNANCE.dpoName}
                </span>{' '}
                ·{' '}
                <a
                  href={`mailto:${LEGAL_GOVERNANCE.dpoEmail}`}
                  className="font-mono text-blue-700 dark:text-blue-400 hover:underline"
                >
                  {LEGAL_GOVERNANCE.dpoEmail}
                </a>
              </div>
              <p className="pt-0.5 text-slate-600 dark:text-slate-300 leading-relaxed">
                Este site pertence ao ecossistema{' '}
                <a
                  href={LEGAL_GOVERNANCE.ecosystemUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-wiki-surface="link"
                  className="font-medium text-blue-700 dark:text-blue-400 hover:underline"
                >
                  {LEGAL_GOVERNANCE.ecosystemDomain}
                </a>
                , um projeto <strong className="font-semibold text-slate-800 dark:text-slate-100">WazzimaGiygg</strong>. Confira a verdade sobre os absurdos da Wikipédia no link:{' '}
                <a
                  href={LEGAL_GOVERNANCE.truthPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-wiki-surface="link"
                  className="font-mono text-blue-700 dark:text-blue-400 hover:underline break-all"
                >
                  {LEGAL_GOVERNANCE.truthPortalUrl}
                </a>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <a
                href="#/ecosystem"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToEcosystem();
                }}
                className="hover:text-slate-900 dark:hover:text-slate-100 underline underline-offset-4 whitespace-nowrap"
              >
                Ecosystem &amp; Products
              </a>
              <a
                href={`#/page/${DOSSIER_PAGE_SLUG}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToPage(DOSSIER_PAGE_SLUG);
                }}
                className="hover:text-slate-900 dark:hover:text-slate-100 underline underline-offset-4 whitespace-nowrap"
              >
                LGPD &amp; MCI Dossier
              </a>
              <a
                href="#/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToLegal('privacy');
                }}
                className="hover:text-slate-900 dark:hover:text-slate-100 underline underline-offset-4 whitespace-nowrap"
              >
                Privacy &amp; LGPD
              </a>
              <a
                href="#/terms"
                onClick={(e) => {
                  e.preventDefault();
                  navigateToLegal('terms');
                }}
                className="hover:text-slate-900 dark:hover:text-slate-100 underline underline-offset-4 whitespace-nowrap"
              >
                Terms &amp; Marco Civil
              </a>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {activeTheme.institutionMeta ? (
                <>
                  {activeTheme.institutionMeta.organization} ·{' '}
                  {activeTheme.institutionMeta.eraLabel} · {activeTheme.institutionMeta.notice}
                </>
              ) : (
                'WikiWazzimaGiygg Ecosystem · Infrastructure, Licensing & Governance'
              )}
            </span>
            <FooterBadges
              siteTitle={siteTitle}
              showWikiomiteBadge={activeTheme.id === 'wikidiota'}
              onNavigateHome={() => navigateToPage('start')}
              onNavigateLegal={() => navigateToLegal('privacy')}
              onNavigateDossier={() => navigateToPage(DOSSIER_PAGE_SLUG)}
            />
          </div>
        </div>
      </footer>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <PrivacyNoticeBanner onOpenPrivacy={() => navigateToLegal('privacy')} />

      {showBackToTop && (
        <button
          data-wiki-chrome="floating"
          data-wiki-surface="panel"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          title="Back to top"
          className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-[#0f1623]/95 backdrop-blur-sm text-slate-800 dark:text-slate-100 shadow-md hover:border-blue-700 dark:hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer print:hidden"
        >
          <ArrowUp className="w-3.5 h-3.5 shrink-0" />
          <span>Back to Top</span>
        </button>
      )}
    </div>
  );
}

const BlockedEmbedScreen: React.FC = () => {
  const directUrl = typeof window !== 'undefined' ? window.location.href : 'https://wikimaker.wazzimagiygg.com/';

  React.useEffect(() => {
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.replace(directUrl);
      }
    } catch {
      // Cross-origin frame restricts top-level redirect; keep blocked fallback UI visible
    }
  }, [directUrl]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 space-y-4">
        <div className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
          <Lock className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0" />
          <h1 className="font-display text-lg font-semibold">
            Exibição em iframe não permitida
          </h1>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Por diretriz de segurança e proteção contra clickjacking,{' '}
          <strong>WazzimaGiygg Maker</strong> não pode ser incorporado em iframes de terceiros,
          sendo permitido apenas acesso direto ou ambiente autorizado no Google AI Studio.
        </p>
        <div className="pt-1">
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap"
          >
            Abrir site diretamente
          </a>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const frameCheck = React.useMemo(() => evaluateFrameContext(), []);

  if (!frameCheck.allowed) {
    return <BlockedEmbedScreen />;
  }

  return (
    <ErrorBoundary>
      <WikiWorkspace />
    </ErrorBoundary>
  );
}
