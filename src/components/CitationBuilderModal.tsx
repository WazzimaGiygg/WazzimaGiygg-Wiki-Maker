import React from 'react';
import {
  BookMarked,
  BookOpen,
  Check,
  FileText,
  Globe,
  ListOrdered,
  Newspaper,
  Plus,
  Repeat2,
  X,
} from 'lucide-react';
import { extractArticleReferences, type WikiReferenceItem } from '../lib/markdownUtils';
import { expandTemplatesInWikitext } from '../services/templateService';
import type { WikiPage } from '../types/wiki';
import { ArticleViewer } from './ArticleViewer';
import { ReferencesFooter } from './ReferencesFooter';

type CitationTab = 'web' | 'book' | 'news' | 'free' | 'reuse';
type CitationSyntax = 'template' | 'tag';

interface CitationBuilderModalProps {
  isOpen: boolean;
  currentContent: string;
  existingSlugs: Set<string>;
  wikiPages?: WikiPage[];
  enableTemplates?: boolean;
  externalLinkPrefix?: string;
  encodeExternalLinkTarget?: boolean;
  onClose: () => void;
  onInsertInline: (snippet: string) => void;
  onInsertBlock: (block: string) => void;
}

function sanitizeAttrValue(raw: string): string {
  return raw.replace(/["<>]/g, '').trim();
}

function formatRefTag(body: string, name: string, group: string): string {
  const attrs: string[] = [];
  const cleanName = sanitizeAttrValue(name);
  const cleanGroup = sanitizeAttrValue(group);
  if (cleanName) attrs.push(`name="${cleanName}"`);
  if (cleanGroup) attrs.push(`group="${cleanGroup}"`);
  const attrStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
  return `<ref${attrStr}>${body.trim()}</ref>`;
}

export const CitationBuilderModal: React.FC<CitationBuilderModalProps> = ({
  isOpen,
  currentContent,
  existingSlugs,
  wikiPages = [],
  enableTemplates = true,
  externalLinkPrefix,
  encodeExternalLinkTarget = false,
  onClose,
  onInsertInline,
  onInsertBlock,
}) => {
  const [activeTab, setActiveTab] = React.useState<CitationTab>('web');
  const [syntaxMode, setSyntaxMode] = React.useState<CitationSyntax>(
    enableTemplates ? 'template' : 'tag'
  );

  // Common MediaWiki attributes
  const [refName, setRefName] = React.useState('');
  const [refGroup, setRefGroup] = React.useState('');

  // Web fields
  const [webTitle, setWebTitle] = React.useState('');
  const [webUrl, setWebUrl] = React.useState('');
  const [webAuthor, setWebAuthor] = React.useState('');
  const [webPublisher, setWebPublisher] = React.useState('');
  const [webDate, setWebDate] = React.useState('');

  // Book fields
  const [bookTitle, setBookTitle] = React.useState('');
  const [bookAuthor, setBookAuthor] = React.useState('');
  const [bookPublisher, setBookPublisher] = React.useState('');
  const [bookYear, setBookYear] = React.useState('');
  const [bookPages, setBookPages] = React.useState('');
  const [bookIsbn, setBookIsbn] = React.useState('');

  // News / Journal fields
  const [newsTitle, setNewsTitle] = React.useState('');
  const [newsUrl, setNewsUrl] = React.useState('');
  const [newsAuthor, setNewsAuthor] = React.useState('');
  const [newsOutlet, setNewsOutlet] = React.useState('');
  const [newsDate, setNewsDate] = React.useState('');

  // Free text note
  const [freeText, setFreeText] = React.useState('');

  // Reflist insertion options
  const [reflistCols, setReflistCols] = React.useState<1 | 2>(1);
  const [reflistInsertedFeedback, setReflistInsertedFeedback] = React.useState(false);

  const existingRefsInfo = React.useMemo(() => {
    if (!isOpen) {
      return { references: [] as WikiReferenceItem[], hasInlineReflist: false };
    }
    const expanded = enableTemplates
      ? expandTemplatesInWikitext(currentContent, wikiPages)
      : currentContent;
    const extracted = extractArticleReferences(expanded);
    return {
      references: extracted.references,
      hasInlineReflist: extracted.hasInlineReflist,
    };
  }, [isOpen, currentContent, wikiPages, enableTemplates]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const generatedCitation = React.useMemo(() => {
    const cleanName = sanitizeAttrValue(refName);
    const cleanGroup = sanitizeAttrValue(refGroup);

    if (activeTab === 'web') {
      const title = webTitle.trim() || 'Título da fonte';
      const url = webUrl.trim();
      const author = webAuthor.trim();
      const publisher = webPublisher.trim();
      const date = webDate.trim();

      if (syntaxMode === 'template' && enableTemplates && !cleanGroup) {
        const parts = [`título=${title}`];
        if (url) parts.push(`url=${url}`);
        if (author) parts.push(`autor=${author}`);
        if (publisher) parts.push(`publicado=${publisher}`);
        if (date) parts.push(`data=${date}`);
        if (cleanName) parts.push(`name=${cleanName}`);
        return `{{Citar web|${parts.join('|')}}}`;
      }

      const formattedTitle =
        url && (url.startsWith('https://') || url.startsWith('http://'))
          ? `[${title}](${url})`
          : `"${title}"`;
      const segments: string[] = [];
      if (author) segments.push(`${author}.`);
      segments.push(formattedTitle);
      if (publisher) segments.push(`— ${publisher}`);
      if (date) segments.push(`(${date})`);
      return formatRefTag(segments.join(' '), cleanName, cleanGroup);
    }

    if (activeTab === 'book') {
      const title = bookTitle.trim() || 'Título do livro';
      const author = bookAuthor.trim();
      const publisher = bookPublisher.trim();
      const year = bookYear.trim();
      const pages = bookPages.trim();
      const isbn = bookIsbn.trim();

      if (syntaxMode === 'template' && enableTemplates && !cleanGroup) {
        const parts = [`título=${title}`];
        if (author) parts.push(`autor=${author}`);
        if (publisher) parts.push(`editora=${publisher}`);
        if (year) parts.push(`ano=${year}`);
        if (pages) parts.push(`paginas=${pages}`);
        if (isbn) parts.push(`isbn=${isbn}`);
        if (cleanName) parts.push(`name=${cleanName}`);
        return `{{Citar livro|${parts.join('|')}}}`;
      }

      const segments: string[] = [];
      if (author) segments.push(`${author}.`);
      segments.push(`*${title}*`);
      if (publisher) segments.push(`— ${publisher}`);
      if (year) segments.push(`(${year})`);
      if (pages) segments.push(`p. ${pages}`);
      if (isbn) segments.push(`ISBN ${isbn}`);
      return formatRefTag(segments.join(' '), cleanName, cleanGroup);
    }

    if (activeTab === 'news') {
      const title = newsTitle.trim() || 'Título da reportagem ou artigo';
      const url = newsUrl.trim();
      const author = newsAuthor.trim();
      const outlet = newsOutlet.trim();
      const date = newsDate.trim();

      if (syntaxMode === 'template' && enableTemplates && !cleanGroup) {
        const parts = [`título=${title}`];
        if (url) parts.push(`url=${url}`);
        if (author) parts.push(`autor=${author}`);
        if (outlet) parts.push(`jornal=${outlet}`);
        if (date) parts.push(`data=${date}`);
        if (cleanName) parts.push(`name=${cleanName}`);
        return `{{Citar notícia|${parts.join('|')}}}`;
      }

      const formattedTitle =
        url && (url.startsWith('https://') || url.startsWith('http://'))
          ? `[${title}](${url})`
          : `"${title}"`;
      const segments: string[] = [];
      if (author) segments.push(`${author}.`);
      segments.push(formattedTitle);
      if (outlet) segments.push(`— *${outlet}*`);
      if (date) segments.push(`(${date})`);
      return formatRefTag(segments.join(' '), cleanName, cleanGroup);
    }

    if (activeTab === 'free') {
      const body = freeText.trim() || 'Autor, Título (Ano). https://exemplo.com';
      return formatRefTag(body, cleanName, cleanGroup);
    }

    return '';
  }, [
    activeTab,
    syntaxMode,
    enableTemplates,
    refName,
    refGroup,
    webTitle,
    webUrl,
    webAuthor,
    webPublisher,
    webDate,
    bookTitle,
    bookAuthor,
    bookPublisher,
    bookYear,
    bookPages,
    bookIsbn,
    newsTitle,
    newsUrl,
    newsAuthor,
    newsOutlet,
    newsDate,
    freeText,
  ]);

  const previewSampleContent = React.useMemo(() => {
    if (!generatedCitation) return '';
    return `Texto do artigo apoiado por fonte verificável.${generatedCitation}`;
  }, [generatedCitation]);

  const previewExtracted = React.useMemo(() => {
    if (!previewSampleContent) return [];
    const expanded = enableTemplates
      ? expandTemplatesInWikitext(previewSampleContent, wikiPages)
      : previewSampleContent;
    return extractArticleReferences(expanded).references;
  }, [previewSampleContent, wikiPages, enableTemplates]);

  if (!isOpen) return null;

  const handleInsertCitation = () => {
    if (!generatedCitation) return;
    onInsertInline(generatedCitation);
    onClose();
  };

  const handleInsertReflistSection = () => {
    const cleanGroup = sanitizeAttrValue(refGroup);
    let listTag: string;
    if (enableTemplates) {
      const args: string[] = [];
      if (reflistCols === 2) args.push('colunas=2');
      if (cleanGroup) args.push(`group=${cleanGroup}`);
      listTag = args.length > 0 ? `{{Reflist|${args.join('|')}}}` : '{{Reflist}}';
    } else {
      listTag = cleanGroup ? `<references group="${cleanGroup}" />` : '<references />';
    }
    const heading = cleanGroup ? `## Notas (${cleanGroup})` : '## Referências';
    onInsertBlock(`${heading}\n\n${listTag}`);
    setReflistInsertedFeedback(true);
    window.setTimeout(() => setReflistInsertedFeedback(false), 1600);
  };

  const handleReuseReference = (ref: WikiReferenceItem) => {
    if (ref.name) {
      const groupAttr = ref.group ? ` group="${sanitizeAttrValue(ref.group)}"` : '';
      onInsertInline(`<ref name="${sanitizeAttrValue(ref.name)}"${groupAttr} />`);
      onClose();
      return;
    }
    const groupAttr = ref.group ? ` group="${sanitizeAttrValue(ref.group)}"` : '';
    onInsertInline(`<ref${groupAttr}>${ref.content}</ref>`);
    onClose();
  };

  const TABS: { id: CitationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'web', label: 'Web / Site', icon: Globe },
    { id: 'book', label: 'Livro', icon: BookOpen },
    { id: 'news', label: 'Notícia / Artigo', icon: Newspaper },
    { id: 'free', label: 'Nota Livre', icon: FileText },
    { id: 'reuse', label: `Reutilizar (${existingRefsInfo.references.length})`, icon: Repeat2 },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sistema de Citação MediaWiki"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg border border-blue-200 dark:border-blue-900/70 bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
              <BookMarked className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Citar Fonte (Padrão MediaWiki / Wikipédia)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Crie citações numeradas <code className="font-mono">&lt;ref&gt;</code> ligadas automaticamente à lista de referências.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela de citação"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f1623]">
          <div role="tablist" aria-label="Tipo de fonte" className="flex flex-wrap items-center gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab !== 'reuse' && activeTab !== 'free' && enableTemplates && (
            <div className="flex items-center gap-1 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setSyntaxMode('template')}
                className={`px-2 py-1 rounded border transition-colors cursor-pointer ${
                  syntaxMode === 'template'
                    ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {'{{Citar}}'}
              </button>
              <button
                type="button"
                onClick={() => setSyntaxMode('tag')}
                className={`px-2 py-1 rounded border transition-colors cursor-pointer ${
                  syntaxMode === 'tag'
                    ? 'border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                &lt;ref&gt;
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'web' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Título da página ou documento *
                </label>
                <input
                  type="text"
                  value={webTitle}
                  onChange={(e) => setWebTitle(e.target.value)}
                  placeholder="Ex.: Manual de Estilo da Enciclopédia"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  URL (https://...)
                </label>
                <input
                  type="url"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  placeholder="https://exemplo.org/artigo"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Autor(a)
                </label>
                <input
                  type="text"
                  value={webAuthor}
                  onChange={(e) => setWebAuthor(e.target.value)}
                  placeholder="Sobrenome, Nome"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Site / Publicação
                </label>
                <input
                  type="text"
                  value={webPublisher}
                  onChange={(e) => setWebPublisher(e.target.value)}
                  placeholder="Ex.: Fundação Wikimedia"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data de publicação ou acesso
                </label>
                <input
                  type="text"
                  value={webDate}
                  onChange={(e) => setWebDate(e.target.value)}
                  placeholder="Ex.: 2026-11-26"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>
          )}

          {activeTab === 'book' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Título do livro *
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Ex.: História da Documentação Digital"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Autor(a)
                </label>
                <input
                  type="text"
                  value={bookAuthor}
                  onChange={(e) => setBookAuthor(e.target.value)}
                  placeholder="Sobrenome, Nome"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Editora
                </label>
                <input
                  type="text"
                  value={bookPublisher}
                  onChange={(e) => setBookPublisher(e.target.value)}
                  placeholder="Ex.: Editora Universitária"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Ano
                </label>
                <input
                  type="text"
                  value={bookYear}
                  onChange={(e) => setBookYear(e.target.value)}
                  placeholder="2025"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Páginas
                  </label>
                  <input
                    type="text"
                    value={bookPages}
                    onChange={(e) => setBookPages(e.target.value)}
                    placeholder="42–48"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    ISBN
                  </label>
                  <input
                    type="text"
                    value={bookIsbn}
                    onChange={(e) => setBookIsbn(e.target.value)}
                    placeholder="978-..."
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Título da matéria ou artigo *
                </label>
                <input
                  type="text"
                  value={newsTitle}
                  onChange={(e) => setNewsTitle(e.target.value)}
                  placeholder="Ex.: Nova biblioteca aberta entra em operação"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  URL (https://...)
                </label>
                <input
                  type="url"
                  value={newsUrl}
                  onChange={(e) => setNewsUrl(e.target.value)}
                  placeholder="https://jornal.exemplo/materia"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Autor(a) / Repórter
                </label>
                <input
                  type="text"
                  value={newsAuthor}
                  onChange={(e) => setNewsAuthor(e.target.value)}
                  placeholder="Nome do autor"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Jornal / Periódico
                </label>
                <input
                  type="text"
                  value={newsOutlet}
                  onChange={(e) => setNewsOutlet(e.target.value)}
                  placeholder="Ex.: Folha Científica"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Data
                </label>
                <input
                  type="text"
                  value={newsDate}
                  onChange={(e) => setNewsDate(e.target.value)}
                  placeholder="Ex.: Novembro de 2026"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                />
              </div>
            </div>
          )}

          {activeTab === 'free' && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Texto da referência ou nota explicativa (aceita Markdown e <code className="font-mono">[[links]]</code>)
              </label>
              <textarea
                rows={3}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Ex.: SILVA, Maria. *Introdução ao WikiMaker* (2026). [Documento oficial](https://exemplo.com)"
                className="w-full p-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
              />
            </div>
          )}

          {activeTab === 'reuse' && (
            <div className="space-y-2.5">
              {existingRefsInfo.references.length === 0 ? (
                <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f1623] text-center space-y-1.5">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Nenhuma citação encontrada neste artigo ainda.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Crie sua primeira citação nas abas Web, Livro, Notícia ou Nota Livre e defina um identificador (<code className="font-mono">name</code>) para reutilizá-la em vários trechos.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {existingRefsInfo.references.map((ref) => (
                    <div
                      key={ref.id}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white dark:bg-[#0f1623]"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                          <span className="font-semibold text-blue-700 dark:text-blue-400">
                            [{ref.group ? `${ref.group} ${ref.index}` : ref.index}]
                          </span>
                          {ref.name ? (
                            <span className="text-slate-600 dark:text-slate-300">
                              · name=&quot;{ref.name}&quot;
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">
                              · sem name (cópia independente)
                            </span>
                          )}
                          <span className="text-slate-400 dark:text-slate-500 tabular-nums">
                            · {ref.backlinks.length}{' '}
                            {ref.backlinks.length === 1 ? 'ocorrência' : 'ocorrências'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                          {ref.content}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleReuseReference(ref)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Repeat2 className="w-3.5 h-3.5" />
                        <span>{ref.name ? 'Reutilizar' : 'Inserir cópia'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Optional MediaWiki name & group + Live Preview for new citations */}
          {activeTab !== 'reuse' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Identificador reutilizável (<code className="font-mono">name</code> — opcional)
                  </label>
                  <input
                    type="text"
                    value={refName}
                    onChange={(e) => setRefName(e.target.value)}
                    placeholder="Ex.: silva-2026 (para reutilizar com <ref name=... />)"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Grupo de notas (<code className="font-mono">group</code> — opcional)
                  </label>
                  <input
                    type="text"
                    value={refGroup}
                    onChange={(e) => setRefGroup(e.target.value)}
                    placeholder="Ex.: nota (separa de referências principais)"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0f1623] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              {/* Generated syntax + live preview */}
              <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>Pré-visualização (no texto e na lista de referências)</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f1623] space-y-2.5">
                  <div className="text-xs text-slate-800 dark:text-slate-200">
                    <ArticleViewer
                      content={previewSampleContent}
                      existingSlugs={existingSlugs}
                      wikiPages={wikiPages}
                      onNavigateSlug={() => {}}
                      showToc={false}
                      enableReferences={true}
                      showReferencesFooter={false}
                      enableInfoboxes={false}
                      enableTemplates={enableTemplates}
                      externalLinkPrefix={externalLinkPrefix}
                      encodeExternalLinkTarget={encodeExternalLinkTarget}
                    />
                  </div>
                  {previewExtracted.length > 0 && (
                    <ReferencesFooter
                      inline
                      hideHeading
                      references={previewExtracted}
                      existingSlugs={existingSlugs}
                      externalLinkPrefix={externalLinkPrefix}
                      encodeExternalLinkTarget={encodeExternalLinkTarget}
                      className="!my-0 !p-2.5"
                    />
                  )}
                </div>
                <div className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f17] font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all">
                  {generatedCitation}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer: Reference List insertion + Citation insertion */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f1623]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleInsertReflistSection}
              title="Inserir bloco ## Referências com lista interativa ({{Reflist}} / <references />)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {reflistInsertedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Lista inserida</span>
                </>
              ) : (
                <>
                  <ListOrdered className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>
                    {existingRefsInfo.hasInlineReflist
                      ? 'Inserir outra Lista de Referências'
                      : 'Inserir Lista de Referências'}
                  </span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setReflistCols((c) => (c === 1 ? 2 : 1))}
              title="Alternar lista em 1 ou 2 colunas"
              className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {reflistCols === 2 ? '2 colunas' : '1 coluna'}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            {activeTab !== 'reuse' && (
              <button
                type="button"
                onClick={handleInsertCitation}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Inserir citação</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
