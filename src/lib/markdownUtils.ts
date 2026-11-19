import type { Timestamp } from 'firebase/firestore';
import { VALIDATION_LIMITS } from '../types/wiki';

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Normalizes arbitrary user text into a Firestore-safe wiki slug matching ^[a-zA-Z0-9_-]+$.
 */
export function toWikiSlug(input: string): string {
  const cleaned = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return cleaned.slice(0, VALIDATION_LIMITS.SLUG_MAX_LENGTH);
}

/**
 * Converts a slug into a readable fallback title (e.g., "guia-markdown" -> "Guia Markdown").
 */
export function slugToTitle(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function isValidWikiSlug(slug: string): boolean {
  return (
    slug.length >= 1 &&
    slug.length <= VALIDATION_LIMITS.SLUG_MAX_LENGTH &&
    VALIDATION_LIMITS.SLUG_PATTERN.test(slug)
  );
}

/**
 * Transforms Wikidot-style internal links [[slug]] or [[slug|Label]] into
 * markdown links targeting `https://wiki.internal/<slug>` outside fenced code blocks.
 */
export function preprocessWikiLinks(markdown: string): string {
  const parts = markdown.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
  return parts
    .map((segment, index) => {
      // Odd segments are code blocks or inline code — leave untouched
      if (index % 2 === 1) {
        return segment;
      }
      return segment.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_match, rawSlug: string, rawLabel?: string) => {
        const slug = toWikiSlug(rawSlug) || 'start';
        const label = (rawLabel ?? rawSlug).trim();
        return `[${label}](https://wiki.internal/${slug})`;
      });
    })
    .join('');
}

/**
 * Extracts H2 and H3 headings from Markdown (ignoring fenced code blocks) for the page Table of Contents.
 */
export function extractToc(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const items: TocItem[] = [];
  let inCodeFence = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const match = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (match) {
      const level = match[1].length as 2 | 3;
      const text = match[2].replace(/[*_`[\]]/g, '').trim();
      const id = toWikiSlug(text) || `sec-${items.length + 1}`;
      items.push({ id, text, level });
    }
  }

  return items;
}

export function formatRelativeTime(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return 'agora mesmo';
  const date = timestamp.toDate();
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 60) return 'agora mesmo';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `há ${diffDays}d`;

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatAbsoluteTime(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return '—';
  return timestamp.toDate().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
