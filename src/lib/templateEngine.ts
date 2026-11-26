import type { WikiPage } from '../types/wiki';
import { serializeInfoboxBlock, toWikiSlug, type InfoboxField, type InfoboxType } from './markdownUtils';

export type TemplateBlockVariant =
  | 'info'
  | 'warning'
  | 'alert'
  | 'success'
  | 'stub'
  | 'wip'
  | 'disambiguation'
  | 'navigation'
  | 'quote'
  | 'ecosystem';

export interface WikiTemplateParamSpec {
  key: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  required?: boolean;
}

export interface WikiTemplateCatalogItem {
  id: string;
  name: string;
  aliases: string[];
  category: 'notices' | 'navigation' | 'infobox' | 'ecosystem';
  language?: 'pt' | 'en';
  description: string;
  exampleSnippet: string;
  params: WikiTemplateParamSpec[];
}

export const WIKI_TEMPLATE_CATALOG: WikiTemplateCatalogItem[] = [
  {
    id: 'aviso',
    name: 'Ambox / Editorial Notice',
    aliases: ['aviso', 'ambox', 'notice', 'alerta', 'nota'],
    category: 'notices',
    description:
      'MediaWiki-style editorial notice box (Ambox) for alerts, reviews, notes, or verifications.',
    exampleSnippet:
      '{{Notice|type=warning|title=Under Review|text=The information in this section is undergoing collaborative verification.}}',
    params: [
      {
        key: 'type',
        label: 'Type (note, warning, alert, success)',
        placeholder: 'note',
        defaultValue: 'warning',
      },
      {
        key: 'title',
        label: 'Notice title',
        placeholder: 'Under Review',
        defaultValue: 'Editorial Notice',
      },
      {
        key: 'text',
        label: 'Message',
        placeholder: 'Describe the reason for the notice...',
        defaultValue: 'This section is currently under collaborative review.',
        required: true,
      },
    ],
  },
  {
    id: 'boas-vindas',
    name: 'Welcome',
    aliases: ['boas-vindas', 'boas vindas', 'welcome'],
    category: 'notices',
    language: 'en',
    description:
      'Welcome banner for new contributors and discussion pages with a direct link to the WikiMaker Usage Rules.',
    exampleSnippet:
      '{{Welcome|contributor=New Collaborator|topic=WazzimaGiygg Maker}}',
    params: [
      {
        key: 'contributor',
        label: 'Contributor name',
        placeholder: 'Collaborator',
        defaultValue: 'Collaborator',
      },
      {
        key: 'topic',
        label: 'Project or topic',
        placeholder: 'WazzimaGiygg Maker',
        defaultValue: 'WazzimaGiygg Maker',
      },
    ],
  },
  {
    id: 'esboco',
    name: 'Article Stub',
    aliases: ['esboco', 'stub'],
    category: 'notices',
    description:
      'Marks an article as a stub in MediaWiki style, inviting collaborators to expand the content.',
    exampleSnippet: '{{Stub|Digital Governance}}',
    params: [
      {
        key: '1',
        label: 'Subject or topic area (optional)',
        placeholder: 'Technology',
        defaultValue: 'Wiki Documentation',
      },
    ],
  },
  {
    id: 'em-construcao',
    name: 'Work in Progress',
    aliases: ['em construcao', 'wip', 'construcao', 'manutencao'],
    category: 'notices',
    description:
      'Informs readers that the page is under active editing and may undergo structural changes soon.',
    exampleSnippet: '{{Under construction|Expected completion: this week.}}',
    params: [
      {
        key: '1',
        label: 'Additional note (optional)',
        placeholder: 'Estimated completion or editing context...',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'carece-de-fontes',
    name: 'Sources Needed',
    aliases: ['carece de fontes', 'sem fontes', 'citation needed', 'fonte', 'cn'],
    category: 'notices',
    description:
      'When used alone on a line (or with a date), renders a maintenance banner; inline inside text, inserts ^[citation needed]^.',
    exampleSnippet: '{{Citation needed|date=November 2026}}',
    params: [
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'desambiguacao',
    name: 'Disambiguation Hatnote',
    aliases: ['desambiguacao', 'desambig', 'disambig', 'disambiguation'],
    category: 'notices',
    description:
      'Standard disambiguation page notice listing distinct meanings for the same term.',
    exampleSnippet: '{{Disambiguation|WazzimaGiygg}}',
    params: [
      {
        key: '1',
        label: 'Ambiguous term',
        placeholder: 'Term or acronym',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'eliminacao-rapida',
    name: 'Speedy Delete',
    aliases: ['eliminacao rapida', 'er', 'speedy delete', 'speedy deletion', 'db', 'delete'],
    category: 'notices',
    language: 'en',
    description:
      'Nominates an article for speedy deletion and automatically sends an alert to the author’s discussion page on save.',
    exampleSnippet:
      '{{Speedy delete|reason=Test page or lacking minimal encyclopedic content|rule=G1}}',
    params: [
      {
        key: 'reason',
        label: 'Reason for speedy deletion',
        placeholder: 'Describe the criterion or justification...',
        defaultValue: 'Inappropriate content, test page, or outside wiki editorial scope.',
        required: true,
      },
      {
        key: 'rule',
        label: 'Rule / Criterion (optional)',
        placeholder: 'G1',
        defaultValue: 'G1',
      },
      {
        key: 'by',
        label: 'Nominator (optional)',
        placeholder: 'Your collaborator name',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'bloqueio',
    name: 'Account Block',
    aliases: ['bloqueio', 'bloqueado', 'block', 'blocked', 'user blocked'],
    category: 'notices',
    language: 'en',
    description:
      'Administrative account block notice automatically inserted on the blocked collaborator’s personal page.',
    exampleSnippet:
      '{{Block|reason=Repeated violation of editorial policies|admin=Administration|duration=Indefinite}}',
    params: [
      {
        key: 'reason',
        label: 'Block reason',
        placeholder: 'Describe the administrative reason...',
        defaultValue: 'Violation of editorial or conduct rules.',
        required: true,
      },
      {
        key: 'admin',
        label: 'Responsible administrator',
        placeholder: 'Administration',
        defaultValue: 'Administration',
      },
      {
        key: 'duration',
        label: 'Duration',
        placeholder: 'Indefinite',
        defaultValue: 'Indefinite',
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: '2026-11-25',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'sem-referencias',
    name: 'Unreferenced',
    aliases: [
      'sem referencias',
      'mais notas',
      'unreferenced',
      'refimprove',
      'more citations needed',
    ],
    category: 'notices',
    language: 'en',
    description:
      'Classic Wikipedia banner indicating that the article or section does not cite reliable independent sources.',
    exampleSnippet: '{{Unreferenced|date=November 2026}}',
    params: [
      {
        key: 'section',
        label: 'Section or scope (optional)',
        placeholder: 'This article',
        defaultValue: '',
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'reciclagem',
    name: 'Copyedit & Cleanup',
    aliases: ['reciclagem', 'wikificacao', 'wikificar', 'contextualizar', 'revisao', 'copyedit'],
    category: 'notices',
    language: 'en',
    description:
      'Wikipedia template for articles requiring cleanup, wikification, context, or stylistic copy editing.',
    exampleSnippet:
      '{{Copyedit|reason=Organize sections, add internal links, and format references.|date=November 2026}}',
    params: [
      {
        key: 'reason',
        label: 'What needs cleanup',
        placeholder: 'Describe style or structural improvements...',
        defaultValue: 'Organize sections, add internal links, and standardize encyclopedic style.',
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'parcial',
    name: 'POV / Partiality',
    aliases: ['parcial', 'imparcialidade', 'controverso', 'ponto de vista'],
    category: 'notices',
    language: 'en',
    description:
      'Signals that the neutrality or impartial point of view of the article is disputed on the talk page.',
    exampleSnippet:
      '{{POV|section=Critical reception|reason=Needs balance between primary sources and divergent viewpoints.}}',
    params: [
      {
        key: 'reason',
        label: 'Reason for dispute',
        placeholder: 'Explain the neutrality concern...',
        defaultValue: 'The neutrality of this passage is currently under discussion on the talk page.',
      },
      {
        key: 'section',
        label: 'Section (optional)',
        placeholder: 'History',
        defaultValue: '',
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'desatualizado',
    name: 'Update Needed',
    aliases: ['desatualizado', 'desatualizada', 'atualizar'],
    category: 'notices',
    language: 'en',
    description:
      'Informs readers that figures, versions, statistics, or events described in the entry need updating.',
    exampleSnippet:
      '{{Update|reason=Statistical data prior to the 2026 update.|date=November 2026}}',
    params: [
      {
        key: 'reason',
        label: 'Details of outdated content',
        placeholder: 'E.g.: older versions or figures...',
        defaultValue: 'Some information in this article may be outdated.',
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'fusao',
    name: 'Merge',
    aliases: ['fusao', 'fundir', 'merge', 'merge to', 'merge from'],
    category: 'notices',
    language: 'en',
    description:
      'Proposes merging two entries with overlapping scope, creating a direct link to the target article.',
    exampleSnippet: '{{Merge|ecossistema-wazzimagiygg|reason=Complementary scopes that can form a single guide.}}',
    params: [
      {
        key: '1',
        label: 'Target article slug',
        placeholder: 'ecossistema-wazzimagiygg',
        defaultValue: 'ecossistema-wazzimagiygg',
        required: true,
      },
      {
        key: 'reason',
        label: 'Justification (optional)',
        placeholder: 'Why the articles should be merged...',
        defaultValue: 'The topics share significant editorial overlap.',
      },
    ],
  },
  {
    id: 'traducao',
    name: 'Translated Page',
    aliases: ['traducao', 'em traducao', 'traduzido', 'translated page', 'expand language'],
    category: 'notices',
    language: 'en',
    description:
      'Marks an article being translated or adapted from another language (equivalent to {{Translated page}} / {{Expand language}}).',
    exampleSnippet: '{{Translated page|language=Portuguese|article=Wikipedia Documentation|status=In progress}}',
    params: [
      {
        key: 'language',
        label: 'Source language',
        placeholder: 'Portuguese',
        defaultValue: 'Portuguese',
      },
      {
        key: 'article',
        label: 'Original article (optional)',
        placeholder: 'Original title',
        defaultValue: '',
      },
      {
        key: 'status',
        label: 'Translation status',
        placeholder: 'In progress',
        defaultValue: 'In progress',
      },
    ],
  },
  {
    id: 'evento-atual',
    name: 'Current Event',
    aliases: ['evento atual', 'atualidade', 'evento recente', 'current', 'recentismo'],
    category: 'notices',
    language: 'en',
    description:
      'Alerts readers about ongoing developments or recent news whose details change rapidly.',
    exampleSnippet: '{{Current|Ongoing regulatory investigation into open platforms.}}',
    params: [
      {
        key: '1',
        label: 'Event description (optional)',
        placeholder: 'Context of the recent event...',
        defaultValue: 'Information may be updated as new facts are confirmed.',
      },
    ],
  },
  {
    id: 'artigo-futuro',
    name: 'Future Event',
    aliases: ['artigo futuro', 'evento futuro', 'futuro', 'future'],
    category: 'notices',
    language: 'en',
    description:
      'Flags entries about planned projects, works, or events whose specifications may change before release.',
    exampleSnippet: '{{Future|Scheduled release for next quarter.}}',
    params: [
      {
        key: '1',
        label: 'Schedule note (optional)',
        placeholder: 'Forecast or preliminary details...',
        defaultValue: 'Announced details are subject to change until official release.',
      },
    ],
  },
  {
    id: 'eliminar',
    name: 'Articles for Deletion (AfD)',
    aliases: ['eliminar', 'eliminacao por consenso', 'pe', 'afd', 'ec'],
    category: 'notices',
    language: 'en',
    description:
      'Articles for Deletion (AfD) notice when keeping the article is under community discussion.',
    exampleSnippet:
      '{{AfD|reason=Evaluate encyclopedic notability and available independent sources.|date=November 2026}}',
    params: [
      {
        key: 'reason',
        label: 'Nomination reason',
        placeholder: 'Explain the criteria under debate...',
        defaultValue: 'Reviewing notability and adherence to editorial policies.',
        required: true,
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'protegida',
    name: 'Protected Page',
    aliases: ['protegida', 'semiprotegida', 'protecao', 'pp protected', 'protected'],
    category: 'notices',
    language: 'en',
    description:
      'Informational badge indicating that the page is protected or semi-protected against unauthorized edits.',
    exampleSnippet:
      '{{Protected|level=Administrative protection|reason=Preserving stable institutional content.}}',
    params: [
      {
        key: 'level',
        label: 'Protection level',
        placeholder: 'Semi-protected',
        defaultValue: 'Semi-protected',
      },
      {
        key: 'reason',
        label: 'Protection reason',
        placeholder: 'Vandalism prevention or stable record...',
        defaultValue: 'Editing temporarily restricted to preserve text integrity.',
      },
    ],
  },
  {
    id: 'multiplos-problemas',
    name: 'Multiple Issues',
    aliases: ['multiplos problemas', 'problemas', 'multiple issues'],
    category: 'notices',
    language: 'en',
    description:
      'Groups multiple editorial issues of an article into a single compact notice at the top of the page.',
    exampleSnippet:
      '{{Multiple issues|1=Needs reliable independent sources|2=Requires style cleanup and internal links|date=November 2026}}',
    params: [
      {
        key: '1',
        label: 'First issue',
        placeholder: 'Needs reliable sources',
        defaultValue: 'Needs reliable independent sources',
        required: true,
      },
      {
        key: '2',
        label: 'Second issue (optional)',
        placeholder: 'Requires style cleanup',
        defaultValue: 'Requires style cleanup and internal links',
      },
      {
        key: '3',
        label: 'Third issue (optional)',
        placeholder: 'May be outdated',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'artigo-destacado',
    name: 'Featured Article',
    aliases: [
      'artigo destacado',
      'artigo bom',
      'destaque',
      'featured article',
      'good article',
    ],
    category: 'notices',
    language: 'en',
    description:
      'Wikipedia editorial badge recognizing comprehensive, well-referenced, and verified articles.',
    exampleSnippet: '{{Featured article|level=Featured Article|date=November 2026}}',
    params: [
      {
        key: 'level',
        label: 'Classification (Featured Article or Good Article)',
        placeholder: 'Featured Article',
        defaultValue: 'Featured Article',
      },
      {
        key: 'date',
        label: 'Recognition date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'carece-de-esclarecimento',
    name: 'Clarify',
    aliases: ['carece de esclarecimento', 'esclarecer', 'clarify', 'quem', 'who', 'quando', 'when', 'onde'],
    category: 'notices',
    language: 'en',
    description:
      'Marks vague statements inline with ^[clarification needed]^ (or ^[who?]^ / ^[when?]^), or displays a banner when given a reason.',
    exampleSnippet: '{{Clarify|reason=Specify exact version or year of the cited report.}}',
    params: [
      {
        key: 'reason',
        label: 'Passage to clarify (optional; empty = inline tag)',
        placeholder: 'Leave empty for inline tag',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'principal',
    name: 'Main Article',
    aliases: ['principal', 'artigo principal', 'main'],
    category: 'navigation',
    description:
      'Points to the main article of a section in classic Wikipedia / MediaWiki format.',
    exampleSnippet: '{{Main|ecossistema-wazzimagiygg|WazzimaGiygg Ecosystem Products}}',
    params: [
      {
        key: '1',
        label: 'Main article slug',
        placeholder: 'ecossistema-wazzimagiygg',
        defaultValue: 'ecossistema-wazzimagiygg',
        required: true,
      },
      {
        key: '2',
        label: 'Display title (optional)',
        placeholder: 'WazzimaGiygg Ecosystem Products',
        defaultValue: 'WazzimaGiygg Ecosystem Products',
      },
    ],
  },
  {
    id: 'ver-tambem',
    name: 'Related Pages (See also)',
    aliases: ['ver tambem', 'see also', 'veja tambem'],
    category: 'navigation',
    description:
      'Inserts a cross-reference strip ("See also") connecting up to 3 related pages.',
    exampleSnippet: '{{See also|dossie-wikipedia-abusos|investigacao-lgpd-marco-civil-wmf-wikipedia}}',
    params: [
      {
        key: '1',
        label: 'First slug',
        placeholder: 'dossie-wikipedia-abusos',
        defaultValue: 'dossie-wikipedia-abusos',
        required: true,
      },
      {
        key: '2',
        label: 'Second slug (optional)',
        placeholder: 'investigacao-lgpd-marco-civil-wmf-wikipedia',
        defaultValue: 'investigacao-lgpd-marco-civil-wmf-wikipedia',
      },
    ],
  },
  {
    id: 'citacao',
    name: 'Block Quote',
    aliases: ['citacao', 'quote', 'cquote'],
    category: 'navigation',
    description:
      'Highlighted quotation block with author and source attribution in MediaWiki style.',
    exampleSnippet:
      '{{Quote|text=Open knowledge thrives on transparent accountability and independent publishing.|author=WazzimaGiygg Editorial|source=Project Charter}}',
    params: [
      {
        key: 'text',
        label: 'Quoted text',
        placeholder: 'Enter the quotation...',
        defaultValue: 'Open knowledge thrives on transparent accountability.',
        required: true,
      },
      {
        key: 'author',
        label: 'Author',
        placeholder: 'Author name',
        defaultValue: 'WazzimaGiygg Editorial',
      },
      {
        key: 'source',
        label: 'Source / Work (optional)',
        placeholder: 'Document or article',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'sobre',
    name: 'About',
    aliases: ['sobre', 'about', 'outros significados', 'for'],
    category: 'navigation',
    language: 'en',
    description:
      'Classic Wikipedia hatnote ("For X, see Y") directing readers to other meanings or related pages.',
    exampleSnippet: '{{About|the full syntax documentation|markdown-guide|Markdown Guide}}',
    params: [
      {
        key: '1',
        label: 'Context for the other meaning',
        placeholder: 'other uses or context',
        defaultValue: 'the full editing documentation',
        required: true,
      },
      {
        key: '2',
        label: 'Target article slug',
        placeholder: 'markdown-guide',
        defaultValue: 'markdown-guide',
        required: true,
      },
      {
        key: '3',
        label: 'Display title (optional)',
        placeholder: 'Markdown Guide',
        defaultValue: 'Markdown Guide',
      },
    ],
  },
  {
    id: 'nao-confundir',
    name: 'Not to be Confused',
    aliases: ['nao confundir', 'nao confundir com'],
    category: 'navigation',
    language: 'en',
    description:
      'Quick disambiguation hatnote ("Not to be confused with...") to distinguish similarly named topics.',
    exampleSnippet: '{{Distinguish|ecossistema-wazzimagiygg|WazzimaGiygg Ecosystem}}',
    params: [
      {
        key: '1',
        label: 'Distinct page slug',
        placeholder: 'ecossistema-wazzimagiygg',
        defaultValue: 'ecossistema-wazzimagiygg',
        required: true,
      },
      {
        key: '2',
        label: 'Display name (optional)',
        placeholder: 'WazzimaGiygg Ecosystem',
        defaultValue: 'WazzimaGiygg Ecosystem',
      },
    ],
  },
  {
    id: 'redirecionamento',
    name: 'Redirect Notice',
    aliases: ['redirecionamento', 'redireciona', 'redireciona aqui'],
    category: 'navigation',
    language: 'en',
    description:
      'Hatnote indicating terms that redirect to the current article and pointing to other uses.',
    exampleSnippet: '{{Redirect|A Verdade|dossie-wikipedia-abusos|Wikipedia Abuses Dossier}}',
    params: [
      {
        key: '1',
        label: 'Redirected term',
        placeholder: 'Term or acronym',
        defaultValue: 'A Verdade',
        required: true,
      },
      {
        key: '2',
        label: 'Other-uses slug',
        placeholder: 'dossie-wikipedia-abusos',
        defaultValue: 'dossie-wikipedia-abusos',
        required: true,
      },
      {
        key: '3',
        label: 'Display title (optional)',
        placeholder: 'Wikipedia Abuses Dossier',
        defaultValue: 'Wikipedia Abuses Dossier',
      },
    ],
  },
  {
    id: 'reflist',
    name: 'Reflist',
    aliases: ['reflist', 'referencias', 'lista de referencias', 'notas', 'notelist'],
    category: 'navigation',
    language: 'en',
    description:
      'Renders the numbered, interactive <ref> reference list (compatible with {{Reflist}}, {{Referências}}, and <references />) at the exact spot in the article.',
    exampleSnippet: '{{Reflist}}',
    params: [
      {
        key: 'columns',
        label: 'Columns (1, 2, or 3 — optional)',
        placeholder: '1',
        defaultValue: '',
      },
      {
        key: 'group',
        label: 'Note group (optional, e.g.: note)',
        placeholder: '',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'citar-web',
    name: 'Web Citation',
    aliases: ['citar web', 'citar site'],
    category: 'navigation',
    language: 'en',
    description:
      'Wikipedia template for citing web pages; automatically generates a numbered <ref> footnote.',
    exampleSnippet:
      '{{Cite web|title=A Verdade Dossier|url=https://wazzimagiygg.com/averdade/|author=WazzimaGiygg Research|publisher=wazzimagiygg.com|date=November 2026}}',
    params: [
      {
        key: 'title',
        label: 'Page or article title',
        placeholder: 'Source title',
        defaultValue: 'A Verdade Dossier',
        required: true,
      },
      {
        key: 'url',
        label: 'URL',
        placeholder: 'https://...',
        defaultValue: 'https://wazzimagiygg.com/averdade/',
      },
      {
        key: 'author',
        label: 'Author (optional)',
        placeholder: 'Author name',
        defaultValue: 'WazzimaGiygg Research',
      },
      {
        key: 'publisher',
        label: 'Website / Publisher (optional)',
        placeholder: 'wazzimagiygg.com',
        defaultValue: 'wazzimagiygg.com',
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'citar-livro',
    name: 'Cite book',
    aliases: ['citar livro', 'cite book'],
    category: 'navigation',
    language: 'en',
    description:
      'Standard Wikipedia bibliographic citation for books and technical manuals; expands into a <ref> footnote.',
    exampleSnippet:
      '{{Cite book|title=Collaborative Wiki Architecture|author=Silva, M.|publisher=Open Press|year=2025|isbn=978-0-00-000000-0}}',
    params: [
      {
        key: 'title',
        label: 'Book title',
        placeholder: 'Book title',
        defaultValue: 'Collaborative Wiki Architecture',
        required: true,
      },
      {
        key: 'author',
        label: 'Author',
        placeholder: 'Last, First',
        defaultValue: 'WazzimaGiygg Editorial',
      },
      {
        key: 'publisher',
        label: 'Publisher (optional)',
        placeholder: 'Publisher name',
        defaultValue: 'Open Press',
      },
      {
        key: 'year',
        label: 'Year (optional)',
        placeholder: '2026',
        defaultValue: '2026',
      },
      {
        key: 'isbn',
        label: 'ISBN (optional)',
        placeholder: '978-...',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'citar-noticia',
    name: 'Cite news',
    aliases: ['citar noticia', 'citar jornal', 'cite news', 'cite journal'],
    category: 'navigation',
    language: 'en',
    description:
      'Journalistic or periodical citation in Wikipedia format; automatically generates a numbered footnote.',
    exampleSnippet:
      '{{Cite news|title=Editorial Transparency Report|newspaper=Jornal WazzimaGiygg|date=2026-11-25|url=https://jornal.wazzimagiygg.com/}}',
    params: [
      {
        key: 'title',
        label: 'Report or article title',
        placeholder: 'News headline',
        defaultValue: 'Editorial Transparency Report',
        required: true,
      },
      {
        key: 'newspaper',
        label: 'Newspaper / Magazine',
        placeholder: 'Jornal WazzimaGiygg',
        defaultValue: 'Jornal WazzimaGiygg',
      },
      {
        key: 'author',
        label: 'Author (optional)',
        placeholder: 'Reporter or desk',
        defaultValue: '',
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
      {
        key: 'url',
        label: 'URL (optional)',
        placeholder: 'https://...',
        defaultValue: 'https://jornal.wazzimagiygg.com/',
      },
    ],
  },
  {
    id: 'info',
    name: 'Infobox (Generic)',
    aliases: ['info', 'infobox', 'ficha'],
    category: 'infobox',
    description:
      'Key/value syntax matching MediaWiki {{Infobox}} templates; renders a full summary Infobox card.',
    exampleSnippet:
      '{{Infobox|type=project|title=WikiWazzimaGiygg|subtitle=Independent Encyclopedia|Status=Active|Portal=[wazzimagiygg.com](https://wazzimagiygg.com/)}}',
    params: [
      {
        key: 'type',
        label: 'Type (general, project, organization, character, location, item, user)',
        placeholder: 'project',
        defaultValue: 'project',
      },
      {
        key: 'title',
        label: 'Title',
        placeholder: 'Entry name',
        defaultValue: 'Wiki Project',
        required: true,
      },
      {
        key: 'subtitle',
        label: 'Subtitle',
        placeholder: 'Short classification',
        defaultValue: 'Reference entry',
      },
      {
        key: 'Status',
        label: 'Status',
        placeholder: 'Active',
        defaultValue: 'Active',
      },
      {
        key: 'Portal',
        label: 'Portal / Link',
        placeholder: '[wazzimagiygg.com](https://wazzimagiygg.com/)',
        defaultValue: '[wazzimagiygg.com](https://wazzimagiygg.com/)',
      },
    ],
  },
  {
    id: 'info-biografia',
    name: 'Infobox person',
    aliases: ['info/biografia', 'info/pessoa', 'infobox person'],
    category: 'infobox',
    language: 'en',
    description:
      'Classic Wikipedia biographical card ({{Infobox person}}) with birth, occupation, and nationality.',
    exampleSnippet:
      '{{Infobox person|title=Sample Person|subtitle=Researcher & Author|Born=1990|Nationality=Brazilian|Occupation=Developer}}',
    params: [
      {
        key: 'title',
        label: 'Full name',
        placeholder: 'Person name',
        defaultValue: 'Sample Person',
        required: true,
      },
      {
        key: 'subtitle',
        label: 'Short description',
        placeholder: 'Researcher & Author',
        defaultValue: 'Researcher & Author',
      },
      {
        key: 'Born',
        label: 'Born',
        placeholder: 'Date and place',
        defaultValue: '1990',
      },
      {
        key: 'Nationality',
        label: 'Nationality',
        placeholder: 'Brazilian',
        defaultValue: 'Brazilian',
      },
      {
        key: 'Occupation',
        label: 'Occupation',
        placeholder: 'Writer, engineer...',
        defaultValue: 'Researcher',
      },
    ],
  },
  {
    id: 'info-empresa',
    name: 'Infobox company',
    aliases: ['info/empresa', 'info/organizacao', 'infobox company'],
    category: 'infobox',
    language: 'en',
    description:
      'Wikipedia infobox for companies, institutions, and foundations ({{Infobox company}}).',
    exampleSnippet:
      '{{Infobox company|title=Sample Organization|Type=Independent institution|Founded=2024|Headquarters=Brazil|Website=[wazzimagiygg.com](https://wazzimagiygg.com/)}}',
    params: [
      {
        key: 'title',
        label: 'Organization name',
        placeholder: 'Company or entity name',
        defaultValue: 'Sample Organization',
        required: true,
      },
      {
        key: 'Type',
        label: 'Type / Nature',
        placeholder: 'Company, NGO, Foundation...',
        defaultValue: 'Independent organization',
      },
      {
        key: 'Founded',
        label: 'Founded',
        placeholder: '2024',
        defaultValue: '2024',
      },
      {
        key: 'Headquarters',
        label: 'Headquarters',
        placeholder: 'City, Country',
        defaultValue: 'Brazil',
      },
      {
        key: 'Website',
        label: 'Official website',
        placeholder: '[wazzimagiygg.com](https://wazzimagiygg.com/)',
        defaultValue: '[wazzimagiygg.com](https://wazzimagiygg.com/)',
      },
    ],
  },
  {
    id: 'info-jogo',
    name: 'Infobox video game',
    aliases: ['info/jogo', 'info/software', 'infobox video game', 'infobox software'],
    category: 'infobox',
    language: 'en',
    description:
      'Wikipedia technical infobox for video games and software ({{Infobox video game}}).',
    exampleSnippet:
      '{{Infobox video game|title=Sample Game|Developer=Indie Studio|Genre=RPG / Simulation|Platforms=PC, Web|Release=2026}}',
    params: [
      {
        key: 'title',
        label: 'Game or software title',
        placeholder: 'Title name',
        defaultValue: 'Sample Project',
        required: true,
      },
      {
        key: 'Developer',
        label: 'Developer',
        placeholder: 'Studio name',
        defaultValue: 'Indie Studio',
      },
      {
        key: 'Genre',
        label: 'Genre / Category',
        placeholder: 'RPG, Adventure, Utility...',
        defaultValue: 'Simulation / Wiki',
      },
      {
        key: 'Platforms',
        label: 'Platforms',
        placeholder: 'PC, Web, Linux',
        defaultValue: 'PC, Web',
      },
      {
        key: 'Release',
        label: 'Release year',
        placeholder: '2026',
        defaultValue: '2026',
      },
    ],
  },
  {
    id: 'info-pais',
    name: 'Infobox country',
    aliases: ['info/pais', 'info/local', 'infobox country', 'infobox settlement'],
    category: 'infobox',
    language: 'en',
    description:
      'Wikipedia-style geographic infobox ({{Infobox country}}) for countries, states, cities, or regions.',
    exampleSnippet:
      '{{Infobox country|title=Sample Republic|Capital=Central City|Language=English|Population=1,200,000|Currency=Dollar}}',
    params: [
      {
        key: 'title',
        label: 'Country or locality name',
        placeholder: 'Official name',
        defaultValue: 'Sample Location',
        required: true,
      },
      {
        key: 'Capital',
        label: 'Capital / Seat',
        placeholder: 'Main city',
        defaultValue: 'Central City',
      },
      {
        key: 'Language',
        label: 'Official language',
        placeholder: 'English',
        defaultValue: 'English',
      },
      {
        key: 'Population',
        label: 'Estimated population',
        placeholder: '1,000,000',
        defaultValue: '1,000,000',
      },
    ],
  },
  {
    id: 'ecossistema-wazzimagiygg',
    name: 'WazzimaGiygg Ecosystem',
    aliases: ['ecossistema wazzimagiygg', 'wazzimagiygg', 'wikipedia dossie', 'a verdade'],
    category: 'ecosystem',
    description:
      'Standard institutional box connecting the 5 WazzimaGiygg portals and the A Verdade dossier on Wikipedia.',
    exampleSnippet: '{{WazzimaGiygg Ecosystem}}',
    params: [],
  },
  // --- English MediaWiki Templates ---
  {
    id: 'notice-en',
    name: 'Notice',
    aliases: ['notice', 'ambox', 'aviso', 'alert'],
    category: 'notices',
    language: 'en',
    description:
      'English MediaWiki editorial banner (Ambox) for notes, warnings, critical alerts, or verified confirmations.',
    exampleSnippet:
      '{{Notice|type=warning|title=Under Editorial Review|text=Claims in this section are undergoing collaborative source verification.|date=November 2026}}',
    params: [
      {
        key: 'type',
        label: 'Type (note, warning, alert, success)',
        placeholder: 'warning',
        defaultValue: 'warning',
      },
      {
        key: 'title',
        label: 'Banner title',
        placeholder: 'Editorial Notice',
        defaultValue: 'Editorial Notice',
      },
      {
        key: 'text',
        label: 'Message',
        placeholder: 'Describe the editorial notice...',
        defaultValue: 'This section is currently under collaborative review.',
        required: true,
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'stub-en',
    name: 'Stub',
    aliases: ['stub', 'esboco'],
    category: 'notices',
    language: 'en',
    description:
      'Marks an article as a short stub in standard English Wikipedia style, inviting contributors to expand it.',
    exampleSnippet: '{{Stub|Digital Governance}}',
    params: [
      {
        key: '1',
        label: 'Topic or subject area',
        placeholder: 'Digital Governance',
        defaultValue: 'Wiki Documentation',
      },
    ],
  },
  {
    id: 'under-construction-en',
    name: 'Under construction',
    aliases: ['under construction', 'wip', 'em construcao'],
    category: 'notices',
    language: 'en',
    description:
      'Informs readers that an English article is currently undergoing major drafting or structural expansion.',
    exampleSnippet: '{{Under construction|Expected completion: this week.}}',
    params: [
      {
        key: '1',
        label: 'Status note (optional)',
        placeholder: 'Expected completion or scope...',
        defaultValue: 'Sections are actively being drafted and sourced.',
      },
    ],
  },
  {
    id: 'citation-needed-en',
    name: 'Citation needed',
    aliases: ['citation needed', 'cn', 'carece de fontes'],
    category: 'notices',
    language: 'en',
    description:
      'Renders an inline ^[citation needed]^ marker mid-sentence, or a standalone verification banner with optional date.',
    exampleSnippet: '{{Citation needed|date=November 2026}}',
    params: [
      {
        key: 'date',
        label: 'Date tagged (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'cleanup-en',
    name: 'Cleanup',
    aliases: ['cleanup', 'clean up', 'wikify'],
    category: 'notices',
    language: 'en',
    description:
      'Classic Wikipedia cleanup banner flagging formatting, structure, or copy-editing improvements needed.',
    exampleSnippet:
      '{{Cleanup|section=Overview|reason=Convert bullet lists into clear encyclopedic prose and add section links.|date=November 2026}}',
    params: [
      {
        key: 'reason',
        label: 'Reason for cleanup',
        placeholder: 'Explain what needs formatting or copy-editing...',
        defaultValue: 'Improve formatting, headings, and encyclopedic prose clarity.',
      },
      {
        key: 'section',
        label: 'Section (optional)',
        placeholder: 'Overview',
        defaultValue: '',
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'outdated-en',
    name: 'Outdated',
    aliases: ['outdated', 'update', 'obsolete'],
    category: 'notices',
    language: 'en',
    description:
      'Flags technical documentation or reference entries whose figures, APIs, or timelines need updating.',
    exampleSnippet:
      '{{Outdated|reason=Reflects platform policies prior to the 2026 revision.|date=November 2026}}',
    params: [
      {
        key: 'reason',
        label: 'Update needed',
        placeholder: 'Describe what changed or became outdated...',
        defaultValue: 'Please update figures and references to reflect current developments.',
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'disputed-en',
    name: 'Disputed',
    aliases: ['disputed', 'pov', 'neutrality', 'factual accuracy'],
    category: 'notices',
    language: 'en',
    description:
      'Alerts readers when factual accuracy or neutrality is contested and refers editors to the Discussion tab.',
    exampleSnippet:
      '{{Disputed|section=Timeline|reason=Conflicting primary records cited in talk page discussion.|date=November 2026}}',
    params: [
      {
        key: 'reason',
        label: 'Dispute summary',
        placeholder: 'Describe the contested claims or neutrality concern...',
        defaultValue: 'Factual accuracy or neutrality is under review on the discussion tab.',
      },
      {
        key: 'section',
        label: 'Section (optional)',
        placeholder: 'Timeline',
        defaultValue: '',
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'verify-en',
    name: 'Verify',
    aliases: ['verify', 'fact check', 'verification'],
    category: 'notices',
    language: 'en',
    description:
      'Editorial fact-check callout indicating whether citations and claims have been verified or are pending.',
    exampleSnippet:
      '{{Verify|status=verified|reviewer=Editorial Board|date=November 2026|note=All primary statutory links and citations checked.}}',
    params: [
      {
        key: 'status',
        label: 'Status (verified or pending)',
        placeholder: 'verified',
        defaultValue: 'verified',
      },
      {
        key: 'reviewer',
        label: 'Reviewer',
        placeholder: 'Editorial Board',
        defaultValue: 'Editorial Board',
      },
      {
        key: 'date',
        label: 'Date',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
      {
        key: 'note',
        label: 'Verification note',
        placeholder: 'Sources and citations checked...',
        defaultValue: 'Claims and citations have been checked against primary sources.',
      },
    ],
  },
  {
    id: 'spoiler-en',
    name: 'Spoiler',
    aliases: ['spoiler', 'aviso spoiler'],
    category: 'notices',
    language: 'en',
    description:
      'Standard plot spoiler warning banner before narrative details, quests, or story endings.',
    exampleSnippet: '{{Spoiler|Genshin Impact Archon Quest}}',
    params: [
      {
        key: '1',
        label: 'Work or storyline title (optional)',
        placeholder: 'Story title',
        defaultValue: 'this storyline',
      },
    ],
  },
  {
    id: 'disambiguation-en',
    name: 'Disambiguation',
    aliases: ['disambiguation', 'disambig', 'desambiguacao'],
    category: 'notices',
    language: 'en',
    description:
      'English disambiguation page header listing distinct articles that share an ambiguous term or acronym.',
    exampleSnippet: '{{Disambiguation|WazzimaGiygg}}',
    params: [
      {
        key: '1',
        label: 'Ambiguous term',
        placeholder: 'Term or acronym',
        defaultValue: 'WazzimaGiygg',
      },
    ],
  },
  {
    id: 'main-en',
    name: 'Main',
    aliases: ['main', 'principal'],
    category: 'navigation',
    language: 'en',
    description:
      'Classic Wikipedia hatnote pointing readers to the full main article for a summary section.',
    exampleSnippet: '{{Main|ecossistema-wazzimagiygg|WazzimaGiygg Ecosystem Products}}',
    params: [
      {
        key: '1',
        label: 'Target article slug',
        placeholder: 'ecossistema-wazzimagiygg',
        defaultValue: 'ecossistema-wazzimagiygg',
        required: true,
      },
      {
        key: '2',
        label: 'Display title (optional)',
        placeholder: 'WazzimaGiygg Ecosystem Products',
        defaultValue: 'WazzimaGiygg Ecosystem Products',
      },
    ],
  },
  {
    id: 'see-also-en',
    name: 'See also',
    aliases: ['see also', 'ver tambem'],
    category: 'navigation',
    language: 'en',
    description:
      'Cross-reference navigation hatnote connecting closely related wiki articles.',
    exampleSnippet: '{{See also|dossie-wikipedia-abusos|investigacao-lgpd-marco-civil-wmf-wikipedia}}',
    params: [
      {
        key: '1',
        label: 'First slug',
        placeholder: 'dossie-wikipedia-abusos',
        defaultValue: 'dossie-wikipedia-abusos',
        required: true,
      },
      {
        key: '2',
        label: 'Second slug (optional)',
        placeholder: 'investigacao-lgpd-marco-civil-wmf-wikipedia',
        defaultValue: 'investigacao-lgpd-marco-civil-wmf-wikipedia',
      },
    ],
  },
  {
    id: 'distinguish-en',
    name: 'Distinguish',
    aliases: ['distinguish', 'not to be confused'],
    category: 'navigation',
    language: 'en',
    description:
      'Wikipedia hatnote ("Not to be confused with...") helping readers distinguish similarly named topics.',
    exampleSnippet: '{{Distinguish|notmediawiki|NotMediaWiki Platform}}',
    params: [
      {
        key: '1',
        label: 'Target article slug',
        placeholder: 'ecossistema-wazzimagiygg',
        defaultValue: 'ecossistema-wazzimagiygg',
        required: true,
      },
      {
        key: '2',
        label: 'Display label (optional)',
        placeholder: 'Distinct Topic Title',
        defaultValue: 'WazzimaGiygg Ecosystem Products',
      },
    ],
  },
  {
    id: 'further-en',
    name: 'Further',
    aliases: ['further', 'further information', 'more info'],
    category: 'navigation',
    language: 'en',
    description:
      'Wikipedia hatnote ("Further information: ...") pointing to in-depth background reading.',
    exampleSnippet: '{{Further|markdown-guide|best-practices}}',
    params: [
      {
        key: '1',
        label: 'Primary background slug',
        placeholder: 'markdown-guide',
        defaultValue: 'markdown-guide',
        required: true,
      },
      {
        key: '2',
        label: 'Secondary slug (optional)',
        placeholder: 'best-practices',
        defaultValue: 'best-practices',
      },
    ],
  },
  {
    id: 'redirect-en',
    name: 'Redirect',
    aliases: ['redirect', 'redirect here'],
    category: 'navigation',
    language: 'en',
    description:
      'Wikipedia redirect hatnote ("X redirects here. For other uses, see...") linking alternative targets.',
    exampleSnippet: '{{Redirect|A Verdade|dossie-wikipedia-abusos|Wikipedia Abuses Dossier}}',
    params: [
      {
        key: '1',
        label: 'Redirected term',
        placeholder: 'Alias or shortcut term',
        defaultValue: 'A Verdade',
        required: true,
      },
      {
        key: '2',
        label: 'Other-uses slug',
        placeholder: 'dossie-wikipedia-abusos',
        defaultValue: 'dossie-wikipedia-abusos',
        required: true,
      },
      {
        key: '3',
        label: 'Other-uses label (optional)',
        placeholder: 'Wikipedia Abuses Dossier',
        defaultValue: 'Wikipedia Abuses Dossier',
      },
    ],
  },
  {
    id: 'portal-en',
    name: 'Portal',
    aliases: ['portal', 'related portal'],
    category: 'navigation',
    language: 'en',
    description:
      'Highlighted portal link card directing readers to a curated thematic hub.',
    exampleSnippet:
      '{{Portal|Governance & Compliance|investigacao-lgpd-marco-civil-wmf-wikipedia|description=Legal dossiers, privacy audits, and statutory references.}}',
    params: [
      {
        key: '1',
        label: 'Portal name',
        placeholder: 'Governance & Compliance',
        defaultValue: 'Governance & Compliance',
        required: true,
      },
      {
        key: '2',
        label: 'Portal page slug',
        placeholder: 'investigacao-lgpd-marco-civil-wmf-wikipedia',
        defaultValue: 'investigacao-lgpd-marco-civil-wmf-wikipedia',
      },
      {
        key: 'description',
        label: 'Short portal description',
        placeholder: 'Curated articles and references...',
        defaultValue: 'Explore curated dossiers, guides, and primary documentation.',
      },
    ],
  },
  {
    id: 'quote-en',
    name: 'Quote',
    aliases: ['quote', 'cquote', 'citacao'],
    category: 'navigation',
    language: 'en',
    description:
      'English editorial blockquote box with author and source attribution.',
    exampleSnippet:
      '{{Quote|text=Open knowledge thrives when documentation remains verifiable and independent.|author=WazzimaGiygg Editorial|source=Project Charter}}',
    params: [
      {
        key: 'text',
        label: 'Quoted text',
        placeholder: 'Enter the quotation...',
        defaultValue: 'Open knowledge thrives when documentation remains verifiable and independent.',
        required: true,
      },
      {
        key: 'author',
        label: 'Author',
        placeholder: 'Author name',
        defaultValue: 'WazzimaGiygg Editorial',
      },
      {
        key: 'source',
        label: 'Source / Work (optional)',
        placeholder: 'Book, dossier, or report',
        defaultValue: 'Project Charter',
      },
    ],
  },
  {
    id: 'cite-web-en',
    name: 'Cite web',
    aliases: ['cite web', 'cite', 'web ref'],
    category: 'navigation',
    language: 'en',
    description:
      'Classic Wikipedia {{Cite web}} citation template; expands to an automatic numbered <ref> footnote in the References footer.',
    exampleSnippet:
      '{{Cite web|title=A Verdade Dossier|url=https://wazzimagiygg.com/averdade/|author=WazzimaGiygg Research|publisher=wazzimagiygg.com|date=November 2026}}',
    params: [
      {
        key: 'title',
        label: 'Page or document title',
        placeholder: 'Document title',
        defaultValue: 'A Verdade Dossier',
        required: true,
      },
      {
        key: 'url',
        label: 'URL',
        placeholder: 'https://...',
        defaultValue: 'https://wazzimagiygg.com/averdade/',
      },
      {
        key: 'author',
        label: 'Author (optional)',
        placeholder: 'Author or organization',
        defaultValue: 'WazzimaGiygg Research',
      },
      {
        key: 'publisher',
        label: 'Publisher / Website (optional)',
        placeholder: 'Website name',
        defaultValue: 'wazzimagiygg.com',
      },
      {
        key: 'date',
        label: 'Publication date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'infobox-en',
    name: 'Infobox',
    aliases: ['infobox', 'info', 'ficha'],
    category: 'infobox',
    language: 'en',
    description:
      'English MediaWiki {{Infobox}} template accepting key-value fields to render a structured summary sidebar card.',
    exampleSnippet:
      '{{Infobox|type=project|title=WikiWazzimaGiygg|subtitle=Independent Encyclopedia|Status=Active|Portal=[wazzimagiygg.com](https://wazzimagiygg.com/)}}',
    params: [
      {
        key: 'type',
        label: 'Type (general, project, organization, character, location, item, user)',
        placeholder: 'project',
        defaultValue: 'project',
      },
      {
        key: 'title',
        label: 'Title',
        placeholder: 'Entry title',
        defaultValue: 'Wiki Project',
        required: true,
      },
      {
        key: 'subtitle',
        label: 'Subtitle',
        placeholder: 'Brief classification',
        defaultValue: 'Reference entry',
      },
      {
        key: 'Status',
        label: 'Status',
        placeholder: 'Active',
        defaultValue: 'Active',
      },
      {
        key: 'Portal',
        label: 'Portal / Link',
        placeholder: '[wazzimagiygg.com](https://wazzimagiygg.com/)',
        defaultValue: '[wazzimagiygg.com](https://wazzimagiygg.com/)',
      },
    ],
  },
  // --- Extended Wikipedia & MediaWiki Catalog ---
  {
    id: 'bpv',
    name: 'BLP sources',
    aliases: ['biografia de pessoa viva', 'bpv', 'blp', 'blp sources'],
    category: 'notices',
    language: 'en',
    description:
      'Strict Wikipedia policy banner for biographies of living persons (BLP), requiring independent reliable sources for sensitive claims.',
    exampleSnippet: '{{BLP sources|date=November 2026}}',
    params: [
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'fontes-primarias',
    name: 'Primary sources',
    aliases: ['fontes primarias', 'sem fontes fiaveis', 'primary sources', 'self-published'],
    category: 'notices',
    language: 'en',
    description:
      'Alerts readers that the article relies too heavily on primary, institutional, or self-published sources.',
    exampleSnippet:
      '{{Primary sources|reason=Add independent coverage from press outlets or peer-reviewed journals.|date=November 2026}}',
    params: [
      {
        key: 'reason',
        label: 'Note (optional)',
        placeholder: 'Indicate which secondary sources are needed...',
        defaultValue: 'Requires independent, reliable secondary sources.',
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'vda',
    name: 'Copyvio',
    aliases: ['conteudo suspeito', 'vda', 'copyvio', 'copyright', 'violacao de direitos'],
    category: 'notices',
    language: 'en',
    description:
      'Flags a section or article suspected of copyright infringement (Copyvio) for license review or rewriting.',
    exampleSnippet: '{{Copyvio|source=https://example.org/original-text|reason=Passage copied without editorial adaptation.}}',
    params: [
      {
        key: 'source',
        label: 'Suspected original source',
        placeholder: 'https://...',
        defaultValue: '',
      },
      {
        key: 'reason',
        label: 'Details',
        placeholder: 'Describe the affected passages...',
        defaultValue: 'Preventive copyright and license compatibility check.',
      },
    ],
  },
  {
    id: 'orfao',
    name: 'Orphan',
    aliases: ['orfao', 'pagina orfa', 'orphan', 'dead end', 'sem ligacoes'],
    category: 'notices',
    language: 'en',
    description:
      'Indicates that the article has few or no incoming internal links from other wiki pages.',
    exampleSnippet: '{{Orphan|date=November 2026}}',
    params: [
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'introducao-longa',
    name: 'Lead too long',
    aliases: ['introducao longa', 'lead too long', 'lead missing', 'sem introducao'],
    category: 'notices',
    language: 'en',
    description:
      'Flags that the lead summary is overly long or missing and should follow encyclopedic structure.',
    exampleSnippet: '{{Lead too long|Suggestion: condense into 2 paragraphs and move details into the body.}}',
    params: [
      {
        key: '1',
        label: 'Note (optional)',
        placeholder: 'How to adjust the lead section...',
        defaultValue: 'Summarize key points concisely before the table of contents.',
      },
    ],
  },
  {
    id: 'expandir-secao',
    name: 'Expand section',
    aliases: ['expandir secao', 'expandir', 'expand section', 'empty section', 'secao vazia'],
    category: 'notices',
    language: 'en',
    description:
      'Invites contributors to expand a specific section that is currently empty or incomplete.',
    exampleSnippet: '{{Expand section|section=History|reason=Detail milestones between 2022 and 2026.}}',
    params: [
      {
        key: 'section',
        label: 'Section name',
        placeholder: 'History',
        defaultValue: 'Development',
      },
      {
        key: 'reason',
        label: 'What to add',
        placeholder: 'Topics or sources needed...',
        defaultValue: 'This section is incomplete and can be expanded with reliable sources.',
      },
    ],
  },
  {
    id: 'prosa',
    name: 'Prose',
    aliases: ['prosa', 'em formato de lista', 'prose', 'list to prose'],
    category: 'notices',
    language: 'en',
    description:
      'Recommends converting long bullet lists into continuous encyclopedic prose.',
    exampleSnippet: '{{Prose|section=Timeline}}',
    params: [
      {
        key: 'section',
        label: 'Section (optional)',
        placeholder: 'Timeline',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'divisao',
    name: 'Split',
    aliases: ['divisao', 'dividir', 'split', 'split section'],
    category: 'notices',
    language: 'en',
    description:
      'Proposes splitting an overly long article or standalone section into separate focused entries.',
    exampleSnippet: '{{Split|suggestion=ecossistema-wazzimagiygg|reason=Section is extensive enough for its own dedicated article.}}',
    params: [
      {
        key: 'suggestion',
        label: 'Suggested slug for the new article',
        placeholder: 'new-article',
        defaultValue: '',
      },
      {
        key: 'reason',
        label: 'Rationale',
        placeholder: 'Why split...',
        defaultValue: 'The amount of content justifies splitting this topic into a dedicated page.',
      },
    ],
  },
  {
    id: 'publicidade',
    name: 'Advert',
    aliases: ['publicidade', 'propaganda', 'promocional', 'advert', 'spam', 'peacock'],
    category: 'notices',
    language: 'en',
    description:
      'Classic Wikipedia promotional-tone warning; requests rewriting in neutral, factual language.',
    exampleSnippet: '{{Advert|reason=Remove promotional adjectives and ground facts in independent sources.}}',
    params: [
      {
        key: 'reason',
        label: 'Passages or recommended edits',
        placeholder: 'Describe what needs a neutral tone...',
        defaultValue: 'Rewrite in a neutral encyclopedic tone without promotional phrasing.',
      },
    ],
  },
  {
    id: 'notoriedade',
    name: 'Notability',
    aliases: ['notoriedade', 'sem relevancia', 'relevancia', 'notability'],
    category: 'notices',
    language: 'en',
    description:
      'Questions whether the subject meets minimum encyclopedic notability guidelines due to limited independent coverage.',
    exampleSnippet: '{{Notability|reason=Requires significant coverage in reliable third-party sources.}}',
    params: [
      {
        key: 'reason',
        label: 'Note (optional)',
        placeholder: 'Pending criteria...',
        defaultValue: 'The topic may not meet notability guidelines without independent sources.',
      },
    ],
  },
  {
    id: 'globalizar',
    name: 'Globalize',
    aliases: ['globalizar', 'lusofonia', 'visao regional', 'globalize'],
    category: 'notices',
    language: 'en',
    description:
      'Indicates that the examples and scope of the article are limited to a single country or region.',
    exampleSnippet: '{{Globalize|region=Brazil|reason=Include perspectives from other countries and international contexts.}}',
    params: [
      {
        key: 'region',
        label: 'Current predominant region',
        placeholder: 'Brazil / US / Europe',
        defaultValue: 'a single country',
      },
      {
        key: 'reason',
        label: 'Suggestion (optional)',
        placeholder: 'How to broaden scope...',
        defaultValue: 'Broaden coverage to represent a global view of the subject.',
      },
    ],
  },
  {
    id: 'ficcao',
    name: 'In-universe',
    aliases: ['ficcao', 'enredo', 'in-universe', 'plot'],
    category: 'notices',
    language: 'en',
    description:
      'Warns that a fictional work is described as if it were real without real-world editorial context.',
    exampleSnippet: '{{In-universe|work=Story Universe}}',
    params: [
      {
        key: 'work',
        label: 'Work or franchise (optional)',
        placeholder: 'Title of the work',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'pesquisa-inedita',
    name: 'Original research',
    aliases: ['pesquisa inedita', 'original research', 'or', 'sintese'],
    category: 'notices',
    language: 'en',
    description:
      'Flags interpretive claims or unpublished conclusions not previously supported by external sources.',
    exampleSnippet: '{{Original research|section=Analysis|date=November 2026}}',
    params: [
      {
        key: 'section',
        label: 'Section (optional)',
        placeholder: 'Analysis',
        defaultValue: '',
      },
      {
        key: 'date',
        label: 'Date (optional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'curiosidades',
    name: 'Trivia',
    aliases: ['curiosidades', 'trivia'],
    category: 'notices',
    language: 'en',
    description:
      'Suggests reorganizing standalone trivia sections by integrating relevant facts into thematic sections.',
    exampleSnippet: '{{Trivia|reason=Incorporate relevant items into the History and Reception sections.}}',
    params: [
      {
        key: 'reason',
        label: 'Guidance (optional)',
        placeholder: 'How to reorganize...',
        defaultValue: 'Relevant facts should be integrated into the main body of the article.',
      },
    ],
  },
  {
    id: 'aviso-medico',
    name: 'Medical disclaimer',
    aliases: ['aviso medico', 'medical', 'aviso legal', 'legal disclaimer'],
    category: 'notices',
    language: 'en',
    description:
      'Classic Wikipedia disclaimer banner for informational articles covering health, medicine, or law.',
    exampleSnippet: '{{Medical disclaimer|type=medical}}',
    params: [
      {
        key: 'type',
        label: 'Type (medical or legal)',
        placeholder: 'medical',
        defaultValue: 'medical',
      },
    ],
  },
  {
    id: 'humor',
    name: 'Humour',
    aliases: ['humor', 'piada', 'satira', 'humour'],
    category: 'notices',
    language: 'en',
    description:
      'Identifies humorous essays or community satire that must not be mistaken for official policy.',
    exampleSnippet: '{{Humour|Lighthearted community essay on editing best practices.}}',
    params: [
      {
        key: '1',
        label: 'Context note (optional)',
        placeholder: 'Essay description...',
        defaultValue: 'This page contains community humor and does not represent an official policy.',
      },
    ],
  },
  {
    id: 'arquivo-discussao',
    name: 'Talk archive',
    aliases: ['arquivo', 'talk archive', 'historico preservado', 'archive'],
    category: 'notices',
    language: 'en',
    description:
      'Indicates that the page or subpage preserves closed discussions for historical reference.',
    exampleSnippet: '{{Talk archive|period=2025–2026}}',
    params: [
      {
        key: 'period',
        label: 'Archived period (optional)',
        placeholder: '2025–2026',
        defaultValue: 'Previous cycle',
      },
    ],
  },
  {
    id: 'spoiler-fim',
    name: 'End spoiler',
    aliases: ['fim de spoiler', 'end spoiler', 'spoiler end'],
    category: 'notices',
    language: 'en',
    description:
      'Marks the end of a plot spoiler section opened by {{Spoiler}}.',
    exampleSnippet: '{{End spoiler}}',
    params: [],
  },
  {
    id: 'userbox',
    name: 'Userbox',
    aliases: ['userbox', 'caixa de usuario', 'babel'],
    category: 'notices',
    language: 'en',
    description:
      'Classic personal profile or language proficiency box ({{Userbox}} / {{Babel}}) used on user pages.',
    exampleSnippet:
      '{{Userbox|code=EN-N|title=Language|text=This contributor is a native English speaker.}}',
    params: [
      {
        key: 'code',
        label: 'Code / Badge (e.g., EN-N, PT-3, DEV)',
        placeholder: 'EN-N',
        defaultValue: 'EN-N',
      },
      {
        key: 'title',
        label: 'Category',
        placeholder: 'Language / Interest',
        defaultValue: 'Language',
      },
      {
        key: 'text',
        label: 'Profile description',
        placeholder: 'This contributor...',
        defaultValue: 'This contributor edits in English.',
        required: true,
      },
    ],
  },
  {
    id: 'navbox',
    name: 'Navbox',
    aliases: ['caixa de navegacao', 'navbox', 'navegacao'],
    category: 'navigation',
    language: 'en',
    description:
      'Horizontal Navbox-style navigation bar linking a collection or series of related articles.',
    exampleSnippet:
      '{{Navbox|title=WikiMaker Documentation Series|1=start|2=markdown-guide|3=ecossistema-wazzimagiygg}}',
    params: [
      {
        key: 'title',
        label: 'Navbox title',
        placeholder: 'Article series',
        defaultValue: 'Related articles',
        required: true,
      },
      {
        key: '1',
        label: 'First slug',
        placeholder: 'start',
        defaultValue: 'start',
      },
      {
        key: '2',
        label: 'Second slug',
        placeholder: 'markdown-guide',
        defaultValue: 'markdown-guide',
      },
      {
        key: '3',
        label: 'Third slug (optional)',
        placeholder: 'ecossistema-wazzimagiygg',
        defaultValue: 'ecossistema-wazzimagiygg',
      },
    ],
  },
  {
    id: 'artigo-em-serie',
    name: 'Part of a series',
    aliases: ['artigo em serie', 'serie', 'part of a series'],
    category: 'navigation',
    language: 'en',
    description:
      'Indicates that an entry belongs to a thematic series with links to the series index, previous, and next pages.',
    exampleSnippet:
      '{{Part of a series|series=WikiMaker Documentation|index=markdown-guide|previous=start|next=best-practices}}',
    params: [
      {
        key: 'series',
        label: 'Series name',
        placeholder: 'Thematic series',
        defaultValue: 'Editorial Guides',
        required: true,
      },
      {
        key: 'index',
        label: 'Series index slug (optional)',
        placeholder: 'markdown-guide',
        defaultValue: 'markdown-guide',
      },
      {
        key: 'previous',
        label: 'Previous slug (optional)',
        placeholder: 'start',
        defaultValue: 'start',
      },
      {
        key: 'next',
        label: 'Next slug (optional)',
        placeholder: 'best-practices',
        defaultValue: 'best-practices',
      },
    ],
  },
  {
    id: 'lista-dinamica',
    name: 'Dynamic list',
    aliases: ['lista dinamica', 'dynamic list', 'lista incompleta'],
    category: 'navigation',
    language: 'en',
    description:
      'Notice for open encyclopedic lists that may never be complete and welcome new referenced entries.',
    exampleSnippet: '{{Dynamic list|topic=wiki extensions and templates}}',
    params: [
      {
        key: 'topic',
        label: 'List subject (optional)',
        placeholder: 'documented items',
        defaultValue: 'documented entries',
      },
    ],
  },
  {
    id: 'documentacao',
    name: 'Documentation',
    aliases: ['documentacao', 'documentation', 'doc'],
    category: 'navigation',
    language: 'en',
    description:
      'Standard technical documentation header for Template:* pages and usage guides.',
    exampleSnippet:
      '{{Documentation|text=Review the supported parameters and examples before transcluding into main articles.}}',
    params: [
      {
        key: 'text',
        label: 'Documentation note',
        placeholder: 'Usage instructions...',
        defaultValue: 'This box displays official parameter documentation and transclusion examples.',
      },
    ],
  },
  {
    id: 'indice-toc',
    name: 'Compact TOC',
    aliases: ['indice', 'compact toc', 'tocright', 'toc'],
    category: 'navigation',
    language: 'en',
    description:
      'Indicates structured section navigation or alphabetical catalog navigation on the page.',
    exampleSnippet: '{{Compact TOC|Use the article headings or the sidebar to jump between sections.}}',
    params: [
      {
        key: '1',
        label: 'Navigation note (optional)',
        placeholder: 'Instruction...',
        defaultValue: 'Browse sections using the automatic sidebar table of contents.',
      },
    ],
  },
  {
    id: 'ancora',
    name: 'Anchor',
    aliases: ['ancora', 'anchor'],
    category: 'navigation',
    language: 'en',
    description:
      'Inserts an invisible HTML anchor marker for direct section links (#identifier).',
    exampleSnippet: '{{Anchor|special-section}}',
    params: [
      {
        key: '1',
        label: 'Anchor ID',
        placeholder: 'section-identifier',
        defaultValue: 'reference-section',
        required: true,
      },
    ],
  },
  {
    id: 'citar-periodico',
    name: 'Cite journal',
    aliases: ['citar periodico', 'citar revista', 'citar tese', 'cite thesis', 'cite journal'],
    category: 'navigation',
    language: 'en',
    description:
      'Academic citation for journal articles, periodicals, or theses with volume, DOI, and year (<ref>).',
    exampleSnippet:
      '{{Cite journal|title=Open Governance in Digital Encyclopedias|author=Costa, R.|journal=Open Science Journal|volume=12|year=2025|doi=10.1000/example}}',
    params: [
      {
        key: 'title',
        label: 'Study or article title',
        placeholder: 'Scientific title',
        defaultValue: 'Study on Open Knowledge',
        required: true,
      },
      {
        key: 'author',
        label: 'Author(s)',
        placeholder: 'Last, F.',
        defaultValue: 'Costa, R.',
      },
      {
        key: 'journal',
        label: 'Journal / Institution',
        placeholder: 'Journal or university name',
        defaultValue: 'Open Science Journal',
      },
      {
        key: 'year',
        label: 'Year',
        placeholder: '2026',
        defaultValue: '2026',
      },
      {
        key: 'doi',
        label: 'DOI (optional)',
        placeholder: '10.1000/...',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'citar-video',
    name: 'Cite AV media',
    aliases: ['citar video', 'citar youtube', 'cite av media', 'cite video'],
    category: 'navigation',
    language: 'en',
    description:
      'Bibliographic citation for videos, documentaries, or recorded talks; generates a <ref> footnote.',
    exampleSnippet:
      '{{Cite AV media|title=WazzimaGiygg Documentary|author=Official Channel|year=2026|url=https://wazzimagiygg.com/}}',
    params: [
      {
        key: 'title',
        label: 'Video or documentary title',
        placeholder: 'Media title',
        defaultValue: 'Project Presentation',
        required: true,
      },
      {
        key: 'author',
        label: 'Channel / Director',
        placeholder: 'Author or channel',
        defaultValue: 'WazzimaGiygg',
      },
      {
        key: 'year',
        label: 'Year / Date',
        placeholder: '2026',
        defaultValue: '2026',
      },
      {
        key: 'url',
        label: 'URL (optional)',
        placeholder: 'https://...',
        defaultValue: 'https://wazzimagiygg.com/',
      },
    ],
  },
  {
    id: 'citar-enciclopedia',
    name: 'Cite encyclopedia',
    aliases: ['citar enciclopedia', 'cite encyclopedia'],
    category: 'navigation',
    language: 'en',
    description:
      'Citation for an entry in an encyclopedia, dictionary, or collective reference work (<ref>).',
    exampleSnippet:
      '{{Cite encyclopedia|entry=Wiki|encyclopedia=Open Encyclopedia|publisher=Open Press|year=2025}}',
    params: [
      {
        key: 'entry',
        label: 'Entry title',
        placeholder: 'Cited entry',
        defaultValue: 'Wiki',
        required: true,
      },
      {
        key: 'encyclopedia',
        label: 'Encyclopedia / Dictionary',
        placeholder: 'Work title',
        defaultValue: 'Reference Encyclopedia',
      },
      {
        key: 'publisher',
        label: 'Publisher (optional)',
        placeholder: 'Publisher',
        defaultValue: '',
      },
      {
        key: 'year',
        label: 'Year (optional)',
        placeholder: '2026',
        defaultValue: '2026',
      },
    ],
  },
  {
    id: 'quote-box',
    name: 'Quote box',
    aliases: ['citacoes', 'wikiquote', 'quote box'],
    category: 'navigation',
    language: 'en',
    description:
      'Highlighted quotation box with context title, author, and cited work.',
    exampleSnippet:
      '{{Quote box|title=Historical Statement|text=Editorial transparency is the foundation of public trust.|author=Editorial Board}}',
    params: [
      {
        key: 'title',
        label: 'Box title',
        placeholder: 'Statement',
        defaultValue: 'Featured Quote',
      },
      {
        key: 'text',
        label: 'Quoted text',
        placeholder: 'Excerpt...',
        defaultValue: 'Editorial transparency is the foundation of public trust.',
        required: true,
      },
      {
        key: 'author',
        label: 'Author',
        placeholder: 'Author name',
        defaultValue: 'Editorial Board',
      },
    ],
  },
  {
    id: 'tl-etiqueta',
    name: 'Tl',
    aliases: ['etiqueta', 'tl', 'predef'],
    category: 'navigation',
    language: 'en',
    description:
      'Displays inline template syntax formatted as code (`{{Notice}}`), identical to Wikipedia {{Tl}}.',
    exampleSnippet: '{{Tl|Notice|type=warning}}',
    params: [
      {
        key: '1',
        label: 'Template name',
        placeholder: 'Notice',
        defaultValue: 'Notice',
        required: true,
      },
      {
        key: '2',
        label: 'Parameter example (optional)',
        placeholder: 'type=warning',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'tecla-kbd',
    name: 'Key press',
    aliases: ['tecla', 'kbd', 'key press'],
    category: 'navigation',
    language: 'en',
    description:
      'Formats inline Wikipedia-style key combinations (e.g., `Ctrl` + `S` or `Enter`).',
    exampleSnippet: '{{Key press|Ctrl|S}}',
    params: [
      {
        key: '1',
        label: 'First key',
        placeholder: 'Ctrl',
        defaultValue: 'Ctrl',
        required: true,
      },
      {
        key: '2',
        label: 'Second key (optional)',
        placeholder: 'S',
        defaultValue: 'S',
      },
    ],
  },
  {
    id: 'conversao',
    name: 'Convert',
    aliases: ['conversao', 'converter', 'convert'],
    category: 'navigation',
    language: 'en',
    description:
      'Converts common units inline (km/mi, m/ft, kg/lb, °C/°F) just like Wikipedia {{Convert}}.',
    exampleSnippet: '{{Convert|100|km|mi}}',
    params: [
      {
        key: '1',
        label: 'Numeric value',
        placeholder: '100',
        defaultValue: '100',
        required: true,
      },
      {
        key: '2',
        label: 'Source unit (km, m, kg, C, mi, ft, lb, F)',
        placeholder: 'km',
        defaultValue: 'km',
        required: true,
      },
      {
        key: '3',
        label: 'Target unit (optional)',
        placeholder: 'mi',
        defaultValue: 'mi',
      },
    ],
  },
  {
    id: 'moeda',
    name: 'Currency',
    aliases: ['moeda', 'brl', 'usd', 'eur', 'currency'],
    category: 'navigation',
    language: 'en',
    description:
      'Formats standardized currency values inline (`$1,500`, `R$ 1,500`, `€100`).',
    exampleSnippet: '{{Currency|1500|USD}}',
    params: [
      {
        key: '1',
        label: 'Amount',
        placeholder: '1500',
        defaultValue: '1500',
        required: true,
      },
      {
        key: '2',
        label: 'Currency code (USD, EUR, GBP, BRL)',
        placeholder: 'USD',
        defaultValue: 'USD',
      },
    ],
  },
  {
    id: 'coordenadas',
    name: 'Coord',
    aliases: ['coordenadas', 'coord', 'coordinates'],
    category: 'navigation',
    language: 'en',
    description:
      'Formats inline latitude and longitude in Wikipedia {{Coord}} style with an external map link.',
    exampleSnippet: '{{Coord|-23.5505|-46.6333}}',
    params: [
      {
        key: '1',
        label: 'Latitude',
        placeholder: '-23.5505',
        defaultValue: '-23.5505',
        required: true,
      },
      {
        key: '2',
        label: 'Longitude',
        placeholder: '-46.6333',
        defaultValue: '-46.6333',
        required: true,
      },
    ],
  },
  {
    id: 'idade',
    name: 'Birth date and age',
    aliases: ['idade', 'age', 'data de nascimento', 'birth date and age'],
    category: 'navigation',
    language: 'en',
    description:
      'Formats a birth date and automatically calculates current age (`1990-05-15 (age 36)`).',
    exampleSnippet: '{{Birth date and age|1990|5|15}}',
    params: [
      {
        key: '1',
        label: 'Year',
        placeholder: '1990',
        defaultValue: '1990',
        required: true,
      },
      {
        key: '2',
        label: 'Month (1-12)',
        placeholder: '5',
        defaultValue: '5',
        required: true,
      },
      {
        key: '3',
        label: 'Day (1-31)',
        placeholder: '15',
        defaultValue: '15',
        required: true,
      },
    ],
  },
  {
    id: 'amostra-cor',
    name: 'Color sample',
    aliases: ['cor', 'color sample', 'swatch'],
    category: 'navigation',
    language: 'en',
    description:
      'Displays a color swatch reference and hex code (`🎨 #2563EB`), useful in visual identity tables.',
    exampleSnippet: '{{Color sample|#2563EB|Editorial Blue}}',
    params: [
      {
        key: '1',
        label: 'Hex code',
        placeholder: '#2563EB',
        defaultValue: '#2563EB',
        required: true,
      },
      {
        key: '2',
        label: 'Color name (optional)',
        placeholder: 'Editorial Blue',
        defaultValue: 'Editorial Blue',
      },
    ],
  },
  {
    id: 'identificador-bibliografico',
    name: 'DOI',
    aliases: ['isbn', 'doi', 'issn', 'arxiv'],
    category: 'navigation',
    language: 'en',
    description:
      'Formats bibliographic identifiers (ISBN, DOI, ISSN, arXiv) with a direct lookup link.',
    exampleSnippet: '{{DOI|10.1038/nature12373}}',
    params: [
      {
        key: 'type',
        label: 'Type (DOI, ISBN, ISSN, arXiv)',
        placeholder: 'DOI',
        defaultValue: 'DOI',
      },
      {
        key: '1',
        label: 'Identifier',
        placeholder: '10.1038/nature12373',
        defaultValue: '10.1038/nature12373',
        required: true,
      },
    ],
  },
  {
    id: 'sim-nao-tabela',
    name: 'Yes',
    aliases: ['sim', 'yes', 'nao', 'no', 'parcialmente', 'maybe', 'check', 'cross'],
    category: 'navigation',
    language: 'en',
    description:
      'Inline visual status markers (`✅ Yes`, `❌ No`, `⚠️ Partial`) commonly used in Wikipedia comparison tables (also accepts {{No}} and {{Maybe}}).',
    exampleSnippet: '{{Yes}} · {{No}} · {{Maybe}}',
    params: [
      {
        key: '1',
        label: 'Custom label (optional)',
        placeholder: 'Yes / Supported',
        defaultValue: 'Yes',
      },
    ],
  },
  // --- Additional Wikipedia Infobox Presets ---
  {
    id: 'info-filme',
    name: 'Infobox film',
    aliases: ['info/filme', 'info/serie', 'infobox film', 'infobox television'],
    category: 'infobox',
    language: 'en',
    description:
      'Wikipedia-style film or series infobox ({{Infobox film}} / {{Info/Filme}}) with director, genre, and runtime.',
    exampleSnippet:
      '{{Infobox film|title=Sample Film|Director=Sample Director|Genre=Documentary|Runtime=110 min|Year=2026}}',
    params: [
      {
        key: 'title',
        label: 'Film or series title',
        placeholder: 'Official title',
        defaultValue: 'Sample Documentary',
        required: true,
      },
      {
        key: 'Director',
        label: 'Director',
        placeholder: 'Director name',
        defaultValue: 'Independent Director',
      },
      {
        key: 'Genre',
        label: 'Genre',
        placeholder: 'Documentary, Drama...',
        defaultValue: 'Documentary',
      },
      {
        key: 'Runtime',
        label: 'Runtime',
        placeholder: '95 min',
        defaultValue: '95 min',
      },
      {
        key: 'Year',
        label: 'Release year',
        placeholder: '2026',
        defaultValue: '2026',
      },
    ],
  },
  {
    id: 'info-livro',
    name: 'Infobox book',
    aliases: ['info/livro', 'info/obra', 'infobox book'],
    category: 'infobox',
    language: 'en',
    description:
      'Wikipedia literary infobox ({{Infobox book}} / {{Info/Livro}}) with author, language, publisher, and page count.',
    exampleSnippet:
      '{{Infobox book|title=Sample Book|Author=Sample Author|Language=English|Publisher=Open Press|Pages=280|Year=2026}}',
    params: [
      {
        key: 'title',
        label: 'Book title',
        placeholder: 'Work title',
        defaultValue: 'Open Knowledge Handbook',
        required: true,
      },
      {
        key: 'Author',
        label: 'Author',
        placeholder: 'Author name',
        defaultValue: 'Sample Author',
      },
      {
        key: 'Language',
        label: 'Original language',
        placeholder: 'English',
        defaultValue: 'English',
      },
      {
        key: 'Publisher',
        label: 'Publisher',
        placeholder: 'Publisher name',
        defaultValue: 'Open Press',
      },
      {
        key: 'Pages',
        label: 'Pages',
        placeholder: '240',
        defaultValue: '240',
      },
    ],
  },
  {
    id: 'info-musica',
    name: 'Infobox album',
    aliases: ['info/musica', 'info/album', 'infobox album', 'infobox song'],
    category: 'infobox',
    language: 'en',
    description:
      'Wikipedia music infobox ({{Infobox album}} / {{Info/Álbum}}) for albums, singles, and soundtracks.',
    exampleSnippet:
      '{{Infobox album|title=Sample Album|Artist=Sample Band|Released=2026|Genre=Alternative Rock|Label=Independent}}',
    params: [
      {
        key: 'title',
        label: 'Album or song title',
        placeholder: 'Album title',
        defaultValue: 'Official Soundtrack',
        required: true,
      },
      {
        key: 'Artist',
        label: 'Artist / Band',
        placeholder: 'Artist name',
        defaultValue: 'Independent Artist',
      },
      {
        key: 'Genre',
        label: 'Genre',
        placeholder: 'Rock, Electronic, Folk...',
        defaultValue: 'Instrumental',
      },
      {
        key: 'Released',
        label: 'Release date',
        placeholder: '2026',
        defaultValue: '2026',
      },
      {
        key: 'Label',
        label: 'Record label',
        placeholder: 'Independent label',
        defaultValue: 'Independent',
      },
    ],
  },
  {
    id: 'info-personagem',
    name: 'Infobox character',
    aliases: ['info/personagem', 'infobox character'],
    category: 'infobox',
    language: 'en',
    description:
      'Wikipedia fictional character infobox ({{Infobox character}}) with work, creator, species, and affiliation.',
    exampleSnippet:
      '{{Infobox character|title=Sample Character|Work=Sample Series|Creator=Creative Studio|Species=Human|Affiliation=Central Alliance}}',
    params: [
      {
        key: 'title',
        label: 'Character name',
        placeholder: 'Full name',
        defaultValue: 'Sample Character',
        required: true,
      },
      {
        key: 'Work',
        label: 'Work / Universe',
        placeholder: 'Game, book, or series',
        defaultValue: 'Sample Universe',
      },
      {
        key: 'Creator',
        label: 'Creator(s)',
        placeholder: 'Author or studio',
        defaultValue: 'Creative Studio',
      },
      {
        key: 'Affiliation',
        label: 'Affiliation / Faction',
        placeholder: 'Group or team',
        defaultValue: 'Independent',
      },
    ],
  },
  {
    id: 'info-software',
    name: 'Infobox software',
    aliases: ['info/software', 'infobox software', 'info/aplicativo'],
    category: 'infobox',
    language: 'en',
    description:
      'Wikipedia software technical infobox ({{Infobox software}}) with developer, version, language, and license.',
    exampleSnippet:
      '{{Infobox software|title=WikiMaker Engine|Developer=WazzimaGiygg|Version=2.0|Language=TypeScript|License=Open Source}}',
    params: [
      {
        key: 'title',
        label: 'Software name',
        placeholder: 'Application name',
        defaultValue: 'Sample Software',
        required: true,
      },
      {
        key: 'Developer',
        label: 'Developer',
        placeholder: 'Author or organization',
        defaultValue: 'Open Community',
      },
      {
        key: 'Version',
        label: 'Stable release',
        placeholder: '1.0.0',
        defaultValue: '1.0.0',
      },
      {
        key: 'Language',
        label: 'Written in / Stack',
        placeholder: 'TypeScript, Rust, Python...',
        defaultValue: 'TypeScript',
      },
      {
        key: 'License',
        label: 'License',
        placeholder: 'MIT, GPLv3, Apache 2.0...',
        defaultValue: 'MIT',
      },
    ],
  },
  {
    id: 'info-evento',
    name: 'Infobox event',
    aliases: ['info/evento', 'info/acontecimento', 'infobox event'],
    category: 'infobox',
    language: 'en',
    description:
      'Summary infobox for historical events, conferences, and milestones ({{Infobox event}}).',
    exampleSnippet:
      '{{Infobox event|title=Open Conference 2026|Date=November 2026|Location=Online|Participants=Wiki Community|Outcome=Publication of Open Charter}}',
    params: [
      {
        key: 'title',
        label: 'Event name',
        placeholder: 'Event title',
        defaultValue: 'Sample Historical Event',
        required: true,
      },
      {
        key: 'Date',
        label: 'Date or period',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
      {
        key: 'Location',
        label: 'Location',
        placeholder: 'City, Country',
        defaultValue: 'Online / Global',
      },
      {
        key: 'Outcome',
        label: 'Outcome / Impact',
        placeholder: 'Key consequences...',
        defaultValue: 'Documented in public sources',
      },
    ],
  },
  {
    id: 'info-universidade',
    name: 'Infobox university',
    aliases: ['info/universidade', 'info/escola', 'infobox university'],
    category: 'infobox',
    language: 'en',
    description:
      'Wikipedia academic infobox for universities, colleges, and research institutes ({{Infobox university}}).',
    exampleSnippet:
      '{{Infobox university|title=Sample University|Type=Public|Established=1934|Location=International|Students=25,000}}',
    params: [
      {
        key: 'title',
        label: 'Institution name',
        placeholder: 'Full name',
        defaultValue: 'Sample University',
        required: true,
      },
      {
        key: 'Type',
        label: 'Type (Public / Private)',
        placeholder: 'Public',
        defaultValue: 'Public',
      },
      {
        key: 'Established',
        label: 'Year established',
        placeholder: '1934',
        defaultValue: '1934',
      },
      {
        key: 'Location',
        label: 'Location',
        placeholder: 'City, Country',
        defaultValue: 'International',
      },
    ],
  },
  {
    id: 'taxobox',
    name: 'Taxobox',
    aliases: ['info/taxonomia', 'info/especie', 'taxocaixa', 'taxobox'],
    category: 'infobox',
    language: 'en',
    description:
      'Classic Wikipedia Taxobox for scientific classification of species (Kingdom, Phylum, Class, Order, Family, Species).',
    exampleSnippet:
      '{{Taxobox|title=Maned wolf|subtitle=Chrysocyon brachyurus|Kingdom=Animalia|Phylum=Chordata|Class=Mammalia|Family=Canidae|Species=C. brachyurus}}',
    params: [
      {
        key: 'title',
        label: 'Common name',
        placeholder: 'Species name',
        defaultValue: 'Maned wolf',
        required: true,
      },
      {
        key: 'subtitle',
        label: 'Binomial name',
        placeholder: 'Scientific species name',
        defaultValue: 'Chrysocyon brachyurus',
      },
      {
        key: 'Kingdom',
        label: 'Kingdom',
        placeholder: 'Animalia',
        defaultValue: 'Animalia',
      },
      {
        key: 'Class',
        label: 'Class',
        placeholder: 'Mammalia',
        defaultValue: 'Mammalia',
      },
      {
        key: 'Family',
        label: 'Family',
        placeholder: 'Canidae',
        defaultValue: 'Canidae',
      },
    ],
  },
  {
    id: 'chembox',
    name: 'Chembox',
    aliases: ['info/quimica', 'chembox', 'infobox element'],
    category: 'infobox',
    language: 'en',
    description:
      'Wikipedia-style Chembox technical card for chemical elements and compounds (Formula, Molar mass, Melting point).',
    exampleSnippet:
      '{{Chembox|title=Water|subtitle=Dihydrogen monoxide|Formula=H₂O|Molar mass=18.015 g/mol|Melting point=0 °C|Boiling point=100 °C}}',
    params: [
      {
        key: 'title',
        label: 'Substance or element name',
        placeholder: 'Water',
        defaultValue: 'Water',
        required: true,
      },
      {
        key: 'Formula',
        label: 'Chemical formula / Symbol',
        placeholder: 'H₂O',
        defaultValue: 'H₂O',
      },
      {
        key: 'Molar mass',
        label: 'Molar / atomic mass',
        placeholder: '18.015 g/mol',
        defaultValue: '18.015 g/mol',
      },
      {
        key: 'Melting point',
        label: 'Melting point',
        placeholder: '0 °C',
        defaultValue: '0 °C',
      },
    ],
  },
  {
    id: 'info-usuario',
    name: 'Infobox user',
    aliases: ['info/usuario', 'info/colaborador', 'infobox user'],
    category: 'infobox',
    language: 'en',
    description:
      'Profile box for contributor user pages ({{Infobox user}} / {{Info/Usuário}}).',
    exampleSnippet:
      '{{Infobox user|title=Wiki Contributor|Languages=English, Portuguese|Interests=History, Open Source|Status=Active}}',
    params: [
      {
        key: 'title',
        label: 'Contributor name',
        placeholder: 'Your wiki handle',
        defaultValue: 'Wiki Contributor',
        required: true,
      },
      {
        key: 'Languages',
        label: 'Languages',
        placeholder: 'English, Portuguese',
        defaultValue: 'English',
      },
      {
        key: 'Interests',
        label: 'Areas of interest',
        placeholder: 'Technology, History...',
        defaultValue: 'Documentation and Science',
      },
      {
        key: 'Status',
        label: 'Editorial status',
        placeholder: 'Active',
        defaultValue: 'Active',
      },
    ],
  },
  // --- Batch 3: Additional Wikipedia Templates (Notices, Talk, Citations, Utilities & Infoboxes) ---
  {
    id: 'wikificacao',
    name: 'Wikify',
    aliases: ['wikificacao', 'wikificar', 'wikify'],
    category: 'notices',
    language: 'en',
    description:
      'Indicates that the entry needs wiki formatting (sections, bold lead title, and internal links).',
    exampleSnippet: '{{Wikify|reason=Add sections and internal links for key terms.|date=November 2026}}',
    params: [
      { key: 'reason', label: 'Reason', placeholder: 'Add sections and links...', defaultValue: 'Format sections and internal links.' },
      { key: 'date', label: 'Date', placeholder: 'November 2026', defaultValue: 'November 2026' },
    ],
  },
  {
    id: 'contextualizar',
    name: 'Context',
    aliases: ['contextualizar', 'context', 'falta contexto'],
    category: 'notices',
    language: 'en',
    description:
      'Flags that the lead paragraph does not clearly orient a general reader on the topic and field.',
    exampleSnippet: '{{Context|reason=Clarify the historical period and discipline in the introduction.}}',
    params: [
      { key: 'reason', label: 'What needs context', placeholder: 'Clarify field and period...', defaultValue: 'Clarify the scope and subject area in the introduction.' },
    ],
  },
  {
    id: 'revisao-tecnica',
    name: 'Copy edit',
    aliases: ['revisao', 'revisar', 'copyedit', 'fact check'],
    category: 'notices',
    language: 'en',
    description:
      'Requests spelling, grammar, and factual consistency review across the article.',
    exampleSnippet: '{{Copy edit|reason=Verify dates and standardize technical terminology.|date=November 2026}}',
    params: [
      { key: 'reason', label: 'Items to review', placeholder: 'Check dates and style...', defaultValue: 'Grammar copy edit and factual consistency check.' },
      { key: 'date', label: 'Date', placeholder: 'November 2026', defaultValue: 'November 2026' },
    ],
  },
  {
    id: 'mais-fontes',
    name: 'More citations needed',
    aliases: ['mais fontes', 'more citations needed', 'refimprove', 'fontes insuficientes'],
    category: 'notices',
    language: 'en',
    description:
      'Indicates that the article has some references, but still needs additional citations for full verification.',
    exampleSnippet: '{{More citations needed|section=History|date=November 2026}}',
    params: [
      { key: 'section', label: 'Section (optional)', placeholder: 'History', defaultValue: '' },
      { key: 'date', label: 'Date', placeholder: 'November 2026', defaultValue: 'November 2026' },
    ],
  },
  {
    id: 'sem-notas',
    name: 'No footnotes',
    aliases: ['sem notas', 'no footnotes', 'more footnotes', 'sem notas de rodape'],
    category: 'notices',
    language: 'en',
    description:
      'The entry lists general bibliography, but lacks inline footnotes linking specific claims to sources.',
    exampleSnippet: '{{No footnotes|reason=Link body statements to the works listed in the bibliography.}}',
    params: [
      { key: 'reason', label: 'Guidance', placeholder: 'Add inline citations...', defaultValue: 'Insert inline citations (`<ref>`) linking paragraphs to sources.' },
    ],
  },
  {
    id: 'fonte-nao-confiavel',
    name: 'Unreliable source',
    aliases: ['fonte nao confiavel', 'unreliable source', 'fontes duvidosas'],
    category: 'notices',
    language: 'en',
    description:
      'Alerts readers that the article cites personal blogs, forums, or sources lacking editorial review.',
    exampleSnippet: '{{Unreliable source|reason=Replace forum references with journalistic or academic publications.}}',
    params: [
      { key: 'reason', label: 'Details', placeholder: 'Replace unreviewed sources...', defaultValue: 'Replace opinionated sources with independent, reliable references.' },
    ],
  },
  {
    id: 'conflito-de-interesses',
    name: 'COI',
    aliases: ['conflito de interesses', 'coi', 'conflict of interest', 'edicao remunerada'],
    category: 'notices',
    language: 'en',
    description:
      'Indicates a possible personal, institutional, or commercial connection between an editor and the article subject.',
    exampleSnippet: '{{COI|reason=Drafted by an official representative; requires independent review.}}',
    params: [
      { key: 'reason', label: 'Note', placeholder: 'Reason for flagging...', defaultValue: 'Possible conflict of interest; impartial third-party review recommended.' },
    ],
  },
  {
    id: 'contraditorio',
    name: 'Contradict',
    aliases: ['contraditorio', 'contradict', 'inconsistente'],
    category: 'notices',
    language: 'en',
    description:
      'Flags internal contradictions between sections or discrepancies with data in related entries.',
    exampleSnippet: '{{Contradict|reason=The date in the infobox differs from the lead paragraph.}}',
    params: [
      { key: 'reason', label: 'Identified contradiction', placeholder: 'Describe the discrepancy...', defaultValue: 'Conflicting statements exist across sections and need reconciliation.' },
    ],
  },
  {
    id: 'confuso',
    name: 'Confusing',
    aliases: ['confuso', 'confusing', 'incompreensivel'],
    category: 'notices',
    language: 'en',
    description:
      'Warns that the current wording is unclear or fragmented, making it difficult for readers to follow.',
    exampleSnippet: '{{Confusing|section=Methodology|reason=Rewrite paragraphs using clear, well-defined terms.}}',
    params: [
      { key: 'section', label: 'Section (optional)', placeholder: 'Methodology', defaultValue: '' },
      { key: 'reason', label: 'Suggested improvement', placeholder: 'Clarify jargon...', defaultValue: 'Rewrite with clearer prose and logical structure.' },
    ],
  },
  {
    id: 'tom-ensaistico',
    name: 'Essay-like',
    aliases: ['tom ensaistico', 'ensaio', 'essay like', 'opinativo'],
    category: 'notices',
    language: 'en',
    description:
      'Flags text written like a personal essay or opinion piece rather than an encyclopedic article.',
    exampleSnippet: '{{Essay-like|reason=Remove subjective phrasing and present only verifiable facts.}}',
    params: [
      { key: 'reason', label: 'Required edits', placeholder: 'Adopt neutral tone...', defaultValue: 'Replace opinionated language with objective, sourced description.' },
    ],
  },
  {
    id: 'como-fazer',
    name: 'How-to',
    aliases: ['como fazer', 'howto', 'manual', 'guia passo a passo'],
    category: 'notices',
    language: 'en',
    description:
      'Indicates that the entry is written as a step-by-step tutorial rather than descriptive encyclopedic text.',
    exampleSnippet: '{{How-to|reason=Convert imperative instructions into a conceptual overview of the process.}}',
    params: [
      { key: 'reason', label: 'Guidance', placeholder: 'Avoid step-by-step instructions...', defaultValue: 'Summarize how the subject works encyclopedically without imperative manuals.' },
    ],
  },
  {
    id: 'exemplos-excessivos',
    name: 'Excessive examples',
    aliases: ['exemplos excessivos', 'excessive examples', 'muitos exemplos'],
    category: 'notices',
    language: 'en',
    description:
      'Warns that a section accumulates redundant examples without clear editorial selection criteria.',
    exampleSnippet: '{{Excessive examples|section=Applications|reason=Keep only the most historically notable examples.}}',
    params: [
      { key: 'section', label: 'Section (optional)', placeholder: 'Applications', defaultValue: '' },
      { key: 'reason', label: 'Selection criteria', placeholder: 'Trim list...', defaultValue: 'Select only representative examples with documented notability.' },
    ],
  },
  {
    id: 'traducao-automatica',
    name: 'Rough translation',
    aliases: ['traducao automatica', 'rough translation', 'traducao de maquina'],
    category: 'notices',
    language: 'en',
    description:
      'Marks an article translated literally or mechanically from another language that needs native copy editing.',
    exampleSnippet: '{{Rough translation|language=Portuguese|reason=Fix idiomatic expressions and phrasing.}}',
    params: [
      { key: 'language', label: 'Source language', placeholder: 'Portuguese', defaultValue: 'Portuguese' },
      { key: 'reason', label: 'Details', placeholder: 'Review fluency...', defaultValue: 'Review syntax, technical terms, and false friends.' },
    ],
  },
  {
    id: 'especialista',
    name: 'Expert needed',
    aliases: ['especialista', 'expert needed', 'perito', 'revisao especializada'],
    category: 'notices',
    language: 'en',
    description:
      'Requests review from a contributor familiar with the technical or scientific discipline of the topic.',
    exampleSnippet: '{{Expert needed|area=Theoretical Physics|reason=Verify mathematical notation and formal definitions.}}',
    params: [
      { key: 'area', label: 'Subject area', placeholder: 'Theoretical Physics', defaultValue: 'subject area' },
      { key: 'reason', label: 'What to verify', placeholder: 'Validate technical terms...', defaultValue: 'Review conceptual accuracy and specialized terminology.' },
    ],
  },
  {
    id: 'sem-saida',
    name: 'Dead end',
    aliases: ['sem saida', 'dead end', 'beco sem saida', 'sem ligacoes'],
    category: 'notices',
    language: 'en',
    description:
      'Indicates that the entry has few or no outgoing internal links connecting it to other wiki articles.',
    exampleSnippet: '{{Dead end|date=November 2026}}',
    params: [
      { key: 'date', label: 'Date', placeholder: 'November 2026', defaultValue: 'November 2026' },
    ],
  },
  {
    id: 'sem-categorias',
    name: 'Uncategorized',
    aliases: ['sem categorias', 'uncategorized', 'sem categoria', 'categorizar'],
    category: 'notices',
    language: 'en',
    description:
      'Flags that the article has not yet been assigned appropriate thematic categories or tags.',
    exampleSnippet: '{{Uncategorized|suggestion=Science and Technology}}',
    params: [
      { key: 'suggestion', label: 'Suggested category (optional)', placeholder: 'Science', defaultValue: '' },
    ],
  },
  {
    id: 'sem-imagem',
    name: 'Image requested',
    aliases: ['sem imagem', 'image requested', 'falta imagem', 'foto'],
    category: 'notices',
    language: 'en',
    description:
      'Requests an openly licensed photograph, diagram, map, or illustration to enrich the entry.',
    exampleSnippet: '{{Image requested|topic=Illustrative diagram of the system architecture}}',
    params: [
      { key: 'topic', label: 'Requested image description', placeholder: 'Photo or diagram...', defaultValue: 'Relevant photograph or explanatory diagram for the topic.' },
    ],
  },
  {
    id: 'falta-infobox',
    name: 'New infobox',
    aliases: ['falta infobox', 'new infobox', 'sem info'],
    category: 'notices',
    language: 'en',
    description:
      'Suggests adding a structured infobox (`{{Infobox ...}}`) at the top of the article to summarize key facts.',
    exampleSnippet: '{{New infobox|model=Infobox person}}',
    params: [
      { key: 'model', label: 'Suggested template', placeholder: 'Infobox person', defaultValue: 'Infobox' },
    ],
  },
  {
    id: 'renomear-pagina',
    name: 'Requested move',
    aliases: ['renomear', 'mover', 'requested move', 'mudar titulo'],
    category: 'notices',
    language: 'en',
    description:
      'Proposes renaming the article to a more accurate, common, or standardized title.',
    exampleSnippet: '{{Requested move|suggestion=Standardized New Title|reason=Follow common English naming conventions.}}',
    params: [
      { key: 'suggestion', label: 'Proposed new title', placeholder: 'New title...', defaultValue: 'Standardized title' },
      { key: 'reason', label: 'Rationale', placeholder: 'Common usage...', defaultValue: 'Alignment with naming conventions.' },
    ],
  },
  {
    id: 'introducao-curta',
    name: 'Lead too short',
    aliases: ['introducao curta', 'lead too short', 'resumo curto'],
    category: 'notices',
    language: 'en',
    description:
      'Warns that the lead paragraph is overly brief and does not summarize the main sections of the entry.',
    exampleSnippet: '{{Lead too short|reason=Expand the introduction to summarize context, history, and significance.}}',
    params: [
      { key: 'reason', label: 'Guidance', placeholder: 'Expand summary...', defaultValue: 'Summarize the main topics of the article in the opening lead.' },
    ],
  },
  {
    id: 'artigo-bom',
    name: 'Good article',
    aliases: ['artigo bom', 'good article', 'bom artigo'],
    category: 'notices',
    language: 'en',
    description:
      'Editorial badge certifying that the article meets quality, clarity, and verifiability standards.',
    exampleSnippet: '{{Good article|date=November 2026}}',
    params: [
      { key: 'date', label: 'Recognition date', placeholder: 'November 2026', defaultValue: 'November 2026' },
    ],
  },
  {
    id: 'lista-destacada',
    name: 'Featured list',
    aliases: ['lista destacada', 'featured list'],
    category: 'notices',
    language: 'en',
    description:
      'Editorial badge awarded to complete, well-structured, and thoroughly sourced lists.',
    exampleSnippet: '{{Featured list|date=November 2026}}',
    params: [
      { key: 'date', label: 'Date', placeholder: 'November 2026', defaultValue: 'November 2026' },
    ],
  },
  {
    id: 'aviso-legal',
    name: 'Legal disclaimer',
    aliases: ['aviso legal', 'legal disclaimer', 'aviso juridico'],
    category: 'notices',
    language: 'en',
    description:
      'Informational notice clarifying that articles on law or legislation do not constitute professional legal advice.',
    exampleSnippet: '{{Legal disclaimer}}',
    params: [],
  },
  {
    id: 'conteudo-sensivel',
    name: 'Content warning',
    aliases: ['conteudo sensivel', 'content warning', 'tema sensivel'],
    category: 'notices',
    language: 'en',
    description:
      'Neutral editorial notice informing readers that the entry documents sensitive historical or social subjects.',
    exampleSnippet: '{{Content warning|topic=Historical accounts of conflict and humanitarian impact}}',
    params: [
      { key: 'topic', label: 'Neutral description', placeholder: 'Subject covered...', defaultValue: 'This page covers sensitive subjects from a strictly documentary perspective.' },
    ],
  },
  {
    id: 'discussao-encerrada',
    name: 'Closed',
    aliases: ['discussao encerrada', 'closed', 'consenso encerrado', 'arquivado'],
    category: 'notices',
    language: 'en',
    description:
      'Records the formal closure and consensus reached in a talk page discussion.',
    exampleSnippet: '{{Closed|outcome=Proposal approved by editorial consensus.|responsible=Admin}}',
    params: [
      { key: 'outcome', label: 'Consensus summary', placeholder: 'Decision reached...', defaultValue: 'Consensus recorded; discussion closed to further edits.' },
      { key: 'responsible', label: 'Closed by', placeholder: 'Moderator', defaultValue: 'Moderation' },
    ],
  },
  // --- Talk, Voting, Hatnotes, Citations & Inline Utilities ---
  {
    id: 'ping-usuario',
    name: 'Ping',
    aliases: ['ping', 'responder', 'mention', 'notificar'],
    category: 'navigation',
    language: 'en',
    description:
      'Visually mentions and notifies a contributor in talk page replies (`@User`).',
    exampleSnippet: '{{Ping|Sample Editor}}',
    params: [
      { key: '1', label: 'Username', placeholder: 'Sample Editor', defaultValue: 'Collaborator', required: true },
    ],
  },
  {
    id: 'nao-assinou',
    name: 'Unsigned',
    aliases: ['nao assinou', 'unsigned', 'sem assinatura'],
    category: 'navigation',
    language: 'en',
    description:
      'Attributes authorship and timestamp to an unsigned comment on a talk page.',
    exampleSnippet: '{{Unsigned|Sample User|November 26, 2026}}',
    params: [
      { key: '1', label: 'Comment author', placeholder: 'User', defaultValue: 'Collaborator', required: true },
      { key: '2', label: 'Date/time (optional)', placeholder: 'November 26, 2026', defaultValue: '' },
    ],
  },
  {
    id: 'voto-apoio',
    name: 'Support',
    aliases: ['apoio', 'support', 'concordo'],
    category: 'navigation',
    language: 'en',
    description: 'Standard support vote marker in discussions and consensus reviews.',
    exampleSnippet: '{{Support}} I agree with the proposed merge.',
    params: [
      { key: '1', label: 'Custom label (optional)', placeholder: 'Support', defaultValue: '' },
    ],
  },
  {
    id: 'voto-discordo',
    name: 'Oppose',
    aliases: ['discordo', 'oppose', 'contra'],
    category: 'navigation',
    language: 'en',
    description: 'Standard oppose vote marker in discussions and consensus reviews.',
    exampleSnippet: '{{Oppose}} Both topics have enough independent sources to stand alone.',
    params: [
      { key: '1', label: 'Custom label (optional)', placeholder: 'Oppose', defaultValue: '' },
    ],
  },
  {
    id: 'voto-neutro',
    name: 'Neutral',
    aliases: ['neutro', 'neutral', 'comentario'],
    category: 'navigation',
    language: 'en',
    description: 'Neutral or analytical comment marker in votes and discussions.',
    exampleSnippet: '{{Neutral}} Waiting for additional sources before deciding.',
    params: [
      { key: '1', label: 'Custom label (optional)', placeholder: 'Neutral', defaultValue: '' },
    ],
  },
  {
    id: 'artigos-principais',
    name: 'Details',
    aliases: ['artigos principais', 'details', 'detalhes'],
    category: 'navigation',
    language: 'en',
    description: 'Section hatnote pointing to multiple related main articles.',
    exampleSnippet: '{{Details|start|markdown-guide}}',
    params: [
      { key: '1', label: 'First article', placeholder: 'start', defaultValue: 'start', required: true },
      { key: '2', label: 'Second article (optional)', placeholder: 'markdown-guide', defaultValue: '' },
    ],
  },
  {
    id: 'citar-imprensa',
    name: 'Cite press release',
    aliases: ['citar imprensa', 'citar comunicado', 'cite press release', 'comunicado'],
    category: 'navigation',
    language: 'en',
    description: 'Formats an official press release citation inside `<ref>`.',
    exampleSnippet: '{{Cite press release|title=Launch of Open Knowledge Platform|institution=Wiki Foundation|date=2026-11-10|url=https://example.org/release}}',
    params: [
      { key: 'title', label: 'Release title', placeholder: 'Official statement', defaultValue: 'Official press release', required: true },
      { key: 'institution', label: 'Institution / Issuer', placeholder: 'Organization', defaultValue: 'Press Office' },
      { key: 'date', label: 'Date', placeholder: '2026-11-10', defaultValue: '2026' },
      { key: 'url', label: 'URL (optional)', placeholder: 'https://...', defaultValue: '' },
    ],
  },
  {
    id: 'citar-mapa',
    name: 'Cite map',
    aliases: ['citar mapa', 'cite map', 'mapa'],
    category: 'navigation',
    language: 'en',
    description: 'Formats bibliographic citations for maps, topographic charts, or atlases inside `<ref>`.',
    exampleSnippet: '{{Cite map|title=Physical Map of the Southeast Region|cartography=National Survey|scale=1:1,000,000|year=2025}}',
    params: [
      { key: 'title', label: 'Map title', placeholder: 'Geographic Atlas', defaultValue: 'Topographic Map', required: true },
      { key: 'cartography', label: 'Agency / Cartographer', placeholder: 'USGS', defaultValue: 'Cartographic Institute' },
      { key: 'scale', label: 'Scale', placeholder: '1:1,000,000', defaultValue: '' },
      { key: 'year', label: 'Year', placeholder: '2025', defaultValue: '2025' },
    ],
  },
  {
    id: 'citar-episodio',
    name: 'Cite episode',
    aliases: ['citar episodio', 'cite episode', 'episodio'],
    category: 'navigation',
    language: 'en',
    description: 'Formats references for TV series, documentary, or podcast episodes inside `<ref>`.',
    exampleSnippet: '{{Cite episode|title=Awakening the Network|series=History of Computing|season=1|number=3|year=2024}}',
    params: [
      { key: 'title', label: 'Episode title', placeholder: 'Pilot', defaultValue: 'Episode 1', required: true },
      { key: 'series', label: 'Series/program name', placeholder: 'Documentary Series', defaultValue: 'Program' },
      { key: 'season', label: 'Season', placeholder: '1', defaultValue: '1' },
      { key: 'number', label: 'Episode number', placeholder: '1', defaultValue: '1' },
      { key: 'year', label: 'Year', placeholder: '2024', defaultValue: '2024' },
    ],
  },
  {
    id: 'citar-jogo',
    name: 'Cite video game',
    aliases: ['citar jogo', 'cite video game', 'citar videogame'],
    category: 'navigation',
    language: 'en',
    description: 'Formats direct references to dialogue, levels, or in-game text inside `<ref>`.',
    exampleSnippet: '{{Cite video game|title=Stardew Valley|developer=ConcernedApe|platform=PC|year=2016|quote=Welcome to Pelican Town!}}',
    params: [
      { key: 'title', label: 'Game title', placeholder: 'Game name', defaultValue: 'Game Title', required: true },
      { key: 'developer', label: 'Developer', placeholder: 'Studio', defaultValue: '' },
      { key: 'platform', label: 'Platform', placeholder: 'PC', defaultValue: '' },
      { key: 'year', label: 'Year', placeholder: '2024', defaultValue: '' },
      { key: 'quote', label: 'Quote / Scene (optional)', placeholder: 'Quoted line...', defaultValue: '' },
    ],
  },
  {
    id: 'citar-conferencia',
    name: 'Cite conference',
    aliases: ['citar conferencia', 'cite conference', 'anais'],
    category: 'navigation',
    language: 'en',
    description: 'Formats references for papers published in conference and symposium proceedings inside `<ref>`.',
    exampleSnippet: '{{Cite conference|title=Open Distributed Systems|author=Mendes, A.|conference=International Computing Symposium|year=2025}}',
    params: [
      { key: 'title', label: 'Paper title', placeholder: 'Presented paper', defaultValue: 'Conference Paper', required: true },
      { key: 'author', label: 'Author(s)', placeholder: 'Last, F.', defaultValue: '' },
      { key: 'conference', label: 'Conference name', placeholder: 'Symposium...', defaultValue: 'Conference Proceedings' },
      { key: 'year', label: 'Year', placeholder: '2025', defaultValue: '2025' },
    ],
  },
  {
    id: 'citar-lei',
    name: 'Cite act',
    aliases: ['citar lei', 'lei', 'decreto', 'cite act'],
    category: 'navigation',
    language: 'en',
    description: 'Formats citations of statutes, decrees, constitutions, and regulatory acts inside `<ref>`.',
    exampleSnippet: '{{Cite act|number=Law No. 12.965/2014|title=Internet Civil Rights Framework|jurisdiction=Brazil|article=Art. 3}}',
    params: [
      { key: 'number', label: 'Act / Statute number', placeholder: 'Law No. 12.965/2014', defaultValue: 'Act', required: true },
      { key: 'title', label: 'Short title', placeholder: 'Statute title', defaultValue: '' },
      { key: 'jurisdiction', label: 'Jurisdiction', placeholder: 'Brazil / US / EU', defaultValue: '' },
      { key: 'article', label: 'Article / Section', placeholder: 'Sec. 1', defaultValue: '' },
    ],
  },
  {
    id: 'citar-relatorio',
    name: 'Cite report',
    aliases: ['citar relatorio', 'cite report', 'relatorio', 'citar documento'],
    category: 'navigation',
    language: 'en',
    description: 'Formats references for technical reports, statistical bulletins, and whitepapers inside `<ref>`.',
    exampleSnippet: '{{Cite report|title=Global Connectivity Outlook|institution=UNESCO|year=2025|url=https://example.org/report}}',
    params: [
      { key: 'title', label: 'Report title', placeholder: 'Annual Report', defaultValue: 'Technical Report', required: true },
      { key: 'institution', label: 'Institution', placeholder: 'Organization', defaultValue: '' },
      { key: 'year', label: 'Year', placeholder: '2025', defaultValue: '2025' },
      { key: 'url', label: 'URL (optional)', placeholder: 'https://...', defaultValue: '' },
    ],
  },
  {
    id: 'carece-de-pagina',
    name: 'Page needed',
    aliases: ['carece de pagina', 'page needed', 'pagina?'],
    category: 'navigation',
    language: 'en',
    description: 'Inline tag requesting the exact page number for a book or document citation.',
    exampleSnippet: 'The author defended this thesis{{Page needed}} in their main work.',
    params: [],
  },
  {
    id: 'ligacao-inativa',
    name: 'Dead link',
    aliases: ['ligacao inativa', 'dead link', 'link quebrado'],
    category: 'navigation',
    language: 'en',
    description: 'Inline tag `[dead link]` indicating that the original external URL is offline.',
    exampleSnippet: 'Archived reference{{Dead link|date=November 2026}}.',
    params: [
      { key: 'date', label: 'Check date (optional)', placeholder: 'November 2026', defaultValue: '' },
    ],
  },
  {
    id: 'exemplo-necessario',
    name: 'Example needed',
    aliases: ['exemplo necessario', 'example needed', 'exemplo?'],
    category: 'navigation',
    language: 'en',
    description: 'Inline tag requesting a concrete example to illustrate an abstract statement.',
    exampleSnippet: 'Several languages adopt this paradigm{{Example needed}}.',
    params: [],
  },
  {
    id: 'por-quem',
    name: 'By whom?',
    aliases: ['por quem', 'por quem?', 'by whom', 'by whom?', 'segundo quem', 'segundo quem?'],
    category: 'navigation',
    language: 'en',
    description: 'Inline tag `[by whom?]` challenging vague attributions such as "experts say".',
    exampleSnippet: 'The measure was praised by critics{{By whom?}} at the time.',
    params: [],
  },
  {
    id: 'como-tag',
    name: 'How?',
    aliases: ['como', 'como?', 'how', 'how?'],
    category: 'navigation',
    language: 'en',
    description: 'Inline tag `[how?]` asking for clarification on the mechanism or method mentioned.',
    exampleSnippet: 'The protocol accelerates synchronization{{How?}} across nodes.',
    params: [],
  },
  {
    id: 'porque-tag',
    name: 'Why?',
    aliases: ['por que', 'por que?', 'porque', 'porque?', 'why', 'why?'],
    category: 'navigation',
    language: 'en',
    description: 'Inline tag `[why?]` asking for a causal explanation behind a claim.',
    exampleSnippet: 'The project was relocated to another city{{Why?}}.',
    params: [],
  },
  {
    id: 'melhor-fonte',
    name: 'Better source needed',
    aliases: ['melhor fonte', 'better source needed', 'fonte melhor'],
    category: 'navigation',
    language: 'en',
    description: 'Inline tag `[better source needed]` when the current reference is weak or overly secondary.',
    exampleSnippet: 'The record was set in 2019{{Better source needed}}.',
    params: [],
  },
  {
    id: 'duvidoso-tag',
    name: 'Dubious',
    aliases: ['duvidoso', 'dubious', 'contestado'],
    category: 'navigation',
    language: 'en',
    description: 'Inline tag `[dubious – discuss]` flagging a disputed factual statement.',
    exampleSnippet: 'The city had two million inhabitants in the 16th century{{Dubious}}.',
    params: [],
  },
  {
    id: 'data-formatada',
    name: 'Date',
    aliases: ['data', 'date'],
    category: 'navigation',
    language: 'en',
    description: 'Formats numeric dates (`day|month|year`) in standard encyclopedic English style.',
    exampleSnippet: '{{Date|26|11|2026}}',
    params: [
      { key: '1', label: 'Day', placeholder: '26', defaultValue: '26', required: true },
      { key: '2', label: 'Month (1-12)', placeholder: '11', defaultValue: '11', required: true },
      { key: '3', label: 'Year', placeholder: '2026', defaultValue: '2026', required: true },
    ],
  },
  {
    id: 'porcentagem',
    name: 'Percentage',
    aliases: ['porcentagem', 'pct', 'percentage'],
    category: 'navigation',
    language: 'en',
    description: 'Automatically computes and displays the percentage between part and total (`{{Percentage|25|100}}`).',
    exampleSnippet: '{{Percentage|3|4|1}}',
    params: [
      { key: '1', label: 'Part (numerator)', placeholder: '3', defaultValue: '1', required: true },
      { key: '2', label: 'Total (denominator)', placeholder: '4', defaultValue: '4', required: true },
      { key: '3', label: 'Decimal places', placeholder: '1', defaultValue: '1' },
    ],
  },
  {
    id: 'ipa-fonetica',
    name: 'IPA',
    aliases: ['ipa', 'afi', 'pronuncia', 'pronunciation'],
    category: 'navigation',
    language: 'en',
    description: 'Formats phonetic transcriptions in the International Phonetic Alphabet (IPA).',
    exampleSnippet: '{{IPA|ˌwɪkɪˈpiːdiə}}',
    params: [
      { key: '1', label: 'IPA transcription', placeholder: 'ˌwɪkɪˈpiːdiə', defaultValue: 'ɪɡˈzɑːmpəl', required: true },
    ],
  },
  {
    id: 'lang-idioma',
    name: 'Lang',
    aliases: ['lang', 'idioma', 'estrangeiro'],
    category: 'navigation',
    language: 'en',
    description: 'Tags a foreign-language term or phrase with its ISO language code.',
    exampleSnippet: '{{Lang|la|Alea iacta est}}',
    params: [
      { key: '1', label: 'Language code (la, fr, pt, ja...)', placeholder: 'la', defaultValue: 'la', required: true },
      { key: '2', label: 'Text in language', placeholder: 'Foreign text', defaultValue: 'Example', required: true },
    ],
  },
  {
    id: 'nihongo',
    name: 'Nihongo',
    aliases: ['nihongo', 'japones'],
    category: 'navigation',
    language: 'en',
    description: 'Classic Wikipedia formatting for Japanese terms (English, Kanji/Kana, and Hepburn Romaji).',
    exampleSnippet: '{{Nihongo|Encyclopedia|百科事典|Hyakka jiten}}',
    params: [
      { key: '1', label: 'English term', placeholder: 'Encyclopedia', defaultValue: 'Term', required: true },
      { key: '2', label: 'Kanji / Kana', placeholder: '百科事典', defaultValue: '' },
      { key: '3', label: 'Romaji', placeholder: 'Hyakka jiten', defaultValue: '' },
    ],
  },
  {
    id: 'codigo-inline',
    name: 'Code',
    aliases: ['codigo', 'code', 'syntax'],
    category: 'navigation',
    language: 'en',
    description: 'Formats a short code snippet or command inline in monospace type.',
    exampleSnippet: '{{Code|npm run build}}',
    params: [
      { key: '1', label: 'Code snippet', placeholder: 'console.log()', defaultValue: 'code()', required: true },
    ],
  },
  {
    id: 'tag-xml',
    name: 'Tag',
    aliases: ['tag', 'htmltag', 'xml'],
    category: 'navigation',
    language: 'en',
    description: 'Displays formatted HTML/XML/Wiki tag names (`<ref>...</ref>`) for documentation.',
    exampleSnippet: '{{Tag|ref|Footnote content}}',
    params: [
      { key: '1', label: 'Tag name', placeholder: 'ref', defaultValue: 'div', required: true },
      { key: '2', label: 'Inner content (optional)', placeholder: '...', defaultValue: '' },
    ],
  },
  {
    id: 'ocultar-caixa',
    name: 'Collapse',
    aliases: ['ocultar', 'collapse', 'esconder', 'caixa expansivel'],
    category: 'navigation',
    language: 'en',
    description: 'Structured box with a prominent header for appendices, long lists, or notes.',
    exampleSnippet: '{{Collapse|title=Full version history|content=v1.0 (2024) · v2.0 (2025) · v3.0 (2026)}}',
    params: [
      { key: 'title', label: 'Box header', placeholder: 'Additional details', defaultValue: 'Supplementary content', required: true },
      { key: 'content', label: 'Content', placeholder: 'Text or items...', defaultValue: 'Listed details.', required: true },
    ],
  },
  {
    id: 'barra-de-progresso',
    name: 'Progress bar',
    aliases: ['barra de progresso', 'progresso', 'progress bar'],
    category: 'navigation',
    language: 'en',
    description: 'Visual percentage progress indicator for collaborative projects and editorial goals.',
    exampleSnippet: '{{Progress bar|65|Translation milestone completed}}',
    params: [
      { key: '1', label: 'Percentage (0 to 100)', placeholder: '65', defaultValue: '50', required: true },
      { key: '2', label: 'Caption (optional)', placeholder: 'Progress...', defaultValue: '' },
    ],
  },
  {
    id: 'efn-nota',
    name: 'Efn',
    aliases: ['efn', 'nota explicativa', 'notelist'],
    category: 'navigation',
    language: 'en',
    description: 'Inserts a supplementary explanatory footnote separate from bibliographic references.',
    exampleSnippet: 'The term emerged in the 1990s{{Efn|Originally coined in European academic symposia.}}.',
    params: [
      { key: '1', label: 'Explanatory note text', placeholder: 'Supplementary note...', defaultValue: 'Explanatory note.', required: true },
    ],
  },
  {
    id: 'circa-data',
    name: 'Circa',
    aliases: ['circa', 'aprox'],
    category: 'navigation',
    language: 'en',
    description: 'Standardizes approximate historical dates using `c.` (around).',
    exampleSnippet: '{{Circa|1450|1455}}',
    params: [
      { key: '1', label: 'Start year', placeholder: '1450', defaultValue: '1500', required: true },
      { key: '2', label: 'End year (optional)', placeholder: '1455', defaultValue: '' },
    ],
  },
  {
    id: 'seculo-romano',
    name: 'Century',
    aliases: ['seculo', 'century'],
    category: 'navigation',
    language: 'en',
    description: 'Converts a cardinal number into standard century notation.',
    exampleSnippet: '{{Century|21}}',
    params: [
      { key: '1', label: 'Century number', placeholder: '21', defaultValue: '21', required: true },
    ],
  },
  // --- Additional Wikipedia Infoboxes ---
  {
    id: 'info-cidade',
    name: 'Infobox settlement',
    aliases: ['info/cidade', 'info/municipio', 'infobox settlement', 'infobox city'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for cities, municipalities, districts, and urban settlements.',
    exampleSnippet:
      '{{Infobox settlement|title=Curitiba|Country=Brazil|State=Paraná|Established=March 29, 1693|Population=1,773,718|Area=435 km²}}',
    params: [
      { key: 'title', label: 'City name', placeholder: 'São Paulo', defaultValue: 'Sample City', required: true },
      { key: 'Country', label: 'Country', placeholder: 'Brazil', defaultValue: 'International' },
      { key: 'State', label: 'State / Province', placeholder: 'State', defaultValue: 'Province' },
      { key: 'Population', label: 'Population', placeholder: '1,000,000', defaultValue: '1,000,000' },
      { key: 'Area', label: 'Total area', placeholder: '435 km²', defaultValue: '435 km²' },
    ],
  },
  {
    id: 'info-artista',
    name: 'Infobox musical artist',
    aliases: ['info/artista', 'info/musico', 'infobox musical artist', 'infobox artist'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for musicians, bands, painters, and visual artists.',
    exampleSnippet:
      '{{Infobox musical artist|name=Horizon Band|Origin=Rio de Janeiro, Brazil|Genre=Indie, Alternative rock|Years active=2015–present|Label=Independent}}',
    params: [
      { key: 'name', label: 'Artist / Band name', placeholder: 'Artist name', defaultValue: 'Sample Artist', required: true },
      { key: 'Origin', label: 'Origin', placeholder: 'City, Country', defaultValue: 'International' },
      { key: 'Genre', label: 'Artistic/musical genre', placeholder: 'Indie Rock', defaultValue: 'Contemporary' },
      { key: 'Years active', label: 'Years active', placeholder: '2015–present', defaultValue: 'Active' },
    ],
  },
  {
    id: 'info-serie',
    name: 'Infobox television',
    aliases: ['info/serie', 'info/tv', 'infobox television', 'info/anime'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for television series, streaming shows, animations, and anime.',
    exampleSnippet:
      '{{Infobox television|title=Horizons|Format=Television series|Genre=Science fiction|Seasons=3|Episodes=24|Network=Open Channel}}',
    params: [
      { key: 'title', label: 'Series title', placeholder: 'Series name', defaultValue: 'Sample Series', required: true },
      { key: 'Genre', label: 'Genre', placeholder: 'Drama, Sci-Fi', defaultValue: 'Drama' },
      { key: 'Seasons', label: 'Seasons', placeholder: '3', defaultValue: '1' },
      { key: 'Episodes', label: 'Episodes', placeholder: '24', defaultValue: '10' },
      { key: 'Network', label: 'Network / Platform', placeholder: 'TV / Streaming', defaultValue: 'Streaming' },
    ],
  },
  {
    id: 'info-album',
    name: 'Infobox album',
    aliases: ['info/album', 'infobox album'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for studio albums, compilations, and live recordings.',
    exampleSnippet:
      '{{Infobox album|title=Southern Winds|Artist=Horizon Band|Released=August 14, 2024|Genre=Indie, Folk|Length=42:18|Label=North Records}}',
    params: [
      { key: 'title', label: 'Album title', placeholder: 'Album name', defaultValue: 'Sample Album', required: true },
      { key: 'Artist', label: 'Artist / Band', placeholder: 'Artist', defaultValue: 'Artist' },
      { key: 'Released', label: 'Release date', placeholder: '2024', defaultValue: '2024' },
      { key: 'Genre', label: 'Genre', placeholder: 'Rock, Folk', defaultValue: 'Musical' },
      { key: 'Length', label: 'Total length', placeholder: '42:18', defaultValue: '40:00' },
    ],
  },
  {
    id: 'info-cancao',
    name: 'Infobox song',
    aliases: ['info/cancao', 'info/single', 'infobox song'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for individual songs, singles, and compositions.',
    exampleSnippet:
      '{{Infobox song|title=Morning Light|Artist=Clara Nunes|Album=Open Song|Released=2023|Writer=Clara Nunes|Length=3:45}}',
    params: [
      { key: 'title', label: 'Song title', placeholder: 'Song name', defaultValue: 'Sample Song', required: true },
      { key: 'Artist', label: 'Performer', placeholder: 'Artist', defaultValue: 'Artist' },
      { key: 'Album', label: 'Album', placeholder: 'Album', defaultValue: 'Single' },
      { key: 'Released', label: 'Released', placeholder: '2024', defaultValue: '2024' },
      { key: 'Length', label: 'Length', placeholder: '3:45', defaultValue: '3:30' },
    ],
  },
  {
    id: 'info-clube',
    name: 'Infobox football club',
    aliases: ['info/clube', 'info/futebol', 'infobox football club'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for football clubs and sports associations.',
    exampleSnippet:
      '{{Infobox football club|name=Athletic Model|Founded=1912|Ground=Central Arena|Capacity=45,000|League=Premier Division|Manager=R. Silva}}',
    params: [
      { key: 'name', label: 'Club name', placeholder: 'Sports Club', defaultValue: 'Sample Club', required: true },
      { key: 'Founded', label: 'Year founded', placeholder: '1912', defaultValue: '1920' },
      { key: 'Ground', label: 'Stadium / Arena', placeholder: 'Central Stadium', defaultValue: 'Municipal Stadium' },
      { key: 'League', label: 'Main competition', placeholder: 'First Division', defaultValue: 'National League' },
    ],
  },
  {
    id: 'info-atleta',
    name: 'Infobox sportsperson',
    aliases: ['info/atleta', 'info/futebolista', 'infobox sportsperson', 'infobox football biography'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for Olympic athletes, footballers, and professional sportspeople.',
    exampleSnippet:
      '{{Infobox sportsperson|name=Lucas Andrade|Sport=Football|Position=Midfielder|Nationality=Brazilian|Current club=Athletic Model}}',
    params: [
      { key: 'name', label: 'Athlete name', placeholder: 'Full name', defaultValue: 'Sample Athlete', required: true },
      { key: 'Sport', label: 'Sport / Discipline', placeholder: 'Football / Athletics', defaultValue: 'Athletics' },
      { key: 'Position', label: 'Position / Event', placeholder: 'Forward', defaultValue: 'Starter' },
      { key: 'Nationality', label: 'Nationality', placeholder: 'International', defaultValue: 'International' },
    ],
  },
  {
    id: 'info-politico',
    name: 'Infobox officeholder',
    aliases: ['info/politico', 'infobox officeholder'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for heads of state, governors, legislators, and public officials.',
    exampleSnippet:
      '{{Infobox officeholder|name=Helena Tavares|Office=Senator|Term=2023–present|Party=Democratic Party|Born=1972}}',
    params: [
      { key: 'name', label: 'Official name', placeholder: 'Full name', defaultValue: 'Sample Official', required: true },
      { key: 'Office', label: 'Public office', placeholder: 'Minister / Governor', defaultValue: 'Public Office' },
      { key: 'Term', label: 'Term in office', placeholder: '2023–2027', defaultValue: '2023–present' },
      { key: 'Party', label: 'Party / Coalition', placeholder: 'Independent', defaultValue: 'Independent' },
    ],
  },
  {
    id: 'info-cientista',
    name: 'Infobox scientist',
    aliases: ['info/cientista', 'infobox scientist'],
    category: 'infobox',
    language: 'en',
    description: 'Biographical infobox dedicated to scientists, researchers, and inventors.',
    exampleSnippet:
      '{{Infobox scientist|name=Dr. Beatriz Costa|Field=Astrophysics|Institutions=National Observatory|Known for=Exoplanet mapping|Awards=Open Science Medal}}',
    params: [
      { key: 'name', label: 'Scientist name', placeholder: 'Full name', defaultValue: 'Sample Scientist', required: true },
      { key: 'Field', label: 'Scientific field', placeholder: 'Physics, Biology...', defaultValue: 'Exact Sciences' },
      { key: 'Institutions', label: 'Institution', placeholder: 'University / Institute', defaultValue: 'Research Institute' },
      { key: 'Known for', label: 'Primary contribution', placeholder: 'Discovery or theory', defaultValue: 'Fundamental research' },
    ],
  },
  {
    id: 'info-edificio',
    name: 'Infobox building',
    aliases: ['info/edificio', 'info/construcao', 'infobox building'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for historic buildings, skyscrapers, museums, and architectural landmarks.',
    exampleSnippet:
      '{{Infobox building|name=Science Museum|Location=Belo Horizonte, Brazil|Architect=O. Mendes|Opened=1998|Height=48 m}}',
    params: [
      { key: 'name', label: 'Building name', placeholder: 'Palace / Tower', defaultValue: 'Sample Building', required: true },
      { key: 'Location', label: 'City / Country', placeholder: 'City, Country', defaultValue: 'International' },
      { key: 'Architect', label: 'Architect', placeholder: 'Name', defaultValue: 'Undisclosed' },
      { key: 'Opened', label: 'Year opened', placeholder: '1998', defaultValue: '2000' },
    ],
  },
  {
    id: 'info-aeroporto',
    name: 'Infobox airport',
    aliases: ['info/aeroporto', 'info/estacao', 'infobox airport', 'infobox station'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for international airports, transit hubs, and railway/metro stations.',
    exampleSnippet:
      '{{Infobox airport|name=Central International Airport|IATA=CWB|ICAO=SBCT|City=Curitiba|Opened=1946|Operator=Airport Authority}}',
    params: [
      { key: 'name', label: 'Airport/station name', placeholder: 'Airport...', defaultValue: 'Sample Airport', required: true },
      { key: 'IATA', label: 'IATA / Station code', placeholder: 'GRU', defaultValue: 'XXX' },
      { key: 'ICAO', label: 'ICAO code', placeholder: 'SBGR', defaultValue: 'XXXX' },
      { key: 'City', label: 'City served', placeholder: 'City', defaultValue: 'City' },
    ],
  },
  {
    id: 'info-linguagem',
    name: 'Infobox programming language',
    aliases: ['info/linguagem', 'info/idioma', 'infobox programming language', 'infobox language'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for programming languages or natural human languages.',
    exampleSnippet:
      '{{Infobox programming language|name=TypeScript|Paradigm=Multi-paradigm, static typing|Designer=Microsoft|First appeared=2012|Filename extensions=.ts, .tsx}}',
    params: [
      { key: 'name', label: 'Language name', placeholder: 'TypeScript', defaultValue: 'Sample Language', required: true },
      { key: 'Paradigm', label: 'Paradigm / Family', placeholder: 'Functional, OOP', defaultValue: 'Multi-paradigm' },
      { key: 'Designer', label: 'Designer / Speakers', placeholder: 'Author / Region', defaultValue: 'Community' },
      { key: 'First appeared', label: 'Year / ISO code', placeholder: '2012', defaultValue: '2020' },
    ],
  },
  {
    id: 'info-astro',
    name: 'Infobox planet',
    aliases: ['info/astro', 'info/planeta', 'infobox planet'],
    category: 'infobox',
    language: 'en',
    description: 'Astronomical infobox for planets, stars, moons, comets, and galaxies.',
    exampleSnippet:
      '{{Infobox planet|name=Mars|Type=Terrestrial planet|Mean radius=3,389.5 km|Orbital period=687 days|Satellites=2 (Phobos and Deimos)}}',
    params: [
      { key: 'name', label: 'Celestial body', placeholder: 'Mars', defaultValue: 'Sample Celestial Body', required: true },
      { key: 'Type', label: 'Classification', placeholder: 'Terrestrial planet', defaultValue: 'Celestial body' },
      { key: 'Mean radius', label: 'Radius / Diameter', placeholder: '3,389 km', defaultValue: '1,000 km' },
      { key: 'Orbital period', label: 'Orbital period', placeholder: '365 days', defaultValue: '365 days' },
    ],
  },
  {
    id: 'info-elemento',
    name: 'Infobox element',
    aliases: ['info/elemento', 'infobox element'],
    category: 'infobox',
    language: 'en',
    description: 'Periodic table infobox for chemical elements.',
    exampleSnippet:
      '{{Infobox element|name=Carbon|Symbol=C|Atomic number=6|Atomic weight=12.011 u|Group=Nonmetal|Phase at STP=Solid}}',
    params: [
      { key: 'name', label: 'Element name', placeholder: 'Carbon', defaultValue: 'Sample Element', required: true },
      { key: 'Symbol', label: 'Chemical symbol', placeholder: 'C', defaultValue: 'X' },
      { key: 'Atomic number', label: 'Atomic number (Z)', placeholder: '6', defaultValue: '1' },
      { key: 'Atomic weight', label: 'Atomic weight', placeholder: '12.011 u', defaultValue: '1.008 u' },
    ],
  },
  {
    id: 'info-doenca',
    name: 'Infobox medical condition',
    aliases: ['info/doenca', 'infobox medical condition'],
    category: 'infobox',
    language: 'en',
    description: 'Clinical and medical infobox for health conditions and pathologies.',
    exampleSnippet:
      '{{Infobox medical condition|name=Migraine|Specialty=Neurology|Symptoms=Throbbing headache, photophobia|ICD-11=8A80}}',
    params: [
      { key: 'name', label: 'Medical condition', placeholder: 'Condition name', defaultValue: 'Sample Condition', required: true },
      { key: 'Specialty', label: 'Specialty', placeholder: 'Neurology', defaultValue: 'Internal Medicine' },
      { key: 'Symptoms', label: 'Common symptoms', placeholder: 'Pain, fever...', defaultValue: 'Variable' },
      { key: 'ICD-11', label: 'ICD code', placeholder: '8A80', defaultValue: '—' },
    ],
  },
  {
    id: 'info-conflito',
    name: 'Infobox military conflict',
    aliases: ['info/conflito', 'info/batalha', 'infobox military conflict'],
    category: 'infobox',
    language: 'en',
    description: 'Historiographical infobox for wars, campaigns, and historical battles.',
    exampleSnippet:
      '{{Infobox military conflict|name=Sample Historical Battle|Date=1815|Location=Central Europe|Result=Peace treaty|Belligerents=Force A vs. Force B}}',
    params: [
      { key: 'name', label: 'Conflict name', placeholder: 'Battle of...', defaultValue: 'Sample Conflict', required: true },
      { key: 'Date', label: 'Date / Period', placeholder: '1815', defaultValue: '19th century' },
      { key: 'Location', label: 'Location', placeholder: 'Region', defaultValue: 'Historical region' },
      { key: 'Result', label: 'Result', placeholder: 'Peace treaty', defaultValue: 'Documented' },
    ],
  },
  {
    id: 'info-premio',
    name: 'Infobox award',
    aliases: ['info/premio', 'infobox award'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for scientific, literary, film, and civic awards and honors.',
    exampleSnippet:
      '{{Infobox award|name=Camões Prize|Country=Portugal and Brazil|Presented by=Governments of Portugal and Brazil|First awarded=1989|Category=Portuguese-language literature}}',
    params: [
      { key: 'name', label: 'Award name', placeholder: 'Nobel Prize', defaultValue: 'Sample Award', required: true },
      { key: 'Country', label: 'Country / Scope', placeholder: 'International', defaultValue: 'International' },
      { key: 'Presented by', label: 'Awarding institution', placeholder: 'Academy', defaultValue: 'Committee' },
      { key: 'First awarded', label: 'Year established', placeholder: '1989', defaultValue: '2000' },
    ],
  },
  {
    id: 'info-jornal',
    name: 'Infobox newspaper',
    aliases: ['info/jornal', 'info/revista', 'infobox newspaper', 'infobox journal'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for newspapers, magazines, news outlets, and scientific journals.',
    exampleSnippet:
      '{{Infobox newspaper|name=Science Today Journal|Type=Monthly periodical|Founded=1982|Language=English|Headquarters=London}}',
    params: [
      { key: 'name', label: 'Publication name', placeholder: 'Newspaper / Journal', defaultValue: 'Sample Publication', required: true },
      { key: 'Type', label: 'Frequency / Type', placeholder: 'Daily / Monthly', defaultValue: 'Periodical' },
      { key: 'Founded', label: 'Year founded', placeholder: '1982', defaultValue: '2000' },
      { key: 'Language', label: 'Language', placeholder: 'English', defaultValue: 'English' },
    ],
  },
  // --- Batch 4: Additional Popular Wikipedia Templates (250+ total) ---
  {
    id: 'vandalismo',
    name: 'Uw-vandalism',
    aliases: ['vandalismo', 'uw-vandalism', 'aviso vandalismo'],
    category: 'notices',
    language: 'en',
    description:
      'User talk page warning about destructive edits or unjustified removal of content.',
    exampleSnippet: '{{Uw-vandalism|page=start|level=1}}',
    params: [
      { key: 'page', label: 'Affected page (optional)', placeholder: 'start', defaultValue: '' },
      { key: 'level', label: 'Warning level (1 to 4)', placeholder: '1', defaultValue: '1' },
    ],
  },
  {
    id: 'teste-edicao',
    name: 'Uw-test',
    aliases: ['teste', 'uw-test', 'edicao de teste'],
    category: 'notices',
    language: 'en',
    description:
      'Friendly educational message for new editors who made accidental test edits in articles.',
    exampleSnippet: '{{Uw-test|page=start}}',
    params: [
      { key: 'page', label: 'Tested page (optional)', placeholder: 'start', defaultValue: '' },
    ],
  },
  {
    id: 'aviso-spam',
    name: 'Uw-spam',
    aliases: ['aviso spam', 'uw-spam', 'links promocionais'],
    category: 'notices',
    language: 'en',
    description:
      'Talk page warning against repeated insertion of promotional copy or spam external links.',
    exampleSnippet: '{{Uw-spam|page=start}}',
    params: [
      { key: 'page', label: 'Affected page (optional)', placeholder: 'start', defaultValue: '' },
    ],
  },
  {
    id: 'remocao-conteudo',
    name: 'Uw-delete',
    aliases: ['remocao de conteudo', 'uw-delete', 'apagamento indevido'],
    category: 'notices',
    language: 'en',
    description:
      'Educational notice when an editor removes sourced paragraphs without providing an edit summary reason.',
    exampleSnippet: '{{Uw-delete|page=start}}',
    params: [
      { key: 'page', label: 'Affected page (optional)', placeholder: 'start', defaultValue: '' },
    ],
  },
  {
    id: 'sem-consenso',
    name: 'No consensus',
    aliases: ['sem consenso', 'discutido', 'debate em curso'],
    category: 'notices',
    language: 'en',
    description:
      'Signals that recent changes to the entry are awaiting editorial consensus on the talk page.',
    exampleSnippet: '{{No consensus|reason=Discuss section structure before making further reverts.}}',
    params: [
      { key: 'reason', label: 'Discussion summary', placeholder: 'Dispute reason...', defaultValue: 'Controversial changes should be aligned on the talk page first.' },
    ],
  },
  {
    id: 'fusao-historico',
    name: 'History merge',
    aliases: ['fusao de historico', 'history merge', 'histmerge'],
    category: 'notices',
    language: 'en',
    description:
      'Requests administrators to technically merge the revision histories of two duplicate pages.',
    exampleSnippet: '{{History merge|target=start|reason=Article recreated via copy-and-paste.}}',
    params: [
      { key: 'target', label: 'Target slug', placeholder: 'start', defaultValue: 'start' },
      { key: 'reason', label: 'Reason', placeholder: 'Split history...', defaultValue: 'Unify edit history to preserve author attribution.' },
    ],
  },
  {
    id: 'transferir-wikcionario',
    name: 'Transwiki Wiktionary',
    aliases: ['wikcionario', 'transwiki', 'dicionario'],
    category: 'notices',
    language: 'en',
    description:
      'Flags purely lexical entries or brief definitions better suited for a dictionary.',
    exampleSnippet: '{{Transwiki Wiktionary|reason=Content limited to etymological definition of the term.}}',
    params: [
      { key: 'reason', label: 'Note', placeholder: 'Lexical definition...', defaultValue: 'Entry has strictly dictionary-like scope.' },
    ],
  },
  {
    id: 'transferir-wikisource',
    name: 'Transwiki Wikisource',
    aliases: ['wikisource', 'texto integral', 'documento fonte'],
    category: 'notices',
    language: 'en',
    description:
      'Alerts that the page reproduces the full text of a historical document or public-domain literary work.',
    exampleSnippet: '{{Transwiki Wikisource|work=Historical Charter of 1888}}',
    params: [
      { key: 'work', label: 'Document title', placeholder: 'Original document', defaultValue: 'Source document' },
    ],
  },
  {
    id: 'transferir-wikinoticias',
    name: 'Transwiki Wikinews',
    aliases: ['wikinoticias', 'estilo jornalistico', 'noticiario'],
    category: 'notices',
    language: 'en',
    description:
      'Indicates that the text is written like a breaking news report rather than an encyclopedic synthesis.',
    exampleSnippet: '{{Transwiki Wikinews|reason=Rewrite from a historical and impersonal perspective.}}',
    params: [
      { key: 'reason', label: 'Required edit', placeholder: 'Adopt encyclopedic style...', defaultValue: 'The text uses ephemeral journalistic tone instead of encyclopedic style.' },
    ],
  },
  {
    id: 'nao-enciclopedico',
    name: 'Unencyclopedic',
    aliases: ['nao enciclopedico', 'unencyclopedic', 'fora do escopo'],
    category: 'notices',
    language: 'en',
    description:
      'Flags material outside encyclopedic scope (pamphlets, personal manifestos, commercial brochures).',
    exampleSnippet: '{{Unencyclopedic|reason=Structured like a promotional manifesto without sources.}}',
    params: [
      { key: 'reason', label: 'Reason', placeholder: 'Out of scope...', defaultValue: 'Content does not match the informative purpose of an encyclopedia.' },
    ],
  },
  {
    id: 'variante-linguistica',
    name: 'Language variety',
    aliases: ['variante linguistica', 'pt br', 'pt pt', 'ortografia'],
    category: 'notices',
    language: 'en',
    description:
      'Indicates the regional spelling variety originally adopted in the article to maintain consistency.',
    exampleSnippet: '{{Language variety|variety=American English}}',
    params: [
      { key: 'variety', label: 'Adopted variety', placeholder: 'American English', defaultValue: 'English' },
    ],
  },
  {
    id: 'linguagem-tecnica',
    name: 'Technical',
    aliases: ['linguagem tecnica', 'technical', 'jargao'],
    category: 'notices',
    language: 'en',
    description:
      'Warns that the article uses overly specialized jargon, asking for an accessible introduction for general readers.',
    exampleSnippet: '{{Technical|area=Pure Mathematics|reason=Add an intuitive explanation in the introduction.}}',
    params: [
      { key: 'area', label: 'Subject area', placeholder: 'Science / Law...', defaultValue: 'specialized field' },
      { key: 'reason', label: 'Suggestion', placeholder: 'Simplify introduction...', defaultValue: 'Add an accessible overview before formal technical definitions.' },
    ],
  },
  {
    id: 'secao-longa',
    name: 'Overly detailed',
    aliases: ['secao longa', 'seccao longa', 'overly detailed', 'detalhamento excessivo'],
    category: 'notices',
    language: 'en',
    description:
      'Indicates that a section has become overly long or granular and can be summarized.',
    exampleSnippet: '{{Overly detailed|section=Timeline|reason=Condense minor events while keeping essential facts.}}',
    params: [
      { key: 'section', label: 'Section name', placeholder: 'History', defaultValue: 'This section' },
      { key: 'reason', label: 'Reason', placeholder: 'Summarize details...', defaultValue: 'Trim excessive minutiae in favor of encyclopedic conciseness.' },
    ],
  },
  {
    id: 'atualizar-apos',
    name: 'Update after',
    aliases: ['atualizar apos', 'update after', 'prazo'],
    category: 'notices',
    language: 'en',
    description:
      'Marks a statement with a scheduled review date after an upcoming milestone or term end.',
    exampleSnippet: '{{Update after|2027|Check outcome after the election or project completion.}}',
    params: [
      { key: '1', label: 'Target year / date', placeholder: '2027', defaultValue: '2027', required: true },
      { key: '2', label: 'What to check', placeholder: 'Confirm completion...', defaultValue: 'Review figures after the indicated milestone date.' },
    ],
  },
  {
    id: 'morte-recente',
    name: 'Recent death',
    aliases: ['morte recente', 'recent death', 'falecimento recente'],
    category: 'notices',
    language: 'en',
    description:
      'Classic Wikipedia editorial notice for biographies of individuals who died recently.',
    exampleSnippet: '{{Recent death|name=Sample Figure}}',
    params: [
      { key: 'name', label: 'Name (optional)', placeholder: 'Person name', defaultValue: '' },
    ],
  },
  {
    id: 'homonimos',
    name: 'Surname',
    aliases: ['homonimos', 'surname', 'given name', 'lista de nomes'],
    category: 'notices',
    language: 'en',
    description:
      'Identifies name index pages listing people or places that share the same surname or given name.',
    exampleSnippet: '{{Surname|Silva}}',
    params: [
      { key: '1', label: 'Shared name or term', placeholder: 'Silva', defaultValue: 'this name' },
    ],
  },
  {
    id: 'esboco-bio',
    name: 'Bio-stub',
    aliases: ['esboco-bio', 'bio-stub', 'esboco biografia'],
    category: 'notices',
    language: 'en',
    description: 'Marks a short biographical entry as a biographical stub.',
    exampleSnippet: '{{Bio-stub|Scientists and researchers}}',
    params: [{ key: '1', label: 'Biographical field', placeholder: 'Biographies', defaultValue: 'Biographies' }],
  },
  {
    id: 'esboco-geo',
    name: 'Geo-stub',
    aliases: ['esboco-geo', 'geo-stub', 'esboco geografia'],
    category: 'notices',
    language: 'en',
    description: 'Marks a short article about cities, rivers, or places as a geographic stub.',
    exampleSnippet: '{{Geo-stub|Cities and Geography}}',
    params: [{ key: '1', label: 'Region or topic', placeholder: 'Geography', defaultValue: 'Geography' }],
  },
  {
    id: 'esboco-ciencia',
    name: 'Science-stub',
    aliases: ['esboco-ciencia', 'science-stub', 'esboco tecnologia'],
    category: 'notices',
    language: 'en',
    description: 'Marks a brief scientific or technical entry as a science stub.',
    exampleSnippet: '{{Science-stub|Physics and Computing}}',
    params: [{ key: '1', label: 'Discipline', placeholder: 'Science and Technology', defaultValue: 'Science and Technology' }],
  },
  {
    id: 'esboco-jogos',
    name: 'Vg-stub',
    aliases: ['esboco-jogos', 'vg-stub', 'esboco videogame'],
    category: 'notices',
    language: 'en',
    description: 'Marks a short article about video games or game mechanics as a topic stub.',
    exampleSnippet: '{{Vg-stub|Video Games}}',
    params: [{ key: '1', label: 'Franchise or genre', placeholder: 'Video Games', defaultValue: 'Video Games' }],
  },
  {
    id: 'wikiprojeto',
    name: 'WikiProject',
    aliases: ['wikiprojeto', 'wikiproject', 'projeto editorial'],
    category: 'notices',
    language: 'en',
    description:
      'Talk page banner linking the entry to a WikiProject with quality and importance ratings.',
    exampleSnippet: '{{WikiProject|project=Technology and Software|quality=4|importance=High}}',
    params: [
      { key: 'project', label: 'WikiProject name', placeholder: 'Technology', defaultValue: 'WikiMaker Editorial', required: true },
      { key: 'quality', label: 'Quality level (1-6)', placeholder: '3', defaultValue: '3' },
      { key: 'importance', label: 'Importance (Low, Mid, High)', placeholder: 'High', defaultValue: 'Mid' },
    ],
  },
  {
    id: 'arquivo-bot',
    name: 'Auto-archive',
    aliases: ['arquivo automatico', 'autoarchive', 'configuracao arquivo'],
    category: 'notices',
    language: 'en',
    description:
      'Informs active talk pages that inactive discussion threads are periodically archived.',
    exampleSnippet: '{{Auto-archive|days=90}}',
    params: [{ key: 'days', label: 'Threshold in days', placeholder: '90', defaultValue: '90' }],
  },
  {
    id: 'em-votacao',
    name: 'RfC',
    aliases: ['em votacao', 'rfc', 'consulta publica'],
    category: 'notices',
    language: 'en',
    description:
      'Invites the community to weigh in on a Request for Comment (RfC) or open consultation.',
    exampleSnippet: '{{RfC|topic=Standardization of topic infoboxes|deadline=November 30, 2026}}',
    params: [
      { key: 'topic', label: 'Topic under consultation', placeholder: 'Editorial proposal...', defaultValue: 'Open editorial proposal for community comment', required: true },
      { key: 'deadline', label: 'Deadline', placeholder: 'November 30, 2026', defaultValue: 'Open' },
    ],
  },
  {
    id: 'pagina-usuario',
    name: 'Userpage',
    aliases: ['pagina de usuario', 'userpage', 'perfil colaborador'],
    category: 'notices',
    language: 'en',
    description:
      'Standard banner declaring that the page belongs to an individual contributor and is not an encyclopedia article.',
    exampleSnippet: '{{Userpage|user=Sample Editor}}',
    params: [{ key: 'user', label: 'Username', placeholder: 'Collaborator', defaultValue: 'Collaborator' }],
  },
  {
    id: 'pagina-testes',
    name: 'User sandbox',
    aliases: ['pagina de testes', 'sandbox', 'rascunho'],
    category: 'notices',
    language: 'en',
    description:
      'Banner identifying a personal draft area for experimenting with wiki syntax (`{{User sandbox}}`).',
    exampleSnippet: '{{User sandbox|author=Sample Editor}}',
    params: [{ key: 'author', label: 'Contributor (optional)', placeholder: 'Editor', defaultValue: '' }],
  },
  // --- Navigation, Hatnotes, Citations, Timelines, Math & Utilities ---
  {
    id: 'hatnote',
    name: 'Hatnote',
    aliases: ['hatnote', 'nota topo'],
    category: 'navigation',
    language: 'en',
    description: 'Freeform top hatnote guiding reader navigation before the main article text.',
    exampleSnippet: '{{Hatnote|This article covers the classic architecture; for the modern style, see [[start]].}}',
    params: [{ key: '1', label: 'Note text', placeholder: 'Guidance...', defaultValue: 'Top navigation hatnote.', required: true }],
  },
  {
    id: 'distinguir',
    name: 'Distinguish2',
    aliases: ['distinguir', 'distinguish2'],
    category: 'navigation',
    language: 'en',
    description: 'Custom top hatnote to distinguish two similar terms with a freeform explanation.',
    exampleSnippet: '{{Distinguish2|Not to be confused with [[markdown-guide|Markdown Guide]], which covers editing syntax.}}',
    params: [{ key: '1', label: 'Distinction message', placeholder: 'Not to be confused with...', defaultValue: 'Not to be confused with [[start|Home Page]].', required: true }],
  },
  {
    id: 'ver-categoria',
    name: 'See category',
    aliases: ['ver categoria', 'see category', 'categoria'],
    category: 'navigation',
    language: 'en',
    description: 'Points directly to a thematic category related to the current section.',
    exampleSnippet: '{{See category|Technology}}',
    params: [{ key: '1', label: 'Category name', placeholder: 'Technology', defaultValue: 'General', required: true }],
  },
  {
    id: 'tracklist',
    name: 'Tracklist',
    aliases: ['tracklist', 'lista de faixas', 'faixas'],
    category: 'navigation',
    language: 'en',
    description: 'Formats a music album or soundtrack tracklist with track names and durations.',
    exampleSnippet: '{{Tracklist|title=Side A|track1=Overture (3:12)|track2=Horizon (4:05)|track3=Epilogue (5:18)}}',
    params: [
      { key: 'title', label: 'Disc/side title', placeholder: 'Tracks', defaultValue: 'Track listing' },
      { key: 'track1', label: 'Track 1', placeholder: 'Title (3:10)', defaultValue: 'Track 1 (3:20)' },
      { key: 'track2', label: 'Track 2', placeholder: 'Title (4:00)', defaultValue: 'Track 2 (4:05)' },
      { key: 'track3', label: 'Track 3', placeholder: 'Title (4:30)', defaultValue: 'Track 3 (3:50)' },
    ],
  },
  {
    id: 'cronologia',
    name: 'Timeline',
    aliases: ['cronologia', 'timeline', 'linha do tempo'],
    category: 'navigation',
    language: 'en',
    description: 'Chronological succession strip displaying previous, current, and next items in a series or edition.',
    exampleSnippet: '{{Timeline|theme=World Cups|prev=2022|current=2026|next=2030}}',
    params: [
      { key: 'theme', label: 'Series or theme', placeholder: 'Editions', defaultValue: 'Timeline' },
      { key: 'prev', label: 'Previous', placeholder: '2022', defaultValue: 'Previous' },
      { key: 'current', label: 'Current', placeholder: '2026', defaultValue: 'Current', required: true },
      { key: 'next', label: 'Next', placeholder: '2030', defaultValue: 'Next' },
    ],
  },
  {
    id: 'caixa-sucessao',
    name: 'Succession box',
    aliases: ['sucessao', 'succession box', 'antecessor'],
    category: 'navigation',
    language: 'en',
    description: 'Classic Wikipedia succession box for offices, mandates, and titles showing predecessor and successor.',
    exampleSnippet: '{{Succession box|role=Editorial Director|period=2022–2026|predecessor=Ana Silva|successor=Carlos Mendes}}',
    params: [
      { key: 'role', label: 'Office or title', placeholder: 'Office held', defaultValue: 'Office', required: true },
      { key: 'period', label: 'Period', placeholder: '2022–2026', defaultValue: '2022–2026' },
      { key: 'predecessor', label: 'Predecessor', placeholder: 'Previous holder', defaultValue: '—' },
      { key: 'successor', label: 'Successor', placeholder: 'Next holder', defaultValue: '—' },
    ],
  },
  {
    id: 'commons',
    name: 'Commons',
    aliases: ['commons', 'wikimedia commons', 'galeria'],
    category: 'navigation',
    language: 'en',
    description: 'Link box pointing to a related media gallery or multimedia archive.',
    exampleSnippet: '{{Commons|Modern Architecture}}',
    params: [{ key: '1', label: 'Archive category', placeholder: 'Topic', defaultValue: 'Media Archive', required: true }],
  },
  {
    id: 'link-wikcionario',
    name: 'Wiktionary',
    aliases: ['link wikcionario', 'wiktionary', 'definicao'],
    category: 'navigation',
    language: 'en',
    description: 'Sidebar link box pointing to lexical and etymological lookup on Wiktionary.',
    exampleSnippet: '{{Wiktionary|encyclopedia}}',
    params: [{ key: '1', label: 'Lexical entry', placeholder: 'word', defaultValue: 'term', required: true }],
  },
  {
    id: 'link-wikiquote',
    name: 'Wikiquote',
    aliases: ['link wikiquote', 'citacoes relacionadas', 'wikiquote'],
    category: 'navigation',
    language: 'en',
    description: 'Sidebar link box pointing to collected quotations attributed to an author or topic.',
    exampleSnippet: '{{Wikiquote|Machado de Assis}}',
    params: [{ key: '1', label: 'Author or topic', placeholder: 'Name', defaultValue: 'Author', required: true }],
  },
  {
    id: 'citar-podcast',
    name: 'Cite podcast',
    aliases: ['citar podcast', 'cite podcast', 'podcast'],
    category: 'navigation',
    language: 'en',
    description: 'Formats bibliographic citations for podcast episodes inside `<ref>`.',
    exampleSnippet: '{{Cite podcast|title=Networked Computing|program=Open Science Podcast|host=Lopes, R.|year=2025}}',
    params: [
      { key: 'title', label: 'Episode title', placeholder: 'Episode...', defaultValue: 'Podcast Episode', required: true },
      { key: 'program', label: 'Podcast name', placeholder: 'Podcast...', defaultValue: 'Podcast' },
      { key: 'host', label: 'Host / Guest', placeholder: 'Name', defaultValue: '' },
      { key: 'year', label: 'Year', placeholder: '2025', defaultValue: '2025' },
    ],
  },
  {
    id: 'citar-entrevista',
    name: 'Cite interview',
    aliases: ['citar entrevista', 'cite interview', 'entrevista'],
    category: 'navigation',
    language: 'en',
    description: 'Formats citations for interviews given by public figures or specialists inside `<ref>`.',
    exampleSnippet: '{{Cite interview|interviewee=Dr. Helena Souza|interviewer=Research Review|title=The future of open data|year=2025}}',
    params: [
      { key: 'interviewee', label: 'Interviewee', placeholder: 'Name', defaultValue: 'Interviewee', required: true },
      { key: 'interviewer', label: 'Interviewer / Outlet', placeholder: 'Outlet', defaultValue: '' },
      { key: 'title', label: 'Interview title', placeholder: 'Title', defaultValue: 'Interview' },
      { key: 'year', label: 'Year', placeholder: '2025', defaultValue: '2025' },
    ],
  },
  {
    id: 'citar-discurso',
    name: 'Cite speech',
    aliases: ['citar discurso', 'cite speech', 'discurso'],
    category: 'navigation',
    language: 'en',
    description: 'Formats references for public addresses, keynote lectures, and speeches inside `<ref>`.',
    exampleSnippet: '{{Cite speech|author=R. Oliveira|title=Opening of the Digital Forum|event=International Forum|year=2024}}',
    params: [
      { key: 'author', label: 'Speaker', placeholder: 'Name', defaultValue: 'Speaker', required: true },
      { key: 'title', label: 'Speech title', placeholder: 'Address...', defaultValue: 'Speech' },
      { key: 'event', label: 'Event / Venue', placeholder: 'Conference', defaultValue: '' },
      { key: 'year', label: 'Year', placeholder: '2024', defaultValue: '2024' },
    ],
  },
  {
    id: 'citar-tweet',
    name: 'Cite tweet',
    aliases: ['citar tweet', 'citar post', 'cite tweet', 'rede social'],
    category: 'navigation',
    language: 'en',
    description: 'Formats references for official announcements posted on verified social media accounts inside `<ref>`.',
    exampleSnippet: '{{Cite tweet|user=@official_example|text=We confirm the opening of the public archive.|date=2026-10-12}}',
    params: [
      { key: 'user', label: 'Handle (@user)', placeholder: '@account', defaultValue: '@account', required: true },
      { key: 'text', label: 'Summary or excerpt', placeholder: 'Official post...', defaultValue: 'Official post', required: true },
      { key: 'date', label: 'Date', placeholder: '2026-10-12', defaultValue: '2026' },
    ],
  },
  {
    id: 'citar-arquivo',
    name: 'Cite archive',
    aliases: ['citar arquivo', 'cite archive', 'arquivo historico'],
    category: 'navigation',
    language: 'en',
    description: 'Formats references for historical records, manuscripts, and archival collections inside `<ref>`.',
    exampleSnippet: '{{Cite archive|document=Founding Minutes No. 04|archive=National Archives|collection=Republic Fund|year=1932}}',
    params: [
      { key: 'document', label: 'Document name', placeholder: 'Manuscript / Minutes', defaultValue: 'Archival Document', required: true },
      { key: 'archive', label: 'Institution / Archive', placeholder: 'National Archives', defaultValue: 'Public Archive' },
      { key: 'collection', label: 'Collection / Fond', placeholder: 'Collection', defaultValue: '' },
      { key: 'year', label: 'Year', placeholder: '1932', defaultValue: '' },
    ],
  },
  {
    id: 'citar-software',
    name: 'Cite software',
    aliases: ['citar software', 'cite software', 'manual software'],
    category: 'navigation',
    language: 'en',
    description: 'Formats references for technical documentation, software releases, and repositories inside `<ref>`.',
    exampleSnippet: '{{Cite software|name=WikiMaker Core|version=2.4|developer=Open Community|year=2026}}',
    params: [
      { key: 'name', label: 'Software name', placeholder: 'Software', defaultValue: 'Software', required: true },
      { key: 'version', label: 'Version / Release', placeholder: '1.0', defaultValue: '' },
      { key: 'developer', label: 'Author / Project', placeholder: 'Team', defaultValue: '' },
      { key: 'year', label: 'Year', placeholder: '2026', defaultValue: '2026' },
    ],
  },
  {
    id: 'citar-patente',
    name: 'Cite patent',
    aliases: ['citar patente', 'cite patent', 'patente'],
    category: 'navigation',
    language: 'en',
    description: 'Formats citations for industrial patent registrations (INPI/USPTO/EPO) inside `<ref>`.',
    exampleSnippet: '{{Cite patent|number=US102024001234|title=Distributed Indexing System|holder=Open Lab|year=2024}}',
    params: [
      { key: 'number', label: 'Patent number', placeholder: 'US102024...', defaultValue: 'PAT-0001', required: true },
      { key: 'title', label: 'Invention title', placeholder: 'Title', defaultValue: 'Patented invention' },
      { key: 'holder', label: 'Inventor / Assignee', placeholder: 'Name', defaultValue: '' },
      { key: 'year', label: 'Year', placeholder: '2024', defaultValue: '2024' },
    ],
  },
  {
    id: 'data-falecimento',
    name: 'Death date and age',
    aliases: ['data de falecimento', 'death date and age', 'falecimento'],
    category: 'navigation',
    language: 'en',
    description: 'Displays date of death and automatically calculates age at death (`death_yr|mo|day|birth_yr|mo|day`).',
    exampleSnippet: '{{Death date and age|2015|8|20|1940|5|10}}',
    params: [
      { key: '1', label: 'Death year', placeholder: '2015', defaultValue: '2015', required: true },
      { key: '2', label: 'Death month', placeholder: '8', defaultValue: '8', required: true },
      { key: '3', label: 'Death day', placeholder: '20', defaultValue: '20', required: true },
      { key: '4', label: 'Birth year', placeholder: '1940', defaultValue: '1940', required: true },
      { key: '5', label: 'Birth month', placeholder: '5', defaultValue: '5' },
      { key: '6', label: 'Birth day', placeholder: '10', defaultValue: '10' },
    ],
  },
  {
    id: 'inicio-fim',
    name: 'Start and end dates',
    aliases: ['inicio e fim', 'start and end dates', 'periodo'],
    category: 'navigation',
    language: 'en',
    description: 'Formats standardized chronological ranges (`2010–2026` or `2020–present`).',
    exampleSnippet: '{{Start and end dates|2010|2026}}',
    params: [
      { key: '1', label: 'Start year or date', placeholder: '2010', defaultValue: '2020', required: true },
      { key: '2', label: 'End year or date (empty = present)', placeholder: '2026', defaultValue: 'present' },
    ],
  },
  {
    id: 'duracao-tempo',
    name: 'Duration',
    aliases: ['duracao', 'duration', 'tempo'],
    category: 'navigation',
    language: 'en',
    description: 'Formats durations for films, tracks, or events (`h|m|s` or `m|s`).',
    exampleSnippet: '{{Duration|1|42|15}}',
    params: [
      { key: '1', label: 'Hours (or minutes if 2 args)', placeholder: '1', defaultValue: '0' },
      { key: '2', label: 'Minutes', placeholder: '42', defaultValue: '45' },
      { key: '3', label: 'Seconds (optional)', placeholder: '15', defaultValue: '' },
    ],
  },
  {
    id: 'formatnum',
    name: 'Formatnum',
    aliases: ['formatnum', 'numero', 'val'],
    category: 'navigation',
    language: 'en',
    description: 'Formats large numbers with thousands separators and optional unit (`1,250,000 km²`).',
    exampleSnippet: '{{Formatnum|1250000|km²}}',
    params: [
      { key: '1', label: 'Number', placeholder: '1250000', defaultValue: '1000', required: true },
      { key: '2', label: 'Unit (optional)', placeholder: 'km²', defaultValue: '' },
    ],
  },
  {
    id: 'fracao',
    name: 'Frac',
    aliases: ['fracao', 'frac', 'sfrac'],
    category: 'navigation',
    language: 'en',
    description: 'Formats readable mathematical fractions and mixed numbers (`3 1/4` or `1/2`).',
    exampleSnippet: '{{Frac|3|1|4}}',
    params: [
      { key: '1', label: 'Numerator (or whole number if 3 args)', placeholder: '1', defaultValue: '1', required: true },
      { key: '2', label: 'Denominator (or numerator)', placeholder: '2', defaultValue: '2', required: true },
      { key: '3', label: 'Denominator (if mixed number)', placeholder: '', defaultValue: '' },
    ],
  },
  {
    id: 'raiz-math',
    name: 'Sqrt',
    aliases: ['raiz', 'sqrt', 'radic'],
    category: 'navigation',
    language: 'en',
    description: 'Formats mathematical radicals (`√2`, `∛8`).',
    exampleSnippet: '{{Sqrt|2}}',
    params: [
      { key: '1', label: 'Radicand', placeholder: '2', defaultValue: '2', required: true },
      { key: '2', label: 'Root index (optional, e.g. 3)', placeholder: '', defaultValue: '' },
    ],
  },
  {
    id: 'math-formula',
    name: 'Math',
    aliases: ['math', 'formula', 'equacao'],
    category: 'navigation',
    language: 'en',
    description: 'Highlights inline mathematical equations and formulas in serif typography.',
    exampleSnippet: '{{Math|E = mc²}}',
    params: [{ key: '1', label: 'Mathematical expression', placeholder: 'E = mc²', defaultValue: 'a² + b² = c²', required: true }],
  },
  {
    id: 'subscrito',
    name: 'Sub',
    aliases: ['sub', 'subscrito'],
    category: 'navigation',
    language: 'en',
    description: 'Formats subscript characters for chemical formulas and indices (`H₂O`).',
    exampleSnippet: 'H{{Sub|2}}O',
    params: [{ key: '1', label: 'Subscript text', placeholder: '2', defaultValue: '2', required: true }],
  },
  {
    id: 'sobrescrito',
    name: 'Sup',
    aliases: ['sup', 'sobrescrito'],
    category: 'navigation',
    language: 'en',
    description: 'Formats superscript characters for exponents and notes (`10⁶`).',
    exampleSnippet: '10{{Sup|6}}',
    params: [{ key: '1', label: 'Superscript text', placeholder: '2', defaultValue: '2', required: true }],
  },
  {
    id: 'sigla',
    name: 'Abbr',
    aliases: ['sigla', 'abbr', 'abreviacao'],
    category: 'navigation',
    language: 'en',
    description: 'Displays an abbreviation alongside its expanded full form on first occurrence.',
    exampleSnippet: '{{Abbr|UN|United Nations}}',
    params: [
      { key: '1', label: 'Abbreviation', placeholder: 'UN', defaultValue: 'UN', required: true },
      { key: '2', label: 'Full expansion', placeholder: 'United Nations', defaultValue: 'United Nations' },
    ],
  },
  {
    id: 'nowrap',
    name: 'Nowrap',
    aliases: ['nowrap', 'sem quebra'],
    category: 'navigation',
    language: 'en',
    description: 'Keeps short expressions or numbers with units together without awkward line breaks.',
    exampleSnippet: '{{Nowrap|1,773,718 people}}',
    params: [{ key: '1', label: 'Non-breaking text', placeholder: '100 km/h', defaultValue: '100 km/h', required: true }],
  },
  {
    id: 'espaco-clear',
    name: 'Clear',
    aliases: ['clear', 'espaco', 'separador'],
    category: 'navigation',
    language: 'en',
    description: 'Inserts a clean layout flow separator between sections or floating elements.',
    exampleSnippet: '{{Clear}}',
    params: [],
  },
  {
    id: 'nota-rodape',
    name: 'Refn',
    aliases: ['nota de rodape', 'refn', 'observacao'],
    category: 'navigation',
    language: 'en',
    description: 'Quickly inserts a numbered inline footnote wrapped in `<ref>`.',
    exampleSnippet: 'Verified in official census{{Refn|Estimate revised in 2026.}}.',
    params: [{ key: '1', label: 'Footnote text', placeholder: 'Note...', defaultValue: 'Editorial note.', required: true }],
  },
  {
    id: 'n-a',
    name: 'N/A',
    aliases: ['n/a', 'na', 'desconhecido', 'tbd'],
    category: 'navigation',
    language: 'en',
    description: 'Standard marker for comparison table cells with non-applicable or pending values.',
    exampleSnippet: '{{N/A}}',
    params: [{ key: '1', label: 'Optional text', placeholder: 'N/A', defaultValue: '' }],
  },
  {
    id: 'avaliacao-estrelas',
    name: 'Rating',
    aliases: ['estrelas', 'rating', 'nota estrelas'],
    category: 'navigation',
    language: 'en',
    description: 'Displays a visual 1-to-5 star rating (`★★★★☆ (4/5)`).',
    exampleSnippet: '{{Rating|4|5}}',
    params: [
      { key: '1', label: 'Score', placeholder: '4', defaultValue: '4', required: true },
      { key: '2', label: 'Max score', placeholder: '5', defaultValue: '5' },
    ],
  },
  {
    id: 'bandeira',
    name: 'Flag',
    aliases: ['bandeira', 'flag', 'flagicon', 'pais bandeira'],
    category: 'navigation',
    language: 'en',
    description: 'Displays the national flag icon alongside the country name (`🇺🇸 United States`).',
    exampleSnippet: '{{Flag|United States}} · {{Flag|Brazil}}',
    params: [{ key: '1', label: 'Country or code (US, BR, PT, JP...)', placeholder: 'United States', defaultValue: 'United States', required: true }],
  },
  {
    id: 'site-oficial',
    name: 'Official website',
    aliases: ['site oficial', 'official website', 'links externos'],
    category: 'navigation',
    language: 'en',
    description: 'Formats a prominent link to the official portal or website in the external links section.',
    exampleSnippet: '{{Official website|https://wazzimagiygg.com|Official WazzimaGiygg Portal}}',
    params: [
      { key: '1', label: 'Official URL', placeholder: 'https://...', defaultValue: 'https://example.org', required: true },
      { key: '2', label: 'Label (optional)', placeholder: 'Official website', defaultValue: 'Official website' },
    ],
  },
  {
    id: 'controle-autoridade',
    name: 'Authority control',
    aliases: ['controle de autoridade', 'authority control', 'viaf'],
    category: 'navigation',
    language: 'en',
    description: 'Encyclopedic footer box grouping international bibliographic identifiers (VIAF, ORCID, LCCN, GND).',
    exampleSnippet: '{{Authority control|viaf=12345678|orcid=0000-0002-1825-0097|gnd=118575147}}',
    params: [
      { key: 'viaf', label: 'VIAF', placeholder: '12345678', defaultValue: '' },
      { key: 'orcid', label: 'ORCID', placeholder: '0000-0000-0000-0000', defaultValue: '' },
      { key: 'lccn', label: 'LCCN', placeholder: 'n80000000', defaultValue: '' },
      { key: 'gnd', label: 'GND', placeholder: '118575147', defaultValue: '' },
    ],
  },
  // --- 20 Specialized Infoboxes ---
  {
    id: 'info-estado',
    name: 'Infobox state',
    aliases: ['info/estado', 'info/uf', 'info/provincia', 'infobox state'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for states, provinces, regions, and federated units.',
    exampleSnippet: '{{Infobox state|title=Minas Gerais|Country=Brazil|Capital=Belo Horizonte|Area=586,513 km²|Population=20.5 million}}',
    params: [
      { key: 'title', label: 'State name', placeholder: 'Minas Gerais', defaultValue: 'Sample State', required: true },
      { key: 'Country', label: 'Country', placeholder: 'Brazil', defaultValue: 'International' },
      { key: 'Capital', label: 'Capital', placeholder: 'Capital', defaultValue: 'Capital' },
      { key: 'Population', label: 'Population', placeholder: '10 million', defaultValue: '10 million' },
    ],
  },
  {
    id: 'info-rio',
    name: 'Infobox river',
    aliases: ['info/rio', 'info/lago', 'infobox river'],
    category: 'infobox',
    language: 'en',
    description: 'Hydrographic infobox for rivers, basins, waterfalls, and lakes.',
    exampleSnippet: '{{Infobox river|name=São Francisco River|Country=Brazil|Length=2,830 km|Source=Serra da Canastra|Mouth=Atlantic Ocean}}',
    params: [
      { key: 'name', label: 'River/lake name', placeholder: 'Amazon River', defaultValue: 'Sample River', required: true },
      { key: 'Country', label: 'Country/Countries', placeholder: 'Brazil', defaultValue: 'International' },
      { key: 'Length', label: 'Length', placeholder: '2,830 km', defaultValue: '500 km' },
      { key: 'Mouth', label: 'Mouth / Outflow', placeholder: 'Atlantic Ocean', defaultValue: 'Ocean' },
    ],
  },
  {
    id: 'info-montanha',
    name: 'Infobox mountain',
    aliases: ['info/montanha', 'info/vulcao', 'infobox mountain'],
    category: 'infobox',
    language: 'en',
    description: 'Orographic infobox for peaks, mountains, ranges, and volcanoes.',
    exampleSnippet: '{{Infobox mountain|name=Pico da Neblina|Elevation=2,995 m|Range=Serra do Imeri|Country=Brazil}}',
    params: [
      { key: 'name', label: 'Peak/mountain name', placeholder: 'Mount...', defaultValue: 'Sample Mountain', required: true },
      { key: 'Elevation', label: 'Maximum elevation', placeholder: '2,995 m', defaultValue: '2,000 m' },
      { key: 'Range', label: 'Mountain range', placeholder: 'Andes', defaultValue: 'Range' },
      { key: 'Country', label: 'Location', placeholder: 'Brazil', defaultValue: 'International' },
    ],
  },
  {
    id: 'info-rodovia',
    name: 'Infobox road',
    aliases: ['info/rodovia', 'info/estrada', 'infobox road'],
    category: 'infobox',
    language: 'en',
    description: 'Transport infobox for highways, motorways, and rail corridors.',
    exampleSnippet: '{{Infobox road|name=BR-101|Type=Longitudinal highway|Length=4,650 km|Start=Touros (RN)|End=São José do Norte (RS)}}',
    params: [
      { key: 'name', label: 'Route designation', placeholder: 'I-95', defaultValue: 'Sample Highway', required: true },
      { key: 'Length', label: 'Total length', placeholder: '1,200 km', defaultValue: '500 km' },
      { key: 'Start', label: 'Start terminus', placeholder: 'City A', defaultValue: 'Origin' },
      { key: 'End', label: 'End terminus', placeholder: 'City B', defaultValue: 'Destination' },
    ],
  },
  {
    id: 'info-veiculo',
    name: 'Infobox automobile',
    aliases: ['info/veiculo', 'info/automovel', 'info/aviao', 'infobox automobile'],
    category: 'infobox',
    language: 'en',
    description: 'Technical infobox for automobiles, aircraft, vessels, and locomotives.',
    exampleSnippet: '{{Infobox automobile|name=Model S|Manufacturer=Sample Motors|Production=2020–present|Powertrain=Electric|Length=4.9 m}}',
    params: [
      { key: 'name', label: 'Model name', placeholder: 'Model...', defaultValue: 'Sample Vehicle', required: true },
      { key: 'Manufacturer', label: 'Manufacturer', placeholder: 'Company', defaultValue: 'Manufacturer' },
      { key: 'Production', label: 'Production period', placeholder: '2020–2026', defaultValue: '2020–present' },
      { key: 'Powertrain', label: 'Propulsion / Engine', placeholder: 'Electric', defaultValue: 'Hybrid' },
    ],
  },
  {
    id: 'info-arma',
    name: 'Infobox weapon',
    aliases: ['info/arma', 'info/equipamento', 'infobox weapon'],
    category: 'infobox',
    language: 'en',
    description: 'Historiographical infobox for historical weapons, armor, and defense systems.',
    exampleSnippet: '{{Infobox weapon|name=Medieval Catapult|Type=Siege weapon|Origin=Classical Antiquity|Period=Antiquity–Middle Ages}}',
    params: [
      { key: 'name', label: 'Equipment name', placeholder: 'Historical name', defaultValue: 'Sample Equipment', required: true },
      { key: 'Type', label: 'Classification', placeholder: 'Siege / Naval', defaultValue: 'Historical' },
      { key: 'Origin', label: 'Origin', placeholder: 'Region', defaultValue: 'Europe' },
      { key: 'Period', label: 'Historical period', placeholder: '15th century', defaultValue: 'Historical' },
    ],
  },
  {
    id: 'info-mitologia',
    name: 'Infobox deity',
    aliases: ['info/mitologia', 'info/divindade', 'infobox deity'],
    category: 'infobox',
    language: 'en',
    description: 'Cultural infobox for deities, mythological heroes, and folklore figures.',
    exampleSnippet: '{{Infobox deity|name=Athena|Pantheon=Greek mythology|Domain=Wisdom and strategy|Symbols=Owl, olive tree}}',
    params: [
      { key: 'name', label: 'Figure name', placeholder: 'Athena', defaultValue: 'Mythological Figure', required: true },
      { key: 'Pantheon', label: 'Tradition / Mythology', placeholder: 'Greek / Norse', defaultValue: 'Classical' },
      { key: 'Domain', label: 'Attributes', placeholder: 'Wisdom, seas...', defaultValue: 'Wisdom' },
      { key: 'Symbols', label: 'Associated symbols', placeholder: 'Owl, spear', defaultValue: 'Traditional' },
    ],
  },
  {
    id: 'info-religiao',
    name: 'Infobox religion',
    aliases: ['info/religiao', 'infobox religion'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for religions, denominations, spiritual schools, and traditional philosophies.',
    exampleSnippet: '{{Infobox religion|name=Sample Tradition|Classification=Eastern philosophy|Founded=5th century BCE|Scriptures=Classical canon}}',
    params: [
      { key: 'name', label: 'Tradition name', placeholder: 'Tradition...', defaultValue: 'Sample Tradition', required: true },
      { key: 'Classification', label: 'Classification', placeholder: 'Monotheistic / Non-theistic', defaultValue: 'Traditional' },
      { key: 'Founded', label: 'Historical origin', placeholder: 'Century...', defaultValue: 'Antiquity' },
      { key: 'Scriptures', label: 'Foundational texts', placeholder: 'Scriptures', defaultValue: 'Historical canon' },
    ],
  },
  {
    id: 'info-filosofo',
    name: 'Infobox philosopher',
    aliases: ['info/filosofo', 'infobox philosopher'],
    category: 'infobox',
    language: 'en',
    description: 'Biographical infobox for philosophers, political thinkers, and theorists.',
    exampleSnippet: '{{Infobox philosopher|name=Baruch Spinoza|Era=Modern philosophy|Tradition=Rationalism|Main interests=Ethics, metaphysics}}',
    params: [
      { key: 'name', label: 'Thinker name', placeholder: 'Full name', defaultValue: 'Sample Philosopher', required: true },
      { key: 'Era', label: 'Era / Period', placeholder: 'Modern philosophy', defaultValue: 'Modern' },
      { key: 'Tradition', label: 'Philosophical school', placeholder: 'Rationalism', defaultValue: 'Rationalism' },
      { key: 'Main interests', label: 'Fields of study', placeholder: 'Ethics, epistemology', defaultValue: 'Ethics and logic' },
    ],
  },
  {
    id: 'info-escritor',
    name: 'Infobox writer',
    aliases: ['info/escritor', 'infobox writer'],
    category: 'infobox',
    language: 'en',
    description: 'Biographical infobox for writers, poets, novelists, journalists, and playwrights.',
    exampleSnippet: '{{Infobox writer|name=Clarice Lispector|Occupation=Writer and journalist|Movement=Modernism|Notable works=The Hour of the Star}}',
    params: [
      { key: 'name', label: 'Pen or full name', placeholder: 'Name', defaultValue: 'Sample Writer', required: true },
      { key: 'Occupation', label: 'Occupation', placeholder: 'Novelist, poet', defaultValue: 'Writer' },
      { key: 'Movement', label: 'Literary movement', placeholder: 'Realism / Modernism', defaultValue: 'Contemporary' },
      { key: 'Notable works', label: 'Notable works', placeholder: 'Titles...', defaultValue: 'Major work' },
    ],
  },
  {
    id: 'info-site',
    name: 'Infobox website',
    aliases: ['info/site', 'info/website', 'infobox website'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for web portals, digital encyclopedias, social networks, and online platforms.',
    exampleSnippet: '{{Infobox website|name=WikiMaker|Type=Collaborative wiki platform|Launched=2025|Languages=English, Portuguese|License=Open source}}',
    params: [
      { key: 'name', label: 'Portal/site name', placeholder: 'Portal...', defaultValue: 'Sample Website', required: true },
      { key: 'Type', label: 'Category', placeholder: 'Encyclopedia / Social network', defaultValue: 'Web portal' },
      { key: 'Launched', label: 'Launch year', placeholder: '2025', defaultValue: '2025' },
      { key: 'License', label: 'License / Access', placeholder: 'Free / Open', defaultValue: 'Open' },
    ],
  },
  {
    id: 'info-so',
    name: 'Infobox OS',
    aliases: ['info/so', 'info/sistema', 'infobox os'],
    category: 'infobox',
    language: 'en',
    description: 'Technical infobox for operating systems, Linux distributions, and firmware.',
    exampleSnippet: '{{Infobox OS|name=Debian|Developer=Debian Project|Kernel type=Linux|Initial release=1993|License=Free software (DFSG)}}',
    params: [
      { key: 'name', label: 'Operating system', placeholder: 'Linux / Debian', defaultValue: 'Sample OS', required: true },
      { key: 'Developer', label: 'Developer', placeholder: 'Community / Company', defaultValue: 'Community' },
      { key: 'Kernel type', label: 'Kernel type', placeholder: 'Linux / Hybrid', defaultValue: 'Monolithic' },
      { key: 'License', label: 'License', placeholder: 'GPLv2', defaultValue: 'GPL' },
    ],
  },
  {
    id: 'info-hardware',
    name: 'Infobox CPU',
    aliases: ['info/hardware', 'info/processador', 'info/console', 'infobox cpu'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for video game consoles, processors, microcomputers, and electronics.',
    exampleSnippet: '{{Infobox CPU|name=Super Console|Manufacturer=Hardware Studio|Released=1990|CPU=16-bit RISC|Media=Cartridge}}',
    params: [
      { key: 'name', label: 'Device name', placeholder: 'Console / CPU', defaultValue: 'Sample Hardware', required: true },
      { key: 'Manufacturer', label: 'Manufacturer', placeholder: 'Company', defaultValue: 'Manufacturer' },
      { key: 'Released', label: 'Released', placeholder: '2020', defaultValue: '2020' },
      { key: 'CPU', label: 'Processor / Architecture', placeholder: 'ARM / x86', defaultValue: '64-bit' },
    ],
  },
  {
    id: 'info-moeda',
    name: 'Infobox currency',
    aliases: ['info/moeda', 'infobox currency'],
    category: 'infobox',
    language: 'en',
    description: 'Economic infobox for national fiat currencies, historical currencies, and monetary units.',
    exampleSnippet: '{{Infobox currency|name=US Dollar|ISO code=USD|Symbol=$|Country=United States|Central bank=Federal Reserve}}',
    params: [
      { key: 'name', label: 'Currency name', placeholder: 'Dollar', defaultValue: 'Sample Currency', required: true },
      { key: 'ISO code', label: 'ISO 4217 code', placeholder: 'USD', defaultValue: 'XXX' },
      { key: 'Symbol', label: 'Symbol', placeholder: '$', defaultValue: '$' },
      { key: 'Central bank', label: 'Issuing authority', placeholder: 'Central Bank', defaultValue: 'Central Bank' },
    ],
  },
  {
    id: 'info-ong',
    name: 'Infobox organization',
    aliases: ['info/ong', 'info/organizacao', 'infobox organization'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for NGOs, nonprofits, UN agencies, and research institutes.',
    exampleSnippet: '{{Infobox organization|name=International Red Cross|Type=Humanitarian organization|Founded=1863|Headquarters=Geneva, Switzerland}}',
    params: [
      { key: 'name', label: 'Organization name', placeholder: 'Organization...', defaultValue: 'Sample Organization', required: true },
      { key: 'Type', label: 'Type', placeholder: 'NGO / Intergovernmental', defaultValue: 'Nonprofit' },
      { key: 'Founded', label: 'Founded', placeholder: '1945', defaultValue: '2000' },
      { key: 'Headquarters', label: 'Headquarters', placeholder: 'City, Country', defaultValue: 'International' },
    ],
  },
  {
    id: 'info-museu',
    name: 'Infobox museum',
    aliases: ['info/museu', 'info/biblioteca', 'infobox museum'],
    category: 'infobox',
    language: 'en',
    description: 'Infobox for museums, galleries, national libraries, and cultural centers.',
    exampleSnippet: '{{Infobox museum|name=National Art Museum|Type=Fine arts museum|Established=1937|Location=Rio de Janeiro|Collection=70,000 works}}',
    params: [
      { key: 'name', label: 'Museum/library name', placeholder: 'Museum...', defaultValue: 'Sample Museum', required: true },
      { key: 'Type', label: 'Collection type', placeholder: 'Art / Science / History', defaultValue: 'History and Art' },
      { key: 'Established', label: 'Established', placeholder: '1937', defaultValue: '1950' },
      { key: 'Location', label: 'City / Country', placeholder: 'City, Country', defaultValue: 'International' },
    ],
  },
  {
    id: 'info-parque',
    name: 'Infobox protected area',
    aliases: ['info/parque', 'info/reserva', 'infobox protected area'],
    category: 'infobox',
    language: 'en',
    description: 'Environmental infobox for national parks, ecological reserves, and natural heritage sites.',
    exampleSnippet: '{{Infobox protected area|name=Iguaçu National Park|Country=Brazil|Area=185,262 ha|Established=1939|Category=World Heritage Site}}',
    params: [
      { key: 'name', label: 'Protected area name', placeholder: 'National Park...', defaultValue: 'Sample Park', required: true },
      { key: 'Country', label: 'Country / State', placeholder: 'Brazil', defaultValue: 'International' },
      { key: 'Area', label: 'Protected area', placeholder: '100,000 ha', defaultValue: '50,000 ha' },
      { key: 'Established', label: 'Year established', placeholder: '1939', defaultValue: '1980' },
    ],
  },
  {
    id: 'info-campeonato',
    name: 'Infobox football league',
    aliases: ['info/campeonato', 'info/torneio', 'info/liga', 'infobox football league'],
    category: 'infobox',
    language: 'en',
    description: 'Sports infobox for championships, cups, leagues, and international tournaments.',
    exampleSnippet: '{{Infobox football league|name=Open Cup 2026|Sport=Football|Teams=32 teams|Host=South America|Champions=Athletic Model}}',
    params: [
      { key: 'name', label: 'Competition name', placeholder: 'Championship...', defaultValue: 'Sample Tournament', required: true },
      { key: 'Sport', label: 'Sport', placeholder: 'Football / Basketball', defaultValue: 'Football' },
      { key: 'Teams', label: 'Number of participants', placeholder: '20 teams', defaultValue: '16 teams' },
      { key: 'Host', label: 'Host / Scope', placeholder: 'National', defaultValue: 'National' },
    ],
  },
  {
    id: 'info-alimento',
    name: 'Infobox food',
    aliases: ['info/alimento', 'info/prato', 'info/bebida', 'infobox food'],
    category: 'infobox',
    language: 'en',
    description: 'Culinary infobox for traditional dishes, ingredients, cheeses, breads, and beverages.',
    exampleSnippet: '{{Infobox food|name=Pão de Queijo|Origin=Minas Gerais, Brazil|Type=Baked cheese bread|Main ingredients=Cassava starch, cheese, eggs, milk}}',
    params: [
      { key: 'name', label: 'Dish/food name', placeholder: 'Traditional dish', defaultValue: 'Sample Dish', required: true },
      { key: 'Origin', label: 'Origin / Cuisine', placeholder: 'Brazil', defaultValue: 'Regional' },
      { key: 'Type', label: 'Category', placeholder: 'Main course / Dessert', defaultValue: 'Traditional dish' },
      { key: 'Main ingredients', label: 'Main ingredients', placeholder: 'Flour, cheese...', defaultValue: 'Traditional' },
    ],
  },
  {
    id: 'info-hq',
    name: 'Infobox comic',
    aliases: ['info/hq', 'info/manga', 'info/comics', 'infobox comic'],
    category: 'infobox',
    language: 'en',
    description: 'Editorial infobox for comics, manga, comic strips, and graphic novels.',
    exampleSnippet: '{{Infobox comic|title=Illustrated Chronicles|Writer=M. Costa|Artist=A. Ribeiro|Publisher=South Press|Published=2024|Volumes=4}}',
    params: [
      { key: 'title', label: 'Title', placeholder: 'Comic/Manga name', defaultValue: 'Sample Comic', required: true },
      { key: 'Writer', label: 'Writer(s)', placeholder: 'Author', defaultValue: 'Author' },
      { key: 'Artist', label: 'Illustrator', placeholder: 'Artist', defaultValue: 'Illustrator' },
      { key: 'Publisher', label: 'Publisher', placeholder: 'Publisher', defaultValue: 'Publisher' },
    ],
  },
];

function normalizeTemplateKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function stripTemplateNamespace(rawName: string): {
  explicitNamespace: 'predefinicao' | 'template' | null;
  cleanName: string;
} {
  const trimmed = rawName.trim();
  const match = /^(predefini[cç][aã]o|predefinicao|template)\s*:\s*(.+)$/i.exec(trimmed);
  if (!match) {
    return { explicitNamespace: null, cleanName: trimmed };
  }
  const nsRaw = normalizeTemplateKey(match[1]);
  const explicitNamespace = nsRaw.startsWith('template') ? 'template' : 'predefinicao';
  return { explicitNamespace, cleanName: match[2].trim() };
}

interface ParsedTemplateCall {
  rawName: string;
  params: Record<string, string>;
  positional: string[];
  orderedEntries: { key: string; value: string; isNamed: boolean }[];
}

/**
 * Splits a MediaWiki template body `Name|arg1|key=val` respecting nested
 * `[[...]]`, `{{...}}`, and Markdown `[text](url)` delimiters.
 */
function parseTemplateCallBody(inner: string): ParsedTemplateCall | null {
  const parts: string[] = [];
  let current = '';
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    const next = inner[i + 1];

    if (ch === '{' && next === '{') {
      braceDepth += 1;
      current += '{{';
      i += 1;
      continue;
    }
    if (ch === '}' && next === '}' && braceDepth > 0) {
      braceDepth -= 1;
      current += '}}';
      i += 1;
      continue;
    }
    if (ch === '[' && next === '[') {
      bracketDepth += 1;
      current += '[[';
      i += 1;
      continue;
    }
    if (ch === ']' && next === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
      current += ']]';
      i += 1;
      continue;
    }
    if (ch === '(') {
      parenDepth += 1;
    } else if (ch === ')' && parenDepth > 0) {
      parenDepth -= 1;
    }

    if (ch === '|' && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);

  const rawName = (parts[0] ?? '').trim();
  if (!rawName || rawName.includes('\n')) {
    return null;
  }

  const params: Record<string, string> = {};
  const positional: string[] = [];
  const orderedEntries: { key: string; value: string; isNamed: boolean }[] = [];
  let posIndex = 1;

  for (let i = 1; i < parts.length; i++) {
    const segment = parts[i];
    const eqIndex = findTopLevelEquals(segment);
    if (eqIndex > 0) {
      const key = segment.slice(0, eqIndex).trim();
      const value = segment.slice(eqIndex + 1).trim();
      if (key) {
        params[key] = value;
        params[normalizeTemplateKey(key)] = value;
        orderedEntries.push({ key, value, isNamed: true });
        continue;
      }
    }
    const posVal = segment.trim();
    params[String(posIndex)] = posVal;
    positional.push(posVal);
    orderedEntries.push({ key: String(posIndex), value: posVal, isNamed: false });
    posIndex += 1;
  }

  return { rawName, params, positional, orderedEntries };
}

function findTopLevelEquals(segment: string): number {
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    const next = segment[i + 1];
    if (ch === '{' && next === '{') {
      braceDepth += 1;
      i += 1;
      continue;
    }
    if (ch === '}' && next === '}' && braceDepth > 0) {
      braceDepth -= 1;
      i += 1;
      continue;
    }
    if (ch === '[' && next === '[') {
      bracketDepth += 1;
      i += 1;
      continue;
    }
    if (ch === ']' && next === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
      i += 1;
      continue;
    }
    if (ch === '(') parenDepth += 1;
    else if (ch === ')' && parenDepth > 0) parenDepth -= 1;
    else if (ch === '=' && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      return i;
    }
  }
  return -1;
}

function pickParam(call: ParsedTemplateCall, keys: string[], fallback = ''): string {
  for (const rawKey of keys) {
    if (rawKey in call.params && call.params[rawKey] !== '') {
      return call.params[rawKey];
    }
    const norm = normalizeTemplateKey(rawKey);
    if (norm in call.params && call.params[norm] !== '') {
      return call.params[norm];
    }
  }
  return fallback;
}

function sanitizePredefLine(value: string): string {
  return value.replace(/\r?\n+/g, ' ').trim();
}

export function serializePredefinicaoBlock(opts: {
  variant: TemplateBlockVariant;
  kicker: string;
  title?: string;
  body: string;
  author?: string;
  source?: string;
  meta?: string;
}): string {
  const lines: string[] = [`:::predefinicao ${opts.variant}`];
  lines.push(`kicker: ${sanitizePredefLine(opts.kicker) || 'Template'}`);
  if (opts.title?.trim()) {
    lines.push(`title: ${sanitizePredefLine(opts.title)}`);
  }
  if (opts.author?.trim()) {
    lines.push(`author: ${sanitizePredefLine(opts.author)}`);
  }
  if (opts.source?.trim()) {
    lines.push(`source: ${sanitizePredefLine(opts.source)}`);
  }
  if (opts.meta?.trim()) {
    lines.push(`meta: ${sanitizePredefLine(opts.meta)}`);
  }
  lines.push(`body: ${sanitizePredefLine(opts.body)}`);
  lines.push(':::');
  return lines.join('\n');
}

export interface TemplateExpansionOptions {
  currentSlug?: string;
  currentTitle?: string;
  dynamicParams?: Record<string, string>;
  depth?: number;
  visitedSlugs?: Set<string>;
}

function isSpeedyDeletionKey(key: string): boolean {
  return (
    key === 'eliminacao rapida' ||
    key === 'er' ||
    key === 'speedy delete' ||
    key === 'speedy deletion' ||
    key === 'db' ||
    key === 'delete'
  );
}

function resolveBuiltinTemplate(
  cleanName: string,
  call: ParsedTemplateCall,
  isStandaloneLine: boolean,
  options?: TemplateExpansionOptions
): string | null {
  const key = normalizeTemplateKey(cleanName);

  // Magic words (MediaWiki dynamic tokens)
  const now = new Date();
  if (key === 'currentyear') return String(now.getFullYear());
  if (key === 'currentmonth') return String(now.getMonth() + 1).padStart(2, '0');
  if (key === 'currentmonthname') {
    return now.toLocaleDateString('en-US', { month: 'long' });
  }
  if (key === 'currentday') return String(now.getDate());
  if (key === 'sitename') return 'WazzimaGiygg Maker';
  if (key === 'pagename' || key === 'fullpagename') {
    return options?.currentTitle || options?.currentSlug || 'Wiki Page';
  }
  if (key === 'currentslug' || key === 'slug') {
    return options?.currentSlug || 'start';
  }

  // Dynamic article-level context variable (only when called without args and not a built-in template)
  if (options?.dynamicParams && call.orderedEntries.length === 0) {
    const directVal = options.dynamicParams[call.rawName.trim()] ?? options.dynamicParams[key];
    if (directVal !== undefined) {
      return directVal;
    }
  }

  // 1. {{Aviso}} / {{Ambox}} / {{Notice}} / {{Alerta}} / {{Nota}}
  if (key === 'aviso' || key === 'ambox' || key === 'notice' || key === 'alerta' || key === 'nota') {
    const rawType = normalizeTemplateKey(pickParam(call, ['tipo', 'type'], 'nota'));
    let variant: TemplateBlockVariant = 'info';
    let defaultTitle = 'Editorial Notice';
    let kicker = 'Template · Notice';

    if (rawType === 'cuidado' || rawType === 'aviso' || rawType === 'warning' || rawType === 'atencao') {
      variant = 'warning';
      defaultTitle = 'Attention';
      kicker = 'Template · Warning';
    } else if (rawType === 'critico' || rawType === 'erro' || rawType === 'alert' || rawType === 'danger') {
      variant = 'alert';
      defaultTitle = 'Important Alert';
      kicker = 'Template · Alert';
    } else if (rawType === 'sucesso' || rawType === 'ok' || rawType === 'verificado' || rawType === 'success') {
      variant = 'success';
      defaultTitle = 'Verified';
      kicker = 'Template · Verified';
    }

    const title = pickParam(call, ['título', 'titulo', 'title'], defaultTitle);
    const body = pickParam(
      call,
      ['texto', 'text', 'mensagem', 'message', '1', '2'],
      'Please review the details documented in this section.'
    );
    const meta = pickParam(call, ['data', 'date', 'nota', 'meta']);

    return serializePredefinicaoBlock({ variant, kicker, title, body, meta });
  }

  // 1b. {{Boas-vindas}} / {{Welcome}}
  if (key === 'boas vindas' || key === 'boas-vindas' || key === 'welcome') {
    const collaborator = pickParam(
      call,
      ['contributor', 'colaborador', 'nome', 'name', 'user', '1'],
      'Collaborator'
    );
    const topic = pickParam(call, ['topic', 'tema', '2'], 'WazzimaGiygg Maker');
    const dateVal = pickParam(call, ['date', 'data', 'meta']);

    return serializePredefinicaoBlock({
      variant: 'success',
      kicker: 'Template · Welcome',
      title: `Welcome, ${collaborator}!`,
      body: `Thank you for contributing to ${topic}. Before creating or editing pages, please review the [WikiMaker Usage Rules & Terms](#/terms), check the [[markdown-guide|Markdown & Templates Guide]], or explore [[ecossistema-wazzimagiygg|WazzimaGiygg Ecosystem Products]].`,
      meta: dateVal || undefined,
    });
  }

  // 2. {{Esboço}} / {{Stub}}
  if (key === 'esboco' || key === 'stub') {
    const topic = pickParam(call, ['tema', 'topic', '1']);
    const title = topic ? `This article about ${topic} is a stub` : 'This article is a stub';
    return serializePredefinicaoBlock({
      variant: 'stub',
      kicker: 'Template · Stub',
      title,
      body: 'You can help expand this wiki entry by clicking **Edit** and adding verified content and references.',
      meta: topic || undefined,
    });
  }

  // 3. {{Em construção}} / {{WIP}} / {{Under construction}}
  if (
    key === 'em construcao' ||
    key === 'wip' ||
    key === 'under construction' ||
    key === 'construcao' ||
    key === 'manutencao'
  ) {
    const note = pickParam(call, ['texto', 'text', 'nota', 'note', '1']);
    const body = note
      ? `This page is actively being drafted and updated. ${note}`
      : 'This page is currently under active construction and may undergo structural edits soon.';
    return serializePredefinicaoBlock({
      variant: 'wip',
      kicker: 'Template · Under Construction',
      title: 'Work in Progress',
      body,
    });
  }

  // 4. {{Carece de fontes}} / {{Sem fontes}} / {{Citation needed}}
  if (
    key === 'carece de fontes' ||
    key === 'sem fontes' ||
    key === 'citation needed' ||
    key === 'fonte' ||
    key === 'cn'
  ) {
    const dateVal = pickParam(call, ['data', 'date', '1']);
    if (!isStandaloneLine && !dateVal && key !== 'sem fontes') {
      return `[[markdown-guide|^[citation needed]^]]`;
    }
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Citations Needed',
      title: 'This article or section needs verifiable references',
      body: 'Please add `<ref>...</ref>` citations or reliable independent sources so readers can verify every factual statement.',
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 5. {{Desambiguação}} / {{Disambiguation}}
  if (key === 'desambiguacao' || key === 'desambig' || key === 'disambig' || key === 'disambiguation') {
    const term = pickParam(call, ['termo', 'term', '1']);
    return serializePredefinicaoBlock({
      variant: 'disambiguation',
      kicker: 'Template · Disambiguation',
      title: term ? `Disambiguation: ${term}` : 'Disambiguation Page',
      body: 'This disambiguation page lists wiki articles associated with the same title or identifier. Follow the direct links below to reach the intended topic.',
    });
  }

  // 6. {{Spoiler}} / {{Aviso spoiler}}
  if (key === 'spoiler' || key === 'aviso spoiler') {
    const work = pickParam(call, ['work', 'obra', '1']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Content Notice',
      title: work ? `Contains spoilers for ${work}` : 'Contains plot spoilers',
      body: 'The following section discloses key narrative developments or endings.',
    });
  }

  // 6b. {{Eliminação rápida}} / {{ER}} / {{Speedy delete}} / {{DB}}
  if (isSpeedyDeletionKey(key)) {
    const reason = pickParam(
      call,
      ['reason', 'motivo', 'justificativa', 'text', 'texto', '1'],
      'This article has been nominated for speedy deletion for failing to meet minimum wiki criteria.'
    );
    const rule = pickParam(call, ['rule', 'regra', 'criterion', 'criterio', 'critério', '2']);
    const proponent = pickParam(call, ['proponent', 'proponente', 'editor', 'user', 'usuario', 'usuário', 'by']);
    const dateVal = pickParam(call, ['date', 'data']);
    const metaParts = [
      proponent ? `Proponent: ${proponent}` : '',
      dateVal ? `Date: ${dateVal}` : '',
    ].filter(Boolean);

    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Template · Speedy Deletion',
      title: rule
        ? `Page nominated for speedy deletion (${rule})`
        : 'Page nominated for speedy deletion',
      body: `Reason: ${reason} — An automatic alert is posted to the author's talk page when this tag is added. Review the [WikiMaker Usage Rules](#/terms) before removing this notice.`,
      meta: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
    });
  }

  // 6c. {{Bloqueio}} / {{Bloqueado}} / {{Block}} / {{Blocked}} / {{User blocked}}
  if (
    key === 'bloqueio' ||
    key === 'bloqueado' ||
    key === 'block' ||
    key === 'blocked' ||
    key === 'user blocked'
  ) {
    const reason = pickParam(
      call,
      ['reason', 'motivo', 'text', 'texto', '1'],
      'Violation of wiki editorial or conduct policies.'
    );
    const admin = pickParam(call, ['admin', 'administrador', 'by', 'moderator', 'moderador', '2']);
    const duration = pickParam(call, ['duration', 'duracao', 'prazo', '3'], 'Indefinite');
    const dateVal = pickParam(call, ['date', 'data', '4']);
    const metaParts = [
      admin ? `Issued by: ${admin}` : '',
      dateVal ? `Applied on: ${dateVal}` : '',
    ].filter(Boolean);

    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Template · Account Block',
      title: 'This account is currently blocked from editing',
      body: `Block reason: ${reason}. Duration: ${duration}.${
        admin ? ` Applied by: ${admin}.` : ''
      } Check the talk page for details and review the [WikiMaker Usage Rules](#/terms).`,
      meta: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
    });
  }

  // 7. {{Principal}} / {{Artigo principal}} / {{Main}}
  if (key === 'principal' || key === 'artigo principal' || key === 'main') {
    const targets: string[] = [];
    const firstSlugRaw = pickParam(call, ['1', 'artigo', 'slug', 'pagina']);
    if (firstSlugRaw) {
      const slug = toWikiSlug(firstSlugRaw);
      const customLabel = pickParam(call, ['2', 'título', 'titulo', 'label']);
      targets.push(customLabel ? `[[${slug}|${customLabel}]]` : `[[${slug}]]`);
    }
    if (targets.length === 0) {
      targets.push('[[start|Home]]');
    }
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Main Article',
      body: `Main article: ${targets.join(', ')}`,
    });
  }

  // 8. {{Ver também}} / {{See also}}
  if (key === 'ver tambem' || key === 'see also' || key === 'veja tambem') {
    const slugs = call.positional.filter(Boolean).map((item) => `[[${toWikiSlug(item)}|${item.trim()}]]`);
    const body = slugs.length > 0 ? `See also: ${slugs.join(' · ')}` : 'See also: [[start|Home]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'See Also',
      body,
    });
  }

  // 9. {{Citação}} / {{Quote}} / {{Cquote}}
  if (key === 'citacao' || key === 'quote' || key === 'cquote') {
    const quoteText = pickParam(
      call,
      ['texto', 'text', 'citacao', '1'],
      'Knowledge belongs to everyone when documentation remains open.'
    );
    const author = pickParam(call, ['autor', 'author', '2']);
    const source = pickParam(call, ['fonte', 'source', 'obra', '3']);
    return serializePredefinicaoBlock({
      variant: 'quote',
      kicker: 'Template · Quote',
      body: quoteText,
      author: author || undefined,
      source: source || undefined,
    });
  }

  // 9b. {{Cleanup}} / {{Clean up}} / {{Wikify}}
  if (key === 'cleanup' || key === 'clean up' || key === 'wikify') {
    const reason = pickParam(
      call,
      ['reason', 'motivo', 'text', 'texto', '1'],
      'This article may require cleanup to meet editorial formatting and clarity standards.'
    );
    const section = pickParam(call, ['section', 'secao']);
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Cleanup',
      title: section
        ? `The "${section}" section may require cleanup`
        : 'This article may require cleanup',
      body: reason,
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9c. {{Outdated}} / {{Update}} / {{Obsolete}}
  if (key === 'outdated' || key === 'update' || key === 'obsolete') {
    const reason = pickParam(
      call,
      ['reason', 'motivo', 'text', 'texto', '1'],
      'Parts of this article may no longer reflect current information or recent updates.'
    );
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Outdated',
      title: 'This article may contain outdated information',
      body: reason,
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9d. {{Disputed}} / {{POV}} / {{Neutrality}} / {{Factual accuracy}}
  if (key === 'disputed' || key === 'pov' || key === 'neutrality' || key === 'factual accuracy') {
    const reason = pickParam(
      call,
      ['reason', 'motivo', 'text', 'texto', '1'],
      'The factual accuracy or neutrality of this content is under discussion on the talk page.'
    );
    const section = pickParam(call, ['section', 'secao']);
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Template · Disputed',
      title: section
        ? `Disputed content in "${section}"`
        : 'Factual accuracy or neutrality is disputed',
      body: reason,
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9e. {{Verify}} / {{Fact check}} / {{Verification}}
  if (key === 'verify' || key === 'fact check' || key === 'verification') {
    const statusRaw = normalizeTemplateKey(pickParam(call, ['status', '1'], 'verified'));
    const isVerified =
      statusRaw === 'verified' ||
      statusRaw === 'passed' ||
      statusRaw === 'ok' ||
      statusRaw === 'checked';
    const reviewer = pickParam(call, ['reviewer', 'by', 'editor']);
    const dateVal = pickParam(call, ['date', 'data']);
    const note = pickParam(
      call,
      ['note', 'text', 'texto', '2'],
      isVerified
        ? 'Claims and citations in this entry have been verified against cited primary sources.'
        : 'This entry is queued for independent fact-checking and source verification.'
    );
    const metaParts = [
      reviewer ? `Reviewer: ${reviewer}` : '',
      dateVal ? `Date: ${dateVal}` : '',
    ].filter(Boolean);
    return serializePredefinicaoBlock({
      variant: isVerified ? 'success' : 'info',
      kicker: 'Template · Verification',
      title: isVerified ? 'Fact-checked & Verified' : 'Pending Verification',
      body: note,
      meta: metaParts.length > 0 ? metaParts.join(' · ') : undefined,
    });
  }

  // 9f. {{Distinguish}} / {{Not to be confused}}
  if (key === 'distinguish' || key === 'not to be confused') {
    const slugRaw = pickParam(call, ['1', 'page', 'slug']);
    const label = pickParam(call, ['2', 'label', 'title']);
    const targetLink = slugRaw
      ? label
        ? `[[${toWikiSlug(slugRaw)}|${label}]]`
        : `[[${toWikiSlug(slugRaw)}]]`
      : '[[start|Home]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Distinguish',
      body: `Not to be confused with ${targetLink}.`,
    });
  }

  // 9g. {{Further}} / {{Further information}} / {{More info}}
  if (key === 'further' || key === 'further information' || key === 'more info') {
    const slugs = call.positional
      .filter(Boolean)
      .map((item) => `[[${toWikiSlug(item)}|${item.trim()}]]`);
    const body =
      slugs.length > 0
        ? `Further information: ${slugs.join(' · ')}`
        : 'Further information: [[start|Home]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Further Information',
      body,
    });
  }

  // 9h. {{Redirect}} / {{Redirect here}}
  if (key === 'redirect' || key === 'redirect here') {
    const term = pickParam(call, ['1', 'term'], options?.currentTitle || 'This title');
    const targetRaw = pickParam(call, ['2', 'target', 'page']);
    const targetLabel = pickParam(call, ['3', 'label']);
    const targetLink = targetRaw
      ? targetLabel
        ? `[[${toWikiSlug(targetRaw)}|${targetLabel}]]`
        : `[[${toWikiSlug(targetRaw)}]]`
      : '[[start|the main article index]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Redirect Notice',
      body: `"${term}" redirects here. For other uses, see ${targetLink}.`,
    });
  }

  // 9i. {{Portal}} / {{Related portal}}
  if (key === 'portal' || key === 'related portal') {
    const portalName = pickParam(call, ['1', 'name', 'topic'], 'Documentation');
    const targetRaw = pickParam(call, ['2', 'slug', 'page']);
    const desc = pickParam(
      call,
      ['description', 'text', '3'],
      `Explore curated guides, dossiers, and references in the ${portalName} portal.`
    );
    const portalLink = targetRaw
      ? `[[${toWikiSlug(targetRaw)}|Open ${portalName} Portal]]`
      : '[[start|Browse Wiki Home]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Template · Portal',
      title: `${portalName} Portal`,
      body: `${desc} — ${portalLink}`,
    });
  }

  // 9j. {{Cite web}} / {{Cite}} / {{Web ref}} / {{Citar web}} / {{Citar site}}
  if (
    key === 'cite web' ||
    key === 'cite' ||
    key === 'web ref' ||
    key === 'citar web' ||
    key === 'citar site'
  ) {
    const title = pickParam(call, ['title', 'título', 'titulo', '1'], 'Referenced Web Source');
    const url = pickParam(call, ['url', '2', 'link']);
    const author = pickParam(call, ['author', 'autor', 'last', 'sobrenome']);
    const publisher = pickParam(call, ['publisher', 'publicado', 'editora', 'work', 'obra', 'website']);
    const dateVal = pickParam(call, ['date', 'data', 'year', 'ano', 'acessodata']);
    const refName = pickParam(call, ['name', 'nome']).replace(/["<>]/g, '').trim();

    const formattedTitle =
      url && (url.startsWith('https://') || url.startsWith('http://'))
        ? `[${title}](${url})`
        : `"${title}"`;
    const segments: string[] = [];
    if (author) segments.push(`${author}.`);
    segments.push(formattedTitle);
    if (publisher) segments.push(`— ${publisher}`);
    if (dateVal) segments.push(`(${dateVal})`);

    const body = segments.join(' ').trim();
    return refName ? `<ref name="${refName}">${body}</ref>` : `<ref>${body}</ref>`;
  }

  // 9k. {{Citar livro}} / {{Cite book}}
  if (key === 'citar livro' || key === 'cite book') {
    const title = pickParam(call, ['título', 'titulo', 'title', '1'], 'Referenced Book');
    const author = pickParam(call, ['autor', 'author', 'sobrenome', 'last']);
    const publisher = pickParam(call, ['editora', 'publisher']);
    const year = pickParam(call, ['ano', 'year', 'data', 'date']);
    const isbn = pickParam(call, ['isbn']);
    const pages = pickParam(call, ['paginas', 'páginas', 'pages', 'p', 'pp']);
    const refName = pickParam(call, ['name', 'nome']).replace(/["<>]/g, '').trim();

    const segments: string[] = [];
    if (author) segments.push(`${author}.`);
    segments.push(`*${title}*`);
    if (publisher) segments.push(`— ${publisher}`);
    if (year) segments.push(`(${year})`);
    if (pages) segments.push(`p. ${pages}`);
    if (isbn) segments.push(`ISBN ${isbn}`);

    const body = segments.join(' ').trim();
    return refName ? `<ref name="${refName}">${body}</ref>` : `<ref>${body}</ref>`;
  }

  // 9l. {{Citar notícia}} / {{Citar jornal}} / {{Cite news}} / {{Cite journal}}
  if (
    key === 'citar noticia' ||
    key === 'citar jornal' ||
    key === 'cite news' ||
    key === 'cite journal'
  ) {
    const title = pickParam(call, ['título', 'titulo', 'title', '1'], 'News Report');
    const url = pickParam(call, ['url', 'link']);
    const author = pickParam(call, ['autor', 'author', 'last']);
    const outlet = pickParam(
      call,
      ['jornal', 'publicacao', 'publicação', 'newspaper', 'journal', 'work', 'publisher']
    );
    const dateVal = pickParam(call, ['data', 'date', 'year', 'ano']);
    const refName = pickParam(call, ['name', 'nome']).replace(/["<>]/g, '').trim();

    const formattedTitle =
      url && (url.startsWith('https://') || url.startsWith('http://'))
        ? `[${title}](${url})`
        : `"${title}"`;
    const segments: string[] = [];
    if (author) segments.push(`${author}.`);
    segments.push(formattedTitle);
    if (outlet) segments.push(`— *${outlet}*`);
    if (dateVal) segments.push(`(${dateVal})`);

    const body = segments.join(' ').trim();
    return refName ? `<ref name="${refName}">${body}</ref>` : `<ref>${body}</ref>`;
  }

  // 9m. {{Reflist}} / {{Referências}} / {{Lista de referências}} / {{Notas}} / {{Notelist}}
  if (
    key === 'reflist' ||
    key === 'referencias' ||
    key === 'lista de referencias' ||
    key === 'notas' ||
    key === 'notelist' ||
    key === 'lista de notas'
  ) {
    const defaultGroup =
      key === 'notas' || key === 'notelist' || key === 'lista de notas' ? 'nota' : '';
    const group = pickParam(call, ['group', 'grupo'], defaultGroup).replace(/[\r\n]+/g, ' ').trim();
    const colsRaw = pickParam(call, ['colunas', 'columns', 'cols', '1']);
    const colsNum = Number.parseInt(colsRaw, 10);
    const title = pickParam(call, ['titulo', 'título', 'title']).replace(/[\r\n]+/g, ' ').trim();
    const lines = [':::reflist'];
    if (group) lines.push(`group: ${group}`);
    if (colsNum === 2 || colsNum === 3) lines.push(`columns: ${colsNum}`);
    if (title) lines.push(`title: ${title}`);
    lines.push(':::');
    return `\n\n${lines.join('\n')}\n\n`;
  }

  // 9n. {{Sem referências}} / {{Mais notas}} / {{Unreferenced}} / {{Refimprove}} / {{More citations needed}}
  if (
    key === 'sem referencias' ||
    key === 'mais notas' ||
    key === 'unreferenced' ||
    key === 'refimprove' ||
    key === 'more citations needed'
  ) {
    const scope = pickParam(call, ['section', 'secao', 'seção', '1']);
    const dateVal = pickParam(call, ['date', 'data']);
    const title = scope
      ? `Section "${scope}" needs additional citations for verification`
      : 'This article needs additional citations for verification';
    const body =
      'Please help improve this article by adding citations to reliable sources (`{{Cite web}}` or `<ref>...</ref>`). Unsourced material may be challenged and removed.';
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Unreferenced',
      title,
      body,
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9o. {{Reciclagem}} / {{Wikificação}} / {{Wikificar}} / {{Contextualizar}} / {{Revisão}} / {{Copyedit}}
  if (
    key === 'reciclagem' ||
    key === 'wikificacao' ||
    key === 'wikificar' ||
    key === 'contextualizar' ||
    key === 'revisao' ||
    key === 'copyedit'
  ) {
    const reason = pickParam(
      call,
      ['reason', 'motivo', 'text', 'texto', '1'],
      'This page needs cleanup and formatting to meet the wiki editorial style guide.'
    );
    const dateVal = pickParam(call, ['date', 'data']);
    const titleMap: Record<string, string> = {
      contextualizar: 'This article needs additional context',
      wikificacao: 'This article needs wikification and formatting',
      wikificar: 'This article needs wikification and formatting',
      revisao: 'This article requires grammar and structural proofreading',
      copyedit: 'This article may require copy editing for grammar and style',
    };
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Cleanup & Style',
      title: titleMap[key] ?? 'This page needs cleanup',
      body: reason,
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9p. {{Parcial}} / {{Imparcialidade}} / {{Controverso}} / {{Ponto de vista}}
  if (
    key === 'parcial' ||
    key === 'imparcialidade' ||
    key === 'controverso' ||
    key === 'ponto de vista'
  ) {
    const reason = pickParam(
      call,
      ['reason', 'motivo', 'text', 'texto', '1'],
      'The neutrality of this article or section is disputed. Relevant discussion may be found on the talk page.'
    );
    const section = pickParam(call, ['section', 'secao', 'seção']);
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Template · Disputed Neutrality',
      title: section
        ? `The neutrality of "${section}" is disputed`
        : 'The neutrality of this article is disputed',
      body: reason,
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9q. {{Desatualizado}} / {{Desatualizada}} / {{Atualizar}}
  if (key === 'desatualizado' || key === 'desatualizada' || key === 'atualizar') {
    const reason = pickParam(
      call,
      ['reason', 'motivo', 'text', 'texto', '1'],
      'Parts of this article may contain outdated information requiring recent updates.'
    );
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Outdated',
      title: 'This article contains outdated information',
      body: reason,
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9r. {{Fusão}} / {{Fundir}} / {{Merge}} / {{Merge to}} / {{Merge from}}
  if (
    key === 'fusao' ||
    key === 'fundir' ||
    key === 'merge' ||
    key === 'merge to' ||
    key === 'merge from'
  ) {
    const targetRaw = pickParam(call, ['1', 'target', 'alvo', 'article', 'artigo', 'page']);
    const targetLabel = pickParam(call, ['2', 'title', 'titulo', 'título', 'label']);
    const reason = pickParam(
      call,
      ['reason', 'motivo', 'text', 'texto'],
      'These topics share significant editorial overlap and could be consolidated into a single article.'
    );
    const targetLink = targetRaw
      ? targetLabel
        ? `[[${toWikiSlug(targetRaw)}|${targetLabel}]]`
        : `[[${toWikiSlug(targetRaw)}]]`
      : '[[start|another related article]]';
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Merge Proposal',
      title: 'Proposed article merge',
      body: `It has been suggested that this page be merged with ${targetLink}. ${reason}`,
    });
  }

  // 9s. {{Tradução}} / {{Em tradução}} / {{Traduzido}} / {{Translated page}} / {{Expand language}}
  if (
    key === 'traducao' ||
    key === 'em traducao' ||
    key === 'traduzido' ||
    key === 'translated page' ||
    key === 'expand language'
  ) {
    const lang = pickParam(call, ['language', 'lang', 'idioma', 'lingua', '1'], 'another language');
    const sourceArticle = pickParam(call, ['article', 'artigo', 'source', '2']);
    const progress = pickParam(call, ['status', 'progresso'], 'In progress');
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Translation',
      title: `Article under translation (${lang})`,
      body: sourceArticle
        ? `This content is being translated or adapted from the article "${sourceArticle}" in ${lang}.`
        : `This content is being translated or adapted from an edition published in ${lang}.`,
      meta: `Status: ${progress}`,
    });
  }

  // 9t. {{Evento atual}} / {{Atualidade}} / {{Evento recente}} / {{Current}} / {{Recentismo}}
  if (
    key === 'evento atual' ||
    key === 'atualidade' ||
    key === 'evento recente' ||
    key === 'current' ||
    key === 'recentismo'
  ) {
    const note = pickParam(
      call,
      ['1', 'text', 'texto', 'reason', 'motivo'],
      'Information may change rapidly as the event progresses and new reliable sources are published.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Current Event',
      title: 'This article documents a current event',
      body: note,
    });
  }

  // 9u. {{Artigo futuro}} / {{Evento futuro}} / {{Futuro}} / {{Future}}
  if (
    key === 'artigo futuro' ||
    key === 'evento futuro' ||
    key === 'futuro' ||
    key === 'future'
  ) {
    const note = pickParam(
      call,
      ['1', 'text', 'texto', 'reason', 'motivo'],
      'This article concerns a planned project, product, or event; disclosed details are subject to change.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Future Event',
      title: 'Future event or upcoming release',
      body: note,
    });
  }

  // 9v. {{Eliminar}} / {{Eliminação por consenso}} / {{PE}} / {{AfD}} / {{EC}}
  if (
    key === 'eliminar' ||
    key === 'eliminacao por consenso' ||
    key === 'pe' ||
    key === 'afd' ||
    key === 'ec'
  ) {
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1', 'text', 'texto'],
      'The encyclopedic notability and sources of this article are under community review for deletion by consensus.'
    );
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Template · Deletion Discussion',
      title: 'Page nominated for deletion by consensus',
      body: `${reason} Participate in the discussion before removing this notice and review the [WikiMaker Usage Rules](#/terms).`,
      meta: dateVal ? `Nominated on: ${dateVal}` : undefined,
    });
  }

  // 9w. {{Protegida}} / {{Semiprotegida}} / {{Proteção}} / {{Pp-protected}} / {{Protected}}
  if (
    key === 'protegida' ||
    key === 'semiprotegida' ||
    key === 'protecao' ||
    key === 'pp protected' ||
    key === 'protected'
  ) {
    const level = pickParam(
      call,
      ['level', 'nivel', 'type', 'tipo', '1'],
      key === 'semiprotegida' ? 'Semi-protected' : 'Protected'
    );
    const reason = pickParam(
      call,
      ['reason', 'motivo', 'text', 'texto', '2'],
      'Editing on this page is temporarily restricted to preserve editorial content integrity.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Page Protection',
      title: `${level} page`,
      body: reason,
    });
  }

  // 9x. {{Múltiplos problemas}} / {{Problemas}} / {{Multiple issues}}
  if (key === 'multiplos problemas' || key === 'problemas' || key === 'multiple issues') {
    const issues = call.positional.filter(Boolean);
    const body =
      issues.length > 0
        ? `Recorded issues: ${issues.map((item) => `• ${item}`).join(' · ')}`
        : 'This article has multiple sourcing, formatting, or currency issues. Help improve it by editing.';
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Multiple Issues',
      title: 'This article has multiple editorial issues',
      body,
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9y. {{Artigo destacado}} / {{Artigo bom}} / {{Destaque}} / {{Featured article}} / {{Good article}}
  if (
    key === 'artigo destacado' ||
    key === 'artigo bom' ||
    key === 'destaque' ||
    key === 'featured article' ||
    key === 'good article'
  ) {
    const defaultLevel =
      key === 'artigo bom' || key === 'good article' ? 'Good Article' : 'Featured Article';
    const level = pickParam(call, ['level', 'nivel', '1'], defaultLevel);
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'success',
      kicker: 'Template · Editorial Quality',
      title: `Recognized as ${level}`,
      body: 'This entry meets the wiki standards for clarity, encyclopedic structure, neutrality, and source verifiability.',
      meta: dateVal ? `Recognized on: ${dateVal}` : undefined,
    });
  }

  // 9z. {{Carece de esclarecimento}} / {{Esclarecer}} / {{Clarify}} / {{Quem?}} / {{Who?}} / {{Quando?}} / {{When?}} / {{Onde?}}
  if (
    key === 'carece de esclarecimento' ||
    key === 'esclarecer' ||
    key === 'clarify' ||
    key === 'quem' ||
    key === 'quem?' ||
    key === 'who' ||
    key === 'who?' ||
    key === 'quando' ||
    key === 'quando?' ||
    key === 'when' ||
    key === 'when?' ||
    key === 'onde' ||
    key === 'onde?'
  ) {
    const reason = pickParam(call, ['reason', 'motivo', 'text', 'texto', '1']);
    const cleanKey = key.replace(/\?$/, '');
    const inlineLabelMap: Record<string, string> = {
      quem: 'who?',
      who: 'who?',
      quando: 'when?',
      when: 'when?',
      onde: 'where?',
      clarify: 'clarification needed',
    };
    if (!isStandaloneLine || !reason) {
      const label = inlineLabelMap[cleanKey] ?? 'clarification needed';
      return `[[markdown-guide|^[${label}]^]]`;
    }
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Clarification Needed',
      title: 'This passage needs clarification',
      body: reason,
    });
  }

  // 9aa. {{Sobre}} / {{About}} / {{Outros significados}} / {{For}}
  if (key === 'sobre' || key === 'about' || key === 'outros significados' || key === 'for') {
    const topic = pickParam(call, ['1', 'context', 'contexto', 'about', 'sobre'], 'other uses');
    const targetRaw = pickParam(call, ['2', 'page', 'pagina', 'slug']);
    const targetLabel = pickParam(call, ['3', 'title', 'titulo', 'título', 'label']);
    const targetLink = targetRaw
      ? targetLabel
        ? `[[${toWikiSlug(targetRaw)}|${targetLabel}]]`
        : `[[${toWikiSlug(targetRaw)}]]`
      : '[[start|Home]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Hatnote · About',
      body: `For ${topic}, see ${targetLink}.`,
    });
  }

  // 9ab. {{Não confundir}} / {{Não confundir com}}
  if (key === 'nao confundir' || key === 'nao confundir com') {
    const slugRaw = pickParam(call, ['1', 'page', 'pagina', 'slug']);
    const label = pickParam(call, ['2', 'title', 'titulo', 'título', 'label']);
    const targetLink = slugRaw
      ? label
        ? `[[${toWikiSlug(slugRaw)}|${label}]]`
        : `[[${toWikiSlug(slugRaw)}]]`
      : '[[start|Home]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Hatnote · Distinguish',
      body: `Not to be confused with ${targetLink}.`,
    });
  }

  // 9ac. {{Redirecionamento}} / {{Redireciona}} / {{Redireciona aqui}}
  if (key === 'redirecionamento' || key === 'redireciona' || key === 'redireciona aqui') {
    const term = pickParam(call, ['1', 'term', 'termo'], options?.currentTitle || 'This term');
    const targetRaw = pickParam(call, ['2', 'target', 'alvo', 'page', 'pagina', 'slug']);
    const targetLabel = pickParam(call, ['3', 'title', 'titulo', 'título', 'label']);
    const targetLink = targetRaw
      ? targetLabel
        ? `[[${toWikiSlug(targetRaw)}|${targetLabel}]]`
        : `[[${toWikiSlug(targetRaw)}]]`
      : '[[start|the main article index]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Hatnote · Redirect',
      body: `"${term}" redirects here. For other uses, see ${targetLink}.`,
    });
  }

  // 9ad. {{Biografia de pessoa viva}} / {{BPV}} / {{BLP}}
  if (
    key === 'biografia de pessoa viva' ||
    key === 'bpv' ||
    key === 'blp' ||
    key === 'blp sources'
  ) {
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Template · BLP Policy',
      title: 'Biography of a living person — strict sourcing required',
      body: 'Contentious material about living persons that is unsourced or poorly sourced must be removed immediately.',
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9ae. {{Fontes primárias}} / {{Sem fontes fiáveis}} / {{Primary sources}} / {{Self-published}}
  if (
    key === 'fontes primarias' ||
    key === 'sem fontes fiaveis' ||
    key === 'primary sources' ||
    key === 'self published'
  ) {
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1'],
      'This article relies too heavily on primary or self-published sources; please add independent secondary sources.'
    );
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Primary Sources',
      title: 'Needs independent secondary sources',
      body: reason,
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9af. {{Conteúdo suspeito}} / {{VDA}} / {{Copyvio}} / {{Copyright}}
  if (
    key === 'conteudo suspeito' ||
    key === 'vda' ||
    key === 'copyvio' ||
    key === 'copyright' ||
    key === 'violacao de direitos'
  ) {
    const source = pickParam(call, ['source', 'fonte', 'url', '1']);
    const reason = pickParam(
      call,
      ['reason', 'motivo', '2'],
      'Sections of this page are under review for potential unauthorized reproduction of copyrighted material.'
    );
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Template · Copyright Review',
      title: 'Suspected copyright violation',
      body: `${reason}${source ? ` Reported source: ${source}` : ''}`,
    });
  }

  // 9ag. {{Órfão}} / {{Página órfã}} / {{Orphan}} / {{Sem saída}} / {{Dead end}}
  if (
    key === 'orfao' ||
    key === 'pagina orfa' ||
    key === 'orphan' ||
    key === 'dead end' ||
    key === 'sem ligacoes' ||
    key === 'sem saida' ||
    key === 'beco sem saida'
  ) {
    const dateVal = pickParam(call, ['date', 'data']);
    const isDeadEnd =
      key === 'dead end' ||
      key === 'sem ligacoes' ||
      key === 'sem saida' ||
      key === 'beco sem saida';
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: isDeadEnd ? 'Template · Dead End' : 'Template · Orphan Article',
      title: isDeadEnd ? 'This article has few internal links' : 'This article is an orphan',
      body: isDeadEnd
        ? 'Add internal links (`[[slug|Title]]`) connecting this entry to related topics across the wiki.'
        : 'Few or no other articles link to this page. Help by adding links from related entries.',
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9ah. {{Introdução longa}} / {{Lead too long}} / {{Lead missing}} / {{Sem introdução}}
  if (
    key === 'introducao longa' ||
    key === 'lead too long' ||
    key === 'lead missing' ||
    key === 'sem introducao'
  ) {
    const note = pickParam(
      call,
      ['1', 'reason', 'motivo', 'text', 'texto'],
      'The lead section should clearly and proportionally summarize the main points of the article before the first heading.'
    );
    const isMissing = key === 'lead missing' || key === 'sem introducao';
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Lead Structure',
      title: isMissing ? 'This article needs an introductory lead section' : 'The lead section may be too long',
      body: note,
    });
  }

  // 9ai. {{Expandir secção}} / {{Expandir}} / {{Expand section}} / {{Empty section}}
  if (
    key === 'expandir secao' ||
    key === 'expandir seccao' ||
    key === 'expandir' ||
    key === 'expand section' ||
    key === 'empty section' ||
    key === 'secao vazia' ||
    key === 'seccao vazia'
  ) {
    const section = pickParam(call, ['section', 'secao', 'seção', '1']);
    const reason = pickParam(
      call,
      ['reason', 'motivo', 'text', 'texto', '2'],
      'This section is empty or very short. You can help by expanding it with verifiable information.'
    );
    return serializePredefinicaoBlock({
      variant: 'stub',
      kicker: 'Template · Expand Section',
      title: section ? `The "${section}" section needs expansion` : 'This section needs expansion',
      body: reason,
    });
  }

  // 9aj. {{Prosa}} / {{Em formato de lista}} / {{Prose}} / {{List to prose}}
  if (
    key === 'prosa' ||
    key === 'em formato de lista' ||
    key === 'prose' ||
    key === 'list to prose'
  ) {
    const section = pickParam(call, ['section', 'secao', 'seção', '1']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Encyclopedic Format',
      title: section ? `Convert "${section}" into continuous prose` : 'Section written in list format',
      body: 'This passage is written primarily as bullet points; consider converting it into flowing encyclopedic paragraphs.',
    });
  }

  // 9ak. {{Divisão}} / {{Dividir}} / {{Split}} / {{Split section}}
  if (key === 'divisao' || key === 'dividir' || key === 'split' || key === 'split section') {
    const suggestion = pickParam(call, ['suggestion', 'sugestao', 'sugestão', 'target', 'alvo', '1']);
    const reason = pickParam(
      call,
      ['reason', 'motivo', '2'],
      'It has been proposed to split part of this content into a separate standalone article.'
    );
    const linkPart = suggestion ? ` Suggested target: [[${toWikiSlug(suggestion)}]].` : '';
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Split Proposal',
      title: 'Proposed article split',
      body: `${reason}${linkPart}`,
    });
  }

  // 9al. {{Publicidade}} / {{Propaganda}} / {{Promocional}} / {{Advert}} / {{Spam}} / {{Peacock}}
  if (
    key === 'publicidade' ||
    key === 'propaganda' ||
    key === 'promocional' ||
    key === 'advert' ||
    key === 'spam' ||
    key === 'peacock'
  ) {
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1'],
      'This text appears to be written in a promotional or advertising tone; rewrite with encyclopedic neutrality and third-party sources.'
    );
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Template · Promotional Tone',
      title: 'Content appears to have promotional phrasing',
      body: reason,
    });
  }

  // 9am. {{Notoriedade}} / {{Sem relevância}} / {{Relevância}} / {{Notability}}
  if (
    key === 'notoriedade' ||
    key === 'sem relevancia' ||
    key === 'relevancia' ||
    key === 'notability'
  ) {
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1'],
      'The subject of this article may not meet encyclopedic notability guidelines without independent secondary sources.'
    );
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Notability',
      title: 'The notability of this topic is questioned',
      body: reason,
    });
  }

  // 9an. {{Globalizar}} / {{Lusofonia}} / {{Visão regional}} / {{Globalize}}
  if (
    key === 'globalizar' ||
    key === 'lusofonia' ||
    key === 'visao regional' ||
    key === 'globalize'
  ) {
    const region = pickParam(call, ['region', 'regiao', 'região', '1'], 'a single region');
    const reason = pickParam(
      call,
      ['reason', 'motivo', '2'],
      `The examples and perspective primarily reflect ${region} and do not represent a worldwide view.`
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Geographic Scope',
      title: 'Needs a global perspective',
      body: reason,
    });
  }

  // 9ao. {{Ficção}} / {{Enredo}} / {{In-universe}} / {{Plot}}
  if (key === 'ficcao' || key === 'enredo' || key === 'in universe' || key === 'plot') {
    const work = pickParam(call, ['work', 'obra', '1']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Fictional Perspective',
      title: work ? `Real-world context needed (${work})` : 'Written from an in-universe perspective',
      body: 'Describe fictional works and characters from a real-world perspective (creation, authors, reception) rather than solely as in-universe facts.',
    });
  }

  // 9ap. {{Pesquisa inédita}} / {{Original research}} / {{OR}} / {{Síntese}}
  if (
    key === 'pesquisa inedita' ||
    key === 'original research' ||
    key === 'or' ||
    key === 'sintese'
  ) {
    const section = pickParam(call, ['section', 'secao', 'seção', '1']);
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Template · Original Research',
      title: section
        ? `Possible original research in "${section}"`
        : 'May contain original research or unpublished synthesis',
      body: 'Claims and conclusions in an encyclopedia entry must be backed by already-published independent sources.',
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9aq. {{Curiosidades}} / {{Trivia}}
  if (key === 'curiosidades' || key === 'trivia') {
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1'],
      'Avoid isolated trivia sections; integrate relevant facts into the main body sections of the article.'
    );
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Organization',
      title: 'Trivia section is discouraged',
      body: reason,
    });
  }

  // 9ar. {{Aviso médico}} / {{Medical}} / {{Aviso legal}} / {{Legal disclaimer}}
  if (
    key === 'aviso medico' ||
    key === 'medical' ||
    key === 'aviso legal' ||
    key === 'legal disclaimer'
  ) {
    const rawKind = normalizeTemplateKey(pickParam(call, ['type', 'tipo', '1'], key));
    const isLegal = rawKind.includes('legal');
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: isLegal ? 'Template · Legal Disclaimer' : 'Template · Medical Disclaimer',
      title: isLegal ? 'Informational content only (not legal advice)' : 'Medical disclaimer — informational content only',
      body: isLegal
        ? 'The information on this page is for educational/documentary purposes and does not substitute for professional legal counsel.'
        : 'This page is for encyclopedic informational purposes only and never replaces diagnosis or advice from qualified healthcare professionals.',
    });
  }

  // 9as. {{Humor}} / {{Piada}} / {{Sátira}} / {{Humour}}
  if (key === 'humor' || key === 'piada' || key === 'satira' || key === 'humour') {
    const note = pickParam(
      call,
      ['1', 'text', 'texto'],
      'This page is intended as humor or satire and does not represent an official wiki policy or guideline.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Community Humor',
      title: 'Humorous essay',
      body: note,
    });
  }

  // 9at. {{Arquivo}} / {{Talk archive}} / {{Histórico preservado}} / {{Archive}}
  if (
    key === 'arquivo' ||
    key === 'talk archive' ||
    key === 'historico preservado' ||
    key === 'archive'
  ) {
    const period = pickParam(call, ['period', 'periodo', 'período', '1'], 'Previous cycle');
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Archive',
      title: `Historical archive (${period})`,
      body: 'This page preserves closed discussions or historical logs. Avoid editing this archive; start new topics on the current page.',
    });
  }

  // 9au. {{Fim de spoiler}} / {{End spoiler}} / {{Spoiler end}}
  if (key === 'fim de spoiler' || key === 'end spoiler' || key === 'spoiler end') {
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'End of Spoilers',
      body: 'End of the section containing plot spoilers.',
    });
  }

  // 9av. {{Userbox}} / {{Caixa de usuário}} / {{Babel}}
  if (key === 'userbox' || key === 'caixa de usuario' || key === 'babel') {
    const code = pickParam(call, ['code', 'sigla', 'codigo', 'código', '1'], 'WIKI');
    const label = pickParam(call, ['title', 'titulo', 'título', 'category', 'categoria'], 'Contributor Profile');
    const text = pickParam(
      call,
      ['text', 'texto', '2'],
      'This contributor actively participates in building the encyclopedia.'
    );
    return serializePredefinicaoBlock({
      variant: 'success',
      kicker: `Userbox · ${code}`,
      title: label,
      body: text,
    });
  }

  // 9aw. {{Navbox}} / {{Caixa de navegação}} / {{Navegação}}
  if (key === 'navbox' || key === 'caixa de navegacao' || key === 'navegacao') {
    const title = pickParam(call, ['title', 'titulo', 'título', 'name', 'nome'], 'Related Articles');
    const explicitList = pickParam(call, ['list', 'lista', 'items', 'itens', 'links', 'content', 'conteudo', 'conteúdo']);
    const rawItems =
      call.positional.filter(Boolean).length > 0
        ? call.positional.filter(Boolean)
        : explicitList
          ? explicitList.split(/[•·,|;]+/).map((s) => s.trim()).filter(Boolean)
          : [];
    const items = rawItems.map((item) => `[[${toWikiSlug(item)}|${item.trim()}]]`);
    const body =
      items.length > 0 ? items.join(' · ') : '[[start|Home]] · [[markdown-guide|Markdown Guide]]';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Navbox · Topic Navigation',
      title,
      body,
    });
  }

  // 9ax. {{Artigo em série}} / {{Série}} / {{Part of a series}}
  if (key === 'artigo em serie' || key === 'serie' || key === 'part of a series') {
    const serie = pickParam(call, ['series', 'serie', 'série', 'title', 'titulo', 'título', '1'], 'Editorial Series');
    const idx = pickParam(call, ['index', 'indice', 'índice']);
    const prev = pickParam(call, ['previous', 'prev', 'anterior']);
    const next = pickParam(call, ['next', 'proximo', 'próximo']);
    const links: string[] = [];
    if (prev) links.push(`← Previous: [[${toWikiSlug(prev)}]]`);
    if (idx) links.push(`Index: [[${toWikiSlug(idx)}|${serie}]]`);
    if (next) links.push(`Next: [[${toWikiSlug(next)}]] →`);
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Article Series',
      title: `Part of a series on: ${serie}`,
      body: links.length > 0 ? links.join(' · ') : '[[start|Browse wiki index]]',
    });
  }

  // 9ay. {{Lista dinâmica}} / {{Dynamic list}} / {{Lista incompleta}}
  if (key === 'lista dinamica' || key === 'dynamic list' || key === 'lista incompleta') {
    const tema = pickParam(call, ['topic', 'tema', '1'], 'documented entries');
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Dynamic List',
      title: 'This is a dynamic list',
      body: `This list of ${tema} may never be able to satisfy particular standards for completeness; help by adding verifiable, sourced items.`,
    });
  }

  // 9az. {{Documentação}} / {{Documentation}} / {{Doc}}
  if (key === 'documentacao' || key === 'documentation' || key === 'doc') {
    const text = pickParam(
      call,
      ['text', 'texto', '1'],
      'Technical documentation of parameters, aliases, and usage examples for this template.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Documentation',
      title: 'Template documentation',
      body: text,
    });
  }

  // 9ba. {{Índice}} / {{Compact TOC}} / {{TOCRight}} / {{TOC}}
  if (key === 'indice' || key === 'compact toc' || key === 'tocright' || key === 'toc') {
    const note = pickParam(
      call,
      ['1', 'text', 'texto'],
      'Use the automatic sidebar table of contents on this page to jump between sections.'
    );
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Navigation · Table of Contents',
      body: note,
    });
  }

  // 9bb. {{Âncora}} / {{Anchor}}
  if (key === 'ancora' || key === 'anchor') {
    const anchorId = toWikiSlug(pickParam(call, ['1', 'id', 'name', 'nome'], 'anchor'));
    return `<span id="${anchorId}"></span>`;
  }

  // 9bc. {{Citar periódico}} / {{Citar revista}} / {{Citar tese}} / {{Cite thesis}}
  if (
    key === 'citar periodico' ||
    key === 'citar revista' ||
    key === 'citar tese' ||
    key === 'cite thesis'
  ) {
    const title = pickParam(call, ['title', 'título', 'titulo', '1'], 'Academic Article');
    const author = pickParam(call, ['author', 'autor', 'last']);
    const journal = pickParam(call, ['journal', 'revista', 'periodico', 'periódico', 'institution', 'instituicao', 'university']);
    const volume = pickParam(call, ['volume', 'vol']);
    const year = pickParam(call, ['year', 'ano', 'date', 'data']);
    const doi = pickParam(call, ['doi']);
    const refName = pickParam(call, ['name', 'nome']).replace(/["<>]/g, '').trim();

    const segments: string[] = [];
    if (author) segments.push(`${author}.`);
    segments.push(`"${title}"`);
    if (journal) segments.push(`— *${journal}*`);
    if (volume) segments.push(`vol. ${volume}`);
    if (year) segments.push(`(${year})`);
    if (doi) segments.push(`[doi:${doi}](https://doi.org/${encodeURIComponent(doi)})`);

    const body = segments.join(' ').trim();
    return refName ? `<ref name="${refName}">${body}</ref>` : `<ref>${body}</ref>`;
  }

  // 9bd. {{Citar vídeo}} / {{Citar YouTube}} / {{Cite AV media}} / {{Cite video}}
  if (
    key === 'citar video' ||
    key === 'citar youtube' ||
    key === 'cite av media' ||
    key === 'cite video'
  ) {
    const title = pickParam(call, ['title', 'título', 'titulo', '1'], 'Video Reference');
    const author = pickParam(call, ['author', 'autor', 'channel', 'canal', 'people']);
    const year = pickParam(call, ['year', 'ano', 'date', 'data']);
    const url = pickParam(call, ['url', 'link']);
    const refName = pickParam(call, ['name', 'nome']).replace(/["<>]/g, '').trim();

    const formattedTitle =
      url && (url.startsWith('https://') || url.startsWith('http://'))
        ? `[${title}](${url})`
        : `"${title}"`;
    const segments: string[] = [];
    if (author) segments.push(`${author}.`);
    segments.push(`${formattedTitle} (Video)`);
    if (year) segments.push(`— (${year})`);

    const body = segments.join(' ').trim();
    return refName ? `<ref name="${refName}">${body}</ref>` : `<ref>${body}</ref>`;
  }

  // 9be. {{Citar enciclopédia}} / {{Cite encyclopedia}}
  if (key === 'citar enciclopedia' || key === 'cite encyclopedia') {
    const entry = pickParam(call, ['entry', 'verbete', 'title', 'título', 'titulo', '1'], 'Entry');
    const work = pickParam(call, ['encyclopedia', 'obra', 'enciclopedia'], 'Encyclopedia');
    const publisher = pickParam(call, ['publisher', 'editora']);
    const year = pickParam(call, ['year', 'ano']);
    const refName = pickParam(call, ['name', 'nome']).replace(/["<>]/g, '').trim();

    const segments: string[] = [`"${entry}". In: *${work}*`];
    if (publisher) segments.push(`— ${publisher}`);
    if (year) segments.push(`(${year})`);

    const body = segments.join(' ').trim();
    return refName ? `<ref name="${refName}">${body}</ref>` : `<ref>${body}</ref>`;
  }

  // 9bf. {{Citações}} / {{Wikiquote}} / {{Quote box}}
  if (key === 'citacoes' || key === 'wikiquote' || key === 'quote box') {
    const title = pickParam(call, ['title', 'titulo', 'título']);
    const text = pickParam(call, ['text', 'texto', 'quote', 'citacao', 'citação', '1'], 'Open and documented knowledge.');
    const author = pickParam(call, ['author', 'autor', 'source', '2']);
    return serializePredefinicaoBlock({
      variant: 'quote',
      kicker: title || 'Featured Quote',
      body: text,
      author: author || undefined,
    });
  }

  // 9bg. {{Tl}} / {{Etiqueta}} / {{Predef}}
  if (key === 'tl' || key === 'etiqueta' || key === 'predef') {
    const name = pickParam(call, ['1', 'name', 'nome'], 'Notice');
    const extra = call.orderedEntries
      .slice(1)
      .map((entry) => (entry.isNamed ? `${entry.key}=${entry.value}` : entry.value))
      .filter(Boolean)
      .join('|');
    return extra ? `\`{{${name}|${extra}}}\`` : `\`{{${name}}}\``;
  }

  // 9bh. {{Tecla}} / {{Kbd}} / {{Key press}}
  if (key === 'tecla' || key === 'kbd' || key === 'key press') {
    const keys = call.positional.filter(Boolean);
    if (keys.length === 0) return '`Enter`';
    return keys.map((k) => `\`${k.trim()}\``).join(' + ');
  }

  // 9bi. {{Conversão}} / {{Converter}} / {{Convert}}
  if (key === 'conversao' || key === 'converter' || key === 'convert') {
    const rawNum = Number.parseFloat(pickParam(call, ['1'], '0').replace(',', '.'));
    const fromUnit = pickParam(call, ['2'], 'km').trim();
    const toUnit = pickParam(call, ['3']).trim();
    if (!Number.isFinite(rawNum)) {
      return `${pickParam(call, ['1'], '0')} ${fromUnit}`;
    }
    const lower = fromUnit.toLowerCase();
    const fmt = (n: number) =>
      Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
    if (lower === 'km') return `${fmt(rawNum)} km (${fmt(rawNum * 0.621371)} ${toUnit || 'mi'})`;
    if (lower === 'mi') return `${fmt(rawNum)} mi (${fmt(rawNum * 1.60934)} ${toUnit || 'km'})`;
    if (lower === 'm') return `${fmt(rawNum)} m (${fmt(rawNum * 3.28084)} ${toUnit || 'ft'})`;
    if (lower === 'ft') return `${fmt(rawNum)} ft (${fmt(rawNum * 0.3048)} ${toUnit || 'm'})`;
    if (lower === 'kg') return `${fmt(rawNum)} kg (${fmt(rawNum * 2.20462)} ${toUnit || 'lb'})`;
    if (lower === 'lb') return `${fmt(rawNum)} lb (${fmt(rawNum * 0.453592)} ${toUnit || 'kg'})`;
    if (lower === 'c' || lower === '°c') {
      return `${fmt(rawNum)} °C (${fmt((rawNum * 9) / 5 + 32)} ${toUnit || '°F'})`;
    }
    if (lower === 'f' || lower === '°f') {
      return `${fmt(rawNum)} °F (${fmt(((rawNum - 32) * 5) / 9)} ${toUnit || '°C'})`;
    }
    return toUnit ? `${fmt(rawNum)} ${fromUnit} (${toUnit})` : `${fmt(rawNum)} ${fromUnit}`;
  }

  // 9bj. {{Moeda}} / {{BRL}} / {{USD}} / {{EUR}} / {{Currency}}
  if (
    key === 'moeda' ||
    key === 'brl' ||
    key === 'usd' ||
    key === 'eur' ||
    key === 'currency'
  ) {
    const val = pickParam(call, ['1', 'amount', 'valor'], '0');
    const code = (
      pickParam(call, ['2', 'currency', 'codigo', 'código']) ||
      (key === 'brl' || key === 'usd' || key === 'eur' ? key : 'USD')
    ).toUpperCase();
    const symbolMap: Record<string, string> = {
      BRL: 'R$',
      USD: 'US$',
      EUR: '€',
      GBP: '£',
    };
    const prefix = symbolMap[code] ?? code;
    return `**${prefix} ${val}**`;
  }

  // 9bk. {{Coordenadas}} / {{Coord}} / {{Coordinates}}
  if (key === 'coordenadas' || key === 'coord' || key === 'coordinates') {
    const lat = pickParam(call, ['1', 'lat'], '0');
    const lon = pickParam(call, ['2', 'lon', 'lng'], '0');
    const mapUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lon)}#map=12/${encodeURIComponent(lat)}/${encodeURIComponent(lon)}`;
    return `[📍 ${lat}, ${lon}](${mapUrl})`;
  }

  // 9bl. {{Idade}} / {{Age}} / {{Data de nascimento}} / {{Birth date and age}}
  if (
    key === 'idade' ||
    key === 'age' ||
    key === 'data de nascimento' ||
    key === 'birth date and age'
  ) {
    const y = Number.parseInt(pickParam(call, ['1', 'year', 'ano'], '2000'), 10);
    const m = Number.parseInt(pickParam(call, ['2', 'month', 'mes', 'mês'], '1'), 10);
    const d = Number.parseInt(pickParam(call, ['3', 'day', 'dia'], '1'), 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
      return 'Invalid date';
    }
    const today = new Date();
    let age = today.getFullYear() - y;
    const mDiff = today.getMonth() + 1 - m;
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) {
      age -= 1;
    }
    const dd = String(d).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${y}-${mm}-${dd} (${Math.max(0, age)} years old)`;
  }

  // 9bm. {{Cor}} / {{Color sample}} / {{Swatch}}
  if (key === 'cor' || key === 'color sample' || key === 'swatch') {
    const hex = pickParam(call, ['1', 'hex', 'code', 'codigo'], '#2563EB');
    const label = pickParam(call, ['2', 'label', 'name', 'nome']);
    return label ? `\`${hex}\` (${label})` : `\`${hex}\``;
  }

  // 9bn. {{ISBN}} / {{DOI}} / {{ISSN}} / {{arXiv}}
  if (key === 'isbn' || key === 'doi' || key === 'issn' || key === 'arxiv') {
    const rawKind = pickParam(call, ['type', 'tipo'], key).toUpperCase();
    const id = pickParam(call, ['1', 'id', 'code', 'codigo', 'código'], '');
    if (!id) return `\`${rawKind}\``;
    if (rawKind === 'DOI') {
      return `[doi:${id}](https://doi.org/${encodeURIComponent(id)})`;
    }
    if (rawKind === 'ARXIV') {
      return `[arXiv:${id}](https://arxiv.org/abs/${encodeURIComponent(id)})`;
    }
    return `**${rawKind}** \`${id}\``;
  }

  // 9bo. {{Sim}} / {{Yes}} / {{Não}} / {{No}} / {{Parcialmente}} / {{Maybe}} / {{Check}} / {{Cross}}
  if (
    key === 'sim' ||
    key === 'yes' ||
    key === 'nao' ||
    key === 'no' ||
    key === 'parcialmente' ||
    key === 'maybe' ||
    key === 'check' ||
    key === 'cross'
  ) {
    const customLabel = pickParam(call, ['1', 'text', 'texto', 'label']);
    if (key === 'sim' || key === 'yes' || key === 'check') {
      return `✅ ${customLabel || 'Yes'}`;
    }
    if (key === 'nao' || key === 'no' || key === 'cross') {
      return `❌ ${customLabel || 'No'}`;
    }
    return `⚠️ ${customLabel || 'Partial'}`;
  }

  // 9bp. {{Mais fontes}} / {{More citations needed}} / {{Refimprove}}
  if (
    key === 'mais fontes' ||
    key === 'more citations needed' ||
    key === 'refimprove' ||
    key === 'fontes insuficientes'
  ) {
    const section = pickParam(call, ['section', 'secao', 'seção', '1']);
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · More Citations Needed',
      title: section
        ? `The "${section}" section needs additional citations`
        : 'This article needs additional citations',
      body: 'Although this entry already contains some references, certain claims still require verifiable independent sources.',
      meta: dateVal ? `Tagged: ${dateVal}` : undefined,
    });
  }

  // 9bq. {{Sem notas}} / {{No footnotes}} / {{More footnotes}} / {{Sem notas de rodapé}}
  if (
    key === 'sem notas' ||
    key === 'no footnotes' ||
    key === 'more footnotes' ||
    key === 'sem notas de rodape'
  ) {
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1'],
      'This article lists a general bibliography at the end, but lacks inline citations (`<ref>`) linking specific statements to sources.'
    );
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Inline Footnotes',
      title: 'Lacks inline citations',
      body: reason,
    });
  }

  // 9br. {{Fonte não confiável}} / {{Unreliable source}} / {{Fontes duvidosas}}
  if (
    key === 'fonte nao confiavel' ||
    key === 'unreliable source' ||
    key === 'fontes duvidosas'
  ) {
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1'],
      'Some cited references are blogs, forums, or sources lacking editorial oversight; replace them with reliable sources.'
    );
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Source Reliability',
      title: 'Possible use of unreliable sources',
      body: reason,
    });
  }

  // 9bs. {{Conflito de interesses}} / {{COI}} / {{Conflict of interest}}
  if (
    key === 'conflito de interesses' ||
    key === 'coi' ||
    key === 'conflict of interest' ||
    key === 'edicao remunerada'
  ) {
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1'],
      'A contributor with a personal or institutional connection to the subject may have edited this page. Please review neutrality.'
    );
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Template · Conflict of Interest',
      title: 'Possible editorial conflict of interest',
      body: reason,
    });
  }

  // 9bt. {{Contraditório}} / {{Contradict}} / {{Inconsistente}}
  if (key === 'contraditorio' || key === 'contradict' || key === 'inconsistente') {
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1'],
      'This article contains conflicting data or claims across sections that need to be reconciled.'
    );
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Factual Consistency',
      title: 'Potentially contradictory information',
      body: reason,
    });
  }

  // 9bu. {{Confuso}} / {{Confusing}} / {{Incompreensível}}
  if (key === 'confuso' || key === 'confusing' || key === 'incompreensivel') {
    const section = pickParam(call, ['section', 'secao', 'seção']);
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1'],
      'The current wording may be unclear to general readers; please rewrite for clarity and cohesion.'
    );
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Editorial Clarity',
      title: section ? `Unclear phrasing in "${section}"` : 'This article may be confusing or unclear',
      body: reason,
    });
  }

  // 9bv. {{Tom ensaístico}} / {{Ensaio}} / {{Essay-like}} / {{Opinativo}}
  if (
    key === 'tom ensaistico' ||
    key === 'ensaio' ||
    key === 'essay like' ||
    key === 'opinativo'
  ) {
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1'],
      'The text reads like a personal essay or opinion piece. Rewrite in a neutral, encyclopedic tone backed by sources.'
    );
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Encyclopedic Style',
      title: 'Written in an essay-like or opinionated tone',
      body: reason,
    });
  }

  // 9bw. {{Como fazer}} / {{Howto}} / {{Manual}} / {{Guia passo a passo}}
  if (
    key === 'como fazer' ||
    key === 'howto' ||
    key === 'manual' ||
    key === 'guia passo a passo'
  ) {
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1'],
      'This content is written like a how-to guide or step-by-step manual; present the subject descriptively and encyclopedically.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Manual Style',
      title: 'Contains "how-to" style instructions',
      body: reason,
    });
  }

  // 9bx. {{Exemplos excessivos}} / {{Excessive examples}} / {{Muitos exemplos}}
  if (
    key === 'exemplos excessivos' ||
    key === 'excessive examples' ||
    key === 'muitos exemplos'
  ) {
    const section = pickParam(call, ['section', 'secao', 'seção']);
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1'],
      'This section contains redundant or trivial examples; keep only the most representative and sourced ones.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Editorial Curation',
      title: section ? `Excessive examples in "${section}"` : 'Excessive examples in this article',
      body: reason,
    });
  }

  // 9by. {{Tradução automática}} / {{Rough translation}} / {{Tradução de máquina}}
  if (
    key === 'traducao automatica' ||
    key === 'rough translation' ||
    key === 'traducao de maquina'
  ) {
    const lang = pickParam(call, ['language', 'lang', 'idioma', '1'], 'another language');
    const reason = pickParam(
      call,
      ['reason', 'motivo', '2'],
      `Passages of this text appear to be machine-translated from ${lang}; please review fluency, grammar, and terminology.`
    );
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Translation Review',
      title: `Possible machine translation (${lang})`,
      body: reason,
    });
  }

  // 9bz. {{Especialista}} / {{Expert needed}} / {{Perito}} / {{Revisão especializada}}
  if (
    key === 'especialista' ||
    key === 'expert needed' ||
    key === 'perito' ||
    key === 'revisao especializada'
  ) {
    const area = pickParam(call, ['area', 'área', 'topic', 'tema', '1'], 'specialized field');
    const reason = pickParam(
      call,
      ['reason', 'motivo', '2'],
      `This article needs attention from an expert in ${area} to verify technical concepts and terminology.`
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Expert Attention',
      title: `Expert review requested (${area})`,
      body: reason,
    });
  }

  // 9ca. {{Sem categorias}} / {{Uncategorized}} / {{Sem categoria}} / {{Categorizar}}
  if (
    key === 'sem categorias' ||
    key === 'uncategorized' ||
    key === 'sem categoria' ||
    key === 'categorizar'
  ) {
    const suggestion = pickParam(call, ['suggestion', 'sugestao', 'sugestão', '1']);
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Taxonomy',
      title: 'Page lacks categories or topic tags',
      body: suggestion
        ? `Add an appropriate category and topic tags to this entry (initial suggestion: ${suggestion}).`
        : 'Assign this entry to a category and add topic tags to improve discoverability.',
    });
  }

  // 9cb. {{Sem imagem}} / {{Image requested}} / {{Falta imagem}} / {{Foto}}
  if (
    key === 'sem imagem' ||
    key === 'image requested' ||
    key === 'falta imagem' ||
    key === 'foto'
  ) {
    const subject = pickParam(
      call,
      ['description', 'descricao', 'descrição', 'topic', 'tema', '1'],
      'An open-licensed photograph, map, or explanatory diagram would help illustrate this article.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Image Requested',
      title: 'This article would benefit from an illustration',
      body: subject,
    });
  }

  // 9cc. {{Falta infobox}} / {{New infobox}} / {{Sem info}}
  if (key === 'falta infobox' || key === 'new infobox' || key === 'sem info') {
    const model = pickParam(call, ['model', 'modelo', 'type', 'tipo', '1'], 'Infobox');
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Infobox Suggested',
      title: 'This article does not yet have an Infobox',
      body: `Consider adding \`{{${model}|...}}\` at the top of the page to summarize the subject's key attributes.`,
    });
  }

  // 9cd. {{Renomear}} / {{Mover}} / {{Requested move}} / {{Mudar título}}
  if (
    key === 'renomear' ||
    key === 'mover' ||
    key === 'requested move' ||
    key === 'mudar titulo'
  ) {
    const target = pickParam(call, ['suggestion', 'sugestao', 'sugestão', 'title', 'titulo', 'título', '1'], 'Proposed new title');
    const reason = pickParam(
      call,
      ['reason', 'motivo', '2'],
      'It has been proposed to rename this page to reflect its most accurate and commonly used title.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Requested Move',
      title: `Proposed move to "${target}"`,
      body: reason,
    });
  }

  // 9ce. {{Introdução curta}} / {{Lead too short}} / {{Resumo curto}}
  if (key === 'introducao curta' || key === 'lead too short' || key === 'resumo curto') {
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1'],
      'The lead section is too short; expand it to summarize the definition, context, and key highlights of the article.'
    );
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Short Lead',
      title: 'The introductory section should be expanded',
      body: reason,
    });
  }

  // 9cf. {{Lista destacada}} / {{Featured list}}
  if (key === 'lista destacada' || key === 'featured list') {
    const dateVal = pickParam(call, ['date', 'data']);
    return serializePredefinicaoBlock({
      variant: 'success',
      kicker: 'Template · Featured List',
      title: 'Recognized as Featured List',
      body: 'This list meets the wiki editorial criteria for comprehensiveness, tabular organization, and verifiability.',
      meta: dateVal ? `Recognized on: ${dateVal}` : undefined,
    });
  }

  // 9cg. {{Conteúdo sensível}} / {{Content warning}} / {{Tema sensível}}
  if (key === 'conteudo sensivel' || key === 'content warning' || key === 'tema sensivel') {
    const topic = pickParam(
      call,
      ['topic', 'tema', '1'],
      'This page documents sensitive or delicate historical topics from a strictly informational perspective.'
    );
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Content Warning',
      title: 'Sensitive topic notice',
      body: topic,
    });
  }

  // 9ch. {{Discussão encerrada}} / {{Closed}} / {{Consenso encerrado}} / {{Arquivado}}
  if (
    key === 'discussao encerrada' ||
    key === 'closed' ||
    key === 'consenso encerrado' ||
    key === 'arquivado'
  ) {
    const outcome = pickParam(
      call,
      ['outcome', 'resultado', 'consensus', 'consenso', '1'],
      'Community consensus recorded; discussion closed.'
    );
    const closedBy = pickParam(call, ['responsible', 'responsavel', 'responsável', '2']);
    return serializePredefinicaoBlock({
      variant: 'success',
      kicker: 'Discussion Closed',
      title: 'Consensus outcome',
      body: outcome,
      meta: closedBy ? `Closed by: ${closedBy}` : undefined,
    });
  }

  // 9ci. {{Ping}} / {{Responder}} / {{Mention}} / {{Notificar}}
  if (key === 'ping' || key === 'responder' || key === 'mention' || key === 'notificar') {
    const users = call.positional.filter(Boolean);
    if (users.length === 0) return '**@Collaborator**';
    return users.map((u) => `[[usuario-${toWikiSlug(u.trim())}|@${u.trim()}]]`).join(', ');
  }

  // 9cj. {{Não assinou}} / {{Unsigned}} / {{Sem assinatura}}
  if (key === 'nao assinou' || key === 'unsigned' || key === 'sem assinatura') {
    const author = pickParam(call, ['1', 'user', 'usuario', 'usuário'], 'Collaborator');
    const timestamp = pickParam(call, ['2', 'date', 'data']);
    return timestamp
      ? `— *Unsigned comment added by [[usuario-${toWikiSlug(author)}|${author}]] (${timestamp})*`
      : `— *Unsigned comment added by [[usuario-${toWikiSlug(author)}|${author}]]*`;
  }

  // 9ck. {{Apoio}} / {{Support}} / {{Concordo}} / {{Discordo}} / {{Oppose}} / {{Contra}} / {{Neutro}} / {{Neutral}} / {{Comentário}}
  if (
    key === 'apoio' ||
    key === 'support' ||
    key === 'concordo' ||
    key === 'discordo' ||
    key === 'oppose' ||
    key === 'contra' ||
    key === 'neutro' ||
    key === 'neutral' ||
    key === 'comentario'
  ) {
    const custom = pickParam(call, ['1', 'text', 'texto']);
    if (key === 'apoio' || key === 'support' || key === 'concordo') {
      return `👍 **${custom || 'Support'}**`;
    }
    if (key === 'discordo' || key === 'oppose' || key === 'contra') {
      return `👎 **${custom || 'Oppose'}**`;
    }
    if (key === 'comentario') {
      return `💬 **${custom || 'Comment'}**`;
    }
    return `⚪ **${custom || 'Neutral'}**`;
  }

  // 9cl. {{Artigos principais}} / {{Details}} / {{Detalhes}}
  if (key === 'artigos principais' || key === 'details' || key === 'detalhes') {
    const links = call.positional
      .filter(Boolean)
      .map((item) => `[[${toWikiSlug(item.trim())}|${item.trim()}]]`);
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Main Articles',
      body:
        links.length > 0
          ? `For more details, see: ${links.join(' · ')}`
          : 'For more details, see [[start|Home]].',
    });
  }

  // 9cm. {{Citar imprensa}} / {{Citar comunicado}} / {{Cite press release}} / {{Comunicado}}
  if (
    key === 'citar imprensa' ||
    key === 'citar comunicado' ||
    key === 'cite press release' ||
    key === 'comunicado'
  ) {
    const title = pickParam(call, ['title', 'título', 'titulo', '1'], 'Official press release');
    const org = pickParam(call, ['institution', 'instituicao', 'instituição', 'publisher', 'emissor']);
    const dateVal = pickParam(call, ['date', 'data', 'year', 'ano']);
    const url = pickParam(call, ['url', 'link']);
    const formatted =
      url && (url.startsWith('https://') || url.startsWith('http://'))
        ? `[${title}](${url})`
        : `"${title}"`;
    const parts = [`${formatted} (Press release)`];
    if (org) parts.push(`— ${org}`);
    if (dateVal) parts.push(`(${dateVal})`);
    return `<ref>${parts.join(' ')}</ref>`;
  }

  // 9cn. {{Citar mapa}} / {{Cite map}} / {{Mapa}}
  if (key === 'citar mapa' || key === 'cite map' || key === 'mapa') {
    const title = pickParam(call, ['title', 'título', 'titulo', '1'], 'Geographic Map');
    const carto = pickParam(call, ['cartography', 'cartografia', 'author', 'autor', 'publisher']);
    const scale = pickParam(call, ['scale', 'escala']);
    const year = pickParam(call, ['year', 'ano']);
    const parts = [`*${title}* [Map]`];
    if (carto) parts.push(`— ${carto}`);
    if (scale) parts.push(`Scale ${scale}`);
    if (year) parts.push(`(${year})`);
    return `<ref>${parts.join(' ')}</ref>`;
  }

  // 9co. {{Citar episódio}} / {{Cite episode}} / {{Episódio}}
  if (key === 'citar episodio' || key === 'cite episode' || key === 'episodio') {
    const title = pickParam(call, ['title', 'título', 'titulo', '1'], 'Episode');
    const series = pickParam(call, ['series', 'serie', 'série']);
    const season = pickParam(call, ['season', 'temporada']);
    const number = pickParam(call, ['number', 'numero', 'número']);
    const year = pickParam(call, ['year', 'ano', 'date', 'data']);
    const parts = [`"${title}"`];
    if (series) parts.push(`In: *${series}*`);
    if (season || number) parts.push(`(S${season || '?'} · Ep. ${number || '?'})`);
    if (year) parts.push(`(${year})`);
    return `<ref>${parts.join(' ')}</ref>`;
  }

  // 9cp. {{Citar jogo}} / {{Cite video game}} / {{Citar videogame}}
  if (key === 'citar jogo' || key === 'cite video game' || key === 'citar videogame') {
    const title = pickParam(call, ['title', 'título', 'titulo', '1'], 'Video Game');
    const dev = pickParam(call, ['developer', 'desenvolvedora', 'publisher']);
    const platform = pickParam(call, ['platform', 'plataforma']);
    const year = pickParam(call, ['year', 'ano']);
    const quote = pickParam(call, ['quote', 'citacao', 'citação']);
    const parts = [`*${title}*`];
    if (platform) parts.push(`[${platform}]`);
    if (dev) parts.push(`— ${dev}`);
    if (year) parts.push(`(${year})`);
    if (quote) parts.push(`"${quote}"`);
    return `<ref>${parts.join(' ')}</ref>`;
  }

  // 9cq. {{Citar conferência}} / {{Cite conference}} / {{Anais}}
  if (key === 'citar conferencia' || key === 'cite conference' || key === 'anais') {
    const title = pickParam(call, ['title', 'título', 'titulo', '1'], 'Conference Paper');
    const author = pickParam(call, ['author', 'autor']);
    const conf = pickParam(call, ['conference', 'conferencia', 'conferência', 'booktitle']);
    const year = pickParam(call, ['year', 'ano']);
    const parts: string[] = [];
    if (author) parts.push(`${author}.`);
    parts.push(`"${title}"`);
    if (conf) parts.push(`In: *${conf}*`);
    if (year) parts.push(`(${year})`);
    return `<ref>${parts.join(' ')}</ref>`;
  }

  // 9cr. {{Citar lei}} / {{Lei}} / {{Decreto}} / {{Cite act}}
  if (key === 'citar lei' || key === 'lei' || key === 'decreto' || key === 'cite act') {
    const num = pickParam(call, ['number', 'numero', 'número', '1'], 'Act');
    const title = pickParam(call, ['title', 'titulo', 'título', '2']);
    const juris = pickParam(call, ['jurisdiction', 'jurisdicao', 'jurisdição', 'country', 'pais', 'país']);
    const art = pickParam(call, ['article', 'artigo']);
    const parts = [`**${num}**`];
    if (title) parts.push(`(${title})`);
    if (art) parts.push(`— ${art}`);
    if (juris) parts.push(`· ${juris}`);
    return `<ref>${parts.join(' ')}</ref>`;
  }

  // 9cs. {{Citar relatório}} / {{Cite report}} / {{Relatório}} / {{Citar documento}}
  if (
    key === 'citar relatorio' ||
    key === 'cite report' ||
    key === 'relatorio' ||
    key === 'citar documento'
  ) {
    const title = pickParam(call, ['title', 'título', 'titulo', '1'], 'Technical Report');
    const inst = pickParam(call, ['institution', 'instituicao', 'instituição', 'publisher']);
    const year = pickParam(call, ['year', 'ano']);
    const url = pickParam(call, ['url', 'link']);
    const formatted =
      url && (url.startsWith('https://') || url.startsWith('http://'))
        ? `[${title}](${url})`
        : `"${title}"`;
    const parts = [`${formatted} (Report)`];
    if (inst) parts.push(`— ${inst}`);
    if (year) parts.push(`(${year})`);
    return `<ref>${parts.join(' ')}</ref>`;
  }

  // 9ct. Etiquetas inline de revisão: {{Carece de página}}, {{Ligação inativa}}, {{Exemplo necessário}}, {{Por quem?}}, {{Como?}}, {{Por quê?}}, {{Melhor fonte}}, {{Duvidoso}}
  if (
    key === 'carece de pagina' ||
    key === 'page needed' ||
    key === 'pagina?' ||
    key === 'ligacao inativa' ||
    key === 'dead link' ||
    key === 'link quebrado' ||
    key === 'exemplo necessario' ||
    key === 'example needed' ||
    key === 'exemplo?' ||
    key === 'por quem' ||
    key === 'por quem?' ||
    key === 'by whom' ||
    key === 'by whom?' ||
    key === 'segundo quem' ||
    key === 'segundo quem?' ||
    key === 'como' ||
    key === 'como?' ||
    key === 'how' ||
    key === 'how?' ||
    key === 'por que' ||
    key === 'por que?' ||
    key === 'porque' ||
    key === 'porque?' ||
    key === 'why' ||
    key === 'why?' ||
    key === 'melhor fonte' ||
    key === 'better source needed' ||
    key === 'fonte melhor' ||
    key === 'duvidoso' ||
    key === 'dubious' ||
    key === 'contestado'
  ) {
    const clean = key.replace(/\?$/, '');
    const dateVal = pickParam(call, ['date', 'data']);
    const labelMap: Record<string, string> = {
      'carece de pagina': 'page needed',
      'page needed': 'page needed',
      pagina: 'page needed',
      'ligacao inativa': dateVal ? `dead link (${dateVal})` : 'dead link',
      'dead link': dateVal ? `dead link (${dateVal})` : 'dead link',
      'link quebrado': 'dead link',
      'exemplo necessario': 'example needed',
      'example needed': 'example needed',
      exemplo: 'example needed',
      'por quem': 'by whom?',
      'by whom': 'by whom?',
      'segundo quem': 'by whom?',
      como: 'how?',
      how: 'how?',
      'por que': 'why?',
      porque: 'why?',
      why: 'why?',
      'melhor fonte': 'better source needed',
      'better source needed': 'better source needed',
      'fonte melhor': 'better source needed',
      duvidoso: 'dubious – discuss',
      dubious: 'dubious – discuss',
      contestado: 'disputed',
    };
    return `^[${labelMap[clean] ?? 'editorial note'}]^`;
  }

  // 9cu. {{Data}} / {{Date}}
  if (key === 'data' || key === 'date') {
    const day = Number.parseInt(pickParam(call, ['1', 'day', 'dia'], '1'), 10);
    const month = Number.parseInt(pickParam(call, ['2', 'month', 'mes', 'mês'], '1'), 10);
    const year = pickParam(call, ['3', 'year', 'ano'], '2026');
    const monthsEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    if (Number.isFinite(day) && Number.isFinite(month) && month >= 1 && month <= 12) {
      return `${monthsEn[month - 1]} ${day}, ${year}`;
    }
    return `${pickParam(call, ['1'], '01')}/${pickParam(call, ['2'], '01')}/${year}`;
  }

  // 9cv. {{Porcentagem}} / {{Pct}} / {{Percentage}}
  if (key === 'porcentagem' || key === 'pct' || key === 'percentage') {
    const part = Number.parseFloat(pickParam(call, ['1'], '0').replace(',', '.'));
    const total = Number.parseFloat(pickParam(call, ['2'], '100').replace(',', '.'));
    const decimals = Math.max(0, Math.min(4, Number.parseInt(pickParam(call, ['3'], '1'), 10) || 0));
    if (!Number.isFinite(part) || !Number.isFinite(total) || total === 0) {
      return '0%';
    }
    const pct = ((part / total) * 100).toFixed(decimals).replace(/\.?0+$/, '');
    return `${pct}%`;
  }

  // 9cw. {{IPA}} / {{AFI}} / {{Pronúncia}} / {{Pronunciation}}
  if (key === 'ipa' || key === 'afi' || key === 'pronuncia' || key === 'pronunciation') {
    const ipaText = pickParam(call, ['1', 'text', 'texto'], '...');
    return `IPA: \`/${ipaText}/\``;
  }

  // 9cx. {{Lang}} / {{Idioma}} / {{Estrangeiro}}
  if (key === 'lang' || key === 'idioma' || key === 'estrangeiro') {
    const code = pickParam(call, ['1', 'code', 'codigo', 'código'], 'en');
    const text = pickParam(call, ['2', 'text', 'texto'], '');
    return text ? `*${text}* (\`${code}\`)` : `\`${code}\``;
  }

  // 9cy. {{Nihongo}} / {{Japonês}}
  if (key === 'nihongo' || key === 'japones') {
    const term = pickParam(call, ['1'], 'Term');
    const kanji = pickParam(call, ['2']);
    const romaji = pickParam(call, ['3']);
    const inner = [kanji, romaji ? `*${romaji}*` : ''].filter(Boolean).join(', ');
    return inner ? `${term} (${inner})` : term;
  }

  // 9cz. {{Código}} / {{Code}} / {{Syntax}}
  if (key === 'codigo' || key === 'code' || key === 'syntax') {
    const snippet = pickParam(call, ['1', 'text', 'texto'], 'code()');
    return `\`${snippet}\``;
  }

  // 9da. {{Tag}} / {{HTMLtag}} / {{XML}}
  if (key === 'tag' || key === 'htmltag' || key === 'xml') {
    const tagName = pickParam(call, ['1', 'tag'], 'div').replace(/[<>]/g, '');
    const inner = pickParam(call, ['2', 'content', 'conteudo', 'conteúdo']);
    return inner ? `\`<${tagName}>${inner}</${tagName}>\`` : `\`<${tagName}>\``;
  }

  // 9db. {{Ocultar}} / {{Collapse}} / {{Esconder}} / {{Caixa expansível}}
  if (key === 'ocultar' || key === 'collapse' || key === 'esconder' || key === 'caixa expansivel') {
    const title = pickParam(call, ['title', 'titulo', 'título', '1'], 'Additional content');
    const body = pickParam(call, ['content', 'conteudo', 'conteúdo', 'text', 'texto', '2'], 'Additional details.');
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Collapsible Box',
      title,
      body,
    });
  }

  // 9dc. {{Barra de progresso}} / {{Progresso}} / {{Progress bar}}
  if (key === 'barra de progresso' || key === 'progresso' || key === 'progress bar') {
    const rawPct = Number.parseFloat(pickParam(call, ['1', 'pct', 'value', 'valor'], '50').replace(',', '.'));
    const pct = Number.isFinite(rawPct) ? Math.max(0, Math.min(100, Math.round(rawPct))) : 50;
    const filled = Math.round(pct / 10);
    const bar = `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`;
    const caption = pickParam(call, ['2', 'text', 'texto', 'caption', 'legenda']);
    return caption ? `\`[${bar}]\` **${pct}%** — ${caption}` : `\`[${bar}]\` **${pct}%**`;
  }

  // 9dd. {{Efn}} / {{Nota explicativa}} / {{Notelist}}
  if (key === 'efn' || key === 'nota explicativa' || key === 'notelist') {
    const note = pickParam(call, ['1', 'text', 'texto'], 'Explanatory note.');
    return `<ref>[Note] ${note}</ref>`;
  }

  // 9de. {{Circa}} / {{Aprox}}
  if (key === 'circa' || key === 'aprox') {
    const start = pickParam(call, ['1'], '1500');
    const end = pickParam(call, ['2']);
    return end ? `c. ${start}–${end}` : `c. ${start}`;
  }

  // 9df. {{Século}} / {{Century}}
  if (key === 'seculo' || key === 'century') {
    const num = Number.parseInt(pickParam(call, ['1'], '21'), 10);
    const ordinal = (n: number): string => {
      if (!Number.isFinite(n) || n <= 0) return '21st';
      const mod100 = n % 100;
      if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
      switch (n % 10) {
        case 1: return `${n}st`;
        case 2: return `${n}nd`;
        case 3: return `${n}rd`;
        default: return `${n}th`;
      }
    };
    return `${ordinal(num)} century`;
  }

  // 9dg. {{Vandalismo}} / {{uw-vandalism}} / {{Teste}} / {{uw-test}} / {{Aviso spam}} / {{Remoção de conteúdo}}
  if (
    key === 'vandalismo' ||
    key === 'uw vandalism' ||
    key === 'aviso vandalismo' ||
    key === 'teste' ||
    key === 'uw test' ||
    key === 'edicao de teste' ||
    key === 'aviso spam' ||
    key === 'uw spam' ||
    key === 'links promocionais' ||
    key === 'remocao de conteudo' ||
    key === 'uw delete' ||
    key === 'apagamento indevido'
  ) {
    const page = pickParam(call, ['page', 'pagina', 'página', '1']);
    const pageSuffix = page ? ` on [[${toWikiSlug(page)}|${page}]]` : '';
    if (key === 'teste' || key === 'uw test' || key === 'edicao de teste') {
      return serializePredefinicaoBlock({
        variant: 'info',
        kicker: 'Talk · Test Edit',
        title: 'Welcome! A test edit was detected',
        body: `Your recent edit${pageSuffix} appears to have been a formatting test. To experiment freely without altering articles, please use a [[template-welcome|sandbox or test page]].`,
      });
    }
    if (key === 'aviso spam' || key === 'uw spam' || key === 'links promocionais') {
      return serializePredefinicaoBlock({
        variant: 'warning',
        kicker: 'Talk · Spam Warning',
        title: 'Please avoid adding promotional external links',
        body: `The links added${pageSuffix} appear commercial or promotional in nature. Review the [WikiMaker Usage Rules](#/terms) before adding external references.`,
      });
    }
    if (key === 'remocao de conteudo' || key === 'uw delete' || key === 'apagamento indevido') {
      return serializePredefinicaoBlock({
        variant: 'warning',
        kicker: 'Talk · Content Removal',
        title: 'Please explain removal of sourced content',
        body: `Portions of content${pageSuffix} were removed without explanation in the edit summary. Always explain substantial removals on the talk page.`,
      });
    }
    const level = pickParam(call, ['level', 'nivel', 'nível', '2'], '1');
    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: `Talk · Vandalism Warning (Level ${level})`,
      title: 'Unconstructive or disruptive editing detected',
      body: `Your recent edit${pageSuffix} reverted or damaged informational content and has been undone. Repeated disruptive edits may result in an account block under the [Usage Rules](#/terms).`,
    });
  }

  // 9dh. {{Sem consenso}} / {{Discutido}} / {{Debate em curso}}
  if (key === 'sem consenso' || key === 'discutido' || key === 'debate em curso') {
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1'],
      'Recent changes on this page have not yet reached consensus; please discuss on the talk page before editing again.'
    );
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · No Consensus',
      title: 'Content awaiting editorial consensus',
      body: reason,
    });
  }

  // 9di. {{Fusão de histórico}} / {{History merge}} / {{Histmerge}}
  if (key === 'fusao de historico' || key === 'history merge' || key === 'histmerge') {
    const target = pickParam(call, ['target', 'alvo', '1'], 'start');
    const reason = pickParam(
      call,
      ['reason', 'motivo', '2'],
      'A technical history merge has been requested between parallel page versions to preserve attribution.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Technical Maintenance',
      title: `History merge requested with [[${toWikiSlug(target)}|${target}]]`,
      body: reason,
    });
  }

  // 9dj. {{Wikcionário}} / {{Wikisource}} / {{Wikinotícias}} / {{Não enciclopédico}}
  if (
    key === 'wikcionario' ||
    key === 'transwiki' ||
    key === 'dicionario' ||
    key === 'wikisource' ||
    key === 'texto integral' ||
    key === 'documento fonte' ||
    key === 'wikinoticias' ||
    key === 'estilo jornalistico' ||
    key === 'noticiario' ||
    key === 'nao enciclopedico' ||
    key === 'unencyclopedic' ||
    key === 'fora do escopo'
  ) {
    if (key === 'wikisource' || key === 'texto integral' || key === 'documento fonte') {
      const work = pickParam(call, ['work', 'obra', '1'], 'this document');
      return serializePredefinicaoBlock({
        variant: 'info',
        kicker: 'Template · Wikisource',
        title: 'Primary source text or full document',
        body: `In an encyclopedia, "${work}" should be analyzed and historically contextualized rather than transcribed verbatim in full.`,
      });
    }
    if (key === 'wikinoticias' || key === 'estilo jornalistico' || key === 'noticiario') {
      const reason = pickParam(
        call,
        ['reason', 'motivo', '1'],
        'The text adopts a breaking-news reporting style; rewrite with encyclopedic perspective and retrospective context.'
      );
      return serializePredefinicaoBlock({
        variant: 'warning',
        kicker: 'Template · Wikinews Style',
        title: 'Written like a news report',
        body: reason,
      });
    }
    if (key === 'nao enciclopedico' || key === 'unencyclopedic' || key === 'fora do escopo') {
      const reason = pickParam(
        call,
        ['reason', 'motivo', '1'],
        'The current content appears to be outside encyclopedic scope (pamphlet, announcement, or personal essay).'
      );
      return serializePredefinicaoBlock({
        variant: 'alert',
        kicker: 'Template · Encyclopedic Scope',
        title: 'Potentially unencyclopedic content',
        body: reason,
      });
    }
    const reason = pickParam(
      call,
      ['reason', 'motivo', '1'],
      'This entry is limited to a dictionary definition; expand it with encyclopedic context or move it to a glossary.'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Wiktionary',
      title: 'Reads like a dictionary definition',
      body: reason,
    });
  }

  // 9dk. {{Variante linguística}} / {{pt-BR}} / {{pt-PT}} / {{Ortografia}}
  if (key === 'variante linguistica' || key === 'pt br' || key === 'pt pt' || key === 'ortografia') {
    const variant = pickParam(
      call,
      ['variant', 'variante', '1'],
      key === 'pt pt' ? 'European Portuguese' : key === 'pt br' ? 'Brazilian Portuguese' : 'US English'
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Language Variant',
      title: `Article written in ${variant}`,
      body: `To maintain stylistic consistency, please preserve this spelling and regional variant (${variant}) when editing this article.`,
    });
  }

  // 9dl. {{Linguagem técnica}} / {{Technical}} / {{Jargão}}
  if (key === 'linguagem tecnica' || key === 'technical' || key === 'jargao') {
    const area = pickParam(call, ['area', 'área', '1'], 'a specialized field');
    const reason = pickParam(
      call,
      ['reason', 'motivo', '2'],
      `This article may be too technical for general readers unfamiliar with ${area}; please make the lead more accessible.`
    );
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Editorial Accessibility',
      title: 'Overly technical language',
      body: reason,
    });
  }

  // 9dm. {{Secção longa}} / {{Overly detailed}} / {{Detalhamento excessivo}}
  if (
    key === 'secao longa' ||
    key === 'seccao longa' ||
    key === 'overly detailed' ||
    key === 'detalhamento excessivo'
  ) {
    const sec = pickParam(call, ['section', 'secao', 'seção', '1'], 'This section');
    const reason = pickParam(
      call,
      ['reason', 'motivo', '2'],
      'Contains excessive detail for an encyclopedic summary; please condense to the main points.'
    );
    return serializePredefinicaoBlock({
      variant: 'warning',
      kicker: 'Template · Editorial Conciseness',
      title: `Excessive detail in "${sec}"`,
      body: reason,
    });
  }

  // 9dn. {{Atualizar após}} / {{Update after}} / {{Prazo}}
  if (key === 'atualizar apos' || key === 'update after' || key === 'prazo') {
    const year = pickParam(call, ['1', 'year', 'ano', 'date', 'data'], '2027');
    const note = pickParam(
      call,
      ['2', 'reason', 'motivo'],
      `This section contains a forecast or term scheduled for review after ${year}.`
    );
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: `Template · Scheduled Review (${year})`,
      title: `Update after ${year}`,
      body: note,
    });
  }

  // 9do. {{Morte recente}} / {{Recent death}} / {{Falecimento recente}}
  if (key === 'morte recente' || key === 'recent death' || key === 'falecimento recente') {
    const name = pickParam(call, ['name', 'nome', '1'], options?.currentTitle || 'this person');
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Template · Recent Death',
      title: `This article documents the recent death of ${name}`,
      body: 'Biographical information may evolve rapidly; add only facts confirmed by reliable, independent sources.',
    });
  }

  // 9dp. {{Homônimos}} / {{Surname}} / {{Given name}} / {{Lista de nomes}}
  if (key === 'homonimos' || key === 'surname' || key === 'given name' || key === 'lista de nomes') {
    const term = pickParam(call, ['1', 'name', 'nome'], options?.currentTitle || 'this name');
    return serializePredefinicaoBlock({
      variant: 'disambiguation',
      kicker: 'Template · Name Index',
      title: `List of articles sharing the name "${term}"`,
      body: 'This page lists people, works, or places sharing this given name or surname.',
    });
  }

  // 9dq. Esboços Temáticos ({{Esboço-bio}}, {{Esboço-geo}}, {{Esboço-ciência}}, {{Esboço-jogos}})
  if (
    key === 'esboco bio' ||
    key === 'bio stub' ||
    key === 'esboco biografia' ||
    key === 'esboco geo' ||
    key === 'geo stub' ||
    key === 'esboco geografia' ||
    key === 'esboco ciencia' ||
    key === 'science stub' ||
    key === 'esboco tecnologia' ||
    key === 'esboco jogos' ||
    key === 'vg stub' ||
    key === 'esboco videogame'
  ) {
    const defaultArea = key.includes('bio')
      ? 'Biographies'
      : key.includes('geo')
        ? 'Geography & Locations'
        : key.includes('jogos') || key.includes('vg') || key.includes('videogame')
          ? 'Video Games'
          : 'Science & Technology';
    const topic = pickParam(call, ['1', 'topic', 'tema', 'area'], defaultArea);
    return serializePredefinicaoBlock({
      variant: 'stub',
      kicker: `Template · Stub (${defaultArea})`,
      title: `This article about ${topic} is a stub`,
      body: 'You can help expand this article by adding sections, verifiable facts, and reliable references.',
    });
  }

  // 9dr. {{WikiProjeto}} / {{WikiProject}} / {{Projeto editorial}}
  if (key === 'wikiprojeto' || key === 'wikiproject' || key === 'projeto editorial') {
    const project = pickParam(call, ['project', 'projeto', '1'], 'WikiMaker Editorial');
    const quality = pickParam(call, ['quality', 'qualidade', '2'], '3');
    const importance = pickParam(call, ['importance', 'importancia', 'importância', '3'], 'Medium');
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: `WikiProject · ${project}`,
      title: `Within the scope of WikiProject ${project}`,
      body: `Editorial assessment — Quality: Level ${quality} · Importance: ${importance}.`,
    });
  }

  // 9ds. {{Arquivo automático}} / {{Autoarchive}} / {{Configuração arquivo}}
  if (key === 'arquivo automatico' || key === 'autoarchive' || key === 'configuracao arquivo') {
    const days = pickParam(call, ['days', 'dias', '1'], '90');
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Talk · Auto-archiving',
      title: `Inactive threads archived after ${days} days`,
      body: 'Discussions without new replies during the configured period are moved to the historical archive to keep this page organized.',
    });
  }

  // 9dt. {{Em votação}} / {{RfC}} / {{Consulta pública}}
  if (key === 'em votacao' || key === 'rfc' || key === 'consulta publica') {
    const topic = pickParam(call, ['topic', 'tema', '1'], 'Open community editorial proposal');
    const deadline = pickParam(call, ['deadline', 'prazo', '2'], 'Open');
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Request for Comment · Open Vote',
      title: topic,
      body: 'Contributors are invited to share policy-based arguments before the discussion closes.',
      meta: `Deadline: ${deadline}`,
    });
  }

  // 9du. {{Página de usuário}} / {{Userpage}} / {{Perfil colaborador}}
  if (key === 'pagina de usuario' || key === 'userpage' || key === 'perfil colaborador') {
    const user = pickParam(call, ['user', 'usuario', 'usuário', '1'], 'Collaborator');
    return serializePredefinicaoBlock({
      variant: 'info',
      kicker: 'Namespace · User',
      title: `This is the user page for ${user}`,
      body: 'This page belongs to the WikiMaker user namespace for contributor profiles and editorial notes — it is not an encyclopedia article.',
    });
  }

  // 9dv. {{Página de testes}} / {{Sandbox}} / {{Rascunho}}
  if (key === 'pagina de testes' || key === 'sandbox' || key === 'rascunho') {
    const author = pickParam(call, ['author', 'autor', 'user', 'usuario', '1']);
    return serializePredefinicaoBlock({
      variant: 'wip',
      kicker: 'Template · Draft / Sandbox',
      title: author ? `${author}'s sandbox page` : 'Personal sandbox and draft page',
      body: 'Experimental workspace intended for testing Markdown formatting, tables, citations, and templates before publishing.',
    });
  }

  // 9dw. {{Hatnote}} / {{Nota topo}} / {{Distinguir}} / {{Distinguish2}} / {{Ver categoria}}
  if (key === 'hatnote' || key === 'nota topo') {
    const text = pickParam(call, ['1', 'text', 'texto'], 'Editorial orientation note.');
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Hatnote',
      body: text,
    });
  }
  if (key === 'distinguir' || key === 'distinguish2') {
    const text = pickParam(call, ['1', 'text', 'texto'], 'Not to be confused with [[start|Home]].');
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Hatnote · Distinguish',
      body: text,
    });
  }
  if (key === 'ver categoria' || key === 'see category' || key === 'categoria') {
    const cat = pickParam(call, ['1', 'category', 'categoria'], 'General');
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Related Category',
      body: `Explore more articles grouped under category **${cat}**.`,
    });
  }

  // 9dx. {{Tracklist}} / {{Lista de faixas}} / {{Faixas}}
  if (key === 'tracklist' || key === 'lista de faixas' || key === 'faixas') {
    const title = pickParam(call, ['title', 'titulo', 'título'], 'Track listing');
    const tracks = call.orderedEntries
      .filter((e) => !['titulo', 'título', 'title'].includes(normalizeTemplateKey(e.key)) && e.value)
      .map((e, idx) => `${idx + 1}. ${e.value}`);
    const body = tracks.length > 0 ? tracks.join(' · ') : '1. Main Track (3:30)';
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Audio · Tracklist',
      title,
      body,
    });
  }

  // 9dy. {{Cronologia}} / {{Timeline}} / {{Linha do tempo}}
  if (key === 'cronologia' || key === 'timeline' || key === 'linha do tempo') {
    const theme = pickParam(call, ['theme', 'tema', 'title', 'titulo', 'título'], 'Timeline');
    const prev = pickParam(call, ['prev', 'anterior'], 'Previous');
    const curr = pickParam(call, ['current', 'atual', '1'], 'Current');
    const next = pickParam(call, ['next', 'proximo', 'próximo'], 'Next');
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: `Timeline · ${theme}`,
      body: `← ${prev}  ·  **${curr}**  ·  ${next} →`,
    });
  }

  // 9dz. {{Sucessão}} / {{Succession box}} / {{Antecessor}}
  if (key === 'sucessao' || key === 'succession box' || key === 'antecessor') {
    const role = pickParam(call, ['role', 'cargo', 'title', 'titulo', 'título', '1'], 'Role');
    const period = pickParam(call, ['period', 'periodo', 'período'], '');
    const prev = pickParam(call, ['predecessor', 'antecessor', 'before'], '—');
    const next = pickParam(call, ['successor', 'sucessor', 'after'], '—');
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Succession Box',
      title: period ? `${role} (${period})` : role,
      body: `Preceded by: **${prev}**  |  Succeeded by: **${next}**`,
    });
  }

  // 9ea. {{Commons}} / {{Link Wikcionário}} / {{Link Wikiquote}}
  if (
    key === 'commons' ||
    key === 'wikimedia commons' ||
    key === 'galeria' ||
    key === 'link wikcionario' ||
    key === 'wiktionary' ||
    key === 'definicao' ||
    key === 'link wikiquote' ||
    key === 'citacoes relacionadas'
  ) {
    const term = pickParam(call, ['1', 'topic', 'tema', 'term', 'termo'], options?.currentTitle || 'Topic');
    if (key.includes('wikcionar') || key === 'wiktionary' || key === 'definicao') {
      return serializePredefinicaoBlock({
        variant: 'navigation',
        kicker: 'Sister Project · Wiktionary',
        body: `Look up the lexical definition and etymology of **${term}** in the collaborative dictionary.`,
      });
    }
    if (key.includes('wikiquote') || key === 'citacoes relacionadas') {
      return serializePredefinicaoBlock({
        variant: 'navigation',
        kicker: 'Sister Project · Wikiquote',
        body: `Browse collected quotations and notable phrases related to **${term}**.`,
      });
    }
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Media Repository · Commons',
      body: `Explore open-licensed images, audio, and diagrams in the gallery for **${term}**.`,
    });
  }

  // 9eb. Citações adicionais (<ref>) — Podcast, Entrevista, Discurso, Tweet, Arquivo, Software, Patente, Nota de rodapé
  if (key === 'citar podcast' || key === 'cite podcast' || key === 'podcast') {
    const title = pickParam(call, ['title', 'título', 'titulo', '1'], 'Podcast Episode');
    const show = pickParam(call, ['program', 'programa', 'podcast', 'series']);
    const host = pickParam(call, ['host', 'apresentador', 'author', 'autor']);
    const year = pickParam(call, ['year', 'ano', 'date', 'data']);
    const parts = [`"${title}" (Podcast)`];
    if (show) parts.push(`In: *${show}*`);
    if (host) parts.push(`— ${host}`);
    if (year) parts.push(`(${year})`);
    return `<ref>${parts.join(' ')}</ref>`;
  }
  if (key === 'citar entrevista' || key === 'cite interview' || key === 'entrevista') {
    const subject = pickParam(call, ['interviewee', 'entrevistado', 'subject', '1'], 'Interviewee');
    const title = pickParam(call, ['title', 'titulo', 'título'], 'Interview');
    const inter = pickParam(call, ['interviewer', 'entrevistador', 'outlet', 'veiculo']);
    const year = pickParam(call, ['year', 'ano', 'date', 'data']);
    const parts = [`${subject}. "${title}" (Interview)`];
    if (inter) parts.push(`— ${inter}`);
    if (year) parts.push(`(${year})`);
    return `<ref>${parts.join(' ')}</ref>`;
  }
  if (key === 'citar discurso' || key === 'cite speech' || key === 'discurso') {
    const speaker = pickParam(call, ['author', 'autor', 'speaker', 'orador', '1'], 'Speaker');
    const title = pickParam(call, ['title', 'titulo', 'título'], 'Speech');
    const event = pickParam(call, ['event', 'evento']);
    const year = pickParam(call, ['year', 'ano', 'date', 'data']);
    const parts = [`${speaker}. "${title}"`];
    if (event) parts.push(`(${event})`);
    if (year) parts.push(`— ${year}`);
    return `<ref>${parts.join(' ')}</ref>`;
  }
  if (key === 'citar tweet' || key === 'citar post' || key === 'cite tweet' || key === 'rede social') {
    const user = pickParam(call, ['user', 'usuario', 'usuário', '1'], '@account');
    const text = pickParam(call, ['text', 'texto', '2'], 'Official post');
    const dateVal = pickParam(call, ['date', 'data']);
    const parts = [`${user}: "${text}"`];
    if (dateVal) parts.push(`(${dateVal})`);
    return `<ref>${parts.join(' ')}</ref>`;
  }
  if (key === 'citar arquivo' || key === 'cite archive' || key === 'arquivo historico') {
    const doc = pickParam(call, ['document', 'documento', 'title', 'titulo', 'título', '1'], 'Archival Document');
    const archive = pickParam(call, ['archive', 'acervo', 'arquivo', 'repository']);
    const fund = pickParam(call, ['collection', 'fundo', 'colecao', 'coleção']);
    const year = pickParam(call, ['year', 'ano']);
    const parts = [`"${doc}"`];
    if (fund) parts.push(`— ${fund}`);
    if (archive) parts.push(`[${archive}]`);
    if (year) parts.push(`(${year})`);
    return `<ref>${parts.join(' ')}</ref>`;
  }
  if (key === 'citar software' || key === 'cite software' || key === 'manual software') {
    const name = pickParam(call, ['name', 'nome', 'title', 'titulo', 'título', '1'], 'Software');
    const ver = pickParam(call, ['version', 'versao', 'versão']);
    const dev = pickParam(call, ['developer', 'desenvolvedor', 'author', 'autor']);
    const year = pickParam(call, ['year', 'ano']);
    const parts = [`*${name}*`];
    if (ver) parts.push(`v${ver}`);
    if (dev) parts.push(`— ${dev}`);
    if (year) parts.push(`(${year})`);
    return `<ref>${parts.join(' ')}</ref>`;
  }
  if (key === 'citar patente' || key === 'cite patent' || key === 'patente') {
    const num = pickParam(call, ['number', 'numero', 'número', '1'], 'PAT-0001');
    const title = pickParam(call, ['title', 'titulo', 'título']);
    const holder = pickParam(call, ['holder', 'titular', 'inventor', 'assignee']);
    const year = pickParam(call, ['year', 'ano']);
    const parts = [`Patent **${num}**`];
    if (title) parts.push(`— "${title}"`);
    if (holder) parts.push(`(${holder})`);
    if (year) parts.push(`[${year}]`);
    return `<ref>${parts.join(' ')}</ref>`;
  }
  if (key === 'nota de rodape' || key === 'refn' || key === 'observacao') {
    const note = pickParam(call, ['1', 'text', 'texto'], 'Editorial note.');
    return `<ref>${note}</ref>`;
  }

  // 9ec. Utilitários de data, matemática, tipografia, tabelas e ícones
  if (key === 'data de falecimento' || key === 'death date and age' || key === 'falecimento') {
    const dy = Number.parseInt(pickParam(call, ['1'], '2015'), 10);
    const dm = Number.parseInt(pickParam(call, ['2'], '1'), 10);
    const dd = Number.parseInt(pickParam(call, ['3'], '1'), 10);
    const by = Number.parseInt(pickParam(call, ['4'], '1940'), 10);
    const bm = Number.parseInt(pickParam(call, ['5'], '1'), 10);
    const bd = Number.parseInt(pickParam(call, ['6'], '1'), 10);
    if (!Number.isFinite(dy) || !Number.isFinite(by)) return 'Invalid date';
    let age = dy - by;
    if (dm < bm || (dm === bm && dd < bd)) age -= 1;
    const pad = (n: number) => String(Math.max(1, n)).padStart(2, '0');
    return `${dy}-${pad(dm)}-${pad(dd)} (${Math.max(0, age)} years old)`;
  }
  if (key === 'inicio e fim' || key === 'start and end dates' || key === 'periodo') {
    const start = pickParam(call, ['1', 'start', 'inicio', 'início'], '2020');
    const end = pickParam(call, ['2', 'end', 'fim'], 'present');
    return `${start}–${end}`;
  }
  if (key === 'duracao' || key === 'duration' || key === 'tempo') {
    const a = pickParam(call, ['1'], '0');
    const b = pickParam(call, ['2']);
    const c = pickParam(call, ['3']);
    if (c) return `${a} h ${b || '0'} min ${c} s`;
    if (b) return `${a} min ${b} s`;
    return `${a} min`;
  }
  if (key === 'formatnum' || key === 'numero' || key === 'val') {
    const raw = pickParam(call, ['1'], '0');
    const unit = pickParam(call, ['2', 'unit', 'unidade']);
    const num = Number.parseFloat(raw.replace(/\s+/g, '').replace(',', '.'));
    const formatted = Number.isFinite(num) ? num.toLocaleString('en-US') : raw;
    return unit ? `${formatted} ${unit}` : formatted;
  }
  if (key === 'fracao' || key === 'frac' || key === 'sfrac') {
    const a = pickParam(call, ['1'], '1');
    const b = pickParam(call, ['2'], '2');
    const c = pickParam(call, ['3']);
    return c ? `${a} ${b}/${c}` : `${a}/${b}`;
  }
  if (key === 'raiz' || key === 'sqrt' || key === 'radic') {
    const val = pickParam(call, ['1'], '2');
    const idx = pickParam(call, ['2']);
    if (idx === '3') return `∛${val}`;
    if (idx) return `^${idx}^√${val}`;
    return `√${val}`;
  }
  if (key === 'math' || key === 'formula' || key === 'equacao') {
    const fallbackNamed =
      call.orderedEntries[0]?.isNamed
        ? `${call.orderedEntries[0].key}=${call.orderedEntries[0].value}`
        : '';
    const expr = pickParam(call, ['1'], fallbackNamed || 'E = mc²');
    return `*${expr}*`;
  }
  if (key === 'sub' || key === 'subscrito') {
    const val = pickParam(call, ['1'], '2');
    const subMap: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
      a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ', i: 'ᵢ', n: 'ₙ',
    };
    const converted = [...val].map((ch) => subMap[ch] ?? ch).join('');
    return converted !== val ? converted : `~${val}~`;
  }
  if (key === 'sup' || key === 'sobrescrito') {
    const val = pickParam(call, ['1'], '2');
    const supMap: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
      n: 'ⁿ', i: 'ⁱ',
    };
    const converted = [...val].map((ch) => supMap[ch] ?? ch).join('');
    return converted !== val ? converted : `^${val}^`;
  }
  if (key === 'sigla' || key === 'abbr' || key === 'abreviacao') {
    const abbr = pickParam(call, ['1'], 'UN');
    const meaning = pickParam(call, ['2']);
    return meaning ? `**${abbr}** (${meaning})` : `**${abbr}**`;
  }
  if (key === 'nowrap' || key === 'sem quebra') {
    return pickParam(call, ['1'], '');
  }
  if (key === 'clear' || key === 'espaco' || key === 'separador') {
    return '\n\n---\n\n';
  }
  if (key === 'n/a' || key === 'na' || key === 'desconhecido' || key === 'tbd') {
    const custom = pickParam(call, ['1']);
    if (custom) return `— *${custom}*`;
    return key === 'tbd' ? '⏳ *TBD*' : '— *N/A*';
  }
  if (key === 'estrelas' || key === 'rating' || key === 'nota estrelas') {
    const scoreRaw = Number.parseFloat(pickParam(call, ['1'], '4').replace(',', '.'));
    const maxRaw = Number.parseInt(pickParam(call, ['2'], '5'), 10);
    const max = Number.isFinite(maxRaw) && maxRaw > 0 && maxRaw <= 10 ? maxRaw : 5;
    const score = Number.isFinite(scoreRaw) ? Math.max(0, Math.min(max, Math.round(scoreRaw))) : 4;
    return `${'★'.repeat(score)}${'☆'.repeat(max - score)} (${scoreRaw}/${max})`;
  }
  if (key === 'bandeira' || key === 'flag' || key === 'flagicon' || key === 'pais bandeira') {
    const rawCountry = pickParam(call, ['1', 'country', 'pais', 'país'], 'Brazil');
    const normCountry = normalizeTemplateKey(rawCountry);
    const flagMap: Record<string, [string, string]> = {
      brasil: ['🇧🇷', 'Brazil'],
      brazil: ['🇧🇷', 'Brazil'],
      br: ['🇧🇷', 'Brazil'],
      portugal: ['🇵🇹', 'Portugal'],
      pt: ['🇵🇹', 'Portugal'],
      angola: ['🇦🇴', 'Angola'],
      mocambique: ['🇲🇿', 'Mozambique'],
      mozambique: ['🇲🇿', 'Mozambique'],
      'cabo verde': ['🇨🇻', 'Cape Verde'],
      'cape verde': ['🇨🇻', 'Cape Verde'],
      'estados unidos': ['🇺🇸', 'United States'],
      'united states': ['🇺🇸', 'United States'],
      eua: ['🇺🇸', 'United States'],
      usa: ['🇺🇸', 'United States'],
      us: ['🇺🇸', 'United States'],
      'reino unido': ['🇬🇧', 'United Kingdom'],
      'united kingdom': ['🇬🇧', 'United Kingdom'],
      uk: ['🇬🇧', 'United Kingdom'],
      gb: ['🇬🇧', 'United Kingdom'],
      japao: ['🇯🇵', 'Japan'],
      japan: ['🇯🇵', 'Japan'],
      jp: ['🇯🇵', 'Japan'],
      franca: ['🇫🇷', 'France'],
      france: ['🇫🇷', 'France'],
      fr: ['🇫🇷', 'France'],
      alemanha: ['🇩🇪', 'Germany'],
      germany: ['🇩🇪', 'Germany'],
      de: ['🇩🇪', 'Germany'],
      espanha: ['🇪🇸', 'Spain'],
      spain: ['🇪🇸', 'Spain'],
      es: ['🇪🇸', 'Spain'],
      italia: ['🇮🇹', 'Italy'],
      italy: ['🇮🇹', 'Italy'],
      it: ['🇮🇹', 'Italy'],
      argentina: ['🇦🇷', 'Argentina'],
      ar: ['🇦🇷', 'Argentina'],
      canada: ['🇨🇦', 'Canada'],
      ca: ['🇨🇦', 'Canada'],
      mexico: ['🇲🇽', 'Mexico'],
      china: ['🇨🇳', 'China'],
      coreia: ['🇰🇷', 'South Korea'],
      'coreia do sul': ['🇰🇷', 'South Korea'],
      'south korea': ['🇰🇷', 'South Korea'],
      india: ['🇮🇳', 'India'],
      suecia: ['🇸🇪', 'Sweden'],
      sweden: ['🇸🇪', 'Sweden'],
      suica: ['🇨🇭', 'Switzerland'],
      switzerland: ['🇨🇭', 'Switzerland'],
      holanda: ['🇳🇱', 'Netherlands'],
      'paises baixos': ['🇳🇱', 'Netherlands'],
      netherlands: ['🇳🇱', 'Netherlands'],
      uniao: ['🇪🇺', 'European Union'],
      'european union': ['🇪🇺', 'European Union'],
      ue: ['🇪🇺', 'European Union'],
    };
    const hit = flagMap[normCountry];
    return hit ? `${hit[0]} ${hit[1]}` : `🏳️ ${rawCountry}`;
  }
  if (key === 'site oficial' || key === 'official website' || key === 'links externos') {
    const rawUrl = pickParam(call, ['1', 'url'], 'https://example.org');
    const label = pickParam(call, ['2', 'title', 'titulo', 'título', 'name', 'nome'], 'Official website');
    const safeUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`;
    return `🌐 [${label}](${safeUrl})`;
  }
  if (key === 'controle de autoridade' || key === 'authority control' || key === 'viaf') {
    const entries: string[] = [];
    const viaf = pickParam(call, ['viaf']);
    const orcid = pickParam(call, ['orcid']);
    const lccn = pickParam(call, ['lccn']);
    const gnd = pickParam(call, ['gnd']);
    const isni = pickParam(call, ['isni']);
    const lattes = pickParam(call, ['lattes']);
    if (viaf) entries.push(`[VIAF: ${viaf}](https://viaf.org/viaf/${encodeURIComponent(viaf)})`);
    if (orcid) entries.push(`[ORCID: ${orcid}](https://orcid.org/${encodeURIComponent(orcid)})`);
    if (lccn) entries.push(`LCCN: \`${lccn}\``);
    if (gnd) entries.push(`GND: \`${gnd}\``);
    if (isni) entries.push(`ISNI: \`${isni}\``);
    if (lattes) entries.push(`Lattes: \`${lattes}\``);
    return serializePredefinicaoBlock({
      variant: 'navigation',
      kicker: 'Authority Control',
      body:
        entries.length > 0
          ? entries.join(' · ')
          : 'International bibliographic authority identifiers (VIAF, ORCID, LCCN, GND).',
    });
  }

  // 10. {{Ecossistema WazzimaGiygg}} / {{WazzimaGiygg}} / {{A Verdade}}
  if (
    key === 'ecossistema wazzimagiygg' ||
    key === 'wazzimagiygg' ||
    key === 'wikipedia dossie' ||
    key === 'a verdade'
  ) {
    return serializePredefinicaoBlock({
      variant: 'ecosystem',
      kicker: 'Template · WazzimaGiygg Ecosystem',
      title: 'Part of the wazzimagiygg.com Project Network',
      body: 'Explore [NotMediaWiki](https://notmediawiki.wazzimagiygg.com/), [WikiWazzimaGiygg](https://wikiwazzimagiygg.wazzimagiygg.com/), [Jornal](https://jornal.wazzimagiygg.com/), [Core](https://core.wazzimagiygg.com/), and the Wikipedia dossier at [wazzimagiygg.com/averdade/](https://wazzimagiygg.com/averdade/).',
      meta: 'Internal dossiers: [[ecossistema-wazzimagiygg|Ecosystem Products]] · [[dossie-wikipedia-abusos|Wikipedia Abuses Dossier]]',
    });
  }

  // 11. {{Info}} / {{Info/...}} / {{Infobox}} / {{Infobox ...}} / {{Ficha}} / {{Taxobox}} / {{Chembox}}
  if (
    key === 'info' ||
    key === 'infobox' ||
    key === 'ficha' ||
    key === 'taxobox' ||
    key === 'taxocaixa' ||
    key === 'chembox' ||
    key.startsWith('info/') ||
    key.startsWith('infobox ') ||
    key.startsWith('infobox/') ||
    key.startsWith('ficha/')
  ) {
    const subType = key.startsWith('info/')
      ? key.slice('info/'.length)
      : key.startsWith('infobox/')
      ? key.slice('infobox/'.length)
      : key.startsWith('infobox ')
      ? key.slice('infobox '.length)
      : key.startsWith('ficha/')
      ? key.slice('ficha/'.length)
      : key === 'taxobox' || key === 'taxocaixa'
      ? 'taxonomia'
      : key === 'chembox'
      ? 'quimica'
      : '';
    const resolveInfoboxTypeToken = (rawToken: string): InfoboxType | null => {
      const rawType = normalizeTemplateKey(rawToken);
      if (!rawType) return null;
      const validTypes = new Set<InfoboxType>([
        'general',
        'user',
        'character',
        'location',
        'item',
        'organization',
        'project',
      ]);
      if (validTypes.has(rawType as InfoboxType)) return rawType as InfoboxType;
      if (
        rawType === 'projeto' ||
        rawType === 'software' ||
        rawType === 'aplicativo' ||
        rawType === 'jogo' ||
        rawType === 'game' ||
        rawType === 'video game' ||
        rawType === 'site' ||
        rawType === 'website' ||
        rawType === 'sistema' ||
        rawType === 'so' ||
        rawType === 'os' ||
        rawType === 'linguagem' ||
        rawType === 'programming language'
      ) {
        return 'project';
      }
      if (
        rawType === 'organizacao' ||
        rawType === 'ong' ||
        rawType === 'organization' ||
        rawType === 'empresa' ||
        rawType === 'company' ||
        rawType === 'instituicao' ||
        rawType === 'fundacao' ||
        rawType === 'universidade' ||
        rawType === 'escola' ||
        rawType === 'university' ||
        rawType === 'clube' ||
        rawType === 'futebol' ||
        rawType === 'football club' ||
        rawType === 'jornal' ||
        rawType === 'revista' ||
        rawType === 'newspaper' ||
        rawType === 'journal' ||
        rawType === 'religiao' ||
        rawType === 'religion'
      ) {
        return 'organization';
      }
      if (
        rawType === 'personagem' ||
        rawType === 'biografia' ||
        rawType === 'pessoa' ||
        rawType === 'person' ||
        rawType === 'artista' ||
        rawType === 'musico' ||
        rawType === 'musical artist' ||
        rawType === 'artist' ||
        rawType === 'autor' ||
        rawType === 'escritor' ||
        rawType === 'writer' ||
        rawType === 'filosofo' ||
        rawType === 'philosopher' ||
        rawType === 'mitologia' ||
        rawType === 'divindade' ||
        rawType === 'deity' ||
        rawType === 'atleta' ||
        rawType === 'futebolista' ||
        rawType === 'sportsperson' ||
        rawType === 'football biography' ||
        rawType === 'politico' ||
        rawType === 'officeholder' ||
        rawType === 'cientista' ||
        rawType === 'scientist'
      ) {
        return 'character';
      }
      if (
        rawType === 'lugar' ||
        rawType === 'local' ||
        rawType === 'pais' ||
        rawType === 'country' ||
        rawType === 'cidade' ||
        rawType === 'settlement' ||
        rawType === 'city' ||
        rawType === 'municipio' ||
        rawType === 'estado' ||
        rawType === 'uf' ||
        rawType === 'provincia' ||
        rawType === 'state' ||
        rawType === 'rio' ||
        rawType === 'lago' ||
        rawType === 'river' ||
        rawType === 'montanha' ||
        rawType === 'vulcao' ||
        rawType === 'mountain' ||
        rawType === 'rodovia' ||
        rawType === 'estrada' ||
        rawType === 'road' ||
        rawType === 'museu' ||
        rawType === 'biblioteca' ||
        rawType === 'museum' ||
        rawType === 'parque' ||
        rawType === 'reserva' ||
        rawType === 'protected area' ||
        rawType === 'evento' ||
        rawType === 'acontecimento' ||
        rawType === 'event' ||
        rawType === 'campeonato' ||
        rawType === 'torneio' ||
        rawType === 'liga' ||
        rawType === 'football league' ||
        rawType === 'edificio' ||
        rawType === 'construcao' ||
        rawType === 'building' ||
        rawType === 'aeroporto' ||
        rawType === 'estacao' ||
        rawType === 'airport' ||
        rawType === 'station' ||
        rawType === 'conflito' ||
        rawType === 'batalha' ||
        rawType === 'military conflict'
      ) {
        return 'location';
      }
      if (
        rawType === 'livro' ||
        rawType === 'obra' ||
        rawType === 'book' ||
        rawType === 'hq' ||
        rawType === 'manga' ||
        rawType === 'comics' ||
        rawType === 'comic' ||
        rawType === 'filme' ||
        rawType === 'serie' ||
        rawType === 'tv' ||
        rawType === 'anime' ||
        rawType === 'film' ||
        rawType === 'television' ||
        rawType === 'musica' ||
        rawType === 'album' ||
        rawType === 'cancao' ||
        rawType === 'single' ||
        rawType === 'song' ||
        rawType === 'objeto' ||
        rawType === 'veiculo' ||
        rawType === 'automovel' ||
        rawType === 'aviao' ||
        rawType === 'automobile' ||
        rawType === 'arma' ||
        rawType === 'equipamento' ||
        rawType === 'weapon' ||
        rawType === 'hardware' ||
        rawType === 'processador' ||
        rawType === 'console' ||
        rawType === 'cpu' ||
        rawType === 'moeda' ||
        rawType === 'currency' ||
        rawType === 'alimento' ||
        rawType === 'prato' ||
        rawType === 'bebida' ||
        rawType === 'food' ||
        rawType === 'taxonomia' ||
        rawType === 'especie' ||
        rawType === 'quimica' ||
        rawType === 'element' ||
        rawType === 'elemento' ||
        rawType === 'astro' ||
        rawType === 'planeta' ||
        rawType === 'planet' ||
        rawType === 'doenca' ||
        rawType === 'medical condition' ||
        rawType === 'premio' ||
        rawType === 'award' ||
        rawType === 'idioma' ||
        rawType === 'language'
      ) {
        return 'item';
      }
      if (rawType === 'usuario' || rawType === 'colaborador') {
        return 'user';
      }
      return null;
    };

    const explicitTypeParam = pickParam(call, ['tipo', 'type'], '');
    const resolvedFromSubType = subType ? resolveInfoboxTypeToken(subType) : null;
    const resolvedFromParam = explicitTypeParam ? resolveInfoboxTypeToken(explicitTypeParam) : null;
    const infoboxType: InfoboxType = resolvedFromSubType ?? resolvedFromParam ?? 'general';
    const consumedTypeParamAsMeta = Boolean(!subType && resolvedFromParam);

    const title = pickParam(
      call,
      ['título', 'titulo', 'title', 'nome', 'name'],
      options?.currentTitle || 'Untitled'
    );
    const subtitle = pickParam(call, ['subtítulo', 'subtitulo', 'subtitle']) || undefined;
    const image = pickParam(call, ['imagem', 'image', 'foto']) || undefined;
    const imageCaption = pickParam(call, ['legenda', 'caption', 'imageCaption']) || undefined;
    const rawAlign = normalizeTemplateKey(pickParam(call, ['layout', 'align', 'alinhamento'], 'right'));
    const layout = rawAlign === 'left' || rawAlign === 'full' ? rawAlign : 'right';

    const reserved = new Set([
      ...(consumedTypeParamAsMeta ? ['tipo', 'type'] : []),
      'título',
      'titulo',
      'title',
      'nome',
      'name',
      'subtítulo',
      'subtitulo',
      'subtitle',
      'imagem',
      'image',
      'foto',
      'legenda',
      'caption',
      'imagecaption',
      'layout',
      'align',
      'alinhamento',
    ]);

    const fields: InfoboxField[] = [];
    for (const entry of call.orderedEntries) {
      if (!entry.isNamed) continue;
      if (reserved.has(normalizeTemplateKey(entry.key))) continue;
      if (entry.value) {
        fields.push({ key: entry.key, value: entry.value });
      }
    }

    return serializeInfoboxBlock({
      type: infoboxType,
      title,
      subtitle,
      image,
      imageCaption,
      layout,
      fields,
    });
  }

  return null;
}

/**
 * Finds the matching `}}}` closing index starting at a `{{{` opening index,
 * handling nested `{{...}}` and `{{{...}}}` expressions cleanly.
 */
function findMatchingTripleBraceEnd(text: string, openIdx: number): number {
  let depth = 0;
  let i = openIdx;
  while (i < text.length) {
    if (text[i] === '{' && text[i + 1] === '{' && text[i + 2] === '{') {
      depth += 3;
      i += 3;
      continue;
    }
    if (text[i] === '{' && text[i + 1] === '{') {
      depth += 2;
      i += 2;
      continue;
    }
    if (text[i] === '}' && text[i + 1] === '}' && text[i + 2] === '}' && depth >= 3) {
      depth -= 3;
      i += 3;
      if (depth === 0) return i;
      continue;
    }
    if (text[i] === '}' && text[i + 1] === '}' && depth >= 2) {
      depth -= 2;
      i += 2;
      if (depth === 0) return i;
      continue;
    }
    i += 1;
  }
  return -1;
}

function findTopLevelPipe(segment: string): number {
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    const next = segment[i + 1];
    if (ch === '{' && next === '{') {
      braceDepth += 1;
      i += 1;
      continue;
    }
    if (ch === '}' && next === '}' && braceDepth > 0) {
      braceDepth -= 1;
      i += 1;
      continue;
    }
    if (ch === '[' && next === '[') {
      bracketDepth += 1;
      i += 1;
      continue;
    }
    if (ch === ']' && next === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
      i += 1;
      continue;
    }
    if (ch === '(') parenDepth += 1;
    else if (ch === ')' && parenDepth > 0) parenDepth -= 1;
    else if (ch === '|' && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      return i;
    }
  }
  return -1;
}

function substituteTemplatePlaceholders(
  source: string,
  call: ParsedTemplateCall,
  dynamicParams?: Record<string, string>,
  pass = 0
): string {
  if (pass > 4 || !source.includes('{{{')) return source;

  let out = '';
  let cursor = 0;

  while (cursor < source.length) {
    const openIdx = source.indexOf('{{{', cursor);
    if (openIdx === -1) {
      out += source.slice(cursor);
      break;
    }

    const closeIdx = findMatchingTripleBraceEnd(source, openIdx);
    if (closeIdx === -1) {
      out += source.slice(cursor);
      break;
    }

    out += source.slice(cursor, openIdx);
    const inner = source.slice(openIdx + 3, closeIdx - 3);
    const pipeIdx = findTopLevelPipe(inner);
    const rawKey = (pipeIdx === -1 ? inner : inner.slice(0, pipeIdx)).trim();
    const defaultExpr = pipeIdx === -1 ? '' : inner.slice(pipeIdx + 1);
    const norm = normalizeTemplateKey(rawKey);

    let resolved: string | undefined;
    if (rawKey in call.params && call.params[rawKey] !== '') {
      resolved = call.params[rawKey];
    } else if (norm in call.params && call.params[norm] !== '') {
      resolved = call.params[norm];
    } else if (dynamicParams) {
      if (rawKey in dynamicParams && dynamicParams[rawKey] !== '') {
        resolved = dynamicParams[rawKey];
      } else if (norm in dynamicParams && dynamicParams[norm] !== '') {
        resolved = dynamicParams[norm];
      }
    }

    if (resolved !== undefined) {
      out += resolved;
    } else if (defaultExpr) {
      out += substituteTemplatePlaceholders(defaultExpr, call, dynamicParams, pass + 1);
    }

    cursor = closeIdx;
  }

  return out;
}

/**
 * Prepares custom community template page markdown for transclusion:
 * - removes <noinclude>...</noinclude> documentation blocks
 * - unwraps <includeonly>...</includeonly> tags
 * - substitutes MediaWiki parameters {{{param|default}}} and {{{1|default}}}
 */
function instantiateCustomTemplateBody(
  templateContent: string,
  call: ParsedTemplateCall,
  dynamicParams?: Record<string, string>
): string {
  const withoutNoinclude = templateContent
    .replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, '')
    .replace(/<\/?includeonly>/gi, '')
    .trim();

  return substituteTemplatePlaceholders(withoutNoinclude, call, dynamicParams);
}

/**
 * Extracts custom wiki templates stored in Firestore / pages list
 * (pages whose slug starts with `predefinicao-` or `template-`, or whose category/tags declare a template).
 */
export function listCustomWikiTemplates(pages: WikiPage[] = []): WikiPage[] {
  return pages
    .filter(
      (p) =>
        p.slug.startsWith('predefinicao-') ||
        p.slug.startsWith('template-') ||
        p.tags.some((t) => {
          const norm = normalizeTemplateKey(t);
          return norm === 'predefinicao' || norm === 'template';
        })
    )
    .sort((a, b) => a.title.localeCompare(b.title, 'en-US'));
}

function findCustomTemplatePage(
  rawName: string,
  cleanName: string,
  pagesBySlug: Map<string, WikiPage>
): WikiPage | null {
  const cleanSlug = toWikiSlug(cleanName);
  const rawSlug = toWikiSlug(rawName);
  const candidates = [
    `predefinicao-${cleanSlug}`,
    `template-${cleanSlug}`,
    cleanSlug,
    rawSlug,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const page = pagesBySlug.get(candidate);
    if (
      page &&
      (page.slug.startsWith('predefinicao-') ||
        page.slug.startsWith('template-') ||
        page.tags.some((t) => {
          const n = normalizeTemplateKey(t);
          return n === 'predefinicao' || n === 'template';
        }))
    ) {
      return page;
    }
  }
  return null;
}

const MAX_TEMPLATE_DEPTH = 4;

/**
 * Strips `<noinclude>` and `<includeonly>` XML wrappers cleanly when viewing a
 * template page directly so template docs stay readable without raw HTML tags.
 */
export function prepareTemplateSourceForDirectView(markdown: string, slug?: string): string {
  if (!slug || (!slug.startsWith('predefinicao-') && !slug.startsWith('template-'))) {
    return markdown;
  }
  return markdown
    .replace(/<\/?noinclude>/gi, '')
    .replace(/<includeonly>[\s\S]*?<\/includeonly>/gi, '');
}

const FENCE_AND_INFOBOX_SPLIT_REGEX =
  /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`|^:::infobox(?:[ \t]+[a-zA-Z0-9_-]+)?[ \t]*\r?\n[\s\S]*?^:::[ \t]*$|^:::predefinicao(?:[ \t]+[a-zA-Z0-9_-]+)?[ \t]*\r?\n[\s\S]*?^:::[ \t]*$)/gm;

/**
 * Expands MediaWiki-style templates (`{{Aviso|...}}`, `{{Esboço}}`, `{{Info|...}}`,
 * `{{Predefinição:MinhaPredef}}`, etc.) across Markdown text while leaving fenced code
 * blocks and existing block directives intact.
 */
export function resolveWikiTemplates(
  markdown: string,
  pages: WikiPage[] = [],
  options?: TemplateExpansionOptions
): string {
  if (!markdown) return markdown;

  const depth = options?.depth ?? 0;
  const currentSlug = options?.currentSlug;
  const directCleaned =
    depth === 0 ? prepareTemplateSourceForDirectView(markdown, currentSlug) : markdown;

  if (depth >= MAX_TEMPLATE_DEPTH || !directCleaned.includes('{{')) {
    return directCleaned;
  }

  const visitedSlugs = options?.visitedSlugs ?? new Set<string>(currentSlug ? [currentSlug] : []);
  const pagesBySlug = new Map<string, WikiPage>();
  for (const p of pages) {
    pagesBySlug.set(p.slug, p);
  }

  const segments = directCleaned.split(FENCE_AND_INFOBOX_SPLIT_REGEX);

  return segments
    .map((segment, segIdx) => {
      if (!segment || segIdx % 2 === 1) {
        return segment;
      }

      let out = '';
      let cursor = 0;

      while (cursor < segment.length) {
        const openIdx = segment.indexOf('{{', cursor);
        if (openIdx === -1) {
          out += segment.slice(cursor);
          break;
        }

        // Skip parameter placeholders {{{...}}} when evaluating outer text
        if (segment[openIdx + 2] === '{') {
          const closeTriple = findMatchingTripleBraceEnd(segment, openIdx);
          if (closeTriple !== -1) {
            out += segment.slice(cursor, closeTriple);
            cursor = closeTriple;
            continue;
          }
        }

        const closeIdx = findMatchingDoubleBraceEnd(segment, openIdx);
        if (closeIdx === -1) {
          out += segment.slice(cursor);
          break;
        }

        out += segment.slice(cursor, openIdx);
        const fullMatch = segment.slice(openIdx, closeIdx);
        const inner = segment.slice(openIdx + 2, closeIdx - 2);
        const call = parseTemplateCallBody(inner);

        if (!call) {
          out += fullMatch;
          cursor = closeIdx;
          continue;
        }

        // Check whether this template call sits alone on its own line
        const lineStart = segment.lastIndexOf('\n', openIdx - 1) + 1;
        const lineEndRaw = segment.indexOf('\n', closeIdx);
        const lineEnd = lineEndRaw === -1 ? segment.length : lineEndRaw;
        const beforeOnLine = segment.slice(lineStart, openIdx).trim();
        const afterOnLine = segment.slice(closeIdx, lineEnd).trim();
        const isStandaloneLine = beforeOnLine === '' && afterOnLine === '';

        const { explicitNamespace, cleanName } = stripTemplateNamespace(call.rawName);

        // Resolve any nested {{...}} inside parameter values before instantiating
        if (inner.includes('{{')) {
          const resolveArg = (val: string) =>
            val.includes('{{')
              ? resolveWikiTemplates(val, pages, {
                  ...options,
                  depth: depth + 1,
                  visitedSlugs,
                })
              : val;

          for (const key of Object.keys(call.params)) {
            call.params[key] = resolveArg(call.params[key]);
          }
          for (let pi = 0; pi < call.positional.length; pi++) {
            call.positional[pi] = resolveArg(call.positional[pi]);
          }
          for (const entry of call.orderedEntries) {
            entry.value = resolveArg(entry.value);
          }
        }

        // Priority 1: Community-created template page in Firestore (e.g., predefinicao-*)
        const customPage = findCustomTemplatePage(call.rawName, cleanName, pagesBySlug);
        if (customPage && !visitedSlugs.has(customPage.slug)) {
          const nextVisited = new Set(visitedSlugs);
          nextVisited.add(customPage.slug);
          const rawExpanded = instantiateCustomTemplateBody(
            customPage.content,
            call,
            options?.dynamicParams
          );
          out += resolveWikiTemplates(rawExpanded, pages, {
            currentSlug: customPage.slug,
            currentTitle: options?.currentTitle ?? customPage.title,
            dynamicParams: options?.dynamicParams,
            depth: depth + 1,
            visitedSlugs: nextVisited,
          });
          cursor = closeIdx;
          continue;
        }

        // Priority 2: Built-in MediaWiki-compatible Predefinição
        const builtinExpanded = resolveBuiltinTemplate(
          cleanName,
          call,
          isStandaloneLine,
          options
        );
        if (builtinExpanded !== null) {
          out += builtinExpanded;
          cursor = closeIdx;
          continue;
        }

        // Priority 3: Explicit {{Predefinição:Foo}} / {{Template:Foo}} pointing to a missing template page
        if (explicitNamespace) {
          const prefix = explicitNamespace === 'template' ? 'template-' : 'predefinicao-';
          const targetSlug = toWikiSlug(`${prefix}${cleanName}`) || 'template-new';
          const displayLabel = `Template:${cleanName}`;
          out += `[[${targetSlug}|${displayLabel}]]`;
          cursor = closeIdx;
          continue;
        }

        // Otherwise leave unrecognized double-braces intact
        out += fullMatch;
        cursor = closeIdx;
      }

      return out;
    })
    .join('');
}

export interface SpeedyDeletionTemplateMatch {
  reason: string;
  rule: string;
  proponent: string;
}

/**
 * Scans article markdown (ignoring fenced code blocks, `<noinclude>` blocks, and
 * existing serialized `:::infobox` / `:::predefinicao` blocks) for a
 * `{{Eliminação rápida|...}}` (or alias `{{ER}}`, `{{Speedy delete}}`, `{{DB}}`) call.
 */
export function extractSpeedyDeletionTemplate(markdown: string): SpeedyDeletionTemplateMatch | null {
  if (!markdown || !markdown.includes('{{')) return null;

  const cleaned = markdown.replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, '');
  const segments = cleaned.split(FENCE_AND_INFOBOX_SPLIT_REGEX);

  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const segment = segments[segIdx];
    if (!segment || segIdx % 2 === 1) continue;

    let cursor = 0;
    while (cursor < segment.length) {
      const openIdx = segment.indexOf('{{', cursor);
      if (openIdx === -1) break;

      if (segment[openIdx + 2] === '{') {
        const closeTriple = findMatchingTripleBraceEnd(segment, openIdx);
        if (closeTriple !== -1) {
          cursor = closeTriple;
          continue;
        }
      }

      const closeIdx = findMatchingDoubleBraceEnd(segment, openIdx);
      if (closeIdx === -1) break;

      const inner = segment.slice(openIdx + 2, closeIdx - 2);
      const call = parseTemplateCallBody(inner);
      if (call) {
        const { cleanName } = stripTemplateNamespace(call.rawName);
        const key = normalizeTemplateKey(cleanName);
        if (isSpeedyDeletionKey(key)) {
          return {
            reason: pickParam(call, ['motivo', 'reason', 'justificativa', 'texto', 'text', '1']),
            rule: pickParam(call, ['regra', 'rule', 'criterio', 'critério', '2']),
            proponent: pickParam(call, ['proponente', 'editor', 'usuario', 'usuário', 'by']),
          };
        }
      }

      cursor = closeIdx;
    }
  }

  return null;
}

function findMatchingDoubleBraceEnd(text: string, openIdx: number): number {
  const stack: number[] = [];
  let i = openIdx;
  while (i < text.length) {
    if (text[i] === '{' && text[i + 1] === '{' && text[i + 2] === '{') {
      stack.push(3);
      i += 3;
      continue;
    }
    if (text[i] === '{' && text[i + 1] === '{') {
      stack.push(2);
      i += 2;
      continue;
    }
    const top = stack[stack.length - 1];
    if (top === 3 && text[i] === '}' && text[i + 1] === '}' && text[i + 2] === '}') {
      stack.pop();
      i += 3;
      if (stack.length === 0) return i;
      continue;
    }
    if (top === 2 && text[i] === '}' && text[i + 1] === '}') {
      stack.pop();
      i += 2;
      if (stack.length === 0) return i;
      continue;
    }
    i += 1;
  }
  return -1;
}

export interface StarterTemplateSeed {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  summary: string;
  content: string;
}

export const STARTER_TEMPLATE_SLUG = 'predefinicao-boas-vindas';
export const STARTER_TEMPLATE_TITLE = 'Template:Welcome';
export const STARTER_TEMPLATE_CATEGORY = 'reference';
export const STARTER_TEMPLATE_TAGS = ['predefinicao', 'template', 'mediawiki', 'onboarding'];
export const STARTER_TEMPLATE_SUMMARY =
  'Reusable MediaWiki-style community welcome template with usage rules link and parameter substitution';
export const STARTER_TEMPLATE_CONTENT = `<noinclude>
This page defines the **Welcome Template** (\`{{Template:Welcome|contributor=...|topic=...}}\` or legacy \`{{Boas-vindas|colaborador=...|tema=...}}\`) with a direct link to the [WikiMaker Usage Rules & Terms](#/terms). Content inside \`<noinclude>\` appears only here as documentation, while the block outside \`<noinclude>\` is transcluded into articles and talk pages.

## Usage

\`\`\`markdown
{{Template:Welcome|contributor=WazzimaGiygg|topic=WazzimaGiygg Maker}}
\`\`\`

## Live Preview

</noinclude>{{Notice|type=success|title=Welcome, {{{contributor|{{{colaborador|Collaborator}}}}}}!|text=Thank you for contributing to {{{topic|{{{tema|WazzimaGiygg Maker}}}}}}. Before getting started, please review the [WikiMaker Usage Rules & Terms](#/terms), read the [[markdown-guide|Markdown & Templates Guide]], or explore [[ecossistema-wazzimagiygg|WazzimaGiygg Ecosystem Products]].|date={{{date|{{{data|}}}}}}}}`;

export const ENGLISH_COMMUNITY_TEMPLATES: StarterTemplateSeed[] = [
  {
    slug: 'template-welcome',
    title: 'Template:Welcome',
    category: 'reference',
    tags: ['template', 'predefinicao', 'mediawiki', 'onboarding'],
    summary:
      'Reusable English MediaWiki welcome notice template with WikiMaker usage rules link and contributor parameters',
    content: `<noinclude>
Reusable English **MediaWiki-style template** (\`{{Template:Welcome|contributor=...|topic=...}}\`) linking to the [WikiMaker Usage Rules & Terms](#/terms). Content inside \`<noinclude>\` is displayed only as documentation on this template page.

## Usage

\`\`\`markdown
{{Template:Welcome|contributor=Jane Doe|topic=Open Documentation}}
\`\`\`

## Live preview

</noinclude>{{Notice|type=success|title=Welcome, {{{contributor|Collaborator}}}!|text=Thank you for contributing to {{{topic|WazzimaGiygg Maker}}}. Please review the [WikiMaker Usage Rules & Terms](#/terms), check the [[markdown-guide|Markdown & Templates Guide]], or explore [[ecossistema-wazzimagiygg|WazzimaGiygg Ecosystem Products]].}}`,
  },
  {
    slug: 'template-editorial-review',
    title: 'Template:Editorial Review',
    category: 'reference',
    tags: ['template', 'predefinicao', 'editorial', 'verification'],
    summary: 'Reusable English peer-review and source verification banner template',
    content: `<noinclude>
Reusable **English editorial verification template** (\`{{Template:Editorial Review|status=...|reviewer=...|date=...|notes=...}}\`) for dossiers, technical references, and audited articles.

## Usage

\`\`\`markdown
{{Template:Editorial Review|status=verified|reviewer=Editorial Board|date=November 2026|notes=Primary sources and citations checked.}}
\`\`\`

## Live preview

</noinclude>{{Verify|status={{{status|verified}}}|reviewer={{{reviewer|Editorial Board}}}|date={{{date|November 2026}}}|note={{{notes|Primary sources, internal links, and bibliographic references have been verified.}}}}}`,
  },
  {
    slug: 'template-release-notes',
    title: 'Template:Release Notes',
    category: 'reference',
    tags: ['template', 'predefinicao', 'release', 'changelog'],
    summary: 'Reusable English project release summary infobox template',
    content: `<noinclude>
Reusable **English release summary template** (\`{{Template:Release Notes|project=...|version=...|date=...|status=...|highlights=...}}\`) rendering a standardized project release card.

## Usage

\`\`\`markdown
{{Template:Release Notes|project=WazzimaGiygg Core|version=v2.4.0|date=November 2026|status=Stable|highlights=MediaWiki template engine with dynamic parameters.}}
\`\`\`

## Live preview

</noinclude>{{Infobox|type=project|title={{{project|Project Release}}}|subtitle={{{version|v1.0.0}}} · {{{date|November 2026}}}|Status={{{status|Stable}}}|Highlights={{{highlights|See the changelog section for detailed release notes.}}}}}`,
  },
];
