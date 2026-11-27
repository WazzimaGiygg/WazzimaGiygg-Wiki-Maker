import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  type AdminDiscussionCategory,
  type AdminDiscussionPost,
  type AdminDiscussionStatus,
  type AdminDiscussionThread,
  type LgpdRequest,
  type LgpdRequestStatus,
  type LgpdRequestType,
  type SockpuppetCase,
  type SockpuppetCaseStatus,
  VALIDATION_LIMITS,
} from '../types/wiki';
import type { AdminEditEntry, AdminUserRow } from './adminService';
import { db, handleFirestoreError, OperationType } from './firebase';

function sanitizeString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

function getActorDisplayName(user: User): string {
  const raw = user.displayName || user.email?.split('@')[0] || 'Administrator';
  return sanitizeString(raw, VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH) || 'Administrator';
}

function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.slice(0, VALIDATION_LIMITS.SLUG_MAX_LENGTH);
}

// ============================================================================
// 1. ACCOUNT VERIFICATION & SOCKPUPPET INVESTIGATION SIGNALS + CASES
// ============================================================================

export type SignalConfidence = 'high' | 'medium' | 'low';

export interface SockpuppetSignalPair {
  pairKey: string;
  userA: AdminUserRow;
  userB: AdminUserRow;
  score: number;
  confidence: SignalConfidence;
  reasons: string[];
  sharedPages: string[];
  closestEditGapMinutes: number | null;
}

const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
]);

function normalizeEmailCanonicalLocal(email: string): { canonicalLocal: string; domain: string } | null {
  const lower = email.trim().toLowerCase();
  const atIdx = lower.indexOf('@');
  if (atIdx <= 0) return null;
  let local = lower.slice(0, atIdx);
  let domain = lower.slice(atIdx + 1);
  if (domain === 'googlemail.com') domain = 'gmail.com';
  const plusIdx = local.indexOf('+');
  if (plusIdx > 0) local = local.slice(0, plusIdx);
  if (domain === 'gmail.com') {
    local = local.replace(/\./g, '');
  }
  return { canonicalLocal: local, domain };
}

function normalizeHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

