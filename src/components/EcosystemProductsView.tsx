import React from 'react';
import {
  ArrowRight,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe,
  HelpCircle,
  Layers,
  Scale,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  ECOSYSTEM_FAQ_ITEMS,
  ECOSYSTEM_PAGE_SLUG,
  type EcosystemSubpage,
  WAZZIMAGIYGG_ECOSYSTEM_PRODUCTS,
  WIKIPEDIA_ABUSE_SUBJECTS,
  WIKIPEDIA_ABUSES_PAGE_SLUG,
  WIKIPEDIA_DOSSIER_URL,
  WMF_DOSSIER_PILLARS,
} from '../lib/ecosystemContent';
import { DOSSIER_PAGE_SLUG } from '../lib/dossierArticle';

interface EcosystemProductsViewProps {
  siteTitle: string;
  subpage: EcosystemSubpage;
  onChangeSubpage: (subpage: EcosystemSubpage) => void;
  onSelectPage: (slug: string) => void;
}

const SUBPAGE_TABS: {
  id: EcosystemSubpage;
  label: string;
  href: string;
  shortDesc: string;
}[] = [
  {
    id: 'overview',
    label: 'Overview',
    href: '#/ecosystem',
    shortDesc: 'Directory & Dossier Hub',
  },
  {
    id: 'services',
    label: 'WazzimaGiygg Services',
    href: '#/ecosystem/services',
    shortDesc: '5 Platforms & Maker',
  },
  {
    id: 'dossier',
    label: 'Wikipedia & WMF Dossier',
    href: '#/ecosystem/dossier',
    shortDesc: 'A Verdade Investigation',
  },
  {
    id: 'administrators',
    label: 'Investigated Administrators',
    href: '#/ecosystem/administrators',
    shortDesc: '5 Documented Accounts',
  },
];

