import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  type ResolvedWikiExtension,
  VALIDATION_LIMITS,
  type WikiColorSchemePolicy,
  type WikiExtensionCategory,
  type WikiExtensionId,
  type WikiExtensionRecord,
  type WikiExtensionSettings,
} from '../types/wiki';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  DEFAULT_WIKI_THEME_ID,
  getWikiThemeById,
  isRegisteredWikiThemeId,
  WIKI_THEMES,
  type WikiThemeDefinition,
} from './wikiThemes';

export const DEFAULT_SITE_TITLE = 'WazzimaGiygg Maker';
export const DEFAULT_EXTERNAL_LINK_PREFIX = 'https://wazzimagiygg.com/rv/?uid=';

export const EXTENSION_CATEGORY_LABELS: Record<WikiExtensionCategory, string> = {
  appearance: 'Appearance & Themes',
  reading: 'Reading',
  navigation: 'Navigation',
  authoring: 'Markdown Authoring',
  collaboration: 'Collaboration',
};

export interface ExtensionSettingSelectOption {
  value: string;
  label: string;
  hint?: string;
  editionLabel?: string;
  typographyLabel?: string;
  lightSwatches?: [string, string, string];
  darkSwatches?: [string, string, string];
}

export interface ExtensionSettingFieldDescriptor {
  key: keyof WikiExtensionSettings;
  label: string;
  hint: string;
  type: 'boolean' | 'number' | 'text' | 'select';
  min?: number;
  max?: number;
  maxLength?: number;
  options?: ExtensionSettingSelectOption[];
}

export const EXTENSION_SETTING_DESCRIPTORS: Record<
  WikiExtensionId,
  ExtensionSettingFieldDescriptor[]
