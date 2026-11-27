import { DOSSIER_PAGE_SLUG } from './dossierArticle';
import {
  ECOSYSTEM_FAQ_ITEMS,
  ECOSYSTEM_PAGE_SLUG,
  type EcosystemSubpage,
  WAZZIMAGIYGG_ECOSYSTEM_PRODUCTS,
  WIKIPEDIA_ABUSE_SUBJECTS,
  WIKIPEDIA_ABUSES_PAGE_SLUG,
  WIKIPEDIA_DOSSIER_URL,
  WMF_DOSSIER_PILLARS,
} from './ecosystemContent';
import { LEGAL_GOVERNANCE } from './legalConfig';
import { formatCategoryDisplayName } from './categoryUtils';
import type { WikiPage, WorkspaceView } from '../types/wiki';
import type { LegalSectionTab } from '../components/LegalComplianceView';

const CANONICAL_PROD_ORIGIN = 'https://wikimaker.wazzimagiygg.com';
const DYNAMIC_JSONLD_SCRIPT_ID = 'wazzimagiygg-dynamic-jsonld';

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertJsonLdScript(graph: Record<string, unknown>[]): void {
  if (typeof document === 'undefined') return;
  let script = document.getElementById(DYNAMIC_JSONLD_SCRIPT_ID) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = DYNAMIC_JSONLD_SCRIPT_ID;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph,
  });
}

function resolveCanonicalBaseUrl(): string {
  if (typeof window === 'undefined') return `${CANONICAL_PROD_ORIGIN}/`;
  const { hostname, origin, pathname } = window.location;
  const isLocalOrPreview =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.run.app') ||
    hostname.endsWith('.web.app');
  if (isLocalOrPreview) {
    return `${CANONICAL_PROD_ORIGIN}/`;
  }
  const normalizedPath = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return `${origin}${normalizedPath}`;
}

function getEcosystemSubpageHash(subpage: EcosystemSubpage): string {
  switch (subpage) {
    case 'services':
      return '#/ecosystem/services';
    case 'dossier':
      return '#/ecosystem/dossier';
    case 'administrators':
      return '#/ecosystem/administrators';
    default:
      return '#/ecosystem';
  }
}

export interface DynamicSeoParams {
  siteTitle: string;
  view: WorkspaceView;
  ecosystemSubpage: EcosystemSubpage;
  legalSection: LegalSectionTab;
  selectedCategorySlug?: string | null;
  activePage: WikiPage | null;
  isBootError: boolean;
}

