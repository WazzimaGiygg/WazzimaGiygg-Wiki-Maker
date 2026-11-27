import React from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  AlertTriangle,
  ArrowUp,
  BookOpen,
  Bookmark,
  BookmarkCheck,
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
  Users,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { AdminConsoleView } from './components/AdminConsoleView';
import { AppearanceSettingsView } from './components/AppearanceSettingsView';
import { ArticleViewer } from './components/ArticleViewer';
import { CategoriesFooter } from './components/CategoriesFooter';
import { CategoryMembersSection } from './components/CategoryMembersSection';
import { CategoryView } from './components/CategoryView';
import { ChatbotBlockedScreen } from './components/ChatbotBlockedScreen';
import { EcosystemProductsView } from './components/EcosystemProductsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FooterBadges } from './components/FooterBadges';
import { LegalComplianceView, type LegalSectionTab } from './components/LegalComplianceView';
import { MarkdownEditor } from './components/MarkdownEditor';
import { PageComments } from './components/PageComments';
import { PageIndexView } from './components/PageIndexView';
import { PageRatingPanel } from './components/PageRatingPanel';
import { PrivacyNoticeBanner } from './components/PrivacyNoticeBanner';
import { QuickEditModal } from './components/QuickEditModal';
import { ReadingProgressBar } from './components/ReadingProgressBar';
import { ReferencesFooter } from './components/ReferencesFooter';
import { RevisionHistory } from './components/RevisionHistory';
import { ShortcutsModal } from './components/ShortcutsModal';
import { Sidebar } from './components/Sidebar';
import { SpecialPagesHub, type SpecialPagesTab } from './components/SpecialPagesHub';
import { ToastContainer, type ToastNotification } from './components/ToastContainer';
import { UserEditsPanel } from './components/UserEditsPanel';
import { WatchlistProfilePanel } from './components/WatchlistProfilePanel';
import { WikiInfobox } from './components/WikiInfobox';
import {
  fetchCurrentUserGovernance,
  notifyAuthorSpeedyDeletion,
  notifyUserDiscussionPage,
} from './lib/adminService';
import {
  buildWikiCategoryDirectory,
  formatCategoryDisplayName,
  getCategorySlugFromPage,
  getCategorySlugFromPageSlug,
  isCategoryDescriptionSlug,
  resolvePageCategories,
  upsertCategoryTagInMarkdown,
} from './lib/categoryUtils';
import {
  applyExternalLinkPrefix,
  bootAndSubscribeSiteExtensions,
  getInitialSiteExtensionsState,
  resolveExternalLinkConfig,
  resolveSiteTheme,
  resolveSiteTitle,
  type SiteExtensionsState,
} from './lib/extensionsService';
import { ADMIN_EMAIL, auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { evaluateChatbotClientContext } from './lib/chatbotBlocker';
import { evaluateFrameContext } from './lib/frameGuard';
import { sanitizeHeaderImageUrl } from './lib/headerImageService';
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
  type EcosystemSubpage,
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
  normalizeCategoryName,
  normalizeCategorySlug,
  parseMarkdownWithInfoboxes,
  scrollToWikiAnchor,
  slugToTitle,
  toWikiSlug,
} from './lib/markdownUtils';
import { exportArticleToPdf } from './lib/pdfExportService';
import { buildWikiPrintStylesheet, PRINT_STYLESHEET_ID } from './lib/printStyles';
import { applyDynamicSeo } from './lib/seoManager';
import {
  ENGLISH_COMMUNITY_TEMPLATES,
  expandTemplatesInWikitext,
  extractSpeedyDeletionTemplate,
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
  addPageToWatchlist,
  buildPersonalSlugs,
  createWikiPage,
  deletePageComment,
  deletePageRating,
  deleteWikiPage,
  ensureDossierArticlePublished,
  extractRecentEditorsFromRevisions,
  fetchCollaboratorProfile,
  fetchPageRevisions,
  fetchUserEdits,
  isUserOrDiscussionPage,
  removePageFromWatchlist,
  restorePageRevision,
  seedStarterWiki,
  syncUserDocuments,
  updateWikiPage,
  upsertPageRating,
} from './lib/wikiService';
import {
  type BlockedUser,
  type CollaboratorProfile,
  type GovernanceRole,
  type PageComment,
  type PageRating,
  type PageRevision,
  type PageTab,
  type PageVisibility,
  type RecentEditorEntry,
  type ThemePreference,
  type UserEdit,
  type WatchlistItem,
  WIKI_CATEGORIES,
  type WikiPage,
  type WorkspaceView,
} from './types/wiki';
import {
  getNextThemePreference,
  getSystemPrefersDark,
  readStoredThemePreference,
  resolveEffectiveDarkMode,
  writeStoredThemePreference,
} from './lib/themePreference';

const EMPTY_TAGS: string[] = [];
const TEMPLATE_PRESET_TAGS: string[] = ['predefinicao', 'template'];

