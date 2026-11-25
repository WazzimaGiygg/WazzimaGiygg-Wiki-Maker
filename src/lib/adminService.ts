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
  type PageRating,
  type PageRevision,
  VALIDATION_LIMITS,
  type WikiPage,
} from '../types/wiki';
import { ADMIN_EMAIL, db, handleFirestoreError, OperationType } from './firebase';
import {
  addPageComment,
  buildPersonalSlugs,
  computeNextRecentEditors,
  isUserOrDiscussionPage,
  updateWikiPage,
} from './wikiService';

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

export type DiscussionModerationNoticeKind =
  | 'block'
  | 'unblock'
  | 'sanction'
  | 'speedy-deletion'
  | 'edit-reverted'
  | 'edit-removed'
  | 'edit-moderation'
  | 'page-locked'
  | 'page-unlocked'
  | 'page-deleted'
  | 'comment-removed';

export type SanctionSeverity = 'warning' | 'edit-sanction' | 'block';

export interface DiscussionNotificationInput {
  targetUid: string;
  targetDisplayName?: string;
  actor: User;
  kind: DiscussionModerationNoticeKind;
  reason: string;
  pageSlug?: string;
  pageTitle?: string;
  version?: number;
  sanctionLabel?: string;
}

export interface DiscussionNotificationResult {
  notified: boolean;
  discussionPageSlug: string | null;
  personalPageSlug?: string | null;
  notificationMethod?: 'page' | 'comment';
}

