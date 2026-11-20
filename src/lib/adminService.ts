import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  type DocumentReference,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  type AdminRecord,
  type BlockedUser,
  type CollaboratorProfile,
  type GovernanceRole,
  type LgpdErasureLog,
  type LgpdErasureMode,
  type PageComment,
  type PageRevision,
  VALIDATION_LIMITS,
  type WikiPage,
} from '../types/wiki';
import { ADMIN_EMAIL, db, handleFirestoreError, OperationType } from './firebase';
import { updateWikiPage } from './wikiService';

export interface AdminUserRow {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string | null;
  personalPageSlug: string | null;
  discussionPageSlug: string | null;
  role: GovernanceRole;
  isBootstrappedOwner: boolean;
  blocked: BlockedUser | null;
  pageCount: number;
  editCount: number;
  createdAt: CollaboratorProfile['createdAt'];
}

export interface AdminEditEntry extends PageRevision {
  pageTitle: string;
  isCurrentVersion: boolean;
}

export interface AdminDashboardSnapshot {
  users: AdminUserRow[];
  pages: WikiPage[];
  recentEdits: AdminEditEntry[];
  lgpdLogs: LgpdErasureLog[];
}

export interface UserGovernanceStatus {
  role: GovernanceRole;
  blocked: BlockedUser | null;
}

function sanitizeString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

function getActorDisplayName(user: User): string {
  const raw = user.displayName || user.email?.split('@')[0] || 'Administrator';
  return sanitizeString(raw, VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH) || 'Administrator';
}

function buildEditDocId(slug: string, version: number): string {
  const suffix = `_v${version}`;
  const maxSlugLen = Math.max(1, VALIDATION_LIMITS.SLUG_MAX_LENGTH - suffix.length);
  return `${slug.slice(0, maxSlugLen)}${suffix}`;
}

type BatchOp =
  | { type: 'delete'; ref: DocumentReference }
  | { type: 'update'; ref: DocumentReference; data: Record<string, unknown> }
  | { type: 'set'; ref: DocumentReference; data: Record<string, unknown> };

async function commitOperationsInBatches(ops: BatchOp[], pathContext: string): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.type === 'delete') {
        batch.delete(op.ref);
      } else if (op.type === 'update') {
        batch.update(op.ref, op.data);
      } else {
        batch.set(op.ref, op.data);
      }
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, pathContext);
    }
  }
}

export async function fetchCurrentUserGovernance(user: User): Promise<UserGovernanceStatus> {
  const isBootstrappedBureaucrat = Boolean(
    user.email && user.email === ADMIN_EMAIL && user.emailVerified
  );

  let role: GovernanceRole = isBootstrappedBureaucrat ? 'bureaucrat' : 'member';
  let blocked: BlockedUser | null = null;

  try {
    const [adminSnap, blockedSnap] = await Promise.all([
      getDoc(doc(db, 'admins', user.uid)),
      getDoc(doc(db, 'blocked_users', user.uid)),
    ]);

    if (!isBootstrappedBureaucrat && adminSnap.exists() && user.emailVerified) {
      const data = adminSnap.data() as Partial<AdminRecord>;
      role = data.role === 'bureaucrat' ? 'bureaucrat' : 'admin';
    }

    if (blockedSnap.exists() && !isBootstrappedBureaucrat) {
      blocked = blockedSnap.data() as BlockedUser;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `admins/${user.uid}`);
  }

  return { role, blocked };
}

