import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  type CollaboratorProfile,
  type PageComment,
  type PageRating,
  type PageRevision,
  type PageVisibility,
  type RecentEditorEntry,
  type UserEdit,
  VALIDATION_LIMITS,
  type WatchlistItem,
  type WikiPage,
} from '../types/wiki';
import {
  DOSSIER_PAGE_CATEGORY,
  DOSSIER_PAGE_CONTENT,
  DOSSIER_PAGE_SLUG,
  DOSSIER_PAGE_SUMMARY,
  DOSSIER_PAGE_TAGS,
  DOSSIER_PAGE_TITLE,
} from './dossierArticle';
import {
  ECOSYSTEM_PAGE_CATEGORY,
  ECOSYSTEM_PAGE_CONTENT,
  ECOSYSTEM_PAGE_SLUG,
  ECOSYSTEM_PAGE_SUMMARY,
  ECOSYSTEM_PAGE_TAGS,
  ECOSYSTEM_PAGE_TITLE,
  WIKIPEDIA_ABUSES_PAGE_CATEGORY,
  WIKIPEDIA_ABUSES_PAGE_CONTENT,
  WIKIPEDIA_ABUSES_PAGE_SLUG,
  WIKIPEDIA_ABUSES_PAGE_SUMMARY,
  WIKIPEDIA_ABUSES_PAGE_TAGS,
  WIKIPEDIA_ABUSES_PAGE_TITLE,
} from './ecosystemContent';
import { db, handleFirestoreError, OperationType } from './firebase';
import { sanitizeHeaderImageUrl } from './headerImageService';
import { isValidWikiSlug, serializeInfoboxBlock, toWikiSlug } from './markdownUtils';
import {
  ENGLISH_COMMUNITY_TEMPLATES,
  STARTER_TEMPLATE_CATEGORY,
  STARTER_TEMPLATE_CONTENT,
  STARTER_TEMPLATE_SLUG,
  STARTER_TEMPLATE_SUMMARY,
  STARTER_TEMPLATE_TAGS,
  STARTER_TEMPLATE_TITLE,
} from './templateEngine';
import {
  TEMPLATE_EXAMPLE_PAGE_CATEGORY,
  TEMPLATE_EXAMPLE_PAGE_CONTENT,
  TEMPLATE_EXAMPLE_PAGE_SLUG,
  TEMPLATE_EXAMPLE_PAGE_SUMMARY,
  TEMPLATE_EXAMPLE_PAGE_TAGS,
  TEMPLATE_EXAMPLE_PAGE_TITLE,
} from './templateExampleArticle';

function sanitizeString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

function sanitizeTemplateInline(value: string, maxLen: number): string {
  return value
    .replace(/\r?\n+/g, ' ')
    .replace(/\|/g, '—')
    .replace(/\{\{/g, '((')
    .replace(/\}\}/g, '))')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function sanitizeCategory(category: string): string {
  const normalized = category
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, VALIDATION_LIMITS.CATEGORY_MAX_LENGTH);

  return VALIDATION_LIMITS.CATEGORY_PATTERN.test(normalized) ? normalized : 'general';
}

function sanitizeTags(tags: string[]): string[] {
  const cleaned = tags
    .map((t) => t.trim().slice(0, VALIDATION_LIMITS.TAG_MAX_LENGTH))
    .filter((t) => t.length >= 1);
  return Array.from(new Set(cleaned)).slice(0, VALIDATION_LIMITS.TAGS_MAX_COUNT);
}

function getUserDisplayName(user: User): string {
  const raw = user.displayName || user.email?.split('@')[0] || 'Collaborator';
  return sanitizeString(raw, VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH) || 'Collaborator';
}

export function computeNextRecentEditors(
  existing:
    | Pick<
        WikiPage,
        'recentEditors' | 'lastEditorId' | 'lastEditorName' | 'authorId' | 'authorName'
      >
    | null
    | undefined,
  nextEditor: RecentEditorEntry
): RecentEditorEntry[] {
  const result: RecentEditorEntry[] = [];
  const seen = new Set<string>();

  const pushEntry = (uid?: string | null, name?: string | null) => {
    if (!uid || !name) return;
    const cleanUid = uid.trim();
    const cleanName = sanitizeString(name, VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH);
    if (!cleanUid || !cleanName || !isValidWikiSlug(cleanUid) || seen.has(cleanUid)) return;
    seen.add(cleanUid);
    result.push({ uid: cleanUid, name: cleanName });
  };

  pushEntry(nextEditor.uid, nextEditor.name);

  if (Array.isArray(existing?.recentEditors)) {
    for (const entry of existing.recentEditors) {
      pushEntry(entry?.uid, entry?.name);
      if (result.length >= VALIDATION_LIMITS.RECENT_EDITORS_MAX_COUNT) {
        return result;
      }
    }
  }

  if (existing && result.length < VALIDATION_LIMITS.RECENT_EDITORS_MAX_COUNT) {
    pushEntry(existing.lastEditorId, existing.lastEditorName);
  }
  if (existing && result.length < VALIDATION_LIMITS.RECENT_EDITORS_MAX_COUNT) {
    pushEntry(existing.authorId, existing.authorName);
  }

  return result.slice(0, VALIDATION_LIMITS.RECENT_EDITORS_MAX_COUNT);
}

export function extractRecentEditorsFromRevisions(
  revisions: PageRevision[],
  fallbackPage?: Pick<
    WikiPage,
    'recentEditors' | 'lastEditorId' | 'lastEditorName' | 'authorId' | 'authorName'
  > | null
): RecentEditorEntry[] {
  const sorted = [...revisions].sort((a, b) => b.version - a.version);
  const result: RecentEditorEntry[] = [];
  const seen = new Set<string>();

  const pushEntry = (uid?: string | null, name?: string | null) => {
    if (!uid || !name) return;
    const cleanUid = uid.trim();
    const cleanName = sanitizeString(name, VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH);
    if (!cleanUid || !cleanName || seen.has(cleanUid)) return;
    seen.add(cleanUid);
    result.push({ uid: cleanUid, name: cleanName });
  };

  for (const rev of sorted) {
    pushEntry(rev.editorId, rev.editorName);
    if (result.length >= VALIDATION_LIMITS.RECENT_EDITORS_MAX_COUNT) {
      return result;
    }
  }

  if (fallbackPage) {
    if (Array.isArray(fallbackPage.recentEditors)) {
      for (const entry of fallbackPage.recentEditors) {
        pushEntry(entry?.uid, entry?.name);
        if (result.length >= VALIDATION_LIMITS.RECENT_EDITORS_MAX_COUNT) return result;
      }
    }
    pushEntry(fallbackPage.lastEditorId, fallbackPage.lastEditorName);
    if (result.length < VALIDATION_LIMITS.RECENT_EDITORS_MAX_COUNT) {
      pushEntry(fallbackPage.authorId, fallbackPage.authorName);
    }
  }

  return result.slice(0, VALIDATION_LIMITS.RECENT_EDITORS_MAX_COUNT);
}