export function analyzeSockpuppetSignals(
  users: AdminUserRow[],
  recentEdits: AdminEditEntry[]
): SockpuppetSignalPair[] {
  const activeUsers = users.filter(
    (u) => u.uid !== 'lgpd-anonymized' && u.uid !== 'builtin-editorial'
  );
  if (activeUsers.length < 2) return [];

  // Map user UID -> map of pageSlug -> timestamps (ms)
  const editsByUserPage = new Map<string, Map<string, number[]>>();
  for (const edit of recentEdits) {
    if (!edit.editorId || edit.editorId === 'lgpd-anonymized') continue;
    let userPages = editsByUserPage.get(edit.editorId);
    if (!userPages) {
      userPages = new Map();
      editsByUserPage.set(edit.editorId, userPages);
    }
    let times = userPages.get(edit.pageSlug);
    if (!times) {
      times = [];
      userPages.set(edit.pageSlug, times);
    }
    const ms = edit.createdAt?.toMillis() ?? 0;
    if (ms > 0) times.push(ms);
  }

  const pairs: SockpuppetSignalPair[] = [];

  for (let i = 0; i < activeUsers.length; i += 1) {
    for (let j = i + 1; j < activeUsers.length; j += 1) {
      const a = activeUsers[i];
      const b = activeUsers[j];
      let score = 0;
      const reasons: string[] = [];

      // Signal 1: Email alias / shared local-part / shared custom domain
      if (a.email && b.email) {
        const parsedA = normalizeEmailCanonicalLocal(a.email);
        const parsedB = normalizeEmailCanonicalLocal(b.email);
        if (parsedA && parsedB) {
          if (parsedA.canonicalLocal === parsedB.canonicalLocal && parsedA.domain === parsedB.domain) {
            score += 60;
            reasons.push('Canonical email alias match (dot/+ variation on same mailbox)');
          } else if (
            parsedA.canonicalLocal.length >= 4 &&
            parsedA.canonicalLocal === parsedB.canonicalLocal
          ) {
            score += 35;
            reasons.push(`Identical email username "${parsedA.canonicalLocal}" across providers`);
          } else if (
            parsedA.domain === parsedB.domain &&
            !GENERIC_EMAIL_DOMAINS.has(parsedA.domain)
          ) {
            score += 25;
            reasons.push(`Shared non-public email domain (@${parsedA.domain})`);
          }
        }
      }

      // Signal 2: Display name similarity (stripping numbers/punctuation)
      const handleA = normalizeHandle(a.displayName);
      const handleB = normalizeHandle(b.displayName);
      if (handleA.length >= 4 && handleB.length >= 4) {
        if (handleA === handleB) {
          score += 35;
          reasons.push('Near-identical normalized display name');
        } else if (handleA.includes(handleB) || handleB.includes(handleA)) {
          score += 18;
          reasons.push('Overlapping display name pattern');
        }
      }

      // Signal 3: Co-editing overlap & close temporal windows on identical articles
      const pagesA = editsByUserPage.get(a.uid);
      const pagesB = editsByUserPage.get(b.uid);
      const sharedPages: string[] = [];
      let minGapMs: number | null = null;

      if (pagesA && pagesB) {
        for (const [slug, timesA] of pagesA.entries()) {
          const timesB = pagesB.get(slug);
          if (!timesB) continue;
          sharedPages.push(slug);
          for (const ta of timesA) {
            for (const tb of timesB) {
              const diff = Math.abs(ta - tb);
              if (minGapMs === null || diff < minGapMs) {
                minGapMs = diff;
              }
            }
          }
        }
      }

      if (sharedPages.length >= 2) {
        score += 20 + Math.min(20, sharedPages.length * 5);
        reasons.push(`Co-edited ${sharedPages.length} identical articles`);
      } else if (sharedPages.length === 1 && (a.blocked || b.blocked)) {
        score += 15;
        reasons.push('Shared article editing overlap with a blocked account');
      }

      const closestEditGapMinutes =
        minGapMs !== null ? Math.round(minGapMs / 60000) : null;

      if (closestEditGapMinutes !== null && closestEditGapMinutes <= 30) {
        score += 25;
        reasons.push(`Edited same page within ${closestEditGapMinutes} min`);
      } else if (closestEditGapMinutes !== null && closestEditGapMinutes <= 180) {
        score += 10;
        reasons.push(`Edited same page within ${closestEditGapMinutes} min`);
      }

      // Signal 4: Block evasion risk (one blocked, one active with other overlap)
      if ((a.blocked && !b.blocked) || (!a.blocked && b.blocked)) {
        if (score > 0) {
          score += 15;
          reasons.push('Potential block-evasion relationship (one account is blocked)');
        }
      }

      // Signal 5: Account creation proximity (within 48h of each other)
      const createdA = a.createdAt?.toMillis() ?? 0;
      const createdB = b.createdAt?.toMillis() ?? 0;
      if (createdA > 0 && createdB > 0) {
        const createdGapHours = Math.abs(createdA - createdB) / 3600000;
        if (createdGapHours <= 24 && score > 0) {
          score += 12;
          reasons.push('Accounts registered within 24 hours of each other');
        }
      }

      if (score >= 18 && reasons.length > 0) {
        const confidence: SignalConfidence =
          score >= 55 ? 'high' : score >= 30 ? 'medium' : 'low';
        pairs.push({
          pairKey: `${a.uid}__${b.uid}`,
          userA: a,
          userB: b,
          score,
          confidence,
          reasons,
          sharedPages,
          closestEditGapMinutes,
        });
      }
    }
  }

  return pairs.sort((x, y) => y.score - x.score);
}

export async function fetchSockpuppetCases(): Promise<SockpuppetCase[]> {
  try {
    const snap = await getDocs(collection(db, 'sockpuppet_cases'));
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SockpuppetCase, 'id'>),
    }));
    return list.sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'sockpuppet_cases');
  }
}

export async function createSockpuppetCase(input: {
  title: string;
  masterUid: string;
  suspectedUids: string[];
  evidenceSummary: string;
  status?: SockpuppetCaseStatus;
  resolutionNotes?: string;
  actor: User;
}): Promise<SockpuppetCase> {
  const caseId = makeDocId('spi');
  const actorName = getActorDisplayName(input.actor);
  const safeSuspects = Array.from(
    new Set(input.suspectedUids.map((u) => u.trim()).filter(Boolean))
  ).slice(0, VALIDATION_LIMITS.SOCKPUPPET_SUSPECTS_MAX_COUNT);

  if (safeSuspects.length === 0) {
    throw new Error('Select at least one suspected account for the investigation case.');
  }

  const payload = {
    id: caseId,
    title: sanitizeString(input.title, VALIDATION_LIMITS.TITLE_MAX_LENGTH) || 'Account verification case',
    masterUid: input.masterUid.trim().slice(0, VALIDATION_LIMITS.SLUG_MAX_LENGTH),
    suspectedUids: safeSuspects,
    evidenceSummary:
      sanitizeString(input.evidenceSummary, VALIDATION_LIMITS.SOCKPUPPET_EVIDENCE_MAX_LENGTH) ||
      'Opened for manual sockpuppet verification.',
    status: input.status ?? 'open',
    resolutionNotes: sanitizeString(
      input.resolutionNotes ?? '',
      VALIDATION_LIMITS.SOCKPUPPET_RESOLUTION_MAX_LENGTH
    ),
    createdBy: input.actor.uid,
    createdByName: actorName,
    updatedBy: input.actor.uid,
    updatedByName: actorName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'sockpuppet_cases', caseId), payload);
    return {
      ...payload,
      createdAt: null,
      updatedAt: null,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `sockpuppet_cases/${caseId}`);
  }
}

