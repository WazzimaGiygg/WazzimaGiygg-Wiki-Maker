import React from 'react';
import { ExternalLink, Link2, Unlink, X } from 'lucide-react';
import {
  editorElementToMarkdown,
  markdownToEditorHtml,
  wikiSnippetToEditorHtml,
} from '../lib/markdownRichBridge';
import { toWikiSlug } from '../lib/markdownUtils';

export type RichFormatCommand =
  | 'bold'
  | 'italic'
  | 'heading2'
  | 'heading3'
  | 'paragraph'
  | 'wikilink'
  | 'externallink'
  | 'bulletList'
  | 'orderedList'
  | 'checklist'
  | 'blockquote'
  | 'codeBlock'
  | 'table'
  | 'hr';

export interface ActiveRichFormats {
  bold: boolean;
  italic: boolean;
  blockTag: string;
  unorderedList: boolean;
  orderedList: boolean;
}

export interface FormattedEditorHandle {
  focus: () => void;
  applyFormat: (command: RichFormatCommand) => void;
  insertRawWikiSnippet: (rawSnippet: string) => void;
}

interface FormattedMarkdownPaneProps {
  value: string;
  onChange: (nextMarkdown: string) => void;
  onActiveFormatsChange?: (formats: ActiveRichFormats) => void;
  placeholder?: string;
  roundedClassName?: string;
  minHeightClassName?: string;
}

interface SelectedLinkEditState {
  anchor: HTMLAnchorElement;
  kind: 'wiki' | 'external';
  target: string;
  label: string;
}

export const FormattedMarkdownPane = React.forwardRef<
  FormattedEditorHandle,
  FormattedMarkdownPaneProps
