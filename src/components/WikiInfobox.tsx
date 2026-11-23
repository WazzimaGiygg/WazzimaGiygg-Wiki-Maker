import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Building2,
  ExternalLink,
  FilePlus2,
  ImageOff,
  Info,
  Layers,
  MapPin,
  Package,
  User,
  UserCheck,
} from 'lucide-react';
import {
  type InfoboxBlock,
  type InfoboxType,
  preprocessWikiLinks,
} from '../lib/markdownUtils';
import {
  applyExternalLinkPrefix,
  DEFAULT_EXTERNAL_LINK_PREFIX,
} from '../lib/extensionsService';

interface WikiInfoboxProps {
  infobox: InfoboxBlock;
  existingSlugs: Set<string>;
  onNavigateSlug: (slug: string) => void;
  disableFloat?: boolean;
  externalLinkPrefix?: string;
  encodeExternalLinkTarget?: boolean;
}

const TYPE_STYLES: Record<
  InfoboxType,
  {
    label: string;
    headerClass: string;
    labelClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  general: {
    label: 'General Info',
    headerClass:
      'bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700',
    labelClass: 'text-slate-600 dark:text-slate-300',
    icon: Info,
  },
  user: {
    label: 'Collaborator',
    headerClass:
      'bg-sky-50 dark:bg-sky-950/45 border-b border-sky-200/80 dark:border-sky-900/70',
    labelClass: 'text-sky-800 dark:text-sky-300',
    icon: UserCheck,
  },
  character: {
    label: 'Character',
    headerClass:
      'bg-blue-50 dark:bg-blue-950/50 border-b border-blue-200/80 dark:border-blue-900/70',
    labelClass: 'text-blue-800 dark:text-blue-300',
    icon: User,
  },
  location: {
    label: 'Location',
    headerClass:
      'bg-emerald-50 dark:bg-emerald-950/45 border-b border-emerald-200/80 dark:border-emerald-900/70',
    labelClass: 'text-emerald-800 dark:text-emerald-300',
    icon: MapPin,
  },
  item: {
    label: 'Item / Artifact',
    headerClass:
      'bg-amber-50 dark:bg-amber-950/45 border-b border-amber-200/80 dark:border-amber-900/70',
    labelClass: 'text-amber-800 dark:text-amber-300',
    icon: Package,
  },
  organization: {
    label: 'Organization',
    headerClass:
      'bg-rose-50 dark:bg-rose-950/45 border-b border-rose-200/80 dark:border-rose-900/70',
    labelClass: 'text-rose-800 dark:text-rose-300',
    icon: Building2,
  },
  project: {
    label: 'Project / System',
    headerClass:
      'bg-indigo-50 dark:bg-indigo-950/50 border-b border-indigo-200/80 dark:border-indigo-900/70',
    labelClass: 'text-indigo-800 dark:text-indigo-300',
    icon: Layers,
  },
};

function isSafeImageUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/assets/')
  );
}

export const WikiInfobox: React.FC<WikiInfoboxProps> = ({
  infobox,
  existingSlugs,
  onNavigateSlug,
  disableFloat = false,
  externalLinkPrefix = DEFAULT_EXTERNAL_LINK_PREFIX,
  encodeExternalLinkTarget = false,
}) => {
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setImageFailed(false);
  }, [infobox.image]);

  const theme = TYPE_STYLES[infobox.type] ?? TYPE_STYLES.general;
  const Icon = theme.icon;

  const layoutClass = disableFloat
    ? 'w-full'
    : infobox.layout === 'full'
    ? 'w-full my-5'
    : infobox.layout === 'left'
    ? 'w-full md:w-80 md:float-left md:mr-6 md:mb-4 my-4'
    : 'w-full md:w-80 md:float-right md:ml-6 md:mb-4 my-4';

  const hasValidImage = isSafeImageUrl(infobox.image);

  return (
    <aside
      aria-label={`${theme.label}: ${infobox.title}`}
      className={`${layoutClass} not-prose rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] overflow-hidden shadow-xs`}
    >
      {/* Colored Header Band */}
      <div className={`px-4 py-3 ${theme.headerClass}`}>
        <div
          className={`inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-semibold ${theme.labelClass}`}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span>{theme.label}</span>
        </div>
        <div className="font-display text-base font-semibold text-slate-900 dark:text-slate-50 mt-0.5 leading-snug">
          {infobox.title}
        </div>
        {infobox.subtitle && (
          <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
            {infobox.subtitle}
          </div>
        )}
      </div>

      {/* Optional Media */}
      {hasValidImage && (
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0d131f]">
          {!imageFailed ? (
            <img
              src={infobox.image}
              alt={infobox.imageCaption || infobox.title}
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
              className="w-full max-h-56 object-cover block"
            />
          ) : (
            <div className="h-24 flex flex-col items-center justify-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <ImageOff className="w-4 h-4" />
              <span>Image unavailable</span>
            </div>
          )}
          {infobox.imageCaption && (
            <div className="px-3.5 py-2 text-[11px] text-slate-500 dark:text-slate-400 text-center border-t border-slate-200/70 dark:border-slate-800/80">
              {infobox.imageCaption}
            </div>
          )}
        </div>
      )}

      {/* Structured Key-Value Rows */}
      {infobox.fields.length > 0 ? (
        <dl className="divide-y divide-slate-200/80 dark:divide-slate-800/80 text-xs">
          {infobox.fields.map((field, index) => (
            <div
              key={`${field.key}-${index}`}
              className="grid grid-cols-12 gap-3 px-4 py-2.5 items-baseline"
            >
              <dt className="col-span-5 font-medium text-slate-500 dark:text-slate-400 break-words">
                {field.key}
              </dt>
              <dd className="col-span-7 text-slate-800 dark:text-slate-200 tabular-nums break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <>{children}</>,
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
                                ? 'inline font-medium text-blue-700 dark:text-blue-400 underline decoration-blue-700/30 dark:decoration-blue-400/40 underline-offset-2 hover:decoration-blue-700 dark:hover:decoration-blue-400 transition-colors cursor-pointer text-left'
                                : 'inline-flex items-baseline gap-0.5 font-medium text-amber-800 dark:text-amber-400 underline decoration-dashed decoration-amber-700/60 underline-offset-2 hover:text-amber-900 dark:hover:text-amber-300 transition-colors cursor-pointer text-left'
                            }
                          >
                            <span>{children}</span>
                            {!exists && (
                              <FilePlus2 className="w-3 h-3 inline self-center shrink-0" />
                            )}
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
                          className="inline-flex items-baseline gap-0.5 font-medium text-blue-700 dark:text-blue-400 underline decoration-blue-700/30 underline-offset-2 hover:decoration-blue-700 transition-colors"
                        >
                          <span>{children}</span>
                          <ExternalLink className="w-2.5 h-2.5 inline self-center shrink-0 opacity-70" />
                        </a>
                      );
                    },
                  }}
                >
                  {preprocessWikiLinks(field.value)}
                </ReactMarkdown>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 italic">
          No metadata rows added.
        </div>
      )}
    </aside>
  );
};
