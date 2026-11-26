import type { User } from 'firebase/auth';
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toWikiSlug } from '../lib/markdownUtils';
import {
  ENGLISH_COMMUNITY_TEMPLATES,
  extractSpeedyDeletionTemplate,
  listCustomWikiTemplates,
  prepareTemplateSourceForDirectView,
  resolveWikiTemplates,
  serializePredefinicaoBlock,
  STARTER_TEMPLATE_CATEGORY,
  STARTER_TEMPLATE_CONTENT,
  STARTER_TEMPLATE_SLUG,
  STARTER_TEMPLATE_SUMMARY,
  STARTER_TEMPLATE_TAGS,
  STARTER_TEMPLATE_TITLE,
  WIKI_TEMPLATE_CATALOG,
  type SpeedyDeletionTemplateMatch,
  type StarterTemplateSeed,
  type TemplateBlockVariant,
  type TemplateExpansionOptions,
  type WikiTemplateCatalogItem,
  type WikiTemplateParamSpec,
} from '../lib/templateEngine';
import { createWikiPage, updateWikiPage } from '../lib/wikiService';
import {
  type PageVisibility,
  VALIDATION_LIMITS,
  type WikiPage,
} from '../types/wiki';

export {
  ENGLISH_COMMUNITY_TEMPLATES,
  extractSpeedyDeletionTemplate,
  prepareTemplateSourceForDirectView,
  resolveWikiTemplates,
  serializePredefinicaoBlock,
  STARTER_TEMPLATE_CATEGORY,
  STARTER_TEMPLATE_CONTENT,
  STARTER_TEMPLATE_SLUG,
  STARTER_TEMPLATE_SUMMARY,
  STARTER_TEMPLATE_TAGS,
  STARTER_TEMPLATE_TITLE,
  WIKI_TEMPLATE_CATALOG,
};

export type {
  SpeedyDeletionTemplateMatch,
  StarterTemplateSeed,
  TemplateBlockVariant,
  TemplateExpansionOptions,
  WikiTemplateCatalogItem,
  WikiTemplateParamSpec,
};

export interface TemplateSyntaxValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  detectedParams: ExtractedTemplateParam[];
}

export interface ExtractedTemplateParam {
  name: string;
  defaultValue: string;
  isPositional: boolean;
}

export interface CommunityTemplateSummary {
  slug: string;
  name: string;
  title: string;
  description: string;
  bodyPreview: string;
  params: ExtractedTemplateParam[];
  page: WikiPage;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  body: string;
  visibility?: PageVisibility;
  isLocked?: boolean;
  summary?: string;
}

const TEMPLATE_PARAM_REGEX = /\{\{\{([^{}|]+?)(?:\|([^{}]*?))?\}\}\}/g;

/**
 * Checks whether a slug or WikiPage belongs to the MediaWiki Predefinição/Template namespace.
 */
export function isTemplatePageSlug(slug: string): boolean {
  const normalized = slug.trim().toLowerCase();
  return normalized.startsWith('predefinicao-') || normalized.startsWith('template-');
}

export function isTemplatePage(page: Pick<WikiPage, 'slug' | 'tags'>): boolean {
  if (isTemplatePageSlug(page.slug)) return true;
  return page.tags.some((t) => {
    const clean = t
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    return clean === 'predefinicao' || clean === 'template';
  });
}

/**
 * Converts a user-supplied template display name (e.g., "Nota Histórica") into
 * a Firestore-safe `predefinicao-*` slug matching `^[a-zA-Z0-9_-]+$`.
 */
export function formatTemplateSlug(rawName: string): string {
  const withoutNs = rawName.replace(/^(predefini[cç][aã]o|predefinicao|template)\s*:\s*/i, '').trim();
  const baseSlug = toWikiSlug(withoutNs);
  if (!baseSlug) return '';
  if (baseSlug.startsWith('predefinicao-') || baseSlug.startsWith('template-')) {
    return baseSlug.slice(0, VALIDATION_LIMITS.SLUG_MAX_LENGTH);
  }
  return toWikiSlug(`predefinicao-${baseSlug}`);
}

/**
 * Formats a clean MediaWiki-style page title (`Predefinição:<Name>`).
 */
export function formatTemplateTitle(rawName: string): string {
  const withoutNs = rawName.replace(/^(predefini[cç][aã]o|predefinicao|template)\s*:\s*/i, '').trim();
  const safeName = (withoutNs || 'New Template').slice(0, VALIDATION_LIMITS.TITLE_MAX_LENGTH - 9);
  return `Template:${safeName}`.slice(0, VALIDATION_LIMITS.TITLE_MAX_LENGTH);
}

