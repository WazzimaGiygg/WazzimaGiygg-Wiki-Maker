import type { WikiCategory } from '../types/wiki';

export type EcosystemSubpage = 'overview' | 'services' | 'dossier' | 'administrators';

export interface EcosystemProduct {
  id: string;
  index: string;
  name: string;
  domain: string;
  url: string;
  role: string;
  categoryLabel: string;
  description: string;
  highlights: string[];
  seoKeywords: string[];
}

export const WAZZIMAGIYGG_ECOSYSTEM_PRODUCTS: EcosystemProduct[] = [
  {
    id: 'notmediawiki',
    index: '01',
    name: 'NotMediaWiki',
    domain: 'notmediawiki.wazzimagiygg.com',
    url: 'https://notmediawiki.wazzimagiygg.com/',
    role: 'Independent Wiki Engine',
    categoryLabel: 'Wiki Platform',
    description:
      'An independent wiki platform built outside the MediaWiki and Wikimedia ecosystem, focused on editorial autonomy, transparency, and structural safeguards against administrative censorship.',
    highlights: [
      'Alternative publishing engine free from MediaWiki lock-in',
      'Built-in transparency and anti-arbitrary-block workflows',
      'Direct interoperability with WazzimaGiygg Maker syntax and infoboxes',
    ],
    seoKeywords: ['NotMediaWiki', 'independent wiki', 'MediaWiki alternative', 'WazzimaGiygg'],
  },
  {
    id: 'wikiwazzimagiygg',
    index: '02',
    name: 'WikiWazzimaGiygg',
    domain: 'wikiwazzimagiygg.wazzimagiygg.com',
    url: 'https://wikiwazzimagiygg.wazzimagiygg.com/',
    role: 'Collaborative Encyclopedia',
    categoryLabel: 'Knowledge Base',
    description:
      'Open knowledge base and collaborative documentation hub of the WazzimaGiygg project, bringing together articles, versioned revision histories, and verified public community records.',
    highlights: [
      'Open collaborative encyclopedia and structured reference hub',
      'Full version history tracking and transparent attribution',
      'Cross-referenced research on governance and digital platforms',
    ],
    seoKeywords: ['WikiWazzimaGiygg', 'WazzimaGiygg Wiki', 'collaborative encyclopedia'],
  },
  {
    id: 'jornal',
    index: '03',
    name: 'Jornal WazzimaGiygg',
    domain: 'jornal.wazzimagiygg.com',
    url: 'https://jornal.wazzimagiygg.com/',
    role: 'Publications & Reporting',
    categoryLabel: 'Independent Journalism',
    description:
      'Editorial news outlet dedicated to investigative reporting, critical analysis, platform accountability, and coverage on digital governance, LGPD compliance, and freedom of information.',
    highlights: [
      'Investigative journalism covering online governance and accountability',
      'Coverage on Wikipedia, Wikimedia Foundation, and regulatory compliance',
      'Editorial independence within the WazzimaGiygg network',
    ],
    seoKeywords: ['Jornal WazzimaGiygg', 'independent journalism', 'digital governance news'],
  },
  {
    id: 'core',
    index: '04',
    name: 'WazzimaGiygg Core',
    domain: 'core.wazzimagiygg.com',
    url: 'https://core.wazzimagiygg.com/',
    role: 'Infrastructure & Core',
    categoryLabel: 'Core Infrastructure',
    description:
      'Central architecture layer, technical tooling, authentication services, and shared APIs powering all applications and domains across the WazzimaGiygg ecosystem.',
    highlights: [
      'Shared core services and domain architecture for WazzimaGiygg apps',
      'Hardened data governance and modular deployment primitives',
      'Connects NotMediaWiki, WikiWazzimaGiygg, Jornal, and WazzimaGiygg Maker',
    ],
    seoKeywords: ['WazzimaGiygg Core', 'core infrastructure', 'WazzimaGiygg services'],
  },
  {
    id: 'portal',
    index: '05',
    name: 'WazzimaGiygg Portal',
    domain: 'wazzimagiygg.com',
    url: 'https://wazzimagiygg.com/',
    role: 'Main Portal',
    categoryLabel: 'Official Gateway',
    description:
      'Official central gateway of the WazzimaGiygg ecosystem, featuring the full directory of services, institutional announcements, and direct access to the A Verdade investigative dossier.',
    highlights: [
      'Canonical entry point for all WazzimaGiygg digital services',
      'Home to the public A Verdade portal (wazzimagiygg.com/averdade/)',
      'Central hub for project updates and transparency publications',
    ],
    seoKeywords: ['wazzimagiygg.com', 'WazzimaGiygg Portal', 'WazzimaGiygg services'],
  },
];

export const WIKIPEDIA_DOSSIER_URL = 'https://wazzimagiygg.com/averdade/';