export async function updateSockpuppetCase(
  caseId: string,
  updates: {
    title: string;
    masterUid: string;
    suspectedUids: string[];
    evidenceSummary: string;
    status: SockpuppetCaseStatus;
    resolutionNotes: string;
  },
  actor: User
): Promise<void> {
  const actorName = getActorDisplayName(actor);
  const safeSuspects = Array.from(
    new Set(updates.suspectedUids.map((u) => u.trim()).filter(Boolean))
  ).slice(0, VALIDATION_LIMITS.SOCKPUPPET_SUSPECTS_MAX_COUNT);

  try {
    await updateDoc(doc(db, 'sockpuppet_cases', caseId), {
      title: sanitizeString(updates.title, VALIDATION_LIMITS.TITLE_MAX_LENGTH) || 'Account verification case',
      masterUid: updates.masterUid.trim().slice(0, VALIDATION_LIMITS.SLUG_MAX_LENGTH),
      suspectedUids: safeSuspects,
      evidenceSummary:
        sanitizeString(updates.evidenceSummary, VALIDATION_LIMITS.SOCKPUPPET_EVIDENCE_MAX_LENGTH) ||
        'Updated investigation details.',
      status: updates.status,
      resolutionNotes: sanitizeString(
        updates.resolutionNotes,
        VALIDATION_LIMITS.SOCKPUPPET_RESOLUTION_MAX_LENGTH
      ),
      updatedBy: actor.uid,
      updatedByName: actorName,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `sockpuppet_cases/${caseId}`);
  }
}

export async function deleteSockpuppetCase(caseId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'sockpuppet_cases', caseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `sockpuppet_cases/${caseId}`);
  }
}

// ============================================================================
// 2. LGPD REQUESTS QUEUE (USER SUBMISSION + ADMIN REVIEW / EXECUTION)
// ============================================================================

export async function fetchAllLgpdRequests(): Promise<LgpdRequest[]> {
  try {
    const snap = await getDocs(collection(db, 'lgpd_requests'));
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<LgpdRequest, 'id'>),
    }));
    const statusOrder: Record<LgpdRequestStatus, number> = {
      pending: 0,
      'in-review': 1,
      completed: 2,
      rejected: 3,
    };
    return list.sort((a, b) => {
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'lgpd_requests');
  }
}

export async function fetchMyLgpdRequests(uid: string): Promise<LgpdRequest[]> {
  try {
    const q = query(collection(db, 'lgpd_requests'), where('requesterUid', '==', uid));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<LgpdRequest, 'id'>),
    }));
    return list.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'lgpd_requests');
  }
}

export async function submitLgpdRequest(input: {
  requesterUid: string;
  requesterName: string;
  requestType: LgpdRequestType;
  details: string;
}): Promise<LgpdRequest> {
  const requestId = makeDocId('lgpd');
  const safeName =
    sanitizeString(input.requesterName, VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH) || 'Collaborator';
  const safeDetails =
    sanitizeString(input.details, VALIDATION_LIMITS.LGPD_REQUEST_DETAILS_MAX_LENGTH) ||
    'LGPD data subject request submitted.';

  const payload = {
    id: requestId,
    requesterUid: input.requesterUid.trim().slice(0, VALIDATION_LIMITS.SLUG_MAX_LENGTH),
    requesterName: safeName,
    requestType: input.requestType,
    details: safeDetails,
    status: 'pending' as const,
    resolutionNote: '',
    reviewedBy: '',
    reviewedByName: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'lgpd_requests', requestId), payload);
    return {
      ...payload,
      createdAt: null,
      updatedAt: null,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `lgpd_requests/${requestId}`);
  }
}

export async function updateLgpdRequestStatus(
  requestId: string,
  status: LgpdRequestStatus,
  resolutionNote: string,
  actor: User
): Promise<void> {
  const actorName = getActorDisplayName(actor);
  try {
    await updateDoc(doc(db, 'lgpd_requests', requestId), {
      status,
      resolutionNote: sanitizeString(
        resolutionNote,
        VALIDATION_LIMITS.LGPD_REQUEST_RESOLUTION_MAX_LENGTH
      ),
      reviewedBy: actor.uid,
      reviewedByName: actorName,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `lgpd_requests/${requestId}`);
  }
}

export async function deleteLgpdRequest(requestId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'lgpd_requests', requestId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `lgpd_requests/${requestId}`);
  }
}