>(
  (
    {
      value,
      onChange,
      onActiveFormatsChange,
      placeholder = 'Escreva diretamente no modo formatado...',
      roundedClassName = 'rounded-xl',
      minHeightClassName = 'min-h-[420px]',
    },
    ref
  ) => {
    const editorRef = React.useRef<HTMLDivElement | null>(null);
    const lastSyncedMarkdownRef = React.useRef<string>(value);
    const savedRangeRef = React.useRef<Range | null>(null);
    const [isEmpty, setIsEmpty] = React.useState(!value.trim());
    const [selectedLink, setSelectedLink] = React.useState<SelectedLinkEditState | null>(null);

    const syncFromDom = React.useCallback(() => {
      const el = editorRef.current;
      if (!el) return;
      const nextMd = editorElementToMarkdown(el);
      lastSyncedMarkdownRef.current = nextMd;
      setIsEmpty(!nextMd.trim());
      onChange(nextMd);
    }, [onChange]);

    // Hydrate DOM on initial mount and whenever `value` changes externally (e.g. typing in Code mode)
    React.useEffect(() => {
      const el = editorRef.current;
      if (!el) return;

      if (value === lastSyncedMarkdownRef.current && el.innerHTML !== '') {
        setIsEmpty(!value.trim());
        return;
      }

      const nextHtml = markdownToEditorHtml(value);
      if (el.innerHTML !== nextHtml) {
        const hadFocus = document.activeElement === el;
        el.innerHTML = nextHtml;
        if (hadFocus) {
          const sel = window.getSelection();
          if (sel) {
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            savedRangeRef.current = range.cloneRange();
          }
        }
      }
      lastSyncedMarkdownRef.current = value;
      setIsEmpty(!value.trim());
    }, [value]);

    const saveSelection = React.useCallback(() => {
      const el = editorRef.current;
      const sel = window.getSelection();
      if (!el || !sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (el.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }, []);

    const restoreSelection = React.useCallback(() => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      if (!sel) return;
      if (savedRangeRef.current && el.contains(savedRangeRef.current.commonAncestorContainer)) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      } else if (sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, []);

    const updateActiveFormats = React.useCallback(() => {
      if (!onActiveFormatsChange) return;
      const el = editorRef.current;
      const sel = window.getSelection();
      if (!el || !sel || !el.contains(sel.anchorNode)) return;

      try {
        const blockTag = String(document.queryCommandValue('formatBlock') || '').toLowerCase();
        onActiveFormatsChange({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          blockTag,
          unorderedList: document.queryCommandState('insertUnorderedList'),
          orderedList: document.queryCommandState('insertOrderedList'),
        });
      } catch {
        // Ignore browser-specific queryCommand errors
      }
    }, [onActiveFormatsChange]);

    React.useEffect(() => {
      const handleSelectionChange = () => {
        saveSelection();
        updateActiveFormats();
      };
      document.addEventListener('selectionchange', handleSelectionChange);
      return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [saveSelection, updateActiveFormats]);

    const insertHtmlAtSelection = React.useCallback(
      (html: string) => {
        const el = editorRef.current;
        if (!el) return;
        restoreSelection();

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const fragment = range.createContextualFragment(html);
          const lastInserted = fragment.lastChild;
          range.insertNode(fragment);
          if (lastInserted) {
            const nextRange = document.createRange();
            nextRange.setStartAfter(lastInserted);
            nextRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(nextRange);
            savedRangeRef.current = nextRange.cloneRange();
          }
        } else {
          el.insertAdjacentHTML('beforeend', html);
        }

        syncFromDom();
      },
      [restoreSelection, syncFromDom]
    );

    const openAnchorEditor = React.useCallback((anchor: HTMLAnchorElement) => {
      const wikiSlug = anchor.getAttribute('data-wiki-slug');
      const href = anchor.getAttribute('href') || '';
      const label = anchor.textContent ?? '';
      if (wikiSlug) {
        setSelectedLink({
          anchor,
          kind: 'wiki',
          target: wikiSlug,
          label: label || wikiSlug,
        });
      } else if (href.startsWith('https://wiki.internal/')) {
        const slug = href.slice('https://wiki.internal/'.length);
        setSelectedLink({
          anchor,
          kind: 'wiki',
          target: slug,
          label: label || slug,
        });
      } else {
        setSelectedLink({
          anchor,
          kind: 'external',
          target: href || 'https://exemplo.com',
          label: label || 'Link',
        });
      }
    }, []);

    const applyRichCommand = React.useCallback(
      (command: RichFormatCommand) => {
        const el = editorRef.current;
        if (!el) return;
        restoreSelection();

        const sel = window.getSelection();
        const selectedText = sel && sel.rangeCount > 0 ? sel.toString().trim() : '';

        switch (command) {
          case 'bold':
            document.execCommand('bold');
            break;
          case 'italic':
            document.execCommand('italic');
            break;
          case 'heading2': {
            const current = String(document.queryCommandValue('formatBlock') || '').toLowerCase();
            document.execCommand('formatBlock', false, current === 'h2' ? 'P' : 'H2');
            break;
          }
          case 'heading3': {
            const current = String(document.queryCommandValue('formatBlock') || '').toLowerCase();
            document.execCommand('formatBlock', false, current === 'h3' ? 'P' : 'H3');
            break;
          }
          case 'paragraph':
            document.execCommand('formatBlock', false, 'P');
            break;
          case 'bulletList':
            document.execCommand('insertUnorderedList');
            break;
          case 'orderedList':
            document.execCommand('insertOrderedList');
            break;
          case 'blockquote': {
            const current = String(document.queryCommandValue('formatBlock') || '').toLowerCase();
            document.execCommand('formatBlock', false, current === 'blockquote' ? 'P' : 'BLOCKQUOTE');
            break;
          }
          case 'checklist': {
            const itemLabel = selectedText || 'Tarefa pendente';
            insertHtmlAtSelection(
              `<ul data-task-list="true"><li data-task-item="true"><input type="checkbox" /> ${itemLabel}</li></ul><p><br /></p>`
            );
            return;
          }
          case 'codeBlock': {
            const codeSample = (selectedText || 'const exemplo = "wiki";')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            insertHtmlAtSelection(
              `<pre data-lang="ts"><code>${codeSample}</code></pre><p><br /></p>`
            );
            return;
          }
          case 'table': {
            insertHtmlAtSelection(
              `<table><thead><tr><th>Coluna 1</th><th>Coluna 2</th></tr></thead><tbody><tr><td>Valor 1</td><td>Valor 2</td></tr><tr><td>Linha 2A</td><td>Linha 2B</td></tr></tbody></table><p><br /></p>`
            );
            return;
          }
          case 'hr': {
            insertHtmlAtSelection('<hr /><p><br /></p>');
            return;
          }
          case 'wikilink': {
            const label = selectedText || 'Texto do Link';
            const slug = selectedText ? toWikiSlug(selectedText) || 'slug-da-pagina' : 'slug-da-pagina';
            insertHtmlAtSelection(
              `<a href="https://wiki.internal/${slug}" data-wiki-slug="${slug}" class="wiki-rich-wikilink">${label}</a>`
            );
            const insertedAnchor = el.querySelector(
              `a[data-wiki-slug="${slug}"]`
            ) as HTMLAnchorElement | null;
            if (insertedAnchor) {
              openAnchorEditor(insertedAnchor);
            }
            return;
          }
          case 'externallink': {
            const label = selectedText || 'Texto do Link';
            const href = 'https://exemplo.com';
            insertHtmlAtSelection(`<a href="${href}">${label}</a>`);
            const anchors = el.querySelectorAll(`a[href="${href}"]`);
            const insertedAnchor = anchors[anchors.length - 1] as HTMLAnchorElement | undefined;
            if (insertedAnchor) {
              openAnchorEditor(insertedAnchor);
            }
            return;
          }
        }

        syncFromDom();
        updateActiveFormats();
      },
      [insertHtmlAtSelection, openAnchorEditor, restoreSelection, syncFromDom, updateActiveFormats]
    );

    React.useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          editorRef.current?.focus();
        },
        applyFormat: applyRichCommand,
        insertRawWikiSnippet: (rawSnippet: string) => {
          const fragmentHtml = wikiSnippetToEditorHtml(rawSnippet);
          const isBlock = rawSnippet.trim().startsWith(':::');
          insertHtmlAtSelection(isBlock ? `${fragmentHtml}<p><br /></p>` : `${fragmentHtml} `);
        },
      }),
      [applyRichCommand, insertHtmlAtSelection]
    );

    const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target instanceof HTMLInputElement && target.type === 'checkbox') {
        if (target.checked) {
          target.setAttribute('checked', '');
        } else {
          target.removeAttribute('checked');
        }
        syncFromDom();
        return;
      }

      const anchor = target.closest('a');
      if (anchor && editorRef.current?.contains(anchor)) {
        e.preventDefault();
        openAnchorEditor(anchor);
        return;
      }

      if (selectedLink) {
        setSelectedLink(null);
      }
    };

    const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const isMod = e.metaKey || e.ctrlKey;
      const keyLower = e.key.toLowerCase();

      if (isMod && !e.shiftKey) {
        if (keyLower === 'b') {
          e.preventDefault();
          applyRichCommand('bold');
          return;
        }
        if (keyLower === 'i') {
          e.preventDefault();
          applyRichCommand('italic');
          return;
        }
        // Defer Undo (Ctrl+Z), Redo (Ctrl+R / Ctrl+Y), and Replace (Ctrl+H) to MarkdownEditor's unified history/panel
        if (keyLower === 'z' || keyLower === 'r' || keyLower === 'y' || keyLower === 'h') {
          e.preventDefault();
          return;
        }
      }

      if (isMod && e.shiftKey && keyLower === 'z') {
        e.preventDefault();
        return;
      }

      if (isMod && e.shiftKey && keyLower === 'l') {
        e.preventDefault();
        applyRichCommand('wikilink');
        return;
      }

      if (e.key === 'Tab') {
        const sel = window.getSelection();
        const anchorNode = sel?.anchorNode;
        const cell =
          anchorNode instanceof HTMLElement
            ? anchorNode.closest('td, th')
            : anchorNode?.parentElement?.closest('td, th');
        if (cell && editorRef.current?.contains(cell)) {
          e.preventDefault();
          const table = cell.closest('table');
          if (table) {
            const cells = Array.from(table.querySelectorAll('th, td'));
            const idx = cells.indexOf(cell);
            const nextCell = e.shiftKey ? cells[idx - 1] : cells[idx + 1];
            if (nextCell) {
              const range = document.createRange();
              range.selectNodeContents(nextCell);
              range.collapse(false);
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          }
        }
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      const htmlData = e.clipboardData.getData('text/html');
      const textData = e.clipboardData.getData('text/plain');

      if (!htmlData && textData) {
        // Insert plain text cleanly respecting line breaks
        e.preventDefault();
        const escaped = textData
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\r?\n/g, '<br />');
        document.execCommand('insertHTML', false, escaped);
        syncFromDom();
        return;
      }

      if (htmlData) {
        // Strip unsafe scripts/styles/event handlers from pasted HTML
        e.preventDefault();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlData, 'text/html');
        doc.querySelectorAll('script, style, iframe, object, embed, svg').forEach((el) => el.remove());
        doc.querySelectorAll('*').forEach((node) => {
          Array.from(node.attributes).forEach((attr) => {
            if (attr.name.toLowerCase().startsWith('on')) {
              node.removeAttribute(attr.name);
            }
          });
        });
        document.execCommand('insertHTML', false, doc.body.innerHTML);
        syncFromDom();
      }
    };

    const handleApplyLinkEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedLink || !editorRef.current?.contains(selectedLink.anchor)) {
        setSelectedLink(null);
        return;
      }

      const { anchor, kind, target, label } = selectedLink;
      const cleanedLabel = label.trim() || target.trim() || 'Link';

      if (kind === 'wiki') {
        const cleanedSlug = toWikiSlug(target) || 'start';
        anchor.setAttribute('data-wiki-slug', cleanedSlug);
        anchor.setAttribute('href', `https://wiki.internal/${cleanedSlug}`);
        anchor.className = 'wiki-rich-wikilink';
        anchor.textContent = cleanedLabel;
      } else {
        const trimmedUrl = target.trim();
        const safeUrl = /^(https?:\/\/|mailto:|\/)/i.test(trimmedUrl)
          ? trimmedUrl
          : 'https://exemplo.com';
        anchor.removeAttribute('data-wiki-slug');
        anchor.removeAttribute('class');
        anchor.setAttribute('href', safeUrl);
        anchor.textContent = cleanedLabel;
      }

      setSelectedLink(null);
      syncFromDom();
    };

    const handleUnlink = () => {
      if (!selectedLink || !editorRef.current?.contains(selectedLink.anchor)) {
        setSelectedLink(null);
        return;
      }
      const textNode = document.createTextNode(selectedLink.anchor.textContent || selectedLink.label);
      selectedLink.anchor.replaceWith(textNode);
      setSelectedLink(null);
      syncFromDom();
    };

    return (
      <div className="relative flex flex-col">
        {selectedLink && (
          <form
            onSubmit={handleApplyLinkEdit}
            className="mb-2 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800/80 bg-blue-50/90 dark:bg-blue-950/40 flex flex-wrap items-center gap-2 text-xs"
          >
            <span className="inline-flex items-center gap-1 font-semibold text-blue-900 dark:text-blue-200 shrink-0">
              {selectedLink.kind === 'wiki' ? (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Link interno</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>URL externa</span>
                </>
              )}
            </span>
            <input
              type="text"
              value={selectedLink.target}
              onChange={(e) =>
                setSelectedLink((prev) => (prev ? { ...prev, target: e.target.value } : null))
              }
              placeholder={selectedLink.kind === 'wiki' ? 'slug-da-pagina' : 'https://...'}
              aria-label={selectedLink.kind === 'wiki' ? 'Slug da página' : 'URL externa'}
              className="flex-1 min-w-[140px] px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-700"
            />
            <input
              type="text"
              value={selectedLink.label}
              onChange={(e) =>
                setSelectedLink((prev) => (prev ? { ...prev, label: e.target.value } : null))
              }
              placeholder="Texto exibido"
              aria-label="Texto exibido do link"
              className="flex-1 min-w-[130px] px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-blue-700"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-md bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors cursor-pointer shrink-0"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={handleUnlink}
              title="Remover link mantendo o texto"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <Unlink className="w-3 h-3" />
              <span>Desvincular</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedLink(null)}
              aria-label="Fechar editor de link"
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        <div className="relative">
          {isEmpty && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-4 left-4 right-4 text-sm text-slate-400 dark:text-slate-500 select-none"
            >
              {placeholder}
            </div>
          )}

          <div
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            aria-label="Editor de texto formatado"
            contentEditable
            suppressContentEditableWarning
            onInput={() => {
              const el = editorRef.current;
              if (el && el.innerHTML === '') {
                el.innerHTML = '<p><br /></p>';
              }
              syncFromDom();
              updateActiveFormats();
            }}
            onClick={handleEditorClick}
            onKeyDown={handleEditorKeyDown}
            onPaste={handlePaste}
            onBlur={() => {
              saveSelection();
              syncFromDom();
            }}
            className={`${minHeightClassName} max-h-[680px] overflow-y-auto p-4 sm:p-5 text-sm leading-relaxed ${roundedClassName} border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 [&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:pb-1 [&_h2]:border-b [&_h2]:border-slate-200 dark:[&_h2]:border-slate-800 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ul[data-task-list]]:list-none [&_ul[data-task-list]]:pl-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_li]:my-1 [&_blockquote]:border-l-3 [&_blockquote]:border-blue-600/70 [&_blockquote]:pl-3.5 [&_blockquote]:py-0.5 [&_blockquote]:my-3 [&_blockquote]:text-slate-600 dark:[&_blockquote]:text-slate-300 [&_blockquote]:italic [&_code]:font-mono [&_code]:text-xs [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-slate-100 dark:[&_code]:bg-slate-800 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:p-3 [&_pre]:my-3 [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-slate-200 dark:[&_pre]:border-slate-800 [&_pre]:bg-slate-50 dark:[&_pre]:bg-[#0f1623] [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_a]:text-blue-700 dark:[&_a]:text-blue-400 [&_a]:underline [&_a]:decoration-blue-500/60 [&_a]:underline-offset-2 [&_a.wiki-rich-wikilink]:font-medium [&_hr]:my-4 [&_hr]:border-slate-200 dark:[&_hr]:border-slate-800 [&_table]:w-full [&_table]:my-3 [&_table]:border-collapse [&_table]:text-xs [&_th]:border [&_th]:border-slate-300 dark:[&_th]:border-slate-700 [&_th]:bg-slate-100 dark:[&_th]:bg-slate-800/80 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-slate-300 dark:[&_td]:border-slate-700 [&_td]:px-2.5 [&_td]:py-1.5 [&_.wiki-rich-token-inline]:inline-flex [&_.wiki-rich-token-inline]:items-center [&_.wiki-rich-token-inline]:px-1.5 [&_.wiki-rich-token-inline]:py-0.5 [&_.wiki-rich-token-inline]:mx-0.5 [&_.wiki-rich-token-inline]:rounded [&_.wiki-rich-token-inline]:border [&_.wiki-rich-token-inline]:border-blue-200 dark:[&_span.wiki-rich-token-inline]:border-blue-800 [&_.wiki-rich-token-inline]:bg-blue-50/80 dark:[&_.wiki-rich-token-inline]:bg-blue-950/40 [&_.wiki-rich-token-inline]:font-mono [&_.wiki-rich-token-inline]:text-[11px] [&_.wiki-rich-token-inline]:text-blue-800 dark:[&_.wiki-rich-token-inline]:text-blue-300 [&_.wiki-rich-token-inline]:select-none [&_.wiki-rich-token-block]:my-2.5 [&_.wiki-rich-token-block]:px-3 [&_.wiki-rich-token-block]:py-2 [&_.wiki-rich-token-block]:rounded-lg [&_.wiki-rich-token-block]:border [&_.wiki-rich-token-block]:border-blue-200 dark:[&_.wiki-rich-token-block]:border-blue-800 [&_.wiki-rich-token-block]:bg-blue-50/60 dark:[&_.wiki-rich-token-block]:bg-blue-950/30 [&_.wiki-rich-token-block]:font-mono [&_.wiki-rich-token-block]:text-xs [&_.wiki-rich-token-block]:text-blue-900 dark:[&_.wiki-rich-token-block]:text-blue-200 [&_.wiki-rich-token-block]:select-none`}
          />
        </div>
      </div>
    );
  }
);

FormattedMarkdownPane.displayName = 'FormattedMarkdownPane';