> = {
  'site-title': [
    {
      key: 'siteTitle',
      label: 'Wiki-site Title',
      hint: 'Replaces "WazzimaGiygg Maker" in the top bar, browser tab titles, and footer.',
      type: 'text',
      maxLength: VALIDATION_LIMITS.EXTENSION_SITE_TITLE_MAX_LENGTH,
    },
  ],
  'site-theme': [
    {
      key: 'themeId',
      label: 'Wiki-site Visual Theme',
      hint: 'Sets the color palette, surfaces, and typography applied across the site and exported PDFs. New themes added in updates appear here automatically.',
      type: 'select',
      options: WIKI_THEMES.map((theme) => ({
        value: theme.id,
        label: theme.name,
        hint: theme.tagline,
        editionLabel: theme.editionLabel,
        typographyLabel: theme.typographyLabel,
        lightSwatches: theme.lightSwatches,
        darkSwatches: theme.darkSwatches,
      })),
    },
    {
      key: 'colorScheme',
      label: 'Light / Dark Mode Policy',
      hint: 'Lets each reader toggle freely or enforces a site-wide color scheme set by bureaucracy.',
      type: 'select',
      options: [
        {
          value: 'user',
          label: 'Reader choice (default)',
          hint: 'Visitors can freely switch between Light mode and Dark mode in the sidebar.',
        },
        {
          value: 'light',
          label: 'Force Light mode',
          hint: 'Keeps the entire Wiki-site in light mode within the selected theme.',
        },
        {
          value: 'dark',
          label: 'Force Dark mode',
          hint: 'Keeps the entire Wiki-site in dark mode within the selected theme.',
        },
      ],
    },
  ],
  toc: [
    {
      key: 'defaultExpanded',
      label: 'Start Table of Contents expanded',
      hint: 'Controls whether the TOC box starts expanded when loading an article.',
      type: 'boolean',
    },
    {
      key: 'minHeadings',
      label: 'Minimum sections (H2–H3)',
      hint: 'Minimum number of H2 and H3 headings required before showing the Table of Contents.',
      type: 'number',
      min: VALIDATION_LIMITS.EXTENSION_MIN_HEADINGS_MIN,
      max: VALIDATION_LIMITS.EXTENSION_MIN_HEADINGS_MAX,
    },
  ],
  references: [
    {
      key: 'footerTitle',
      label: 'References section heading',
      hint: 'Heading displayed in the automatic bibliographic references footer.',
      type: 'text',
      maxLength: VALIDATION_LIMITS.EXTENSION_FOOTER_TITLE_MAX_LENGTH,
    },
    {
      key: 'showOutlineLink',
      label: 'Sidebar outline shortcut',
      hint: 'Adds the References entry to the "On this page" outline.',
      type: 'boolean',
    },
    {
      key: 'allowEditorToolbar',
      label: '<ref> button in editor',
      hint: 'Shows the bibliographic citation shortcut in the Markdown editor toolbar.',
      type: 'boolean',
    },
  ],
  infoboxes: [
    {
      key: 'allowEditorToolbar',
      label: 'Infobox builder in editor',
      hint: 'Shows the :::infobox builder button and modal in the editor.',
      type: 'boolean',
    },
    {
      key: 'allowAutoProfileCard',
      label: 'Automatic profile card',
      hint: 'Generates an automatic sidebar Infobox on personal pages without a manual Infobox.',
      type: 'boolean',
    },
  ],
  'reading-progress': [],
  'print-view': [
    {
      key: 'showInHeader',
      label: 'Print button in header',
      hint: 'Shows the clean print-view toggle in article headers.',
      type: 'boolean',
    },
    {
      key: 'autoExitOnNavigate',
      label: 'Exit print mode on navigate',
      hint: 'Automatically disables print view when opening another page.',
      type: 'boolean',
    },
  ],
  'random-article': [
    {
      key: 'showInNavbar',
      label: 'Show in top bar',
      hint: 'Displays the "Random article" button in the main navigation header.',
      type: 'boolean',
    },
    {
      key: 'showInSidebar',
      label: 'Show in sidebar',
      hint: 'Displays the "Random article" button below the search box in the sidebar.',
      type: 'boolean',
    },
    {
      key: 'excludeDiscussions',
      label: 'Exclude discussion pages',
      hint: 'Skips -discussion talk pages when picking a random article.',
      type: 'boolean',
    },
  ],
  'copy-link': [
    {
      key: 'showInHeader',
      label: 'Copy Link button in header',
      hint: 'Displays the quick direct-URL copy button at the top of each article.',
      type: 'boolean',
    },
    {
      key: 'showToastFeedback',
      label: 'Toast confirmation',
      hint: 'Shows a toast notification confirming the link was copied.',
      type: 'boolean',
    },
  ],
  'realtime-toasts': [
    {
      key: 'notifyWhileEditing',
      label: 'Alert while actively editing',
      hint: 'Displays a warning toast when another collaborator saves while you are editing.',
      type: 'boolean',
    },
  ],
  'page-discussion': [
    {
      key: 'allowAnonymousRead',
      label: 'Public discussion reading',
      hint: 'Allows unauthenticated visitors to view the Discussion tab.',
      type: 'boolean',
    },
  ],
  'external-link-prefix': [
    {
      key: 'externalLinkPrefix',
      label: 'Parameter / prefix before external links',
      hint: 'Prepended immediately before external links (http:// or https://). Default: https://wazzimagiygg.com/rv/?uid=',
      type: 'text',
      maxLength: VALIDATION_LIMITS.EXTENSION_EXTERNAL_LINK_PREFIX_MAX_LENGTH,
    },
    {
      key: 'encodeTargetUrl',
      label: 'Encode target URL (encodeURIComponent)',
      hint: 'When enabled, URL-encodes the target address before appending it to the prefix; disabled by default for direct prepending.',
      type: 'boolean',
    },
  ],
  'article-ratings': [],
  'page-history': [],
  'page-source': [],
  'pdf-export': [],
  'zip-archive': [],
  'wiki-templates': [],
  'editor-toolbar': [],
  'ecosystem-portal': [],
  'quick-create': [],
  'sidebar-filter': [],
  'user-profiles': [],
  'pwa-install': [],
  'keyboard-shortcuts': [],
  'back-to-top': [],
  'footer-badges': [],
  'page-outline': [],
  'page-metadata': [],
  'page-index-views': [],
  'privacy-banner': [],
  'page-header-banner': [],
  watchlist: [],
};

