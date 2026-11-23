import React from 'react';
import { ChevronDown, ChevronUp, List } from 'lucide-react';
import { extractToc, scrollToWikiAnchor, type TocItem } from '../lib/markdownUtils';

export interface TableOfContentsProps {
  /** Pre-extracted heading items (filtered to H2 and H3 automatically). */
  items?: TocItem[];
  /** Optional Markdown source used to extract H2 and H3 headings when `items` is omitted. */
  content?: string;
  /** Minimum number of H2/H3 headings required before rendering the Table of Contents. */
  minHeadings?: number;
  /** Initial expanded/collapsed state of the heading list. */
  defaultExpanded?: boolean;
  /** Header title displayed at the top of the Table of Contents. */
  title?: string;
  /** Optional custom heading click handler (defaults to smooth anchor scroll). */
  onSelectHeading?: (id: string) => void;
  className?: string;
}

interface NumberedTocEntry {
  item: TocItem;
  numberLabel: string;
}

function buildNumberedEntries(items: TocItem[]): NumberedTocEntry[] {
  let h2Index = 0;
  let h3Index = 0;

  return items.map((item) => {
    if (item.level <= 2) {
      h2Index += 1;
      h3Index = 0;
      return { item, numberLabel: `${h2Index}` };
    }
    if (h2Index === 0) {
      h2Index = 1;
    }
    h3Index += 1;
    return { item, numberLabel: `${h2Index}.${h3Index}` };
  });
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  items,
  content,
  minHeadings = 2,
  defaultExpanded = true,
  title = 'Table of Contents',
  onSelectHeading,
  className = '',
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const headings = React.useMemo<TocItem[]>(() => {
    const sourceItems =
      items ?? (content ? extractToc(content, { levels: [2, 3] }) : []);
    return sourceItems.filter((item) => item.level === 2 || item.level === 3);
  }, [items, content]);

  const numberedEntries = React.useMemo(
    () => buildNumberedEntries(headings),
    [headings]
  );

  const threshold = Math.max(1, minHeadings);
  const meetsMinimumCount = headings.length >= threshold;

  React.useEffect(() => {
    if (!meetsMinimumCount || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const elements = headings
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-80px 0px -65% 0px',
        threshold: [0, 1],
      }
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => {
      observer.disconnect();
    };
  }, [headings, meetsMinimumCount]);

  if (!meetsMinimumCount) {
    return null;
  }

  const handleHeadingClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setActiveId(id);
    if (onSelectHeading) {
      onSelectHeading(id);
    } else {
      scrollToWikiAnchor(id, 'start');
    }
  };

  return (
    <nav
      aria-label="Table of contents"
      data-wiki-chrome="table-of-contents"
      className={`mb-6 max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0b0f17] p-4 ${className}`.trim()}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
          <List className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
          <span>{title}</span>
          <span className="font-mono font-normal tabular-nums text-slate-500 dark:text-slate-400">
            · {headings.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer print:hidden"
        >
          <span>{expanded ? 'Hide' : 'Show'}</span>
          {expanded ? (
            <ChevronUp className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronDown className="w-3 h-3 shrink-0" />
          )}
        </button>
      </div>

      {expanded && (
        <ol className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 space-y-1 max-h-72 overflow-y-auto print:max-h-none print:overflow-visible pr-1 text-xs list-none pl-0">
          {numberedEntries.map(({ item, numberLabel }) => {
            const isSubheading = item.level === 3;
            const isActive = activeId === item.id;
            return (
              <li
                key={item.id}
                className={
                  isSubheading
                    ? 'pl-4 text-slate-600 dark:text-slate-400'
                    : 'pl-0 font-medium text-slate-800 dark:text-slate-100'
                }
              >
                <a
                  href={`#${item.id}`}
                  onClick={(e) => handleHeadingClick(e, item.id)}
                  aria-current={isActive ? 'location' : undefined}
                  className={`flex items-baseline gap-2 py-0.5 rounded transition-colors ${
                    isActive
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'hover:text-blue-700 dark:hover:text-blue-400'
                  }`}
                >
                  <span className="font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500 shrink-0 select-none">
                    {numberLabel}
                  </span>
                  <span className="leading-snug">{item.text}</span>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
};