export interface WmfDossierPillar {
  id: string;
  title: string;
  targetEntity: string;
  summary: string;
}

export const WMF_DOSSIER_PILLARS: WmfDossierPillar[] = [
  {
    id: 'unaccountable-moderation',
    title: 'Closed Administrative Rulings & Contested Blocks',
    targetEntity: 'Wikipedia (pt.wikipedia.org) & Administrators',
    summary:
      'Documents disproportionate blocks, edit filters, talk-page sanctions, and unilateral reverts imposed by pseudonymous administrators without independent appeal mechanisms.',
  },
  {
    id: 'wmf-governance-gap',
    title: 'Wikimedia Foundation (WMF) Institutional Omission',
    targetEntity: 'Wikimedia Foundation, Inc.',
    summary:
      'Examines how the Wikimedia Foundation exercises global institutional authority and licenses user content while disclaiming local civil accountability and failing to provide an effective Brazilian DPO.',
  },
  {
    id: 'lgpd-marco-civil',
    title: 'LGPD (Law No. 13.709/2018) & Marco Civil da Internet',
    targetEntity: 'WMF Data Exposure & Legal Compliance',
    summary:
      'Audits permanent retention of historical IP logs, personal data exposure, and refusal to honor statutory erasure/de-indexing requests under Brazilian federal law.',
  },
];

export interface WikipediaAbuseSubject {
  id: string;
  name: string;
  scope: string;
  platform: string;
  focus: string;
}

export const WIKIPEDIA_ABUSE_SUBJECTS: WikipediaAbuseSubject[] = [
  {
    id: 'chronus',
    name: 'Chronus',
    scope: 'Administration and blocks on Portuguese Wikipedia',
    platform: 'Portuguese Wikipedia (pt.wikipedia.org)',
    focus:
      'Records in the A Verdade dossier detailing blocks, unilateral administrative decisions, and contested conduct across editorial disputes.',
  },
  {
    id: 'littlesunshine',
    name: 'LittleSunshine',
    scope: 'Administrative actions and reverts',
    platform: 'Portuguese Wikipedia (pt.wikipedia.org)',
    focus:
      'Documentation of interventions, sanctions, and moderation procedures highlighted in the critical investigation into the platform.',
  },
  {
    id: 'conde-edmond-dantes',
    name: 'Conde Edmond Dantès',
    scope: 'Governance and block enforcement',
    platform: 'Portuguese Wikipedia & Wikimedia',
    focus:
      'Cataloged cases in the dossier concerning disciplinary actions, editorial conflicts, and restrictions imposed on contributor accounts.',
  },
  {
    id: 'teles',
    name: 'Teles',
    scope: 'Advanced privileges and community rulings',
    platform: 'Portuguese Wikipedia & Wikimedia Meta',
    focus:
      'Critical review of administrative decisions, use of restricted tools, and structural lack of accountability in internal reviews.',
  },
  {
    id: 'johannnes89',
    name: 'Johannnes89',
    scope: 'Global oversight and interwiki moderation',
    platform: 'Wikimedia Global / Meta-Wiki',
    focus:
      'Records concerning global blocks, cross-wiki interventions across Wikimedia projects, and the absence of effective due process for users.',
  },
];

export interface EcosystemFaqItem {
  question: string;
  answer: string;
}

export const ECOSYSTEM_FAQ_ITEMS: EcosystemFaqItem[] = [
  {
    question: 'What services are part of the WazzimaGiygg Ecosystem?',
    answer:
      'The WazzimaGiygg network comprises NotMediaWiki (notmediawiki.wazzimagiygg.com), WikiWazzimaGiygg (wikiwazzimagiygg.wazzimagiygg.com), Jornal WazzimaGiygg (jornal.wazzimagiygg.com), WazzimaGiygg Core (core.wazzimagiygg.com), the WazzimaGiygg Portal (wazzimagiygg.com), and WazzimaGiygg Maker.',
  },
  {
    question: 'What is the A Verdade dossier against Wikipedia and the Wikimedia Foundation?',
    answer:
      'Published at wazzimagiygg.com/averdade/, A Verdade is a public research dossier documenting contested administrative blocks, governance failures at the Wikimedia Foundation (WMF), and regulatory conflicts with Brazil’s LGPD and Marco Civil da Internet.',
  },
  {
    question: 'Which Wikipedia and Wikimedia administrators are documented in the dossier?',
    answer:
      'The dossier compiles public records, case histories, and analysis concerning five investigated accounts: Chronus, LittleSunshine, Conde Edmond Dantès, Teles, and Johannnes89.',
  },
];

