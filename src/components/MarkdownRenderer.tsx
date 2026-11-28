import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink, FilePlus2 } from 'lucide-react';
import {
  createHeadingIdAllocator,
  extractArticleCategories,
  extractArticleReferences,
  extractToc,
  parseMarkdownWithInfoboxes,
  preprocessWikiLinks,
  scrollToWikiAnchor,
} from '../lib/markdownUtils';
import { formatCategoryDisplayName } from '../lib/categoryUtils';
import type { WikiPage } from '../types/wiki';
import { expandTemplatesInWikitext } from '../services/templateService';
import {
  applyExternalLinkPrefix,
  DEFAULT_EXTERNAL_LINK_PREFIX,
} from '../lib/extensionsService';
import { CategoriesFooter } from './CategoriesFooter';
import { ReferencesFooter } from './ReferencesFooter';
import { TableOfContents } from './TableOfContents';
import { WikiCitationBadge } from './WikiCitationBadge';
import { WikiInfobox } from './WikiInfobox';
import { WikiTemplateBlock } from './WikiTemplateBlock';

interface MarkdownRendererProps {
  content: string;
  existingSlugs: Set<string>;
  wikiPages?: WikiPage[];
  currentSlug?: string;
  onNavigateSlug: (slug: string) => void;
  onSelectCategory?: (slug: string) => void;
  onOpenAllCategories?: () => void;
  showToc?: boolean;
  tocDefaultExpanded?: boolean;
  tocMinHeadings?: number;
  enableReferences?: boolean;
  referencesTitle?: string;
  enableInfoboxes?: boolean;
  enableTemplates?: boolean;
  showReferencesFooter?: boolean;
  showCategoriesFooter?: boolean;
  primaryCategory?: string;
  externalLinkPrefix?: string;
  encodeExternalLinkTarget?: boolean;
}

function getHeadingText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(getHeadingText).join('');
  if (React.isValidElement<{ children?: React.ReactNode; href?: string }>(children)) {
    if (children.props.href && children.props.href.startsWith('https://wiki.ref/')) {
      return '';
    }
    return getHeadingText(children.props.children);
  }
  return '';
}

