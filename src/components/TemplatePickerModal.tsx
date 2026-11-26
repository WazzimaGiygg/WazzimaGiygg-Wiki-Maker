import React from 'react';
import type { User } from 'firebase/auth';
import {
  Braces,
  Check,
  ExternalLink,
  Layers,
  LayoutList,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { toWikiSlug } from '../lib/markdownUtils';
import {
  buildTemplateInvocation,
  createTemplateModel,
  expandTemplatesInWikitext,
  extractTemplateParameters,
  formatTemplateSlug,
  listCommunityTemplates,
  validateTemplateSyntax,
  WIKI_TEMPLATE_CATALOG,
  type WikiTemplateCatalogItem,
} from '../services/templateService';
import type { PageVisibility, WikiPage } from '../types/wiki';
import { ArticleViewer } from './ArticleViewer';

interface TemplatePickerModalProps {
  isOpen: boolean;
  initialViewMode?: 'picker' | 'all-list';
  existingSlugs: Set<string>;
  wikiPages?: WikiPage[];
  currentUser?: User | null;
  onClose: () => void;
  onInsert: (snippet: string) => void;
  onNavigateSlug: (slug: string) => void;
  externalLinkPrefix?: string;
  encodeExternalLinkTarget?: boolean;
}

type FilterTab = 'all' | 'notices' | 'navigation' | 'infobox' | 'ecosystem' | 'community';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'notices', label: 'Notices' },
  { id: 'navigation', label: 'Navigation & Citation' },
  { id: 'infobox', label: 'Info (Infobox)' },
  { id: 'ecosystem', label: 'Ecosystem' },
  { id: 'community', label: 'Community' },
];

const DEFAULT_TEMPLATE_BUILDER_BODY = `{{Notice|type=warning|title={{{title|Editorial Note}}}|text={{{1|Reusable formatting template content.}}}}}`;

function buildSnippetFromCatalog(
  item: WikiTemplateCatalogItem,
  paramValues: Record<string, string>
): string {
  if (item.params.length === 0) {
    return `{{${item.name}}}`;
  }

  const positionalValues: string[] = [];
  const namedPairs: string[] = [];
  let hasNonEmptyPositional = false;

  for (const param of item.params) {
    const val = (paramValues[param.key] ?? '').trim();
    if (/^\d+$/.test(param.key)) {
      positionalValues.push(val);
      if (val) hasNonEmptyPositional = true;
    } else if (val) {
      namedPairs.push(`${param.key}=${val}`);
    }
  }

  const tokens: string[] = [];
  if (hasNonEmptyPositional) {
    let lastNonEmpty = positionalValues.length - 1;
    while (lastNonEmpty >= 0 && !positionalValues[lastNonEmpty]) {
      lastNonEmpty -= 1;
    }
    for (let i = 0; i <= lastNonEmpty; i++) {
      tokens.push(positionalValues[i]);
    }
  }
  tokens.push(...namedPairs);

  if (tokens.length === 0) {
    return `{{${item.name}}}`;
  }

  return `{{${item.name}|${tokens.join('|')}}}`;
}

