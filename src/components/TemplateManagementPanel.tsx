import React from 'react';
import {
  AlertTriangle,
  Blocks,
  Check,
  Code2,
  Copy,
  Eye,
  Info,
  LayoutGrid,
  LayoutList,
  Navigation,
  PanelRight,
  Plus,
  RotateCcw,
  Search,
  SplitSquareHorizontal,
  X,
} from 'lucide-react';
import {
  INFOBOX_TYPE_PRESETS,
  serializeInfoboxBlock,
  type InfoboxLayout,
} from '../lib/markdownUtils';
import {
  listCommunityTemplates,
  serializePredefinicaoBlock,
  WIKI_TEMPLATE_CATALOG,
  type TemplateBlockVariant,
  type WikiTemplateCatalogItem,
} from '../services/templateService';
import type { WikiPage } from '../types/wiki';
import { ArticleViewer } from './ArticleViewer';

export type TemplateManagerCategory = 'all' | 'infobox' | 'alert' | 'navigation' | 'catalog';

type PreviewDisplayMode = 'split' | 'preview' | 'code';

interface CuratedPresetItem {
  id: string;
  source: 'curated';
  name: string;
  category: 'infobox' | 'alert' | 'navigation';
  syntaxTag: string;
  description: string;
  snippet: string;
  catalogItem?: WikiTemplateCatalogItem;
}

interface CatalogPresetItem {
  id: string;
  source: 'catalog';
  name: string;
  category: 'infobox' | 'alert' | 'navigation';
  syntaxTag: string;
  description: string;
  snippet: string;
  catalogItem: WikiTemplateCatalogItem;
}

interface CommunityPresetItem {
  id: string;
  source: 'community';
  name: string;
  category: 'navigation';
  syntaxTag: string;
  description: string;
  snippet: string;
}

type ManagerItem = CuratedPresetItem | CatalogPresetItem | CommunityPresetItem;

interface TemplateManagementPanelProps {
  existingSlugs: Set<string>;
  wikiPages?: WikiPage[];
  externalLinkPrefix?: string;
  encodeExternalLinkTarget?: boolean;
  onInsert: (snippet: string) => void;
  onClose: () => void;
  onOpenInfoboxBuilder?: () => void;
  onOpenFullCatalog?: () => void;
}

const CATEGORY_TABS: { id: TemplateManagerCategory; label: string }[] = [
  { id: 'all', label: 'Principais' },
  { id: 'infobox', label: 'Infoboxes' },
  { id: 'alert', label: 'Alertas & Avisos' },
  { id: 'navigation', label: 'Caixas de Navegação' },
  { id: 'catalog', label: 'Catálogo Completo' },
];

const VARIANT_OPTIONS: { value: TemplateBlockVariant; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Aviso' },
  { value: 'alert', label: 'Crítico' },
  { value: 'success', label: 'Sucesso' },
  { value: 'wip', label: 'Construção' },
  { value: 'stub', label: 'Esboço' },
  { value: 'navigation', label: 'Navegação' },
  { value: 'disambiguation', label: 'Desambiguação' },
  { value: 'quote', label: 'Citação' },
];

const CATEGORY_LABELS: Record<'infobox' | 'alert' | 'navigation', string> = {
  infobox: 'Infobox',
  alert: 'Alerta',
  navigation: 'Navegação',
};

function buildCuratedInfoboxPresets(): CuratedPresetItem[] {
  return INFOBOX_TYPE_PRESETS.map((preset) => ({
    id: `curated-infobox-${preset.type}`,
    source: 'curated',
    name: `Infobox · ${preset.label}`,
    category: 'infobox',
    syntaxTag: `:::infobox ${preset.type}`,
    description: preset.description,
    snippet: serializeInfoboxBlock({
      type: preset.type,
      title: preset.defaultTitle,
      subtitle: preset.defaultSubtitle,
      layout: 'right',
      fields: preset.suggestedFields,
    }),
  }));
}

