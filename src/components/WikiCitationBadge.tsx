import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowDown, BookMarked, ExternalLink, FilePlus2 } from 'lucide-react';
import {
  preprocessWikiLinks,
  scrollToWikiAnchor,
  type WikiReferenceItem,
} from '../lib/markdownUtils';
import {
  applyExternalLinkPrefix,
  DEFAULT_EXTERNAL_LINK_PREFIX,
} from '../lib/extensionsService';

interface WikiCitationBadgeProps {
  label: string;
  backlinkId?: string;
  refItem?: WikiReferenceItem;
  existingSlugs: Set<string>;
  onNavigateSlug: (slug: string) => void;
  externalLinkPrefix?: string;
  encodeExternalLinkTarget?: boolean;
}

export const WikiCitationBadge: React.FC<WikiCitationBadgeProps> = ({
  label,
  backlinkId,
  refItem,
  existingSlugs,
  onNavigateSlug,
  externalLinkPrefix = DEFAULT_EXTERNAL_LINK_PREFIX,
  encodeExternalLinkTarget = false,
}) => {
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const closeTimerRef = React.useRef<number | null>(null);
  const wrapperRef = React.useRef<HTMLSpanElement | null>(null);

  const refAnchorId = refItem ? refItem.id : `ref-${label}`;

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handleOpen = React.useCallback(() => {
    clearCloseTimer();
    if (refItem) {
      setPopoverOpen(true);
    }
  }, [clearCloseTimer, refItem]);

  const handleDelayedClose = React.useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setPopoverOpen(false);
    }, 160);
  }, [clearCloseTimer]);

  React.useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  React.useEffect(() => {
    if (!popoverOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopoverOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [popoverOpen]);

  const jumpToReference = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setPopoverOpen(false);
    scrollToWikiAnchor(refAnchorId, 'center');
  };

  return (
    <sup
      ref={wrapperRef}
      onMouseEnter={handleOpen}
      onMouseLeave={handleDelayedClose}
      onFocus={handleOpen}
      onBlur={(e) => {
        if (!wrapperRef.current?.contains(e.relatedTarget as Node | null)) {
          handleDelayedClose();
        }
      }}
      className="relative inline-block ml-0.5 align-super leading-none"
    >
      <a
        id={backlinkId || undefined}
        href={`#${refAnchorId}`}
        onClick={jumpToReference}
        title={
          refItem
            ? `Reference [${label}]: ${refItem.content}`
            : `Reference [${label}]`
        }
        aria-label={`Jump to reference ${label}`}
        className="scroll-mt-24 inline-block px-0.5 font-mono text-[11px] font-semibold tabular-nums text-blue-700 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 rounded cursor-pointer no-underline"
      >
        [{label}]
      </a>

      {popoverOpen && refItem && (
        <span
          role="dialog"
          aria-label={`Preview of reference ${label}`}
          onMouseEnter={handleOpen}
          onMouseLeave={handleDelayedClose}
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-30 w-72 sm:w-80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f1623] shadow-lg text-left not-prose block whitespace-normal leading-relaxed"
        >
          <span className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-200/80 dark:border-slate-800/80">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-blue-700 dark:text-blue-400">
              <BookMarked className="w-3 h-3 shrink-0" />
              <span>Reference [{label}]</span>
            </span>
            <button
              type="button"
              onClick={() => jumpToReference()}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <span>View in list</span>
              <ArrowDown className="w-3 h-3" />
            </button>
          </span>

          <span className="block text-xs text-slate-700 dark:text-slate-200 break-words">
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
                a: ({ href, children }) => {
                  if (href && href.startsWith('https://wiki.internal/')) {
                    const targetSlug = href.replace('https://wiki.internal/', '');
                    const exists = existingSlugs.has(targetSlug);
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setPopoverOpen(false);
                          onNavigateSlug(targetSlug);
                        }}
                        className={
                          exists
                            ? 'inline font-medium text-blue-700 dark:text-blue-400 underline underline-offset-2 cursor-pointer'
                            : 'inline-flex items-baseline gap-0.5 font-medium text-amber-800 dark:text-amber-400 underline decoration-dashed underline-offset-2 cursor-pointer'
                        }
                      >
                        <span>{children}</span>
                        {!exists && <FilePlus2 className="w-2.5 h-2.5 inline self-center shrink-0" />}
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
                      className="inline-flex items-baseline gap-0.5 font-medium text-blue-700 dark:text-blue-400 underline underline-offset-2 break-all"
                    >
                      <span>{children}</span>
                      <ExternalLink className="w-2.5 h-2.5 inline self-center shrink-0 opacity-70" />
                    </a>
                  );
                },
              }}
            >
              {preprocessWikiLinks(refItem.content)}
            </ReactMarkdown>
          </span>
        </span>
      )}
    </sup>
  );
};