// ============================================================================
// 3. ADMINISTRATORS & BUREAUCRATS PRIVATE DISCUSSION AREA
// ============================================================================

export async function fetchAdminDiscussionThreads(): Promise<AdminDiscussionThread[]> {
  try {
    const snap = await getDocs(collection(db, 'admin_discussions'));
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AdminDiscussionThread, 'id'>),
    }));
    return list.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const ta = a.lastActivityAt?.toMillis() ?? a.updatedAt?.toMillis() ?? 0;
      const tb = b.lastActivityAt?.toMillis() ?? b.updatedAt?.toMillis() ?? 0;
      return tb - ta;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'admin_discussions');
  }
}

export async function fetchAdminDiscussionPosts(
  threadId: string
): Promise<AdminDiscussionPost[]> {
  try {
    const snap = await getDocs(collection(db, 'admin_discussions', threadId, 'posts'));
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AdminDiscussionPost, 'id'>),
    }));
    return list.sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `admin_discussions/${threadId}/posts`);
  }
}

export async function createAdminDiscussionThread(input: {
  title: string;
  category: AdminDiscussionCategory;
  body: string;
  isPinned?: boolean;
  actor: User;
  actorIsBureaucrat: boolean;
}): Promise<AdminDiscussionThread> {
  const threadId = makeDocId('adm');
  const actorName = getActorDisplayName(input.actor);
  const authorRole = input.actorIsBureaucrat ? 'bureaucrat' : 'admin';

  const payload = {
    id: threadId,
    title: sanitizeString(input.title, VALIDATION_LIMITS.TITLE_MAX_LENGTH) || 'Staff discussion',
    category: input.category,
    body: sanitizeString(input.body, VALIDATION_LIMITS.ADMIN_THREAD_BODY_MAX_LENGTH),
    status: 'open' as const,
    isPinned: input.actorIsBureaucrat ? Boolean(input.isPinned) : false,
    authorId: input.actor.uid,
    authorName: actorName,
    authorRole: authorRole as 'admin' | 'bureaucrat',
    replyCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'admin_discussions', threadId), payload);
    return {
      ...payload,
      createdAt: null,
      updatedAt: null,
      lastActivityAt: null,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `admin_discussions/${threadId}`);
  }
}

export async function replyAdminDiscussionThread(input: {
  thread: AdminDiscussionThread;
  body: string;
  actor: User;
  actorIsBureaucrat: boolean;
}): Promise<void> {
  const postId = makeDocId('post');
  const actorName = getActorDisplayName(input.actor);
  const authorRole = input.actorIsBureaucrat ? 'bureaucrat' : 'admin';
  const safeBody = sanitizeString(input.body, VALIDATION_LIMITS.ADMIN_POST_BODY_MAX_LENGTH);
  if (!safeBody) {
    throw new Error('Reply message cannot be empty.');
  }

  const threadRef = doc(db, 'admin_discussions', input.thread.id);
  const postRef = doc(db, 'admin_discussions', input.thread.id, 'posts', postId);

  try {
    const batch = writeBatch(db);
    batch.set(postRef, {
      threadId: input.thread.id,
      authorId: input.actor.uid,
      authorName: actorName,
      authorRole,
      body: safeBody,
      createdAt: serverTimestamp(),
    });
    batch.update(threadRef, {
      replyCount: input.thread.replyCount + 1,
      lastActivityAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `admin_discussions/${input.thread.id}/posts/${postId}`
    );
  }
}

export async function updateAdminDiscussionStatus(
  threadId: string,
  status: AdminDiscussionStatus
): Promise<void> {
  try {
    await updateDoc(doc(db, 'admin_discussions', threadId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `admin_discussions/${threadId}`);
  }
}

export async function updateAdminDiscussionPin(
  thread: AdminDiscussionThread,
  isPinned: boolean
): Promise<void> {
  try {
    await updateDoc(doc(db, 'admin_discussions', thread.id), {
      title: thread.title,
      category: thread.category,
      body: thread.body,
      status: thread.status,
      isPinned,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `admin_discussions/${thread.id}`);
  }
}

export async function deleteAdminDiscussionPost(threadId: string, postId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'admin_discussions', threadId, 'posts', postId));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `admin_discussions/${threadId}/posts/${postId}`
    );
  }
}

export async function deleteAdminDiscussionThread(threadId: string): Promise<void> {
  try {
    const postsSnap = await getDocs(collection(db, 'admin_discussions', threadId, 'posts'));
    const batch = writeBatch(db);
    postsSnap.forEach((p) => batch.delete(p.ref));
    batch.delete(doc(db, 'admin_discussions', threadId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `admin_discussions/${threadId}`);
  }
}
