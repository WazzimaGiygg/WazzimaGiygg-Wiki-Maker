import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLink, FilePlus2 } from 'lucide-react';
import {
  parseMarkdownWithInfoboxes,
  preprocessWikiLinks,
  toWikiSlug,
} from '../lib/markdownUtils';
import { WikiInfobox } from './WikiInfobox';

interface MarkdownRendererProps {
  content: string;
  existingSlugs: Set<string>;
  onNavigateSlug: (slug: string) => void;
}

function getHeadingText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(getHeadingText).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(children)) {
    return getHeadingText(children.props.children);
  }
  return '';
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  existingSlugs,
  onNavigateSlug,
}) => {
  const segments = React.useMemo(() => parseMarkdownWithInfoboxes(content), [content]);
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

  return (
    <div className={`wiki-prose flow-root ${hasInfobox ? 'max-w-4xl' : 'max-w-3xl'}`}>
      {segments.map((segment, index) => {
        if (segment.kind === 'infobox') {
          return (
            <WikiInfobox
              key={`infobox-${index}-${segment.infobox.title}`}
              infobox={segment.infobox}
              existingSlugs={existingSlugs}
              onNavigateSlug={onNavigateSlug}
            />
          );
        }

        const processed = preprocessWikiLinks(segment.content);
        return (
          <ReactMarkdown
            key={`md-${index}`}
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => {
                const id = toWikiSlug(getHeadingText(children));
                return <h2 id={id || undefined}>{children}</h2>;
              },
              h3: ({ children }) => {
                const id = toWikiSlug(getHeadingText(children));
                return <h3 id={id || undefined}>{children}</h3>;
              },
              a: ({ href, children }) => {
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
        );
      })}
    </div>
  );
};