export const ECOSYSTEM_PAGE_SLUG = 'ecossistema-wazzimagiygg';
export const ECOSYSTEM_PAGE_TITLE = 'WazzimaGiygg Ecosystem Products';
export const ECOSYSTEM_PAGE_CATEGORY: WikiCategory = 'projects';
export const ECOSYSTEM_PAGE_TAGS = ['wazzimagiygg', 'ecosystem', 'products', 'links'];
export const ECOSYSTEM_PAGE_SUMMARY =
  'Official directory of WazzimaGiygg ecosystem services, portals, and the public dossier on Wikipedia, Wikimedia Foundation, and investigated administrators';

export const ECOSYSTEM_PAGE_CONTENT = `:::infobox organization
title: WazzimaGiygg Ecosystem
subtitle: Independent Network of Platforms and Publications
layout: right
Main Portal: [wazzimagiygg.com](https://wazzimagiygg.com/)
NotMediaWiki: [notmediawiki.wazzimagiygg.com](https://notmediawiki.wazzimagiygg.com/)
WikiWazzimaGiygg: [wikiwazzimagiygg.wazzimagiygg.com](https://wikiwazzimagiygg.wazzimagiygg.com/)
Jornal: [jornal.wazzimagiygg.com](https://jornal.wazzimagiygg.com/)
Core: [core.wazzimagiygg.com](https://core.wazzimagiygg.com/)
A Verdade Dossier: [wazzimagiygg.com/averdade](https://wazzimagiygg.com/averdade/)
:::

**WazzimaGiygg Maker** belongs to the **wazzimagiygg.com** ecosystem, an independent network of digital platforms dedicated to collaborative documentation, independent journalism, custom core infrastructure, and public research into Wikipedia and Wikimedia Foundation (WMF) governance.

## Official Ecosystem Products & Subpages

| # | Product | Official URL | Purpose |
| --- | --- | --- | --- |
| 01 | **NotMediaWiki** | [https://notmediawiki.wazzimagiygg.com/](https://notmediawiki.wazzimagiygg.com/) | Independent wiki engine outside the traditional MediaWiki architecture |
| 02 | **WikiWazzimaGiygg** | [https://wikiwazzimagiygg.wazzimagiygg.com/](https://wikiwazzimagiygg.wazzimagiygg.com/) | Collaborative encyclopedia and open project knowledge repository |
| 03 | **Jornal WazzimaGiygg** | [https://jornal.wazzimagiygg.com/](https://jornal.wazzimagiygg.com/) | Independent journalism portal for reporting, analysis, and investigations |
| 04 | **WazzimaGiygg Core** | [https://core.wazzimagiygg.com/](https://core.wazzimagiygg.com/) | Technical infrastructure core and shared services powering the ecosystem |
| 05 | **WazzimaGiygg Portal** | [https://wazzimagiygg.com/](https://wazzimagiygg.com/) | Official central portal connecting all WazzimaGiygg projects |

### Service Descriptions

1. **NotMediaWiki** ([https://notmediawiki.wazzimagiygg.com/](https://notmediawiki.wazzimagiygg.com/)) — An independent wiki publishing alternative designed for editorial autonomy and transparent governance free from MediaWiki constraints.
2. **WikiWazzimaGiygg** ([https://wikiwazzimagiygg.wazzimagiygg.com/](https://wikiwazzimagiygg.wazzimagiygg.com/)) — The primary encyclopedic workspace of the ecosystem, hosting collaborative entries, versioned revision histories, and open references.
3. **Jornal WazzimaGiygg** ([https://jornal.wazzimagiygg.com/](https://jornal.wazzimagiygg.com/)) — An independent publication delivering news coverage, investigative reports, and editorial commentary from the WazzimaGiygg project.
4. **WazzimaGiygg Core** ([https://core.wazzimagiygg.com/](https://core.wazzimagiygg.com/)) — The foundational technical infrastructure and integration layer supporting modules and domains across the ecosystem.
5. **WazzimaGiygg Portal** ([https://wazzimagiygg.com/](https://wazzimagiygg.com/)) — The institutional gateway and central starting point for all connected services and portals.

## Dossier Against Wikipedia, Wikimedia Foundation & Investigated Administrators

The ecosystem also publishes the public **A Verdade** dossier investigating administrative practices on **Wikipedia**, institutional accountability of the **Wikimedia Foundation (WMF)**, and actions by **Chronus**, **LittleSunshine**, **Conde Edmond Dantès**, **Teles**, and **Johannnes89**:

> **Official Dossier Portal:** [https://wazzimagiygg.com/averdade/](https://wazzimagiygg.com/averdade/)

See also the related reference articles directly inside this wiki:

- [[dossie-wikipedia-abusos|Wikipedia Dossier — Chronus, LittleSunshine, Conde Edmond Dantès, Teles, and Johannnes89]]
- [[investigacao-lgpd-marco-civil-wmf-wikipedia|LGPD & Marco Civil Investigation — WMF and Wikipedia]]`;