export const DEFAULT_WIKI_EXTENSIONS: ResolvedWikiExtension[] = [
  {
    id: 'site-title',
    scope: 'site',
    name: 'Wiki-site Title (Site Branding)',
    description:
      'Allows renaming the main Wiki-site title (default: "WazzimaGiygg Maker") displayed in the header, browser tab, and metadata.',
    category: 'navigation',
    enabled: true,
    sortOrder: 0,
    settings: {
      siteTitle: DEFAULT_SITE_TITLE,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'site-theme',
    scope: 'site',
    name: 'Appearance & Visual Theme',
    description:
      'Changes the global Wiki-site appearance across the built-in theme catalog, synchronizing reading view, progress bar, and PDF export.',
    category: 'appearance',
    enabled: true,
    sortOrder: 1,
    settings: {
      themeId: DEFAULT_WIKI_THEME_ID,
      colorScheme: 'user',
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'toc',
    scope: 'site',
    name: 'Automatic Table of Contents (TOC)',
    description:
      'Automatically extracts H2 and H3 headings from the article to build the navigable Table of Contents and sidebar outline.',
    category: 'reading',
    enabled: true,
    sortOrder: 2,
    settings: {
      defaultExpanded: true,
      minHeadings: 2,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'references',
    scope: 'site',
    name: 'Bibliographic References (<ref>)',
    description:
      'Converts <ref> tags into numbered citations [1] with bidirectional jump links and an automatic references footer.',
    category: 'authoring',
    enabled: true,
    sortOrder: 3,
    settings: {
      footerTitle: 'References',
      showOutlineLink: true,
      allowEditorToolbar: true,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'infoboxes',
    scope: 'site',
    name: 'Infobox Cards (:::infobox)',
    description:
      'Supports encyclopedia-style structured cards via :::infobox blocks and automatic user profile cards.',
    category: 'authoring',
    enabled: true,
    sortOrder: 4,
    settings: {
      allowEditorToolbar: true,
      allowAutoProfileCard: true,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'reading-progress',
    scope: 'site',
    name: 'Reading Progress Bar',
    description:
      'Displays a continuous indicator below the navigation bar tracking scroll progress through the current article.',
    category: 'reading',
    enabled: true,
    sortOrder: 5,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'print-view',
    scope: 'site',
    name: 'Print View & PDF Mode',
    description:
      'Adds the Print toggle that renders a clean CSS sheet without sidebars, editing chrome, or toast popups.',
    category: 'reading',
    enabled: true,
    sortOrder: 6,
    settings: {
      showInHeader: true,
      autoExitOnNavigate: true,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'random-article',
    scope: 'site',
    name: 'Random Article',
    description:
      'Provides the "Random article" button for quick discovery across pages in the knowledge base.',
    category: 'navigation',
    enabled: true,
    sortOrder: 7,
    settings: {
      showInNavbar: true,
      showInSidebar: true,
      excludeDiscussions: true,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'copy-link',
    scope: 'site',
    name: 'Copy Page Link',
    description:
      'Enables the Copy Link button in article headers for one-click direct URL copying with toast confirmation.',
    category: 'navigation',
    enabled: true,
    sortOrder: 8,
    settings: {
      showInHeader: true,
      showToastFeedback: true,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'realtime-toasts',
    scope: 'site',
    name: 'Real-Time Notifications',
    description:
      'Notifies readers via toast when another collaborator publishes changes to the currently open Firestore article.',
    category: 'collaboration',
    enabled: true,
    sortOrder: 9,
    settings: {
      notifyWhileEditing: true,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'page-discussion',
    scope: 'site',
    name: 'Discussion & Comments',
    description:
      'Enables the Discussion tab and collaborative comment threads on every wiki article.',
    category: 'collaboration',
    enabled: true,
    sortOrder: 10,
    settings: {
      allowAnonymousRead: true,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'external-link-prefix',
    scope: 'site',
    name: 'External Link Prefix (Outlink Parameter)',
    description:
      'Prepends a configurable redirect or tracking parameter before all external links (default: "https://wazzimagiygg.com/rv/?uid=").',
    category: 'navigation',
    enabled: true,
    sortOrder: 11,
    settings: {
      externalLinkPrefix: DEFAULT_EXTERNAL_LINK_PREFIX,
      encodeTargetUrl: false,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'article-ratings',
    scope: 'site',
    name: 'Star Ratings (1–5)',
    description:
      'Displays the 1-to-5 star rating panel at the bottom of articles and stores votes in the ratings subcollection.',
    category: 'collaboration',
    enabled: true,
    sortOrder: 12,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'page-history',
    scope: 'site',
    name: 'Revision History & Restore',
    description:
      'Enables the History tab with a timeline of saved revisions, version comparison, and rollback restoration.',
    category: 'collaboration',
    enabled: true,
    sortOrder: 13,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'page-source',
    scope: 'site',
    name: 'Markdown Source View',
    description:
      'Enables the Source tab on articles to inspect raw Markdown wikitext, copy it, or download the .md file.',
    category: 'authoring',
    enabled: true,
    sortOrder: 14,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'pdf-export',
    scope: 'site',
    name: 'Article PDF Export',
    description:
      'Provides the Export PDF button in article headers to generate a paginated document styled with the active theme.',
    category: 'reading',
    enabled: true,
    sortOrder: 15,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'zip-archive',
    scope: 'site',
    name: 'Bulk Export (ZIP Archive)',
    description:
      'Enables the Export Public ZIP button in the page directory and admin console to download Markdown archives.',
    category: 'reading',
    enabled: true,
    sortOrder: 16,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'wiki-templates',
    scope: 'site',
    name: 'MediaWiki Templates ({{...}})',
    description:
      'Expands {{Template}} transclusions and blocks on read and enables the Templates picker (Ctrl+Shift+T) in the editor.',
    category: 'authoring',
    enabled: true,
    sortOrder: 17,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'editor-toolbar',
    scope: 'site',
    name: 'Visual Formatting Toolbar',
    description:
      'Displays quick-formatting controls (bold, italic, headings, links, lists, quotes, and tables) in the Markdown editor.',
    category: 'authoring',
    enabled: true,
    sortOrder: 18,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'ecosystem-portal',
    scope: 'site',
    name: 'WazzimaGiygg Ecosystem Portal',
    description:
      'Displays navigation links and the dedicated view for the WazzimaGiygg service ecosystem and public dossier.',
    category: 'navigation',
    enabled: true,
    sortOrder: 19,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'quick-create',
    scope: 'site',
    name: 'Sidebar Quick Create by Slug',
    description:
      'Displays the Quick create by slug form in the sidebar to open or create articles directly by identifier.',
    category: 'navigation',
    enabled: true,
    sortOrder: 20,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'sidebar-filter',
    scope: 'site',
    name: 'Sidebar Search Filter',
    description:
      'Enables the instant Filter pages search input in the sidebar to filter articles by title, slug, or tags.',
    category: 'navigation',
    enabled: true,
    sortOrder: 21,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'user-profiles',
    scope: 'site',
    name: 'Personal Pages & Edit History',
    description:
      'Enables My Page and Discussion shortcuts in the sidebar, collaborator edit logs, and profile links in footers.',
    category: 'collaboration',
    enabled: true,
    sortOrder: 22,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'pwa-install',
    scope: 'site',
    name: 'PWA Install & Offline App',
    description:
      'Shows the Progressive Web App (PWA) install button in the sidebar to use the wiki as an installed app.',
    category: 'appearance',
    enabled: true,
    sortOrder: 23,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'keyboard-shortcuts',
    scope: 'site',
    name: 'Global Keyboard Shortcuts (?)',
    description:
      'Enables global shortcuts (Ctrl+E, Ctrl+K, Alt+N, ?), the Shortcuts button, and the quick reference modal.',
    category: 'navigation',
    enabled: true,
    sortOrder: 24,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'back-to-top',
    scope: 'site',
    name: 'Floating Back to Top Button',
    description:
      'Displays a floating button to jump back to the top when scrolling long pages in the wiki.',
    category: 'reading',
    enabled: true,
    sortOrder: 25,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'footer-badges',
    scope: 'site',
    name: 'Retro 88x31 Footer Badges',
    description:
      'Renders the 88x31 retro badge strip in the global footer with support, licensing, Firebase, and compliance links.',
    category: 'appearance',
    enabled: true,
    sortOrder: 26,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'page-outline',
    scope: 'site',
    name: 'Sticky Page Outline (On this page)',
    description:
      'Displays the fixed "On this page" sidebar column following article scrolling with quick section links.',
    category: 'reading',
    enabled: true,
    sortOrder: 27,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'page-metadata',
    scope: 'site',
    name: 'Authorship & Tag Metadata',
    description:
      'Shows the version, visibility, author, last 3 editors, relative timestamp, and #tags strip in the article header.',
    category: 'reading',
    enabled: true,
    sortOrder: 28,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'page-index-views',
    scope: 'site',
    name: 'Pages & Recent Changes Directory',
    description:
      'Keeps the full Pages directory and Recent Changes feed visible in the top navigation bar.',
    category: 'navigation',
    enabled: true,
    sortOrder: 29,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'privacy-banner',
    scope: 'site',
    name: 'Privacy Banner (LGPD & MCI)',
    description:
      'Displays the floating privacy and essential storage notice in compliance with Brazil LGPD and Marco Civil.',
    category: 'collaboration',
    enabled: true,
    sortOrder: 30,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'page-header-banner',
    scope: 'site',
    name: 'Custom Header Banner',
    description:
      'Allows uploading or linking a custom cover image in page metadata and rendering it as a banner in reading mode.',
    category: 'appearance',
    enabled: true,
    sortOrder: 31,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'watchlist',
    scope: 'site',
    name: 'Watchlist (Watched Pages)',
    description:
      'Allows bookmarking watched articles in the user profile and browsing the Watchlist view from the sidebar.',
    category: 'navigation',
    enabled: true,
    sortOrder: 32,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
];

export type SiteExtensionsMap = Record<WikiExtensionId, ResolvedWikiExtension>;

export interface SiteExtensionsState {
  list: ResolvedWikiExtension[];
  byId: SiteExtensionsMap;
  loadedFromFirestore: boolean;
}

const DEFAULT_BY_ID = new Map<WikiExtensionId, ResolvedWikiExtension>(
  DEFAULT_WIKI_EXTENSIONS.map((ext) => [ext.id, ext])
);

export function sanitizeExtensionSettings(
  id: WikiExtensionId,
  raw?: WikiExtensionSettings | null
): WikiExtensionSettings {
  const base = DEFAULT_BY_ID.get(id)?.settings ?? {};
  const src = raw ?? {};

  switch (id) {
    case 'site-title': {
      const trimmedSiteTitle =
        typeof src.siteTitle === 'string'
          ? src.siteTitle.trim().slice(0, VALIDATION_LIMITS.EXTENSION_SITE_TITLE_MAX_LENGTH)
          : '';
      return {
        siteTitle: trimmedSiteTitle || base.siteTitle || DEFAULT_SITE_TITLE,
      };
    }
    case 'site-theme': {
      const rawThemeId = typeof src.themeId === 'string' ? src.themeId.trim() : '';
      const resolvedThemeId = isRegisteredWikiThemeId(rawThemeId)
        ? rawThemeId
        : base.themeId || DEFAULT_WIKI_THEME_ID;
      const resolvedColorScheme: WikiColorSchemePolicy =
        src.colorScheme === 'light' || src.colorScheme === 'dark' || src.colorScheme === 'user'
          ? src.colorScheme
          : base.colorScheme || 'user';
      return {
        themeId: resolvedThemeId,
        colorScheme: resolvedColorScheme,
      };
    }
    case 'toc': {
      const parsedMin =
        typeof src.minHeadings === 'number' && Number.isFinite(src.minHeadings)
          ? Math.round(src.minHeadings)
          : base.minHeadings ?? 1;
      return {
        defaultExpanded:
          typeof src.defaultExpanded === 'boolean'
            ? src.defaultExpanded
            : base.defaultExpanded ?? true,
        minHeadings: Math.max(
          VALIDATION_LIMITS.EXTENSION_MIN_HEADINGS_MIN,
          Math.min(VALIDATION_LIMITS.EXTENSION_MIN_HEADINGS_MAX, parsedMin)
        ),
      };
    }
    case 'references': {
      const trimmedTitle =
        typeof src.footerTitle === 'string'
          ? src.footerTitle.trim().slice(0, VALIDATION_LIMITS.EXTENSION_FOOTER_TITLE_MAX_LENGTH)
          : '';
      return {
        footerTitle: trimmedTitle || base.footerTitle || 'References',
        showOutlineLink:
          typeof src.showOutlineLink === 'boolean'
            ? src.showOutlineLink
            : base.showOutlineLink ?? true,
        allowEditorToolbar:
          typeof src.allowEditorToolbar === 'boolean'
            ? src.allowEditorToolbar
            : base.allowEditorToolbar ?? true,
      };
    }
    case 'infoboxes':
      return {
        allowEditorToolbar:
          typeof src.allowEditorToolbar === 'boolean'
            ? src.allowEditorToolbar
            : base.allowEditorToolbar ?? true,
        allowAutoProfileCard:
          typeof src.allowAutoProfileCard === 'boolean'
            ? src.allowAutoProfileCard
            : base.allowAutoProfileCard ?? true,
      };
    case 'reading-progress':
      return {};
    case 'print-view':
      return {
        showInHeader:
          typeof src.showInHeader === 'boolean' ? src.showInHeader : base.showInHeader ?? true,
        autoExitOnNavigate:
          typeof src.autoExitOnNavigate === 'boolean'
            ? src.autoExitOnNavigate
            : base.autoExitOnNavigate ?? true,
      };
    case 'random-article':
      return {
        showInNavbar:
          typeof src.showInNavbar === 'boolean' ? src.showInNavbar : base.showInNavbar ?? true,
        showInSidebar:
          typeof src.showInSidebar === 'boolean' ? src.showInSidebar : base.showInSidebar ?? true,
        excludeDiscussions:
          typeof src.excludeDiscussions === 'boolean'
            ? src.excludeDiscussions
            : base.excludeDiscussions ?? true,
      };
    case 'copy-link':
      return {
        showInHeader:
          typeof src.showInHeader === 'boolean' ? src.showInHeader : base.showInHeader ?? true,
        showToastFeedback:
          typeof src.showToastFeedback === 'boolean'
            ? src.showToastFeedback
            : base.showToastFeedback ?? true,
      };
    case 'realtime-toasts':
      return {
        notifyWhileEditing:
          typeof src.notifyWhileEditing === 'boolean'
            ? src.notifyWhileEditing
            : base.notifyWhileEditing ?? true,
      };
    case 'page-discussion':
      return {
        allowAnonymousRead:
          typeof src.allowAnonymousRead === 'boolean'
            ? src.allowAnonymousRead
            : base.allowAnonymousRead ?? true,
      };
    case 'external-link-prefix': {
      const normalizedPrefix = normalizeExternalLinkPrefix(
        src.externalLinkPrefix,
        base.externalLinkPrefix ?? DEFAULT_EXTERNAL_LINK_PREFIX
      );
      return {
        externalLinkPrefix: normalizedPrefix,
        encodeTargetUrl:
          typeof src.encodeTargetUrl === 'boolean'
            ? src.encodeTargetUrl
            : base.encodeTargetUrl ?? false,
      };
    }
    case 'article-ratings':
    case 'page-history':
    case 'page-source':
    case 'pdf-export':
    case 'zip-archive':
    case 'wiki-templates':
    case 'editor-toolbar':
    case 'ecosystem-portal':
    case 'quick-create':
    case 'sidebar-filter':
    case 'user-profiles':
    case 'pwa-install':
    case 'keyboard-shortcuts':
    case 'back-to-top':
    case 'footer-badges':
    case 'page-outline':
    case 'page-metadata':
    case 'page-index-views':
    case 'privacy-banner':
    case 'page-header-banner':
    case 'watchlist':
      return {};
  }
}

export function normalizeExternalLinkPrefix(
  raw: unknown,
  fallback: string = DEFAULT_EXTERNAL_LINK_PREFIX
): string {
  if (typeof raw !== 'string') {
    return fallback;
  }
  const trimmed = raw
    .trim()
    .slice(0, VALIDATION_LIMITS.EXTENSION_EXTERNAL_LINK_PREFIX_MAX_LENGTH);
  if (!trimmed) {
    return '';
  }
  // Block dangerous schemes and only allow http://, https://, or root-relative / paths
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return fallback;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^https?:\/\//i, (scheme) => scheme.toLowerCase());
  }
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  return fallback;
}

export function mergeExtensionsWithDefaults(
  records: Partial<WikiExtensionRecord>[]
): Omit<SiteExtensionsState, 'loadedFromFirestore'> {
  const incomingById = new Map<string, Partial<WikiExtensionRecord>>();
  for (const rec of records) {
    if (rec.id) {
      incomingById.set(rec.id, rec);
    }
  }

  const list: ResolvedWikiExtension[] = DEFAULT_WIKI_EXTENSIONS.map((def) => {
    const remote = incomingById.get(def.id);
    if (!remote) {
      return { ...def, settings: { ...def.settings }, persisted: false };
    }

    return {
      id: def.id,
      scope: 'site',
      name:
        typeof remote.name === 'string' && remote.name.trim()
          ? remote.name.trim().slice(0, VALIDATION_LIMITS.EXTENSION_NAME_MAX_LENGTH)
          : def.name,
      description:
        typeof remote.description === 'string' && remote.description.trim()
          ? remote.description.trim().slice(0, VALIDATION_LIMITS.EXTENSION_DESCRIPTION_MAX_LENGTH)
          : def.description,
      category:
        remote.category === 'appearance' ||
        remote.category === 'reading' ||
        remote.category === 'navigation' ||
        remote.category === 'authoring' ||
        remote.category === 'collaboration'
          ? remote.category
          : def.category,
      enabled: typeof remote.enabled === 'boolean' ? remote.enabled : def.enabled,
      sortOrder:
        typeof remote.sortOrder === 'number' && Number.isFinite(remote.sortOrder)
          ? Math.max(0, Math.min(100, Math.round(remote.sortOrder)))
          : def.sortOrder,
      settings: sanitizeExtensionSettings(def.id, remote.settings),
      updatedBy:
        typeof remote.updatedBy === 'string' && remote.updatedBy ? remote.updatedBy : def.updatedBy,
      updatedByName:
        typeof remote.updatedByName === 'string' && remote.updatedByName
          ? remote.updatedByName
          : def.updatedByName,
      createdAt: remote.createdAt ?? null,
      updatedAt: remote.updatedAt ?? null,
      persisted: true,
    };
  });

  list.sort((a, b) => a.sortOrder - b.sortOrder);

  const byId = list.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as SiteExtensionsMap);

  return { list, byId };
}

export function getInitialSiteExtensionsState(): SiteExtensionsState {
  const merged = mergeExtensionsWithDefaults([]);
  return {
    ...merged,
    loadedFromFirestore: false,
  };
}

export function resolveSiteTitle(state: SiteExtensionsState): string {
  const ext = state.byId['site-title'];
  if (!ext || !ext.enabled) {
    return DEFAULT_SITE_TITLE;
  }
  const configured = typeof ext.settings.siteTitle === 'string' ? ext.settings.siteTitle.trim() : '';
  return configured || DEFAULT_SITE_TITLE;
}

export function resolveSiteTheme(state: SiteExtensionsState): {
  theme: WikiThemeDefinition;
  colorScheme: WikiColorSchemePolicy;
} {
  const ext = state.byId['site-theme'];
  if (!ext || !ext.enabled) {
    return {
      theme: getWikiThemeById(DEFAULT_WIKI_THEME_ID),
      colorScheme: 'user',
    };
  }
  const theme = getWikiThemeById(
    typeof ext.settings.themeId === 'string' ? ext.settings.themeId : DEFAULT_WIKI_THEME_ID
  );
  const colorScheme: WikiColorSchemePolicy =
    ext.settings.colorScheme === 'light' || ext.settings.colorScheme === 'dark'
      ? ext.settings.colorScheme
      : 'user';
  return { theme, colorScheme };
}

export function resolveExternalLinkConfig(state: SiteExtensionsState): {
  prefix: string;
  encodeTargetUrl: boolean;
} {
  const ext = state.byId['external-link-prefix'];
  if (!ext || !ext.enabled) {
    return {
      prefix: '',
      encodeTargetUrl: false,
    };
  }
  const prefix = normalizeExternalLinkPrefix(
    ext.settings.externalLinkPrefix,
    DEFAULT_EXTERNAL_LINK_PREFIX
  );
  return {
    prefix,
    encodeTargetUrl: ext.settings.encodeTargetUrl === true,
  };
}

export function applyExternalLinkPrefix(
  rawHref: string | undefined,
  prefix?: string,
  encodeTargetUrl = false
): string | undefined {
  if (!rawHref) return rawHref;
  const trimmedHref = rawHref.trim();
  const cleanPrefix = typeof prefix === 'string' ? prefix.trim() : '';
  if (!cleanPrefix) return rawHref;

  // Never alter internal wiki pseudo-URLs, anchors, relative paths, mailto, tel, or non-http(s) links
  if (
    trimmedHref.startsWith('#') ||
    trimmedHref.startsWith('/') ||
    trimmedHref.startsWith('https://wiki.internal/') ||
    trimmedHref.startsWith('https://wiki.ref/') ||
    !/^https?:\/\//i.test(trimmedHref)
  ) {
    return rawHref;
  }

  // Avoid double-prefixing URLs that already carry the configured redirect/parameter prefix
  if (trimmedHref.toLowerCase().startsWith(cleanPrefix.toLowerCase())) {
    return trimmedHref;
  }

  const target = encodeTargetUrl ? encodeURIComponent(trimmedHref) : trimmedHref;
  return `${cleanPrefix}${target}`;
}

/**
 * Boot-time loader and live subscriber for site-wide extensions.
 * Explicitly verifies initial load from Firestore server so failures block non-bureaucrat access.
 */
export function bootAndSubscribeSiteExtensions(handlers: {
  onLoaded: (state: SiteExtensionsState) => void;
  onError: (message: string) => void;
}): Unsubscribe {
  const q = query(collection(db, 'extensions'), where('scope', '==', 'site'));
  let cancelled = false;
  let unsubSnapshot: Unsubscribe | null = null;

  const reportBootError = (error: unknown) => {
    try {
      handleFirestoreError(error, OperationType.LIST, 'extensions');
    } catch (formatted) {
      if (!cancelled) {
        const rawMessage = error instanceof Error ? error.message : String(error);
        const message =
          rawMessage ||
          (formatted instanceof Error ? formatted.message : 'Failed to load extensions.');
        handlers.onError(message);
      }
    }
  };

  void getDocsFromServer(q)
    .then((initialSnap) => {
      if (cancelled) return;
      const docs = initialSnap.docs.map((d) => ({
        id: d.id as WikiExtensionId,
        ...(d.data() as Omit<WikiExtensionRecord, 'id'>),
      }));
      const merged = mergeExtensionsWithDefaults(docs);
      handlers.onLoaded({
        ...merged,
        loadedFromFirestore: true,
      });

      unsubSnapshot = onSnapshot(
        q,
        (snap) => {
          if (cancelled) return;
          const liveDocs = snap.docs.map((d) => ({
            id: d.id as WikiExtensionId,
            ...(d.data() as Omit<WikiExtensionRecord, 'id'>),
          }));
          const liveMerged = mergeExtensionsWithDefaults(liveDocs);
          handlers.onLoaded({
            ...liveMerged,
            loadedFromFirestore: true,
          });
        },
        (error) => {
          reportBootError(error);
        }
      );
    })
    .catch((error) => {
      reportBootError(error);
    });

  return () => {
    cancelled = true;
    unsubSnapshot?.();
  };
}

/**
 * Subscribe to site-wide extension configurations at Wiki boot.
 * Safe for both anonymous visitors and authenticated collaborators.
 */
export function subscribeSiteExtensions(
  onChange: (state: SiteExtensionsState) => void
): Unsubscribe {
  const q = query(collection(db, 'extensions'), where('scope', '==', 'site'));
  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.map((d) => ({
        id: d.id as WikiExtensionId,
        ...(d.data() as Omit<WikiExtensionRecord, 'id'>),
      }));
      const merged = mergeExtensionsWithDefaults(docs);
      onChange({
        ...merged,
        loadedFromFirestore: true,
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'extensions');
    }
  );
}

/**
 * Create or update a single extension configuration in Firestore.
 * Enforced server-side by firestore.rules (`isBureaucrat()`).
 */
export async function saveExtensionConfigAsBureaucrat(
  input: {
    id: WikiExtensionId;
    enabled: boolean;
    settings: WikiExtensionSettings;
  },
  bureaucrat: User
): Promise<void> {
  const def = DEFAULT_BY_ID.get(input.id);
  if (!def) {
    throw new Error(`Unknown extension: ${input.id}`);
  }

  const ref = doc(db, 'extensions', input.id);
  const path = `extensions/${input.id}`;
  const actorName = (bureaucrat.displayName || bureaucrat.email || 'Bureaucrat')
    .trim()
    .slice(0, VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH);
  const sanitizedSettings = sanitizeExtensionSettings(input.id, input.settings);

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        id: def.id,
        scope: 'site',
        name: def.name.slice(0, VALIDATION_LIMITS.EXTENSION_NAME_MAX_LENGTH),
        description: def.description.slice(0, VALIDATION_LIMITS.EXTENSION_DESCRIPTION_MAX_LENGTH),
        category: def.category,
        enabled: input.enabled,
        sortOrder: def.sortOrder,
        settings: sanitizedSettings,
        updatedBy: bureaucrat.uid,
        updatedByName: actorName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        name: def.name.slice(0, VALIDATION_LIMITS.EXTENSION_NAME_MAX_LENGTH),
        description: def.description.slice(0, VALIDATION_LIMITS.EXTENSION_DESCRIPTION_MAX_LENGTH),
        category: def.category,
        enabled: input.enabled,
        sortOrder: def.sortOrder,
        settings: sanitizedSettings,
        updatedBy: bureaucrat.uid,
        updatedByName: actorName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Initialize missing extensions or reset all extensions to built-in defaults in Firebase.
 * Enforced server-side by firestore.rules (`isBureaucrat()`).
 */
export async function syncAllExtensionsAsBureaucrat(
  bureaucrat: User,
  mode: 'seed-missing' | 'reset-all'
): Promise<number> {
  const actorName = (bureaucrat.displayName || bureaucrat.email || 'Bureaucrat')
    .trim()
    .slice(0, VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH);

  try {
    const existingSnap = await getDocs(
      query(collection(db, 'extensions'), where('scope', '==', 'site'))
    );
    const existingIds = new Set(existingSnap.docs.map((d) => d.id));
    const batch = writeBatch(db);
    let writeCount = 0;

    for (const def of DEFAULT_WIKI_EXTENSIONS) {
      const ref = doc(db, 'extensions', def.id);
      const exists = existingIds.has(def.id);
      const sanitizedSettings = sanitizeExtensionSettings(def.id, def.settings);

      if (!exists) {
        batch.set(ref, {
          id: def.id,
          scope: 'site',
          name: def.name.slice(0, VALIDATION_LIMITS.EXTENSION_NAME_MAX_LENGTH),
          description: def.description.slice(0, VALIDATION_LIMITS.EXTENSION_DESCRIPTION_MAX_LENGTH),
          category: def.category,
          enabled: def.enabled,
          sortOrder: def.sortOrder,
          settings: sanitizedSettings,
          updatedBy: bureaucrat.uid,
          updatedByName: actorName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        writeCount += 1;
      } else if (mode === 'reset-all') {
        batch.update(ref, {
          name: def.name.slice(0, VALIDATION_LIMITS.EXTENSION_NAME_MAX_LENGTH),
          description: def.description.slice(0, VALIDATION_LIMITS.EXTENSION_DESCRIPTION_MAX_LENGTH),
          category: def.category,
          enabled: def.enabled,
          sortOrder: def.sortOrder,
          settings: sanitizedSettings,
          updatedBy: bureaucrat.uid,
          updatedByName: actorName,
          updatedAt: serverTimestamp(),
        });
        writeCount += 1;
      }
    }

    if (writeCount > 0) {
      await batch.commit();
    }
    return writeCount;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'extensions');
  }
}
