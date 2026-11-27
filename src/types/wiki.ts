import type { Timestamp } from 'firebase/firestore';

export type PageVisibility = 'public' | 'private';

export type WikiCategory = 'general' | 'guides' | 'reference' | 'projects' | 'drafts';

export const WIKI_CATEGORIES: { id: WikiCategory; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'guides', label: 'Guides' },
  { id: 'reference', label: 'Reference' },
  { id: 'projects', label: 'Projects' },
  { id: 'drafts', label: 'Drafts' },
];

/**
 * Synchronized verbatim with firebase-blueprint.json schema boundaries and regex patterns.
 */
export const VALIDATION_LIMITS = {
  SLUG_MAX_LENGTH: 128,
  SLUG_PATTERN: /^[a-zA-Z0-9_-]+$/,
  TITLE_MAX_LENGTH: 160,
  CONTENT_MAX_LENGTH: 200000,
  CATEGORY_MAX_LENGTH: 40,
  CATEGORY_PATTERN: /^[a-z0-9-]+$/,
  TAGS_MAX_COUNT: 8,
  TAG_MAX_LENGTH: 32,
  AUTHOR_NAME_MAX_LENGTH: 80,
  SUMMARY_MAX_LENGTH: 200,
  COMMENT_BODY_MAX_LENGTH: 2000,
  PHOTO_URL_MAX_LENGTH: 500,
  EMAIL_MAX_LENGTH: 200,
  BLOCK_REASON_MAX_LENGTH: 300,
  LGPD_SUMMARY_MAX_LENGTH: 300,
  EXTENSION_NAME_MAX_LENGTH: 80,
  EXTENSION_DESCRIPTION_MAX_LENGTH: 300,
  EXTENSION_SITE_TITLE_MAX_LENGTH: 80,
  EXTENSION_THEME_ID_MAX_LENGTH: 40,
  EXTENSION_THEME_ID_PATTERN: /^[a-z0-9-]+$/,
  EXTENSION_FOOTER_TITLE_MAX_LENGTH: 80,
  EXTENSION_MIN_HEADINGS_MIN: 1,
  EXTENSION_MIN_HEADINGS_MAX: 10,
  EXTENSION_EXTERNAL_LINK_PREFIX_MAX_LENGTH: 300,
  HEADER_IMAGE_URL_MAX_LENGTH: 200000,
  HEADER_IMAGE_EXTERNAL_URL_MAX_LENGTH: 1000,
  RATING_MIN_SCORE: 1,
  RATING_MAX_SCORE: 5,
  RECENT_EDITORS_MAX_COUNT: 3,
} as const;

export type GovernanceRole = 'member' | 'admin' | 'bureaucrat';
export type LgpdErasureMode = 'anonymize' | 'purge';

export type WikiExtensionId =
  | 'site-title'
  | 'site-theme'
  | 'toc'
  | 'references'
  | 'infoboxes'
  | 'reading-progress'
  | 'print-view'
  | 'random-article'
  | 'copy-link'
  | 'realtime-toasts'
  | 'page-discussion'
  | 'external-link-prefix'
  | 'article-ratings'
  | 'page-history'
  | 'page-source'
  | 'pdf-export'
  | 'zip-archive'
  | 'wiki-templates'
  | 'editor-toolbar'
  | 'ecosystem-portal'
  | 'quick-create'
  | 'sidebar-filter'
  | 'user-profiles'
  | 'pwa-install'
  | 'keyboard-shortcuts'
  | 'back-to-top'
  | 'footer-badges'
  | 'page-outline'
  | 'page-metadata'
  | 'page-index-views'
  | 'privacy-banner'
  | 'page-header-banner'
  | 'watchlist'
  | 'anti-chatbot-shield';

export type WikiExtensionCategory =
  | 'appearance'
  | 'reading'
  | 'navigation'
  | 'authoring'
  | 'collaboration';

export type WikiColorSchemePolicy = 'user' | 'light' | 'dark';

export interface WikiExtensionSettings {
  siteTitle?: string;
  themeId?: string;
  colorScheme?: WikiColorSchemePolicy;
  defaultExpanded?: boolean;
  minHeadings?: number;
  footerTitle?: string;
  showOutlineLink?: boolean;
  allowEditorToolbar?: boolean;
  allowAutoProfileCard?: boolean;
  showInNavbar?: boolean;
  showInSidebar?: boolean;
  excludeDiscussions?: boolean;
  showInHeader?: boolean;
  showToastFeedback?: boolean;
  notifyWhileEditing?: boolean;
  allowAnonymousRead?: boolean;
  autoExitOnNavigate?: boolean;
  externalLinkPrefix?: string;
  encodeTargetUrl?: boolean;
}

export interface WikiExtensionRecord {
  id: WikiExtensionId;
  scope: 'site';
  name: string;
  description: string;
  category: WikiExtensionCategory;
  enabled: boolean;
  sortOrder: number;
  settings: WikiExtensionSettings;
  updatedBy: string;
  updatedByName: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ResolvedWikiExtension extends WikiExtensionRecord {
  persisted: boolean;
}

export interface AdminRecord {
  uid: string;
  role: 'admin' | 'bureaucrat';
  grantedBy?: string;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface BlockedUser {
  uid: string;
  displayName: string;
  reason: string;
  blockedBy: string;
  blockedByName: string;
  createdAt: Timestamp | null;
}

export interface LgpdErasureLog {
  id: string;
  targetUid: string;
  mode: LgpdErasureMode;
  summary: string;
  executedBy: string;
  executedByName: string;
  createdAt: Timestamp | null;
}

export interface RecentEditorEntry {
  uid: string;
  name: string;
}

export interface WikiPage {
  slug: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  visibility: PageVisibility;
  isLocked: boolean;
  headerImageUrl?: string;
  authorId: string;
  authorName: string;
  lastEditorId: string;
  lastEditorName: string;
  recentEditors?: RecentEditorEntry[];
  version: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface PageRevision {
  id: string;
  pageSlug: string;
  pageVisibility: PageVisibility;
  pageAuthorId: string;
  title: string;
  content: string;
  editorId: string;
  editorName: string;
  summary: string;
  version: number;
  createdAt: Timestamp | null;
}

export interface PageComment {
  id: string;
  pageSlug: string;
  pageVisibility: PageVisibility;
  pageAuthorId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: Timestamp | null;
}

export interface PageRating {
  id: string;
  pageSlug: string;
  pageVisibility: PageVisibility;
  pageAuthorId: string;
  userId: string;
  userName: string;
  score: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface CollaboratorProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  personalPageSlug: string;
  discussionPageSlug: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface UserEdit {
  id: string;
  editorId: string;
  pageSlug: string;
  pageTitle: string;
  pageVisibility: PageVisibility;
  summary: string;
  version: number;
  createdAt: Timestamp | null;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  pageSlug: string;
  pageTitle: string;
  pageCategory: string;
  pageVisibility: PageVisibility;
  createdAt: Timestamp | null;
}

export type PageTab = 'read' | 'edit' | 'history' | 'comments' | 'source';
export type WorkspaceView = 'page' | 'index' | 'recent' | 'tags' | 'categories' | 'special' | 'create' | 'admin' | 'legal' | 'ecosystem';