function sanitizeTemplateInlineText(value: string, maxLen: number): string {
  return value
    .replace(/\r?\n+/g, ' ')
    .replace(/\|/g, '—')
    .replace(/\{\{/g, '((')
    .replace(/\}\}/g, '))')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function getModerationNoticeMeta(
  kind: DiscussionModerationNoticeKind,
  sanctionLabel?: string
): {
  noticeType: 'critico' | 'cuidado' | 'sucesso' | 'nota';
  heading: string;
  categoryLabel: string;
} {
  switch (kind) {
    case 'block':
      return {
        noticeType: 'critico',
        heading: 'Bloqueio de conta aplicado',
        categoryLabel: 'Sanção administrativa / Bloqueio',
      };
    case 'unblock':
      return {
        noticeType: 'sucesso',
        heading: 'Bloqueio encerrado',
        categoryLabel: 'Revisão administrativa / Desbloqueio',
      };
    case 'sanction':
      return {
        noticeType: 'cuidado',
        heading: sanctionLabel?.trim() || 'Sanção / Advertência formal',
        categoryLabel: 'Sanção administrativa',
      };
    case 'speedy-deletion':
      return {
        noticeType: 'critico',
        heading: 'Proposta de eliminação rápida inserida',
        categoryLabel: 'Aviso editorial / Eliminação rápida',
      };
    case 'edit-reverted':
      return {
        noticeType: 'cuidado',
        heading: 'Edição revertida pela administração',
        categoryLabel: 'Aplicação administrativa sobre edição',
      };
    case 'edit-removed':
      return {
        noticeType: 'critico',
        heading: 'Revisão removida pela administração',
        categoryLabel: 'Aplicação administrativa sobre edição',
      };
    case 'edit-moderation':
      return {
        noticeType: 'nota',
        heading: 'Intervenção administrativa sobre edição',
        categoryLabel: 'Aplicação administrativa sobre edição',
      };
    case 'page-locked':
      return {
        noticeType: 'cuidado',
        heading: 'Página protegida / bloqueada para edição',
        categoryLabel: 'Aplicação administrativa sobre página',
      };
    case 'page-unlocked':
      return {
        noticeType: 'nota',
        heading: 'Proteção de página removida',
        categoryLabel: 'Aplicação administrativa sobre página',
      };
    case 'page-deleted':
      return {
        noticeType: 'critico',
        heading: 'Página removida pela administração',
        categoryLabel: 'Aplicação administrativa sobre página',
      };
    case 'comment-removed':
      return {
        noticeType: 'cuidado',
        heading: 'Comentário removido pela administração',
        categoryLabel: 'Moderação de discussão',
      };
  }
}

/**
 * Appends a structured administrative/sanction/block notification directly into
 * the target user's discussion page (`/pages/{discussionPageSlug}`), creating a
 * tracked revision so the notice is immediately visible inside their talk page.
 */
export async function notifyUserDiscussionPage(
  input: DiscussionNotificationInput
): Promise<DiscussionNotificationResult> {
  const { targetUid, targetDisplayName, actor, kind, reason, pageSlug, pageTitle, version, sanctionLabel } =
    input;

  if (
    !targetUid ||
    targetUid === actor.uid ||
    targetUid === 'lgpd-anonymized' ||
    targetUid === 'builtin-editorial'
  ) {
    return { notified: false, discussionPageSlug: null };
  }

  const actorName = getActorDisplayName(actor);
  let resolvedName = sanitizeString(
    targetDisplayName || 'Collaborator',
    VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH
  );
  let discussionSlug = '';

  try {
    const collabSnap = await getDoc(doc(db, 'collaborators', targetUid));
    if (collabSnap.exists()) {
      const collab = collabSnap.data() as Partial<CollaboratorProfile>;
      if (collab.displayName) {
        resolvedName = sanitizeString(collab.displayName, VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH);
      }
      if (collab.discussionPageSlug) {
        discussionSlug = collab.discussionPageSlug;
      }
    }
  } catch (error) {
    console.warn('Could not read collaborator profile for discussion notice:', error);
  }

  if (!discussionSlug) {
    discussionSlug = buildPersonalSlugs(resolvedName || 'Collaborator', targetUid).discussionPageSlug;
  }

  // Never recursively notify about edits made inside the same discussion page itself
  if (
    pageSlug &&
    pageSlug === discussionSlug &&
    kind !== 'block' &&
    kind !== 'unblock' &&
    kind !== 'sanction'
  ) {
    return { notified: false, discussionPageSlug: discussionSlug };
  }

  const now = new Date();
  const dateOnly = now.toISOString().slice(0, 10);
  const dateTimeUtc = `${dateOnly} ${now.toISOString().slice(11, 16)} UTC`;
  const { noticeType, heading, categoryLabel } = getModerationNoticeMeta(kind, sanctionLabel);

  const cleanReason =
    sanitizeTemplateInlineText(reason, 600) ||
    'Aplicação administrativa registrada pela moderação da wiki.';
  const cleanPageTitle = pageTitle ? sanitizeTemplateInlineText(pageTitle, 140) : '';
  const cleanHeading = sanitizeTemplateInlineText(heading, 120);
  const cleanActorName = sanitizeTemplateInlineText(actorName, 80);

  const templateTitle = `${categoryLabel}: ${cleanHeading}`;
  const templateBodyParts = [`Notificação oficial aplicada por ${cleanActorName}: ${cleanReason}`];
  if (pageSlug) {
    templateBodyParts.push(
      `Página: :${pageSlug}${typeof version === 'number' ? ` (v${version})` : ''}.`
    );
  }
  const templateBody = sanitizeTemplateInlineText(templateBodyParts.join(' '), 500);

  const metadataLines = [
    `- **Ação aplicada:** ${cleanHeading}`,
    `- **Categoria:** ${categoryLabel}`,
    `- **Administrador / Burocrata:** ${cleanActorName}`,
    `- **Data e hora:** \`${dateTimeUtc}\``,
    `- **Motivo / Aplicação:** ${cleanReason}`,
  ];

  if (pageSlug) {
    if (kind === 'page-deleted') {
      metadataLines.push(
        `- **Página afetada:** \`:${pageSlug}\`${cleanPageTitle ? ` (${cleanPageTitle})` : ''}`
      );
    } else {
      metadataLines.push(
        `- **Página afetada:** [[${pageSlug}|${cleanPageTitle || pageSlug}]] (\`:${pageSlug}\`)`
      );
    }
  }
  if (typeof version === 'number') {
    metadataLines.push(`- **Revisão / Edição:** \`v${version}\``);
  }

  const noticeSection = [
    '---',
    '',
    `## Notificação administrativa — ${cleanHeading} (${dateOnly})`,
    '',
    `{{Aviso|tipo=${noticeType}|título=${templateTitle}|texto=${templateBody}|data=${dateTimeUtc}}}`,
    '',
    ...metadataLines,
  ].join('\n');

  const discussionRef = doc(db, 'pages', discussionSlug);
  const actorCollabRef = doc(db, 'collaborators', actor.uid);

  try {
    const [discussionSnap, actorCollabSnap] = await Promise.all([
      getDoc(discussionRef),
      getDoc(actorCollabRef),
    ]);

    const actorHasCollab = actorCollabSnap.exists();
    const batch = writeBatch(db);
    const revSummary = sanitizeString(
      `Notificação administrativa: ${cleanHeading}`,
      VALIDATION_LIMITS.SUMMARY_MAX_LENGTH
    );

    if (discussionSnap.exists()) {
      const existingPage = discussionSnap.data() as WikiPage;
      const baseContent = existingPage.content.trimEnd();
      const combined = baseContent ? `${baseContent}\n\n${noticeSection}` : noticeSection;
      const boundedContent =
        combined.length <= VALIDATION_LIMITS.CONTENT_MAX_LENGTH
          ? combined
          : `${baseContent.slice(
              0,
              Math.max(0, VALIDATION_LIMITS.CONTENT_MAX_LENGTH - noticeSection.length - 4)
            )}\n\n${noticeSection}`;

      const nextVersion = existingPage.version + 1;

      batch.update(discussionRef, {
        content: boundedContent,
        lastEditorId: actor.uid,
        lastEditorName: actorName,
        recentEditors: computeNextRecentEditors(existingPage, {
          uid: actor.uid,
          name: actorName,
        }),
        version: nextVersion,
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'pages', discussionSlug, 'revisions', `v_${nextVersion}`), {
        pageSlug: discussionSlug,
        pageVisibility: existingPage.visibility,
        pageAuthorId: existingPage.authorId,
        title: existingPage.title,
        content: boundedContent,
        editorId: actor.uid,
        editorName: actorName,
        summary: revSummary,
        version: nextVersion,
        createdAt: serverTimestamp(),
      });

      if (actorHasCollab) {
        batch.set(
          doc(db, 'collaborators', actor.uid, 'edits', buildEditDocId(discussionSlug, nextVersion)),
          {
            editorId: actor.uid,
            pageSlug: discussionSlug,
            pageTitle: existingPage.title,
            pageVisibility: existingPage.visibility,
            summary: revSummary,
            version: nextVersion,
            createdAt: serverTimestamp(),
          }
        );
      }
    } else {
      const fallbackTitle = sanitizeString(
        `Discussion: ${resolvedName || 'Collaborator'}`,
        VALIDATION_LIMITS.TITLE_MAX_LENGTH
      );
      const personalSlug = buildPersonalSlugs(
        resolvedName || 'Collaborator',
        targetUid
      ).personalPageSlug;
      const initialContent = [
        `This is the dedicated discussion page for **${resolvedName || 'Collaborator'}**.`,
        '',
        `Return to [[${personalSlug}|${resolvedName || 'Collaborator'}'s Personal Page]] or review administrative notices below.`,
        '',
        noticeSection,
      ]
        .join('\n')
        .slice(0, VALIDATION_LIMITS.CONTENT_MAX_LENGTH);

      batch.set(discussionRef, {
        slug: discussionSlug,
        title: fallbackTitle,
        content: initialContent,
        category: 'general',
        tags: ['personal', 'discussion'],
        visibility: 'public',
        isLocked: false,
        authorId: actor.uid,
        authorName: actorName,
        lastEditorId: actor.uid,
        lastEditorName: actorName,
        recentEditors: [{ uid: actor.uid, name: actorName }],
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'pages', discussionSlug, 'revisions', 'v_1'), {
        pageSlug: discussionSlug,
        pageVisibility: 'public',
        pageAuthorId: actor.uid,
        title: fallbackTitle,
        content: initialContent,
        editorId: actor.uid,
        editorName: actorName,
        summary: revSummary,
        version: 1,
        createdAt: serverTimestamp(),
      });

      if (actorHasCollab) {
        batch.set(
          doc(db, 'collaborators', actor.uid, 'edits', buildEditDocId(discussionSlug, 1)),
          {
            editorId: actor.uid,
            pageSlug: discussionSlug,
            pageTitle: fallbackTitle,
            pageVisibility: 'public',
            summary: revSummary,
            version: 1,
            createdAt: serverTimestamp(),
          }
        );
      }
    }

    await batch.commit();
    return { notified: true, discussionPageSlug: discussionSlug, notificationMethod: 'page' };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `pages/${discussionSlug}`);
  }
}

