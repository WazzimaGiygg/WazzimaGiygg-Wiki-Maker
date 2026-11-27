import { expandTemplatesInWikitext } from '../services/templateService';
import { WIKI_CATEGORIES, type WikiPage } from '../types/wiki';
import {
  extractArticleCategories,
  extractCategoryLinks,
  normalizeCategoryName,
  normalizeCategorySlug,
  slugToTitle,
  type WikiCategoryTag,
} from './markdownUtils';

export const CATEGORY_PAGE_PREFIX = 'category-';
export const CATEGORY_PAGE_PREFIXES = ['category-', 'categoria-'] as const;

export interface WikiCategoryPageItem {
  page: WikiPage;
  sortKey: string;
}

export interface WikiCategorySubcategoryItem {
  slug: string;
  name: string;
  pageCount: number;
  descriptionPage: WikiPage;
}

export interface WikiCategorySummary {
  slug: string;
  name: string;
  isBuiltinPrimary: boolean;
  descriptionPage: WikiPage | null;
  pages: WikiCategoryPageItem[];
  subcategories: WikiCategorySubcategoryItem[];
  totalCount: number;
}

export interface AlphabeticalPageGroup {
  letter: string;
  items: WikiCategoryPageItem[];
}

export function isCategoryDescriptionSlug(slug: string): boolean {
  return CATEGORY_PAGE_PREFIXES.some(
    (prefix) => slug.startsWith(prefix) && slug.length > prefix.length
  );
}

export function getCategorySlugFromPageSlug(pageSlug: string): string {
  for (const prefix of CATEGORY_PAGE_PREFIXES) {
    if (pageSlug.startsWith(prefix) && pageSlug.length > prefix.length) {
      return pageSlug.slice(prefix.length);
    }
  }
  return pageSlug;
}

export function getCategorySlugFromPage(
  page: Pick<WikiPage, 'slug' | 'title'>
): string | null {
  if (isCategoryDescriptionSlug(page.slug)) {
    return getCategorySlugFromPageSlug(page.slug);
  }
  const titleMatch = /^\s*(?:Category|Categoria)\s*:\s*(.+)$/i.exec(page.title);
  if (titleMatch) {
    const clean = normalizeCategorySlug(titleMatch[1]);
    return clean && clean !== 'uncategorized' ? clean : null;
  }
  return null;
}

export function getCategoryDescriptionPageSlug(categorySlug: string): string {
  const clean = normalizeCategorySlug(categorySlug);
  return `${CATEGORY_PAGE_PREFIX}${clean}`;
}

export function getBuiltinCategoryLabel(categoryId: string): string | null {
  const match = WIKI_CATEGORIES.find((c) => c.id === categoryId);
  return match ? match.label : null;
}

export function formatCategoryDisplayName(slugOrName: string): string {
  const builtin = getBuiltinCategoryLabel(slugOrName);
  if (builtin) return builtin;
  const cleaned = normalizeCategoryName(slugOrName);
  if (!cleaned) return 'Uncategorized';
  if (/^[a-z0-9-]+$/.test(cleaned)) {
    return slugToTitle(cleaned);
  }
  return cleaned;
}

/**
 * Resolves all Wikipedia-style categories attached to a single page
 * (combining its primary folder `page.category` for regular pages with any
 * `[[Category:...]]` declarations extracted from its expanded wikitext).
 */
export function resolvePageCategories(
  page: WikiPage,
  expandedContent?: string
): WikiCategoryTag[] {
  const bySlug = new Map<string, WikiCategoryTag>();
  const isCategoryDesc = getCategorySlugFromPage(page) !== null;

  if (!isCategoryDesc && page.category) {
    const primarySlug = normalizeCategorySlug(page.category);
    const primaryName = formatCategoryDisplayName(page.category);
    bySlug.set(primarySlug, {
      slug: primarySlug,
      name: primaryName,
    });
  }

  const contentToScan = expandedContent ?? page.content;
  const { categories: contentCategories } = extractArticleCategories(contentToScan);
  for (const cat of contentCategories) {
    const existing = bySlug.get(cat.slug);
    if (!existing) {
      bySlug.set(cat.slug, cat);
    } else {
      bySlug.set(cat.slug, {
        slug: existing.slug,
        name: existing.name || cat.name,
        sortKey: cat.sortKey ?? existing.sortKey,
      });
    }
  }

  return Array.from(bySlug.values());
}

/**
 * Aggregates every category across all visible wiki pages, resolving:
 * - Built-in primary categories (`WIKI_CATEGORIES`)
 * - Dynamic `[[Category:...]]` / `[[Categoria:...]]` tags (including template-emitted categories)
 * - Category links inside articles (`[[:Category:...]]`, `[[category-...]]`, `#/category/...`)
 * - Article tags (`page.tags`) matching any existing or created category
 * - Category description pages (`category-<slug>` / `categoria-<slug>` / `Category:...`)
 * - Subcategories (when a category page itself declares `[[Category:Parent]]`)
 */
