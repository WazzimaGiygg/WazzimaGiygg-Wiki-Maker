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
    name: 'Aviso',
    aliases: ['aviso', 'ambox', 'notice', 'alerta', 'nota'],
    category: 'notices',
    description:
      'Caixa de aviso editorial no estilo MediaWiki (Ambox) para alertas, revisões, notas ou confirmações.',
    exampleSnippet:
      '{{Aviso|tipo=cuidado|título=Conteúdo em revisão|texto=As informações desta seção passam por verificação colaborativa.}}',
    params: [
      {
        key: 'tipo',
        label: 'Tipo (nota, cuidado, critico, sucesso)',
        placeholder: 'nota',
        defaultValue: 'cuidado',
      },
      {
        key: 'título',
        label: 'Título do aviso',
        placeholder: 'Conteúdo em revisão',
        defaultValue: 'Editorial Notice',
      },
      {
        key: 'texto',
        label: 'Mensagem',
        placeholder: 'Descreva o motivo do aviso...',
        defaultValue: 'This section is currently under collaborative review.',
        required: true,
      },
    ],
  },
  {
    id: 'boas-vindas',
    name: 'Boas-vindas',
    aliases: ['boas-vindas', 'boas vindas', 'welcome'],
    category: 'notices',
    language: 'pt',
    description:
      'Caixa de boas-vindas para novos colaboradores e páginas de discussão com link direto para as Regras de Uso do WikiMaker.',
    exampleSnippet:
      '{{Boas-vindas|colaborador=Novo Colaborador|tema=WazzimaGiygg Maker}}',
    params: [
      {
        key: 'colaborador',
        label: 'Nome do colaborador',
        placeholder: 'Colaborador',
        defaultValue: 'Colaborador',
      },
      {
        key: 'tema',
        label: 'Projeto ou tema',
        placeholder: 'WazzimaGiygg Maker',
        defaultValue: 'WazzimaGiygg Maker',
      },
    ],
  },
  {
    id: 'esboco',
    name: 'Esboço',
    aliases: ['esboco', 'stub'],
    category: 'notices',
    description:
      'Marca o artigo como um esboço no padrão MediaWiki, convidando colaboradores a expandir o conteúdo.',
    exampleSnippet: '{{Esboço|Governança Digital}}',
    params: [
      {
        key: '1',
        label: 'Área ou tema (opcional)',
        placeholder: 'Tecnologia',
        defaultValue: 'Wiki Documentation',
      },
    ],
  },
  {
    id: 'em-construcao',
    name: 'Em construção',
    aliases: ['em construcao', 'wip', 'construcao', 'manutencao'],
    category: 'notices',
    description:
      'Informa que a página está em edição ativa e pode sofrer alterações estruturais em breve.',
    exampleSnippet: '{{Em construção|Previsão de conclusão: esta semana.}}',
    params: [
      {
        key: '1',
        label: 'Nota complementar (opcional)',
        placeholder: 'Previsão ou contexto da edição...',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'carece-de-fontes',
    name: 'Carece de fontes',
    aliases: ['carece de fontes', 'sem fontes', 'citation needed', 'fonte', 'cn'],
    category: 'notices',
    description:
      'Quando usado sozinho em uma linha (ou com data), exibe banner de manutenção; no meio do texto, insere ^[carece de fontes]^.',
    exampleSnippet: '{{Carece de fontes|data=November 2026}}',
    params: [
      {
        key: 'data',
        label: 'Data (opcional)',
        placeholder: 'November 2026',
        defaultValue: 'November 2026',
      },
    ],
  },
  {
    id: 'desambiguacao',
    name: 'Desambiguação',
    aliases: ['desambiguacao', 'desambig', 'disambig', 'disambiguation'],
    category: 'notices',
    description:
      'Aviso padrão de página de desambiguação listando significados distintos para o mesmo termo.',
    exampleSnippet: '{{Desambiguação|WazzimaGiygg}}',
    params: [
      {
        key: '1',
        label: 'Termo ambíguo',
        placeholder: 'Termo ou sigla',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'eliminacao-rapida',
    name: 'Eliminação rápida',
    aliases: ['eliminacao rapida', 'er', 'speedy delete', 'speedy deletion', 'db', 'delete'],
    category: 'notices',
    language: 'pt',
    description:
      'Marca o artigo para eliminação rápida e envia automaticamente um alerta para a página de discussão do autor ao salvar.',
    exampleSnippet:
      '{{Eliminação rápida|motivo=Página de teste ou sem conteúdo enciclopédico mínimo|regra=ER1}}',
    params: [
      {
        key: 'motivo',
        label: 'Motivo da eliminação rápida',
        placeholder: 'Descreva o critério ou justificativa...',
        defaultValue: 'Conteúdo impróprio, teste ou fora do escopo editorial da wiki.',
        required: true,
      },
      {
        key: 'regra',
        label: 'Regra / Critério (opcional)',
        placeholder: 'ER1',
        defaultValue: 'ER1',
      },
      {
        key: 'proponente',
        label: 'Proponente (opcional)',
        placeholder: 'Seu nome de colaborador',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'bloqueio',
    name: 'Bloqueio',
    aliases: ['bloqueio', 'bloqueado', 'block', 'blocked', 'user blocked'],
    category: 'notices',
    language: 'pt',
    description:
      'Aviso de bloqueio administrativo inserido automaticamente na página pessoal do colaborador bloqueado.',
    exampleSnippet:
      '{{Bloqueio|motivo=Violação reiterada das políticas editoriais|administrador=Administração|duracao=Indeterminado}}',
    params: [
      {
        key: 'motivo',
        label: 'Motivo do bloqueio',
        placeholder: 'Descreva o motivo administrativo...',
        defaultValue: 'Violação das regras editoriais ou de conduta.',
        required: true,
      },
      {
        key: 'administrador',
        label: 'Administrador responsável',
        placeholder: 'Administração',
        defaultValue: 'Administração',
      },
      {
        key: 'duracao',
        label: 'Duração',
        placeholder: 'Indeterminado',
        defaultValue: 'Indeterminado',
      },
      {
        key: 'data',
        label: 'Data (opcional)',
        placeholder: '2026-11-25',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'principal',
    name: 'Principal',
    aliases: ['principal', 'artigo principal', 'main'],
    category: 'navigation',
    description:
      'Indica o artigo principal de uma seção no formato clássico da Wikipédia / MediaWiki.',
    exampleSnippet: '{{Principal|ecossistema-wazzimagiygg|WazzimaGiygg Ecosystem Products}}',
    params: [
      {
        key: '1',
        label: 'Slug do artigo principal',
        placeholder: 'ecossistema-wazzimagiygg',
        defaultValue: 'ecossistema-wazzimagiygg',
        required: true,
      },
      {
        key: '2',
        label: 'Título exibido (opcional)',
        placeholder: 'WazzimaGiygg Ecosystem Products',
        defaultValue: 'WazzimaGiygg Ecosystem Products',
      },
    ],
  },
  {
    id: 'ver-tambem',
    name: 'Ver também',
    aliases: ['ver tambem', 'see also', 'veja tambem'],
    category: 'navigation',
    description:
      'Insere faixa de remissão cruzada ("Ver também") conectando até 3 páginas relacionadas.',
    exampleSnippet: '{{Ver também|dossie-wikipedia-abusos|investigacao-lgpd-marco-civil-wmf-wikipedia}}',
    params: [
      {
        key: '1',
        label: 'Primeiro slug',
        placeholder: 'dossie-wikipedia-abusos',
        defaultValue: 'dossie-wikipedia-abusos',
        required: true,
      },
      {
        key: '2',
        label: 'Segundo slug (opcional)',
        placeholder: 'investigacao-lgpd-marco-civil-wmf-wikipedia',
        defaultValue: 'investigacao-lgpd-marco-civil-wmf-wikipedia',
      },
    ],
  },
  {
    id: 'citacao',
    name: 'Citação',
    aliases: ['citacao', 'quote', 'cquote'],
    category: 'navigation',
    description:
      'Bloco de citação destacada com atribuição de autor e obra/fonte no padrão MediaWiki.',
    exampleSnippet:
      '{{Citação|texto=Open knowledge thrives on transparent accountability and independent publishing.|autor=WazzimaGiygg Editorial|fonte=Project Charter}}',
    params: [
      {
        key: 'texto',
        label: 'Texto citado',
        placeholder: 'Digite a citação...',
        defaultValue: 'Open knowledge thrives on transparent accountability.',
        required: true,
      },
      {
        key: 'autor',
        label: 'Autor',
        placeholder: 'Nome do autor',
        defaultValue: 'WazzimaGiygg Editorial',
      },
      {
        key: 'fonte',
        label: 'Fonte / Obra (opcional)',
        placeholder: 'Documento ou artigo',
        defaultValue: '',
      },
    ],
  },
  {
    id: 'info',
    name: 'Info (Infobox MediaWiki)',
    aliases: ['info', 'infobox', 'ficha'],
    category: 'infobox',
    description:
      'Sintaxe de chave/valor igual às predefinições {{Info/...}} da MediaWiki; renderiza um cartão Infobox completo.',
    exampleSnippet:
      '{{Info|tipo=project|título=WikiWazzimaGiygg|subtítulo=Enciclopédia Independente|Status=Active|Portal=[wazzimagiygg.com](https://wazzimagiygg.com/)}}',
    params: [
      {
        key: 'tipo',
        label: 'Tipo (general, project, organization, character, location, item, user)',
        placeholder: 'project',
        defaultValue: 'project',
      },
      {
        key: 'título',
        label: 'Título',
        placeholder: 'Nome do verbete',
        defaultValue: 'Wiki Project',
        required: true,
      },
      {
        key: 'subtítulo',
        label: 'Subtítulo',
        placeholder: 'Classificação breve',
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
    id: 'ecossistema-wazzimagiygg',
    name: 'Ecossistema WazzimaGiygg',
    aliases: ['ecossistema wazzimagiygg', 'wazzimagiygg', 'wikipedia dossie', 'a verdade'],
    category: 'ecosystem',
    description:
      'Caixa institucional padrão conectando os 5 portais WazzimaGiygg e o dossiê A Verdade sobre a Wikipédia.',
    exampleSnippet: '{{Ecossistema WazzimaGiygg}}',
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
  lines.push(`kicker: ${sanitizePredefLine(opts.kicker) || 'Predefinição'}`);
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
      ['colaborador', 'contributor', 'nome', 'user', '1'],
      'Colaborador'
    );
    const topic = pickParam(call, ['tema', 'topic', '2'], 'WazzimaGiygg Maker');
    const dateVal = pickParam(call, ['data', 'date', 'meta']);
    const isEnglish = key === 'welcome';

    return serializePredefinicaoBlock({
      variant: 'success',
      kicker: isEnglish ? 'Template · Welcome' : 'Predefinição · Boas-vindas',
      title: isEnglish ? `Welcome, ${collaborator}!` : `Boas-vindas, ${collaborator}!`,
      body: isEnglish
        ? `Thank you for contributing to ${topic}. Before creating or editing pages, please review the [WikiMaker Usage Rules & Terms](#/terms), check the [[markdown-guide|Markdown & Templates Guide]], or explore [[ecossistema-wazzimagiygg|WazzimaGiygg Ecosystem Products]].`
        : `Olá, ${collaborator}! Obrigado por contribuir com ${topic}. Antes de criar ou editar artigos, consulte as [Regras de Uso do WikiMaker](#/terms), confira o [[markdown-guide|Guia de Markdown e Predefinições]] ou explore os [[ecossistema-wazzimagiygg|Produtos do Ecossistema WazzimaGiygg]].`,
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
    const work = pickParam(call, ['obra', '1']);
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
      ['motivo', 'reason', 'justificativa', 'texto', 'text', '1'],
      'Este artigo foi proposto para eliminação rápida por não atender aos critérios mínimos da wiki.'
    );
    const rule = pickParam(call, ['regra', 'rule', 'criterio', 'critério', '2']);
    const proponent = pickParam(call, ['proponente', 'editor', 'usuario', 'usuário', 'by']);
    const dateVal = pickParam(call, ['data', 'date']);
    const metaParts = [
      proponent ? `Proponente: ${proponent}` : '',
      dateVal ? `Data: ${dateVal}` : '',
    ].filter(Boolean);

    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Predefinição · Eliminação rápida',
      title: rule
        ? `Página proposta para eliminação rápida (${rule})`
        : 'Página proposta para eliminação rápida',
      body: `Motivo: ${reason} — Um alerta automático é enviado à página de discussão do autor ao inserir esta marcação. Consulte as [Regras de Uso do WikiMaker](#/terms) antes de remover este aviso.`,
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
      ['motivo', 'reason', 'texto', 'text', '1'],
      'Violação das políticas editoriais ou de conduta da wiki.'
    );
    const admin = pickParam(call, ['administrador', 'admin', 'by', 'moderador', '2']);
    const duration = pickParam(call, ['duracao', 'duration', 'prazo', '3'], 'Indeterminado');
    const dateVal = pickParam(call, ['data', 'date', '4']);
    const metaParts = [
      admin ? `Responsável: ${admin}` : '',
      dateVal ? `Aplicado em: ${dateVal}` : '',
    ].filter(Boolean);

    return serializePredefinicaoBlock({
      variant: 'alert',
      kicker: 'Predefinição · Bloqueio de Conta',
      title: 'Esta conta está bloqueada para edições',
      body: `Motivo do bloqueio: ${reason}. Duração: ${duration}.${
        admin ? ` Aplicado por: ${admin}.` : ''
      } Consulte a página de discussão para mais detalhes e leia as [Regras de Uso do WikiMaker](#/terms).`,
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

  // 9j. {{Cite web}} / {{Cite}} / {{Web ref}}
  if (key === 'cite web' || key === 'cite' || key === 'web ref') {
    const title = pickParam(call, ['title', '1'], 'Referenced Web Source');
    const url = pickParam(call, ['url', '2', 'link']);
    const author = pickParam(call, ['author', 'last']);
    const publisher = pickParam(call, ['publisher', 'work', 'website']);
    const dateVal = pickParam(call, ['date', 'year']);
    const refName = pickParam(call, ['name']).replace(/["<>]/g, '').trim();

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

  // 11. {{Info}} / {{Infobox}} / {{Ficha}}
  if (key === 'info' || key === 'infobox' || key === 'ficha' || key.startsWith('info/')) {
    const subType = key.startsWith('info/') ? key.slice('info/'.length) : '';
    const rawType = normalizeTemplateKey(pickParam(call, ['tipo', 'type'], subType || 'general'));
    const validTypes = new Set<InfoboxType>([
      'general',
      'user',
      'character',
      'location',
      'item',
      'organization',
      'project',
    ]);
    const infoboxType: InfoboxType = validTypes.has(rawType as InfoboxType)
      ? (rawType as InfoboxType)
      : rawType === 'projeto'
      ? 'project'
      : rawType === 'organizacao'
      ? 'organization'
      : rawType === 'personagem'
      ? 'character'
      : rawType === 'lugar' || rawType === 'local'
      ? 'location'
      : rawType === 'usuario'
      ? 'user'
      : 'general';

    const title = pickParam(call, ['título', 'titulo', 'title', 'nome', 'name'], 'Untitled');
    const subtitle = pickParam(call, ['subtítulo', 'subtitulo', 'subtitle']) || undefined;
    const image = pickParam(call, ['imagem', 'image', 'foto']) || undefined;
    const imageCaption = pickParam(call, ['legenda', 'caption', 'imageCaption']) || undefined;
    const rawAlign = normalizeTemplateKey(pickParam(call, ['layout', 'align', 'alinhamento'], 'right'));
    const layout = rawAlign === 'left' || rawAlign === 'full' ? rawAlign : 'right';

    const reserved = new Set([
      'tipo',
      'type',
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
          const targetSlug = toWikiSlug(`${prefix}${cleanName}`) || 'predefinicao-nova';
          const displayLabel =
            explicitNamespace === 'template'
              ? `Template:${cleanName}`
              : `Predefinição:${cleanName}`;
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
export const STARTER_TEMPLATE_TITLE = 'Predefinição:Boas-vindas';
export const STARTER_TEMPLATE_CATEGORY = 'reference';
export const STARTER_TEMPLATE_TAGS = ['predefinicao', 'template', 'mediawiki', 'onboarding'];
export const STARTER_TEMPLATE_SUMMARY =
  'Reusable MediaWiki-style community welcome template with usage rules link and parameter substitution';
export const STARTER_TEMPLATE_CONTENT = `<noinclude>
Esta página define a **Predefinição de Boas-vindas** (\`{{Predefinição:Boas-vindas}}\` ou \`{{Boas-vindas|colaborador=...|tema=...}}\`) com link direto para as [Regras de Uso do WikiMaker](#/terms). O conteúdo dentro de \`<noinclude>\` aparece apenas aqui como documentação, enquanto o bloco fora de \`<noinclude>\` é transcluído nos artigos e páginas de discussão.

## Como usar

\`\`\`markdown
{{Predefinição:Boas-vindas|colaborador=WazzimaGiygg|tema=WazzimaGiygg Maker}}
\`\`\`

## Visualização ao vivo

</noinclude>{{Aviso|tipo=sucesso|título=Boas-vindas, {{{colaborador|Colaborador}}}!|texto=Obrigado por contribuir com {{{tema|WazzimaGiygg Maker}}}. Antes de começar, consulte as [Regras de Uso do WikiMaker](#/terms), leia o [[markdown-guide|Guia de Markdown e Predefinições]] ou explore os [[ecossistema-wazzimagiygg|Produtos do Ecossistema WazzimaGiygg]].|data={{{data|}}}}}`;

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