const LEADING_BLOCK_TEMPLATE_REGEX =
  /^\s*\{\{\s*(?:predefini[cç][aã]o\s*:|predefinicao\s*:|template\s*:)?\s*(?:bloqueio|bloqueado|block|blocked|user[\s_-]+blocked)(?:\|[^{}]*(?:\{\{[^{}]*\}\}[^{}]*)*)?\}\}\s*/i;

async function resolveTargetUserProfileSlugs(
  targetUid: string,
  fallbackDisplayName?: string
): Promise<{
  resolvedName: string;
  personalPageSlug: string;
  discussionPageSlug: string;
}> {
  let resolvedName =
    sanitizeString(fallbackDisplayName || 'Collaborator', VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH) ||
    'Collaborator';
  let personalPageSlug = '';
  let discussionPageSlug = '';

  try {
    const collabSnap = await getDoc(doc(db, 'collaborators', targetUid));
    if (collabSnap.exists()) {
      const collab = collabSnap.data() as Partial<CollaboratorProfile>;
      if (collab.displayName) {
        resolvedName =
          sanitizeString(collab.displayName, VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH) ||
          resolvedName;
      }
      if (collab.personalPageSlug) {
        personalPageSlug = collab.personalPageSlug;
      }
      if (collab.discussionPageSlug) {
        discussionPageSlug = collab.discussionPageSlug;
      }
    }
  } catch (error) {
    console.warn('Could not read collaborator profile slugs:', error);
  }

  const fallbackSlugs = buildPersonalSlugs(resolvedName, targetUid);
  return {
    resolvedName,
    personalPageSlug: personalPageSlug || fallbackSlugs.personalPageSlug,
    discussionPageSlug: discussionPageSlug || fallbackSlugs.discussionPageSlug,
  };
}