export function buildPersonalSlugs(
  displayName: string,
  uid: string
): { personalPageSlug: string; discussionPageSlug: string } {
  const namePart = toWikiSlug(displayName).slice(0, 32) || 'member';
  const uidPart = toWikiSlug(uid).slice(0, 6) || '000001';
  const personalPageSlug = toWikiSlug(`user-${namePart}-${uidPart}`) || `user-${uidPart}`;
  const discussionPageSlug = `${personalPageSlug}-discussion`;
  return { personalPageSlug, discussionPageSlug };
}

export function isUserOrDiscussionPage(page: Pick<WikiPage, 'slug' | 'tags'>): boolean {
  return (
    page.tags.includes('personal') ||
    page.tags.includes('discussion') ||
    page.slug.startsWith('user-') ||
    page.slug.endsWith('-discussion')
  );
}

function buildEditDocId(slug: string, version: number): string {
  const suffix = `_v${version}`;
  const maxSlugLen = Math.max(1, VALIDATION_LIMITS.SLUG_MAX_LENGTH - suffix.length);
  return `${slug.slice(0, maxSlugLen)}${suffix}`;
}

function buildPersonalPageContent(
  displayName: string,
  personalPageSlug: string,
  discussionPageSlug: string,
  uid: string,
  photoURL: string
): string {
  const joinedDate = new Date().toISOString().slice(0, 10);
  const shortUid = uid.slice(0, 8) || 'member';
  const safeImage =
    photoURL.startsWith('https://') || photoURL.startsWith('http://') ? photoURL : undefined;

  const userInfobox = serializeInfoboxBlock({
    type: 'user',
    title: displayName,
    subtitle: 'WazzimaGiygg Maker Collaborator',
    image: safeImage,
    layout: 'right',
    fields: [
      { key: 'Handle', value: `:${personalPageSlug}` },
      { key: 'Member ID', value: `\`${shortUid}\`` },
      { key: 'Discussion', value: `[[${discussionPageSlug}|Talk Page]]` },
      { key: 'Role', value: 'Collaborator' },
      { key: 'Joined', value: joinedDate },
      { key: 'Status', value: 'Active' },
    ],
  });

  return `${userInfobox}

Welcome to **${displayName}**'s personal collaborator page on WazzimaGiygg Maker.

## Workspace Links

- **Personal Page**: [[${personalPageSlug}|${displayName}]] (\`:${personalPageSlug}\`)
- **Discussion Page**: [[${discussionPageSlug}|${displayName}'s Discussion Page]]
- **Wiki Home**: [[start|Welcome to WazzimaGiygg Maker]]

## About Me

This personal page and identification infobox were created automatically when **${displayName}** joined the wiki. Click **Edit** above to customize your bio, showcase notes, or pin collaborative links.

> Every edit **${displayName}** makes across the wiki is listed in the **Edit History** section below. Visit [[${discussionPageSlug}|the discussion page]] to start a conversation.`;
}

function buildWelcomeNoticeSection(displayName: string, personalPageSlug: string): string {
  const now = new Date();
  const dateOnly = now.toISOString().slice(0, 10);
  const dateTimeUtc = `${dateOnly} ${now.toISOString().slice(11, 16)} UTC`;
  const safeInlineName = sanitizeTemplateInline(displayName, 80) || 'Collaborator';
  const safeLinkLabel = safeInlineName.replace(/[[\]]/g, '') || 'Collaborator';

  return [
    `## Welcome to the wiki (${dateOnly})`,
    '',
    `{{Welcome|contributor=${safeInlineName}|topic=WazzimaGiygg Maker|date=${dateTimeUtc}}}`,
    '',
    `- **Usage rules:** Review the [WikiMaker Usage Rules](#/terms) before editing or publishing content`,
    `- **Your personal page:** [[${personalPageSlug}|${safeLinkLabel}]] (\`:${personalPageSlug}\`)`,
    `- **Getting started:** Check the [[markdown-guide|Markdown & Templates Guide]] or explore [[start|Home]]`,
    `- **Discussions:** Other collaborators can leave comments below or edit this conversation following wiki guidelines.`,
  ].join('\n');
}

function buildDiscussionPageContent(
  displayName: string,
  personalPageSlug: string
): string {
  const welcomeSection = buildWelcomeNoticeSection(displayName, personalPageSlug);

  return `${welcomeSection}

---

This is the dedicated discussion page for **${displayName}**.

Return to [[${personalPageSlug}|${displayName}'s Personal Page]] or post a message directly in the discussion thread below.

## Topics

- Feedback on collaborative pages and documentation
- Questions or suggestions for **${displayName}**
- Links back to shared wiki pages like [[start|Home]]`;
}

export interface SyncUserResult {
  profile: CollaboratorProfile;
  isNewUser: boolean;
}

