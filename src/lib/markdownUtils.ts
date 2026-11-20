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

export type InfoboxType =
  | 'general'
  | 'user'
  | 'character'
  | 'location'
  | 'item'
  | 'organization'
  | 'project';

export type InfoboxLayout = 'right' | 'left' | 'full';

export interface InfoboxField {
  key: string;
  value: string;
}

export interface InfoboxBlock {
  type: InfoboxType;
  title: string;
  subtitle?: string;
  image?: string;
  imageCaption?: string;
  layout: InfoboxLayout;
  fields: InfoboxField[];
}

export interface InfoboxPreset {
  type: InfoboxType;
  label: string;
  description: string;
  defaultTitle: string;
  defaultSubtitle: string;
  suggestedFields: InfoboxField[];
}

export const INFOBOX_TYPE_PRESETS: InfoboxPreset[] = [
  {
    type: 'general',
    label: 'General',
    description: 'Clean summary card for general wiki topics and concepts.',
    defaultTitle: 'Topic Overview',
    defaultSubtitle: 'Reference summary',
    suggestedFields: [
      { key: 'Category', value: 'Core Documentation' },
      { key: 'Status', value: 'Active' },
      { key: 'Related', value: '[[start|Home]]' },
    ],
  },
  {
    type: 'user',
    label: 'User / Collaborator',
    description: 'Identification card for wiki collaborators and personal user pages.',
    defaultTitle: 'Collaborator Name',
    defaultSubtitle: 'Wiki Collaborator',
    suggestedFields: [
      { key: 'Handle', value: ':member-slug' },
      { key: 'Member ID', value: '`uid-prefix`' },
      { key: 'Discussion', value: '[[start|Talk Page]]' },
      { key: 'Role', value: 'Collaborator' },
      { key: 'Status', value: 'Active' },
    ],
  },
  {
    type: 'character',
    label: 'Character',
    description: 'Biographical dossier for people, heroes, or historical figures.',
    defaultTitle: 'Character Name',
    defaultSubtitle: 'Title or role',
    suggestedFields: [
      { key: 'Alias', value: 'Known nickname' },
      { key: 'Affiliation', value: 'Guild or faction' },
      { key: 'Origin', value: 'Homeland or birthplace' },
      { key: 'Status', value: 'Active' },
      { key: 'First Appearance', value: 'Chapter 1' },
    ],
  },
  {
    type: 'location',
    label: 'Location',
    description: 'Geographic specs for cities, regions, landmarks, or realms.',
    defaultTitle: 'Location Name',
    defaultSubtitle: 'Region or realm',
    suggestedFields: [
      { key: 'Type', value: 'Citadel / Settlement' },
      { key: 'Region', value: 'Northern Marches' },
      { key: 'Climate', value: 'Temperate' },
      { key: 'Population', value: '~42,000' },
      { key: 'Governance', value: 'Council Charter' },
    ],
  },
  {
    type: 'item',
    label: 'Item / Artifact',
    description: 'Specifications for tools, relics, equipment, or collectibles.',
    defaultTitle: 'Artifact Name',
    defaultSubtitle: 'Item classification',
    suggestedFields: [
      { key: 'Category', value: 'Relic' },
      { key: 'Rarity', value: 'Unique' },
      { key: 'Creator', value: 'Unknown artisan' },
      { key: 'Origin', value: 'First Era' },
      { key: 'Properties', value: 'Lightweight, resonant' },
    ],
  },
  {
    type: 'organization',
    label: 'Organization',
    description: 'Profiles for factions, teams, guilds, or institutions.',
    defaultTitle: 'Organization Name',
    defaultSubtitle: 'Motto or mandate',
    suggestedFields: [
      { key: 'Type', value: 'Collaborative Guild' },
      { key: 'Leader', value: 'Archivist Council' },
      { key: 'Headquarters', value: 'Central Archive' },
      { key: 'Founded', value: '2024' },
      { key: 'Alignment', value: 'Open Knowledge' },
    ],
  },
  {
    type: 'project',
    label: 'Project / System',
    description: 'Technical card for software modules, systems, or events.',
    defaultTitle: 'System Module',
    defaultSubtitle: 'Technical specification',
    suggestedFields: [
      { key: 'Status', value: 'Production' },
      { key: 'Version', value: 'v1.0.0' },
      { key: 'Maintainer', value: 'Core Team' },
      { key: 'Stack', value: 'TypeScript, Firebase' },
      { key: 'License', value: 'Apache-2.0' },
    ],
  },
];

const VALID_INFOBOX_TYPES = new Set<InfoboxType>([
  'general',
  'user',
  'character',
  'location',
  'item',
  'organization',
  'project',
]);

export type MarkdownSegment =
  | { kind: 'markdown'; content: string }
  | { kind: 'infobox'; infobox: InfoboxBlock };

function normalizeInfoboxType(raw?: string): InfoboxType {
  const candidate = (raw ?? 'general').trim().toLowerCase() as InfoboxType;
  return VALID_INFOBOX_TYPES.has(candidate) ? candidate : 'general';
}

