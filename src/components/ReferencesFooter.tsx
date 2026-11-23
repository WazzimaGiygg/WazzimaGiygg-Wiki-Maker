import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookMarked, ExternalLink, FilePlus2 } from 'lucide-react';
import {
  preprocessWikiLinks,
  scrollToWikiAnchor,
  type WikiReferenceItem,
} from '../lib/markdownUtils';
import {
  applyExternalLinkPrefix,
  DEFAULT_EXTERNAL_LINK_PREFIX,
} from '../lib/extensionsService';

interface ReferencesFooterProps {
  references: WikiReferenceItem[];
  title?: string;
  existingSlugs?: Set<string>;
  onNavigateSlug?: (slug: string) => void;
  className?: string;
  externalLinkPrefix?: string;
  encodeExternalLinkTarget?: boolean;
}

function getBacklinkLabel(idx: number): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  if (idx < letters.length) {
    return letters[idx];
  }
  const major = Math.floor(idx / letters.length) - 1;
  const minor = idx % letters.length;
  return `${letters[major] ?? 'z'}${letters[minor]}`;
}

export const ReferencesFooter: React.FC<ReferencesFooterProps> = ({
  references,
  title = 'Referências',
  existingSlugs,
  onNavigateSlug,
  className = '',
  externalLinkPrefix = DEFAULT_EXTERNAL_LINK_PREFIX,
  encodeExternalLinkTarget = false,
}) => {
  if (references.length === 0) {
    return null;
  }

  return (
    <section
      id="referencias"
      aria-label="Referências bibliográficas"
      className={`mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3.5 scroll-mt-20 ${className}`.trim()}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
          <BookMarked className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
          <span>{title}</span>
          <span className="text-xs font-mono font-normal tabular-nums text-slate-500 dark:text-slate-400">
            · {references.length}
          </span>
        </h2>
      </div>

      <ol className="space-y-2 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 list-none pl-0">
        {references.map((ref) => {
          const processedContent = preprocessWikiLinks(ref.content);
          return (
            <li
              key={ref.id}
              id={ref.id}
              className="scroll-mt-24 flex items-baseline gap-2.5 px-2 py-1 -mx-2 rounded-md transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
            >
              <span className="font-mono text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400 shrink-0 select-none w-7 text-right">
                [{ref.index}]
              </span>

              <span className="inline-flex items-baseline gap-1 shrink-0 font-mono text-xs select-none">
                {ref.backlinks.length === 1 ? (
                  <a
                    href={`#${ref.backlinks[0]}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToWikiAnchor(ref.backlinks[0], 'center');
                    }}
                    title="Voltar à citação no texto"
                    aria-label={`Voltar à citação ${ref.index} no texto`}
                    className="font-semibold text-blue-700 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 rounded px-0.5 cursor-pointer"
                  >
                    ↑
                  </a>
                ) : (
                  <>
                    <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">
                      ↑
                    </span>
                    {ref.backlinks.map((backlinkId, bIdx) => {
                      const label = getBacklinkLabel(bIdx);
                      return (
                        <a
                          key={backlinkId}
                          href={`#${backlinkId}`}
                          onClick={(e) => {
                            e.preventDefault();
                            scrollToWikiAnchor(backlinkId, 'center');
                          }}
                          title={`Voltar à ocorrência ${label} da citação ${ref.index}`}
                          aria-label={`Voltar à ocorrência ${label} da citação ${ref.index}`}
                          className="font-medium text-blue-700 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 rounded px-0.5 cursor-pointer"
                        >
                          {label}
                        </a>
                      );
                    })}
                  </>
                )}
              </span>

              <div className="min-w-0 flex-1 break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <span className="inline">{children}</span>,
                    strong: ({ children }) => (
                      <strong className="font-semibold text-slate-900 dark:text-slate-100">
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => <em className="italic">{children}</em>,
                    code: ({ children }) => (
                      <code className="font-mono text-[12px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {children}
                      </code>
                    ),
                    a: ({ href, children }) => {
                      if (href && href.startsWith('https://wiki.internal/') && onNavigateSlug) {
                        const targetSlug = href.replace('https://wiki.internal/', '');
                        const exists = existingSlugs ? existingSlugs.has(targetSlug) : true;
                        return (
                          <button
                            type="button"
                            onClick={() => onNavigateSlug(targetSlug)}
                            title={
                              exists
                                ? `Abrir página :${targetSlug}`
                                : `Criar página :${targetSlug}`
                            }
                            className={
                              exists
                                ? 'inline font-medium text-blue-700 dark:text-blue-400 underline decoration-blue-700/30 dark:decoration-blue-400/40 underline-offset-4 hover:decoration-blue-700 transition-colors cursor-pointer'
                                : 'inline-flex items-baseline gap-1 font-medium text-amber-800 dark:text-amber-400 underline decoration-dashed underline-offset-4 cursor-pointer'
                            }
                          >
                            <span>{children}</span>
                            {!exists && <FilePlus2 className="w-3 h-3 inline self-center shrink-0" />}
                          </button>
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
                          className="inline-flex items-baseline gap-1 font-medium text-blue-700 dark:text-blue-400 underline decoration-blue-700/30 underline-offset-4 hover:decoration-blue-700 transition-colors break-all"
                        >
                          <span>{children}</span>
                          <ExternalLink className="w-3 h-3 inline self-center shrink-0 opacity-70" />
                        </a>
                      );
                    },
                  }}
                >
                  {processedContent}
                </ReactMarkdown>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