function buildCuratedAlertAndNavPresets(): CuratedPresetItem[] {
  const byName = new Map(WIKI_TEMPLATE_CATALOG.map((item) => [item.name, item]));

  return [
    {
      id: 'curated-alert-note',
      source: 'curated',
      name: 'Nota Informativa (Wikidot)',
      category: 'alert',
      syntaxTag: ':::predefinicao info',
      description: 'Caixa azul informativa para observações de contexto, dicas ou notas do autor.',
      snippet: serializePredefinicaoBlock({
        variant: 'info',
        kicker: 'Nota',
        title: 'Informação adicional',
        body: 'Utilize este bloco para destacar explicações complementares ou orientações de leitura.',
      }),
    },
    {
      id: 'curated-alert-warning',
      source: 'curated',
      name: 'Alerta de Cuidado / Revisão',
      category: 'alert',
      syntaxTag: ':::predefinicao warning',
      description: 'Aviso em âmbar indicando atenção necessária, conteúdo em revisão ou ressalvas.',
      snippet: serializePredefinicaoBlock({
        variant: 'warning',
        kicker: 'Atenção',
        title: 'Conteúdo em revisão editorial',
        body: 'Verifique as referências e atualize os dados antes de consolidar esta seção.',
      }),
    },
    {
      id: 'curated-alert-critical',
      source: 'curated',
      name: 'Alerta Crítico / Segurança',
      category: 'alert',
      syntaxTag: ':::predefinicao alert',
      description: 'Banner vermelho para avisos críticos, regras obrigatórias ou risco de remoção.',
      snippet: serializePredefinicaoBlock({
        variant: 'alert',
        kicker: 'Alerta Crítico',
        title: 'Aviso importante aos editores',
        body: 'Esta página contém diretrizes obrigatórias ou está sujeita a moderação.',
      }),
    },
    {
      id: 'curated-alert-success',
      source: 'curated',
      name: 'Confirmação / Verificado',
      category: 'alert',
      syntaxTag: ':::predefinicao success',
      description: 'Caixa verde confirmando conformidade, revisão concluída ou padrão aprovado.',
      snippet: serializePredefinicaoBlock({
        variant: 'success',
        kicker: 'Verificado',
        title: 'Documentação validada',
        body: 'As especificações desta página foram conferidas e seguem os padrões do projeto.',
      }),
    },
    {
      id: 'curated-alert-wip',
      source: 'curated',
      name: 'Em Construção (WIP)',
      category: 'alert',
      syntaxTag: ':::predefinicao wip',
      description: 'Sinaliza que o artigo está em desenvolvimento ativo para evitar conflitos de edição.',
      snippet: serializePredefinicaoBlock({
        variant: 'wip',
        kicker: 'Em construção',
        title: 'Artigo em desenvolvimento',
        body: 'Esta página está passando por edições estruturais e será expandida em breve.',
      }),
    },
    {
      id: 'curated-alert-stub',
      source: 'curated',
      name: 'Esboço (Stub)',
      category: 'alert',
      syntaxTag: ':::predefinicao stub',
      description: 'Marca verbetes introdutórios curtos convidando colaboradores a expandir o conteúdo.',
      snippet: serializePredefinicaoBlock({
        variant: 'stub',
        kicker: 'Esboço',
        title: 'Artigo introdutório',
        body: 'Este artigo ainda é um esboço. Você pode ajudar o WikiMaker expandindo suas seções.',
      }),
    },
    {
      id: 'curated-alert-sources',
      source: 'curated',
      name: 'Carece de Fontes',
      category: 'alert',
      syntaxTag: '{{Carece de fontes}}',
      description: 'Solicita referências bibliográficas verificáveis com <ref>...</ref>.',
      snippet: '{{Carece de fontes|este artigo}}',
      catalogItem: byName.get('Carece de fontes'),
    },
    {
      id: 'curated-alert-welcome',
      source: 'curated',
      name: 'Boas-vindas (Regras de Uso)',
      category: 'alert',
      syntaxTag: '{{Boas-vindas}}',
      description: 'Mensagem de boas-vindas com link direto para as Regras de Uso do WikiMaker.',
      snippet: '{{Boas-vindas|colaborador=Novo Colaborador|tema=WikiMaker}}',
      catalogItem: byName.get('Boas-vindas'),
    },
    {
      id: 'curated-nav-navbox',
      source: 'curated',
      name: 'Caixa de Navegação (Navbox)',
      category: 'navigation',
      syntaxTag: '{{Navbox}}',
      description: 'Caixa horizontal conectando páginas relacionadas de um mesmo tema ou série.',
      snippet: '{{Navbox|titulo=Guias do WikiMaker|1=start|2=markdown-guide|3=regras-de-uso}}',
      catalogItem: byName.get('Navbox'),
    },
    {
      id: 'curated-nav-series',
      source: 'curated',
      name: 'Artigo em Série (Anterior / Próximo)',
      category: 'navigation',
      syntaxTag: '{{Artigo em série}}',
      description: 'Barra sequencial para tutoriais, capítulos ou documentações em múltiplas partes.',
      snippet:
        '{{Artigo em série|serie=Documentação WikiMaker|indice=start|anterior=markdown-guide|proximo=regras-de-uso}}',
      catalogItem: byName.get('Artigo em série'),
    },
    {
      id: 'curated-nav-main',
      source: 'curated',
      name: 'Artigo Principal (Hatnote)',
      category: 'navigation',
      syntaxTag: ':::predefinicao navigation',
      description: 'Nota de remissão no topo de uma seção apontando para o artigo completo.',
      snippet: serializePredefinicaoBlock({
        variant: 'navigation',
        kicker: 'Artigo principal',
        body: 'Artigo principal: [[markdown-guide|Guia Completo de Markdown]]',
      }),
    },
    {
      id: 'curated-nav-seealso',
      source: 'curated',
      name: 'Ver Também',
      category: 'navigation',
      syntaxTag: '{{Ver também}}',
      description: 'Bloco rápido de remissão cruzada para dois ou três artigos relacionados.',
      snippet: '{{Ver também|start|markdown-guide|regras-de-uso}}',
      catalogItem: byName.get('Ver também'),
    },
    {
      id: 'curated-nav-collapsible',
      source: 'curated',
      name: 'Bloco Recolhível / Anexo (Ocultar)',
      category: 'navigation',
      syntaxTag: '{{Ocultar}}',
      description: 'Caixa estruturada estilo Wikidot collapsible para apêndices, listas ou registros.',
      snippet:
        '{{Ocultar|titulo=Registro de alterações e notas|conteudo=v1.0 — Estrutura inicial · v1.1 — Revisão de referências}}',
      catalogItem: byName.get('Ocultar'),
    },
    {
      id: 'curated-nav-cronologia',
      source: 'curated',
      name: 'Cronologia / Sucessão',
      category: 'navigation',
      syntaxTag: '{{Cronologia}}',
      description: 'Linha de navegação temporal exibindo edição anterior, atual e próxima.',
      snippet: '{{Cronologia|tema=Edições do Projeto|anterior=2024|atual=2025|proximo=2026}}',
      catalogItem: byName.get('Cronologia'),
    },
    {
      id: 'curated-nav-disambig',
      source: 'curated',
      name: 'Desambiguação',
      category: 'navigation',
      syntaxTag: ':::predefinicao disambiguation',
      description: 'Caixa de desambiguação para orientar o leitor entre termos homônimos.',
      snippet: serializePredefinicaoBlock({
        variant: 'disambiguation',
        kicker: 'Desambiguação',
        title: 'Outros significados',
        body: 'Se procura outro significado para este título, consulte [[start|Página Inicial]] ou [[markdown-guide|Guia de Markdown]].',
      }),
    },
    {
      id: 'curated-nav-quote',
      source: 'curated',
      name: 'Citação Destacada',
      category: 'navigation',
      syntaxTag: ':::predefinicao quote',
      description: 'Bloco tipográfico de citação com atribuição de autor e fonte bibliográfica.',
      snippet: serializePredefinicaoBlock({
        variant: 'quote',
        kicker: 'Citação',
        body: 'O conhecimento compartilhado se fortalece quando cada revisão preserva clareza e referências verificáveis.',
        author: 'Conselho Editorial',
        source: 'Manual de Estilo WikiMaker',
      }),
    },
    {
      id: 'curated-nav-reflist',
      source: 'curated',
      name: 'Lista de Referências',
      category: 'navigation',
      syntaxTag: '{{Reflist}}',
      description: 'Insere o bloco de referências bibliográficas ao final do artigo.',
      snippet: '{{Reflist}}',
      catalogItem: byName.get('Reflist'),
    },
    {
      id: 'curated-nav-bar-table',
      source: 'curated',
      name: 'Barra Horizontal de Links (Tabela)',
      category: 'navigation',
      syntaxTag: '| Links |',
      description: 'Menu compacto em tabela Markdown para conectar seções principais no topo da página.',
      snippet:
        '| Visão Geral | Documentação | Diretrizes |\n| --- | --- | --- |\n| [[start|Início]] | [[markdown-guide|Guia Markdown]] | [[regras-de-uso|Regras de Uso]] |',
    },
  ];
}