const CATEGORY_LABELS: Record<WikiTemplateCatalogItem['category'], string> = {
  notices: 'Notice / Policy',
  navigation: 'Navigation & Citation',
  infobox: 'Infobox',
  ecosystem: 'Ecosystem',
};

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  initialViewMode = 'picker',
  existingSlugs,
  wikiPages = [],
  currentUser = null,
  onClose,
  onInsert,
  onNavigateSlug,
  externalLinkPrefix,
  encodeExternalLinkTarget = false,
}) => {
  const [viewMode, setViewMode] = React.useState<'picker' | 'all-list'>(initialViewMode);
  const [activeTab, setActiveTab] = React.useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedBuiltinId, setSelectedBuiltinId] = React.useState<string>(
    WIKI_TEMPLATE_CATALOG[0].id
  );
  const [selectedCustomSlug, setSelectedCustomSlug] = React.useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setViewMode(initialViewMode);
      if (initialViewMode === 'all-list') {
        setIsCreatingNew(false);
        setActiveTab('all');
      }
    }
  }, [isOpen, initialViewMode]);

  const [paramValues, setParamValues] = React.useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const p of WIKI_TEMPLATE_CATALOG[0].params) {
      init[p.key] = p.defaultValue ?? '';
    }
    return init;
  });
  const [customParamValues, setCustomParamValues] = React.useState<Record<string, string>>({});

  // Inline template creation state
  const [createName, setCreateName] = React.useState('');
  const [createDescription, setCreateDescription] = React.useState(
    'Reusable formatting template created in the editor.'
  );
  const [createBody, setCreateBody] = React.useState(DEFAULT_TEMPLATE_BUILDER_BODY);
  const [createVisibility, setCreateVisibility] = React.useState<PageVisibility>('public');
  const [creatingSave, setCreatingSave] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [createSuccessMsg, setCreateSuccessMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc, true);
    return () => window.removeEventListener('keydown', handleEsc, true);
  }, [isOpen, onClose]);

  const communityTemplates = React.useMemo(
    () => listCommunityTemplates(wikiPages),
    [wikiPages]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredBuiltin = React.useMemo(() => {
    if (activeTab === 'community') return [];
    return WIKI_TEMPLATE_CATALOG.filter((item) => {
      if (activeTab !== 'all' && item.category !== activeTab) return false;
      if (!normalizedQuery) return true;
      return (
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery) ||
        (item.language ?? 'pt').includes(normalizedQuery) ||
        (normalizedQuery === 'english' && item.language === 'en') ||
        item.aliases.some((a) => a.includes(normalizedQuery))
      );
    });
  }, [activeTab, normalizedQuery]);

  const filteredCustom = React.useMemo(() => {
    if (activeTab !== 'all' && activeTab !== 'community') return [];
    return communityTemplates.filter((item) => {
      if (!normalizedQuery) return true;
      return (
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.slug.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery) ||
        item.page.tags.some((t) => t.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [activeTab, communityTemplates, normalizedQuery]);

  const createSyntaxValidation = React.useMemo(
    () => validateTemplateSyntax(createBody, createName),
    [createBody, createName]
  );

  const detectedCreateParams = createSyntaxValidation.detectedParams;

  const liveCreatePreview = React.useMemo(() => {
    const cleanBody = createBody.replace(/<noinclude>[\s\S]*?<\/noinclude>/gi, '').replace(/<\/?includeonly>/gi, '').trim();
    const substituted = cleanBody.replace(
      /\{\{\{([^{}|]+?)(?:\|([^{}]*?))?\}\}\}/g,
      (_m, rawKey: string, defaultVal?: string) => (defaultVal?.trim() ? defaultVal.trim() : rawKey.trim())
    );
    return expandTemplatesInWikitext(substituted, wikiPages);
  }, [createBody, wikiPages]);

  if (!isOpen) return null;

  const selectedBuiltin =
    WIKI_TEMPLATE_CATALOG.find((item) => item.id === selectedBuiltinId) ??
    WIKI_TEMPLATE_CATALOG[0];
  const selectedCustom = selectedCustomSlug
    ? communityTemplates.find((item) => item.slug === selectedCustomSlug) ?? null
    : null;

  const handleSelectBuiltin = (item: WikiTemplateCatalogItem) => {
    setIsCreatingNew(false);
    setViewMode('picker');
    setSelectedCustomSlug(null);
    setSelectedBuiltinId(item.id);
    const next: Record<string, string> = {};
    for (const p of item.params) {
      next[p.key] = p.defaultValue ?? '';
    }
    setParamValues(next);
  };

  const handleSelectCustom = (slug: string) => {
    setIsCreatingNew(false);
    setViewMode('picker');
    setSelectedCustomSlug(slug);
    const target = communityTemplates.find((item) => item.slug === slug);
    const next: Record<string, string> = {};
    if (target) {
      for (const param of target.params) {
        next[param.name] = param.defaultValue;
      }
    }
    setCustomParamValues(next);
  };

  const handleStartCreateMode = () => {
    setViewMode('picker');
    setIsCreatingNew(true);
    setCreateError(null);
    setCreateSuccessMsg(null);
  };

  const generatedSnippet = selectedCustom
    ? buildTemplateInvocation(selectedCustom.title, customParamValues, true)
    : buildSnippetFromCatalog(selectedBuiltin, paramValues);

  const handleInsertClick = () => {
    onInsert(generatedSnippet);
    onClose();
  };

  const handleSaveTemplate = async (insertAfterSave: boolean) => {
    setCreateError(null);
    setCreateSuccessMsg(null);

    if (!currentUser) {
      setCreateError('Sign in with Google to save new templates to the wiki.');
      return;
    }

    const previewSlug = formatTemplateSlug(createName);
    if (!previewSlug) {
      setCreateError('Enter a valid template name (e.g., Editorial Note).');
      return;
    }
    if (existingSlugs.has(previewSlug)) {
      setCreateError(`A template already exists at :${previewSlug}. Choose another name or edit the existing page.`);
      return;
    }
    if (!createBody.trim()) {
      setCreateError('Write the template wikitext/Markdown body before saving.');
      return;
    }

    setCreatingSave(true);
    try {
      const created = await createTemplateModel(
        {
          name: createName,
          description: createDescription,
          body: createBody,
          visibility: createVisibility,
        },
        currentUser
      );

      if (insertAfterSave) {
        onInsert(created.invocation);
        onClose();
        return;
      }

      setCreateSuccessMsg(`Template "${created.title}" saved at :${created.slug}!`);
      setIsCreatingNew(false);
      setActiveTab('community');
      setSelectedCustomSlug(created.slug);
      const nextDefaults: Record<string, string> = {};
      for (const p of extractTemplateParameters(createBody)) {
        nextDefaults[p.name] = p.defaultValue || p.name;
      }
      setCustomParamValues(nextDefaults);
      setCreateName('');
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Could not save the template to Firestore.'
      );
    } finally {
      setCreatingSave(false);
    }
  };

  const handleOpenDedicatedTemplateEditor = () => {
    const clean = toWikiSlug(createName || 'new-template');
    const slug =
      clean.startsWith('predefinicao-') || clean.startsWith('template-')
        ? clean
        : `template-${clean}`;
    onClose();
    onNavigateSlug(slug);
  };

  const candidateCreateSlug = formatTemplateSlug(createName);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        data-wiki-surface="panel"
        className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1623] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Braces className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
              <h2
                id="template-picker-title"
                className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 truncate"
              >
                MediaWiki Templates
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                <code className="font-mono">{'{{Name|param}}'}</code> expansion, <code className="font-mono">{'{{{1}}}'}</code> parameters, and wiki-saved templates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsCreatingNew(false);
                setViewMode((prev) => (prev === 'all-list' ? 'picker' : 'all-list'));
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                !isCreatingNew && viewMode === 'all-list'
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>
                {!isCreatingNew && viewMode === 'all-list'
                  ? 'Configurator Mode'
                  : `List All (${WIKI_TEMPLATE_CATALOG.length + communityTemplates.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={handleStartCreateMode}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isCreatingNew
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Template</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close template picker"
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        {!isCreatingNew && (
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-[#0b0f17]/70">
            <div className="flex flex-wrap items-center gap-1">
              {FILTER_TABS.map((tab) => {
                const count =
                  tab.id === 'all'
                    ? WIKI_TEMPLATE_CATALOG.length + communityTemplates.length
                    : tab.id === 'community'
                    ? communityTemplates.length
                    : WIKI_TEMPLATE_CATALOG.filter((item) => item.category === tab.id).length;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-blue-700 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab.label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
              />
            </div>
          </div>
        )}

        {/* Body: Either Complete Directory View OR Split Picker/Creation */}
        {!isCreatingNew && viewMode === 'all-list' ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5 bg-white dark:bg-[#0f1623]">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Complete directory showing{' '}
                <strong className="font-semibold text-slate-900 dark:text-slate-100">
                  {filteredBuiltin.length + filteredCustom.length}
                </strong>{' '}
                of{' '}
                <strong className="font-semibold text-slate-900 dark:text-slate-100">
                  {WIKI_TEMPLATE_CATALOG.length + communityTemplates.length}
                </strong>{' '}
                available templates. Click <strong>Insert</strong> to add directly to the article or <strong>Configure</strong> to fill in parameters.
              </p>
            </div>

            {filteredBuiltin.length > 0 && (
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Built-in Templates ({filteredBuiltin.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredBuiltin.map((item) => {
                    const defaultValues: Record<string, string> = {};
                    for (const p of item.params) {
                      defaultValues[p.key] = p.defaultValue ?? '';
                    }
                    const quickSnippet = item.exampleSnippet || buildSnippetFromCatalog(item, defaultValues);
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0b0f17]/70 p-3.5 flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-xs font-semibold text-blue-800 dark:text-blue-300">
                              {`{{${item.name}}}`}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              <span className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {CATEGORY_LABELS[item.category]}
                              </span>
                              <span>{(item.language ?? 'en').toUpperCase()}</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {item.description}
                          </p>
                          <code className="block text-[11px] font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-md px-2.5 py-1.5 break-all">
                            {quickSnippet}
                          </code>
                          {item.aliases.length > 1 && (
                            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              Aliases: {item.aliases.slice(0, 5).join(', ')}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => handleSelectBuiltin(item)}
                            className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            Configure
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onInsert(quickSnippet);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-700 text-white hover:bg-blue-800 transition-colors cursor-pointer"
                          >
                            <Braces className="w-3 h-3" />
                            <span>Insert</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredCustom.length > 0 && (
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Community ({filteredCustom.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredCustom.map((item) => {
                    const customDefaults: Record<string, string> = {};
                    for (const p of item.params) {
                      customDefaults[p.name] = p.defaultValue;
                    }
                    const quickInvocation = buildTemplateInvocation(item.title, customDefaults, true);
                    return (
                      <div
                        key={item.slug}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0b0f17]/70 p-3.5 flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-semibold text-blue-800 dark:text-blue-300 truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                              :{item.slug}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                          <code className="block text-[11px] font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0f1623] border border-slate-200 dark:border-slate-800 rounded-md px-2.5 py-1.5 break-all">
                            {quickInvocation}
                          </code>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => handleSelectCustom(item.slug)}
                            className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            Configure
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onInsert(quickInvocation);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-700 text-white hover:bg-blue-800 transition-colors cursor-pointer"
                          >
                            <Braces className="w-3 h-3" />
                            <span>Insert</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredBuiltin.length === 0 && filteredCustom.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-10 text-center">
                No templates found for &quot;{searchQuery}&quot;.
              </p>
            )}
          </div>
        ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left column: Template List */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 space-y-4 max-h-64 lg:max-h-none">
            {createSuccessMsg && (
              <div className="px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{createSuccessMsg}</span>
              </div>
            )}

            {filteredBuiltin.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                  Built-in Templates ({filteredBuiltin.length})
                </div>
                {filteredBuiltin.map((item) => {
                  const isActive = !isCreatingNew && !selectedCustom && selectedBuiltin.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectBuiltin(item)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                        isActive
                          ? 'border-blue-700 bg-blue-50/70 dark:bg-blue-950/35'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {`{{${item.name}}}`}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {(item.language ?? 'en').toUpperCase()} · {item.params.length} param{item.params.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {filteredCustom.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 flex items-center gap-1.5">
                  <Layers className="w-3 h-3" />
                  <span>Community ({filteredCustom.length})</span>
                </div>
                {filteredCustom.map((item) => {
                  const isActive = !isCreatingNew && selectedCustom?.slug === item.slug;
                  return (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => handleSelectCustom(item.slug)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                        isActive
                          ? 'border-blue-700 bg-blue-50/70 dark:bg-blue-950/35'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                          :{item.slug}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        By {item.page.lastEditorName} · v{item.page.version}
                        {item.params.length > 0 ? ` · ${item.params.length} param(s)` : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {filteredBuiltin.length === 0 && filteredCustom.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">
                No templates found for &quot;{searchQuery}&quot;.
              </p>
            )}
          </div>

          {/* Right column: Create New OR Configure Params & Live Preview */}
          <div className="lg:col-span-7 overflow-y-auto p-5 space-y-5">
            {isCreatingNew ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                      Create New Reusable Template
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Use parameters such as <code className="font-mono">{'{{{1|Text}}}'}</code> or <code className="font-mono">{'{{{title|Notice}}}'}</code> to reuse across any article.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  >
                    Back to catalog
                  </button>
                </div>

                {createError && (
                  <div
                    role="alert"
                    className="px-3 py-2 text-xs rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/35 text-red-700 dark:text-red-300"
                  >
                    {createError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="create-template-name"
                      className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
                    >
                      Template Name
                    </label>
                    <input
                      id="create-template-name"
                      type="text"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="e.g., Historical Note"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                    />
                    {candidateCreateSlug && (
                      <p className="mt-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        Slug: :{candidateCreateSlug} · Call: {`{{Template:${createName.trim()}}}`}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="create-template-visibility"
                      className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
                    >
                      Visibility
                    </label>
                    <select
                      id="create-template-visibility"
                      value={createVisibility}
                      onChange={(e) => setCreateVisibility(e.target.value as PageVisibility)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100"
                    >
                      <option value="public">Public (Wiki)</option>
                      <option value="private">Private (Only you)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="create-template-desc"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
                  >
                    Documentation (<code className="font-mono">&lt;noinclude&gt;</code>, optional)
                  </label>
                  <input
                    id="create-template-desc"
                    type="text"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="Explain when and how to use this template..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <label
                      htmlFor="create-template-body"
                      className="text-xs font-medium text-slate-600 dark:text-slate-300"
                    >
                      Template Wikitext / Markdown Body
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCreateBody((prev) => `${prev} {{{1|parameter}}}`)}
                        className="px-2 py-0.5 text-[10px] font-mono rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        + {'{{{1}}}'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateBody((prev) => `${prev} {{{title|Title}}}`)}
                        className="px-2 py-0.5 text-[10px] font-mono rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        + {'{{{title}}}'}
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenDedicatedTemplateEditor}
                        className="px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Open full editor
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="create-template-body"
                    rows={4}
                    value={createBody}
                    onChange={(e) => setCreateBody(e.target.value)}
                    className="w-full p-3 text-xs font-mono leading-relaxed rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                  />
                  {detectedCreateParams.length > 0 && (
                    <div className="mt-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Detected parameters:{' '}
                      {detectedCreateParams
                        .map((p) =>
                          p.defaultValue ? `${p.name} (default: "${p.defaultValue}")` : p.name
                        )
                        .join(' · ')}
                    </div>
                  )}
                  {!createSyntaxValidation.valid && (
                    <div className="mt-1.5 text-[11px] text-amber-800 dark:text-amber-300">
                      {createSyntaxValidation.errors[0]}
                    </div>
                  )}
                  {createSyntaxValidation.valid && createSyntaxValidation.warnings.length > 0 && (
                    <div className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                      {createSyntaxValidation.warnings[0]}
                    </div>
                  )}
                </div>

                {/* Live Preview of new template */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Template preview (default values)
                  </div>
                  <div
                    data-wiki-surface="inset"
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] flow-root"
                  >
                    <ArticleViewer
                      content={liveCreatePreview}
                      existingSlugs={existingSlugs}
                      wikiPages={wikiPages}
                      onNavigateSlug={(slug) => {
                        onClose();
                        onNavigateSlug(slug);
                      }}
                      showToc={false}
                      enableReferences={false}
                      showReferencesFooter={false}
                      externalLinkPrefix={externalLinkPrefix}
                      encodeExternalLinkTarget={encodeExternalLinkTarget}
                    />
                  </div>
                </div>
              </div>
            ) : selectedCustom ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                      {selectedCustom.title}
                    </h3>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      :{selectedCustom.slug}
                    </p>
                    {selectedCustom.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">
                        {selectedCustom.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateSlug(selectedCustom.slug);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
                  >
                    <span>Edit source</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {selectedCustom.params.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedCustom.params.map((param) => (
                      <div key={param.name}>
                        <label
                          htmlFor={`custom-param-${param.name}`}
                          className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
                        >
                          Parameter <code className="font-mono">{`{{{${param.name}}}}`}</code>
                        </label>
                        <input
                          id={`custom-param-${param.name}`}
                          type="text"
                          value={customParamValues[param.name] ?? ''}
                          onChange={(e) =>
                            setCustomParamValues((prev) => ({
                              ...prev,
                              [param.name]: e.target.value,
                            }))
                          }
                          placeholder={param.defaultValue || `Value for ${param.name}`}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This template declares no <code className="font-mono">{'{{{param}}}'}</code> placeholders.
                  </p>
                )}

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Generated syntax
                  </div>
                  <pre
                    data-wiki-surface="inset"
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f17] text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all"
                  >
                    {generatedSnippet}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Preview
                  </div>
                  <div
                    data-wiki-surface="inset"
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] flow-root"
                  >
                    <ArticleViewer
                      content={generatedSnippet}
                      existingSlugs={existingSlugs}
                      wikiPages={wikiPages}
                      onNavigateSlug={(slug) => {
                        onClose();
                        onNavigateSlug(slug);
                      }}
                      showToc={false}
                      enableReferences={false}
                      showReferencesFooter={false}
                      externalLinkPrefix={externalLinkPrefix}
                      encodeExternalLinkTarget={encodeExternalLinkTarget}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                      {selectedBuiltin.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {selectedBuiltin.description}
                  </p>
                </div>

                {selectedBuiltin.params.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedBuiltin.params.map((param) => (
                      <div
                        key={param.key}
                        className={selectedBuiltin.params.length === 1 ? 'sm:col-span-2' : ''}
                      >
                        <label
                          htmlFor={`builtin-param-${param.key}`}
                          className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1"
                        >
                          {param.label}
                        </label>
                        <input
                          id={`builtin-param-${param.key}`}
                          type="text"
                          value={paramValues[param.key] ?? ''}
                          onChange={(e) =>
                            setParamValues((prev) => ({
                              ...prev,
                              [param.key]: e.target.value,
                            }))
                          }
                          placeholder={param.placeholder}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Parameterless template — ready for direct insertion.
                  </p>
                )}

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Generated syntax
                  </div>
                  <pre
                    data-wiki-surface="inset"
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f17] text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all"
                  >
                    {generatedSnippet}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Preview
                  </div>
                  <div
                    data-wiki-surface="inset"
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] flow-root"
                  >
                    <ArticleViewer
                      content={generatedSnippet}
                      existingSlugs={existingSlugs}
                      wikiPages={wikiPages}
                      onNavigateSlug={(slug) => {
                        onClose();
                        onNavigateSlug(slug);
                      }}
                      showToc={false}
                      enableReferences={false}
                      showReferencesFooter={false}
                      externalLinkPrefix={externalLinkPrefix}
                      encodeExternalLinkTarget={encodeExternalLinkTarget}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-[#0b0f17]/70">
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Magic words: {'{{CURRENTYEAR}}'}, {'{{CURRENTMONTHNAME}}'}, {'{{SITENAME}}'}
          </span>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {viewMode === 'all-list' && !isCreatingNew ? 'Close' : 'Cancel'}
            </button>
            {isCreatingNew ? (
              <>
                <button
                  type="button"
                  disabled={creatingSave}
                  onClick={() => void handleSaveTemplate(false)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-55 cursor-pointer"
                >
                  {creatingSave && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Template</span>
                </button>
                <button
                  type="button"
                  disabled={creatingSave}
                  onClick={() => void handleSaveTemplate(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors disabled:opacity-55 cursor-pointer"
                >
                  {creatingSave ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Braces className="w-3.5 h-3.5" />
                  )}
                  <span>Save &amp; Insert</span>
                </button>
              </>
            ) : viewMode === 'picker' ? (
              <button
                type="button"
                onClick={handleInsertClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors cursor-pointer"
              >
                <Braces className="w-3.5 h-3.5" />
                <span>Insert template</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