function parseHashRoute(): {
  view: WorkspaceView;
  slug: string;
  legalSection?: LegalSectionTab;
  ecosystemSubpage?: EcosystemSubpage;
  categorySlug?: string | null;
  specialTab?: SpecialPagesTab;
} {
  const rawHash = window.location.hash.replace(/^#\/?/, '');
  const hash = rawHash.toLowerCase();
  if (hash === 'privacy' || hash === 'lgpd') {
    return { view: 'legal', slug: 'start', legalSection: 'privacy' };
  }
  if (hash === 'terms' || hash === 'marco-civil') {
    return { view: 'legal', slug: 'start', legalSection: 'terms' };
  }
  if (hash === 'averdade') {
    return { view: 'ecosystem', slug: 'start', ecosystemSubpage: 'dossier' };
  }
  if (
    hash === 'ecosystem' ||
    hash === 'ecossistema' ||
    hash === 'produtos' ||
    hash.startsWith('ecosystem/') ||
    hash.startsWith('ecossistema/')
  ) {
    const subSegment = hash.split('/')[1] ?? '';
    let ecosystemSubpage: EcosystemSubpage = 'overview';
    if (subSegment === 'services' || subSegment === 'servicos' || subSegment === 'produtos') {
      ecosystemSubpage = 'services';
    } else if (subSegment === 'dossier' || subSegment === 'dossie' || subSegment === 'averdade') {
      ecosystemSubpage = 'dossier';
    } else if (
      subSegment === 'administrators' ||
      subSegment === 'administradores' ||
      subSegment === 'admins'
    ) {
      ecosystemSubpage = 'administrators';
    }
    return { view: 'ecosystem', slug: 'start', ecosystemSubpage };
  }
  if (
    hash === 'special' ||
    hash === 'special-pages' ||
    hash === 'especial' ||
    hash.startsWith('special/') ||
    hash.startsWith('special-pages/') ||
    hash.startsWith('especial/')
  ) {
    const subSegment = hash.split('/')[1] ?? '';
    let specialTab: SpecialPagesTab = 'categories';
    if (subSegment === 'tags') specialTab = 'tags';
    else if (subSegment === 'appearance' || subSegment === 'aparencia' || subSegment === 'theme') {
      specialTab = 'appearance';
    } else if (subSegment === 'directory' || subSegment === 'all') specialTab = 'directory';
    else if (subSegment === 'recent') specialTab = 'recent';
    return { view: 'special', slug: 'start', specialTab };
  }
  if (
    hash === 'appearance' ||
    hash === 'aparencia' ||
    hash === 'settings/appearance' ||
    hash === 'special:appearance'
  ) {
    return { view: 'appearance', slug: 'start' };
  }
  if (hash === 'categories' || hash === 'categorias' || hash === 'special:categories') {
    return { view: 'categories', slug: 'start', categorySlug: null };
  }
  if (hash.startsWith('category/') || hash.startsWith('categoria/')) {
    const slashIdx = rawHash.indexOf('/');
    const rawCat = slashIdx >= 0 ? rawHash.slice(slashIdx + 1) : '';
    let decodedCat = rawCat;
    try {
      decodedCat = decodeURIComponent(rawCat);
    } catch {
      // Keep raw segment if malformed URI component
    }
    const normalizedCat = decodedCat ? normalizeCategorySlug(decodedCat) : null;
    return { view: 'categories', slug: 'start', categorySlug: normalizedCat };
  }
  if (hash === 'admin') return { view: 'admin', slug: 'start' };
  if (hash === 'pages' || hash === 'paginas') return { view: 'index', slug: 'start' };
  if (hash === 'recent' || hash === 'recentes') return { view: 'recent', slug: 'start' };
  if (hash === 'tags' || hash === 'special:tags') return { view: 'tags', slug: 'start' };
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
  const [ecosystemSubpage, setEcosystemSubpage] = React.useState<EcosystemSubpage>(
    initialRoute.ecosystemSubpage ?? 'overview'
  );
  const [selectedCategorySlug, setSelectedCategorySlug] = React.useState<string | null>(
    initialRoute.categorySlug ?? null
  );
  const [specialTab, setSpecialTab] = React.useState<SpecialPagesTab>(
    initialRoute.specialTab ?? 'categories'
  );
  const [activeSlug, setActiveSlug] = React.useState<string>(initialRoute.slug || 'start');
  const [createPresetSlug, setCreatePresetSlug] = React.useState<string>(
    initialRoute.view === 'create' ? initialRoute.slug : ''
  );
  const [activeTab, setActiveTab] = React.useState<PageTab>('read');

  const [revisions, setRevisions] = React.useState<PageRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = React.useState(false);
  const [fallbackRecentEditorsBySlug, setFallbackRecentEditorsBySlug] = React.useState<
    Record<string, { version: number; editors: RecentEditorEntry[] }>
  >({});
  const [comments, setComments] = React.useState<PageComment[]>([]);
  const [ratings, setRatings] = React.useState<PageRating[]>([]);
  const [personalAuthorProfile, setPersonalAuthorProfile] = React.useState<CollaboratorProfile | null>(null);
  const [personalUserEdits, setPersonalUserEdits] = React.useState<UserEdit[]>([]);
  const [personalEditsLoading, setPersonalEditsLoading] = React.useState(false);
  const [watchlistItems, setWatchlistItems] = React.useState<WatchlistItem[]>([]);
  const [watchlistLoading, setWatchlistLoading] = React.useState(false);
  const [watchlistBusySlug, setWatchlistBusySlug] = React.useState<string | null>(null);

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [quickEditOpen, setQuickEditOpen] = React.useState(false);
  const [quickEditSaving, setQuickEditSaving] = React.useState(false);
  const [quickEditError, setQuickEditError] = React.useState<string | null>(null);
  const [restoringVersion, setRestoringVersion] = React.useState<number | null>(null);
  const [seeding, setSeeding] = React.useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [copiedSource, setCopiedSource] = React.useState(false);
  const [copiedPageLink, setCopiedPageLink] = React.useState(false);
  const [exportingPdf, setExportingPdf] = React.useState(false);
  const [isPrintView, setIsPrintView] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [sidebarTagFilter, setSidebarTagFilter] = React.useState<string | null>(null);
  const [failedBannerUrl, setFailedBannerUrl] = React.useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const [showBackToTop, setShowBackToTop] = React.useState(false);
  const [toasts, setToasts] = React.useState<ToastNotification[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [pendingLeaveAction, setPendingLeaveAction] = React.useState<(() => void) | null>(null);
  const hasUnsavedChangesRef = React.useRef(false);
  hasUnsavedChangesRef.current = hasUnsavedChanges;
  const notifiedDirtySessionRef = React.useRef(false);
  const currentRouteHashRef = React.useRef<string>(
    typeof window !== 'undefined' ? window.location.hash || '#/page/start' : '#/page/start'
  );
  const [isOnline, setIsOnline] = React.useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [themePreference, setThemePreference] = React.useState<ThemePreference>(() =>
    readStoredThemePreference()
  );
  const [systemPrefersDark, setSystemPrefersDark] = React.useState<boolean>(() =>
    getSystemPrefersDark()
  );

  const pushToast = React.useCallback((toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const isEditorSessionOpen = view === 'create' || (view === 'page' && activeTab === 'edit');
  const isEditorSessionOpenRef = React.useRef(isEditorSessionOpen);
  isEditorSessionOpenRef.current = isEditorSessionOpen;
  const isSavingRef = React.useRef(isSaving);
  isSavingRef.current = isSaving;

  React.useEffect(() => {
    if (!isEditorSessionOpen) {
      setHasUnsavedChanges(false);
      notifiedDirtySessionRef.current = false;
    }
  }, [isEditorSessionOpen]);

  React.useEffect(() => {
    if (!isEditorSessionOpen || !hasUnsavedChanges) return;
    if (!notifiedDirtySessionRef.current) {
      notifiedDirtySessionRef.current = true;
      pushToast({
        tone: 'warning',
        title: 'Unsaved changes',
        description:
          'This article has been modified. If you leave without saving, all changes will be lost.',
        durationMs: 7000,
      });
    }
  }, [isEditorSessionOpen, hasUnsavedChanges, pushToast]);

  React.useEffect(() => {
    if (!isEditorSessionOpen || !hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditorSessionOpen, hasUnsavedChanges]);

  const guardUnsavedLeave = React.useCallback((action: () => void) => {
    if (isEditorSessionOpenRef.current && hasUnsavedChangesRef.current && !isSavingRef.current) {
      setPendingLeaveAction(() => action);
      return;
    }
    action();
  }, []);

  const confirmLeaveWithoutSaving = () => {
    const action = pendingLeaveAction;
    setPendingLeaveAction(null);
    hasUnsavedChangesRef.current = false;
    setHasUnsavedChanges(false);
    notifiedDirtySessionRef.current = false;
    action?.();
  };

  const requestTabChange = React.useCallback(
    (nextTab: PageTab) => {
      if (activeTab === 'edit' && nextTab !== 'edit') {
        guardUnsavedLeave(() => setActiveTab(nextTab));
        return;
      }
      setActiveTab(nextTab);
    },
    [activeTab, guardUnsavedLeave]
  );

  const { theme: activeTheme, colorScheme: themeColorScheme } = React.useMemo(
    () => resolveSiteTheme(extensionsState),
    [extensionsState]
  );

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncPreference = (matches: boolean) => {
      setSystemPrefersDark(matches);
    };
    syncPreference(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncPreference(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const effectiveIsDark = resolveEffectiveDarkMode(
    themePreference,
    systemPrefersDark,
    themeColorScheme
  );

  const handleChangeThemePreference = React.useCallback((next: ThemePreference) => {
    writeStoredThemePreference(next);
    setThemePreference(next);
  }, []);

  // Sync dark mode preference, active theme attribute, and browser theme-color on <html>
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-wiki-theme', activeTheme.id);

    if (effectiveIsDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    writeStoredThemePreference(themePreference);

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute(
        'content',
        effectiveIsDark ? activeTheme.metaThemeColor.dark : activeTheme.metaThemeColor.light
      );
    }
  }, [activeTheme, effectiveIsDark, themePreference]);

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
  const ratingsExt = extensionsState.byId['article-ratings'];
  const historyExt = extensionsState.byId['page-history'];
  const sourceExt = extensionsState.byId['page-source'];
  const pdfExportExt = extensionsState.byId['pdf-export'];
  const zipArchiveExt = extensionsState.byId['zip-archive'];
  const templatesExt = extensionsState.byId['wiki-templates'];
  const editorToolbarExt = extensionsState.byId['editor-toolbar'];
  const ecosystemExt = extensionsState.byId['ecosystem-portal'];
  const quickCreateExt = extensionsState.byId['quick-create'];
  const sidebarFilterExt = extensionsState.byId['sidebar-filter'];
  const userProfilesExt = extensionsState.byId['user-profiles'];
  const pwaInstallExt = extensionsState.byId['pwa-install'];
  const shortcutsExt = extensionsState.byId['keyboard-shortcuts'];
  const backToTopExt = extensionsState.byId['back-to-top'];
  const footerBadgesExt = extensionsState.byId['footer-badges'];
  const pageOutlineExt = extensionsState.byId['page-outline'];
  const pageMetadataExt = extensionsState.byId['page-metadata'];
  const pageIndexExt = extensionsState.byId['page-index-views'];
  const privacyBannerExt = extensionsState.byId['privacy-banner'];
  const headerBannerExt = extensionsState.byId['page-header-banner'];
  const watchlistExt = extensionsState.byId.watchlist;
  const externalLinkConfig = React.useMemo(
    () => resolveExternalLinkConfig(extensionsState),
    [extensionsState]
  );

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
    } else if (!historyExt.enabled && activeTab === 'history') {
      setActiveTab('read');
    } else if (!sourceExt.enabled && activeTab === 'source') {
      setActiveTab('read');
    }
  }, [canViewDiscussion, historyExt.enabled, sourceExt.enabled, activeTab]);

  React.useEffect(() => {
    if (!shortcutsExt.enabled && shortcutsOpen) {
      setShortcutsOpen(false);
    }
  }, [shortcutsExt.enabled, shortcutsOpen]);

  React.useEffect(() => {
    if (!sidebarFilterExt.enabled && sidebarTagFilter !== null) {
      setSidebarTagFilter(null);
    }
  }, [sidebarFilterExt.enabled, sidebarTagFilter]);

  const handleFilterByTag = React.useCallback(
    (tag: string) => {
      if (!sidebarFilterExt.enabled) return;
      const trimmed = tag.trim();
      if (!trimmed) return;
      const isClearing =
        sidebarTagFilter !== null &&
        sidebarTagFilter.toLowerCase() === trimmed.toLowerCase();
      setSidebarTagFilter(isClearing ? null : trimmed);
      if (!isClearing && typeof window !== 'undefined' && window.innerWidth < 1024) {
        setMobileMenuOpen(true);
      }
    },
    [sidebarFilterExt.enabled, sidebarTagFilter]
  );

  // Listen for browser back/forward hash navigation
  React.useEffect(() => {
    const handleHashChange = () => {
      const incomingHash = window.location.hash || '#/page/start';
      if (
        isEditorSessionOpenRef.current &&
        hasUnsavedChangesRef.current &&
        !isSavingRef.current &&
        incomingHash !== currentRouteHashRef.current
      ) {
        window.history.replaceState(null, '', currentRouteHashRef.current);
        setPendingLeaveAction(() => () => {
          window.location.hash = incomingHash;
        });
        return;
      }

      currentRouteHashRef.current = incomingHash;
      const next = parseHashRoute();
      setView(next.view);
      if (next.legalSection) {
        setLegalSection(next.legalSection);
      }
      if (next.view === 'ecosystem') {
        setEcosystemSubpage(next.ecosystemSubpage ?? 'overview');
      }
      if (next.view === 'categories') {
        setSelectedCategorySlug(next.categorySlug ?? null);
      }
      if (next.view === 'special') {
        setSpecialTab(next.specialTab ?? 'categories');
      }
      if (next.view === 'create') {
        setCreatePresetSlug(next.slug);
      } else if (next.slug) {
        setActiveSlug(next.slug);
      }
      setActiveTab('read');
      setSaveError(null);
      setQuickEditOpen(false);
      setQuickEditError(null);
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
      guardUnsavedLeave(() => {
        const normalized = toWikiSlug(slug) || 'start';
        const nextHash = `#/page/${normalized}`;
        currentRouteHashRef.current = nextHash;
        setActiveSlug(normalized);
        setView('page');
        setActiveTab('read');
        setSaveError(null);
        setQuickEditOpen(false);
        setQuickEditError(null);
        setConfirmDeleteOpen(false);
        if (autoExitPrintOnNavigate) {
          setIsPrintView(false);
        }
        setCopiedPageLink(false);
        window.location.hash = nextHash;
      });
    },
    [autoExitPrintOnNavigate, guardUnsavedLeave]
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

  // Backfill last 3 editors from revision history on older multi-revision pages without persisted recentEditors
  React.useEffect(() => {
    if (
      !pageMetadataExt.enabled ||
      view !== 'page' ||
      !activePage ||
      (Array.isArray(activePage.recentEditors) && activePage.recentEditors.length > 0) ||
      activePage.version <= 1 ||
      activePage.lastEditorId === 'builtin-editorial'
    ) {
      return;
    }
    const cached = fallbackRecentEditorsBySlug[activePage.slug];
    if (cached && cached.version === activePage.version) {
      return;
    }

    let cancelled = false;
    fetchPageRevisions(activePage)
      .then((list) => {
        if (cancelled) return;
        const derived = extractRecentEditorsFromRevisions(list, activePage);
        setFallbackRecentEditorsBySlug((prev) => ({
          ...prev,
          [activePage.slug]: {
            version: activePage.version,
            editors: derived,
          },
        }));
      })
      .catch(() => {
        // Silent fallback to lastEditorName/authorName on metadata display
      });

    return () => {
      cancelled = true;
    };
  }, [
    pageMetadataExt.enabled,
    view,
    activePage?.slug,
    activePage?.version,
    activePage?.recentEditors,
    activePage?.lastEditorId,
    fallbackRecentEditorsBySlug,
  ]);

  const activeRecentEditors = React.useMemo<RecentEditorEntry[]>(() => {
    if (!activePage) return [];
    if (Array.isArray(activePage.recentEditors) && activePage.recentEditors.length > 0) {
      return activePage.recentEditors.slice(0, 3);
    }
    const cached = fallbackRecentEditorsBySlug[activePage.slug];
    if (cached && cached.version === activePage.version && cached.editors.length > 0) {
      return cached.editors.slice(0, 3);
    }
    const derived: RecentEditorEntry[] = [];
    if (activePage.lastEditorId && activePage.lastEditorName) {
      derived.push({ uid: activePage.lastEditorId, name: activePage.lastEditorName });
    }
    if (
      activePage.authorId &&
      activePage.authorName &&
      activePage.authorId !== activePage.lastEditorId
    ) {
      derived.push({ uid: activePage.authorId, name: activePage.authorName });
    }
    return derived.slice(0, 3);
  }, [activePage, fallbackRecentEditorsBySlug]);

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
          ? 'Article updated while you edit'
          : 'Article updated in real time',
        description: `${activePage.lastEditorName} published a new revision of "${activePage.title}".`,
        meta: `v${activePage.version} · :${activePage.slug}`,
        ...(historyExt.enabled
          ? {
              actionLabel: 'View history',
              onAction: () => {
                setActiveTab('history');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              },
            }
          : {}),
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
    historyExt.enabled,
  ]);

  // Subscribe to active page comments
  React.useEffect(() => {
    if (!authReady || view !== 'page' || !activePage || !canViewDiscussion) {
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
  }, [authReady, view, activePage?.slug, activePage?.visibility, activePage?.authorId, canViewDiscussion]);

  // Subscribe to active page ratings
  React.useEffect(() => {
    if (!authReady || view !== 'page' || !activePage || !ratingsExt.enabled) {
      setRatings([]);
      return;
    }
    const ratingsPath = `pages/${activePage.slug}/ratings`;
    const filterField = activePage.visibility === 'public' ? 'pageVisibility' : 'pageAuthorId';
    const filterValue = activePage.visibility === 'public' ? 'public' : activePage.authorId;
    const q = query(
      collection(db, 'pages', activePage.slug, 'ratings'),
      where(filterField, '==', filterValue)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PageRating, 'id'>),
        }));
        setRatings(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, ratingsPath);
      }
    );
    return unsub;
  }, [authReady, view, activePage?.slug, activePage?.visibility, activePage?.authorId, ratingsExt.enabled]);

  // Subscribe to current user's Watchlist bookmarks stored under their collaborator profile
  React.useEffect(() => {
    if (!authReady || !isWikiBootReady || !user || !watchlistExt.enabled) {
      setWatchlistItems([]);
      setWatchlistLoading(false);
      return;
    }
    setWatchlistLoading(true);
    const watchlistPath = `collaborators/${user.uid}/watchlist`;
    const q = query(
      collection(db, 'collaborators', user.uid, 'watchlist'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as WatchlistItem);
        list.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        setWatchlistItems(list);
        setWatchlistLoading(false);
      },
      (error) => {
        setWatchlistLoading(false);
        handleFirestoreError(error, OperationType.LIST, watchlistPath);
      }
    );
    return unsub;
  }, [authReady, isWikiBootReady, user?.uid, watchlistExt.enabled]);

  // Fetch revisions whenever user switches to History tab
  React.useEffect(() => {
    if (!historyExt.enabled || view !== 'page' || activeTab !== 'history' || !activePage) return;
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
  }, [historyExt.enabled, view, activeTab, activePage?.slug, activePage?.version, activePage?.visibility]);

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
    if (
      !authReady ||
      !userProfilesExt.enabled ||
      view !== 'page' ||
      !activePage ||
      (!isPersonalProfilePage && !isPersonalDiscussionPage)
    ) {
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
    userProfilesExt.enabled,
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
    guardUnsavedLeave(() => {
      const normalized = presetSlug ? toWikiSlug(presetSlug) : '';
      if (normalized && existingSlugs.has(normalized)) {
        navigateToPage(normalized);
        return;
      }
      const nextHash = normalized ? `#/new/${normalized}` : '#/new';
      currentRouteHashRef.current = nextHash;
      setCreatePresetSlug(normalized);
      setView('create');
      setSaveError(null);
      setConfirmDeleteOpen(false);
      setIsPrintView(false);
      window.location.hash = nextHash;
    });
  };

  const navigateToIndex = (mode: 'index' | 'recent' | 'tags') => {
    guardUnsavedLeave(() => {
      const nextHash =
        mode === 'recent' ? '#/recent' : mode === 'tags' ? '#/tags' : '#/pages';
      currentRouteHashRef.current = nextHash;
      setView(mode);
      setSaveError(null);
      setConfirmDeleteOpen(false);
      setIsPrintView(false);
      window.location.hash = nextHash;
    });
  };

  const navigateToAdmin = () => {
    guardUnsavedLeave(() => {
      currentRouteHashRef.current = '#/admin';
      setView('admin');
      setSaveError(null);
      setConfirmDeleteOpen(false);
      setIsPrintView(false);
      window.location.hash = '#/admin';
    });
  };

  const navigateToLegal = (section: LegalSectionTab) => {
    guardUnsavedLeave(() => {
      const nextHash = section === 'terms' ? '#/terms' : '#/privacy';
      currentRouteHashRef.current = nextHash;
      setLegalSection(section);
      setView('legal');
      setSaveError(null);
      setConfirmDeleteOpen(false);
      setIsPrintView(false);
      window.location.hash = nextHash;
    });
  };

  const navigateToEcosystem = (subpage?: EcosystemSubpage) => {
    if (!ecosystemExt.enabled) {
      navigateToPage('start');
      return;
    }
    guardUnsavedLeave(() => {
      const targetSubpage: EcosystemSubpage = typeof subpage === 'string' ? subpage : 'overview';
      const nextHash =
        targetSubpage === 'overview' ? '#/ecosystem' : `#/ecosystem/${targetSubpage}`;
      currentRouteHashRef.current = nextHash;
      setEcosystemSubpage(targetSubpage);
      setView('ecosystem');
      setSaveError(null);
      setConfirmDeleteOpen(false);
      setIsPrintView(false);
      window.location.hash = nextHash;
    });
  };

  const navigateToCategories = React.useCallback(
    (categorySlug?: string) => {
      guardUnsavedLeave(() => {
        const normalizedCat =
          typeof categorySlug === 'string' && categorySlug.trim()
            ? normalizeCategorySlug(categorySlug)
            : null;
        const nextHash = normalizedCat ? `#/category/${normalizedCat}` : '#/categories';
        currentRouteHashRef.current = nextHash;
        setSelectedCategorySlug(normalizedCat);
        setView('categories');
        setSaveError(null);
        setConfirmDeleteOpen(false);
        if (autoExitPrintOnNavigate) {
          setIsPrintView(false);
        }
        window.location.hash = nextHash;
      });
    },
    [autoExitPrintOnNavigate, guardUnsavedLeave]
  );

  const navigateToSpecialPages = React.useCallback(
    (tab: SpecialPagesTab = 'categories', categorySlug?: string) => {
      guardUnsavedLeave(() => {
        const nextHash = tab === 'categories' ? '#/special' : `#/special/${tab}`;
        currentRouteHashRef.current = nextHash;
        setSpecialTab(tab);
        if (typeof categorySlug === 'string' && categorySlug.trim()) {
          setSelectedCategorySlug(normalizeCategorySlug(categorySlug));
        }
        setView('special');
        setSaveError(null);
        setConfirmDeleteOpen(false);
        if (autoExitPrintOnNavigate) {
          setIsPrintView(false);
        }
        window.location.hash = nextHash;
      });
    },
    [autoExitPrintOnNavigate, guardUnsavedLeave]
  );

  const navigateToAppearance = React.useCallback(() => {
    guardUnsavedLeave(() => {
      const nextHash = '#/appearance';
      currentRouteHashRef.current = nextHash;
      setView('appearance');
      setSaveError(null);
      setConfirmDeleteOpen(false);
      if (autoExitPrintOnNavigate) {
        setIsPrintView(false);
      }
      window.location.hash = nextHash;
    });
  }, [autoExitPrintOnNavigate, guardUnsavedLeave]);

  React.useEffect(() => {
    if (!isWikiBootReady) return;
    if (!ecosystemExt.enabled && view === 'ecosystem') {
      navigateToPage('start');
    } else if (!pageIndexExt.enabled && (view === 'index' || view === 'recent')) {
      navigateToPage('start');
    }
  }, [isWikiBootReady, ecosystemExt.enabled, pageIndexExt.enabled, view, navigateToPage]);

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
    guardUnsavedLeave(() => {
      void signOut(auth);
    });
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

      // Esc -> Close confirmation/modal/drawer, exit Print View, or return from Edit to Read mode
      if (e.key === 'Escape') {
        if (pendingLeaveAction) {
          setPendingLeaveAction(null);
          return;
        }
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
          requestTabChange('read');
        }
        return;
      }

      if (!shortcutsExt.enabled) return;

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
      if (sidebarFilterExt.enabled && isMod && !e.shiftKey && !e.altKey && keyLower === 'k') {
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
    pendingLeaveAction,
    isSaving,
    shortcutsExt.enabled,
    sidebarFilterExt.enabled,
    requestTabChange,
  ]);

  const handleCreateSave = async (data: {
    slug: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    visibility: PageVisibility;
    isLocked: boolean;
    headerImageUrl?: string;
    summary: string;
  }) => {
    if (!user) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const createdSlug = await createWikiPage(data, user);
      hasUnsavedChangesRef.current = false;
      setHasUnsavedChanges(false);
      notifiedDirtySessionRef.current = false;
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
    headerImageUrl?: string;
    summary: string;
    adminNotice?: {
      send: boolean;
      reason: string;
    };
  }) => {
    if (!user || !activePage) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      if (activePage.authorId === 'builtin-editorial') {
        await createWikiPage({ ...data, slug: activePage.slug }, user);
      } else {
        await updateWikiPage(activePage, data, user, canManageActiveMeta);

        const lockChanged = data.isLocked !== activePage.isLocked;
        const shouldNotifyDiscussion =
          isAdmin &&
          !isPersonalDiscussionPage &&
          (Boolean(data.adminNotice?.send) || (lockChanged && activePage.authorId !== user.uid));

        if (shouldNotifyDiscussion) {
          const targetUid =
            lockChanged && activePage.authorId !== user.uid
              ? activePage.authorId
              : activePage.lastEditorId !== user.uid
              ? activePage.lastEditorId
              : activePage.authorId;
          const targetName =
            targetUid === activePage.lastEditorId
              ? activePage.lastEditorName
              : activePage.authorName;

          if (targetUid && targetUid !== user.uid) {
            const noticeReason =
              data.adminNotice?.reason?.trim() ||
              data.summary.trim() ||
              (lockChanged
                ? data.isLocked
                  ? `Page :${activePage.slug} locked for editing by administration.`
                  : `Edit protection removed on :${activePage.slug}.`
                : `Administrative intervention applied to revision v${activePage.version} on :${activePage.slug}.`);

            const notice = await notifyUserDiscussionPage({
              targetUid,
              targetDisplayName: targetName,
              actor: user,
              kind: lockChanged
                ? data.isLocked
                  ? 'page-locked'
                  : 'page-unlocked'
                : 'edit-moderation',
              reason: noticeReason,
              pageSlug: activePage.slug,
              pageTitle: data.title,
              version: activePage.version + 1,
            });

            if (notice.notified && notice.discussionPageSlug) {
              const targetDiscussionSlug = notice.discussionPageSlug;
              pushToast({
                tone: 'info',
                title: 'Notice posted to discussion page',
                description: `Collaborator ${targetName} was notified at :${targetDiscussionSlug}.`,
                actionLabel: 'Open discussion',
                onAction: () => navigateToPage(targetDiscussionSlug),
              });
            }
          }
        }

        const prevSpeedy = extractSpeedyDeletionTemplate(activePage.content);
        const nextSpeedy = extractSpeedyDeletionTemplate(data.content);
        if (
          nextSpeedy &&
          !prevSpeedy &&
          !isPersonalDiscussionPage &&
          activePage.authorId !== user.uid &&
          activePage.authorId !== 'builtin-editorial' &&
          activePage.authorId !== 'lgpd-anonymized'
        ) {
          const speedyNotice = await notifyAuthorSpeedyDeletion({
            targetUid: activePage.authorId,
            targetDisplayName: activePage.authorName,
            actor: user,
            actorIsAdmin: isAdmin,
            pageSlug: activePage.slug,
            pageTitle: data.title,
            version: activePage.version + 1,
            reason: nextSpeedy.reason,
            rule: nextSpeedy.rule,
          });

          if (speedyNotice.notified && speedyNotice.discussionPageSlug) {
            const targetDiscussionSlug = speedyNotice.discussionPageSlug;
            pushToast({
              tone: 'info',
              title: 'Speedy Deletion alert sent',
              description: `Author ${activePage.authorName} was notified at :${targetDiscussionSlug}.`,
              actionLabel: 'Open discussion',
              onAction: () => navigateToPage(targetDiscussionSlug),
            });
          }
        }
      }
      hasUnsavedChangesRef.current = false;
      setHasUnsavedChanges(false);
      notifiedDirtySessionRef.current = false;
      setActiveTab('read');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update page.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickEditSave = async (data: {
    title: string;
    content: string;
    summary: string;
  }) => {
    if (!user || !activePage) return;
    setQuickEditSaving(true);
    setQuickEditError(null);
    try {
      const payload = {
        slug: activePage.slug,
        title: data.title,
        content: data.content,
        category: activePage.category,
        tags: activePage.tags,
        visibility: activePage.visibility,
        isLocked: activePage.isLocked,
        headerImageUrl: activePage.headerImageUrl ?? '',
        summary: data.summary,
      };

      if (activePage.authorId === 'builtin-editorial') {
        await createWikiPage(payload, user);
      } else {
        await updateWikiPage(activePage, payload, user, canManageActiveMeta);

        const prevSpeedy = extractSpeedyDeletionTemplate(activePage.content);
        const nextSpeedy = extractSpeedyDeletionTemplate(data.content);
        if (
          nextSpeedy &&
          !prevSpeedy &&
          !isPersonalDiscussionPage &&
          activePage.authorId !== user.uid &&
          activePage.authorId !== 'builtin-editorial' &&
          activePage.authorId !== 'lgpd-anonymized'
        ) {
          const speedyNotice = await notifyAuthorSpeedyDeletion({
            targetUid: activePage.authorId,
            targetDisplayName: activePage.authorName,
            actor: user,
            actorIsAdmin: isAdmin,
            pageSlug: activePage.slug,
            pageTitle: data.title,
            version: activePage.version + 1,
            reason: nextSpeedy.reason,
            rule: nextSpeedy.rule,
          });

          if (speedyNotice.notified && speedyNotice.discussionPageSlug) {
            const targetDiscussionSlug = speedyNotice.discussionPageSlug;
            pushToast({
              tone: 'info',
              title: 'Speedy Deletion alert sent',
              description: `Author ${activePage.authorName} was notified at :${targetDiscussionSlug}.`,
              actionLabel: 'Open discussion',
              onAction: () => navigateToPage(targetDiscussionSlug),
            });
          }
        }
      }

      setQuickEditOpen(false);
      pushToast({
        tone: 'success',
        title: 'Quick edit saved',
        description: `Published updated content for "${data.title}".`,
        meta: `:${activePage.slug} · v${
          activePage.authorId === 'builtin-editorial' ? 1 : activePage.version + 1
        }`,
        durationMs: 3200,
      });
    } catch (err) {
      setQuickEditError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setQuickEditSaving(false);
    }
  };

  const handleQuickAddCategory = async (rawCategoryName: string) => {
    if (!user || !activePage || isBlocked) return;
    const cleanName = normalizeCategoryName(rawCategoryName);
    if (!cleanName) return;

    const nextContent = upsertCategoryTagInMarkdown(activePage.content, cleanName);
    if (nextContent === activePage.content) {
      pushToast({
        tone: 'info',
        title: 'Category already attached',
        description: `"${activePage.title}" is already listed under Category:${cleanName}.`,
        durationMs: 3000,
      });
      return;
    }

    const payload = {
      slug: activePage.slug,
      title: activePage.title,
      content: nextContent,
      category: activePage.category,
      tags: activePage.tags,
      visibility: activePage.visibility,
      isLocked: activePage.isLocked,
      headerImageUrl: activePage.headerImageUrl ?? '',
      summary: `Added Wikipedia category: Category:${cleanName}`,
    };

    if (activePage.authorId === 'builtin-editorial') {
      await createWikiPage(payload, user);
    } else {
      await updateWikiPage(activePage, payload, user, canManageActiveMeta);
    }

    pushToast({
      tone: 'success',
      title: 'Category added',
      description: `Added Category:${cleanName} to "${activePage.title}".`,
      actionLabel: 'Open category',
      onAction: () => navigateToCategories(normalizeCategorySlug(cleanName)),
      durationMs: 3600,
    });
  };

  const handleRestoreRevision = async (rev: PageRevision) => {
    if (!user || !activePage) return;
    setRestoringVersion(rev.version);
    try {
      await restorePageRevision(activePage, rev, user, canManageActiveMeta);
      if (
        isAdmin &&
        activePage.lastEditorId !== user.uid &&
        activePage.lastEditorId !== 'builtin-editorial' &&
        activePage.lastEditorId !== 'lgpd-anonymized'
      ) {
        const notice = await notifyUserDiscussionPage({
          targetUid: activePage.lastEditorId,
          targetDisplayName: activePage.lastEditorName,
          actor: user,
          kind: 'edit-reverted',
          reason: `Edit v${activePage.version} replaced by administrative restore to version v${rev.version}.`,
          pageSlug: activePage.slug,
          pageTitle: activePage.title,
          version: activePage.version,
        });
        if (notice.notified && notice.discussionPageSlug) {
          const targetDiscussionSlug = notice.discussionPageSlug;
          pushToast({
            tone: 'warning',
            title: 'Notice posted to discussion page',
            description: `${activePage.lastEditorName} was notified at :${targetDiscussionSlug} about reverting revision v${activePage.version}.`,
            actionLabel: 'Open discussion',
            onAction: () => navigateToPage(targetDiscussionSlug),
          });
        }
      }
      setActiveTab('read');
    } finally {
      setRestoringVersion(null);
    }
  };

  const handleDeletePage = async () => {
    if (!activePage) return;
    const pageToDelete = activePage;
    setIsDeleting(true);
    try {
      await deleteWikiPage(pageToDelete);
      if (
        isAdmin &&
        user &&
        pageToDelete.authorId !== user.uid &&
        pageToDelete.authorId !== 'builtin-editorial' &&
        pageToDelete.authorId !== 'lgpd-anonymized' &&
        !(isUserOrDiscussionPage(pageToDelete) && pageToDelete.slug.endsWith('-discussion'))
      ) {
        const notice = await notifyUserDiscussionPage({
          targetUid: pageToDelete.authorId,
          targetDisplayName: pageToDelete.authorName,
          actor: user,
          kind: 'page-deleted',
          reason: `Page :${pageToDelete.slug} was deleted by administration.`,
          pageSlug: pageToDelete.slug,
          pageTitle: pageToDelete.title,
          version: pageToDelete.version,
        });
        if (notice.notified && notice.discussionPageSlug) {
          const targetDiscussionSlug = notice.discussionPageSlug;
          pushToast({
            tone: 'warning',
            title: 'Notice posted to discussion page',
            description: `${pageToDelete.authorName} was notified at :${targetDiscussionSlug}.`,
            actionLabel: 'Open discussion',
            onAction: () => navigateToPage(targetDiscussionSlug),
          });
        }
      }
      setConfirmDeleteOpen(false);
      if (pageIndexExt.enabled) {
        navigateToIndex('index');
      } else {
        navigateToPage('start');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCommentWithNotice = async (commentId: string) => {
    if (!activePage) return;
    const targetComment = comments.find((c) => c.id === commentId);
    await deletePageComment(activePage.slug, commentId);

    if (
      isAdmin &&
      user &&
      targetComment &&
      targetComment.authorId !== user.uid &&
      targetComment.authorId !== 'lgpd-anonymized'
    ) {
      const notice = await notifyUserDiscussionPage({
        targetUid: targetComment.authorId,
        targetDisplayName: targetComment.authorName,
        actor: user,
        kind: 'comment-removed',
        reason: `Comment removed by administration on the discussion for :${activePage.slug}.`,
        pageSlug: activePage.slug,
        pageTitle: activePage.title,
      });
      if (notice.notified && notice.discussionPageSlug) {
        const targetDiscussionSlug = notice.discussionPageSlug;
        pushToast({
          tone: 'info',
          title: 'Notice posted to discussion page',
          description: `${targetComment.authorName} was notified at :${targetDiscussionSlug}.`,
          actionLabel: 'Open discussion',
          onAction: () => navigateToPage(targetDiscussionSlug),
        });
      }
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

  const watchedSlugSet = React.useMemo(
    () => new Set(watchlistItems.map((item) => item.pageSlug)),
    [watchlistItems]
  );
  const isActivePageWatched = Boolean(activePage && watchedSlugSet.has(activePage.slug));

  const handleToggleWatchPage = async (targetPage: WikiPage) => {
    if (!watchlistExt.enabled) return;
    if (!user) {
      await handleSignIn();
      return;
    }
    if (isBlocked || watchlistBusySlug === targetPage.slug) return;
    const currentlyWatched = watchedSlugSet.has(targetPage.slug);
    setWatchlistBusySlug(targetPage.slug);
    try {
      if (currentlyWatched) {
        await removePageFromWatchlist(targetPage.slug, user.uid);
        pushToast({
          tone: 'info',
          title: 'Removed from Watchlist',
          description: `"${targetPage.title}" was removed from your profile watchlist.`,
          meta: `:${targetPage.slug}`,
          durationMs: 2800,
        });
      } else {
        await addPageToWatchlist(targetPage, user);
        pushToast({
          tone: 'success',
          title: 'Added to Watchlist',
          description: `"${targetPage.title}" is now bookmarked in your profile Watchlist.`,
          meta: `:${targetPage.slug}`,
          durationMs: 2800,
        });
      }
    } catch (err) {
      pushToast({
        tone: 'warning',
        title: 'Could not update Watchlist',
        description:
          err instanceof Error ? err.message : 'Unable to save this watchlist change.',
        meta: `:${targetPage.slug}`,
        durationMs: 4200,
      });
    } finally {
      setWatchlistBusySlug((prev) => (prev === targetPage.slug ? null : prev));
    }
  };

  const handleRemoveFromWatchlist = async (slug: string) => {
    if (!user || isBlocked || watchlistBusySlug === slug) return;
    setWatchlistBusySlug(slug);
    try {
      await removePageFromWatchlist(slug, user.uid);
    } catch (err) {
      pushToast({
        tone: 'warning',
        title: 'Could not remove from Watchlist',
        description:
          err instanceof Error ? err.message : 'Unable to remove this bookmark right now.',
        meta: `:${slug}`,
        durationMs: 4200,
      });
    } finally {
      setWatchlistBusySlug((prev) => (prev === slug ? null : prev));
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
    if (!pdfExportExt.enabled || !activePage || exportingPdf) return;
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
        title: 'PDF exported successfully',
        description: `${result.filename} (${result.pageCount} ${
          result.pageCount === 1 ? 'page' : 'pages'
        }) — ${activeTheme.name} · ${effectiveIsDark ? 'Dark' : 'Light'}`,
        meta: `:${activePage.slug}`,
        durationMs: 3600,
      });
    } catch (err) {
      pushToast({
        tone: 'warning',
        title: 'Failed to generate PDF',
        description:
          err instanceof Error
            ? err.message
            : 'Unable to export the article to PDF.',
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
        ? templatesExt.enabled
          ? expandTemplatesInWikitext(activePage.content, allPages, {
              currentSlug: activePage.slug,
              currentTitle: activePage.title,
            })
          : activePage.content
        : '',
    [activePage, allPages, templatesExt.enabled]
  );

  const toc = React.useMemo(
    () => (activePage ? extractToc(expandedActiveContent) : []),
    [activePage, expandedActiveContent]
  );

  const articleRefExtraction = React.useMemo(
    () =>
      activePage && refsExt.enabled
        ? extractArticleReferences(expandedActiveContent)
        : {
            processedMarkdown: expandedActiveContent,
            references: [],
            hasInlineReflist: false,
            inlineReflistGroups: [],
          },
    [activePage, expandedActiveContent, refsExt.enabled]
  );

  const articleReferences = articleRefExtraction.references;

  const footerArticleReferences = React.useMemo(() => {
    const inlineGroupSet = new Set(
      articleRefExtraction.inlineReflistGroups.map((g) => g.trim().toLowerCase())
    );
    return articleReferences.filter(
      (ref) => !inlineGroupSet.has((ref.group ?? '').trim().toLowerCase())
    );
  }, [articleReferences, articleRefExtraction.inlineReflistGroups]);

  const tocMinHeadings = Math.max(1, tocExt.settings.minHeadings ?? 2);
  const outlineToc = tocExt.enabled && toc.length >= tocMinHeadings ? toc : [];
  const outlineRefs =
    refsExt.enabled && refsExt.settings.showOutlineLink !== false ? articleReferences : [];
  const referencesSectionTitle = refsExt.settings.footerTitle || 'References';

  const activeCategoryLabel = activePage
    ? WIKI_CATEGORIES.find((c) => c.id === activePage.category)?.label ?? activePage.category
    : '';
  const activePageCategories = React.useMemo(
    () => (activePage ? resolvePageCategories(activePage, expandedActiveContent) : []),
    [activePage, expandedActiveContent]
  );
  const availableWikiCategoryNames = React.useMemo(
    () =>
      buildWikiCategoryDirectory(allPages, {
        enableTemplates: templatesExt.enabled,
      }).map((c) => c.name),
    [allPages, templatesExt.enabled]
  );
  const activePageCategorySlug = React.useMemo(
    () => (activePage ? getCategorySlugFromPage(activePage) : null),
    [activePage]
  );
  const activeCategorySummary = React.useMemo(() => {
    if (!activePageCategorySlug) return null;
    const directory = buildWikiCategoryDirectory(allPages, {
      enableTemplates: templatesExt.enabled,
      ensureCategorySlugs: [activePageCategorySlug],
    });
    return directory.find((c) => c.slug === activePageCategorySlug) ?? null;
  }, [activePageCategorySlug, allPages, templatesExt.enabled]);
  const activeBannerUrl =
    activePage && headerBannerExt.enabled
      ? sanitizeHeaderImageUrl(activePage.headerImageUrl)
      : '';
  const showReadingBanner =
    activeTab === 'read' &&
    Boolean(activeBannerUrl) &&
    failedBannerUrl !== activeBannerUrl;

  // Sync per-page SEO title, meta description, keywords, canonical URL, OpenGraph, Twitter, JSON-LD, and robots indexing directive
  React.useEffect(() => {
    applyDynamicSeo({
      siteTitle,
      view,
      ecosystemSubpage,
      legalSection,
      selectedCategorySlug,
      activePage,
      isBootError: !isWikiBootReady && extensionsBootStatus === 'error',
    });
  }, [
    siteTitle,
    isWikiBootReady,
    extensionsBootStatus,
    view,
    ecosystemSubpage,
    legalSection,
    selectedCategorySlug,
    activePage,
  ]);

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
            <span>Loading {siteTitle} extensions...</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Extension configurations are loaded directly from Firebase on Wiki-site startup before
            the collaborative workspace unlocks.
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
                Unable to load Wiki-site extensions
              </h1>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Firebase extensions are required when starting <strong>{siteTitle}</strong>. Because
            loading failed, the Wiki remains locked for reading and editing — except when signed in
            with a <strong>Bureaucrat</strong> account.
          </p>

          {extensionsBootError && (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f17] text-xs font-mono text-slate-700 dark:text-slate-300 break-words">
              {extensionsBootError}
            </div>
          )}

          {user && (
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
              Currently signed in as <strong>{user.displayName || user.email}</strong> (role:{' '}
              <span className="font-mono">{governanceRole}</span>). This role does not have
              Bureaucrat contingency access.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleRetryExtensionsBoot}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>Try loading again</span>
            </button>

            <button
              type="button"
              onClick={() => void handleBureaucratBypassSignIn()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {user ? 'Switch to Bureaucrat sign-in' : 'Sign in as Bureaucrat (Google)'}
              </span>
            </button>

            {user && (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="px-3 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign out
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
            {pageIndexExt.enabled && (
              <>
                <a
                  href="#/pages"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToIndex('index');
                  }}
                  className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                    view === 'index' || view === 'tags'
                      ? 'text-blue-700 dark:text-blue-400 underline underline-offset-8'
                      : ''
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
              </>
            )}
            <a
              href="#/categories"
              onClick={(e) => {
                e.preventDefault();
                navigateToCategories();
              }}
              className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                view === 'categories'
                  ? 'text-blue-700 dark:text-blue-400 underline underline-offset-8'
                  : ''
              }`}
            >
              Categories
            </a>
            {ecosystemExt.enabled && (
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
            )}
            {randomExt.enabled && randomExt.settings.showInNavbar !== false && (
              <button
                type="button"
                disabled={allPages.length === 0}
                onClick={navigateToRandomPage}
                title="Open a random article from the knowledge base"
                className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Shuffle className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                <span>Random Article</span>
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
          isCategoriesViewActive={view === 'categories'}
          isTagsViewActive={view === 'tags'}
          isSpecialViewActive={view === 'special'}
          isAllPagesViewActive={view === 'index'}
          isAppearanceViewActive={view === 'appearance'}
          isDark={effectiveIsDark}
          themePreference={themePreference}
          canToggleTheme={themeColorScheme === 'user'}
          forcedColorMode={themeColorScheme === 'user' ? undefined : themeColorScheme}
          showQuickCreate={quickCreateExt.enabled}
          showSidebarFilter={sidebarFilterExt.enabled}
          activeTagFilter={sidebarTagFilter}
          onSelectTagFilter={(tag) => setSidebarTagFilter(tag)}
          onClearTagFilter={() => setSidebarTagFilter(null)}
          showUserProfileLinks={userProfilesExt.enabled}
          showPwaInstall={pwaInstallExt.enabled}
          showWatchlist={watchlistExt.enabled}
          watchlistItems={watchlistItems}
          watchlistLoading={watchlistLoading}
          isBlocked={isBlocked}
          onWatchCurrentPage={
            view === 'page' && activePage
              ? () => void handleToggleWatchPage(activePage)
              : undefined
          }
          onRemoveWatchlistItem={(slug) => void handleRemoveFromWatchlist(slug)}
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
          onOpenEcosystem={ecosystemExt.enabled ? navigateToEcosystem : undefined}
          onOpenCategories={navigateToCategories}
          onOpenTags={() => navigateToIndex('tags')}
          onOpenSpecialPages={() => navigateToSpecialPages('categories')}
          onOpenAllPages={() =>
            pageIndexExt.enabled
              ? navigateToIndex('index')
              : navigateToSpecialPages('directory')
          }
          onOpenAppearance={navigateToAppearance}
          onOpenShortcuts={shortcutsExt.enabled ? () => setShortcutsOpen(true) : undefined}
          onSignOut={() => void handleSignOut()}
          onSignIn={() => void handleSignIn()}
          onToggleTheme={() =>
            handleChangeThemePreference(
              getNextThemePreference(themePreference, systemPrefersDark)
            )
          }
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
                    Bureaucrat contingency access — extensions failed to load on startup
                  </div>
                  <div className="text-amber-900/90 dark:text-amber-200/80">
                    Visitors and collaborators remain locked out until extensions load from Firebase
                    ({extensionsBootError || 'unknown error'}).
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
                  <span>Reload</span>
                </button>
                <button
                  type="button"
                  onClick={navigateToAdmin}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-800 text-white hover:bg-amber-900 whitespace-nowrap cursor-pointer"
                >
                  Bureaucrat Console
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
              <EcosystemProductsView
                siteTitle={siteTitle}
                subpage={ecosystemSubpage}
                onChangeSubpage={navigateToEcosystem}
                onSelectPage={navigateToPage}
                externalLinkPrefix={externalLinkConfig.prefix}
                encodeExternalLinkTarget={externalLinkConfig.encodeTargetUrl}
              />
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
                  siteTitle={siteTitle}
                  allPublicPages={allPages}
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
                  key={`create-${createPresetSlug || 'blank'}`}
                  mode="create"
                  initialSlug={createPresetSlug}
                  initialTitle={
                    createPresetSlug.startsWith('predefinicao-')
                      ? `Template:${slugToTitle(createPresetSlug.slice('predefinicao-'.length))}`
                      : createPresetSlug.startsWith('template-')
                      ? `Template:${slugToTitle(createPresetSlug.slice('template-'.length))}`
                      : isCategoryDescriptionSlug(createPresetSlug)
                      ? `Category:${formatCategoryDisplayName(getCategorySlugFromPageSlug(createPresetSlug))}`
                      : createPresetSlug
                      ? slugToTitle(createPresetSlug)
                      : ''
                  }
                  initialContent={
                    createPresetSlug.startsWith('predefinicao-') ||
                    createPresetSlug.startsWith('template-')
                      ? `<noinclude>\nDocumentation for this template. Usage: \`{{${
                          createPresetSlug.replace(/^(predefinicao-|template-)/, '')
                        }|text=...}}\`\n</noinclude>{{Notice|type=notice|title=Template|text={{{text|{{{texto|Template content.}}}}}}}}`
                      : isCategoryDescriptionSlug(createPresetSlug)
                      ? `Overview and inclusion criteria for articles belonging to **Category:${formatCategoryDisplayName(
                          getCategorySlugFromPageSlug(createPresetSlug)
                        )}**.\n\n<!-- Optional: add [[Category:Parent Category]] to make this a subcategory. -->`
                      : ''
                  }
                  initialCategory={
                    createPresetSlug.startsWith('predefinicao-') ||
                    createPresetSlug.startsWith('template-') ||
                    isCategoryDescriptionSlug(createPresetSlug)
                      ? 'reference'
                      : 'general'
                  }
                  initialTags={
                    createPresetSlug.startsWith('predefinicao-') ||
                    createPresetSlug.startsWith('template-')
                      ? TEMPLATE_PRESET_TAGS
                      : EMPTY_TAGS
                  }
                  initialVisibility="public"
                  initialIsLocked={false}
                  initialHeaderImageUrl=""
                  canManageMeta={true}
                  existingSlugs={existingSlugs}
                  wikiPages={allPages}
                  currentSlug={createPresetSlug || undefined}
                  currentUser={user}
                  isSaving={isSaving}
                  errorMessage={saveError}
                  enableHeaderBanner={headerBannerExt.enabled}
                  enableInfoboxToolbar={infoboxExt.enabled && infoboxExt.settings.allowEditorToolbar !== false}
                  enableReferencesToolbar={refsExt.enabled && refsExt.settings.allowEditorToolbar !== false}
                  enableVisualToolbar={editorToolbarExt.enabled}
                  enableTemplatesToolbar={templatesExt.enabled}
                  enableInfoboxPreview={infoboxExt.enabled}
                  enableReferencesPreview={refsExt.enabled}
                  enableTemplatesPreview={templatesExt.enabled}
                  showTocPreview={tocExt.enabled}
                  tocDefaultExpanded={tocExt.settings.defaultExpanded !== false}
                  tocMinHeadings={tocMinHeadings}
                  referencesTitle={referencesSectionTitle}
                  externalLinkPrefix={externalLinkConfig.prefix}
                  encodeExternalLinkTarget={externalLinkConfig.encodeTargetUrl}
                  onSave={handleCreateSave}
                  onCancel={() => navigateToPage('start')}
                  onNavigateSlug={navigateToPage}
                  onSelectCategory={navigateToCategories}
                  onOpenAllCategories={() => navigateToCategories()}
                  onDirtyChange={setHasUnsavedChanges}
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
          ) : view === 'categories' ? (
            <div
              data-wiki-surface="panel"
              className="max-w-5xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8"
            >
              <CategoryView
                siteTitle={siteTitle}
                selectedCategorySlug={selectedCategorySlug}
                pages={allPages}
                existingSlugs={existingSlugs}
                isSignedIn={Boolean(user)}
                isBlocked={isBlocked}
                enableInfoboxes={infoboxExt.enabled}
                enableReferences={refsExt.enabled}
                enableTemplates={templatesExt.enabled}
                referencesTitle={referencesSectionTitle}
                externalLinkPrefix={externalLinkConfig.prefix}
                encodeExternalLinkTarget={externalLinkConfig.encodeTargetUrl}
                onSelectCategory={(slug) => navigateToCategories(slug ?? undefined)}
                onSelectPage={navigateToPage}
                onCreateCategoryDescription={(descSlug) => navigateToCreate(descSlug)}
                onNewPage={() => navigateToCreate('')}
              />
            </div>
          ) : view === 'appearance' ? (
            <div
              data-wiki-surface="panel"
              className="max-w-5xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8"
            >
              <AppearanceSettingsView
                themePreference={themePreference}
                effectiveIsDark={effectiveIsDark}
                systemPrefersDark={systemPrefersDark}
                activeTheme={activeTheme}
                colorSchemePolicy={themeColorScheme}
                onChangeThemePreference={handleChangeThemePreference}
                onBackToWiki={() => navigateToPage('start')}
              />
            </div>
          ) : view === 'special' ? (
            <div
              data-wiki-surface="panel"
              className="max-w-6xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8"
            >
              <SpecialPagesHub
                siteTitle={siteTitle}
                pages={allPages}
                user={user}
                isAdmin={isAdmin}
                isBlocked={isBlocked}
                enableTemplates={templatesExt.enabled}
                enablePageIndex={pageIndexExt.enabled}
                enableRandomArticle={randomExt.enabled}
                enableEcosystem={ecosystemExt.enabled}
                initialTab={specialTab}
                initialCategorySlug={selectedCategorySlug}
                themePreference={themePreference}
                effectiveIsDark={effectiveIsDark}
                systemPrefersDark={systemPrefersDark}
                activeTheme={activeTheme}
                colorSchemePolicy={themeColorScheme}
                onChangeThemePreference={handleChangeThemePreference}
                onTabChange={(nextTab) => {
                  const nextHash = nextTab === 'categories' ? '#/special' : `#/special/${nextTab}`;
                  currentRouteHashRef.current = nextHash;
                  setSpecialTab(nextTab);
                  window.location.hash = nextHash;
                }}
                onSelectPage={navigateToPage}
                onOpenCategoryPage={(catSlug) => navigateToCategories(catSlug)}
                onOpenPageIndex={(mode) => navigateToIndex(mode)}
                onRandomPage={randomExt.enabled ? navigateToRandomPage : undefined}
                onOpenEcosystem={ecosystemExt.enabled ? () => navigateToEcosystem() : undefined}
                onOpenAdmin={isAdmin ? navigateToAdmin : undefined}
                onOpenLegal={navigateToLegal}
                onCreatePage={(presetSlug) => navigateToCreate(presetSlug ?? '')}
                onSignIn={() => void handleSignIn()}
                onNotify={(notice) =>
                  pushToast({
                    tone: notice.tone,
                    title: notice.title,
                    description: notice.description,
                    durationMs: 4200,
                  })
                }
              />
            </div>
          ) : view === 'index' || view === 'recent' || view === 'tags' ? (
            <div
              data-wiki-surface="panel"
              className="max-w-6xl bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8"
            >
              <PageIndexView
                mode={view}
                siteTitle={siteTitle}
                pages={allPages}
                isSignedIn={Boolean(user && !isBlocked)}
                user={user}
                isAdmin={isAdmin}
                isBlocked={isBlocked}
                enableZipExport={zipArchiveExt.enabled}
                onSelectPage={navigateToPage}
                onOpenCategories={navigateToCategories}
                onNewPage={() => navigateToCreate('')}
                onSignIn={() => void handleSignIn()}
                onNotify={(notice) =>
                  pushToast({
                    tone: notice.tone,
                    title: notice.title,
                    description: notice.description,
                    durationMs: 4200,
                  })
                }
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
                {showReadingBanner && activePage && (
                  <figure className="-mx-6 -mt-6 sm:-mx-8 sm:-mt-8 overflow-hidden rounded-t-xl border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                    <img
                      src={activeBannerUrl}
                      alt={`${activePage.title} header banner`}
                      loading="eager"
                      onError={() => setFailedBannerUrl(activeBannerUrl)}
                      className="w-full h-44 sm:h-56 md:h-64 object-cover object-center block"
                    />
                  </figure>
                )}

                {/* Page Header & Clean Unboxed Metadata */}
                <div className="space-y-3 pb-5 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="font-mono flex flex-wrap items-center gap-1">
                      <span>wiki</span>
                      <span>/</span>
                      <button
                        type="button"
                        onClick={() => navigateToCategories(activePage.category)}
                        title={`Browse Category:${activeCategoryLabel}`}
                        className="text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {activeCategoryLabel.toLowerCase()}
                      </button>
                      <span>/</span>
                      <span>:{activePage.slug}</span>
                    </div>
                    {pageMetadataExt.enabled && (
                      <div className="font-mono tabular-nums">
                        v{activePage.version} ·{' '}
                        {activePage.visibility === 'private' ? 'Private' : 'Public'}
                        {activePage.isLocked ? ' · Locked' : ''}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <h1 className="font-display text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
                      {activePage.title}
                    </h1>

                    <div
                      data-wiki-chrome="edit-tools"
                      className="print:hidden flex flex-wrap items-center gap-2 shrink-0"
                    >
                      {activeTab === 'read' && !isPrintView && (
                        <button
                          type="button"
                          disabled={Boolean(user && !canEditActivePage)}
                          onClick={() => {
                            if (!user) {
                              void handleSignIn();
                              return;
                            }
                            if (canEditActivePage) {
                              setQuickEditError(null);
                              setQuickEditOpen(true);
                            }
                          }}
                          title={
                            !user
                              ? 'Sign in with Google to quick-edit this page'
                              : isBlocked
                              ? 'Your account is currently blocked from editing'
                              : !canEditActivePage
                              ? isActiveUserOrDiscussionPage
                                ? 'Only the page owner or an administrator can edit user and discussion pages'
                                : 'This page is locked by the author'
                              : 'Open quick editor modal without leaving this view'
                          }
                          data-wiki-surface="accent"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                          {user &&
                          (activePage.isLocked || isActiveUserOrDiscussionPage || isBlocked) &&
                          !canEditActivePage ? (
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>Quick Edit</span>
                        </button>
                      )}

                      {watchlistExt.enabled && (
                        <button
                          type="button"
                          aria-pressed={isActivePageWatched}
                          disabled={Boolean(
                            user && (isBlocked || watchlistBusySlug === activePage.slug)
                          )}
                          onClick={() => void handleToggleWatchPage(activePage)}
                          title={
                            !user
                              ? 'Sign in with Google to add this article to your Watchlist'
                              : isActivePageWatched
                              ? 'Remove this article from your profile Watchlist'
                              : 'Bookmark this article in your profile Watchlist'
                          }
                          aria-label={
                            isActivePageWatched
                              ? 'Remove article from Watchlist'
                              : 'Watch article in profile Watchlist'
                          }
                          data-wiki-surface={isActivePageWatched ? 'accent' : 'inset'}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                            isActivePageWatched
                              ? 'border-blue-700 bg-blue-700 text-white hover:bg-blue-800'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {watchlistBusySlug === activePage.slug ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          ) : isActivePageWatched ? (
                            <BookmarkCheck className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{isActivePageWatched ? 'Watching' : 'Watch'}</span>
                        </button>
                      )}

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

                      {pdfExportExt.enabled && (
                        <button
                          type="button"
                          disabled={exportingPdf}
                          onClick={() => void handleExportPdf()}
                          title={`Export article as PDF (${activeTheme.name} · ${
                            effectiveIsDark ? 'Dark' : 'Light'
                          })`}
                          aria-label="Export article content as PDF"
                          data-wiki-surface="inset"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                          {exportingPdf ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          ) : (
                            <FileDown className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{exportingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
                        </button>
                      )}

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

                  {pageMetadataExt.enabled && (
                    <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>Created by {activePage.authorName}</span>
                        <span aria-hidden="true">·</span>
                        <span>Last edited {formatRelativeTime(activePage.updatedAt)}</span>
                        {activeRecentEditors.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5"
                              title="Last three distinct editors (most recent first)"
                            >
                              <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                              <span>
                                {activeRecentEditors.length === 1
                                  ? 'Last editor:'
                                  : `Last ${activeRecentEditors.length} editors:`}
                              </span>
                              <span className="inline-flex flex-wrap items-center gap-x-1">
                                {activeRecentEditors.map((editor, index) => {
                                  const canNavigateProfile =
                                    userProfilesExt.enabled &&
                                    editor.uid !== 'builtin-editorial' &&
                                    editor.uid !== 'lgpd-anonymized';
                                  const isMostRecent = index === 0;
                                  return (
                                    <React.Fragment key={`${editor.uid}-${index}`}>
                                      {canNavigateProfile ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            navigateToPage(
                                              buildPersonalSlugs(editor.name, editor.uid)
                                                .personalPageSlug
                                            )
                                          }
                                          title={
                                            isMostRecent
                                              ? `Most recent editor · Open ${editor.name}'s collaborator page`
                                              : `Open ${editor.name}'s collaborator page`
                                          }
                                          className={`hover:text-blue-700 dark:hover:text-blue-400 hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded-xs ${
                                            isMostRecent
                                              ? 'font-medium text-slate-700 dark:text-slate-200'
                                              : 'text-slate-600 dark:text-slate-300'
                                          }`}
                                        >
                                          {editor.name}
                                        </button>
                                      ) : (
                                        <span
                                          className={
                                            isMostRecent
                                              ? 'font-medium text-slate-700 dark:text-slate-200'
                                              : 'text-slate-600 dark:text-slate-300'
                                          }
                                        >
                                          {editor.name}
                                        </span>
                                      )}
                                      {index < activeRecentEditors.length - 1 && (
                                        <span
                                          aria-hidden="true"
                                          className="text-slate-400 dark:text-slate-500"
                                        >
                                          ,
                                        </span>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </span>
                            </span>
                          </>
                        )}
                        {activePage.tags.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            {sidebarFilterExt.enabled ? (
                              <span
                                role="group"
                                aria-label="Filter sidebar by page tag"
                                className="inline-flex flex-wrap items-center gap-1.5 font-mono"
                              >
                                {activePage.tags.map((t) => {
                                  const isSelected =
                                    sidebarTagFilter !== null &&
                                    sidebarTagFilter.toLowerCase() === t.toLowerCase();
                                  return (
                                    <button
                                      key={t}
                                      type="button"
                                      aria-pressed={isSelected}
                                      onClick={() => handleFilterByTag(t)}
                                      title={
                                        isSelected
                                          ? `Clear tag filter #${t}`
                                          : `Filter sidebar pages by #${t}`
                                      }
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-xs font-mono transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                                        isSelected
                                          ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-semibold'
                                          : 'border-transparent text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400'
                                      }`}
                                    >
                                      #{t}
                                    </button>
                                  );
                                })}
                              </span>
                            ) : (
                              <span className="font-mono text-slate-600 dark:text-slate-300">
                                {activePage.tags.map((t) => `#${t}`).join('  ')}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Wikidot Action Tabs */}
                  <div
                    data-wiki-chrome="edit-tools"
                    className="flex flex-wrap items-center justify-between gap-3 pt-2 print:hidden"
                  >
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
                    <button
                      type="button"
                      onClick={() => requestTabChange('read')}
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

                    {historyExt.enabled && (
                      <button
                        type="button"
                        onClick={() => requestTabChange('history')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          activeTab === 'history'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                        }`}
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>History</span>
                      </button>
                    )}

                    {canViewDiscussion && (
                      <button
                        type="button"
                        onClick={() => requestTabChange('comments')}
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

                    {sourceExt.enabled && (
                      <button
                        type="button"
                        onClick={() => requestTabChange('source')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          activeTab === 'source'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Source</span>
                      </button>
                    )}
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
                      !isPrintView &&
                      pageOutlineExt.enabled &&
                      (outlineToc.length > 0 || outlineRefs.length > 0)
                        ? 'xl:col-span-9'
                        : 'xl:col-span-12'
                    }
                  >
                    {userProfilesExt.enabled && (isPersonalProfilePage || isPersonalDiscussionPage) && (
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
                            externalLinkPrefix={externalLinkConfig.prefix}
                            encodeExternalLinkTarget={externalLinkConfig.encodeTargetUrl}
                          />
                        )}

                      <ArticleViewer
                        content={activePage.content}
                        existingSlugs={existingSlugs}
                        wikiPages={allPages}
                        currentSlug={activePage.slug}
                        currentTitle={activePage.title}
                        onNavigateSlug={navigateToPage}
                        onSelectCategory={navigateToCategories}
                        onOpenAllCategories={() => navigateToCategories()}
                        showToc={tocExt.enabled}
                        tocDefaultExpanded={tocExt.settings.defaultExpanded !== false}
                        tocMinHeadings={tocMinHeadings}
                        enableReferences={refsExt.enabled}
                        referencesTitle={referencesSectionTitle}
                        enableInfoboxes={infoboxExt.enabled}
                        enableTemplates={templatesExt.enabled}
                        showReferencesFooter={false}
                        externalLinkPrefix={externalLinkConfig.prefix}
                        encodeExternalLinkTarget={externalLinkConfig.encodeTargetUrl}
                      />
                    </div>

                    {refsExt.enabled && footerArticleReferences.length > 0 && (
                      <ReferencesFooter
                        references={footerArticleReferences}
                        title={referencesSectionTitle}
                        existingSlugs={existingSlugs}
                        onNavigateSlug={navigateToPage}
                        externalLinkPrefix={externalLinkConfig.prefix}
                        encodeExternalLinkTarget={externalLinkConfig.encodeTargetUrl}
                      />
                    )}

                    {activeCategorySummary && (
                      <div className="mt-7 pt-6 border-t border-slate-200 dark:border-slate-800">
                        <CategoryMembersSection
                          displayName={activeCategorySummary.name}
                          categorySlug={activeCategorySummary.slug}
                          pages={activeCategorySummary.pages}
                          subcategories={activeCategorySummary.subcategories}
                          onSelectPage={navigateToPage}
                          onSelectCategory={(slug) => navigateToCategories(slug)}
                          onOpenAllCategories={() => navigateToCategories()}
                        />
                      </div>
                    )}

                    <CategoriesFooter
                      categories={activePageCategories}
                      availableCategoryNames={availableWikiCategoryNames}
                      canQuickAdd={canEditActivePage}
                      onSelectCategory={navigateToCategories}
                      onOpenAllCategories={() => navigateToCategories()}
                      onQuickAddCategory={handleQuickAddCategory}
                    />

                    {ratingsExt.enabled && (
                      <PageRatingPanel
                        pageSlug={activePage.slug}
                        ratings={ratings}
                        currentUserId={user?.uid ?? null}
                        isSignedIn={Boolean(user)}
                        isBlocked={isBlocked}
                        onRate={async (score) => {
                          if (!user || isBlocked) return;
                          await upsertPageRating(activePage, score, user);
                        }}
                        onRemoveRating={async () => {
                          if (!user || isBlocked) return;
                          await deletePageRating(activePage.slug, user.uid);
                        }}
                        onSignIn={() => void handleSignIn()}
                      />
                    )}

                    {userProfilesExt.enabled && isPersonalProfilePage && (
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

                    {watchlistExt.enabled &&
                      user &&
                      isPersonalProfilePage &&
                      activePage.authorId === user.uid && (
                        <WatchlistProfilePanel
                          authorName={activePage.authorName}
                          watchlistItems={watchlistItems}
                          allPages={allPages}
                          isBlocked={isBlocked}
                          onSelectPage={navigateToPage}
                          onRemoveFromWatchlist={handleRemoveFromWatchlist}
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
                          onDeleteComment={handleDeleteCommentWithNotice}
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
                          {!userProfilesExt.enabled || activePage.lastEditorId === 'builtin-editorial' ? (
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
                          href={applyExternalLinkPrefix(
                            'https://creativecommons.org/licenses/by-sa/4.0/',
                            externalLinkConfig.prefix,
                            externalLinkConfig.encodeTargetUrl
                          )}
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

                  {pageOutlineExt.enabled && (outlineToc.length > 0 || outlineRefs.length > 0) && (
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
                              item.level <= 2 ? 'pl-0 font-medium' : 'pl-3'
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
                  key={`edit-${activePage.slug}`}
                  mode="edit"
                  initialSlug={activePage.slug}
                  initialTitle={activePage.title}
                  initialContent={activePage.content}
                  initialCategory={activePage.category}
                  initialTags={activePage.tags}
                  initialVisibility={activePage.visibility}
                  initialIsLocked={activePage.isLocked}
                  initialHeaderImageUrl={activePage.headerImageUrl ?? ''}
                  canManageMeta={canManageActiveMeta}
                  existingSlugs={existingSlugs}
                  wikiPages={allPages}
                  currentSlug={activePage.slug}
                  currentUser={user}
                  isSaving={isSaving}
                  errorMessage={saveError}
                  enableHeaderBanner={headerBannerExt.enabled}
                  enableInfoboxToolbar={infoboxExt.enabled && infoboxExt.settings.allowEditorToolbar !== false}
                  enableReferencesToolbar={refsExt.enabled && refsExt.settings.allowEditorToolbar !== false}
                  enableVisualToolbar={editorToolbarExt.enabled}
                  enableTemplatesToolbar={templatesExt.enabled}
                  enableInfoboxPreview={infoboxExt.enabled}
                  enableReferencesPreview={refsExt.enabled}
                  enableTemplatesPreview={templatesExt.enabled}
                  showTocPreview={tocExt.enabled}
                  tocDefaultExpanded={tocExt.settings.defaultExpanded !== false}
                  tocMinHeadings={tocMinHeadings}
                  referencesTitle={referencesSectionTitle}
                  externalLinkPrefix={externalLinkConfig.prefix}
                  encodeExternalLinkTarget={externalLinkConfig.encodeTargetUrl}
                  isAdminEditingOtherPage={
                    isAdmin &&
                    activePage.authorId !== 'builtin-editorial' &&
                    !isPersonalDiscussionPage &&
                    (activePage.lastEditorId !== user.uid || activePage.authorId !== user.uid)
                  }
                  targetEditorDisplayName={
                    activePage.lastEditorId !== user.uid
                      ? activePage.lastEditorName
                      : activePage.authorName
                  }
                  onSave={handleEditSave}
                  onCancel={() => requestTabChange('read')}
                  onNavigateSlug={navigateToPage}
                  onSelectCategory={navigateToCategories}
                  onOpenAllCategories={() => navigateToCategories()}
                  onDirtyChange={setHasUnsavedChanges}
                />
              )}

              {historyExt.enabled && activeTab === 'history' && (
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
                  onDeleteComment={handleDeleteCommentWithNotice}
                  onSignIn={() => void handleSignIn()}
                />
              )}

              {sourceExt.enabled && activeTab === 'source' && (
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
                  href={applyExternalLinkPrefix(
                    'https://creativecommons.org/licenses/by-sa/4.0/',
                    externalLinkConfig.prefix,
                    externalLinkConfig.encodeTargetUrl
                  )}
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
                This site belongs to the{' '}
                <a
                  href={applyExternalLinkPrefix(
                    LEGAL_GOVERNANCE.ecosystemUrl,
                    externalLinkConfig.prefix,
                    externalLinkConfig.encodeTargetUrl
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-wiki-surface="link"
                  className="font-medium text-blue-700 dark:text-blue-400 hover:underline"
                >
                  {LEGAL_GOVERNANCE.ecosystemDomain}
                </a>{' '}
                ecosystem, a <strong className="font-semibold text-slate-800 dark:text-slate-100">WazzimaGiygg</strong> project. Discover the truth about Wikipedia controversies at:{' '}
                <a
                  href={applyExternalLinkPrefix(
                    LEGAL_GOVERNANCE.truthPortalUrl,
                    externalLinkConfig.prefix,
                    externalLinkConfig.encodeTargetUrl
                  )}
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
              {ecosystemExt.enabled && (
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
              )}
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
            {footerBadgesExt.enabled && (
              <FooterBadges
                siteTitle={siteTitle}
                showWikiomiteBadge={activeTheme.id === 'wikidiota'}
                externalLinkPrefix={externalLinkConfig.prefix}
                encodeExternalLinkTarget={externalLinkConfig.encodeTargetUrl}
                onNavigateHome={() => navigateToPage('start')}
                onNavigateLegal={() => navigateToLegal('privacy')}
                onNavigateDossier={() => navigateToPage(DOSSIER_PAGE_SLUG)}
              />
            )}
          </div>
        </div>
      </footer>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {pendingLeaveAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-leave-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[2px]"
          onClick={() => setPendingLeaveAction(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1623] shadow-xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2
                  id="unsaved-leave-modal-title"
                  className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
                >
                  Leave without saving changes?
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  This article has been modified. If you leave without saving, all changes made
                  during this editing session will be lost.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPendingLeaveAction(null)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Continue editing
              </button>
              <button
                type="button"
                onClick={confirmLeaveWithoutSaving}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors cursor-pointer"
              >
                Leave and discard changes
              </button>
            </div>
          </div>
        </div>
      )}
      {view === 'page' && activePage && user && canEditActivePage && (
        <QuickEditModal
          isOpen={quickEditOpen}
          page={activePage}
          existingSlugs={existingSlugs}
          wikiPages={allPages}
          isSaving={quickEditSaving}
          errorMessage={quickEditError}
          enableInfoboxPreview={infoboxExt.enabled}
          enableReferencesPreview={refsExt.enabled}
          enableTemplatesPreview={templatesExt.enabled}
          referencesTitle={referencesSectionTitle}
          externalLinkPrefix={externalLinkConfig.prefix}
          encodeExternalLinkTarget={externalLinkConfig.encodeTargetUrl}
          onSave={handleQuickEditSave}
          onClose={() => {
            setQuickEditOpen(false);
            setQuickEditError(null);
          }}
          onNavigateSlug={navigateToPage}
        />
      )}
      {shortcutsExt.enabled && (
        <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      )}
      {privacyBannerExt.enabled && (
        <PrivacyNoticeBanner onOpenPrivacy={() => navigateToLegal('privacy')} />
      )}

      {backToTopExt.enabled && showBackToTop && (
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
            Iframe embedding not permitted
          </h1>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          For security and clickjacking protection,{' '}
          <strong>WazzimaGiygg Maker</strong> cannot be embedded in third-party iframes; only direct
          access or an authorized Google AI Studio environment is allowed.
        </p>
        <div className="pt-1">
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap"
          >
            Open site directly
          </a>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const frameCheck = React.useMemo(() => evaluateFrameContext(), []);
  const chatbotCheck = React.useMemo(() => evaluateChatbotClientContext(), []);

  if (chatbotCheck.blocked) {
    return <ChatbotBlockedScreen detection={chatbotCheck} />;
  }

  if (!frameCheck.allowed) {
    return <BlockedEmbedScreen />;
  }

  return (
    <ErrorBoundary>
      <WikiWorkspace />
    </ErrorBoundary>
  );
}