export async function syncUserDocuments(user: User): Promise<SyncUserResult> {
  const displayName = getUserDisplayName(user);
  const photoURL = (user.photoURL ?? '').slice(0, VALIDATION_LIMITS.PHOTO_URL_MAX_LENGTH);
  const collabPath = `collaborators/${user.uid}`;
  const collabRef = doc(db, 'collaborators', user.uid);

  let isNewUser = false;
  let resolvedPersonalSlug = '';
  let resolvedDiscussionSlug = '';
  let existingProfile: Partial<CollaboratorProfile> | null = null;

  try {
    const snap = await getDoc(collabRef);
    const fallbackSlugs = buildPersonalSlugs(displayName, user.uid);

    if (!snap.exists()) {
      isNewUser = true;
      resolvedPersonalSlug = fallbackSlugs.personalPageSlug;
      resolvedDiscussionSlug = fallbackSlugs.discussionPageSlug;
    } else {
      const existing = snap.data() as Partial<CollaboratorProfile>;
      existingProfile = existing;
      resolvedPersonalSlug = existing.personalPageSlug || fallbackSlugs.personalPageSlug;
      resolvedDiscussionSlug = existing.discussionPageSlug || fallbackSlugs.discussionPageSlug;
    }

    const needsPersonalSetup =
      !snap.exists() || !existingProfile?.personalPageSlug || !existingProfile?.discussionPageSlug;
    const needsProfileRefresh =
      snap.exists() &&
      !needsPersonalSetup &&
      (existingProfile?.displayName !== displayName || existingProfile?.photoURL !== photoURL);

    if (needsPersonalSetup) {
      const personalRef = doc(db, 'pages', resolvedPersonalSlug);
      const discussionRef = doc(db, 'pages', resolvedDiscussionSlug);
      const [personalSnap, discussionSnap] = await Promise.all([
        getDoc(personalRef),
        getDoc(discussionRef),
      ]);

      const batch = writeBatch(db);

      if (!snap.exists()) {
        batch.set(collabRef, {
          uid: user.uid,
          displayName,
          photoURL,
          personalPageSlug: resolvedPersonalSlug,
          discussionPageSlug: resolvedDiscussionSlug,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.update(collabRef, {
          displayName,
          photoURL,
          personalPageSlug: resolvedPersonalSlug,
          discussionPageSlug: resolvedDiscussionSlug,
          updatedAt: serverTimestamp(),
        });
      }

      if (!personalSnap.exists()) {
        const personalContent = buildPersonalPageContent(
          displayName,
          resolvedPersonalSlug,
          resolvedDiscussionSlug,
          user.uid,
          photoURL
        );
        const personalSummary = 'Created personal collaborator page';
        batch.set(personalRef, {
          slug: resolvedPersonalSlug,
          title: displayName,
          content: personalContent,
          category: 'general',
          tags: ['personal', 'profile'],
          visibility: 'public',
          isLocked: false,
          authorId: user.uid,
          authorName: displayName,
          lastEditorId: user.uid,
          lastEditorName: displayName,
          recentEditors: [{ uid: user.uid, name: displayName }],
          version: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'pages', resolvedPersonalSlug, 'revisions', 'v_1'), {
          pageSlug: resolvedPersonalSlug,
          pageVisibility: 'public',
          pageAuthorId: user.uid,
          title: displayName,
          content: personalContent,
          editorId: user.uid,
          editorName: displayName,
          summary: personalSummary,
          version: 1,
          createdAt: serverTimestamp(),
        });
        batch.set(
          doc(db, 'collaborators', user.uid, 'edits', buildEditDocId(resolvedPersonalSlug, 1)),
          {
            editorId: user.uid,
            pageSlug: resolvedPersonalSlug,
            pageTitle: displayName,
            pageVisibility: 'public',
            summary: personalSummary,
            version: 1,
            createdAt: serverTimestamp(),
          }
        );
      }

      let pendingWelcomeCommentPage: WikiPage | null = null;

      if (!discussionSnap.exists()) {
        const discussionTitle = sanitizeString(
          `Discussion: ${displayName}`,
          VALIDATION_LIMITS.TITLE_MAX_LENGTH
        );
        const discussionContent = buildDiscussionPageContent(displayName, resolvedPersonalSlug);
        const discussionSummary = 'Created personal discussion page with welcome message';
        batch.set(discussionRef, {
          slug: resolvedDiscussionSlug,
          title: discussionTitle,
          content: discussionContent,
          category: 'general',
          tags: ['personal', 'discussion'],
          visibility: 'public',
          isLocked: false,
          authorId: user.uid,
          authorName: displayName,
          lastEditorId: user.uid,
          lastEditorName: displayName,
          recentEditors: [{ uid: user.uid, name: displayName }],
          version: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'pages', resolvedDiscussionSlug, 'revisions', 'v_1'), {
          pageSlug: resolvedDiscussionSlug,
          pageVisibility: 'public',
          pageAuthorId: user.uid,
          title: discussionTitle,
          content: discussionContent,
          editorId: user.uid,
          editorName: displayName,
          summary: discussionSummary,
          version: 1,
          createdAt: serverTimestamp(),
        });
        batch.set(
          doc(db, 'collaborators', user.uid, 'edits', buildEditDocId(resolvedDiscussionSlug, 1)),
          {
            editorId: user.uid,
            pageSlug: resolvedDiscussionSlug,
            pageTitle: discussionTitle,
            pageVisibility: 'public',
            summary: discussionSummary,
            version: 1,
            createdAt: serverTimestamp(),
          }
        );
      } else if (isNewUser) {
        const existingDiscussion = discussionSnap.data() as WikiPage;
        if (
          !existingDiscussion.content.includes('Boas-vindas') &&
          !existingDiscussion.content.includes('Welcome')
        ) {
          if (existingDiscussion.authorId === user.uid) {
            const welcomeSection = buildWelcomeNoticeSection(displayName, resolvedPersonalSlug);
            const combinedContent = existingDiscussion.content.trim()
              ? `${welcomeSection}\n\n---\n\n${existingDiscussion.content.trimStart()}`
              : welcomeSection;
            const boundedContent = combinedContent.slice(0, VALIDATION_LIMITS.CONTENT_MAX_LENGTH);
            const nextVersion = existingDiscussion.version + 1;
            const welcomeSummary = 'Added welcome message to personal discussion page';

            batch.update(discussionRef, {
              content: boundedContent,
              lastEditorId: user.uid,
              lastEditorName: displayName,
              recentEditors: computeNextRecentEditors(existingDiscussion, {
                uid: user.uid,
                name: displayName,
              }),
              version: nextVersion,
              updatedAt: serverTimestamp(),
            });
            batch.set(doc(db, 'pages', resolvedDiscussionSlug, 'revisions', `v_${nextVersion}`), {
              pageSlug: resolvedDiscussionSlug,
              pageVisibility: existingDiscussion.visibility,
              pageAuthorId: existingDiscussion.authorId,
              title: existingDiscussion.title,
              content: boundedContent,
              editorId: user.uid,
              editorName: displayName,
              summary: welcomeSummary,
              version: nextVersion,
              createdAt: serverTimestamp(),
            });
            batch.set(
              doc(
                db,
                'collaborators',
                user.uid,
                'edits',
                buildEditDocId(resolvedDiscussionSlug, nextVersion)
              ),
              {
                editorId: user.uid,
                pageSlug: resolvedDiscussionSlug,
                pageTitle: existingDiscussion.title,
                pageVisibility: existingDiscussion.visibility,
                summary: welcomeSummary,
                version: nextVersion,
                createdAt: serverTimestamp(),
              }
            );
          } else if (existingDiscussion.visibility === 'public') {
            pendingWelcomeCommentPage = existingDiscussion;
          }
        }
      }

      await batch.commit();

      if (pendingWelcomeCommentPage) {
        try {
          await addPageComment(
            pendingWelcomeCommentPage,
            `Welcome to the wiki, ${displayName}! Your account is now connected to WazzimaGiygg Maker.`,
            user
          );
        } catch (commentError) {
          console.warn('Could not post fallback welcome comment:', commentError);
        }
      }
    } else if (needsProfileRefresh) {
      await updateDoc(collabRef, {
        displayName,
        photoURL,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collabPath);
  }

  if (user.email) {
    const privatePath = `users/${user.uid}/private/info`;
    const privateRef = doc(db, 'users', user.uid, 'private', 'info');
    const safeEmail = sanitizeString(user.email, VALIDATION_LIMITS.EMAIL_MAX_LENGTH);
    try {
      const privSnap = await getDoc(privateRef);
      if (!privSnap.exists()) {
        await setDoc(privateRef, {
          uid: user.uid,
          email: safeEmail,
          updatedAt: serverTimestamp(),
        });
      } else if (privSnap.data().email !== safeEmail) {
        await updateDoc(privateRef, {
          email: safeEmail,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, privatePath);
    }
  }

  return {
    isNewUser,
    profile: {
      uid: user.uid,
      displayName,
      photoURL,
      personalPageSlug: resolvedPersonalSlug,
      discussionPageSlug: resolvedDiscussionSlug,
      createdAt: existingProfile?.createdAt ?? null,
      updatedAt: existingProfile?.updatedAt ?? null,
    },
  };
}

export interface SavePageInput {
  slug: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  visibility: PageVisibility;
  isLocked: boolean;
  headerImageUrl?: string;
  summary: string;
}

export async function createWikiPage(input: SavePageInput, user: User): Promise<string> {
  const slug = toWikiSlug(input.slug);
  if (!isValidWikiSlug(slug)) {
    throw new Error('Invalid identifier (:slug). Use only letters, numbers, underscores, and hyphens.');
  }

  const title = sanitizeString(input.title, VALIDATION_LIMITS.TITLE_MAX_LENGTH);
  if (!title) {
    throw new Error('Page title is required.');
  }

  const content = input.content.slice(0, VALIDATION_LIMITS.CONTENT_MAX_LENGTH);
  const category = sanitizeCategory(input.category);
  const tags = sanitizeTags(input.tags);
  const headerImageUrl = sanitizeHeaderImageUrl(input.headerImageUrl);
  const authorName = getUserDisplayName(user);
  const summary =
    sanitizeString(input.summary, VALIDATION_LIMITS.SUMMARY_MAX_LENGTH) ||
    'Initial page creation';

  const pagePath = `pages/${slug}`;
  const pageRef = doc(db, 'pages', slug);

  try {
    const existingSnap = await getDoc(pageRef);
    if (existingSnap.exists()) {
      throw new Error(`A page with identifier ":${slug}" already exists.`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('A page with identifier')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, pagePath);
  }

  const batch = writeBatch(db);
  batch.set(pageRef, {
    slug,
    title,
    content,
    category,
    tags,
    visibility: input.visibility,
    isLocked: input.isLocked,
    ...(headerImageUrl ? { headerImageUrl } : {}),
    authorId: user.uid,
    authorName,
    lastEditorId: user.uid,
    lastEditorName: authorName,
    recentEditors: [{ uid: user.uid, name: authorName }],
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const revRef = doc(db, 'pages', slug, 'revisions', 'v_1');
  batch.set(revRef, {
    pageSlug: slug,
    pageVisibility: input.visibility,
    pageAuthorId: user.uid,
    title,
    content,
    editorId: user.uid,
    editorName: authorName,
    summary,
    version: 1,
    createdAt: serverTimestamp(),
  });

  const editRef = doc(db, 'collaborators', user.uid, 'edits', buildEditDocId(slug, 1));
  batch.set(editRef, {
    editorId: user.uid,
    pageSlug: slug,
    pageTitle: title,
    pageVisibility: input.visibility,
    summary,
    version: 1,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, pagePath);
  }

  return slug;
}

export async function updateWikiPage(
  existing: WikiPage,
  input: SavePageInput,
  user: User,
  canManageMeta: boolean
): Promise<void> {
  if (isUserOrDiscussionPage(existing) && !canManageMeta) {
    throw new Error(
      'Only administrators or the page owner can edit user pages and discussion pages.'
    );
  }

  const title = sanitizeString(input.title, VALIDATION_LIMITS.TITLE_MAX_LENGTH);
  if (!title) {
    throw new Error('Page title is required.');
  }

  const content = input.content.slice(0, VALIDATION_LIMITS.CONTENT_MAX_LENGTH);
  const category = sanitizeCategory(input.category);
  const tags = sanitizeTags(input.tags);
  const headerImageUrl =
    input.headerImageUrl !== undefined
      ? sanitizeHeaderImageUrl(input.headerImageUrl)
      : sanitizeHeaderImageUrl(existing.headerImageUrl);
  const editorName = getUserDisplayName(user);
  const nextVersion = existing.version + 1;
  const nextVisibility: PageVisibility = canManageMeta ? input.visibility : existing.visibility;
  const nextLocked = canManageMeta ? input.isLocked : existing.isLocked;
  const summary =
    sanitizeString(input.summary, VALIDATION_LIMITS.SUMMARY_MAX_LENGTH) ||
    `Revision v${nextVersion}`;

  const pagePath = `pages/${existing.slug}`;
  const pageRef = doc(db, 'pages', existing.slug);
  const batch = writeBatch(db);

  const recentEditors = computeNextRecentEditors(existing, {
    uid: user.uid,
    name: editorName,
  });

  const updatePayload: Record<string, unknown> = {
    title,
    content,
    category,
    tags,
    lastEditorId: user.uid,
    lastEditorName: editorName,
    recentEditors,
    version: nextVersion,
    updatedAt: serverTimestamp(),
  };

  if (headerImageUrl !== (existing.headerImageUrl ?? '')) {
    updatePayload.headerImageUrl = headerImageUrl;
  }

  if (canManageMeta) {
    updatePayload.visibility = nextVisibility;
    updatePayload.isLocked = nextLocked;
  }

  batch.update(pageRef, updatePayload);

  const revRef = doc(db, 'pages', existing.slug, 'revisions', `v_${nextVersion}`);
  batch.set(revRef, {
    pageSlug: existing.slug,
    pageVisibility: nextVisibility,
    pageAuthorId: existing.authorId,
    title,
    content,
    editorId: user.uid,
    editorName,
    summary,
    version: nextVersion,
    createdAt: serverTimestamp(),
  });

  const editRef = doc(
    db,
    'collaborators',
    user.uid,
    'edits',
    buildEditDocId(existing.slug, nextVersion)
  );
  batch.set(editRef, {
    editorId: user.uid,
    pageSlug: existing.slug,
    pageTitle: title,
    pageVisibility: nextVisibility,
    summary,
    version: nextVersion,
    createdAt: serverTimestamp(),
  });

  // Keep denormalized pageVisibility in sync if the author/admin changed visibility
  if (canManageMeta && nextVisibility !== existing.visibility) {
    try {
      const [revsSnap, commentsSnap, ratingsSnap, ownerEditsSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, 'pages', existing.slug, 'revisions'),
            where('pageVisibility', '==', existing.visibility)
          )
        ),
        getDocs(
          query(
            collection(db, 'pages', existing.slug, 'comments'),
            where('pageVisibility', '==', existing.visibility)
          )
        ),
        getDocs(
          query(
            collection(db, 'pages', existing.slug, 'ratings'),
            where('pageVisibility', '==', existing.visibility)
          )
        ),
        existing.authorId === user.uid
          ? getDocs(
              query(
                collection(db, 'collaborators', user.uid, 'edits'),
                where('editorId', '==', user.uid)
              )
            )
          : Promise.resolve(null),
      ]);
      revsSnap.forEach((d) => {
        batch.update(d.ref, { pageVisibility: nextVisibility });
      });
      commentsSnap.forEach((d) => {
        batch.update(d.ref, { pageVisibility: nextVisibility });
      });
      ratingsSnap.forEach((d) => {
        batch.update(d.ref, { pageVisibility: nextVisibility });
      });
      ownerEditsSnap?.forEach((d) => {
        if (d.data().pageSlug === existing.slug) {
          batch.update(d.ref, { pageVisibility: nextVisibility });
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, pagePath);
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, pagePath);
  }
}

export async function restorePageRevision(
  page: WikiPage,
  revision: PageRevision,
  user: User,
  canManageMeta: boolean
): Promise<void> {
  await updateWikiPage(
    page,
    {
      slug: page.slug,
      title: revision.title,
      content: revision.content,
      category: page.category,
      tags: page.tags,
      visibility: page.visibility,
      isLocked: page.isLocked,
      headerImageUrl: page.headerImageUrl ?? '',
      summary: `Restored version v${revision.version}`,
    },
    user,
    canManageMeta
  );
}

export async function deleteWikiPage(page: WikiPage): Promise<void> {
  const pagePath = `pages/${page.slug}`;
  const batch = writeBatch(db);
  const filterField = page.visibility === 'public' ? 'pageVisibility' : 'pageAuthorId';
  const filterValue = page.visibility === 'public' ? 'public' : page.authorId;

  try {
    const [revsSnap, commentsSnap, ratingsSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, 'pages', page.slug, 'revisions'),
          where(filterField, '==', filterValue)
        )
      ),
      getDocs(
        query(
          collection(db, 'pages', page.slug, 'comments'),
          where(filterField, '==', filterValue)
        )
      ),
      getDocs(
        query(
          collection(db, 'pages', page.slug, 'ratings'),
          where(filterField, '==', filterValue)
        )
      ),
    ]);

    revsSnap.forEach((d) => batch.delete(d.ref));
    commentsSnap.forEach((d) => batch.delete(d.ref));
    ratingsSnap.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'pages', page.slug));

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pagePath);
  }
}