/**
 * Extracts all declared parameters (`{{{nome|padrão}}}` or `{{{1|padrão}}}`) from template source.
 */
export function extractTemplateParameters(templateSource: string): ExtractedTemplateParam[] {
  const seen = new Map<string, ExtractedTemplateParam>();
  const regex = new RegExp(TEMPLATE_PARAM_REGEX.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(templateSource)) !== null) {
    const name = match[1].trim();
    if (!name || seen.has(name)) continue;
    seen.set(name, {
      name,
      defaultValue: (match[2] ?? '').trim(),
      isPositional: /^\d+$/.test(name),
    });
  }

  return Array.from(seen.values()).sort((a, b) => {
    if (a.isPositional && b.isPositional) return Number(a.name) - Number(b.name);
    if (a.isPositional) return -1;
    if (b.isPositional) return 1;
    return a.name.localeCompare(b.name, 'en-US');
  });
}

/**
 * Extracts `<noinclude>` documentation text for display in template pickers.
 */
export function extractTemplateDocumentation(templateSource: string): string {
  const matches: string[] = [];
  const noincludeRegex = /<noinclude>([\s\S]*?)<\/noinclude>/gi;
  let m: RegExpExecArray | null;
  while ((m = noincludeRegex.exec(templateSource)) !== null) {
    const cleaned = m[1].trim();
    if (cleaned) matches.push(cleaned);
  }
  return matches.join('\n').trim();
}

/**
 * Builds a clean MediaWiki template call syntax `{{Predefinição:Nome|arg|chave=valor}}`
 * from a template name and parameter map.
 */
export function buildTemplateInvocation(
  templateName: string,
  params: Record<string, string> = {},
  useNamespace = true
): string {
  const isEnglishNs = /^template\s*:/i.test(templateName.trim());
  const cleanName = templateName.replace(/^(predefini[cç][aã]o|predefinicao|template)\s*:\s*/i, '').trim();
  const displayName = useNamespace
    ? `${isEnglishNs ? 'Template' : 'Predefinição'}:${cleanName}`
    : cleanName;

  const positionalEntries: Array<[number, string]> = [];
  const namedEntries: Array<[string, string]> = [];

  for (const [rawKey, rawValue] of Object.entries(params)) {
    const val = rawValue.trim();
    if (!val) continue;
    if (/^\d+$/.test(rawKey)) {
      positionalEntries.push([Number(rawKey), val]);
    } else {
      namedEntries.push([rawKey.trim(), val]);
    }
  }

  positionalEntries.sort((a, b) => a[0] - b[0]);

  const tokens: string[] = [];
  if (positionalEntries.length > 0) {
    const maxPos = positionalEntries[positionalEntries.length - 1][0];
    const posMap = new Map(positionalEntries);
    for (let idx = 1; idx <= maxPos; idx++) {
      tokens.push(posMap.get(idx) ?? '');
    }
  }
  for (const [k, v] of namedEntries) {
    tokens.push(`${k}=${v}`);
  }

  return tokens.length > 0
    ? `{{${displayName}|${tokens.join('|')}}}`
    : `{{${displayName}}}`;
}

/**
 * Validates MediaWiki template wikitext syntax for balanced `{{}}` / `{{{}}}`,
 * `<noinclude>` / `<includeonly>` tags, empty parameter names, and self-recursion.
 */