export const WIKIPEDIA_ABUSES_PAGE_SLUG = 'dossie-wikipedia-abusos';
export const WIKIPEDIA_ABUSES_PAGE_TITLE =
  'Wikipedia Dossier — Chronus, LittleSunshine, Conde Edmond Dantès, Teles, and Johannnes89';
export const WIKIPEDIA_ABUSES_PAGE_CATEGORY: WikiCategory = 'reference';
export const WIKIPEDIA_ABUSES_PAGE_TAGS = [
  'wikipedia',
  'dossier',
  'averdade',
  'chronus',
  'moderation',
];
export const WIKIPEDIA_ABUSES_PAGE_SUMMARY =
  'Overview and direct reference to the A Verdade dossier on Wikipedia and documented abuses by Chronus, LittleSunshine, Conde Edmond Dantès, Teles, and Johannnes89';

export const WIKIPEDIA_ABUSES_PAGE_CONTENT = `:::infobox general
title: Wikipedia Dossier — A Verdade
subtitle: Administrative Abuses and Unaccountable Moderation
layout: right
Official Portal: [wazzimagiygg.com/averdade](https://wazzimagiygg.com/averdade/)
Ecosystem: [wazzimagiygg.com](https://wazzimagiygg.com/)
Documented Accounts: Chronus, LittleSunshine, Conde Edmond Dantès, Teles, Johannnes89
Legal Audit: [[investigacao-lgpd-marco-civil-wmf-wikipedia|LGPD & Marco Civil]]
:::

> **Read the complete dossier on the official portal:** [https://wazzimagiygg.com/averdade/](https://wazzimagiygg.com/averdade/)

This article provides a structured overview and reference to the **A Verdade** dossier maintained by the **WazzimaGiygg** ecosystem, documenting controversies, administrative abuses, contested blocks, and moderation practices on Wikipedia and Wikimedia projects involving **Chronus**, **LittleSunshine**, **Conde Edmond Dantès**, **Teles**, and **Johannnes89**.

## Context of the Dossier

The investigation published at [https://wazzimagiygg.com/averdade/](https://wazzimagiygg.com/averdade/) examines how Wikipedia's moderation model — operated by administrators and privileged users who act largely anonymously or pseudonymously — concentrates decision-making power without effective external due process, legal transparency, or civil accountability in Brazil.

Key structural issues highlighted by the WazzimaGiygg project include:

- Disproportionate application of blocks, edit filters, and sanctions against contributors and critics;
- Administrative rulings made in closed circles without independent review;
- Lack of a formal legal channel or designated Data Protection Officer (DPO) in Brazil to challenge abuses and historical data exposure;
- A sharp disconnect between the institutional rhetoric of a "free encyclopedia" and everyday practices of reverts, editorial censorship, and harassment on talk pages.

## Accounts Documented in the Dossier

| Account / Name | Reported Scope | Reference in Dossier |
| --- | --- | --- |
| **Chronus** | Administration and blocks on Portuguese Wikipedia | Documentation of contested administrative conduct, blocks, and editorial disputes at [wazzimagiygg.com/averdade](https://wazzimagiygg.com/averdade/) |
| **LittleSunshine** | Administrative actions and moderation | Records covering interventions, reverts, and enforcement of community sanctions documented on the portal |
| **Conde Edmond Dantès** | Governance and disciplinary sanctions | Cataloged cases involving use of blocking tools and editorial disputes |
| **Teles** | Advanced privileges and moderation decisions | Critical analysis of administrative actions, contested rulings, and lack of external accountability |
| **Johannnes89** | Interwiki moderation and global actions | Records of global interventions, cross-wiki blocks, and lack of independent appeal mechanisms |

## Connection to the Legal Audit and the WazzimaGiygg Ecosystem

The findings gathered at [https://wazzimagiygg.com/averdade/](https://wazzimagiygg.com/averdade/) connect directly with the statutory and regulatory issues examined in [[investigacao-lgpd-marco-civil-wmf-wikipedia|LGPD & Marco Civil Investigation — WMF and Wikipedia]], as well as with the independent platforms listed in [[ecossistema-wazzimagiygg|WazzimaGiygg Ecosystem Products]]:

- [NotMediaWiki](https://notmediawiki.wazzimagiygg.com/)
- [WikiWazzimaGiygg](https://wikiwazzimagiygg.wazzimagiygg.com/)
- [Jornal WazzimaGiygg](https://jornal.wazzimagiygg.com/)
- [WazzimaGiygg Core](https://core.wazzimagiygg.com/)
- [WazzimaGiygg Portal](https://wazzimagiygg.com/)

To examine the full accounts, screenshots, and supporting evidence published directly by the research team, visit: **[https://wazzimagiygg.com/averdade/](https://wazzimagiygg.com/averdade/)**.`;
