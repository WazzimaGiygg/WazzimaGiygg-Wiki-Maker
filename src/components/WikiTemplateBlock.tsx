import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertTriangle,
  ArrowRightCircle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FilePlus2,
  GitFork,
  Hammer,
  Info,
  Layers,
  Quote,
  ShieldAlert,
} from 'lucide-react';
import { preprocessWikiLinks, type PredefinicaoBlock } from '../lib/markdownUtils';
import type { TemplateBlockVariant } from '../lib/templateEngine';
import {
  applyExternalLinkPrefix,
  DEFAULT_EXTERNAL_LINK_PREFIX,
} from '../lib/extensionsService';

interface WikiTemplateBlockProps {
  template: PredefinicaoBlock;
  existingSlugs: Set<string>;
  onNavigateSlug: (slug: string) => void;
  externalLinkPrefix?: string;
  encodeExternalLinkTarget?: boolean;
}

const VARIANT_CONFIG: Record<
  TemplateBlockVariant,
  {
    containerClass: string;
    kickerClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  info: {
    containerClass:
      'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0b0f17]',
    kickerClass: 'text-blue-700 dark:text-blue-400',
    icon: Info,
  },
  warning: {
    containerClass:
      'border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/25',
    kickerClass: 'text-amber-800 dark:text-amber-300',
    icon: AlertTriangle,
  },
  alert: {
    containerClass:
      'border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/25',
    kickerClass: 'text-red-700 dark:text-red-400',
    icon: ShieldAlert,
  },
  success: {
    containerClass:
      'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/25',
    kickerClass: 'text-emerald-700 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  stub: {
    containerClass:
      'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0b0f17]',
    kickerClass: 'text-slate-600 dark:text-slate-300',
    icon: BookOpen,
  },
  wip: {
    containerClass:
      'border-sky-200 dark:border-sky-900/60 bg-sky-50/60 dark:bg-sky-950/25',
    kickerClass: 'text-sky-800 dark:text-sky-300',
    icon: Hammer,
  },
  disambiguation: {
    containerClass:
      'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/25',
    kickerClass: 'text-indigo-700 dark:text-indigo-300',
    icon: GitFork,
  },
  navigation: {
    containerClass:
      'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17]',
    kickerClass: 'text-blue-700 dark:text-blue-400',
    icon: ArrowRightCircle,
  },
  quote: {
    containerClass:
      'border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-[#0b0f17]',
    kickerClass: 'text-slate-500 dark:text-slate-400',
    icon: Quote,
  },
  ecosystem: {
    containerClass:
      'border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20',
    kickerClass: 'text-blue-700 dark:text-blue-400',
    icon: Layers,
  },
};

export const WikiTemplateBlock: React.FC<WikiTemplateBlockProps> = ({
  template,
  existingSlugs,
  onNavigateSlug,
  externalLinkPrefix = DEFAULT_EXTERNAL_LINK_PREFIX,
  encodeExternalLinkTarget = false,
}) => {
  const cfg = VARIANT_CONFIG[template.variant] ?? VARIANT_CONFIG.info;
  const Icon = cfg.icon;

  const renderInlineMarkdown = (raw: string) => (
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
                    ? 'inline font-medium text-blue-700 dark:text-blue-400 underline decoration-blue-700/30 dark:decoration-blue-400/40 underline-offset-4 hover:decoration-blue-700 dark:hover:decoration-blue-400 transition-colors cursor-pointer'
                    : 'inline-flex items-baseline gap-0.5 font-medium text-amber-800 dark:text-amber-400 underline decoration-dashed decoration-amber-700/60 underline-offset-4 hover:text-amber-900 dark:hover:text-amber-300 transition-colors cursor-pointer'
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
              className="inline-flex items-baseline gap-0.5 font-medium text-blue-700 dark:text-blue-400 underline decoration-blue-700/30 underline-offset-4 hover:decoration-blue-700 transition-colors"
            >
              <span>{children}</span>
              <ExternalLink className="w-3 h-3 inline self-center shrink-0 opacity-70" />
            </a>
          );
        },
      }}
    >
      {preprocessWikiLinks(raw)}
    </ReactMarkdown>
  );

  if (template.variant === 'navigation') {
    return (
      <div
        role="note"
        data-wiki-surface="inset"
        className={`not-prose my-4 px-4 py-3 rounded-xl border ${cfg.containerClass} flex items-baseline gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200`}
      >
        <Icon className={`w-4 h-4 shrink-0 self-center ${cfg.kickerClass}`} />
        <div className="min-w-0 leading-relaxed italic">{renderInlineMarkdown(template.body)}</div>
      </div>
    );
  }

  if (template.variant === 'quote') {
    return (
      <figure
        data-wiki-surface="inset"
        className={`not-prose my-5 px-5 py-4 rounded-xl border ${cfg.containerClass} space-y-2.5`}
      >
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span>{template.kicker}</span>
        </div>
        <blockquote className="text-base sm:text-lg font-display italic text-slate-900 dark:text-slate-100 leading-relaxed text-justify">
          “{renderInlineMarkdown(template.body)}”
        </blockquote>
        {(template.author || template.source) && (
          <figcaption className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
            {template.author && (
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                — {renderInlineMarkdown(template.author)}
              </span>
            )}
            {template.author && template.source && <span aria-hidden="true">·</span>}
            {template.source && <cite className="not-italic">{renderInlineMarkdown(template.source)}</cite>}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <aside
      role="note"
      aria-label={template.title || template.kicker}
      data-wiki-surface="inset"
      className={`not-prose my-5 p-4 sm:p-5 rounded-xl border ${cfg.containerClass} space-y-2`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold ${cfg.kickerClass}`}>
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span>{template.kicker}</span>
        </span>
        {template.meta && (
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {renderInlineMarkdown(template.meta)}
          </span>
        )}
      </div>

      {template.title && (
        <div className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
          {renderInlineMarkdown(template.title)}
        </div>
      )}

      {template.body && (
        <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed text-justify">
          {renderInlineMarkdown(template.body)}
        </div>
      )}
    </aside>
  );
};