function mapCatalogCategory(cat: WikiTemplateCatalogItem['category']): 'infobox' | 'alert' | 'navigation' {
  if (cat === 'infobox') return 'infobox';
  if (cat === 'notices') return 'alert';
  return 'navigation';
}

function buildCatalogPresetItems(): CatalogPresetItem[] {
  return WIKI_TEMPLATE_CATALOG.map((item) => ({
    id: `catalog-${item.id}`,
    source: 'catalog',
    name: item.name,
    category: mapCatalogCategory(item.category),
    syntaxTag: `{{${item.name}}}`,
    description: item.description,
    snippet: item.exampleSnippet,
    catalogItem: item,
  }));
}

function replaceDirectiveHeader(
  code: string,
  directive: 'infobox' | 'predefinicao',
  nextArg: string
): string {
  const regex = new RegExp(`^:::${directive}(?:[ \\t]+[a-zA-Z0-9_-]+)?`, 'm');
  if (regex.test(code)) {
    return code.replace(regex, `:::${directive} ${nextArg}`);
  }
  return code;
}

function upsertBlockField(code: string, fieldName: string, value: string): string {
  const lines = code.split(/\r?\n/);
  const lowerTarget = fieldName.toLowerCase();
  let foundIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === ':::') break;
    const colon = trimmed.indexOf(':');
    if (colon > 0 && trimmed.slice(0, colon).trim().toLowerCase() === lowerTarget) {
      foundIdx = i;
      break;
    }
  }

  const sanitized = value.replace(/[\r\n]+/g, ' ').trim();
  if (foundIdx !== -1) {
    if (!sanitized) {
      lines.splice(foundIdx, 1);
    } else {
      lines[foundIdx] = `${fieldName}: ${sanitized}`;
    }
    return lines.join('\n');
  }

  if (!sanitized) return code;
  const closeIdx = lines.findIndex((l, idx) => idx > 0 && l.trim() === ':::');
  const insertAt = closeIdx === -1 ? lines.length : closeIdx;
  lines.splice(insertAt, 0, `${fieldName}: ${sanitized}`);
  return lines.join('\n');
}