function scrollToAnchor(id: string): void {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  existingSlugs,
  wikiPages,
  currentSlug,
  onNavigateSlug,
  onSelectCategory,
  onOpenAllCategories,
  showToc = true,
  tocDefaultExpanded = true,
  tocMinHeadings = 2,
  enableReferences = true,
  referencesTitle = 'References',
  enableInfoboxes = true,
  enableTemplates = true,
  showReferencesFooter = true,
  showCategoriesFooter = false,
  primaryCategory,
  externalLinkPrefix = DEFAULT_EXTERNAL_LINK_PREFIX,
  encodeExternalLinkTarget = false,
}) => {
  const expandedContent = React.useMemo(
    () =>
      enableTemplates
        ? expandTemplatesInWikitext(content, wikiPages, { currentSlug })
        : content,
    [content, wikiPages, currentSlug, enableTemplates]
  );

  const { processedMarkdown: contentWithoutCategoryTags, categories: extractedCategories } =
    React.useMemo(() => extractArticleCategories(expandedContent), [expandedContent]);

  const combinedPreviewCategories = React.useMemo(() => {
    const map = new Map(extractedCategories.map((c) => [c.slug, c]));
    if (primaryCategory) {
      const slug = primaryCategory.trim().toLowerCase();
      if (slug && !map.has(slug)) {
        return [{ slug, name: formatCategoryDisplayName(slug) }, ...extractedCategories];
      }
    }
    return extractedCategories;
  }, [extractedCategories, primaryCategory]);

  const { processedMarkdown, references, inlineReflistGroups } = React.useMemo(
    () =>
      enableReferences
        ? extractArticleReferences(contentWithoutCategoryTags)
        : {
            processedMarkdown: contentWithoutCategoryTags,
            references: [],
            hasInlineReflist: false,
            inlineReflistGroups: [],
          },
    [contentWithoutCategoryTags, enableReferences]
  );

  const inlineReflistGroupSet = React.useMemo(
    () => new Set(inlineReflistGroups.map((g) => g.trim().toLowerCase())),
    [inlineReflistGroups]
  );

  const footerReferences = React.useMemo(
    () =>
      references.filter(
        (ref) => !inlineReflistGroupSet.has((ref.group ?? '').trim().toLowerCase())
      ),
    [references, inlineReflistGroupSet]
  );
  const segments = React.useMemo(
    () =>
      enableInfoboxes || enableTemplates
        ? parseMarkdownWithInfoboxes(processedMarkdown)
        : [{ kind: 'markdown' as const, content: processedMarkdown }],
    [processedMarkdown, enableInfoboxes, enableTemplates]
  );
  const tocItems = React.useMemo(
    () => extractToc(processedMarkdown, { levels: [2, 3] }),
    [processedMarkdown]
  );
  const hasInfobox = React.useMemo(
    () => segments.some((seg) => seg.kind === 'infobox'),
    [segments]
  );

  if (!content.trim()) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 italic py-4">
        This page has no content yet.
      </p>
    );
  }

  // Allocate deterministic deduplicated heading IDs across all Markdown segments in render order
  const allocateHeadingId = createHeadingIdAllocator();

  // Inject Table of Contents at the top of the reading view (right after any leading floated infoboxes)
  let tocInsertIndex = 0;
  while (tocInsertIndex < segments.length) {
    const seg = segments[tocInsertIndex];
    if (seg.kind === 'infobox' && seg.infobox.layout !== 'full') {
      tocInsertIndex += 1;
    } else {
      break;
    }
  }

  const tocNode = showToc ? (
    <TableOfContents
      items={tocItems}
      minHeadings={tocMinHeadings}
      defaultExpanded={tocDefaultExpanded}
    />
  ) : null;

  const renderHeading = (Tag: 'h1' | 'h2' | 'h3', children: React.ReactNode) => {
    const id = allocateHeadingId(getHeadingText(children));
    return (
      <Tag id={id} className="group scroll-mt-20">
        <span>{children}</span>
        <a
          href={`#${id}`}
          onClick={(e) => {
            e.preventDefault();
            scrollToAnchor(id);
          }}
          aria-label={`Jump to section ${getHeadingText(children)}`}
          className="ml-2 inline-block opacity-0 group-hover:opacity-100 focus:opacity-100 font-mono text-[0.75em] font-normal text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 no-underline transition-opacity select-none print:hidden"
        >
          #
        </a>
      </Tag>
    );
  };

  return (
    <div className={`flow-root ${hasInfobox ? 'max-w-4xl' : 'max-w-3xl'}`}>
      {segments.map((segment, index) => {
        const leadingToc = index === tocInsertIndex ? tocNode : null;

        if (segment.kind === 'infobox') {
          return (
            <React.Fragment key={`infobox-${index}-${segment.infobox.title}`}>
              {leadingToc}
              <WikiInfobox
                infobox={segment.infobox}
                existingSlugs={existingSlugs}
                onNavigateSlug={onNavigateSlug}
                externalLinkPrefix={externalLinkPrefix}
                encodeExternalLinkTarget={encodeExternalLinkTarget}
              />
            </React.Fragment>
          );
        }

        if (segment.kind === 'predefinicao') {
          return (
            <React.Fragment key={`predef-${index}-${segment.template.variant}`}>
              {leadingToc}
              <WikiTemplateBlock
                template={segment.template}
                existingSlugs={existingSlugs}
                onNavigateSlug={onNavigateSlug}
                externalLinkPrefix={externalLinkPrefix}
                encodeExternalLinkTarget={encodeExternalLinkTarget}
              />
            </React.Fragment>
          );
        }

        if (segment.kind === 'reflist') {
          const targetGroup = segment.reflist.group ?? '';
          return (
            <React.Fragment key={`reflist-${index}-${targetGroup || 'default'}`}>
              {leadingToc}
              {enableReferences && (
                <ReferencesFooter
                  inline
                  references={references}
                  group={targetGroup}
                  columns={segment.reflist.columns ?? 1}
                  title={
                    segment.reflist.title ||
                    (targetGroup ? `Notes (${targetGroup})` : referencesTitle)
                  }
                  existingSlugs={existingSlugs}
                  onNavigateSlug={onNavigateSlug}
                  externalLinkPrefix={externalLinkPrefix}
                  encodeExternalLinkTarget={encodeExternalLinkTarget}
                />
              )}
            </React.Fragment>
          );
        }

        const processed = preprocessWikiLinks(segment.content);
        return (
          <React.Fragment key={`md-${index}`}>
            {leadingToc}
            <div className="wiki-prose">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => renderHeading('h1', children),
                  h2: ({ children }) => renderHeading('h2', children),
                  h3: ({ children }) => renderHeading('h3', children),
                  a: ({ href, children }) => {
                    if (href && href.startsWith('https://wiki.ref/')) {
                      const refPath = href.replace('https://wiki.ref/', '');
                      const slashIndex = refPath.indexOf('/');
                      const rawLabel =
                        slashIndex === -1 ? refPath : refPath.slice(0, slashIndex);
                      let decodedLabel = rawLabel;
                      try {
                        decodedLabel = decodeURIComponent(rawLabel);
                      } catch {
                        // Keep rawLabel if malformed URI component
                      }
                      const backlinkId =
                        slashIndex === -1 ? '' : refPath.slice(slashIndex + 1);
                      const refItem =
                        references.find((r) => backlinkId && r.backlinks.includes(backlinkId)) ??
                        references.find((r) => String(r.index) === decodedLabel);

                      return (
                        <WikiCitationBadge
                          label={decodedLabel}
                          backlinkId={backlinkId || undefined}
                          refItem={refItem}
                          existingSlugs={existingSlugs}
                          onNavigateSlug={onNavigateSlug}
                          externalLinkPrefix={externalLinkPrefix}
                          encodeExternalLinkTarget={encodeExternalLinkTarget}
                        />
                      );
                    }

                    if (href && href.startsWith('https://wiki.category/')) {
                      const catSlug = href.replace('https://wiki.category/', '');
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectCategory) {
                              onSelectCategory(catSlug);
                            } else {
                              window.location.hash = `#/category/${catSlug}`;
                            }
                          }}
                          title={`Browse Category:${formatCategoryDisplayName(catSlug)}`}
                          className="inline font-medium text-blue-700 dark:text-blue-400 underline decoration-blue-700/30 dark:decoration-blue-400/40 underline-offset-4 hover:decoration-blue-700 dark:hover:decoration-blue-400 transition-colors cursor-pointer"
                        >
                          {children}
                        </button>
                      );
                    }

                    if (href && href.startsWith('https://wiki.internal/')) {
                      const targetSlug = href.replace('https://wiki.internal/', '');
                      const exists = existingSlugs.has(targetSlug);
                      return (
                        <button
                          type="button"
                          onClick={() => onNavigateSlug(targetSlug)}
                          title={
                            exists
                              ? `Open page :${targetSlug}`
                              : `Create missing page :${targetSlug}`
                          }
                          className={
                            exists
                              ? 'inline font-medium text-blue-700 dark:text-blue-400 underline decoration-blue-700/30 dark:decoration-blue-400/40 underline-offset-4 hover:decoration-blue-700 dark:hover:decoration-blue-400 transition-colors cursor-pointer'
                              : 'inline-flex items-baseline gap-1 font-medium text-amber-800 dark:text-amber-400 underline decoration-dashed decoration-amber-700/60 underline-offset-4 hover:text-amber-900 dark:hover:text-amber-300 transition-colors cursor-pointer'
                          }
                        >
                          <span>{children}</span>
                          {!exists && <FilePlus2 className="w-3.5 h-3.5 inline self-center shrink-0" />}
                        </button>
                      );
                    }

                    if (href && href.startsWith('#/')) {
                      return (
                        <a
                          href={href}
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.hash = href;
                          }}
                          className="inline font-medium text-blue-700 dark:text-blue-400 underline decoration-blue-700/30 dark:decoration-blue-400/40 underline-offset-4 hover:decoration-blue-700 dark:hover:decoration-blue-400 transition-colors cursor-pointer"
                        >
                          {children}
                        </a>
                      );
                    }

                    const prefixedHref = applyExternalLinkPrefix(
                      href,
                      externalLinkPrefix,
                      encodeExternalLinkTarget
                    );
                    return (
                      <a
                        href={prefixedHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-baseline gap-1 font-medium text-blue-700 dark:text-blue-400 underline decoration-blue-700/30 underline-offset-4 hover:decoration-blue-700 transition-colors"
                      >
                        <span>{children}</span>
                        <ExternalLink className="w-3 h-3 inline self-center shrink-0 opacity-70" />
                      </a>
                    );
                  },
                  img: ({ src, alt, title }) => {
                    if (!src) return null;
                    return (
                      <img
                        src={src}
                        alt={alt ?? ''}
                        title={title}
                        loading="lazy"
                        className="max-w-full h-auto rounded-lg border border-slate-200 dark:border-slate-800 my-3 block"
                      />
                    );
                  },
                }}
              >
                {processed}
              </ReactMarkdown>
            </div>
          </React.Fragment>
        );
      })}
      {tocInsertIndex === segments.length && tocNode}
      {enableReferences && showReferencesFooter && footerReferences.length > 0 && (
        <ReferencesFooter
          references={footerReferences}
          title={referencesTitle}
          existingSlugs={existingSlugs}
          onNavigateSlug={onNavigateSlug}
          externalLinkPrefix={externalLinkPrefix}
          encodeExternalLinkTarget={encodeExternalLinkTarget}
        />
      )}
      {showCategoriesFooter && combinedPreviewCategories.length > 0 && (
        <CategoriesFooter
          categories={combinedPreviewCategories}
          onSelectCategory={(slug) => {
            if (onSelectCategory) {
              onSelectCategory(slug);
            } else {
              window.location.hash = `#/category/${slug}`;
            }
          }}
          onOpenAllCategories={() => {
            if (onOpenAllCategories) {
              onOpenAllCategories();
            } else {
              window.location.hash = '#/categories';
            }
          }}
        />
      )}
    </div>
  );
};
