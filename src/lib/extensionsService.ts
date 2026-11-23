import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  type ResolvedWikiExtension,
  VALIDATION_LIMITS,
  type WikiColorSchemePolicy,
  type WikiExtensionCategory,
  type WikiExtensionId,
  type WikiExtensionRecord,
  type WikiExtensionSettings,
} from '../types/wiki';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  DEFAULT_WIKI_THEME_ID,
  getWikiThemeById,
  isRegisteredWikiThemeId,
  WIKI_THEMES,
  type WikiThemeDefinition,
} from './wikiThemes';

export const DEFAULT_SITE_TITLE = 'WazzimaGiygg Maker';
export const DEFAULT_EXTERNAL_LINK_PREFIX = 'https://wazzimagiygg.com/rv/?uid=';

export const EXTENSION_CATEGORY_LABELS: Record<WikiExtensionCategory, string> = {
  appearance: 'Aparência & Temas',
  reading: 'Leitura',
  navigation: 'Navegação',
  authoring: 'Autoria Markdown',
  collaboration: 'Colaboração',
};

export interface ExtensionSettingSelectOption {
  value: string;
  label: string;
  hint?: string;
  editionLabel?: string;
  typographyLabel?: string;
  lightSwatches?: [string, string, string];
  darkSwatches?: [string, string, string];
}

export interface ExtensionSettingFieldDescriptor {
  key: keyof WikiExtensionSettings;
  label: string;
  hint: string;
  type: 'boolean' | 'number' | 'text' | 'select';
  min?: number;
  max?: number;
  maxLength?: number;
  options?: ExtensionSettingSelectOption[];
}

export const EXTENSION_SETTING_DESCRIPTORS: Record<
  WikiExtensionId,
  ExtensionSettingFieldDescriptor[]