export async function fetchAdminDashboardData(): Promise<AdminDashboardSnapshot> {
  let collaborators: CollaboratorProfile[] = [];
  let adminRecords: AdminRecord[] = [];
  let blockedUsers: BlockedUser[] = [];
  let pages: WikiPage[] = [];
  let lgpdLogs: LgpdErasureLog[] = [];

  try {
    const [collabSnap, adminsSnap, blockedSnap, pagesSnap, lgpdSnap] = await Promise.all([
      getDocs(collection(db, 'collaborators')),
      getDocs(collection(db, 'admins')),
      getDocs(collection(db, 'blocked_users')),
      getDocs(collection(db, 'pages')),
      getDocs(collection(db, 'lgpd_logs')),
    ]);

    collaborators = collabSnap.docs.map((d) => d.data() as CollaboratorProfile);
    adminRecords = adminsSnap.docs.map((d) => d.data() as AdminRecord);
    blockedUsers = blockedSnap.docs.map((d) => d.data() as BlockedUser);
    pages = pagesSnap.docs.map((d) => d.data() as WikiPage);
    lgpdLogs = lgpdSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<LgpdErasureLog, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'admin-dashboard');
  }

  // Fetch private emails and all page revisions in parallel for complete moderation visibility
  const emailByUid = new Map<string, string>();
  const allEdits: AdminEditEntry[] = [];

  try {
    const [privateSnaps, revisionSnaps] = await Promise.all([
      Promise.all(
        collaborators.map((c) => getDoc(doc(db, 'users', c.uid, 'private', 'info')))
      ),
      Promise.all(pages.map((p) => getDocs(collection(db, 'pages', p.slug, 'revisions')))),
    ]);

    privateSnaps.forEach((snap, idx) => {
      if (snap.exists()) {
        const email = snap.data().email;
        if (typeof email === 'string') {
          emailByUid.set(collaborators[idx].uid, email);
        }
      }
    });

    revisionSnaps.forEach((snap, idx) => {
      const parentPage = pages[idx];
      snap.docs.forEach((revDoc) => {
        const revData = revDoc.data() as Omit<PageRevision, 'id'>;
        allEdits.push({
          id: revDoc.id,
          ...revData,
          pageTitle: parentPage.title,
          isCurrentVersion: revData.version === parentPage.version,
        });
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'admin-revisions');
  }

  const adminRoleByUid = new Map<string, GovernanceRole>();
  for (const rec of adminRecords) {
    adminRoleByUid.set(rec.uid, rec.role === 'bureaucrat' ? 'bureaucrat' : 'admin');
  }

  const blockedByUid = new Map<string, BlockedUser>();
  for (const blk of blockedUsers) {
    blockedByUid.set(blk.uid, blk);
  }

  const pageCountByUid = new Map<string, number>();
  for (const page of pages) {
    pageCountByUid.set(page.authorId, (pageCountByUid.get(page.authorId) ?? 0) + 1);
  }

  const editCountByUid = new Map<string, number>();
  for (const rev of allEdits) {
    editCountByUid.set(rev.editorId, (editCountByUid.get(rev.editorId) ?? 0) + 1);
  }

  // Combine collaborators and any orphaned blocked/admin UIDs
  const userMap = new Map<string, AdminUserRow>();

  for (const collab of collaborators) {
    const email = emailByUid.get(collab.uid) ?? null;
    const isBootstrappedOwner = email === ADMIN_EMAIL;
    const role: GovernanceRole = isBootstrappedOwner
      ? 'bureaucrat'
      : adminRoleByUid.get(collab.uid) ?? 'member';

    userMap.set(collab.uid, {
      uid: collab.uid,
      displayName: collab.displayName,
      photoURL: collab.photoURL,
      email,
      personalPageSlug: collab.personalPageSlug || null,
      discussionPageSlug: collab.discussionPageSlug || null,
      role,
      isBootstrappedOwner,
      blocked: blockedByUid.get(collab.uid) ?? null,
      pageCount: pageCountByUid.get(collab.uid) ?? 0,
      editCount: editCountByUid.get(collab.uid) ?? 0,
      createdAt: collab.createdAt,
    });
  }

  for (const blk of blockedUsers) {
    if (!userMap.has(blk.uid)) {
      userMap.set(blk.uid, {
        uid: blk.uid,
        displayName: blk.displayName,
        photoURL: '',
        email: emailByUid.get(blk.uid) ?? null,
        personalPageSlug: null,
        discussionPageSlug: null,
        role: adminRoleByUid.get(blk.uid) ?? 'member',
        isBootstrappedOwner: false,
        blocked: blk,
        pageCount: pageCountByUid.get(blk.uid) ?? 0,
        editCount: editCountByUid.get(blk.uid) ?? 0,
        createdAt: blk.createdAt,
      });
    }
  }

  const users = Array.from(userMap.values()).sort((a, b) => {
    const rank = { bureaucrat: 0, admin: 1, member: 2 };
    if (rank[a.role] !== rank[b.role]) return rank[a.role] - rank[b.role];
    return a.displayName.localeCompare(b.displayName, 'en-US');
  });

  const recentEdits = allEdits.sort((a, b) => {
    const ta = a.createdAt?.toMillis() ?? 0;
    const tb = b.createdAt?.toMillis() ?? 0;
    if (tb !== ta) return tb - ta;
    return b.version - a.version;
  });

  const sortedLogs = [...lgpdLogs].sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)
  );

  return {
    users,
    pages,
    recentEdits,
    lgpdLogs: sortedLogs,
  };
}

