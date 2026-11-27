import type { User } from 'firebase/auth';
import { VALIDATION_LIMITS, type WikiPage } from '../types/wiki';

export interface TagSummary {
  tag: string;
  normalizedKey: string;
  pageCount: number;
  publicCount: number;
  privateCount: number;
  lockedCount: number;
  editableCount: number;
  slugs: string[];
  lastUpdatedMs: number;
}

export interface TagDirectorySnapshot {
  tags: TagSummary[];
  taggedPagesCount: number;
  untaggedPagesCount: number;
}

export type BulkTagOperation =
  | { type: 'add'; tags: string[] }
  | { type: 'remove'; tags: string[] }
  | { type: 'rename'; fromTag: string; toTag: string }
  | { type: 'replace'; tags: string[] };

export interface ComputedTagUpdate {
  nextTags: string[];
  changed: boolean;
  error?: string;
}

const PROTECTED_SYSTEM_TAGS = new Set(['personal', 'discussion']);

export function isProtectedPageRecord(page: Pick<WikiPage, 'slug' | 'tags'>): boolean {
  return (
    page.tags.includes('personal') ||
    page.tags.includes('discussion') ||
    page.slug.startsWith('user-') ||
    page.slug.endsWith('-discussion')
  );
}

export function canUserManagePageMeta(
  page: Pick<WikiPage, 'authorId'>,
  user: User | null,
  isAdmin: boolean,
  isBlocked: boolean
): boolean {
  if (!user || isBlocked) return false;
  if (page.authorId === 'builtin-editorial') return true;
  return page.authorId === user.uid || isAdmin;
}

export function canUserEditPageTags(
  page: Pick<WikiPage, 'slug' | 'tags' | 'visibility' | 'isLocked' | 'authorId'>,
  user: User | null,
  isAdmin: boolean,
  isBlocked: boolean
): boolean {
  if (!user || !user.emailVerified || isBlocked) return false;
  if (page.authorId === 'builtin-editorial') return true;
  if (page.authorId === user.uid || isAdmin) return true;
  return page.visibility === 'public' && !page.isLocked && !isProtectedPageRecord(page);
}

export function normalizeSingleTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .slice(0, VALIDATION_LIMITS.TAG_MAX_LENGTH);
}

export function parseTagInputList(raw: string): string[] {
  const tokens = raw
    .split(/[,\n]+/)
    .map((item) => normalizeSingleTag(item))
    .filter((item) => item.length >= 1);

  const result: string[] = [];
  const seenLower = new Set<string>();
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seenLower.has(key)) continue;
    seenLower.add(key);
    result.push(token);
  }
  return result;
}

export function buildTagDirectory(
  pages: WikiPage[],
  user: User | null,
  isAdmin: boolean,
  isBlocked: boolean
): TagDirectorySnapshot {
  const map = new Map<
    string,
    {
      tag: string;
      normalizedKey: string;
      slugs: Set<string>;
      publicCount: number;
      privateCount: number;
      lockedCount: number;
      editableCount: number;
      lastUpdatedMs: number;
    }
  >();

  let taggedPagesCount = 0;
  let untaggedPagesCount = 0;

  for (const page of pages) {
    const pageTags = (page.tags ?? []).map((t) => t.trim()).filter(Boolean);
    if (pageTags.length === 0) {
      untaggedPagesCount += 1;
      continue;
    }

    taggedPagesCount += 1;
    const isEditable = canUserEditPageTags(page, user, isAdmin, isBlocked);
    const updatedMs = page.updatedAt?.toMillis() ?? 0;
    const seenOnPage = new Set<string>();

    for (const rawTag of pageTags) {
      const normalizedKey = rawTag.toLowerCase();
      if (seenOnPage.has(normalizedKey)) continue;
      seenOnPage.add(normalizedKey);

      const existing = map.get(normalizedKey);
      if (existing) {
        existing.slugs.add(page.slug);
        if (page.visibility === 'public') existing.publicCount += 1;
        else existing.privateCount += 1;
        if (page.isLocked) existing.lockedCount += 1;
        if (isEditable) existing.editableCount += 1;
        if (updatedMs > existing.lastUpdatedMs) existing.lastUpdatedMs = updatedMs;
      } else {
        map.set(normalizedKey, {
          tag: rawTag,
          normalizedKey,
          slugs: new Set([page.slug]),
          publicCount: page.visibility === 'public' ? 1 : 0,
          privateCount: page.visibility === 'private' ? 1 : 0,
          lockedCount: page.isLocked ? 1 : 0,
          editableCount: isEditable ? 1 : 0,
          lastUpdatedMs: updatedMs,
        });
      }
    }
  }

  const tags: TagSummary[] = Array.from(map.values())
    .map((entry) => ({
      tag: entry.tag,
      normalizedKey: entry.normalizedKey,
      pageCount: entry.slugs.size,
      publicCount: entry.publicCount,
      privateCount: entry.privateCount,
      lockedCount: entry.lockedCount,
      editableCount: entry.editableCount,
      slugs: Array.from(entry.slugs),
      lastUpdatedMs: entry.lastUpdatedMs,
    }))
    .sort((a, b) => b.pageCount - a.pageCount || a.tag.localeCompare(b.tag, 'en-US'));

  return {
    tags,
    taggedPagesCount,
    untaggedPagesCount,
  };
}