function getSubpageHeadingMeta(subpage: EcosystemSubpage, siteTitle: string): {
  breadcrumbLabel: string;
  h1: string;
  lead: React.ReactNode;
} {
  switch (subpage) {
    case 'services':
      return {
        breadcrumbLabel: 'WazzimaGiygg Services',
        h1: 'WazzimaGiygg Services & Official Platforms',
        lead: (
          <>
            Detailed technical directory of every active service across the{' '}
            <strong>WazzimaGiygg</strong> network — <strong>NotMediaWiki</strong>,{' '}
            <strong>WikiWazzimaGiygg</strong>, <strong>Jornal WazzimaGiygg</strong>,{' '}
            <strong>WazzimaGiygg Core</strong>, <strong>WazzimaGiygg Portal</strong>, and{' '}
            <strong>{siteTitle}</strong>.
          </>
        ),
      };
    case 'dossier':
      return {
        breadcrumbLabel: 'Wikipedia & WMF Dossier',
        h1: 'A Verdade — Dossier Against Wikipedia & Wikimedia Foundation',
        lead: (
          <>
            Public investigative dossier published at{' '}
            <a
              href={WIKIPEDIA_DOSSIER_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-wiki-surface="link"
              className="font-mono font-medium text-blue-700 dark:text-blue-400 hover:underline"
            >
              wazzimagiygg.com/averdade/
            </a>{' '}
            examining contested administrative blocks on <strong>Wikipedia</strong>, institutional
            omission by the <strong>Wikimedia Foundation (WMF)</strong>, and Brazilian{' '}
            <strong>LGPD</strong> and <strong>Marco Civil da Internet</strong> compliance gaps.
          </>
        ),
      };
    case 'administrators':
      return {
        breadcrumbLabel: 'Investigated Administrators',
        h1: 'Investigated Wikipedia & Wikimedia Administrators',
        lead: (
          <>
            Structured index of the five privileged accounts documented in the{' '}
            <strong>A Verdade</strong> dossier — <strong>Chronus</strong>,{' '}
            <strong>LittleSunshine</strong>, <strong>Conde Edmond Dantès</strong>,{' '}
            <strong>Teles</strong>, and <strong>Johannnes89</strong> — covering blocks, sanctions,
            and interwiki moderation across Wikipedia and Wikimedia projects.
          </>
        ),
      };
    default:
      return {
        breadcrumbLabel: 'Ecosystem Hub',
        h1: 'WazzimaGiygg Ecosystem Products & Public Dossier',
        lead: (
          <>
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
            ecosystem, a <strong>WazzimaGiygg</strong> project. Explore the dedicated subpages for all{' '}
            <strong>WazzimaGiygg services</strong> and the <strong>A Verdade</strong> dossier against{' '}
            <strong>Wikipedia</strong>, the <strong>Wikimedia Foundation</strong>, and investigated
            administrators.
          </>
        ),
      };
  }
}

export const EcosystemProductsView: React.FC<EcosystemProductsViewProps> = ({
  siteTitle,
  subpage,
  onChangeSubpage,
  onSelectPage,
}) => {
  const headingMeta = getSubpageHeadingMeta(subpage, siteTitle);
  const showServicesSection = subpage === 'overview' || subpage === 'services';
  const showDossierSection = subpage === 'overview' || subpage === 'dossier';
  const showAdminsSection = subpage === 'overview' || subpage === 'administrators';

  return (
    <div className="space-y-8">
      {/* Semantic Breadcrumb + Editorial Header */}
      <header className="pb-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
        <nav
          aria-label="Breadcrumb"
          itemScope
          itemType="https://schema.org/BreadcrumbList"
          className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400"
        >
          <span
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
            className="inline-flex items-center gap-1"
          >
            <a
              href="#/page/start"
              itemProp="item"
              onClick={(e) => {
                e.preventDefault();
                onSelectPage('start');
              }}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline"
            >
              <span itemProp="name">{siteTitle}</span>
            </a>
            <meta itemProp="position" content="1" />
          </span>

          <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />

          <span
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
            className="inline-flex items-center gap-1"
          >
            <a
              href="#/ecosystem"
              itemProp="item"
              onClick={(e) => {
                e.preventDefault();
                onChangeSubpage('overview');
              }}
              className="hover:text-slate-900 dark:hover:text-slate-100 hover:underline"
            >
              <span itemProp="name">WazzimaGiygg Ecosystem</span>
            </a>
            <meta itemProp="position" content="2" />
          </span>

          {subpage !== 'overview' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
              <span
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
                aria-current="page"
                className="text-slate-800 dark:text-slate-200 font-semibold"
              >
                <span itemProp="name">{headingMeta.breadcrumbLabel}</span>
                <meta itemProp="position" content="3" />
              </span>
            </>
          )}
        </nav>

        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100 text-balance">
            {headingMeta.h1}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            {headingMeta.lead}
          </p>
        </div>

        {/* Subpage Navigation Tabs */}
        <nav
          aria-label="Ecosystem subpages"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1"
        >
          {SUBPAGE_TABS.map((tab) => {
            const active = subpage === tab.id;
            return (
              <a
                key={tab.id}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onChangeSubpage(tab.id);
                }}
                data-wiki-surface={active ? 'accent' : 'inset'}
                className={`flex flex-col justify-between px-3.5 py-2.5 rounded-lg border transition-colors ${
                  active
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-slate-50 dark:bg-[#0b0f17] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500'
                }`}
              >
                <span className="text-xs font-semibold leading-snug">{tab.label}</span>
                <span
                  className={`text-[11px] font-mono mt-0.5 ${
                    active ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tab.shortDesc}
                </span>
              </a>
            );
          })}
        </nav>

        <div className="pt-1 flex flex-wrap items-center gap-3">
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
      </header>

      {/* WazzimaGiygg Services Section */}
      {showServicesSection && (
        <section
          aria-labelledby="ecosystem-products-heading"
          itemScope
          itemType="https://schema.org/ItemList"
          className="space-y-4"
        >
          <meta itemProp="name" content="WazzimaGiygg Ecosystem Products & Services" />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2
                id="ecosystem-products-heading"
                className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" data-wiki-surface="link" />
                <span>WazzimaGiygg Services &amp; Official Platforms</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Independent publishing engines, collaborative encyclopedias, investigative journalism, and shared infrastructure under{' '}
                <strong className="font-semibold">wazzimagiygg.com</strong>.
              </p>
            </div>
            {subpage === 'overview' && (
              <a
                href="#/ecosystem/services"
                onClick={(e) => {
                  e.preventDefault();
                  onChangeSubpage('services');
                }}
                data-wiki-surface="link"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                <span>Open Services Subpage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WAZZIMAGIYGG_ECOSYSTEM_PRODUCTS.map((product, idx) => (
              <article
                key={product.id}
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/WebApplication"
                data-wiki-surface="inset"
                className="flex flex-col justify-between gap-4 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17]/80"
              >
                <meta itemProp="applicationCategory" content={product.categoryLabel} />
                <meta itemProp="operatingSystem" content="All" />
                <meta itemProp="position" content={String(idx + 1)} />

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono tabular-nums">
                      {product.index}. {product.role}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono">
                      <Globe className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span>{product.categoryLabel}</span>
                    </span>
                  </div>

                  <h3
                    itemProp="name"
                    className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100"
                  >
                    {product.name}
                  </h3>

                  <p
                    itemProp="description"
                    className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
                  >
                    {product.description}
                  </p>

                  {subpage === 'services' && (
                    <ul className="pt-1 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {product.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-start gap-2">
                          <span className="text-blue-700 dark:text-blue-400 font-mono font-bold mt-0.5">
                            &gt;
                          </span>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                    {product.domain}
                  </span>
                  <a
                    href={product.url}
                    itemProp="url"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-wiki-surface="link"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] text-blue-700 dark:text-blue-400 hover:border-blue-700 dark:hover:border-blue-400 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Visit {product.name}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </article>
            ))}

            {/* WazzimaGiygg Maker (Active Hub Card on Services subpage) */}
            {subpage === 'services' && (
              <article
                data-wiki-surface="inset"
                className="flex flex-col justify-between gap-4 p-5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono tabular-nums">06. Collaborative Wiki Node</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono">
                      <Globe className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span>Markdown &amp; Templates</span>
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {siteTitle}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Collaborative Markdown and MediaWiki-template wiki workspace powering public documentation, infoboxes, revision history, and the WazzimaGiygg reference directory.
                  </p>
                  <ul className="pt-1 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-700 dark:text-blue-400 font-mono font-bold mt-0.5">&gt;</span>
                      <span>Dynamic templates (`{'{{Nome|param}}'}`) and structured infobox blocks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-700 dark:text-blue-400 font-mono font-bold mt-0.5">&gt;</span>
                      <span>LGPD-aligned user page &amp; talk page ownership controls</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-700 dark:text-blue-400 font-mono font-bold mt-0.5">&gt;</span>
                      <span>Direct documentation portal linking WazzimaGiygg services and A Verdade</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                    wikimaker.wazzimagiygg.com
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectPage(ECOSYSTEM_PAGE_SLUG)}
                    data-wiki-surface="link"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] text-blue-700 dark:text-blue-400 hover:border-blue-700 dark:hover:border-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Read Directory Article</span>
                    <FileText className="w-3 h-3 shrink-0" />
                  </button>
                </div>
              </article>
            )}
          </div>
        </section>
      )}

      {/* Wikipedia & Wikimedia Foundation (WMF) Dossier Section */}
      {showDossierSection && (
        <section
          aria-labelledby="wikipedia-dossier-heading"
          itemScope
          itemType="https://schema.org/Report"
          data-wiki-surface="inset"
          className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0b0f17] space-y-5"
        >
          <meta itemProp="url" content={WIKIPEDIA_DOSSIER_URL} />
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Public Dossier · Wikipedia &amp; Wikimedia Foundation (WMF)
              </div>
              <h2
                id="wikipedia-dossier-heading"
                itemProp="name"
                className="font-display text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-balance"
              >
                <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
                <span>Dossier Against Wikipedia &amp; Wikimedia Foundation — A Verdade</span>
              </h2>
              <p
                itemProp="description"
                className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed"
              >
                Public investigation documenting closed administrative rulings on{' '}
                <strong>Wikipedia</strong>, institutional omission by the{' '}
                <strong>Wikimedia Foundation (WMF)</strong>, statutory conflicts with Brazil&apos;s{' '}
                <strong>LGPD</strong> and <strong>Marco Civil da Internet</strong>, and contested
                conduct by <strong>Chronus</strong>, <strong>LittleSunshine</strong>,{' '}
                <strong>Conde Edmond Dantès</strong>, <strong>Teles</strong>, and{' '}
                <strong>Johannnes89</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {subpage === 'overview' && (
                <a
                  href="#/ecosystem/dossier"
                  onClick={(e) => {
                    e.preventDefault();
                    onChangeSubpage('dossier');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 hover:border-blue-700 dark:hover:border-blue-400 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Dossier Subpage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
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

          {/* WMF & Wikipedia Dossier Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {WMF_DOSSIER_PILLARS.map((pillar, idx) => (
              <article
                key={pillar.id}
                data-wiki-surface="panel"
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] space-y-2"
              >
                <div className="flex items-center gap-2 text-[11px] font-mono text-amber-800 dark:text-amber-300">
                  <Scale className="w-3.5 h-3.5 shrink-0" />
                  <span>Pillar 0{idx + 1} · {pillar.targetEntity}</span>
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  {pillar.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {pillar.summary}
                </p>
              </article>
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
              {subpage === 'dossier' && (
                <a
                  href="#/ecosystem/administrators"
                  onClick={(e) => {
                    e.preventDefault();
                    onChangeSubpage('administrators');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>View 5 Investigated Admins</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => onSelectPage(WIKIPEDIA_ABUSES_PAGE_SLUG)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Read Wikipedia Dossier Article</span>
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
      )}

      {/* Investigated Wikipedia & Wikimedia Administrators Section */}
      {showAdminsSection && (
        <section
          aria-labelledby="investigated-admins-heading"
          itemScope
          itemType="https://schema.org/ItemList"
          data-wiki-surface="inset"
          className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0b0f17] space-y-4"
        >
          <meta itemProp="name" content="Investigated Wikipedia and Wikimedia Administrators" />
          <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2
                id="investigated-admins-heading"
                className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                <span>Investigated Wikipedia &amp; Wikimedia Administrators</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Accounts profiled in the <strong>A Verdade</strong> dossier (
                <strong>Chronus</strong>, <strong>LittleSunshine</strong>,{' '}
                <strong>Conde Edmond Dantès</strong>, <strong>Teles</strong>, and{' '}
                <strong>Johannnes89</strong>).
              </p>
            </div>

            {subpage === 'overview' && (
              <a
                href="#/ecosystem/administrators"
                onClick={(e) => {
                  e.preventDefault();
                  onChangeSubpage('administrators');
                }}
                data-wiki-surface="link"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                <span>Open Administrators Subpage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {WIKIPEDIA_ABUSE_SUBJECTS.map((subject, idx) => (
              <article
                key={subject.id}
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/Person"
                data-wiki-surface="panel"
                className="flex flex-col justify-between gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]"
              >
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    0{idx + 1}. {subject.scope}
                  </div>
                  <h3
                    itemProp="name"
                    className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
                  >
                    {subject.name}
                  </h3>
                  <div
                    itemProp="affiliation"
                    className="text-[11px] font-mono text-blue-700 dark:text-blue-400"
                  >
                    {subject.platform}
                  </div>
                  <p
                    itemProp="description"
                    className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
                  >
                    {subject.focus}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                  <a
                    href={WIKIPEDIA_DOSSIER_URL}
                    itemProp="url"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-wiki-surface="link"
                    className="inline-flex items-center gap-1 font-medium text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    <span>A Verdade Dossier</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onSelectPage(WIKIPEDIA_ABUSES_PAGE_SLUG)}
                    className="font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  >
                    Wiki Record &rarr;
                  </button>
                </div>
              </article>
            ))}
          </div>

          {subpage === 'administrators' && (
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-600 dark:text-slate-300">
                Full documentary archive:{' '}
                <a
                  href={WIKIPEDIA_DOSSIER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-wiki-surface="link"
                  className="font-mono text-blue-700 dark:text-blue-400 hover:underline"
                >
                  {WIKIPEDIA_DOSSIER_URL}
                </a>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="#/ecosystem/dossier"
                  onClick={(e) => {
                    e.preventDefault();
                    onChangeSubpage('dossier');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Wikipedia &amp; WMF Dossier</span>
                </a>
                <button
                  type="button"
                  onClick={() => onSelectPage(WIKIPEDIA_ABUSES_PAGE_SLUG)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open Full Wiki Dossier</span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Structured FAQ Section (aligned with FAQPage JSON-LD) */}
      <section
        aria-labelledby="ecosystem-faq-heading"
        itemScope
        itemType="https://schema.org/FAQPage"
        className="pt-2 space-y-3"
      >
        <h2
          id="ecosystem-faq-heading"
          className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2"
        >
          <HelpCircle className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
          <span>Frequently Asked Questions — WazzimaGiygg &amp; A Verdade</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {ECOSYSTEM_FAQ_ITEMS.map((item) => (
            <div
              key={item.question}
              itemProp="mainEntity"
              itemScope
              itemType="https://schema.org/Question"
              data-wiki-surface="inset"
              className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0b0f17]/80 space-y-1.5"
            >
              <h3
                itemProp="name"
                className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug"
              >
                {item.question}
              </h3>
              <div itemProp="acceptedAnswer" itemScope itemType="https://schema.org/Answer">
                <p
                  itemProp="text"
                  className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
                >
                  {item.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