> = {
  'site-title': [
    {
      key: 'siteTitle',
      label: 'Título do Wiki-site',
      hint: 'Substitui o nome "WazzimaGiygg Maker" na barra superior, título das guias e rodapé.',
      type: 'text',
      maxLength: VALIDATION_LIMITS.EXTENSION_SITE_TITLE_MAX_LENGTH,
    },
  ],
  'site-theme': [
    {
      key: 'themeId',
      label: 'Tema visual do Wiki-site',
      hint: 'Define a identidade de cores, superfícies e tipografia aplicada ao site e aos PDFs exportados. Novos temas inseridos em atualizações futuras aparecem aqui automaticamente.',
      type: 'select',
      options: WIKI_THEMES.map((theme) => ({
        value: theme.id,
        label: theme.name,
        hint: theme.tagline,
        editionLabel: theme.editionLabel,
        typographyLabel: theme.typographyLabel,
        lightSwatches: theme.lightSwatches,
        darkSwatches: theme.darkSwatches,
      })),
    },
    {
      key: 'colorScheme',
      label: 'Política de modo Claro / Escuro',
      hint: 'Permite que cada leitor alterne livremente ou fixa um esquema global determinado pela burocracia.',
      type: 'select',
      options: [
        {
          value: 'user',
          label: 'Escolha do leitor (padrão)',
          hint: 'Visitantes podem alternar livremente entre Light mode e Dark mode na barra lateral.',
        },
        {
          value: 'light',
          label: 'Forçar modo Claro',
          hint: 'Mantém todo o Wiki-site no modo claro dentro do tema selecionado.',
        },
        {
          value: 'dark',
          label: 'Forçar modo Escuro',
          hint: 'Mantém todo o Wiki-site no modo escuro dentro do tema selecionado.',
        },
      ],
    },
  ],
  toc: [
    {
      key: 'defaultExpanded',
      label: 'Iniciar sumário expandido',
      hint: 'Define se a caixa de sumário começa aberta ao carregar um artigo.',
      type: 'boolean',
    },
    {
      key: 'minHeadings',
      label: 'Mínimo de seções (H2–H3)',
      hint: 'Quantidade mínima de títulos H2 e H3 no artigo para exibir o sumário.',
      type: 'number',
      min: VALIDATION_LIMITS.EXTENSION_MIN_HEADINGS_MIN,
      max: VALIDATION_LIMITS.EXTENSION_MIN_HEADINGS_MAX,
    },
  ],
  references: [
    {
      key: 'footerTitle',
      label: 'Título da seção de referências',
      hint: 'Cabeçalho exibido no rodapé bibliográfico automático.',
      type: 'text',
      maxLength: VALIDATION_LIMITS.EXTENSION_FOOTER_TITLE_MAX_LENGTH,
    },
    {
      key: 'showOutlineLink',
      label: 'Atalho no índice lateral',
      hint: 'Adiciona a entrada Referências ao bloco "On this page".',
      type: 'boolean',
    },
    {
      key: 'allowEditorToolbar',
      label: 'Botão <ref> no editor',
      hint: 'Exibe o atalho de citação bibliográfica na barra do editor Markdown.',
      type: 'boolean',
    },
  ],
  infoboxes: [
    {
      key: 'allowEditorToolbar',
      label: 'Construtor de Infobox no editor',
      hint: 'Exibe o botão e modal de criação de blocos :::infobox no editor.',
      type: 'boolean',
    },
    {
      key: 'allowAutoProfileCard',
      label: 'Cartão automático de perfil',
      hint: 'Gera um Infobox lateral automático em páginas pessoais sem Infobox manual.',
      type: 'boolean',
    },
  ],
  'reading-progress': [],
  'print-view': [
    {
      key: 'showInHeader',
      label: 'Botão Print no cabeçalho',
      hint: 'Mostra o alternador de visualização limpa para impressão nos artigos.',
      type: 'boolean',
    },
    {
      key: 'autoExitOnNavigate',
      label: 'Sair do modo impressão ao navegar',
      hint: 'Desativa automaticamente o modo impressão ao abrir outra página.',
      type: 'boolean',
    },
  ],
  'random-article': [
    {
      key: 'showInNavbar',
      label: 'Exibir na barra superior',
      hint: 'Mostra o botão "Artigo aleatório" no cabeçalho principal de navegação.',
      type: 'boolean',
    },
    {
      key: 'showInSidebar',
      label: 'Exibir na barra lateral',
      hint: 'Mostra o botão "Artigo aleatório" abaixo da busca na barra lateral.',
      type: 'boolean',
    },
    {
      key: 'excludeDiscussions',
      label: 'Ignorar páginas de discussão',
      hint: 'Evita sortear páginas -discussion durante a escolha aleatória.',
      type: 'boolean',
    },
  ],
  'copy-link': [
    {
      key: 'showInHeader',
      label: 'Botão Copy Link no cabeçalho',
      hint: 'Exibe o botão de cópia rápida da URL direta no topo de cada artigo.',
      type: 'boolean',
    },
    {
      key: 'showToastFeedback',
      label: 'Confirmação via toast',
      hint: 'Dispara uma notificação toast confirmando a cópia do endereço.',
      type: 'boolean',
    },
  ],
  'realtime-toasts': [
    {
      key: 'notifyWhileEditing',
      label: 'Alertar durante edição ativa',
      hint: 'Exibe toast de aviso quando outro colaborador salva enquanto você edita.',
      type: 'boolean',
    },
  ],
  'page-discussion': [
    {
      key: 'allowAnonymousRead',
      label: 'Leitura pública de discussões',
      hint: 'Permite que visitantes não autenticados visualizem a aba Discussion.',
      type: 'boolean',
    },
  ],
  'external-link-prefix': [
    {
      key: 'externalLinkPrefix',
      label: 'Parâmetro / prefixo antes dos links externos',
      hint: 'Inserido imediatamente antes de links externos (http:// ou https://). Padrão: https://wazzimagiygg.com/rv/?uid=',
      type: 'text',
      maxLength: VALIDATION_LIMITS.EXTENSION_EXTERNAL_LINK_PREFIX_MAX_LENGTH,
    },
    {
      key: 'encodeTargetUrl',
      label: 'Codificar URL de destino (encodeURIComponent)',
      hint: 'Quando ativado, escapa caracteres da URL original ao anexá-la ao parâmetro; desativado por padrão para inserção direta antes do link.',
      type: 'boolean',
    },
  ],
  'article-ratings': [],
  'page-history': [],
  'page-source': [],
  'pdf-export': [],
  'zip-archive': [],
  'wiki-templates': [],
  'editor-toolbar': [],
  'ecosystem-portal': [],
  'quick-create': [],
  'sidebar-filter': [],
  'user-profiles': [],
  'pwa-install': [],
  'keyboard-shortcuts': [],
  'back-to-top': [],
  'footer-badges': [],
  'page-outline': [],
  'page-metadata': [],
  'page-index-views': [],
  'privacy-banner': [],
  'page-header-banner': [],
};

