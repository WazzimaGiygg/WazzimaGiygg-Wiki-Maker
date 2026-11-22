import React from 'react';
import { ExternalLink, FileText, Globe, Layers, ShieldAlert } from 'lucide-react';
import {
  ECOSYSTEM_PAGE_SLUG,
  WAZZIMAGIYGG_ECOSYSTEM_PRODUCTS,
  WIKIPEDIA_ABUSE_SUBJECTS,
  WIKIPEDIA_ABUSES_PAGE_SLUG,
  WIKIPEDIA_DOSSIER_URL,
} from '../lib/ecosystemContent';
import { DOSSIER_PAGE_SLUG } from '../lib/dossierArticle';

interface EcosystemProductsViewProps {
  siteTitle: string;
  onSelectPage: (slug: string) => void;
}

export const EcosystemProductsView: React.FC<EcosystemProductsViewProps> = ({
  siteTitle,
  onSelectPage,
}) => {
  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
          wiki / ecosystem / wazzimagiygg.com
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 text-balance">
          WazzimaGiygg Ecosystem Products
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          <strong>{siteTitle}</strong> is part of the{' '}
          <a
            href="https://wazzimagiygg.com/"
            target="_blank"
            rel="noopener noreferrer"
            data-wiki-surface="link"
            className="font-medium text-blue-700 dark:text-blue-400 hover:underline"
          >
            wazzimagiygg.com
          </a>{' '}
          ecosystem, a <strong>WazzimaGiygg</strong> project. Explore the five official platforms
          that make up the network and read the full dossier on Wikipedia below.
        </p>
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectPage(ECOSYSTEM_PAGE_SLUG)}
            data-wiki-surface="inset"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Read Ecosystem Wiki Article</span>
          </button>
          <a
            href={WIKIPEDIA_DOSSIER_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-wiki-surface="accent"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open A Verdade Portal</span>
          </a>
        </div>
      </div>

      {/* 5 Ecosystem Products Grid */}
      <section aria-labelledby="ecosystem-products-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="ecosystem-products-heading"
            className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2"
          >
            <Layers className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" data-wiki-surface="link" />
            <span>Official Platforms &amp; Products</span>
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            5 active domains
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WAZZIMAGIYGG_ECOSYSTEM_PRODUCTS.map((product) => (
            <article
              key={product.id}
              data-wiki-surface="inset"
              className="flex flex-col justify-between gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17]/80"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono tabular-nums">
                    {product.index}. {product.role}
                  </span>
                  <Globe className="w-3.5 h-3.5 shrink-0 opacity-70" />
                </div>

                <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {product.name}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {product.domain}
                </span>
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-wiki-surface="link"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] text-blue-700 dark:text-blue-400 hover:border-blue-700 dark:hover:border-blue-400 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Visit</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Wikipedia Dossier and Documented Abuses */}
      <section
        aria-labelledby="wikipedia-dossier-heading"
        data-wiki-surface="inset"
        className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0b0f17] space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Public Dossier · Investigation &amp; Documentation
            </div>
            <h2
              id="wikipedia-dossier-heading"
              className="font-display text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-balance"
            >
              <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>Wikipedia Dossier — A Verdade</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              Public investigation documenting administrative abuses, contested blocks, and lack of
              accountability involving <strong>Chronus</strong>, <strong>LittleSunshine</strong>,{' '}
              <strong>Conde Edmond Dantès</strong>, <strong>Teles</strong>, and{' '}
              <strong>Johannnes89</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href={WIKIPEDIA_DOSSIER_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-wiki-surface="accent"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>wazzimagiygg.com/averdade/</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {WIKIPEDIA_ABUSE_SUBJECTS.map((subject, idx) => (
            <div
              key={subject.name}
              data-wiki-surface="panel"
              className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] space-y-1.5"
            >
              <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                0{idx + 1}. {subject.scope}
              </div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                {subject.name}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {subject.focus}
              </p>
            </div>
          ))}
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 text-xs">
          <span className="text-slate-600 dark:text-slate-300">
            Primary source:{' '}
            <a
              href={WIKIPEDIA_DOSSIER_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-wiki-surface="link"
              className="font-mono text-blue-700 dark:text-blue-400 hover:underline break-all"
            >
              {WIKIPEDIA_DOSSIER_URL}
            </a>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectPage(WIKIPEDIA_ABUSES_PAGE_SLUG)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Read Wiki Summary</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectPage(DOSSIER_PAGE_SLUG)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>LGPD &amp; Marco Civil Audit</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