function parseInfoboxBody(rawType: string | undefined, body: string): InfoboxBlock {
  const type = normalizeInfoboxType(rawType);
  let title = '';
  let subtitle: string | undefined;
  let image: string | undefined;
  let imageCaption: string | undefined;
  let layout: InfoboxLayout = 'right';
  const fields: InfoboxField[] = [];

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx <= 0) continue;

    const rawKey = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    const lowerKey = rawKey.toLowerCase();

    if (lowerKey === 'title') {
      title = value;
    } else if (lowerKey === 'subtitle') {
      subtitle = value || undefined;
    } else if (lowerKey === 'image') {
      image = value || undefined;
    } else if (lowerKey === 'imagecaption' || lowerKey === 'caption' || lowerKey === 'image_caption') {
      imageCaption = value || undefined;
    } else if (lowerKey === 'layout' || lowerKey === 'align') {
      const normalizedLayout = value.toLowerCase();
      if (normalizedLayout === 'left' || normalizedLayout === 'full' || normalizedLayout === 'right') {
        layout = normalizedLayout;
      }
    } else if (rawKey && value) {
      fields.push({ key: rawKey, value });
    }
  }

  if (!title) {
    const preset = INFOBOX_TYPE_PRESETS.find((p) => p.type === type);
    title = preset?.label ?? 'Infobox';
  }

  return {
    type,
    title,
    subtitle,
    image,
    imageCaption,
    layout,
    fields,
  };
}

/**
 * Splits Markdown into plain Markdown segments and structured :::infobox blocks,
 * preserving fenced code blocks (``` ... ```) intact.
 */
export function parseMarkdownWithInfoboxes(markdown: string): MarkdownSegment[] {
  const codeChunks = markdown.split(/(```[\s\S]*?```)/g);
  const segments: MarkdownSegment[] = [];

  const pushMarkdown = (text: string) => {
    if (!text) return;
    const prev = segments[segments.length - 1];
    if (prev && prev.kind === 'markdown') {
      prev.content += text;
    } else {
      segments.push({ kind: 'markdown', content: text });
    }
  };

  const infoboxRegex = /^:::infobox(?:[ \t]+([a-zA-Z0-9_-]+))?[ \t]*\r?\n([\s\S]*?)^:::[ \t]*$/gm;

  for (let i = 0; i < codeChunks.length; i++) {
    const chunk = codeChunks[i];
    if (!chunk) continue;

    // Odd indices are fenced code blocks — leave verbatim as Markdown
    if (i % 2 === 1) {
      pushMarkdown(chunk);
      continue;
    }

    let lastIndex = 0;
    infoboxRegex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = infoboxRegex.exec(chunk)) !== null) {
      const before = chunk.slice(lastIndex, match.index);
      if (before) {
        pushMarkdown(before);
      }
      segments.push({
        kind: 'infobox',
        infobox: parseInfoboxBody(match[1], match[2]),
      });
      lastIndex = match.index + match[0].length;
    }

    const tail = chunk.slice(lastIndex);
    if (tail) {
      pushMarkdown(tail);
    }
  }

  return segments;
}

function cleanInfoboxLineValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function serializeInfoboxBlock(block: InfoboxBlock): string {
  const lines: string[] = [`:::infobox ${block.type}`];
  lines.push(`title: ${cleanInfoboxLineValue(block.title) || 'Untitled'}`);
  if (block.subtitle?.trim()) {
    lines.push(`subtitle: ${cleanInfoboxLineValue(block.subtitle)}`);
  }
  if (block.image?.trim()) {
    lines.push(`image: ${cleanInfoboxLineValue(block.image)}`);
  }
  if (block.imageCaption?.trim()) {
    lines.push(`imageCaption: ${cleanInfoboxLineValue(block.imageCaption)}`);
  }
  if (block.layout && block.layout !== 'right') {
    lines.push(`layout: ${block.layout}`);
  }
  for (const field of block.fields) {
    const key = cleanInfoboxLineValue(field.key).replace(/:/g, '').trim();
    const value = cleanInfoboxLineValue(field.value);
    if (key && value) {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push(':::');
  return lines.join('\n');
}

/**
 * Extracts H2 and H3 headings from Markdown (ignoring fenced code blocks and :::infobox blocks)
 * for the page Table of Contents.
 */
export function extractToc(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const items: TocItem[] = [];
  let inCodeFence = false;
  let inInfobox = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    if (!inInfobox && /^:::infobox(?:\s+[a-zA-Z0-9_-]+)?$/.test(trimmed)) {
      inInfobox = true;
      continue;
    }
    if (inInfobox) {
      if (trimmed === ':::') {
        inInfobox = false;
      }
      continue;
    }

    const match = /^(#{2,3})\s+(.+)$/.exec(trimmed);
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
  if (!timestamp) return 'just now';
  const date = timestamp.toDate();
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatAbsoluteTime(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return '—';
  return timestamp.toDate().toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