export function validateTemplateSyntax(
  source: string,
  selfTemplateName?: string
): TemplateSyntaxValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trimmed = source.trim();

  if (!trimmed) {
    errors.push('The template body cannot be empty.');
  }

  if (source.length > VALIDATION_LIMITS.CONTENT_MAX_LENGTH) {
    errors.push(
      `Content exceeds the maximum limit of ${VALIDATION_LIMITS.CONTENT_MAX_LENGTH.toLocaleString('en-US')} characters.`
    );
  }

  // Strip code blocks before checking MediaWiki braces
  const nonCode = trimmed.replace(/```[\s\S]*?```|`[^`\n]+`/g, '');

  // Check balanced {{{...}}} and {{...}}
  let braceBalance = 0;
  for (let i = 0; i < nonCode.length; i++) {
    if (nonCode[i] === '{') braceBalance += 1;
    else if (nonCode[i] === '}') braceBalance -= 1;
    if (braceBalance < 0) {
      errors.push('Unmatched closing brace "}" without an opening brace.');
      break;
    }
  }
  if (braceBalance > 0) {
    errors.push('Opening braces "{{" or "{{{" were not closed properly.');
  }

  if (/\{\{\{\s*(?:\|[^}]*)?\}\}\}/.test(nonCode)) {
    errors.push('Empty parameter placeholder ({{{}}}) found. Provide a name or index, such as {{{1}}} or {{{text}}}.');
  }

  const openNoinclude = (nonCode.match(/<noinclude>/gi) ?? []).length;
  const closeNoinclude = (nonCode.match(/<\/noinclude>/gi) ?? []).length;
  if (openNoinclude !== closeNoinclude) {
    errors.push('<noinclude> and </noinclude> tags are unbalanced.');
  }

  const openIncludeonly = (nonCode.match(/<includeonly>/gi) ?? []).length;
  const closeIncludeonly = (nonCode.match(/<\/includeonly>/gi) ?? []).length;
  if (openIncludeonly !== closeIncludeonly) {
    errors.push('<includeonly> and </includeonly> tags are unbalanced.');
  }

  const transcludable = nonCode
    .replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, '')
    .replace(/<\/?includeonly>/gi, '')
    .trim();

  if (trimmed && !transcludable) {
    warnings.push('All content is inside <noinclude>; nothing will be inserted when this template is called.');
  }

  if (selfTemplateName) {
    const cleanSelf = selfTemplateName
      .replace(/^(predefini[cç][aã]o|predefinicao|template)\s*:\s*/i, '')
      .trim()
      .toLowerCase();
    if (cleanSelf) {
      const escaped = cleanSelf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const selfCallRegex = new RegExp(
        `\\{\\{\\s*(?:(?:predefini[cç][aã]o|predefinicao|template)\\s*:\\s*)?${escaped}\\s*(?:\\||\\}\\})`,
        'i'
      );
      if (selfCallRegex.test(transcludable)) {
        errors.push(`Direct recursion detected: template "${selfTemplateName}" cannot call itself outside <noinclude>.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    detectedParams: extractTemplateParameters(transcludable || source),
  };
}

/**
 * Full schema and syntax validation for creating or updating a MediaWiki template document.
 */
export function validateTemplateDefinition(
  input: CreateTemplateInput,
  existingSlugs?: Set<string>
): TemplateSyntaxValidationResult & { slug: string; title: string } {
  const slug = formatTemplateSlug(input.name);
  const title = formatTemplateTitle(input.name);
  const syntax = validateTemplateSyntax(composeTemplateSource(input.body, input.description), input.name);
  const errors = [...syntax.errors];

  if (!slug || !VALIDATION_LIMITS.SLUG_PATTERN.test(slug)) {
    errors.unshift('Enter a valid name to generate a compatible identifier.');
  } else if (existingSlugs && existingSlugs.has(slug)) {
    errors.unshift(`A template already exists with identifier :${slug}.`);
  }

  if (title.length > VALIDATION_LIMITS.TITLE_MAX_LENGTH) {
    errors.push(`Title exceeds ${VALIDATION_LIMITS.TITLE_MAX_LENGTH} characters.`);
  }

  return {
    ...syntax,
    valid: errors.length === 0,
    errors,
    slug,
    title,
  };
}

/**
 * Expands MediaWiki-style templates (`{{NomeDaPredefinição|parâmetro}}`) across
 * article wikitext / Markdown, supporting built-in templates, dynamic parameters,
 * magic words, nested braces, `<noinclude>` / `<includeonly>`, and community templates in Firestore.
 */
export function expandTemplatesInWikitext(
  wikitext: string,
  pages: WikiPage[] = [],
  options?: TemplateExpansionOptions
): string {
  return resolveWikiTemplates(wikitext, pages, options);
}

/**
 * Summarizes user-created community templates from the loaded WikiPage list.
 */
export function listCommunityTemplates(pages: WikiPage[] = []): CommunityTemplateSummary[] {
  return listCustomWikiTemplates(pages).map((page) => {
    const cleanName = page.title
      .replace(/^(predefini[cç][aã]o|predefinicao|template)\s*:\s*/i, '')
      .trim();
    const docText = extractTemplateDocumentation(page.content);
    const transcludable = page.content
      .replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, '')
      .replace(/<\/?includeonly>/gi, '')
      .trim();

    return {
      slug: page.slug,
      name: cleanName || page.title,
      title: page.title,
      description: docText,
      bodyPreview: transcludable,
      params: extractTemplateParameters(transcludable || page.content),
      page,
    };
  });
}

/**
 * Queries persisted public (and caller's own private) template pages directly from Firestore.
 */
