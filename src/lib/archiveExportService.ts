import JSZip from 'jszip';
import type { Timestamp } from 'firebase/firestore';
import { toWikiSlug } from './markdownUtils';
import type { WikiPage } from '../types/wiki';

export interface ArchiveExportResult {
  fileName: string;
  pageCount: number;
  byteSize: number;
}

function formatTimestampIso(value: Timestamp | Date | null | undefined): string {
  if (!value) return '';
  if (typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return '';
}

function buildMarkdownDocument(page: WikiPage): string {
  const createdIso = formatTimestampIso(page.createdAt);
  const updatedIso = formatTimestampIso(page.updatedAt);

  const frontmatterLines = [
    '---',
    `slug: ${JSON.stringify(page.slug)}`,
    `title: ${JSON.stringify(page.title)}`,
    `category: ${JSON.stringify(page.category)}`,
    `tags: ${JSON.stringify(page.tags ?? [])}`,
    `visibility: ${JSON.stringify(page.visibility)}`,
    `isLocked: ${String(Boolean(page.isLocked))}`,
    `authorId: ${JSON.stringify(page.authorId)}`,
    `authorName: ${JSON.stringify(page.authorName)}`,
    `lastEditorId: ${JSON.stringify(page.lastEditorId)}`,
    `lastEditorName: ${JSON.stringify(page.lastEditorName)}`,
    `version: ${String(page.version ?? 1)}`,
    ...(createdIso ? [`createdAt: ${JSON.stringify(createdIso)}`] : []),
    ...(updatedIso ? [`updatedAt: ${JSON.stringify(updatedIso)}`] : []),
    '---',
  ];

  const normalizedBody = (page.content ?? '').replace(/\r\n/g, '\n').trimEnd();
  const hasLeadingH1 = /^#\s+\S/.test(normalizedBody.trimStart());
  const bodySection = hasLeadingH1
    ? normalizedBody
    : normalizedBody
    ? `# ${page.title}\n\n${normalizedBody}`
    : `# ${page.title}`;

  return `${frontmatterLines.join('\n')}\n\n${bodySection}\n`;
}

function sanitizeArchiveBaseName(siteTitle?: string): string {
  const slug = toWikiSlug(siteTitle || 'wiki-archive');
  return slug || 'wiki-archive';
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}

/**
 * Packages all public wiki pages into a downloadable ZIP archive
 * containing one Markdown file (<slug>.md) per public article plus an archive manifest.
 */
export async function exportPublicWikiArchiveZip(
  pages: WikiPage[],
  siteTitle?: string
): Promise<ArchiveExportResult> {
  const uniquePublicPages = new Map<string, WikiPage>();
  for (const page of pages) {
    if (page.visibility !== 'public') continue;
    if (!uniquePublicPages.has(page.slug)) {
      uniquePublicPages.set(page.slug, page);
    }
  }

  const publicPages = Array.from(uniquePublicPages.values()).sort((a, b) =>
    a.slug.localeCompare(b.slug, 'en-US')
  );

  if (publicPages.length === 0) {
    throw new Error('There are no public wiki pages available to export.');
  }

  const zip = new JSZip();
  const exportedAt = new Date().toISOString();

  const manifestEntries = publicPages.map((page) => {
    const entryFileName = `${page.slug}.md`;
    zip.file(entryFileName, buildMarkdownDocument(page));

    return {
      slug: page.slug,
      file: entryFileName,
      title: page.title,
      category: page.category,
      tags: page.tags ?? [],
      isLocked: Boolean(page.isLocked),
      authorName: page.authorName,
      lastEditorName: page.lastEditorName,
      version: page.version,
      createdAt: formatTimestampIso(page.createdAt) || null,
      updatedAt: formatTimestampIso(page.updatedAt) || null,
    };
  });

  zip.file(
    'archive-manifest.json',
    `${JSON.stringify(
      {
        siteTitle: siteTitle || 'WazzimaGiygg Maker',
        exportedAt,
        visibilityScope: 'public',
        pageCount: publicPages.length,
        pages: manifestEntries,
      },
      null,
      2
    )}\n`
  );

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const dateStamp = exportedAt.slice(0, 10);
  const baseName = sanitizeArchiveBaseName(siteTitle);
  const fileName = `${baseName}-public-archive-${dateStamp}.zip`;

  triggerBlobDownload(blob, fileName);

  return {
    fileName,
    pageCount: publicPages.length,
    byteSize: blob.size,
  };
}