/**
 * Inserts the `{{Bloqueio|...}}` notice template at the top of the blocked user's
 * personal page (`pages/{personalPageSlug}`) with a tracked revision.
 */
async function insertBlockTemplateOnPersonalPage(input: {
  targetUid: string;
  targetDisplayName: string;
  reason: string;
  actor: User;
}): Promise<string | null> {
  const { targetUid, targetDisplayName, reason, actor } = input;
  if (!targetUid || targetUid === 'lgpd-anonymized' || targetUid === 'builtin-editorial') {
    return null;
  }

  const { resolvedName, personalPageSlug, discussionPageSlug } =
    await resolveTargetUserProfileSlugs(targetUid, targetDisplayName);

  const actorName = getActorDisplayName(actor);
  const now = new Date();
  const dateTimeUtc = `${now.toISOString().slice(0, 10)} ${now.toISOString().slice(11, 16)} UTC`;
  const cleanReason =
    sanitizeTemplateInlineText(reason, 500) || 'Violação das políticas editoriais da wiki.';
  const cleanActorName = sanitizeTemplateInlineText(actorName, 80);

  const blockTemplateCall = `{{Bloqueio|motivo=${cleanReason}|administrador=${cleanActorName}|duracao=Indeterminado|data=${dateTimeUtc}}}`;

  const personalRef = doc(db, 'pages', personalPageSlug);
  const actorCollabRef = doc(db, 'collaborators', actor.uid);

  try {
    const [personalSnap, actorCollabSnap] = await Promise.all([
      getDoc(personalRef),
      getDoc(actorCollabRef),
    ]);

    const actorHasCollab = actorCollabSnap.exists();
    const batch = writeBatch(db);
    const revSummary = sanitizeString(
      `Predefinição {{Bloqueio}} inserida pela administração`,
      VALIDATION_LIMITS.SUMMARY_MAX_LENGTH
    );

    if (personalSnap.exists()) {
      const existingPage = personalSnap.data() as WikiPage;
      const bodyWithoutOldBanner = existingPage.content
        .replace(LEADING_BLOCK_TEMPLATE_REGEX, '')
        .trimStart();
      const combined = bodyWithoutOldBanner
        ? `${blockTemplateCall}\n\n${bodyWithoutOldBanner}`
        : blockTemplateCall;
      const boundedContent =
        combined.length <= VALIDATION_LIMITS.CONTENT_MAX_LENGTH
          ? combined
          : `${blockTemplateCall}\n\n${bodyWithoutOldBanner.slice(
              0,
              Math.max(0, VALIDATION_LIMITS.CONTENT_MAX_LENGTH - blockTemplateCall.length - 4)
            )}`;

      const nextVersion = existingPage.version + 1;

      batch.update(personalRef, {
        content: boundedContent,
        lastEditorId: actor.uid,
        lastEditorName: actorName,
        recentEditors: computeNextRecentEditors(existingPage, {
          uid: actor.uid,
          name: actorName,
        }),
        version: nextVersion,
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'pages', personalPageSlug, 'revisions', `v_${nextVersion}`), {
        pageSlug: personalPageSlug,
        pageVisibility: existingPage.visibility,
        pageAuthorId: existingPage.authorId,
        title: existingPage.title,
        content: boundedContent,
        editorId: actor.uid,
        editorName: actorName,
        summary: revSummary,
        version: nextVersion,
        createdAt: serverTimestamp(),
      });

      if (actorHasCollab) {
        batch.set(
          doc(db, 'collaborators', actor.uid, 'edits', buildEditDocId(personalPageSlug, nextVersion)),
          {
            editorId: actor.uid,
            pageSlug: personalPageSlug,
            pageTitle: existingPage.title,
            pageVisibility: existingPage.visibility,
            summary: revSummary,
            version: nextVersion,
            createdAt: serverTimestamp(),
          }
        );
      }
    } else {
      const fallbackTitle = sanitizeString(
        `User: ${resolvedName}`,
        VALIDATION_LIMITS.TITLE_MAX_LENGTH
      );
      const initialContent = [
        blockTemplateCall,
        '',
        `This is the personal wiki page of **${resolvedName}**.`,
        '',
        `Visit [[${discussionPageSlug}|${resolvedName}'s Discussion Page]] to review notices or collaborate.`,
      ]
        .join('\n')
        .slice(0, VALIDATION_LIMITS.CONTENT_MAX_LENGTH);

      batch.set(personalRef, {
        slug: personalPageSlug,
        title: fallbackTitle,
        content: initialContent,
        category: 'general',
        tags: ['personal', 'profile'],
        visibility: 'public',
        isLocked: false,
        authorId: actor.uid,
        authorName: actorName,
        lastEditorId: actor.uid,
        lastEditorName: actorName,
        recentEditors: [{ uid: actor.uid, name: actorName }],
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'pages', personalPageSlug, 'revisions', 'v_1'), {
        pageSlug: personalPageSlug,
        pageVisibility: 'public',
        pageAuthorId: actor.uid,
        title: fallbackTitle,
        content: initialContent,
        editorId: actor.uid,
        editorName: actorName,
        summary: revSummary,
        version: 1,
        createdAt: serverTimestamp(),
      });

      if (actorHasCollab) {
        batch.set(
          doc(db, 'collaborators', actor.uid, 'edits', buildEditDocId(personalPageSlug, 1)),
          {
            editorId: actor.uid,
            pageSlug: personalPageSlug,
            pageTitle: fallbackTitle,
            pageVisibility: 'public',
            summary: revSummary,
            version: 1,
            createdAt: serverTimestamp(),
          }
        );
      }
    }

    await batch.commit();
    return personalPageSlug;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `pages/${personalPageSlug}`);
  }
}