export async function fetchCommunityTemplatesFromFirestore(
  viewerUid?: string | null
): Promise<CommunityTemplateSummary[]> {
  try {
    const publicSnap = await getDocs(
      query(collection(db, 'pages'), where('visibility', '==', 'public'))
    );
    const merged = new Map<string, WikiPage>();
    publicSnap.forEach((docSnap) => {
      const data = docSnap.data() as WikiPage;
      if (isTemplatePage(data)) {
        merged.set(data.slug, data);
      }
    });

    if (viewerUid) {
      const ownSnap = await getDocs(
        query(collection(db, 'pages'), where('authorId', '==', viewerUid))
      );
      ownSnap.forEach((docSnap) => {
        const data = docSnap.data() as WikiPage;
        if (isTemplatePage(data)) {
          merged.set(data.slug, data);
        }
      });
    }

    return listCommunityTemplates(Array.from(merged.values()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'pages');
  }
}

/**
 * Subscribes in real time to public community templates in Firestore.
 */
export function subscribeCommunityTemplates(
  onChange: (templates: CommunityTemplateSummary[]) => void
): Unsubscribe {
  const q = query(collection(db, 'pages'), where('visibility', '==', 'public'));
  return onSnapshot(
    q,
    (snap) => {
      const pages = snap.docs
        .map((d) => d.data() as WikiPage)
        .filter((page) => isTemplatePage(page));
      onChange(listCommunityTemplates(pages));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pages');
    }
  );
}

/**
 * Composes well-formed MediaWiki template source wrapping optional documentation inside `<noinclude>`.
 */
export function composeTemplateSource(body: string, description?: string): string {
  const trimmedBody = body.trim();
  const trimmedDoc = description?.trim() ?? '';
  if (!trimmedDoc) {
    return trimmedBody;
  }
  return `<noinclude>\n${trimmedDoc}\n\n</noinclude>${trimmedBody}`;
}

/**
 * Creates and persists a new reusable MediaWiki-style template in Firestore (`pages/{predefinicao-*}`),
 * generating initial revision `v_1` and collaborator edit history compliant with `firestore.rules`.
 */
export async function createTemplateModel(
  input: CreateTemplateInput,
  user: User
): Promise<{ slug: string; title: string; content: string; invocation: string }> {
  const validation = validateTemplateDefinition(input);
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }

  const { slug, title } = validation;
  const fullContent = composeTemplateSource(input.body, input.description).slice(
    0,
    VALIDATION_LIMITS.CONTENT_MAX_LENGTH
  );

  await createWikiPage(
    {
      slug,
      title,
      content: fullContent,
      category: 'reference',
      tags: ['predefinicao', 'template'],
      visibility: input.visibility ?? 'public',
      isLocked: input.isLocked ?? false,
      summary:
        input.summary?.trim() ||
        `Created reusable template ${title}`,
    },
    user
  );

  const defaultInvocationMap: Record<string, string> = {};
  for (const param of validation.detectedParams) {
    defaultInvocationMap[param.name] = param.defaultValue || param.name;
  }

  const cleanDisplayName = title.replace(/^(?:predefini[cç][aã]o|predefinicao|template)\s*:\s*/i, '');
  const invocation = buildTemplateInvocation(cleanDisplayName, defaultInvocationMap, true);

  return {
    slug,
    title,
    content: fullContent,
    invocation,
  };
}

/**
 * Updates an existing user-created template page while preserving revision history in Firestore.
 */
export async function updateTemplateModel(
  existingPage: WikiPage,
  input: {
    name?: string;
    description?: string;
    body: string;
    visibility?: PageVisibility;
    isLocked?: boolean;
    summary?: string;
  },
  user: User,
  canManageMeta: boolean
): Promise<void> {
  const title = input.name?.trim() ? formatTemplateTitle(input.name) : existingPage.title;
  const fullContent = composeTemplateSource(input.body, input.description).slice(
    0,
    VALIDATION_LIMITS.CONTENT_MAX_LENGTH
  );

  const syntax = validateTemplateSyntax(fullContent, title);
  if (!syntax.valid) {
    throw new Error(syntax.errors[0]);
  }

  const tags = existingPage.tags.some((t) => t.toLowerCase() === 'predefinicao')
    ? existingPage.tags
    : ['predefinicao', 'template', ...existingPage.tags].slice(0, VALIDATION_LIMITS.TAGS_MAX_COUNT);

  await updateWikiPage(
    existingPage,
    {
      slug: existingPage.slug,
      title,
      content: fullContent,
      category: existingPage.category || 'reference',
      tags,
      visibility: input.visibility ?? existingPage.visibility,
      isLocked: input.isLocked ?? existingPage.isLocked,
      summary: input.summary?.trim() || `Updated template ${title}`,
    },
    user,
    canManageMeta
  );
}