export function applyDynamicSeo({
  siteTitle,
  view,
  ecosystemSubpage,
  legalSection,
  selectedCategorySlug,
  activePage,
  isBootError,
}: DynamicSeoParams): void {
  if (typeof document === 'undefined') return;

  const baseUrl = resolveCanonicalBaseUrl();
  const baseKeywords = [
    'WazzimaGiygg',
    'WazzimaGiygg Maker',
    'WazzimaGiygg Ecosystem',
    'NotMediaWiki',
    'WikiWazzimaGiygg',
    'Jornal WazzimaGiygg',
    'WazzimaGiygg Core',
    'wazzimagiygg.com',
    'wazzimagiygg.com/averdade',
  ];

  let nextTitle = `${siteTitle} — Collaborative Markdown Wiki`;
  let nextDesc = `Create, edit, and organize collaborative Markdown wiki pages, infoboxes, and revision histories in real time with ${siteTitle}.`;
  let nextKeywords = [...baseKeywords];
  let robotsValue =
    'index, follow, noai, noimageai, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  let canonicalUrl = baseUrl;
  let ogType = 'website';

  const organizationNode: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': 'https://wazzimagiygg.com/#organization',
    name: 'WazzimaGiygg',
    url: 'https://wazzimagiygg.com/',
    sameAs: [
      ...WAZZIMAGIYGG_ECOSYSTEM_PRODUCTS.map((p) => p.url),
      CANONICAL_PROD_ORIGIN + '/',
      WIKIPEDIA_DOSSIER_URL,
    ],
  };

  const graphNodes: Record<string, unknown>[] = [organizationNode];

  if (isBootError) {
    nextTitle = `Unavailable — ${siteTitle}`;
    robotsValue = 'noindex, nofollow, noai, noimageai';
  } else if (view === 'admin') {
    nextTitle = `Administration Console — ${siteTitle}`;
    robotsValue = 'noindex, nofollow, noai, noimageai';
    canonicalUrl = `${baseUrl}#/admin`;
  } else if (view === 'create') {
    nextTitle = `Create New Page — ${siteTitle}`;
    robotsValue = 'noindex, follow, noai, noimageai';
    canonicalUrl = `${baseUrl}#/new`;
  } else if (view === 'ecosystem') {
    const subpageHash = getEcosystemSubpageHash(ecosystemSubpage);
    canonicalUrl = `${baseUrl}${subpageHash}`;

    const serviceSchemaNodes: Record<string, unknown>[] = WAZZIMAGIYGG_ECOSYSTEM_PRODUCTS.map(
      (product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'WebApplication',
          name: product.name,
          url: product.url,
          applicationCategory: product.categoryLabel,
          operatingSystem: 'All',
          description: product.description,
          provider: { '@id': 'https://wazzimagiygg.com/#organization' },
        },
      })
    );

    const dossierReportNode: Record<string, unknown> = {
      '@type': 'Report',
      '@id': `${WIKIPEDIA_DOSSIER_URL}#dossier`,
      name: 'A Verdade — Public Dossier Against Wikipedia, Wikimedia Foundation, and Investigated Administrators',
      headline:
        'Public Dossier Against Wikipedia, Wikimedia Foundation (WMF), Chronus, LittleSunshine, Conde Edmond Dantès, Teles, and Johannnes89',
      url: WIKIPEDIA_DOSSIER_URL,
      mainEntityOfPage: `${baseUrl}#/ecosystem/dossier`,
      publisher: { '@id': 'https://wazzimagiygg.com/#organization' },
      description:
        'Public investigation documenting contested administrative blocks, governance opacity at the Wikimedia Foundation (WMF), and LGPD / Marco Civil da Internet concerns on Wikipedia involving Chronus, LittleSunshine, Conde Edmond Dantès, Teles, and Johannnes89.',
      about: [
        { '@type': 'Organization', name: 'Wikimedia Foundation', alternateName: 'WMF' },
        { '@type': 'WebSite', name: 'Wikipedia', url: 'https://pt.wikipedia.org/' },
        ...WIKIPEDIA_ABUSE_SUBJECTS.map((subject) => ({
          '@type': 'Person',
          name: subject.name,
          description: `${subject.scope} (${subject.platform}) — ${subject.focus}`,
        })),
      ],
      hasPart: WMF_DOSSIER_PILLARS.map((pillar) => ({
        '@type': 'CreativeWork',
        name: pillar.title,
        about: pillar.targetEntity,
        description: pillar.summary,
      })),
    };

    const adminsItemListNode: Record<string, unknown> = {
      '@type': 'ItemList',
      '@id': `${baseUrl}#/ecosystem/administrators#list`,
      name: 'Wikipedia & Wikimedia Administrators Investigated in the A Verdade Dossier',
      url: `${baseUrl}#/ecosystem/administrators`,
      numberOfItems: WIKIPEDIA_ABUSE_SUBJECTS.length,
      itemListElement: WIKIPEDIA_ABUSE_SUBJECTS.map((subject, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Person',
          name: subject.name,
          jobTitle: subject.scope,
          affiliation: subject.platform,
          description: subject.focus,
          url: WIKIPEDIA_DOSSIER_URL,
        },
      })),
    };

    const faqNode: Record<string, unknown> = {
      '@type': 'FAQPage',
      mainEntity: ECOSYSTEM_FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };

    let subpageLabel = 'Ecosystem Overview';
    if (ecosystemSubpage === 'services') {
      subpageLabel = 'WazzimaGiygg Services';
      nextTitle = `WazzimaGiygg Services — NotMediaWiki, WikiWazzimaGiygg, Jornal & Core | ${siteTitle}`;
      nextDesc =
        'Explore every service in the WazzimaGiygg ecosystem: NotMediaWiki, WikiWazzimaGiygg, Jornal WazzimaGiygg, WazzimaGiygg Core, WazzimaGiygg Portal, and WazzimaGiygg Maker.';
      nextKeywords = [
        ...baseKeywords,
        'WazzimaGiygg Services',
        'independent wiki platform',
        'MediaWiki alternative',
        'WazzimaGiygg network',
      ];
    } else if (ecosystemSubpage === 'dossier') {
      subpageLabel = 'Wikipedia & Wikimedia Foundation Dossier';
      nextTitle = `A Verdade Dossier — Wikipedia & Wikimedia Foundation (WMF) Investigation | ${siteTitle}`;
      nextDesc =
        'Read the A Verdade public dossier investigating Wikipedia moderation abuses, Wikimedia Foundation (WMF) institutional omission, LGPD and Marco Civil compliance, and documented administrators.';
      nextKeywords = [
        ...baseKeywords,
        'Wikipedia dossier',
        'Wikimedia Foundation',
        'WMF',
        'A Verdade',
        'LGPD Wikipedia',
        'Marco Civil da Internet Wikimedia',
        'Chronus',
        'LittleSunshine',
        'Conde Edmond Dantès',
        'Teles',
        'Johannnes89',
      ];
    } else if (ecosystemSubpage === 'administrators') {
      subpageLabel = 'Investigated Administrators';
      nextTitle = `Investigated Wikipedia Administrators — Chronus, LittleSunshine, Conde Edmond Dantès, Teles, Johannnes89 | ${siteTitle}`;
      nextDesc =
        'Profiles and dossier index of investigated Wikipedia and Wikimedia administrators: Chronus, LittleSunshine, Conde Edmond Dantès, Teles, and Johannnes89 at wazzimagiygg.com/averdade/.';
      nextKeywords = [
        ...baseKeywords,
        'Chronus Wikipedia',
        'LittleSunshine Wikipedia',
        'Conde Edmond Dantès Wikipedia',
        'Teles Wikipedia',
        'Johannnes89 Wikimedia',
        'Wikipedia administrators dossier',
      ];
    } else {
      nextTitle = `WazzimaGiygg Ecosystem Products & Wikipedia/WMF Dossier — ${siteTitle}`;
      nextDesc =
        'Official directory of WazzimaGiygg services (NotMediaWiki, WikiWazzimaGiygg, Jornal, Core, Portal) and the A Verdade dossier against Wikipedia, Wikimedia Foundation (WMF), and investigated administrators.';
      nextKeywords = [
        ...baseKeywords,
        'Wikipedia dossier',
        'Wikimedia Foundation',
        'Chronus',
        'LittleSunshine',
        'Conde Edmond Dantès',
        'Teles',
        'Johannnes89',
      ];
    }

    const breadcrumbItems: Record<string, unknown>[] = [
      {
        '@type': 'ListItem',
        position: 1,
        name: siteTitle,
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'WazzimaGiygg Ecosystem',
        item: `${baseUrl}#/ecosystem`,
      },
    ];
    if (ecosystemSubpage !== 'overview') {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 3,
        name: subpageLabel,
        item: canonicalUrl,
      });
    }

    graphNodes.push(
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#webpage`,
        name: nextTitle,
        description: nextDesc,
        url: canonicalUrl,
        isPartOf: { '@id': `${CANONICAL_PROD_ORIGIN}/#website` },
        about: { '@id': 'https://wazzimagiygg.com/#organization' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems,
      },
      {
        '@type': 'ItemList',
        '@id': `${baseUrl}#/ecosystem/services#list`,
        name: 'WazzimaGiygg Services & Platforms',
        numberOfItems: serviceSchemaNodes.length,
        itemListElement: serviceSchemaNodes,
      },
      dossierReportNode,
      adminsItemListNode,
      faqNode
    );
  } else if (view === 'legal') {
    canonicalUrl = `${baseUrl}#/${legalSection === 'terms' ? 'terms' : 'privacy'}`;
    nextTitle =
      legalSection === 'terms'
        ? `Terms & Marco Civil Compliance — ${siteTitle}`
        : `Privacy Policy & LGPD — ${siteTitle}`;
    nextDesc = `LGPD (Law No. 13.709/2018) and Marco Civil da Internet compliance information. DPO: ${LEGAL_GOVERNANCE.dpoName}.`;
    nextKeywords = [...baseKeywords, 'LGPD', 'Marco Civil da Internet', 'Privacy Policy', 'DPO'];
  } else if (view === 'index') {
    canonicalUrl = `${baseUrl}#/pages`;
    nextTitle = `All Wiki Pages — ${siteTitle}`;
    nextDesc = `Browse every collaborative Markdown page published on ${siteTitle}.`;
  } else if (view === 'categories') {
    if (selectedCategorySlug) {
      const catName = formatCategoryDisplayName(selectedCategorySlug);
      canonicalUrl = `${baseUrl}#/category/${selectedCategorySlug}`;
      nextTitle = `Category:${catName} — ${siteTitle}`;
      nextDesc = `Browse all collaborative wiki articles and subcategories filed under Category:${catName} on ${siteTitle}.`;
      graphNodes.push({
        '@type': 'CollectionPage',
        name: `Category:${catName}`,
        description: nextDesc,
        url: canonicalUrl,
      });
    } else {
      canonicalUrl = `${baseUrl}#/categories`;
      nextTitle = `Categories — ${siteTitle}`;
      nextDesc = `Directory of all Wikipedia-style categories and article collections on ${siteTitle}.`;
    }
  } else if (view === 'recent') {
    canonicalUrl = `${baseUrl}#/recent`;
    nextTitle = `Recent Wiki Changes — ${siteTitle}`;
    nextDesc = `Inspect recent collaborative edits and page updates on ${siteTitle}.`;
  } else if (view === 'tags') {
    canonicalUrl = `${baseUrl}#/tags`;
    nextTitle = `Tag Management — ${siteTitle}`;
    nextDesc = `View, filter, and bulk-manage wiki pages by their associated tags on ${siteTitle}.`;
  } else if (view === 'page' && activePage) {
    canonicalUrl = activePage.slug === 'start' ? baseUrl : `${baseUrl}#/page/${activePage.slug}`;
    nextTitle = `${activePage.title} — ${siteTitle}`;
    ogType = 'article';

    const plainExcerpt = activePage.content
      .replace(/:::(?:infobox|predefinicao)[\s\S]*?:::/g, '')
      .replace(/<\/?(?:noinclude|includeonly)>/gi, '')
      .replace(/[#>*_`[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 155);
    if (plainExcerpt) {
      nextDesc = plainExcerpt;
    }

    if (activePage.visibility === 'private') {
      robotsValue = 'noindex, nofollow, noai, noimageai';
    } else {
      nextKeywords = [...baseKeywords, ...activePage.tags];

      const isDossierOrEcosystemPage =
        activePage.slug === ECOSYSTEM_PAGE_SLUG ||
        activePage.slug === WIKIPEDIA_ABUSES_PAGE_SLUG ||
        activePage.slug === DOSSIER_PAGE_SLUG;

      if (isDossierOrEcosystemPage) {
        nextKeywords.push(
          'Wikipedia',
          'Wikimedia Foundation',
          'Chronus',
          'LittleSunshine',
          'Conde Edmond Dantès',
          'Teles',
          'Johannnes89'
        );
      }

      graphNodes.push(
        {
          '@type': 'Article',
          headline: activePage.title,
          description: nextDesc,
          url: canonicalUrl,
          author: {
            '@type': 'Person',
            name: activePage.authorName || 'WazzimaGiygg Contributor',
          },
          publisher: { '@id': 'https://wazzimagiygg.com/#organization' },
          keywords: nextKeywords.join(', '),
          ...(isDossierOrEcosystemPage
            ? {
                about: [
                  { '@type': 'Organization', name: 'Wikimedia Foundation' },
                  { '@type': 'WebSite', name: 'Wikipedia' },
                  ...WIKIPEDIA_ABUSE_SUBJECTS.map((s) => ({
                    '@type': 'Person',
                    name: s.name,
                  })),
                ],
              }
            : {}),
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: siteTitle, item: baseUrl },
            { '@type': 'ListItem', position: 2, name: activePage.title, item: canonicalUrl },
          ],
        }
      );
    }
  }

  document.title = nextTitle;
  upsertCanonicalLink(canonicalUrl);
  upsertMetaTag('name', 'description', nextDesc);
  upsertMetaTag('name', 'keywords', Array.from(new Set(nextKeywords)).join(', '));
  upsertMetaTag('name', 'robots', robotsValue);
  upsertMetaTag('property', 'og:type', ogType);
  upsertMetaTag('property', 'og:url', canonicalUrl);
  upsertMetaTag('property', 'og:title', nextTitle);
  upsertMetaTag('property', 'og:description', nextDesc);
  upsertMetaTag('name', 'twitter:title', nextTitle);
  upsertMetaTag('name', 'twitter:description', nextDesc);
  upsertJsonLdScript(graphNodes);
}