/**
 * Removes an active leading `{{Bloqueio|...}}` notice from a user's personal
 * page when their account block is lifted.
 */
async function removeBlockTemplateFromPersonalPage(input: {
  targetUid: string;
  targetDisplayName?: string;
  actor: User;
}): Promise<void> {
  const { targetUid, targetDisplayName, actor } = input;
  if (!targetUid || targetUid === 'lgpd-anonymized' || targetUid === 'builtin-editorial') {
    return;
  }

  const { personalPageSlug } = await resolveTargetUserProfileSlugs(targetUid, targetDisplayName);
  const personalRef = doc(db, 'pages', personalPageSlug);

  try {
    const [personalSnap, actorCollabSnap] = await Promise.all([
      getDoc(personalRef),
      getDoc(doc(db, 'collaborators', actor.uid)),
    ]);

    if (!personalSnap.exists()) return;
    const existingPage = personalSnap.data() as WikiPage;
    if (!LEADING_BLOCK_TEMPLATE_REGEX.test(existingPage.content)) return;

    const cleanedContent = existingPage.content
      .replace(LEADING_BLOCK_TEMPLATE_REGEX, '')
      .trimStart();
    if (cleanedContent === existingPage.content) return;

    const actorName = getActorDisplayName(actor);
    const nextVersion = existingPage.version + 1;
    const revSummary = sanitizeString(
      'Remoção da predefinição {{Bloqueio}} após desbloqueio administrativo',
      VALIDATION_LIMITS.SUMMARY_MAX_LENGTH
    );

    const batch = writeBatch(db);
    batch.update(personalRef, {
      content: cleanedContent || ' ',
      lastEditorId: actor.uid,
      lastEditorName: actorName,
      recentEditors: computeNextRecentEditors(existingPage, {
        uid: actor.uid,
        name: actorName,
      }),
      version: nextVersion,
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'pages', personalPageSlug, 'revisions', `v_${nextVersion}`), {
      pageSlug: personalPageSlug,
      pageVisibility: existingPage.visibility,
      pageAuthorId: existingPage.authorId,
      title: existingPage.title,
      content: cleanedContent || ' ',
      editorId: actor.uid,
      editorName: actorName,
      summary: revSummary,
      version: nextVersion,
      createdAt: serverTimestamp(),
    });

    if (actorCollabSnap.exists()) {
      batch.set(
        doc(db, 'collaborators', actor.uid, 'edits', buildEditDocId(personalPageSlug, nextVersion)),
        {
          editorId: actor.uid,
          pageSlug: personalPageSlug,
          pageTitle: existingPage.title,
          pageVisibility: existingPage.visibility,
          summary: revSummary,
          version: nextVersion,
          createdAt: serverTimestamp(),
        }
      );
    }

    await batch.commit();
  } catch (error) {
    console.warn(`Could not strip {{Bloqueio}} from ${personalPageSlug}:`, error);
  }
}

/**
 * Automatically alerts the article author's personal discussion page when
 * `{{Eliminação rápida|...}}` is inserted into an article.
 * - Admins insert a structured `{{Aviso|tipo=critico|...}}` section directly into the talk page.
 * - Non-admin collaborators post an alert comment on the author's public talk page (permitted by Firestore rules).
 */
