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
  type PageRevision,
  type PageVisibility,
  type UserEdit,
  VALIDATION_LIMITS,
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
import { db, handleFirestoreError, OperationType } from './firebase';
import { isValidWikiSlug, serializeInfoboxBlock, toWikiSlug } from './markdownUtils';

function sanitizeString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
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

function buildDiscussionPageContent(
  displayName: string,
  personalPageSlug: string
): string {
  return `This is the dedicated discussion page for **${displayName}**.

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

      if (!discussionSnap.exists()) {
        const discussionTitle = sanitizeString(
          `Discussion: ${displayName}`,
          VALIDATION_LIMITS.TITLE_MAX_LENGTH
        );
        const discussionContent = buildDiscussionPageContent(displayName, resolvedPersonalSlug);
        const discussionSummary = 'Created personal discussion page';
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
      }

      await batch.commit();
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
    authorId: user.uid,
    authorName,
    lastEditorId: user.uid,
    lastEditorName: authorName,
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
  const title = sanitizeString(input.title, VALIDATION_LIMITS.TITLE_MAX_LENGTH);
  if (!title) {
    throw new Error('Page title is required.');
  }

  const content = input.content.slice(0, VALIDATION_LIMITS.CONTENT_MAX_LENGTH);
  const category = sanitizeCategory(input.category);
  const tags = sanitizeTags(input.tags);
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

  const updatePayload: Record<string, unknown> = {
    title,
    content,
    category,
    tags,
    lastEditorId: user.uid,
    lastEditorName: editorName,
    version: nextVersion,
    updatedAt: serverTimestamp(),
  };

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
      const [revsSnap, commentsSnap, ownerEditsSnap] = await Promise.all([
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
    const [revsSnap, commentsSnap] = await Promise.all([
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
    ]);

    revsSnap.forEach((d) => batch.delete(d.ref));
    commentsSnap.forEach((d) => batch.delete(d.ref));
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

## Next Steps

- [x] Sign in with Google to collaborate
- [ ] Explore the [[markdown-guide|Markdown Guide]]
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

## Bibliographic References (\`<ref>\`)

Cite sources anywhere in your article using \`<ref>...</ref>\` tags. Citations are numbered automatically and collected into a formatted **Referências** section at the bottom of the page with bidirectional jump links:

\`\`\`markdown
Statement grounded in Brazilian law.<ref>Brasil. Lei nº 13.709/2018 (LGPD). https://www.planalto.gov.br</ref>

Named citations can be reused multiple times:<ref name="mci">Lei nº 12.965/2014 (Marco Civil da Internet).</ref>
Second mention of the same source.<ref name="mci" />
\`\`\`

## Keyboard Shortcuts

- \`Ctrl+E\` — Switch from **Read** to **Edit** mode
- \`Ctrl+Enter\` / \`Ctrl+S\` — Save revision in the Markdown editor
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

const DOSSIER_SEED_FLAG = 'wazzimagiygg-dossier-seeded-v1';

/**
 * Ensures the regulatory dossier article exists in Firestore for active workspaces
 * when an administrator or bureaucrat signs in, without respawning deleted pages.
 */
export async function ensureDossierArticlePublished(user: User): Promise<void> {
  if (typeof window !== 'undefined' && localStorage.getItem(DOSSIER_SEED_FLAG) === '1') {
    return;
  }

  const pageRef = doc(db, 'pages', DOSSIER_PAGE_SLUG);
  try {
    const snap = await getDoc(pageRef);
    if (snap.exists()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(DOSSIER_SEED_FLAG, '1');
      }
      return;
    }

    const authorName = getUserDisplayName(user);
    const batch = writeBatch(db);

    batch.set(pageRef, {
      slug: DOSSIER_PAGE_SLUG,
      title: DOSSIER_PAGE_TITLE,
      content: DOSSIER_PAGE_CONTENT,
      category: DOSSIER_PAGE_CATEGORY,
      tags: DOSSIER_PAGE_TAGS,
      visibility: 'public',
      isLocked: false,
      authorId: user.uid,
      authorName,
      lastEditorId: user.uid,
      lastEditorName: authorName,
      version: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'pages', DOSSIER_PAGE_SLUG, 'revisions', 'v_1'), {
      pageSlug: DOSSIER_PAGE_SLUG,
      pageVisibility: 'public',
      pageAuthorId: user.uid,
      title: DOSSIER_PAGE_TITLE,
      content: DOSSIER_PAGE_CONTENT,
      editorId: user.uid,
      editorName: authorName,
      summary: DOSSIER_PAGE_SUMMARY,
      version: 1,
      createdAt: serverTimestamp(),
    });

    batch.set(
      doc(db, 'collaborators', user.uid, 'edits', buildEditDocId(DOSSIER_PAGE_SLUG, 1)),
      {
        editorId: user.uid,
        pageSlug: DOSSIER_PAGE_SLUG,
        pageTitle: DOSSIER_PAGE_TITLE,
        pageVisibility: 'public',
        summary: DOSSIER_PAGE_SUMMARY,
        version: 1,
        createdAt: serverTimestamp(),
      }
    );

    await batch.commit();
    if (typeof window !== 'undefined') {
      localStorage.setItem(DOSSIER_SEED_FLAG, '1');
    }
  } catch (error) {
    console.warn('Could not auto-publish dossier article:', error);
  }
}

export type { PageComment };