function deduplicateTagListCaseInsensitive(tags: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of tags) {
    const clean = normalizeSingleTag(raw);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

export function computeNextTagsForPage(
  page: Pick<WikiPage, 'slug' | 'tags'>,
  op: BulkTagOperation,
  isAdmin: boolean
): ComputedTagUpdate {
  const currentTags = (page.tags ?? []).map((t) => t.trim()).filter(Boolean);
  const isProtected = isProtectedPageRecord(page);

  let candidateTags: string[] = [...currentTags];

  if (op.type === 'add') {
    const additions = parseTagInputList(op.tags.join(','));
    if (additions.length === 0) {
      return { nextTags: currentTags, changed: false, error: 'Enter at least one valid tag to add.' };
    }
    candidateTags = deduplicateTagListCaseInsensitive([...currentTags, ...additions]);
  } else if (op.type === 'remove') {
    const targets = new Set(parseTagInputList(op.tags.join(',')).map((t) => t.toLowerCase()));
    if (targets.size === 0) {
      return {
        nextTags: currentTags,
        changed: false,
        error: 'Select or enter at least one tag to remove.',
      };
    }
    if (isProtected && !isAdmin) {
      for (const protectedTag of PROTECTED_SYSTEM_TAGS) {
        if (targets.has(protectedTag) && currentTags.some((t) => t.toLowerCase() === protectedTag)) {
          return {
            nextTags: currentTags,
            changed: false,
            error: `Cannot remove protected system tag #${protectedTag} from personal or discussion pages.`,
          };
        }
      }
    }
    candidateTags = currentTags.filter((tag) => !targets.has(tag.toLowerCase()));
  } else if (op.type === 'rename') {
    const fromClean = normalizeSingleTag(op.fromTag);
    const toClean = normalizeSingleTag(op.toTag);
    if (!fromClean || !toClean) {
      return {
        nextTags: currentTags,
        changed: false,
        error: 'Both the existing tag and the replacement tag are required.',
      };
    }
    const fromKey = fromClean.toLowerCase();
    if (
      isProtected &&
      !isAdmin &&
      PROTECTED_SYSTEM_TAGS.has(fromKey) &&
      toClean.toLowerCase() !== fromKey
    ) {
      return {
        nextTags: currentTags,
        changed: false,
        error: `Cannot rename protected system tag #${fromClean} on personal or discussion pages.`,
      };
    }
    const hasFrom = currentTags.some((t) => t.toLowerCase() === fromKey);
    if (!hasFrom) {
      return { nextTags: currentTags, changed: false };
    }
    candidateTags = deduplicateTagListCaseInsensitive(
      currentTags.map((t) => (t.toLowerCase() === fromKey ? toClean : t))
    );
  } else if (op.type === 'replace') {
    let replacement = parseTagInputList(op.tags.join(','));
    if (isProtected && !isAdmin) {
      for (const protectedTag of PROTECTED_SYSTEM_TAGS) {
        if (
          currentTags.some((t) => t.toLowerCase() === protectedTag) &&
          !replacement.some((t) => t.toLowerCase() === protectedTag)
        ) {
          replacement = [protectedTag, ...replacement];
        }
      }
      replacement = deduplicateTagListCaseInsensitive(replacement);
    }
    candidateTags = replacement;
  }

  if (candidateTags.length > VALIDATION_LIMITS.TAGS_MAX_COUNT) {
    return {
      nextTags: currentTags,
      changed: false,
      error: `Exceeds the limit of ${VALIDATION_LIMITS.TAGS_MAX_COUNT} tags per page (would result in ${candidateTags.length}).`,
    };
  }

  const sameLength = candidateTags.length === currentTags.length;
  const changed =
    !sameLength || candidateTags.some((tag, idx) => tag !== currentTags[idx]);

  return {
    nextTags: candidateTags,
    changed,
  };
}

export function describeBulkTagOperation(op: BulkTagOperation): string {
  switch (op.type) {
    case 'add': {
      const list = parseTagInputList(op.tags.join(','));
      return `Bulk tag update: added ${list.map((t) => `#${t}`).join(', ')}`;
    }
    case 'remove': {
      const list = parseTagInputList(op.tags.join(','));
      return `Bulk tag update: removed ${list.map((t) => `#${t}`).join(', ')}`;
    }
    case 'rename':
      return `Bulk tag update: renamed #${normalizeSingleTag(op.fromTag)} to #${normalizeSingleTag(
        op.toTag
      )}`;
    case 'replace': {
      const list = parseTagInputList(op.tags.join(','));
      return list.length > 0
        ? `Bulk tag update: set tags to ${list.map((t) => `#${t}`).join(', ')}`
        : 'Bulk tag update: cleared all tags';
    }
  }
}