export async function notifyAuthorSpeedyDeletion(input: {
  targetUid: string;
  targetDisplayName?: string;
  actor: User;
  actorIsAdmin: boolean;
  pageSlug: string;
  pageTitle: string;
  version?: number;
  reason?: string;
  rule?: string;
}): Promise<DiscussionNotificationResult> {
  const {
    targetUid,
    targetDisplayName,
    actor,
    actorIsAdmin,
    pageSlug,
    pageTitle,
    version,
    reason,
    rule,
  } = input;

  if (
    !targetUid ||
    targetUid === actor.uid ||
    targetUid === 'lgpd-anonymized' ||
    targetUid === 'builtin-editorial'
  ) {
    return { notified: false, discussionPageSlug: null };
  }

  const { resolvedName, discussionPageSlug } = await resolveTargetUserProfileSlugs(
    targetUid,
    targetDisplayName
  );

  if (pageSlug === discussionPageSlug) {
    return { notified: false, discussionPageSlug };
  }

  const ruleText = rule?.trim() ? ` (${rule.trim()})` : '';
  const cleanReason = reason?.trim()
    ? `Eliminação rápida${ruleText} solicitada para :${pageSlug}. Motivo: ${reason.trim()}`
    : `O artigo :${pageSlug} foi marcado com a predefinição de Eliminação rápida${ruleText}.`;

  if (actorIsAdmin) {
    return notifyUserDiscussionPage({
      targetUid,
      targetDisplayName: resolvedName,
      actor,
      kind: 'speedy-deletion',
      reason: cleanReason,
      pageSlug,
      pageTitle,
      version,
    });
  }

  try {
    const discussionSnap = await getDoc(doc(db, 'pages', discussionPageSlug));
    if (!discussionSnap.exists()) {
      return { notified: false, discussionPageSlug };
    }
    const discussionPage = discussionSnap.data() as WikiPage;
    if (discussionPage.visibility !== 'public') {
      return { notified: false, discussionPageSlug };
    }

    const commentBody = [
      `⚠️ Alerta de Eliminação rápida${ruleText}`,
      `O artigo "${pageTitle}" (:${pageSlug}) foi marcado com {{Eliminação rápida}}.`,
      reason?.trim() ? `Motivo informado: ${reason.trim()}` : '',
      'Verifique a página para corrigir ou contestar antes de eventual remoção pela administração.',
    ]
      .filter(Boolean)
      .join(' ')
      .slice(0, VALIDATION_LIMITS.COMMENT_BODY_MAX_LENGTH);

    await addPageComment(discussionPage, commentBody, actor);
    return { notified: true, discussionPageSlug, notificationMethod: 'comment' };
  } catch (error) {
    console.warn('Could not post speedy-deletion alert comment to author talk page:', error);
    return { notified: false, discussionPageSlug };
  }
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
  actor: User,
  context?: { pageSlug?: string; pageTitle?: string; version?: number }
): Promise<DiscussionNotificationResult> {
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

  const personalPageSlug = await insertBlockTemplateOnPersonalPage({
    targetUid,
    targetDisplayName: safeName,
    reason: safeReason,
    actor,
  });

  const discussionResult = await notifyUserDiscussionPage({
    targetUid,
    targetDisplayName: safeName,
    actor,
    kind: 'block',
    reason: safeReason,
    pageSlug: context?.pageSlug,
    pageTitle: context?.pageTitle,
    version: context?.version,
  });

  return {
    ...discussionResult,
    personalPageSlug,
  };
}

