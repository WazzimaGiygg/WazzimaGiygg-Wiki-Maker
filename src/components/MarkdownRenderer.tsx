import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, ChevronUp, ExternalLink, FilePlus2, List } from 'lucide-react';
import {
  createHeadingIdAllocator,
  extractArticleReferences,
  extractToc,
  parseMarkdownWithInfoboxes,
  preprocessWikiLinks,
  scrollToWikiAnchor,
  type TocItem,
} from '../lib/markdownUtils';
import { ReferencesFooter } from './ReferencesFooter';
import { WikiInfobox } from './WikiInfobox';

interface MarkdownRendererProps {
  content: string;
  existingSlugs: Set<string>;
  onNavigateSlug: (slug: string) => void;
  showToc?: boolean;
  showReferencesFooter?: boolean;
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

function getTocIndentClass(level: TocItem['level'], minLevel: 1 | 2 | 3): string {
  const depth = Math.max(0, level - minLevel);
  if (depth === 0) return 'pl-0 font-medium text-slate-800 dark:text-slate-100';
  if (depth === 1) return 'pl-3.5 text-slate-700 dark:text-slate-300';
  return 'pl-7 text-slate-600 dark:text-slate-400';
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  existingSlugs,
  onNavigateSlug,
  showToc = true,
  showReferencesFooter = true,
}) => {
  const [tocExpanded, setTocExpanded] = React.useState(true);

  const { processedMarkdown, references } = React.useMemo(
    () => extractArticleReferences(content),
    [content]
  );
  const segments = React.useMemo(
    () => parseMarkdownWithInfoboxes(processedMarkdown),
    [processedMarkdown]
  );
  const tocItems = React.useMemo(
    () => extractToc(processedMarkdown),
    [processedMarkdown]
  );
  const hasInfobox = React.useMemo(
    () => segments.some((seg) => seg.kind === 'infobox'),
    [segments]
  );

  const minHeadingLevel = React.useMemo<1 | 2 | 3>(() => {
    if (tocItems.length === 0) return 2;
    return Math.min(...tocItems.map((item) => item.level)) as 1 | 2 | 3;
  }, [tocItems]);

  if (!content.trim()) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 italic py-4">
        This page has no content yet.
      </p>
    );
  }

  // Allocate deterministic deduplicated heading IDs across all Markdown segments in render order
  const allocateHeadingId = createHeadingIdAllocator();

  // Place the inline Table of Contents immediately after any leading infoboxes so it sits beside right-floated cards cleanly
  const firstMarkdownIndex = segments.findIndex((seg) => seg.kind === 'markdown');
  const tocInsertIndex = firstMarkdownIndex === -1 ? segments.length : firstMarkdownIndex;
  const shouldRenderToc = showToc && tocItems.length > 0;

  const tocNode = shouldRenderToc ? (
    <nav
      aria-label="Table of contents"
      className="mb-6 max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0b0f17] p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
          <List className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
          <span>Contents</span>
          <span className="font-mono font-normal tabular-nums text-slate-500 dark:text-slate-400">
            · {tocItems.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setTocExpanded((prev) => !prev)}
          aria-expanded={tocExpanded}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer print:hidden"
        >
          <span>{tocExpanded ? 'Hide' : 'Show'}</span>
          {tocExpanded ? (
            <ChevronUp className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronDown className="w-3 h-3 shrink-0" />
          )}
        </button>
      </div>

      {tocExpanded && (
        <ol className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1 max-h-72 overflow-y-auto print:max-h-none print:overflow-visible pr-1 text-xs list-none pl-0">
          {tocItems.map((item) => (
            <li key={item.id} className={getTocIndentClass(item.level, minHeadingLevel)}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToAnchor(item.id);
                }}
                className="flex items-baseline gap-1.5 py-0.5 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
              >
                <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0 select-none">
                  #
                </span>
                <span className="leading-snug">{item.text}</span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </nav>
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
              />
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
                      const refIndexStr =
                        slashIndex === -1 ? refPath : refPath.slice(0, slashIndex);
                      const backlinkId =
                        slashIndex === -1 ? '' : refPath.slice(slashIndex + 1);
                      const refItem = references.find(
                        (r) => String(r.index) === refIndexStr
                      );
                      const refAnchorId = refItem ? refItem.id : `ref-${refIndexStr}`;

                      return (
                        <sup className="inline-block ml-0.5 align-super leading-none">
                          <a
                            id={backlinkId || undefined}
                            href={`#${refAnchorId}`}
                            onClick={(e) => {
                              e.preventDefault();
                              scrollToWikiAnchor(refAnchorId, 'center');
                            }}
                            title={
                              refItem
                                ? `Referência [${refIndexStr}]: ${refItem.content}`
                                : `Referência [${refIndexStr}]`
                            }
                            aria-label={`Ir para referência ${refIndexStr}`}
                            className="scroll-mt-24 inline-block px-0.5 font-mono text-[11px] font-semibold tabular-nums text-blue-700 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 rounded cursor-pointer no-underline"
                          >
                            [{refIndexStr}]
                          </a>
                        </sup>
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

                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-baseline gap-1 font-medium text-blue-700 dark:text-blue-400 underline decoration-blue-700/30 underline-offset-4 hover:decoration-blue-700 transition-colors"
                      >
                        <span>{children}</span>
                        <ExternalLink className="w-3 h-3 inline self-center shrink-0 opacity-70" />
                      </a>
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
      {showReferencesFooter && (
        <ReferencesFooter
          references={references}
          existingSlugs={existingSlugs}
          onNavigateSlug={onNavigateSlug}
        />
      )}
    </div>
  );
};