export const DEFAULT_WIKI_EXTENSIONS: ResolvedWikiExtension[] = [
  {
    id: 'site-title',
    scope: 'site',
    name: 'Título do Wiki-site (Site Branding)',
    description:
      'Permite renomear o título principal do Wiki-site (padrão: "WazzimaGiygg Maker") exibido no cabeçalho, navegador e metadados.',
    category: 'navigation',
    enabled: true,
    sortOrder: 0,
    settings: {
      siteTitle: DEFAULT_SITE_TITLE,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'site-theme',
    scope: 'site',
    name: 'Aparência & Tema Visual',
    description:
      'Altera a aparência global do Wiki-site entre os temas disponíveis no catálogo interno, sincronizando leitura, barra de progresso e exportação PDF.',
    category: 'appearance',
    enabled: true,
    sortOrder: 1,
    settings: {
      themeId: DEFAULT_WIKI_THEME_ID,
      colorScheme: 'user',
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'toc',
    scope: 'site',
    name: 'Sumário Automático (TOC)',
    description:
      'Extrai automaticamente títulos H2 e H3 do artigo para montar o sumário navegável e o índice lateral.',
    category: 'reading',
    enabled: true,
    sortOrder: 2,
    settings: {
      defaultExpanded: true,
      minHeadings: 2,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'references',
    scope: 'site',
    name: 'Referências Bibliográficas (<ref>)',
    description:
      'Converte tags <ref> em citações numeradas [1] com links bidirecionais e rodapé automático de referências.',
    category: 'authoring',
    enabled: true,
    sortOrder: 3,
    settings: {
      footerTitle: 'Referências',
      showOutlineLink: true,
      allowEditorToolbar: true,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'infoboxes',
    scope: 'site',
    name: 'Cartões Infobox (:::infobox)',
    description:
      'Suporta cartões estruturados estilo enciclopédia via :::infobox e cartões automáticos de perfil.',
    category: 'authoring',
    enabled: true,
    sortOrder: 4,
    settings: {
      allowEditorToolbar: true,
      allowAutoProfileCard: true,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'reading-progress',
    scope: 'site',
    name: 'Barra de Progresso de Leitura',
    description:
      'Exibe um indicador contínuo abaixo da barra de navegação medindo a leitura do artigo atual.',
    category: 'reading',
    enabled: true,
    sortOrder: 5,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'print-view',
    scope: 'site',
    name: 'Modo de Impressão & PDF',
    description:
      'Adiciona o alternador Print que gera uma folha CSS limpa sem menus laterais, ferramentas ou toasts.',
    category: 'reading',
    enabled: true,
    sortOrder: 6,
    settings: {
      showInHeader: true,
      autoExitOnNavigate: true,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'random-article',
    scope: 'site',
    name: 'Artigo Aleatório',
    description:
      'Disponibiliza o botão "Artigo aleatório" para descoberta rápida de páginas da base de conhecimento.',
    category: 'navigation',
    enabled: true,
    sortOrder: 7,
    settings: {
      showInNavbar: true,
      showInSidebar: true,
      excludeDiscussions: true,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'copy-link',
    scope: 'site',
    name: 'Copiar Link da Página',
    description:
      'Habilita o botão Copy Link no cabeçalho dos artigos com cópia direta da URL e feedback via toast.',
    category: 'navigation',
    enabled: true,
    sortOrder: 8,
    settings: {
      showInHeader: true,
      showToastFeedback: true,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'realtime-toasts',
    scope: 'site',
    name: 'Notificações em Tempo Real',
    description:
      'Notifica leitores via toast quando outro colaborador publica alterações no artigo aberto no Firestore.',
    category: 'collaboration',
    enabled: true,
    sortOrder: 9,
    settings: {
      notifyWhileEditing: true,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'page-discussion',
    scope: 'site',
    name: 'Discussão & Comentários',
    description:
      'Ativa a aba Discussion e os tópicos colaborativos de comentários em cada artigo da wiki.',
    category: 'collaboration',
    enabled: true,
    sortOrder: 10,
    settings: {
      allowAnonymousRead: true,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'external-link-prefix',
    scope: 'site',
    name: 'Prefixo de Links Externos (Outlink Parameter)',
    description:
      'Insere um parâmetro ou prefixo de redirecionamento configurável antes de todos os links externos (padrão: "https://wazzimagiygg.com/rv/?uid=").',
    category: 'navigation',
    enabled: true,
    sortOrder: 11,
    settings: {
      externalLinkPrefix: DEFAULT_EXTERNAL_LINK_PREFIX,
      encodeTargetUrl: false,
    },
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'article-ratings',
    scope: 'site',
    name: 'Avaliação por Estrelas (1–5)',
    description:
      'Exibe o painel de avaliação de 1 a 5 estrelas no rodapé de leitura dos artigos e registra votos na subcoleção ratings.',
    category: 'collaboration',
    enabled: true,
    sortOrder: 12,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'page-history',
    scope: 'site',
    name: 'Histórico & Restauração de Revisões',
    description:
      'Habilita a aba History com linha do tempo das edições salvas, comparação de versões e restauração de revisões.',
    category: 'collaboration',
    enabled: true,
    sortOrder: 13,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'page-source',
    scope: 'site',
    name: 'Código-Fonte Markdown (Source)',
    description:
      'Ativa a aba Source nos artigos para inspecionar o wikitexto Markdown bruto, copiar ou baixar o arquivo .md.',
    category: 'authoring',
    enabled: true,
    sortOrder: 14,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'pdf-export',
    scope: 'site',
    name: 'Exportação de Artigo em PDF',
    description:
      'Disponibiliza o botão Exportar PDF no cabeçalho dos artigos para gerar documento paginado no tema ativo.',
    category: 'reading',
    enabled: true,
    sortOrder: 15,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'zip-archive',
    scope: 'site',
    name: 'Exportação em Lote (Arquivo ZIP)',
    description:
      'Ativa o botão Export Public ZIP no catálogo de páginas e no console administrativo para baixar arquivos Markdown.',
    category: 'reading',
    enabled: true,
    sortOrder: 16,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'wiki-templates',
    scope: 'site',
    name: 'Predefinições MediaWiki ({{...}})',
    description:
      'Processa transclusões e blocos {{Predefinição}} na leitura e habilita o seletor Pré-definições (Ctrl+Shift+T) no editor.',
    category: 'authoring',
    enabled: true,
    sortOrder: 17,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'editor-toolbar',
    scope: 'site',
    name: 'Barra Visual de Formatação no Editor',
    description:
      'Exibe os botões de formatação rápida (negrito, itálico, títulos, links, listas, citações e tabelas) no editor Markdown.',
    category: 'authoring',
    enabled: true,
    sortOrder: 18,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'ecosystem-portal',
    scope: 'site',
    name: 'Portal Ecossistema WazzimaGiygg',
    description:
      'Exibe os links e a visualização dedicada do ecossistema de serviços WazzimaGiygg e do dossiê público.',
    category: 'navigation',
    enabled: true,
    sortOrder: 19,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'quick-create',
    scope: 'site',
    name: 'Criação Rápida por Slug na Lateral',
    description:
      'Exibe o formulário Quick create by slug na barra lateral para abrir ou criar artigos pelo identificador.',
    category: 'navigation',
    enabled: true,
    sortOrder: 20,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'sidebar-filter',
    scope: 'site',
    name: 'Filtro de Busca na Barra Lateral',
    description:
      'Habilita o campo de pesquisa instantânea Filter pages na barra lateral para filtrar páginas por título, slug ou tags.',
    category: 'navigation',
    enabled: true,
    sortOrder: 21,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'user-profiles',
    scope: 'site',
    name: 'Páginas Pessoais & Histórico do Autor',
    description:
      'Ativa os atalhos My Page e Discussion na barra lateral, registro de edições do colaborador e links de perfil nos rodapés.',
    category: 'collaboration',
    enabled: true,
    sortOrder: 22,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'pwa-install',
    scope: 'site',
    name: 'Instalação PWA & App Offline',
    description:
      'Mostra o botão de instalação de Progressive Web App (PWA) na barra lateral para uso como aplicativo instalado.',
    category: 'appearance',
    enabled: true,
    sortOrder: 23,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'keyboard-shortcuts',
    scope: 'site',
    name: 'Atalhos de Teclado Globais (?)',
    description:
      'Ativa os atalhos globais (Ctrl+E, Ctrl+K, Alt+N, ?), o botão Shortcuts e o modal de referência rápida.',
    category: 'navigation',
    enabled: true,
    sortOrder: 24,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'back-to-top',
    scope: 'site',
    name: 'Botão Flutuante Back to Top',
    description:
      'Exibe o botão flutuante para retornar rapidamente ao topo ao rolar páginas longas na Wiki.',
    category: 'reading',
    enabled: true,
    sortOrder: 25,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'footer-badges',
    scope: 'site',
    name: 'Selos Retro 88x31 no Rodapé',
    description:
      'Renderiza a barra de selos 88x31 no rodapé global com atalhos de suporte, licenciamento, Firebase e conformidade.',
    category: 'appearance',
    enabled: true,
    sortOrder: 26,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'page-outline',
    scope: 'site',
    name: 'Índice Lateral Fixo (On this page)',
    description:
      'Mostra a coluna lateral fixa "On this page" acompanhando a leitura do artigo com links rápidos às seções.',
    category: 'reading',
    enabled: true,
    sortOrder: 27,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'page-metadata',
    scope: 'site',
    name: 'Metadados de Autoria & Tags',
    description:
      'Exibe a linha de versão, visibilidade, autor, último editor, data relativa e #tags no cabeçalho de leitura.',
    category: 'reading',
    enabled: true,
    sortOrder: 28,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'page-index-views',
    scope: 'site',
    name: 'Catálogo Pages & Recent Changes',
    description:
      'Mantém visíveis na barra superior os diretórios completos de páginas (Pages) e alterações recentes (Recent).',
    category: 'navigation',
    enabled: true,
    sortOrder: 29,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'privacy-banner',
    scope: 'site',
    name: 'Banner de Privacidade (LGPD & MCI)',
    description:
      'Exibe o aviso flutuante de privacidade e armazenamento essencial em conformidade com a LGPD e o Marco Civil.',
    category: 'collaboration',
    enabled: true,
    sortOrder: 30,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
  {
    id: 'page-header-banner',
    scope: 'site',
    name: 'Banner de Cabeçalho Personalizado',
    description:
      'Permite enviar ou vincular uma imagem de capa personalizada nos metadados da página e exibi-la como banner no modo de leitura.',
    category: 'appearance',
    enabled: true,
    sortOrder: 31,
    settings: {},
    updatedBy: 'system-default',
    updatedByName: 'Built-in Default',
    createdAt: null,
    updatedAt: null,
    persisted: false,
  },
];

export type SiteExtensionsMap = Record<WikiExtensionId, ResolvedWikiExtension>;

export interface SiteExtensionsState {
  list: ResolvedWikiExtension[];
  byId: SiteExtensionsMap;
  loadedFromFirestore: boolean;
}

const DEFAULT_BY_ID = new Map<WikiExtensionId, ResolvedWikiExtension>(
  DEFAULT_WIKI_EXTENSIONS.map((ext) => [ext.id, ext])
);

export function sanitizeExtensionSettings(
  id: WikiExtensionId,
  raw?: WikiExtensionSettings | null
): WikiExtensionSettings {
  const base = DEFAULT_BY_ID.get(id)?.settings ?? {};
  const src = raw ?? {};

  switch (id) {
    case 'site-title': {
      const trimmedSiteTitle =
        typeof src.siteTitle === 'string'
          ? src.siteTitle.trim().slice(0, VALIDATION_LIMITS.EXTENSION_SITE_TITLE_MAX_LENGTH)
          : '';
      return {
        siteTitle: trimmedSiteTitle || base.siteTitle || DEFAULT_SITE_TITLE,
      };
    }
    case 'site-theme': {
      const rawThemeId = typeof src.themeId === 'string' ? src.themeId.trim() : '';
      const resolvedThemeId = isRegisteredWikiThemeId(rawThemeId)
        ? rawThemeId
        : base.themeId || DEFAULT_WIKI_THEME_ID;
      const resolvedColorScheme: WikiColorSchemePolicy =
        src.colorScheme === 'light' || src.colorScheme === 'dark' || src.colorScheme === 'user'
          ? src.colorScheme
          : base.colorScheme || 'user';
      return {
        themeId: resolvedThemeId,
        colorScheme: resolvedColorScheme,
      };
    }
    case 'toc': {
      const parsedMin =
        typeof src.minHeadings === 'number' && Number.isFinite(src.minHeadings)
          ? Math.round(src.minHeadings)
          : base.minHeadings ?? 1;
      return {
        defaultExpanded:
          typeof src.defaultExpanded === 'boolean'
            ? src.defaultExpanded
            : base.defaultExpanded ?? true,
        minHeadings: Math.max(
          VALIDATION_LIMITS.EXTENSION_MIN_HEADINGS_MIN,
          Math.min(VALIDATION_LIMITS.EXTENSION_MIN_HEADINGS_MAX, parsedMin)
        ),
      };
    }
    case 'references': {
      const trimmedTitle =
        typeof src.footerTitle === 'string'
          ? src.footerTitle.trim().slice(0, VALIDATION_LIMITS.EXTENSION_FOOTER_TITLE_MAX_LENGTH)
          : '';
      return {
        footerTitle: trimmedTitle || base.footerTitle || 'Referências',
        showOutlineLink:
          typeof src.showOutlineLink === 'boolean'
            ? src.showOutlineLink
            : base.showOutlineLink ?? true,
        allowEditorToolbar:
          typeof src.allowEditorToolbar === 'boolean'
            ? src.allowEditorToolbar
            : base.allowEditorToolbar ?? true,
      };
    }
    case 'infoboxes':
      return {
        allowEditorToolbar:
          typeof src.allowEditorToolbar === 'boolean'
            ? src.allowEditorToolbar
            : base.allowEditorToolbar ?? true,
        allowAutoProfileCard:
          typeof src.allowAutoProfileCard === 'boolean'
            ? src.allowAutoProfileCard
            : base.allowAutoProfileCard ?? true,
      };
    case 'reading-progress':
      return {};
    case 'print-view':
      return {
        showInHeader:
          typeof src.showInHeader === 'boolean' ? src.showInHeader : base.showInHeader ?? true,
        autoExitOnNavigate:
          typeof src.autoExitOnNavigate === 'boolean'
            ? src.autoExitOnNavigate
            : base.autoExitOnNavigate ?? true,
      };
    case 'random-article':
      return {
        showInNavbar:
          typeof src.showInNavbar === 'boolean' ? src.showInNavbar : base.showInNavbar ?? true,
        showInSidebar:
          typeof src.showInSidebar === 'boolean' ? src.showInSidebar : base.showInSidebar ?? true,
        excludeDiscussions:
          typeof src.excludeDiscussions === 'boolean'
            ? src.excludeDiscussions
            : base.excludeDiscussions ?? true,
      };
    case 'copy-link':
      return {
        showInHeader:
          typeof src.showInHeader === 'boolean' ? src.showInHeader : base.showInHeader ?? true,
        showToastFeedback:
          typeof src.showToastFeedback === 'boolean'
            ? src.showToastFeedback
            : base.showToastFeedback ?? true,
      };
    case 'realtime-toasts':
      return {
        notifyWhileEditing:
          typeof src.notifyWhileEditing === 'boolean'
            ? src.notifyWhileEditing
            : base.notifyWhileEditing ?? true,
      };
    case 'page-discussion':
      return {
        allowAnonymousRead:
          typeof src.allowAnonymousRead === 'boolean'
            ? src.allowAnonymousRead
            : base.allowAnonymousRead ?? true,
      };
    case 'external-link-prefix': {
      const normalizedPrefix = normalizeExternalLinkPrefix(
        src.externalLinkPrefix,
        base.externalLinkPrefix ?? DEFAULT_EXTERNAL_LINK_PREFIX
      );
      return {
        externalLinkPrefix: normalizedPrefix,
        encodeTargetUrl:
          typeof src.encodeTargetUrl === 'boolean'
            ? src.encodeTargetUrl
            : base.encodeTargetUrl ?? false,
      };
    }
    case 'article-ratings':
    case 'page-history':
    case 'page-source':
    case 'pdf-export':
    case 'zip-archive':
    case 'wiki-templates':
    case 'editor-toolbar':
    case 'ecosystem-portal':
    case 'quick-create':
    case 'sidebar-filter':
    case 'user-profiles':
    case 'pwa-install':
    case 'keyboard-shortcuts':
    case 'back-to-top':
    case 'footer-badges':
    case 'page-outline':
    case 'page-metadata':
    case 'page-index-views':
    case 'privacy-banner':
    case 'page-header-banner':
      return {};
  }
}

export function normalizeExternalLinkPrefix(
  raw: unknown,
  fallback: string = DEFAULT_EXTERNAL_LINK_PREFIX
): string {
  if (typeof raw !== 'string') {
    return fallback;
  }
  const trimmed = raw
    .trim()
    .slice(0, VALIDATION_LIMITS.EXTENSION_EXTERNAL_LINK_PREFIX_MAX_LENGTH);
  if (!trimmed) {
    return '';
  }
  // Block dangerous schemes and only allow http://, https://, or root-relative / paths
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return fallback;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^https?:\/\//i, (scheme) => scheme.toLowerCase());
  }
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  return fallback;
}

export function mergeExtensionsWithDefaults(
  records: Partial<WikiExtensionRecord>[]
): Omit<SiteExtensionsState, 'loadedFromFirestore'> {
  const incomingById = new Map<string, Partial<WikiExtensionRecord>>();
  for (const rec of records) {
    if (rec.id) {
      incomingById.set(rec.id, rec);
    }
  }

  const list: ResolvedWikiExtension[] = DEFAULT_WIKI_EXTENSIONS.map((def) => {
    const remote = incomingById.get(def.id);
    if (!remote) {
      return { ...def, settings: { ...def.settings }, persisted: false };
    }

    return {
      id: def.id,
      scope: 'site',
      name:
        typeof remote.name === 'string' && remote.name.trim()
          ? remote.name.trim().slice(0, VALIDATION_LIMITS.EXTENSION_NAME_MAX_LENGTH)
          : def.name,
      description:
        typeof remote.description === 'string' && remote.description.trim()
          ? remote.description.trim().slice(0, VALIDATION_LIMITS.EXTENSION_DESCRIPTION_MAX_LENGTH)
          : def.description,
      category:
        remote.category === 'appearance' ||
        remote.category === 'reading' ||
        remote.category === 'navigation' ||
        remote.category === 'authoring' ||
        remote.category === 'collaboration'
          ? remote.category
          : def.category,
      enabled: typeof remote.enabled === 'boolean' ? remote.enabled : def.enabled,
      sortOrder:
        typeof remote.sortOrder === 'number' && Number.isFinite(remote.sortOrder)
          ? Math.max(0, Math.min(100, Math.round(remote.sortOrder)))
          : def.sortOrder,
      settings: sanitizeExtensionSettings(def.id, remote.settings),
      updatedBy:
        typeof remote.updatedBy === 'string' && remote.updatedBy ? remote.updatedBy : def.updatedBy,
      updatedByName:
        typeof remote.updatedByName === 'string' && remote.updatedByName
          ? remote.updatedByName
          : def.updatedByName,
      createdAt: remote.createdAt ?? null,
      updatedAt: remote.updatedAt ?? null,
      persisted: true,
    };
  });

  list.sort((a, b) => a.sortOrder - b.sortOrder);

  const byId = list.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as SiteExtensionsMap);

  return { list, byId };
}

export function getInitialSiteExtensionsState(): SiteExtensionsState {
  const merged = mergeExtensionsWithDefaults([]);
  return {
    ...merged,
    loadedFromFirestore: false,
  };
}

export function resolveSiteTitle(state: SiteExtensionsState): string {
  const ext = state.byId['site-title'];
  if (!ext || !ext.enabled) {
    return DEFAULT_SITE_TITLE;
  }
  const configured = typeof ext.settings.siteTitle === 'string' ? ext.settings.siteTitle.trim() : '';
  return configured || DEFAULT_SITE_TITLE;
}

export function resolveSiteTheme(state: SiteExtensionsState): {
  theme: WikiThemeDefinition;
  colorScheme: WikiColorSchemePolicy;
} {
  const ext = state.byId['site-theme'];
  if (!ext || !ext.enabled) {
    return {
      theme: getWikiThemeById(DEFAULT_WIKI_THEME_ID),
      colorScheme: 'user',
    };
  }
  const theme = getWikiThemeById(
    typeof ext.settings.themeId === 'string' ? ext.settings.themeId : DEFAULT_WIKI_THEME_ID
  );
  const colorScheme: WikiColorSchemePolicy =
    ext.settings.colorScheme === 'light' || ext.settings.colorScheme === 'dark'
      ? ext.settings.colorScheme
      : 'user';
  return { theme, colorScheme };
}

export function resolveExternalLinkConfig(state: SiteExtensionsState): {
  prefix: string;
  encodeTargetUrl: boolean;
} {
  const ext = state.byId['external-link-prefix'];
  if (!ext || !ext.enabled) {
    return {
      prefix: '',
      encodeTargetUrl: false,
    };
  }
  const prefix = normalizeExternalLinkPrefix(
    ext.settings.externalLinkPrefix,
    DEFAULT_EXTERNAL_LINK_PREFIX
  );
  return {
    prefix,
    encodeTargetUrl: ext.settings.encodeTargetUrl === true,
  };
}

export function applyExternalLinkPrefix(
  rawHref: string | undefined,
  prefix?: string,
  encodeTargetUrl = false
): string | undefined {
  if (!rawHref) return rawHref;
  const trimmedHref = rawHref.trim();
  const cleanPrefix = typeof prefix === 'string' ? prefix.trim() : '';
  if (!cleanPrefix) return rawHref;

  // Never alter internal wiki pseudo-URLs, anchors, relative paths, mailto, tel, or non-http(s) links
  if (
    trimmedHref.startsWith('#') ||
    trimmedHref.startsWith('/') ||
    trimmedHref.startsWith('https://wiki.internal/') ||
    trimmedHref.startsWith('https://wiki.ref/') ||
    !/^https?:\/\//i.test(trimmedHref)
  ) {
    return rawHref;
  }

  // Avoid double-prefixing URLs that already carry the configured redirect/parameter prefix
  if (trimmedHref.toLowerCase().startsWith(cleanPrefix.toLowerCase())) {
    return trimmedHref;
  }

  const target = encodeTargetUrl ? encodeURIComponent(trimmedHref) : trimmedHref;
  return `${cleanPrefix}${target}`;
}

/**
 * Boot-time loader and live subscriber for site-wide extensions.
 * Explicitly verifies initial load from Firestore server so failures block non-bureaucrat access.
 */
export function bootAndSubscribeSiteExtensions(handlers: {
  onLoaded: (state: SiteExtensionsState) => void;
  onError: (message: string) => void;
}): Unsubscribe {
  const q = query(collection(db, 'extensions'), where('scope', '==', 'site'));
  let cancelled = false;
  let unsubSnapshot: Unsubscribe | null = null;

  const reportBootError = (error: unknown) => {
    try {
      handleFirestoreError(error, OperationType.LIST, 'extensions');
    } catch (formatted) {
      if (!cancelled) {
        const rawMessage = error instanceof Error ? error.message : String(error);
        const message =
          rawMessage ||
          (formatted instanceof Error ? formatted.message : 'Falha ao carregar extensões.');
        handlers.onError(message);
      }
    }
  };

  void getDocsFromServer(q)
    .then((initialSnap) => {
      if (cancelled) return;
      const docs = initialSnap.docs.map((d) => ({
        id: d.id as WikiExtensionId,
        ...(d.data() as Omit<WikiExtensionRecord, 'id'>),
      }));
      const merged = mergeExtensionsWithDefaults(docs);
      handlers.onLoaded({
        ...merged,
        loadedFromFirestore: true,
      });

      unsubSnapshot = onSnapshot(
        q,
        (snap) => {
          if (cancelled) return;
          const liveDocs = snap.docs.map((d) => ({
            id: d.id as WikiExtensionId,
            ...(d.data() as Omit<WikiExtensionRecord, 'id'>),
          }));
          const liveMerged = mergeExtensionsWithDefaults(liveDocs);
          handlers.onLoaded({
            ...liveMerged,
            loadedFromFirestore: true,
          });
        },
        (error) => {
          reportBootError(error);
        }
      );
    })
    .catch((error) => {
      reportBootError(error);
    });

  return () => {
    cancelled = true;
    unsubSnapshot?.();
  };
}

/**
 * Subscribe to site-wide extension configurations at Wiki boot.
 * Safe for both anonymous visitors and authenticated collaborators.
 */
export function subscribeSiteExtensions(
  onChange: (state: SiteExtensionsState) => void
): Unsubscribe {
  const q = query(collection(db, 'extensions'), where('scope', '==', 'site'));
  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.map((d) => ({
        id: d.id as WikiExtensionId,
        ...(d.data() as Omit<WikiExtensionRecord, 'id'>),
      }));
      const merged = mergeExtensionsWithDefaults(docs);
      onChange({
        ...merged,
        loadedFromFirestore: true,
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'extensions');
    }
  );
}

/**
 * Create or update a single extension configuration in Firestore.
 * Enforced server-side by firestore.rules (`isBureaucrat()`).
 */
export async function saveExtensionConfigAsBureaucrat(
  input: {
    id: WikiExtensionId;
    enabled: boolean;
    settings: WikiExtensionSettings;
  },
  bureaucrat: User
): Promise<void> {
  const def = DEFAULT_BY_ID.get(input.id);
  if (!def) {
    throw new Error(`Unknown extension: ${input.id}`);
  }

  const ref = doc(db, 'extensions', input.id);
  const path = `extensions/${input.id}`;
  const actorName = (bureaucrat.displayName || bureaucrat.email || 'Bureaucrat')
    .trim()
    .slice(0, VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH);
  const sanitizedSettings = sanitizeExtensionSettings(input.id, input.settings);

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        id: def.id,
        scope: 'site',
        name: def.name.slice(0, VALIDATION_LIMITS.EXTENSION_NAME_MAX_LENGTH),
        description: def.description.slice(0, VALIDATION_LIMITS.EXTENSION_DESCRIPTION_MAX_LENGTH),
        category: def.category,
        enabled: input.enabled,
        sortOrder: def.sortOrder,
        settings: sanitizedSettings,
        updatedBy: bureaucrat.uid,
        updatedByName: actorName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        name: def.name.slice(0, VALIDATION_LIMITS.EXTENSION_NAME_MAX_LENGTH),
        description: def.description.slice(0, VALIDATION_LIMITS.EXTENSION_DESCRIPTION_MAX_LENGTH),
        category: def.category,
        enabled: input.enabled,
        sortOrder: def.sortOrder,
        settings: sanitizedSettings,
        updatedBy: bureaucrat.uid,
        updatedByName: actorName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Initialize missing extensions or reset all extensions to built-in defaults in Firebase.
 * Enforced server-side by firestore.rules (`isBureaucrat()`).
 */
export async function syncAllExtensionsAsBureaucrat(
  bureaucrat: User,
  mode: 'seed-missing' | 'reset-all'
): Promise<number> {
  const actorName = (bureaucrat.displayName || bureaucrat.email || 'Bureaucrat')
    .trim()
    .slice(0, VALIDATION_LIMITS.AUTHOR_NAME_MAX_LENGTH);

  try {
    const existingSnap = await getDocs(
      query(collection(db, 'extensions'), where('scope', '==', 'site'))
    );
    const existingIds = new Set(existingSnap.docs.map((d) => d.id));
    const batch = writeBatch(db);
    let writeCount = 0;

    for (const def of DEFAULT_WIKI_EXTENSIONS) {
      const ref = doc(db, 'extensions', def.id);
      const exists = existingIds.has(def.id);
      const sanitizedSettings = sanitizeExtensionSettings(def.id, def.settings);

      if (!exists) {
        batch.set(ref, {
          id: def.id,
          scope: 'site',
          name: def.name.slice(0, VALIDATION_LIMITS.EXTENSION_NAME_MAX_LENGTH),
          description: def.description.slice(0, VALIDATION_LIMITS.EXTENSION_DESCRIPTION_MAX_LENGTH),
          category: def.category,
          enabled: def.enabled,
          sortOrder: def.sortOrder,
          settings: sanitizedSettings,
          updatedBy: bureaucrat.uid,
          updatedByName: actorName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        writeCount += 1;
      } else if (mode === 'reset-all') {
        batch.update(ref, {
          name: def.name.slice(0, VALIDATION_LIMITS.EXTENSION_NAME_MAX_LENGTH),
          description: def.description.slice(0, VALIDATION_LIMITS.EXTENSION_DESCRIPTION_MAX_LENGTH),
          category: def.category,
          enabled: def.enabled,
          sortOrder: def.sortOrder,
          settings: sanitizedSettings,
          updatedBy: bureaucrat.uid,
          updatedByName: actorName,
          updatedAt: serverTimestamp(),
        });
        writeCount += 1;
      }
    }

    if (writeCount > 0) {
      await batch.commit();
    }
    return writeCount;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'extensions');
  }
}