export async function unblockUserAccount(
  targetUid: string,
  displayName?: string,
  actor?: User
): Promise<DiscussionNotificationResult> {
  const blockPath = `blocked_users/${targetUid}`;
  try {
    await deleteDoc(doc(db, 'blocked_users', targetUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, blockPath);
  }

  if (!actor) {
    return { notified: false, discussionPageSlug: null };
  }

  await removeBlockTemplateFromPersonalPage({
    targetUid,
    targetDisplayName: displayName,
    actor,
  });

  return notifyUserDiscussionPage({
    targetUid,
    targetDisplayName: displayName,
    actor,
    kind: 'unblock',
    reason: 'Bloqueio administrativo encerrado e permissões de escrita restauradas.',
  });
}

export async function applySanctionToUser(input: {
  targetUid: string;
  targetDisplayName: string;
  actor: User;
  severity: SanctionSeverity;
  sanctionLabel?: string;
  reason: string;
  pageSlug?: string;
  pageTitle?: string;
  version?: number;
}): Promise<{
  discussionPageSlug: string | null;
  personalPageSlug?: string | null;
  notified: boolean;
  blockedApplied: boolean;
}> {
  const safeReason =
    sanitizeString(input.reason, VALIDATION_LIMITS.BLOCK_REASON_MAX_LENGTH) ||
    'Sanção administrativa aplicada pela moderação.';

  if (input.severity === 'block') {
    const result = await blockUserAccount(
      input.targetUid,
      input.targetDisplayName,
      safeReason,
      input.actor,
      {
        pageSlug: input.pageSlug,
        pageTitle: input.pageTitle,
        version: input.version,
      }
    );
    return {
      discussionPageSlug: result.discussionPageSlug,
      personalPageSlug: result.personalPageSlug,
      notified: result.notified,
      blockedApplied: true,
    };
  }

  const label =
    input.sanctionLabel?.trim() ||
    (input.severity === 'edit-sanction'
      ? 'Sanção sobre edição'
      : 'Advertência formal');

  const result = await notifyUserDiscussionPage({
    targetUid: input.targetUid,
    targetDisplayName: input.targetDisplayName,
    actor: input.actor,
    kind: 'sanction',
    sanctionLabel: label,
    reason: safeReason,
    pageSlug: input.pageSlug,
    pageTitle: input.pageTitle,
    version: input.version,
  });

  return {
    discussionPageSlug: result.discussionPageSlug,
    notified: result.notified,
    blockedApplied: false,
  };
}

export async function deletePageAsAdmin(
  slug: string,
  actor?: User,
  reason?: string
): Promise<DiscussionNotificationResult> {
  const pagePath = `pages/${slug}`;
  let deletedPageData: WikiPage | null = null;

  try {
    const [pageSnap, revsSnap, commentsSnap, ratingsSnap] = await Promise.all([
      getDoc(doc(db, 'pages', slug)),
      getDocs(collection(db, 'pages', slug, 'revisions')),
      getDocs(collection(db, 'pages', slug, 'comments')),
      getDocs(collection(db, 'pages', slug, 'ratings')),
    ]);

    if (pageSnap.exists()) {
      deletedPageData = pageSnap.data() as WikiPage;
    }

    const ops: BatchOp[] = [];
    revsSnap.forEach((d) => {
      ops.push({ type: 'delete', ref: d.ref });
    });
    commentsSnap.forEach((d) => {
      ops.push({ type: 'delete', ref: d.ref });
    });
    ratingsSnap.forEach((d) => {
      ops.push({ type: 'delete', ref: d.ref });
    });
    ops.push({ type: 'delete', ref: doc(db, 'pages', slug) });

    await commitOperationsInBatches(ops, pagePath);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pagePath);
  }

  if (
    actor &&
    deletedPageData &&
    deletedPageData.authorId !== actor.uid &&
    !(isUserOrDiscussionPage(deletedPageData) && deletedPageData.slug.endsWith('-discussion'))
  ) {
    return notifyUserDiscussionPage({
      targetUid: deletedPageData.authorId,
      targetDisplayName: deletedPageData.authorName,
      actor,
      kind: 'page-deleted',
      reason:
        reason?.trim() ||
        `A página :${slug} foi removida pela administração/burocracia.`,
      pageSlug: slug,
      pageTitle: deletedPageData.title,
      version: deletedPageData.version,
    });
  }

  return { notified: false, discussionPageSlug: null };
}