export async function fetchPageRevisions(page: WikiPage): Promise<PageRevision[]> {
  const revPath = `pages/${page.slug}/revisions`;
  const filterField = page.visibility === 'public' ? 'pageVisibility' : 'pageAuthorId';
  const filterValue = page.visibility === 'public' ? 'public' : page.authorId;

  try {
    const q = query(
      collection(db, 'pages', page.slug, 'revisions'),
      where(filterField, '==', filterValue)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<PageRevision, 'id'>),
    }));
    return list.sort((a, b) => b.version - a.version);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, revPath);
  }
}

export async function addPageComment(page: WikiPage, body: string, user: User): Promise<void> {
  const cleanedBody = sanitizeString(body, VALIDATION_LIMITS.COMMENT_BODY_MAX_LENGTH);
  if (!cleanedBody) {
    throw new Error('Comment cannot be empty.');
  }

  const commentRef = doc(collection(db, 'pages', page.slug, 'comments'));
  const commentPath = `pages/${page.slug}/comments/${commentRef.id}`;
  const authorName = getUserDisplayName(user);

  try {
    await setDoc(commentRef, {
      pageSlug: page.slug,
      pageVisibility: page.visibility,
      pageAuthorId: page.authorId,
      authorId: user.uid,
      authorName,
      body: cleanedBody,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, commentPath);
  }
}

export async function deletePageComment(slug: string, commentId: string): Promise<void> {
  const commentPath = `pages/${slug}/comments/${commentId}`;
  try {
    await deleteDoc(doc(db, 'pages', slug, 'comments', commentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, commentPath);
  }
}

export async function upsertPageRating(
  page: WikiPage,
  score: number,
  user: User
): Promise<void> {
  if (
    !Number.isInteger(score) ||
    score < VALIDATION_LIMITS.RATING_MIN_SCORE ||
    score > VALIDATION_LIMITS.RATING_MAX_SCORE
  ) {
    throw new Error(
      `Rating must be a whole number between ${VALIDATION_LIMITS.RATING_MIN_SCORE} and ${VALIDATION_LIMITS.RATING_MAX_SCORE}.`
    );
  }

  const slug = page.slug;
  if (!isValidWikiSlug(slug)) {
    throw new Error('Invalid article identifier.');
  }

  const pageRef = doc(db, 'pages', slug);
  const ratingRef = doc(db, 'pages', slug, 'ratings', user.uid);
  const ratingPath = `pages/${slug}/ratings/${user.uid}`;
  const userName = getUserDisplayName(user);

  let pageSnap;
  try {
    pageSnap = await getDoc(pageRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `pages/${slug}`);
  }

  if (!pageSnap.exists()) {
    if (page.authorId === 'builtin-editorial') {
      await createWikiPage(
        {
          slug: page.slug,
          title: page.title,
          content: page.content,
          category: page.category,
          tags: page.tags,
          visibility: 'public',
          isLocked: false,
          summary: 'Initial publication of built-in article',
        },
        user
      );
      try {
        pageSnap = await getDoc(pageRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `pages/${slug}`);
      }
    } else {
      throw new Error('This article no longer exists.');
    }
  }

  const livePage = pageSnap.data() as WikiPage;

  let existingRatingSnap;
  try {
    existingRatingSnap = await getDoc(ratingRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, ratingPath);
  }

  if (existingRatingSnap.exists()) {
    try {
      await updateDoc(ratingRef, {
        score,
        userName,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, ratingPath);
    }
  } else {
    try {
      await setDoc(ratingRef, {
        pageSlug: slug,
        pageVisibility: livePage.visibility,
        pageAuthorId: livePage.authorId,
        userId: user.uid,
        userName,
        score,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, ratingPath);
    }
  }
}

export async function deletePageRating(slug: string, userId: string): Promise<void> {
  if (!isValidWikiSlug(slug) || !isValidWikiSlug(userId)) {
    throw new Error('Invalid rating identifier.');
  }
  const ratingPath = `pages/${slug}/ratings/${userId}`;
  try {
    await deleteDoc(doc(db, 'pages', slug, 'ratings', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, ratingPath);
  }
}

export async function addPageToWatchlist(page: WikiPage, user: User): Promise<void> {
  const slug = page.slug;
  if (!isValidWikiSlug(slug) || !isValidWikiSlug(user.uid)) {
    throw new Error('Invalid watchlist identifier.');
  }

  const collabRef = doc(db, 'collaborators', user.uid);
  const pageRef = doc(db, 'pages', slug);
  const watchlistRef = doc(db, 'collaborators', user.uid, 'watchlist', slug);
  const watchlistPath = `collaborators/${user.uid}/watchlist/${slug}`;

  try {
    const collabSnap = await getDoc(collabRef);
    if (!collabSnap.exists()) {
      await syncUserDocuments(user);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `collaborators/${user.uid}`);
  }

  let pageSnap;
  try {
    pageSnap = await getDoc(pageRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `pages/${slug}`);
  }

  if (!pageSnap.exists()) {
    if (page.authorId === 'builtin-editorial') {
      await createWikiPage(
        {
          slug: page.slug,
          title: page.title,
          content: page.content,
          category: page.category,
          tags: page.tags,
          visibility: 'public',
          isLocked: false,
          summary: 'Initial publication of built-in article',
        },
        user
      );
      try {
        pageSnap = await getDoc(pageRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `pages/${slug}`);
      }
    } else {
      throw new Error('This article no longer exists.');
    }
  }

  const livePage = pageSnap.data() as WikiPage;

  try {
    const existingWatchSnap = await getDoc(watchlistRef);
    if (existingWatchSnap.exists()) {
      return;
    }

    await setDoc(watchlistRef, {
      userId: user.uid,
      pageSlug: slug,
      pageTitle: sanitizeString(livePage.title, VALIDATION_LIMITS.TITLE_MAX_LENGTH) || slug,
      pageCategory: sanitizeCategory(livePage.category),
      pageVisibility: livePage.visibility,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, watchlistPath);
  }
}

export async function removePageFromWatchlist(slug: string, userId: string): Promise<void> {
  if (!isValidWikiSlug(slug) || !isValidWikiSlug(userId)) {
    throw new Error('Invalid watchlist identifier.');
  }
  const watchlistPath = `collaborators/${userId}/watchlist/${slug}`;
  try {
    await deleteDoc(doc(db, 'collaborators', userId, 'watchlist', slug));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, watchlistPath);
  }
}

export async function fetchCollaboratorProfile(
  userId: string
): Promise<CollaboratorProfile | null> {
  if (!isValidWikiSlug(userId)) return null;
  const collabPath = `collaborators/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'collaborators', userId));
    return snap.exists() ? (snap.data() as CollaboratorProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collabPath);
  }
}

export async function fetchUserEdits(
  targetUserId: string,
  viewerUid: string | null
): Promise<UserEdit[]> {
  if (!isValidWikiSlug(targetUserId)) return [];
  const editsPath = `collaborators/${targetUserId}/edits`;
  const isViewingOwn = viewerUid === targetUserId;

  try {
    const q = query(
      collection(db, 'collaborators', targetUserId, 'edits'),
      isViewingOwn
        ? where('editorId', '==', targetUserId)
        : where('pageVisibility', '==', 'public')
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<UserEdit, 'id'>),
    }));
    return list.sort((a, b) => {
      const ta = a.createdAt?.toMillis() ?? 0;
      const tb = b.createdAt?.toMillis() ?? 0;
      if (tb !== ta) return tb - ta;
      return b.version - a.version;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, editsPath);
  }
}

export async function seedStarterWiki(user: User): Promise<void> {
  const authorName = getUserDisplayName(user);

  const starterPages: {
    slug: string;
    title: string;
    category: string;
    tags: string[];
    content: string;
    summary: string;
  }[] = [
    {
      slug: 'start',
      title: 'Welcome to WazzimaGiygg Maker',
      category: 'general',
      tags: ['home', 'wiki', 'collaboration'],
      summary: 'Initial wiki home page',
      content: `**WazzimaGiygg Maker** is a minimalist collaborative wiki inspired by the classic Wikidot model, built in TypeScript with real-time persistence on Firebase Firestore.

## Quick Start

- **Instant creation by slug**: type any identifier into the **Quick create by slug** box in the sidebar (e.g., \`my-project\`) and press Enter.
- **Wikidot-style internal links**: write \`[[markdown-guide]]\` or \`[[best-practices|Best Practices]]\` to connect pages. Links to pages that do not exist yet appear highlighted so you can create them in one click.
- **Versioned history**: every save records an immutable revision (\`v1\`, \`v2\`, \`v3\`) that can be inspected and restored at any time.

> Tip: Try clicking **Edit** above to modify this page in real time, or open the [[markdown-guide|Complete Markdown Guide]].

## Documentation Map

| Page | Purpose | Access |
| --- | --- | --- |
| [[start]] | Main entry point of the wiki | Public |
| [[markdown-guide]] | Markdown syntax and internal links reference | Public |
| [[best-practices]] | Collaboration and organization conventions | Public |
| [[${DOSSIER_PAGE_SLUG}|${DOSSIER_PAGE_TITLE}]] | Regulatory dossier on LGPD & Marco Civil compliance | Public |
| [[${ECOSYSTEM_PAGE_SLUG}|${ECOSYSTEM_PAGE_TITLE}]] | Directory of official WazzimaGiygg ecosystem products | Public |
| [[${WIKIPEDIA_ABUSES_PAGE_SLUG}|${WIKIPEDIA_ABUSES_PAGE_TITLE}]] | Wikipedia abuses dossier and A Verdade reference | Public |
| [[${STARTER_TEMPLATE_SLUG}|${STARTER_TEMPLATE_TITLE}]] | Reusable MediaWiki-style community template example | Public |
| [[${TEMPLATE_EXAMPLE_PAGE_SLUG}|${TEMPLATE_EXAMPLE_PAGE_TITLE}]] | Live practical examples of MediaWiki templates in action | Public |

## Next Steps

- [x] Sign in with Google to collaborate
- [ ] Explore the [[markdown-guide|Markdown Guide]]
- [ ] Try inserting MediaWiki templates with \`Ctrl+Shift+T\` (\`{{Notice}}\`, \`{{Stub}}\`, \`{{Infobox}}\`)
- [ ] Create your first custom page like [[team-notes|Team Notes]]`,
    },
    {
      slug: 'markdown-guide',
      title: 'Markdown & Internal Links Guide',
      category: 'guides',
      tags: ['markdown', 'syntax', 'reference'],
      summary: 'Essential Markdown reference for collaborators',
      content: `Every page in **WazzimaGiygg Maker** is authored in Markdown with support for tables, task lists, code blocks, and Wikidot-style internal links.

## Wikidot-Style Links

Use double brackets to link to other wiki pages by their identifier (\`:slug\`):

\`\`\`markdown
[[start]]
[[best-practices|Read our Best Practices]]
[[new-page|Create a missing page]]
\`\`\`

When the target page does not exist in Firebase yet, the link renders with a dashed underline — clicking it opens the editor pre-filled with that \`slug\`.

## Text Formatting & Headings

\`\`\`markdown
## Section Heading
### Subsection

Text in **bold**, *italic*, ~~strikethrough~~, and \`inline code\`.
\`\`\`

## Lists & Checklists

- Simple bullet item
- Another item with a [[start|return link]]

- [x] Completed task
- [ ] Pending task

## Tables & Blockquotes

> Blockquotes are great for highlighting editorial notes or architectural decisions.

| Feature | Syntax | Result |
| --- | --- | --- |
| Bold | \`**text**\` | **text** |
| Internal link | \`[[slug]]\` | Direct navigation |
| Code | \`\\\`const x = 1\\\`\` | \`const x = 1\` |

## Infoboxes

Add structured Wiki Infoboxes with \`:::infobox <type>\` blocks (\`general\`, \`character\`, \`location\`, \`item\`, \`organization\`, \`project\`), or use the **Infobox** button in the editor toolbar (\`Ctrl+Shift+I\`):

\`\`\`markdown
:::infobox project
title: WazzimaGiygg Maker
subtitle: Collaborative Markdown Wiki
Status: Active
Stack: TypeScript, React, Firebase
:::
\`\`\`

## MediaWiki Templates (\`{{...}}\`)

Use braces just like MediaWiki to insert notices, maintenance banners, navigation strips, quotes, infoboxes, and custom transcluded templates (\`Ctrl+Shift+T\` opens the template picker):

\`\`\`markdown
{{Notice|type=warning|title=Editorial Review|text=Claims undergoing verification.|date=November 2026}}
{{Stub|Digital Governance}}
{{Under construction}}
{{Citation needed|date=November 2026}}
{{Cleanup|reason=Add citations and convert bullet notes to prose.|date=November 2026}}
{{Verify|status=verified|reviewer=Editorial Board|date=November 2026}}
{{Main|ecossistema-wazzimagiygg|WazzimaGiygg Ecosystem Products}}
{{See also|dossie-wikipedia-abusos|investigacao-lgpd-marco-civil-wmf-wikipedia}}
{{Distinguish|start|Wiki Home}}
{{Quote|text=Open knowledge thrives on verifiable records.|author=Editorial}}
{{Infobox|type=project|title=My Project|Status=Active}}
{{WazzimaGiygg Ecosystem}}
{{Cite web|title=A Verdade|url=https://wazzimagiygg.com/averdade/|publisher=wazzimagiygg.com|date=November 2026}}
\`\`\`

You can also create reusable community templates at slugs starting with \`template-\` or \`predefinicao-\` (for example, [[${STARTER_TEMPLATE_SLUG}|${STARTER_TEMPLATE_TITLE}]] or [[template-welcome|Template:Welcome]]). Use \`<noinclude>...</noinclude>\` for template documentation, \`<includeonly>...</includeonly>\`, and \`{{{parameter|default value}}}\` placeholders. See [[${TEMPLATE_EXAMPLE_PAGE_SLUG}|${TEMPLATE_EXAMPLE_PAGE_TITLE}]] for a full live example article.

## Bibliographic References (\`<ref>\`)

Cite sources anywhere in your article using \`<ref>...</ref>\` tags. Citations are numbered automatically and collected into a formatted **References** section at the bottom of the page with bidirectional jump links:

\`\`\`markdown
Statement grounded in statutory law.<ref>Brazil. Law No. 13.709/2018 (LGPD). https://www.planalto.gov.br</ref>

Named citations can be reused multiple times:<ref name="mci">Law No. 12.965/2014 (Brazilian Civil Rights Framework for the Internet).</ref>
Second mention of the same source.<ref name="mci" />
\`\`\`

## Keyboard Shortcuts

- \`Ctrl+E\` — Switch from **Read** to **Edit** mode
- \`Ctrl+Enter\` / \`Ctrl+S\` — Save revision in the Markdown editor
- \`Ctrl+Shift+T\` — Open **MediaWiki Templates** picker
- \`Ctrl+Shift+R\` — Insert a \`<ref>...</ref>\` bibliographic citation
- \`Ctrl+K\` — Focus the sidebar page filter
- \`?\` — Open the full keyboard shortcuts guide`,
    },
    {
      slug: 'best-practices',
      title: 'Collaboration Best Practices',
      category: 'reference',
      tags: ['organization', 'guidelines', 'team'],
      summary: 'Guidelines to keep the wiki organized',
      content: `To keep your knowledge base clear as your team grows, follow these simple conventions:

## 1. Choose short, descriptive slugs

Prefer lowercase identifiers separated by hyphens, such as \`api-architecture\`, \`meeting-notes\`, or \`glossary\`. Avoid spaces or special characters in page identifiers.

## 2. Always write a revision summary

Before saving in **Edit**, fill in the *Change summary* field (for example: \`Add authentication section\`). This keeps the **History** tab readable for everyone.

## 3. Visibility & Locking

- **Public (Collaborative)**: any verified collaborator can read, comment, and edit.
- **Private (Draft)**: visible only to the original author until ready to publish.
- **Lock editing**: the author can lock a stable page so only the author or admins can modify it.

Return to [[start|Home]] or check the [[markdown-guide|Markdown Guide]].`,
    },
    {
      slug: DOSSIER_PAGE_SLUG,
      title: DOSSIER_PAGE_TITLE,
      category: DOSSIER_PAGE_CATEGORY,
      tags: DOSSIER_PAGE_TAGS,
      summary: DOSSIER_PAGE_SUMMARY,
      content: DOSSIER_PAGE_CONTENT,
    },
    {
      slug: ECOSYSTEM_PAGE_SLUG,
      title: ECOSYSTEM_PAGE_TITLE,
      category: ECOSYSTEM_PAGE_CATEGORY,
      tags: ECOSYSTEM_PAGE_TAGS,
      summary: ECOSYSTEM_PAGE_SUMMARY,
      content: ECOSYSTEM_PAGE_CONTENT,
    },
    {
      slug: WIKIPEDIA_ABUSES_PAGE_SLUG,
      title: WIKIPEDIA_ABUSES_PAGE_TITLE,
      category: WIKIPEDIA_ABUSES_PAGE_CATEGORY,
      tags: WIKIPEDIA_ABUSES_PAGE_TAGS,
      summary: WIKIPEDIA_ABUSES_PAGE_SUMMARY,
      content: WIKIPEDIA_ABUSES_PAGE_CONTENT,
    },
    {
      slug: STARTER_TEMPLATE_SLUG,
      title: STARTER_TEMPLATE_TITLE,
      category: STARTER_TEMPLATE_CATEGORY,
      tags: STARTER_TEMPLATE_TAGS,
      summary: STARTER_TEMPLATE_SUMMARY,
      content: STARTER_TEMPLATE_CONTENT,
    },
    {
      slug: TEMPLATE_EXAMPLE_PAGE_SLUG,
      title: TEMPLATE_EXAMPLE_PAGE_TITLE,
      category: TEMPLATE_EXAMPLE_PAGE_CATEGORY,
      tags: TEMPLATE_EXAMPLE_PAGE_TAGS,
      summary: TEMPLATE_EXAMPLE_PAGE_SUMMARY,
      content: TEMPLATE_EXAMPLE_PAGE_CONTENT,
    },
    ...ENGLISH_COMMUNITY_TEMPLATES,
  ];

  const batch = writeBatch(db);
  let createdCount = 0;

  for (const item of starterPages) {
    const pageRef = doc(db, 'pages', item.slug);
    try {
      const snap = await getDoc(pageRef);
      if (!snap.exists()) {
        createdCount += 1;
        batch.set(pageRef, {
          slug: item.slug,
          title: item.title,
          content: item.content,
          category: item.category,
          tags: item.tags,
          visibility: 'public',
          isLocked: false,
          authorId: user.uid,
          authorName,
          lastEditorId: user.uid,
          lastEditorName: authorName,
          recentEditors: [{ uid: user.uid, name: authorName }],
          version: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(doc(db, 'pages', item.slug, 'revisions', 'v_1'), {
          pageSlug: item.slug,
          pageVisibility: 'public',
          pageAuthorId: user.uid,
          title: item.title,
          content: item.content,
          editorId: user.uid,
          editorName: authorName,
          summary: item.summary,
          version: 1,
          createdAt: serverTimestamp(),
        });

        batch.set(
          doc(db, 'collaborators', user.uid, 'edits', buildEditDocId(item.slug, 1)),
          {
            editorId: user.uid,
            pageSlug: item.slug,
            pageTitle: item.title,
            pageVisibility: 'public',
            summary: item.summary,
            version: 1,
            createdAt: serverTimestamp(),
          }
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `pages/${item.slug}`);
    }
  }

  if (createdCount > 0) {
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'pages');
    }
  }
}

const BUILTIN_EN_SYNC_FLAG = 'wazzimagiygg-builtin-en-v7';

const LEGACY_PORTUGUESE_TITLES: Record<string, string> = {
  [DOSSIER_PAGE_SLUG]: 'Investigação LGPD e Marco Civil — WMF e Wikipédia',
  [ECOSYSTEM_PAGE_SLUG]: 'Produtos do Ecossistema WazzimaGiygg',
  [WIKIPEDIA_ABUSES_PAGE_SLUG]:
    'Dossiê sobre a Wikipédia — Chronus, LittleSunshine, Conde Edmond Dantès, Teles e Johannnes89',
  [TEMPLATE_EXAMPLE_PAGE_SLUG]: 'Exemplo de Uso de Pré-definição (MediaWiki)',
  [STARTER_TEMPLATE_SLUG]: 'Predefinição:Boas-vindas',
};

/**
 * Ensures the built-in English reference articles exist in Firestore for active
 * workspaces when an administrator or bureaucrat signs in, and upgrades unmodified
 * legacy v1 Portuguese seed documents to their English version without overwriting
 * user-customized revisions.
 */
export async function ensureDossierArticlePublished(user: User): Promise<void> {
  if (typeof window !== 'undefined' && localStorage.getItem(BUILTIN_EN_SYNC_FLAG) === '1') {
    return;
  }

  const builtinArticles = [
    {
      slug: DOSSIER_PAGE_SLUG,
      title: DOSSIER_PAGE_TITLE,
      content: DOSSIER_PAGE_CONTENT,
      category: DOSSIER_PAGE_CATEGORY,
      tags: DOSSIER_PAGE_TAGS,
      summary: DOSSIER_PAGE_SUMMARY,
    },
    {
      slug: ECOSYSTEM_PAGE_SLUG,
      title: ECOSYSTEM_PAGE_TITLE,
      content: ECOSYSTEM_PAGE_CONTENT,
      category: ECOSYSTEM_PAGE_CATEGORY,
      tags: ECOSYSTEM_PAGE_TAGS,
      summary: ECOSYSTEM_PAGE_SUMMARY,
    },
    {
      slug: WIKIPEDIA_ABUSES_PAGE_SLUG,
      title: WIKIPEDIA_ABUSES_PAGE_TITLE,
      content: WIKIPEDIA_ABUSES_PAGE_CONTENT,
      category: WIKIPEDIA_ABUSES_PAGE_CATEGORY,
      tags: WIKIPEDIA_ABUSES_PAGE_TAGS,
      summary: WIKIPEDIA_ABUSES_PAGE_SUMMARY,
    },
    {
      slug: STARTER_TEMPLATE_SLUG,
      title: STARTER_TEMPLATE_TITLE,
      content: STARTER_TEMPLATE_CONTENT,
      category: STARTER_TEMPLATE_CATEGORY,
      tags: STARTER_TEMPLATE_TAGS,
      summary: STARTER_TEMPLATE_SUMMARY,
    },
    {
      slug: TEMPLATE_EXAMPLE_PAGE_SLUG,
      title: TEMPLATE_EXAMPLE_PAGE_TITLE,
      content: TEMPLATE_EXAMPLE_PAGE_CONTENT,
      category: TEMPLATE_EXAMPLE_PAGE_CATEGORY,
      tags: TEMPLATE_EXAMPLE_PAGE_TAGS,
      summary: TEMPLATE_EXAMPLE_PAGE_SUMMARY,
    },
    ...ENGLISH_COMMUNITY_TEMPLATES,
  ];

  try {
    const authorName = getUserDisplayName(user);
    const batch = writeBatch(db);
    let pendingWrites = 0;

    for (const item of builtinArticles) {
      const pageRef = doc(db, 'pages', item.slug);
      const snap = await getDoc(pageRef);

      if (!snap.exists()) {
        pendingWrites += 1;
        batch.set(pageRef, {
          slug: item.slug,
          title: item.title,
          content: item.content,
          category: item.category,
          tags: item.tags,
          visibility: 'public',
          isLocked: false,
          authorId: user.uid,
          authorName,
          lastEditorId: user.uid,
          lastEditorName: authorName,
          recentEditors: [{ uid: user.uid, name: authorName }],
          version: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(doc(db, 'pages', item.slug, 'revisions', 'v_1'), {
          pageSlug: item.slug,
          pageVisibility: 'public',
          pageAuthorId: user.uid,
          title: item.title,
          content: item.content,
          editorId: user.uid,
          editorName: authorName,
          summary: item.summary,
          version: 1,
          createdAt: serverTimestamp(),
        });

        batch.set(
          doc(db, 'collaborators', user.uid, 'edits', buildEditDocId(item.slug, 1)),
          {
            editorId: user.uid,
            pageSlug: item.slug,
            pageTitle: item.title,
            pageVisibility: 'public',
            summary: item.summary,
            version: 1,
            createdAt: serverTimestamp(),
          }
        );
      } else {
        const existing = snap.data() as WikiPage;
        const legacyTitle = LEGACY_PORTUGUESE_TITLES[item.slug];
        const isLegacyPortugueseSeed =
          existing.version === 1 && legacyTitle && existing.title === legacyTitle;
        const isWelcomeTemplateMissingRulesLink =
          existing.version === 1 &&
          (item.slug === STARTER_TEMPLATE_SLUG || item.slug === 'template-welcome') &&
          !existing.content.includes('#/terms');
        const isLegacyStarterMarkdownGuide = false;

        if (isLegacyPortugueseSeed || isWelcomeTemplateMissingRulesLink || isLegacyStarterMarkdownGuide) {
          const nextVersion = 2;
          const upgradeSummary = isWelcomeTemplateMissingRulesLink
            ? 'Added WikiMaker usage rules link to welcome template'
            : 'Translated title and description into English';
          pendingWrites += 1;

          batch.update(pageRef, {
            title: item.title,
            content: item.content,
            category: item.category,
            tags: item.tags,
            lastEditorId: user.uid,
            lastEditorName: authorName,
            recentEditors: computeNextRecentEditors(existing, {
              uid: user.uid,
              name: authorName,
            }),
            version: nextVersion,
            updatedAt: serverTimestamp(),
          });

          batch.set(doc(db, 'pages', item.slug, 'revisions', `v_${nextVersion}`), {
            pageSlug: item.slug,
            pageVisibility: existing.visibility,
            pageAuthorId: existing.authorId,
            title: item.title,
            content: item.content,
            editorId: user.uid,
            editorName: authorName,
            summary: upgradeSummary,
            version: nextVersion,
            createdAt: serverTimestamp(),
          });

          batch.set(
            doc(db, 'collaborators', user.uid, 'edits', buildEditDocId(item.slug, nextVersion)),
            {
              editorId: user.uid,
              pageSlug: item.slug,
              pageTitle: item.title,
              pageVisibility: existing.visibility,
              summary: upgradeSummary,
              version: nextVersion,
              createdAt: serverTimestamp(),
            }
          );
        }
      }
    }

    if (pendingWrites > 0) {
      await batch.commit();
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(BUILTIN_EN_SYNC_FLAG, '1');
    }
  } catch (error) {
    console.warn('Could not auto-publish or translate built-in reference articles:', error);
  }
}

export type { PageComment, PageRating, WatchlistItem };