export async function setUserGovernanceRole(
  targetUid: string,
  newRole: GovernanceRole,
  actor: User
): Promise<void> {
  const adminPath = `admins/${targetUid}`;
  const adminRef = doc(db, 'admins', targetUid);

  try {
    if (newRole === 'member') {
      const snap = await getDoc(adminRef);
      if (snap.exists()) {
        await deleteDoc(adminRef);
      }
      return;
    }

    const snap = await getDoc(adminRef);
    if (!snap.exists()) {
      await setDoc(adminRef, {
        uid: targetUid,
        role: newRole,
        grantedBy: actor.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const data = snap.data() as Partial<AdminRecord>;
      if (!data.createdAt || !data.grantedBy) {
        const batch = writeBatch(db);
        batch.delete(adminRef);
        batch.set(adminRef, {
          uid: targetUid,
          role: newRole,
          grantedBy: actor.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      } else {
        await updateDoc(adminRef, {
          role: newRole,
          grantedBy: actor.uid,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, adminPath);
  }
}

export async function blockUserAccount(
  targetUid: string,
  displayName: string,
  reason: string,
  actor: User
): Promise<void> {
  const blockPath = `blocked_users/${targetUid}`;
  const safeName =
    sanitizeString(displayName, VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH) || 'Collaborator';
  const safeReason =
    sanitizeString(reason, VALIDATION_LIMITS.BLOCK_REASON_MAX_LENGTH) ||
    'Blocked by wiki administration';
  const actorName = getActorDisplayName(actor);

  try {
    await setDoc(doc(db, 'blocked_users', targetUid), {
      uid: targetUid,
      displayName: safeName,
      reason: safeReason,
      blockedBy: actor.uid,
      blockedByName: actorName,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, blockPath);
  }
}

export async function unblockUserAccount(targetUid: string): Promise<void> {
  const blockPath = `blocked_users/${targetUid}`;
  try {
    await deleteDoc(doc(db, 'blocked_users', targetUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, blockPath);
  }
}

export async function deletePageAsAdmin(slug: string): Promise<void> {
  const pagePath = `pages/${slug}`;
  try {
    const [revsSnap, commentsSnap] = await Promise.all([
      getDocs(collection(db, 'pages', slug, 'revisions')),
      getDocs(collection(db, 'pages', slug, 'comments')),
    ]);

    const ops: BatchOp[] = [];
    revsSnap.forEach((d) => {
      ops.push({ type: 'delete', ref: d.ref });
    });
    commentsSnap.forEach((d) => {
      ops.push({ type: 'delete', ref: d.ref });
    });
    ops.push({ type: 'delete', ref: doc(db, 'pages', slug) });

    await commitOperationsInBatches(ops, pagePath);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pagePath);
  }
}

export async function removeRevisionEditAsAdmin(
  page: WikiPage,
  targetRevision: PageRevision,
  pageRevisions: PageRevision[],
  actor: User
): Promise<'reverted-and-removed' | 'removed-revision' | 'deleted-page'> {
  const sorted = [...pageRevisions].sort((a, b) => b.version - a.version);

  // If this is the only revision of the page, delete the entire page
  if (sorted.length <= 1) {
    await deletePageAsAdmin(page.slug);
    if (targetRevision.editorId && targetRevision.editorId !== 'lgpd-anonymized') {
      try {
        const editRef = doc(
          db,
          'collaborators',
          targetRevision.editorId,
          'edits',
          buildEditDocId(page.slug, targetRevision.version)
        );
        const editSnap = await getDoc(editRef);
        if (editSnap.exists()) {
          await deleteDoc(editRef);
        }
      } catch {
        // Edit log entry may already be removed
      }
    }
    return 'deleted-page';
  }

  const isLatest = targetRevision.version === page.version;

  // If removing the latest live edit, revert page content to the clean previous revision first
  if (isLatest) {
    const fallbackRev = sorted.find((r) => r.id !== targetRevision.id);
    if (fallbackRev) {
      await updateWikiPage(
        page,
        {
          slug: page.slug,
          title: fallbackRev.title,
          content: fallbackRev.content,
          category: page.category,
          tags: page.tags,
          visibility: page.visibility,
          isLocked: page.isLocked,
          summary: `Moderation: reverted edit v${targetRevision.version}`,
        },
        actor,
        true
      );
    }
  }

  try {
    await deleteDoc(doc(db, 'pages', page.slug, 'revisions', targetRevision.id));
    if (targetRevision.editorId && targetRevision.editorId !== 'lgpd-anonymized') {
      const editRef = doc(
        db,
        'collaborators',
        targetRevision.editorId,
        'edits',
        buildEditDocId(page.slug, targetRevision.version)
      );
      const editSnap = await getDoc(editRef);
      if (editSnap.exists()) {
        await deleteDoc(editRef);
      }
    }
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `pages/${page.slug}/revisions/${targetRevision.id}`
    );
  }

  return isLatest ? 'reverted-and-removed' : 'removed-revision';
}

export async function executeLgpdUserRemoval(
  targetUid: string,
  mode: LgpdErasureMode,
  actor: User,
  actorIsBureaucrat: boolean
): Promise<{ summary: string }> {
  const actorName = getActorDisplayName(actor);
  const ops: BatchOp[] = [];

  let deletedPiiCount = 0;
  let deletedPersonalPages = 0;
  let deletedPages = 0;
  let anonymizedPages = 0;
  let affectedRevisions = 0;
  let affectedComments = 0;
  let deletedEditLogs = 0;

  try {
    const [collabSnap, privSnap, blockedSnap, adminSnap, userEditsSnap, pagesSnap] =
      await Promise.all([
        getDoc(doc(db, 'collaborators', targetUid)),
        getDoc(doc(db, 'users', targetUid, 'private', 'info')),
        getDoc(doc(db, 'blocked_users', targetUid)),
        getDoc(doc(db, 'admins', targetUid)),
        getDocs(collection(db, 'collaborators', targetUid, 'edits')),
        getDocs(collection(db, 'pages')),
      ]);

    const collabData = collabSnap.exists() ? (collabSnap.data() as CollaboratorProfile) : null;

    if (privSnap.exists()) {
      ops.push({ type: 'delete', ref: privSnap.ref });
      deletedPiiCount += 1;
    }

    if (collabSnap.exists()) {
      ops.push({ type: 'delete', ref: collabSnap.ref });
      deletedPiiCount += 1;
    }

    if (blockedSnap.exists()) {
      ops.push({ type: 'delete', ref: blockedSnap.ref });
    }

    if (actorIsBureaucrat && adminSnap.exists()) {
      ops.push({ type: 'delete', ref: adminSnap.ref });
    }

    userEditsSnap.forEach((d) => {
      ops.push({ type: 'delete', ref: d.ref });
      deletedEditLogs += 1;
    });

    const pages = pagesSnap.docs.map((d) => ({
      ref: d.ref,
      data: d.data() as WikiPage,
    }));

    const subcollectionSnaps = await Promise.all(
      pages.map(async ({ ref, data }) => {
        const [revsSnap, commentsSnap] = await Promise.all([
          getDocs(collection(db, 'pages', data.slug, 'revisions')),
          getDocs(collection(db, 'pages', data.slug, 'comments')),
        ]);
        return { ref, data, revsSnap, commentsSnap };
      })
    );

    for (const { ref, data, revsSnap, commentsSnap } of subcollectionSnaps) {
      const isPersonalOrPrivatePage =
        data.slug === collabData?.personalPageSlug ||
        data.slug === collabData?.discussionPageSlug ||
        (data.authorId === targetUid && data.tags.includes('personal')) ||
        (data.authorId === targetUid && data.visibility === 'private');

      const shouldDeleteEntirePage =
        isPersonalOrPrivatePage || (mode === 'purge' && data.authorId === targetUid);

      if (shouldDeleteEntirePage) {
        revsSnap.forEach((d) => {
          ops.push({ type: 'delete', ref: d.ref });
          affectedRevisions += 1;
        });
        commentsSnap.forEach((d) => {
          ops.push({ type: 'delete', ref: d.ref });
          affectedComments += 1;
        });
        ops.push({ type: 'delete', ref });
        if (isPersonalOrPrivatePage) {
          deletedPersonalPages += 1;
        } else {
          deletedPages += 1;
        }
        continue;
      }

      // Remaining shared pages: anonymize author/lastEditor references if matching targetUid
      const isAuthor = data.authorId === targetUid;
      const isLastEditor = data.lastEditorId === targetUid;
      if (isAuthor || isLastEditor) {
        ops.push({
          type: 'update',
          ref,
          data: {
            authorId: isAuthor ? 'lgpd-anonymized' : data.authorId,
            authorName: isAuthor ? 'Removed User (LGPD)' : data.authorName,
            lastEditorId: isLastEditor ? 'lgpd-anonymized' : data.lastEditorId,
            lastEditorName: isLastEditor ? 'Removed User (LGPD)' : data.lastEditorName,
            updatedAt: serverTimestamp(),
          },
        });
        anonymizedPages += 1;
      }

      revsSnap.forEach((revDoc) => {
        const rev = revDoc.data() as Omit<PageRevision, 'id'>;
        if (rev.editorId === targetUid || rev.pageAuthorId === targetUid) {
          ops.push({
            type: 'update',
            ref: revDoc.ref,
            data: {
              editorId: rev.editorId === targetUid ? 'lgpd-anonymized' : rev.editorId,
              editorName: rev.editorId === targetUid ? 'Removed User (LGPD)' : rev.editorName,
              pageAuthorId: rev.pageAuthorId === targetUid ? 'lgpd-anonymized' : rev.pageAuthorId,
            },
          });
          affectedRevisions += 1;
        }
      });

      commentsSnap.forEach((commentDoc) => {
        const comment = commentDoc.data() as Omit<PageComment, 'id'>;
        if (comment.authorId === targetUid || comment.pageAuthorId === targetUid) {
          if (mode === 'purge' && comment.authorId === targetUid) {
            ops.push({ type: 'delete', ref: commentDoc.ref });
          } else {
            ops.push({
              type: 'update',
              ref: commentDoc.ref,
              data: {
                authorId: comment.authorId === targetUid ? 'lgpd-anonymized' : comment.authorId,
                authorName:
                  comment.authorId === targetUid ? 'Removed User (LGPD)' : comment.authorName,
                pageAuthorId:
                  comment.pageAuthorId === targetUid ? 'lgpd-anonymized' : comment.pageAuthorId,
              },
            });
          }
          affectedComments += 1;
        }
      });
    }

    const summary = sanitizeString(
      `LGPD ${mode}: ${deletedPiiCount} identity/PII records, ${deletedPersonalPages} personal/private pages, ${deletedPages} authored pages deleted, ${anonymizedPages} shared pages anonymized, ${affectedRevisions} revisions, ${affectedComments} comments, ${deletedEditLogs} activity logs`,
      VALIDATION_LIMITS.LGPD_SUMMARY_MAX_LENGTH
    );

    const logRef = doc(collection(db, 'lgpd_logs'));
    ops.push({
      type: 'set',
      ref: logRef,
      data: {
        targetUid,
        mode,
        summary,
        executedBy: actor.uid,
        executedByName: actorName,
        createdAt: serverTimestamp(),
      },
    });

    await commitOperationsInBatches(ops, `lgpd/${targetUid}`);
    return { summary };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `lgpd/${targetUid}`);
  }
}