export function buildWikiCategoryDirectory(
  pages: WikiPage[],
  options?: { enableTemplates?: boolean; ensureCategorySlugs?: string[] }
): WikiCategorySummary[] {
  const enableTemplates = options?.enableTemplates !== false;

  interface MutableBucket {
    slug: string;
    name: string;
    isBuiltinPrimary: boolean;
    descriptionPage: WikiPage | null;
    pagesBySlug: Map<string, WikiCategoryPageItem>;
    subcategoriesBySlug: Map<string, WikiPage>;
  }

  const buckets = new Map<string, MutableBucket>();

  const ensureBucket = (
    rawSlug: string,
    preferredName?: string,
    isBuiltinPrimary = false
  ): MutableBucket => {
    const slug = normalizeCategorySlug(rawSlug);
    let existing = buckets.get(slug);
    if (!existing) {
      existing = {
        slug,
        name: preferredName?.trim() || formatCategoryDisplayName(slug),
        isBuiltinPrimary,
        descriptionPage: null,
        pagesBySlug: new Map(),
        subcategoriesBySlug: new Map(),
      };
      buckets.set(slug, existing);
    } else {
      if (isBuiltinPrimary) {
        existing.isBuiltinPrimary = true;
        if (preferredName?.trim()) {
          existing.name = preferredName.trim();
        }
      } else if (
        preferredName?.trim() &&
        existing.name === formatCategoryDisplayName(slug) &&
        /[A-Z\u00C0-\u024F]/.test(preferredName)
      ) {
        existing.name = preferredName.trim();
      }
    }
    return existing;
  };

  for (const builtin of WIKI_CATEGORIES) {
    ensureBucket(builtin.id, builtin.label, true);
  }

  for (const extraSlug of options?.ensureCategorySlugs ?? []) {
    const cleanExtra = normalizeCategorySlug(extraSlug);
    if (cleanExtra && cleanExtra !== 'uncategorized') {
      ensureBucket(cleanExtra, undefined, Boolean(getBuiltinCategoryLabel(cleanExtra)));
    }
  }

  // First pass: register all created category pages (`category-*`, `categoria-*`, `Category:*`)
  for (const page of pages) {
    const targetCatSlug = getCategorySlugFromPage(page);
    if (targetCatSlug) {
      const rawTitleName = normalizeCategoryName(page.title);
      const bucket = ensureBucket(
        targetCatSlug,
        rawTitleName && rawTitleName.toLowerCase() !== targetCatSlug ? rawTitleName : undefined,
        Boolean(getBuiltinCategoryLabel(targetCatSlug))
      );
      if (
        !bucket.descriptionPage ||
        (!bucket.descriptionPage.slug.startsWith(CATEGORY_PAGE_PREFIX) &&
          page.slug.startsWith(CATEGORY_PAGE_PREFIX))
      ) {
        bucket.descriptionPage = page;
      }
    }
  }

  // Second pass: collect `page.category`, `[[Category:...]]`, and inline category links
  for (const page of pages) {
    const expanded = enableTemplates
      ? expandTemplatesInWikitext(page.content, pages, {
          currentSlug: page.slug,
          currentTitle: page.title,
        })
      : page.content;

    const selfCatSlug = getCategorySlugFromPage(page);
    const attached = resolvePageCategories(page, expanded);
    const linkedCategories = extractCategoryLinks(expanded);

    if (selfCatSlug !== null) {
      // Category description page: explicit [[Category:Parent]] links define subcategories
      for (const cat of attached) {
        if (selfCatSlug !== cat.slug) {
          const bucket = ensureBucket(
            cat.slug,
            cat.name,
            Boolean(getBuiltinCategoryLabel(cat.slug))
          );
          bucket.subcategoriesBySlug.set(selfCatSlug, page);
        }
      }
      continue;
    }

    const combinedBySlug = new Map<string, WikiCategoryTag>();
    for (const cat of attached) {
      combinedBySlug.set(cat.slug, cat);
    }
    for (const linked of linkedCategories) {
      if (!combinedBySlug.has(linked.slug)) {
        combinedBySlug.set(linked.slug, linked);
      }
    }

    for (const cat of combinedBySlug.values()) {
      const bucket = ensureBucket(
        cat.slug,
        cat.name,
        Boolean(getBuiltinCategoryLabel(cat.slug))
      );
      bucket.pagesBySlug.set(page.slug, {
        page,
        sortKey: (cat.sortKey || page.title).trim(),
      });
    }
  }

  // Third pass: attach pages whose `tags` match any existing/created category
  for (const page of pages) {
    if (getCategorySlugFromPage(page) !== null) continue;
    for (const rawTag of page.tags ?? []) {
      const trimmedTag = rawTag.trim();
      if (!trimmedTag) continue;
      const tagSlug = normalizeCategorySlug(trimmedTag);
      if (!tagSlug || (tagSlug === 'uncategorized' && trimmedTag.toLowerCase() !== 'uncategorized')) {
        continue;
      }
      const bucket = buckets.get(tagSlug);
      if (bucket && !bucket.pagesBySlug.has(page.slug)) {
        bucket.pagesBySlug.set(page.slug, {
          page,
          sortKey: page.title.trim(),
        });
      }
    }
  }

  const summaries: WikiCategorySummary[] = [];

  for (const bucket of buckets.values()) {
    const sortedPages = Array.from(bucket.pagesBySlug.values()).sort((a, b) => {
      const cmp = a.sortKey.localeCompare(b.sortKey, undefined, { sensitivity: 'base' });
      if (cmp !== 0) return cmp;
      return a.page.title.localeCompare(b.page.title, undefined, { sensitivity: 'base' });
    });

    const subcategories: WikiCategorySubcategoryItem[] = Array.from(
      bucket.subcategoriesBySlug.entries()
    )
      .map(([subSlug, descPage]) => {
        const subBucket = buckets.get(subSlug);
        return {
          slug: subSlug,
          name: subBucket?.name || formatCategoryDisplayName(subSlug),
          pageCount: subBucket?.pagesBySlug.size ?? 0,
          descriptionPage: descPage,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    summaries.push({
      slug: bucket.slug,
      name: bucket.name,
      isBuiltinPrimary: bucket.isBuiltinPrimary,
      descriptionPage: bucket.descriptionPage,
      pages: sortedPages,
      subcategories,
      totalCount: sortedPages.length + subcategories.length,
    });
  }

  return summaries.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

/**
 * Groups sorted category page entries into A–Z headings (just like MediaWiki Category pages).
 */
export function groupPagesAlphabetically(
  items: WikiCategoryPageItem[]
): AlphabeticalPageGroup[] {
  const groups = new Map<string, WikiCategoryPageItem[]>();

  for (const item of items) {
    const normalizedFirst = (item.sortKey || item.page.title)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .charAt(0)
      .toUpperCase();

    const letter = /[A-Z]/.test(normalizedFirst)
      ? normalizedFirst
      : /[0-9]/.test(normalizedFirst)
      ? '0–9'
      : '#';

    const list = groups.get(letter) ?? [];
    list.push(item);
    groups.set(letter, list);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      if (a === '0–9') return 1;
      if (b === '0–9') return -1;
      return a.localeCompare(b, 'en-US');
    })
    .map(([letter, groupItems]) => ({
      letter,
      items: groupItems,
    }));
}

/**
 * Appends or replaces a `[[Category:Name]]` (or `[[Category:Name|SortKey]]`) declaration
 * cleanly in raw Markdown outside fenced/inline code blocks.
 */
export function upsertCategoryTagInMarkdown(
  markdown: string,
  rawCategoryName: string,
  rawSortKey?: string
): string {
  const cleanName = normalizeCategoryName(rawCategoryName);
  if (!cleanName) return markdown;
  const targetSlug = normalizeCategorySlug(cleanName);
  const cleanSortKey = rawSortKey?.trim();
  const nextTag = cleanSortKey
    ? `[[Category:${cleanName}|${cleanSortKey}]]`
    : `[[Category:${cleanName}]]`;

  const existing = extractArticleCategories(markdown).categories;
  const alreadyHas = existing.some((c) => c.slug === targetSlug);

  if (alreadyHas) {
    if (!cleanSortKey) return markdown;
    return removeCategoryTagFromMarkdown(markdown, targetSlug) + `\n\n${nextTag}`;
  }

  const trimmed = markdown.trimEnd();
  if (!trimmed) return nextTag;
  return `${trimmed}\n\n${nextTag}`;
}

/**
 * Removes all `[[Category:...]]` / `[[Categoria:...]]` declarations matching `categorySlug`
 * outside fenced/inline code blocks without touching inline `[[:Category:...]]` links.
 */
export function removeCategoryTagFromMarkdown(
  markdown: string,
  categorySlug: string
): string {
  const targetSlug = normalizeCategorySlug(categorySlug);
  const codeParts = markdown.split(/(```[\s\S]*?```|~~~[\s\S]*~~~|`[^`\n]+`)/g);

  const cleaned = codeParts
    .map((segment, i) => {
      if (i % 2 === 1) return segment;
      return segment
        .replace(
          /\[\[\s*(?:Category|Categoria)\s*:\s*([^\]|]+?)(?:\|([^\]]*))?\]\]/gi,
          (full, rawName: string) => {
            const name = normalizeCategoryName(rawName);
            if (!name) return full;
            return normalizeCategorySlug(name) === targetSlug ? '' : full;
          }
        )
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n');
    })
    .join('');

  return cleaned.replace(/\n{3,}/g, '\n\n').trimEnd();
}