function readBlockField(code: string, fieldName: string): string {
  const lowerTarget = fieldName.toLowerCase();
  for (const raw of code.split(/\r?\n/).slice(1)) {
    const trimmed = raw.trim();
    if (trimmed === ':::') break;
    const colon = trimmed.indexOf(':');
    if (colon > 0 && trimmed.slice(0, colon).trim().toLowerCase() === lowerTarget) {
      return trimmed.slice(colon + 1).trim();
    }
  }
  return '';
}

function readDirectiveArg(code: string, directive: 'infobox' | 'predefinicao'): string | null {
  const match = new RegExp(`^:::${directive}(?:[ \\t]+([a-zA-Z0-9_-]+))?`, 'm').exec(code);
  if (!match) return null;
  return (match[1] ?? '').trim().toLowerCase();
}

export const TemplateManagementPanel: React.FC<TemplateManagementPanelProps> = ({
  existingSlugs,
  wikiPages = [],
  externalLinkPrefix,
  encodeExternalLinkTarget = false,
  onInsert,
  onClose,
  onOpenInfoboxBuilder,
  onOpenFullCatalog,
}) => {
  const curatedItems = React.useMemo(
    () => [...buildCuratedInfoboxPresets(), ...buildCuratedAlertAndNavPresets()],
    []
  );
  const catalogItems = React.useMemo(() => buildCatalogPresetItems(), []);
  const communityItems = React.useMemo<CommunityPresetItem[]>(() => {
    return listCommunityTemplates(wikiPages).map((tpl) => {
      const defaults: string[] = [];
      for (const p of tpl.params) {
        if (p.defaultValue) {
          defaults.push(p.isPositional ? p.defaultValue : `${p.name}=${p.defaultValue}`);
        }
      }
      const snippet =
        defaults.length > 0
          ? `{{Predefinição:${tpl.name}|${defaults.join('|')}}}`
          : `{{Predefinição:${tpl.name}}}`;
      return {
        id: `community-${tpl.slug}`,
        source: 'community',
        name: tpl.name,
        category: 'navigation',
        syntaxTag: `{{Predefinição:${tpl.name}}}`,
        description: tpl.description || `Predefinição comunitária :${tpl.slug}`,
        snippet,
      };
    });
  }, [wikiPages]);

  const allLookupItems = React.useMemo<ManagerItem[]>(
    () => [...curatedItems, ...communityItems, ...catalogItems],
    [curatedItems, communityItems, catalogItems]
  );

  const [activeCategory, setActiveCategory] = React.useState<TemplateManagerCategory>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string>(curatedItems[0].id);
  const [draftCode, setDraftCode] = React.useState<string>(curatedItems[0].snippet);
  const [previewMode, setPreviewMode] = React.useState<PreviewDisplayMode>('split');
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [justInserted, setJustInserted] = React.useState(false);

  const filteredItems = React.useMemo<ManagerItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();

    const pool: ManagerItem[] =
      activeCategory === 'catalog'
        ? [...communityItems, ...catalogItems]
        : q
        ? allLookupItems
        : curatedItems.filter((item) => {
            if (activeCategory === 'all') return true;
            return item.category === activeCategory;
          });

    if (!q) return pool;

    return pool.filter((item) => {
      if (
        activeCategory !== 'all' &&
        activeCategory !== 'catalog' &&
        item.category !== activeCategory
      ) {
        return false;
      }
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.syntaxTag.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, searchQuery, curatedItems, communityItems, catalogItems, allLookupItems]);

  const selectedItem = React.useMemo(
    () => allLookupItems.find((item) => item.id === selectedId) ?? curatedItems[0],
    [allLookupItems, selectedId, curatedItems]
  );

  const selectItem = (item: ManagerItem) => {
    setSelectedId(item.id);
    setDraftCode(item.snippet);
    setJustInserted(false);
  };

  const isInfoboxBlock = /^:::infobox\b/m.test(draftCode);
  const isPredefinicaoBlock = /^:::predefinicao\b/m.test(draftCode);
  const currentInfoboxLayout = (readBlockField(draftCode, 'layout') || 'right') as InfoboxLayout;
  const currentBlockTitle = readBlockField(draftCode, 'title');
  const currentPredefVariant = (readDirectiveArg(draftCode, 'predefinicao') ||
    'info') as TemplateBlockVariant;
  const isModified = draftCode !== selectedItem.snippet;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftCode);
      setCopiedId(selectedItem.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Fallback ignored if clipboard unavailable
    }
  };

  const handleInsertClick = () => {
    if (!draftCode.trim()) return;
    onInsert(draftCode);
    setJustInserted(true);
    window.setTimeout(() => setJustInserted(false), 1600);
  };

  const renderCategoryIcon = (cat: 'infobox' | 'alert' | 'navigation') => {
    if (cat === 'infobox') return <PanelRight className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />;
    if (cat === 'alert') return <AlertTriangle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />;
    return <Navigation className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />;
  };

  return (
    <section
      aria-label="Gestão de Predefinições"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-[#0d131f] overflow-hidden"
    >
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17]">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg border border-blue-200 dark:border-blue-900/70 bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
            <Blocks className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Gestão de Predefinições
              </h3>
              <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                · {allLookupItems.length} modelos disponíveis
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Selecione, visualize em tempo real e insira infoboxes, alertas e caixas de navegação diretamente no Markdown.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {onOpenInfoboxBuilder && (
            <button
              type="button"
              onClick={onOpenInfoboxBuilder}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PanelRight className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Construtor de Infobox</span>
            </button>
          )}
          {onOpenFullCatalog && (
            <button
              type="button"
              onClick={onOpenFullCatalog}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LayoutList className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Criar / Catálogo</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar Gestão de Predefinições"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Fechar</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0f1623]">
        <div
          role="tablist"
          aria-label="Categorias de predefinições"
          className="flex flex-wrap items-center gap-1"
        >
          {CATEGORY_TABS.map((tab) => {
            const active = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar infobox, alerta, navbox..."
            aria-label="Buscar predefinição"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
          />
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left: Template Selector List */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-[#0b0f17]/70 flex flex-col">
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-200/80 dark:border-slate-800/80 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Modelos ({filteredItems.length})</span>
            </span>
            <span>Clique para visualizar</span>
          </div>

          <div className="max-h-[380px] lg:max-h-[440px] overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-800/70">
            {filteredItems.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nenhuma predefinição encontrada para &ldquo;{searchQuery}&rdquo;.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Limpe a busca ou altere a aba para ver os blocos disponíveis.
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Limpar busca
                  </button>
                )}
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.id === selectedItem.id;
                return (
                  <div
                    key={item.id}
                    className={`flex items-stretch transition-colors ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/35'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectItem(item)}
                      className="flex-1 min-w-0 text-left px-3.5 py-2.5 space-y-1 cursor-pointer focus:outline-none"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {renderCategoryIcon(item.category)}
                        <span
                          className={`text-xs font-semibold truncate ${
                            isSelected
                              ? 'text-blue-800 dark:text-blue-200'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {item.name}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                        {CATEGORY_LABELS[item.category]} · {item.syntaxTag}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-snug">
                        {item.description}
                      </p>
                    </button>

                    <div className="flex items-center pr-2.5 pl-1 shrink-0">
                      <button
                        type="button"
                        title={`Inserir ${item.name} diretamente no Markdown`}
                        onClick={() => {
                          selectItem(item);
                          onInsert(item.snippet);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-[11px] font-medium text-blue-700 dark:text-blue-300 hover:border-blue-700 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Inserir</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Quick Customization, Live Preview & Editable Markdown */}
        <div className="lg:col-span-7 flex flex-col min-w-0">
          {/* Inspector Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-[#0b0f17]/50">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {selectedItem.name}
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                {selectedItem.syntaxTag}
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Visualização da predefinição"
              className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800/80 shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={previewMode === 'split'}
                onClick={() => setPreviewMode('split')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  previewMode === 'split'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <SplitSquareHorizontal className="w-3 h-3" />
                <span>Ambos</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={previewMode === 'preview'}
                onClick={() => setPreviewMode('preview')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  previewMode === 'preview'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Visualizar</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={previewMode === 'code'}
                onClick={() => setPreviewMode('code')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  previewMode === 'code'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Code2 className="w-3 h-3" />
                <span>Código</span>
              </button>
            </div>
          </div>

          {/* Contextual Quick Controls for :::infobox and :::predefinicao */}
          {(isInfoboxBlock || isPredefinicaoBlock) && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-[#0f1623]">
              <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                <label
                  htmlFor="template-quick-title"
                  className="text-[11px] font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap"
                >
                  Título:
                </label>
                <input
                  id="template-quick-title"
                  type="text"
                  value={currentBlockTitle}
                  onChange={(e) => setDraftCode((prev) => upsertBlockField(prev, 'title', e.target.value))}
                  placeholder="Título da caixa..."
                  className="w-full px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>

              {isInfoboxBlock && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mr-0.5">
                    Posição:
                  </span>
                  {(['right', 'left', 'full'] as InfoboxLayout[]).map((layout) => {
                    const label =
                      layout === 'right' ? 'Direita' : layout === 'left' ? 'Esquerda' : 'Largura total';
                    const active = currentInfoboxLayout === layout;
                    return (
                      <button
                        key={layout}
                        type="button"
                        onClick={() =>
                          setDraftCode((prev) => upsertBlockField(prev, 'layout', layout))
                        }
                        className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                          active
                            ? 'border-blue-700 bg-blue-700 text-white'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {isPredefinicaoBlock && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <label
                    htmlFor="template-quick-variant"
                    className="text-[11px] font-medium text-slate-600 dark:text-slate-400"
                  >
                    Estilo:
                  </label>
                  <select
                    id="template-quick-variant"
                    value={currentPredefVariant}
                    onChange={(e) =>
                      setDraftCode((prev) =>
                        replaceDirectiveHeader(prev, 'predefinicao', e.target.value)
                      )
                    }
                    className="px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  >
                    {VARIANT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Preview + Editable Code Area */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[380px] lg:max-h-[400px]">
            {(previewMode === 'split' || previewMode === 'preview') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>Pré-visualização ao vivo</span>
                  </span>
                </div>
                <div className="flow-root p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] overflow-x-auto">
                  <ArticleViewer
                    content={draftCode}
                    existingSlugs={existingSlugs}
                    wikiPages={wikiPages}
                    onNavigateSlug={() => {}}
                    showToc={false}
                    enableReferences={true}
                    showReferencesFooter={false}
                    enableInfoboxes={true}
                    enableTemplates={true}
                    externalLinkPrefix={externalLinkPrefix}
                    encodeExternalLinkTarget={encodeExternalLinkTarget}
                  />
                </div>
              </div>
            )}

            {(previewMode === 'split' || previewMode === 'code') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>Código Markdown editável</span>
                  <div className="flex items-center gap-2">
                    {isModified && (
                      <button
                        type="button"
                        onClick={() => setDraftCode(selectedItem.snippet)}
                        className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restaurar padrão</span>
                      </button>
                    )}
                    <span className="tabular-nums">{draftCode.length} chars</span>
                  </div>
                </div>
                <textarea
                  value={draftCode}
                  onChange={(e) => setDraftCode(e.target.value)}
                  rows={previewMode === 'code' ? 11 : 6}
                  aria-label="Código Markdown da predefinição selecionada"
                  className="w-full p-3 text-xs font-mono leading-relaxed rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 resize-y"
                />
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17]">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Você pode editar o código acima antes de inserir no artigo.
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedId === selectedItem.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar código</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleInsertClick}
                disabled={!draftCode.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {justInserted ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Inserido no Markdown</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Inserir no Markdown</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