export async function removeRevisionEditAsAdmin(
  page: WikiPage,
  targetRevision: PageRevision,
  pageRevisions: PageRevision[],
  actor: User,
  moderationReason?: string
): Promise<{
  outcome: 'reverted-and-removed' | 'removed-revision' | 'deleted-page';
  discussionPageSlug: string | null;
  notified: boolean;
}> {
  const sorted = [...pageRevisions].sort((a, b) => b.version - a.version);

  // If this is the only revision of the page, delete the entire page
  if (sorted.length <= 1) {
    const deleteNotice = await deletePageAsAdmin(
      page.slug,
      actor,
      moderationReason?.trim() ||
        `Página removida após exclusão da única revisão (v${targetRevision.version}).`
    );
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

    // If editor differs from page author, also notify editor if deletePageAsAdmin didn't notify them
    let noticeResult = deleteNotice;
    if (
      targetRevision.editorId &&
      targetRevision.editorId !== page.authorId &&
      targetRevision.editorId !== actor.uid
    ) {
      noticeResult = await notifyUserDiscussionPage({
        targetUid: targetRevision.editorId,
        targetDisplayName: targetRevision.editorName,
        actor,
        kind: 'edit-removed',
        reason:
          moderationReason?.trim() ||
          `Sua edição v${targetRevision.version} em :${page.slug} foi removida pela administração.`,
        pageSlug: page.slug,
        pageTitle: page.title,
        version: targetRevision.version,
      });
    }

    return {
      outcome: 'deleted-page',
      discussionPageSlug: noticeResult.discussionPageSlug,
      notified: noticeResult.notified,
    };
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

  const noticeResult = await notifyUserDiscussionPage({
    targetUid: targetRevision.editorId,
    targetDisplayName: targetRevision.editorName,
    actor,
    kind: isLatest ? 'edit-reverted' : 'edit-removed',
    reason:
      moderationReason?.trim() ||
      (isLatest
        ? `Sua edição v${targetRevision.version} em :${page.slug} foi revertida e removida pela administração.`
        : `Sua revisão v${targetRevision.version} em :${page.slug} foi removida do histórico pela administração.`),
    pageSlug: page.slug,
    pageTitle: page.title,
    version: targetRevision.version,
  });

  return {
    outcome: isLatest ? 'reverted-and-removed' : 'removed-revision',
    discussionPageSlug: noticeResult.discussionPageSlug,
    notified: noticeResult.notified,
  };
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
  let affectedRatings = 0;
  let deletedEditLogs = 0;

  try {
    const [
      collabSnap,
      privSnap,
      blockedSnap,
      adminSnap,
      userEditsSnap,
      userWatchlistSnap,
      pagesSnap,
    ] = await Promise.all([
      getDoc(doc(db, 'collaborators', targetUid)),
      getDoc(doc(db, 'users', targetUid, 'private', 'info')),
      getDoc(doc(db, 'blocked_users', targetUid)),
      getDoc(doc(db, 'admins', targetUid)),
      getDocs(collection(db, 'collaborators', targetUid, 'edits')),
      getDocs(collection(db, 'collaborators', targetUid, 'watchlist')),
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

    userWatchlistSnap.forEach((d) => {
      ops.push({ type: 'delete', ref: d.ref });
    });

    const pages = pagesSnap.docs.map((d) => ({
      ref: d.ref,
      data: d.data() as WikiPage,
    }));

    const subcollectionSnaps = await Promise.all(
      pages.map(async ({ ref, data }) => {
        const [revsSnap, commentsSnap, ratingsSnap] = await Promise.all([
          getDocs(collection(db, 'pages', data.slug, 'revisions')),
          getDocs(collection(db, 'pages', data.slug, 'comments')),
          getDocs(collection(db, 'pages', data.slug, 'ratings')),
        ]);
        return { ref, data, revsSnap, commentsSnap, ratingsSnap };
      })
    );

    for (const { ref, data, revsSnap, commentsSnap, ratingsSnap } of subcollectionSnaps) {
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
        ratingsSnap.forEach((d) => {
          ops.push({ type: 'delete', ref: d.ref });
          affectedRatings += 1;
        });
        ops.push({ type: 'delete', ref });
        if (isPersonalOrPrivatePage) {
          deletedPersonalPages += 1;
        } else {
          deletedPages += 1;
        }
        continue;
      }

      // Remaining shared pages: anonymize author/lastEditor/recentEditors references if matching targetUid
      const isAuthor = data.authorId === targetUid;
      const isLastEditor = data.lastEditorId === targetUid;
      const existingRecentEditors = Array.isArray(data.recentEditors) ? data.recentEditors : null;
      const hasTargetInRecentEditors = Boolean(
        existingRecentEditors?.some((entry) => entry?.uid === targetUid)
      );
      if (isAuthor || isLastEditor || hasTargetInRecentEditors) {
        const updateData: Record<string, unknown> = {
          authorId: isAuthor ? 'lgpd-anonymized' : data.authorId,
          authorName: isAuthor ? 'Removed User (LGPD)' : data.authorName,
          lastEditorId: isLastEditor ? 'lgpd-anonymized' : data.lastEditorId,
          lastEditorName: isLastEditor ? 'Removed User (LGPD)' : data.lastEditorName,
          updatedAt: serverTimestamp(),
        };
        if (existingRecentEditors && existingRecentEditors.length > 0) {
          const anonymizedList: { uid: string; name: string }[] = [];
          const seenUids = new Set<string>();
          for (const entry of existingRecentEditors) {
            const nextUid = entry.uid === targetUid ? 'lgpd-anonymized' : entry.uid;
            const nextName = entry.uid === targetUid ? 'Removed User (LGPD)' : entry.name;
            if (!nextUid || !nextName || seenUids.has(nextUid)) continue;
            seenUids.add(nextUid);
            anonymizedList.push({ uid: nextUid, name: nextName });
          }
          if (anonymizedList.length > 0) {
            updateData.recentEditors = anonymizedList.slice(0, VALIDATION_LIMITS.RECENT_EDITORS_MAX_COUNT);
          }
        }
        ops.push({
          type: 'update',
          ref,
          data: updateData,
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

      ratingsSnap.forEach((ratingDoc) => {
        const rating = ratingDoc.data() as Omit<PageRating, 'id'>;
        if (rating.userId === targetUid || rating.pageAuthorId === targetUid) {
          if (mode === 'purge' && rating.userId === targetUid) {
            ops.push({ type: 'delete', ref: ratingDoc.ref });
          } else {
            ops.push({
              type: 'update',
              ref: ratingDoc.ref,
              data: {
                userId: rating.userId === targetUid ? 'lgpd-anonymized' : rating.userId,
                userName:
                  rating.userId === targetUid ? 'Removed User (LGPD)' : rating.userName,
                pageAuthorId:
                  rating.pageAuthorId === targetUid ? 'lgpd-anonymized' : rating.pageAuthorId,
              },
            });
          }
          affectedRatings += 1;
        }
      });
    }

    const summary = sanitizeString(
      `LGPD ${mode}: ${deletedPiiCount} PII records, ${deletedPersonalPages} personal pages, ${deletedPages} authored pages deleted, ${anonymizedPages} pages anonymized, ${affectedRevisions} revisions, ${affectedComments} comments, ${affectedRatings} ratings, ${deletedEditLogs} edit logs`,
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
