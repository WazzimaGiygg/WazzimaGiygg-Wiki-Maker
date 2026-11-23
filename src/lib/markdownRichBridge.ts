import type {
  Blockquote,
  Code,
  Delete,
  Emphasis,
  Heading,
  Html,
  Image,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  Root,
  RootContent,
  Strong,
  Table,
  TableCell,
  TableRow,
  Text,
} from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { toWikiSlug } from './markdownUtils';

const WIKI_BLOCK_REGEX =
  /(^:::(?:infobox|predefinicao)(?:[ \t]+[a-zA-Z0-9_-]+)?[ \t]*\r?\n[\s\S]*?^:::[ \t]*$)/gm;

const REF_TAG_REGEX =
  /<ref(?:\s+name\s*=\s*(?:"[^"]*"|'[^']*'|[^\s/>]+))?\s*(?:\/>|>[\s\S]*?<\/ref>)/gi;

const NOINCLUDE_TAG_REGEX = /<\/?(?:noinclude|includeonly|onlyinclude)\s*>/gi;

interface ProtectedWikiToken {
  raw: string;
  kind: 'infobox' | 'template' | 'ref' | 'wikilink' | 'directive';
  label: string;
  slug?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeSafeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '#';
  if (/^(javascript|vbscript|data:text\/html):/i.test(trimmed)) {
    return '#';
  }
  return trimmed;
}

function summarizeWikiToken(raw: string, kind: ProtectedWikiToken['kind']): string {
  if (kind === 'infobox') {
    const typeMatch = raw.match(/^:::(?:infobox|predefinicao)\s+([a-zA-Z0-9_-]+)/i);
    const titleMatch = raw.match(/^(?:title|t[ií]tulo|name|nome)\s*:\s*(.+)$/im);
    const titlePart = titleMatch?.[1]?.trim();
    const typePart = typeMatch?.[1]?.trim() || 'infobox';
    return titlePart ? `Infobox (${typePart}): ${titlePart}` : `Infobox (${typePart})`;
  }
  if (kind === 'template') {
    const inner = raw.slice(2, -2).trim();
    const name = inner.split('|')[0]?.trim() || 'Predefinição';
    return `{{${name}${inner.includes('|') ? '|...' : ''}}}`;
  }
  if (kind === 'ref') {
    const nameMatch = raw.match(/name\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s/>]+))/i);
    const refName = nameMatch?.[1] ?? nameMatch?.[2] ?? nameMatch?.[3];
    return refName ? `<ref name="${refName}">` : '<ref> citação';
  }
  return raw;
}

function replaceBalancedTemplates(
  segment: string,
  createToken: (token: Omit<ProtectedWikiToken, 'label'> & { label?: string }) => string
): string {
  let out = '';
  let i = 0;
  while (i < segment.length) {
    if (segment[i] === '{' && segment[i + 1] === '{' && segment[i + 2] !== '{') {
      let depth = 1;
      let j = i + 2;
      while (j < segment.length && depth > 0) {
        if (segment[j] === '{' && segment[j + 1] === '{') {
          depth += 1;
          j += 2;
        } else if (segment[j] === '}' && segment[j + 1] === '}') {
          depth -= 1;
          j += 2;
        } else {
          j += 1;
        }
      }
      if (depth === 0) {
        const raw = segment.slice(i, j);
        out += createToken({ raw, kind: 'template' });
        i = j;
        continue;
      }
    }
    out += segment[i];
    i += 1;
  }
  return out;
}

function protectWikiConstructs(markdown: string): {
  protectedMarkdown: string;
  tokens: Map<string, ProtectedWikiToken>;
} {
  const tokens = new Map<string, ProtectedWikiToken>();
  let counter = 0;

  const createToken = (
    data: Omit<ProtectedWikiToken, 'label'> & { label?: string }
  ): string => {
    counter += 1;
    const id = `@@WIKITOKEN_${counter}@@`;
    tokens.set(id, {
      ...data,
      label: data.label ?? summarizeWikiToken(data.raw, data.kind),
    });
    return id;
  };

  // Split by fenced code blocks and inline code so code samples stay literal
  const codeParts = markdown.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g);
  const protectedMarkdown = codeParts
    .map((segment, index) => {
      if (index % 2 === 1) return segment;

      // 1. Protect :::infobox ... ::: blocks
      let next = segment.replace(WIKI_BLOCK_REGEX, (match) =>
        createToken({ raw: match, kind: 'infobox' })
      );

      // 2. Protect <ref>...</ref> and <ref name="..." />
      next = next.replace(REF_TAG_REGEX, (match) =>
        createToken({ raw: match, kind: 'ref' })
      );

      // 3. Protect <noinclude>, <includeonly>, <onlyinclude>
      next = next.replace(NOINCLUDE_TAG_REGEX, (match) =>
        createToken({ raw: match, kind: 'directive', label: match })
      );

      // 4. Protect MediaWiki {{...}} blocks/templates
      next = replaceBalancedTemplates(next, createToken);

      // 5. Protect [[slug]] and [[slug|Label]]
      next = next.replace(
        /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g,
        (match, rawSlug: string, rawLabel?: string) => {
          const slug = toWikiSlug(rawSlug) || rawSlug.trim();
          const label = (rawLabel ?? rawSlug).trim();
          return createToken({
            raw: match,
            kind: 'wikilink',
            slug,
            label,
          });
        }
      );

      return next;
    })
    .join('');

  return { protectedMarkdown, tokens };
}

function renderProtectedTokenHtml(
  token: ProtectedWikiToken,
  asBlock: boolean
): string {
  const encodedRaw = encodeURIComponent(token.raw);

  if (token.kind === 'wikilink') {
    const safeSlug = escapeHtml(token.slug || 'start');
    const safeLabel = escapeHtml(token.label || token.slug || 'link');
    return `<a href="https://wiki.internal/${safeSlug}" data-wiki-slug="${safeSlug}" class="wiki-rich-wikilink">${safeLabel}</a>`;
  }

  const safeLabel = escapeHtml(token.label);
  if (asBlock || token.kind === 'infobox') {
    return `<div contenteditable="false" data-wiki-raw="${encodedRaw}" data-wiki-kind="${token.kind}" class="wiki-rich-token-block" title="Bloco wiki preservado — edite no modo Código ou substitua">${safeLabel}</div>`;
  }

  return `<span contenteditable="false" data-wiki-raw="${encodedRaw}" data-wiki-kind="${token.kind}" class="wiki-rich-token-inline" title="Elemento wiki preservado (${safeLabel})">${safeLabel}</span>`;
}

function renderTextWithTokens(
  text: string,
  tokens: Map<string, ProtectedWikiToken>
): string {
  const parts = text.split(/(@@WIKITOKEN_\d+@@)/g);
  return parts
    .map((part) => {
      const token = tokens.get(part);
      if (token) {
        return renderProtectedTokenHtml(token, false);
      }
      return escapeHtml(part);
    })
    .join('');
}

function renderInlineNodes(
  nodes: RootContent[],
  tokens: Map<string, ProtectedWikiToken>
): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return renderTextWithTokens((node as Text).value, tokens);
        case 'strong':
          return `<strong>${renderInlineNodes((node as Strong).children as RootContent[], tokens)}</strong>`;
        case 'emphasis':
          return `<em>${renderInlineNodes((node as Emphasis).children as RootContent[], tokens)}</em>`;
        case 'delete':
          return `<del>${renderInlineNodes((node as Delete).children as RootContent[], tokens)}</del>`;
        case 'inlineCode':
          return `<code>${escapeHtml((node as InlineCode).value)}</code>`;
        case 'break':
          return '<br />';
        case 'link': {
          const link = node as Link;
          const href = escapeHtml(sanitizeSafeUrl(link.url));
          const inner = renderInlineNodes(link.children as RootContent[], tokens);
          return `<a href="${href}">${inner || href}</a>`;
        }
        case 'image': {
          const img = node as Image;
          const src = escapeHtml(sanitizeSafeUrl(img.url));
          const alt = escapeHtml(img.alt ?? '');
          return `<img src="${src}" alt="${alt}" />`;
        }
        case 'html': {
          const raw = (node as Html).value;
          if (/^<br\s*\/?>$/i.test(raw.trim())) {
            return '<br />';
          }
          return `<span contenteditable="false" data-wiki-raw="${encodeURIComponent(raw)}" data-wiki-kind="directive" class="wiki-rich-token-inline">${escapeHtml(raw.trim())}</span>`;
        }
        default:
          return '';
      }
    })
    .join('');
}

function renderBlockNodes(
  nodes: RootContent[],
  tokens: Map<string, ProtectedWikiToken>
): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'heading': {
          const heading = node as Heading;
          const depth = Math.min(6, Math.max(1, heading.depth));
          const inner = renderInlineNodes(heading.children as RootContent[], tokens);
          return `<h${depth}>${inner || '<br />'}</h${depth}>`;
        }
        case 'paragraph': {
          const para = node as Paragraph;
          if (
            para.children.length === 1 &&
            para.children[0].type === 'text'
          ) {
            const singleVal = (para.children[0] as Text).value.trim();
            const singleToken = tokens.get(singleVal);
            if (singleToken && singleToken.kind === 'infobox') {
              return renderProtectedTokenHtml(singleToken, true);
            }
          }
          const inner = renderInlineNodes(para.children as RootContent[], tokens);
          return `<p>${inner || '<br />'}</p>`;
        }
        case 'blockquote': {
          const quote = node as Blockquote;
          const inner = renderBlockNodes(quote.children as RootContent[], tokens);
          return `<blockquote>${inner}</blockquote>`;
        }
        case 'list': {
          const list = node as List;
          const tag = list.ordered ? 'ol' : 'ul';
          const startAttr =
            list.ordered && list.start && list.start !== 1
              ? ` start="${list.start}"`
              : '';
          const isTaskList = list.children.some(
            (item) => typeof item.checked === 'boolean'
          );
          const taskAttr = isTaskList ? ' data-task-list="true"' : '';
          const itemsHtml = list.children
            .map((item) => renderListItemHtml(item, tokens))
            .join('');
          return `<${tag}${startAttr}${taskAttr}>${itemsHtml}</${tag}>`;
        }
        case 'code': {
          const code = node as Code;
          const langAttr = code.lang
            ? ` data-lang="${escapeHtml(code.lang)}"`
            : '';
          return `<pre${langAttr}><code>${escapeHtml(code.value)}</code></pre>`;
        }
        case 'thematicBreak':
          return '<hr />';
        case 'table': {
          const table = node as Table;
          const rows = table.children as TableRow[];
          if (rows.length === 0) return '';
          const headerRow = rows[0];
          const bodyRows = rows.slice(1);
          const renderRow = (row: TableRow, isHeader: boolean) => {
            const cellTag = isHeader ? 'th' : 'td';
            const cells = (row.children as TableCell[])
              .map((cell, idx) => {
                const align = table.align?.[idx];
                const alignAttr = align ? ` data-align="${align}"` : '';
                const inner = renderInlineNodes(
                  cell.children as RootContent[],
                  tokens
                );
                return `<${cellTag}${alignAttr}>${inner || '<br />'}</${cellTag}>`;
              })
              .join('');
            return `<tr>${cells}</tr>`;
          };
          const headHtml = `<thead>${renderRow(headerRow, true)}</thead>`;
          const bodyHtml =
            bodyRows.length > 0
              ? `<tbody>${bodyRows.map((r) => renderRow(r, false)).join('')}</tbody>`
              : '';
          return `<table>${headHtml}${bodyHtml}</table>`;
        }
        case 'html': {
          const raw = (node as Html).value;
          return `<div contenteditable="false" data-wiki-raw="${encodeURIComponent(raw)}" data-wiki-kind="directive" class="wiki-rich-token-block">${escapeHtml(raw.trim())}</div>`;
        }
        default:
          return '';
      }
    })
    .join('');
}

function renderListItemHtml(
  item: ListItem,
  tokens: Map<string, ProtectedWikiToken>
): string {
  const isTask = typeof item.checked === 'boolean';
  const taskAttr = isTask ? ' data-task-item="true"' : '';
  const checkboxHtml = isTask
    ? `<input type="checkbox"${item.checked ? ' checked' : ''} /> `
    : '';

  const children = item.children as RootContent[];
  const innerParts: string[] = [];

  children.forEach((child, index) => {
    if (child.type === 'paragraph') {
      const inline = renderInlineNodes(
        (child as Paragraph).children as RootContent[],
        tokens
      );
      if (index === 0) {
        innerParts.push(inline);
      } else {
        innerParts.push(`<p>${inline}</p>`);
      }
    } else if (child.type === 'list') {
      innerParts.push(renderBlockNodes([child], tokens));
    } else {
      innerParts.push(renderBlockNodes([child], tokens));
    }
  });

  return `<li${taskAttr}>${checkboxHtml}${innerParts.join('') || '<br />'}</li>`;
}

const mdParser = unified().use(remarkParse).use(remarkGfm);

/**
 * Converts Wiki Markdown/Wikitext source into clean semantic HTML for the
 * interactive Formatted (WYSIWYG) editor pane while preserving Infoboxes,
 * MediaWiki templates, `<ref>` citations, and `[[wikilinks]]`.
 */
export function markdownToEditorHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) {
    return '<p><br /></p>';
  }
  const { protectedMarkdown, tokens } = protectWikiConstructs(markdown);
  const tree = mdParser.parse(protectedMarkdown) as Root;
  const html = renderBlockNodes(tree.children, tokens);
  return html || '<p><br /></p>';
}

/**
 * Converts a single raw Wiki snippet (such as an Infobox block, MediaWiki
 * template, or `<ref>` citation) into its visual editor HTML representation.
 */
export function wikiSnippetToEditorHtml(snippet: string): string {
  const { protectedMarkdown, tokens } = protectWikiConstructs(snippet);
  const single = tokens.get(protectedMarkdown.trim());
  if (single) {
    return renderProtectedTokenHtml(single, single.kind === 'infobox');
  }
  const tree = mdParser.parse(protectedMarkdown) as Root;
  return renderBlockNodes(tree.children, tokens);
}

// ============================================================================
// DOM -> Markdown Serializer
// ============================================================================

function decodeWikiRaw(el: HTMLElement): string | null {
  const rawAttr = el.getAttribute('data-wiki-raw');
  if (!rawAttr) return null;
  try {
    return decodeURIComponent(rawAttr);
  } catch {
    return rawAttr;
  }
}

function serializeInlineCode(text: string): string {
  if (!text) return '``';
  const runs = text.match(/`+/g) ?? [];
  const maxRun = runs.reduce((acc, r) => Math.max(acc, r.length), 0);
  const fence = '`'.repeat(maxRun + 1);
  const needsPad = text.startsWith('`') || text.endsWith('`');
  return needsPad ? `${fence} ${text} ${fence}` : `${fence}${text}${fence}`;
}

function serializeInlineChildren(node: Node): string {
  let out = '';
  node.childNodes.forEach((child) => {
    out += serializeInlineNode(child);
  });
  return out;
}

function serializeInlineNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').replace(/\u00a0/g, ' ');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const rawToken = decodeWikiRaw(el);
  if (rawToken !== null) {
    return rawToken;
  }

  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case 'br':
      return '\n';
    case 'strong':
    case 'b': {
      const inner = serializeInlineChildren(el);
      return inner.trim() ? `**${inner}**` : inner;
    }
    case 'em':
    case 'i': {
      const inner = serializeInlineChildren(el);
      return inner.trim() ? `*${inner}*` : inner;
    }
    case 'del':
    case 's':
    case 'strike': {
      const inner = serializeInlineChildren(el);
      return inner.trim() ? `~~${inner}~~` : inner;
    }
    case 'code': {
      const text = (el.textContent ?? '').replace(/\u00a0/g, ' ');
      return serializeInlineCode(text);
    }
    case 'a': {
      const wikiSlug = el.getAttribute('data-wiki-slug');
      const inner = serializeInlineChildren(el).trim();
      if (wikiSlug) {
        return inner && inner !== wikiSlug
          ? `[[${wikiSlug}|${inner}]]`
          : `[[${wikiSlug}]]`;
      }
      const href = (el.getAttribute('href') || '').trim();
      if (href.startsWith('https://wiki.internal/')) {
        const extractedSlug = href.slice('https://wiki.internal/'.length);
        return inner && inner !== extractedSlug
          ? `[[${extractedSlug}|${inner}]]`
          : `[[${extractedSlug}]]`;
      }
      return `[${inner || href}](${href || 'https://exemplo.com'})`;
    }
    case 'img': {
      const src = el.getAttribute('src') || '';
      const alt = el.getAttribute('alt') || '';
      return src ? `![${alt}](${src})` : '';
    }
    case 'input':
      return '';
    default:
      return serializeInlineChildren(el);
  }
}

function serializeListElement(
  listEl: HTMLElement,
  ordered: boolean,
  depth: number
): string {
  const startAttr = ordered ? Number(listEl.getAttribute('start') || '1') : 1;
  let index = Number.isFinite(startAttr) && startAttr > 0 ? startAttr : 1;
  const indent = '  '.repeat(depth);
  const lines: string[] = [];

  Array.from(listEl.children).forEach((child) => {
    if (child.tagName.toLowerCase() !== 'li') return;
    const li = child as HTMLElement;
    const checkbox = li.querySelector(':scope > input[type="checkbox"]') as HTMLInputElement | null;

    let marker = ordered ? `${index}. ` : '- ';
    if (checkbox) {
      marker = checkbox.checked ? '- [x] ' : '- [ ] ';
    } else if (ordered) {
      index += 1;
    }

    const nestedLists: string[] = [];
    let inlineText = '';

    li.childNodes.forEach((liChild) => {
      if (liChild.nodeType === Node.ELEMENT_NODE) {
        const childEl = liChild as HTMLElement;
        const childTag = childEl.tagName.toLowerCase();
        if (childTag === 'input') return;
        if (childTag === 'ul') {
          nestedLists.push(serializeListElement(childEl, false, depth + 1));
          return;
        }
        if (childTag === 'ol') {
          nestedLists.push(serializeListElement(childEl, true, depth + 1));
          return;
        }
        if (childTag === 'p') {
          const text = serializeInlineChildren(childEl).trim();
          if (text) {
            inlineText += inlineText ? `\n${indent}  ${text}` : text;
          }
          return;
        }
      }
      inlineText += serializeInlineNode(liChild);
    });

    const cleanedInline = inlineText.replace(/\n+$/g, '').trim();
    lines.push(`${indent}${marker}${cleanedInline}`);
    for (const nested of nestedLists) {
      if (nested.trim()) {
        lines.push(nested.replace(/\n+$/g, ''));
      }
    }
  });

  return lines.join('\n') + (depth === 0 ? '\n\n' : '');
}

function serializeTableElement(tableEl: HTMLElement): string {
  const allRows = Array.from(tableEl.querySelectorAll('tr'));
  if (allRows.length === 0) return '';

  const matrix: string[][] = [];
  let maxCols = 0;

  allRows.forEach((tr) => {
    const cells = Array.from(tr.children).filter((c) => {
      const t = c.tagName.toLowerCase();
      return t === 'th' || t === 'td';
    });
    const rowValues = cells.map((cell) =>
      serializeInlineChildren(cell)
        .replace(/\n+/g, ' ')
        .replace(/\|/g, '\\|')
        .trim()
    );
    maxCols = Math.max(maxCols, rowValues.length);
    matrix.push(rowValues);
  });

  if (maxCols === 0) return '';

  const normalizeRow = (row: string[]) => {
    const padded = [...row];
    while (padded.length < maxCols) padded.push('');
    return `| ${padded.join(' | ')} |`;
  };

  const firstTr = allRows[0];
  const headerCells = Array.from(firstTr.children);
  const separator = `| ${Array.from({ length: maxCols }, (_, idx) => {
    const align = (headerCells[idx] as HTMLElement | undefined)?.getAttribute('data-align');
    if (align === 'center') return ':---:';
    if (align === 'right') return '---:';
    return '---';
  }).join(' | ')} |`;

  const lines = [
    normalizeRow(matrix[0]),
    separator,
    ...matrix.slice(1).map(normalizeRow),
  ];

  return `${lines.join('\n')}\n\n`;
}

function serializeBlockNodes(container: Node): string {
  let result = '';
  let inlineBuffer = '';

  const flushInlineBuffer = () => {
    const trimmed = inlineBuffer.replace(/\u00a0/g, ' ').replace(/\n+$/g, '');
    if (trimmed.trim()) {
      result += `${trimmed}\n\n`;
    }
    inlineBuffer = '';
  };

  container.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      inlineBuffer += node.textContent ?? '';
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const el = node as HTMLElement;
    const rawToken = decodeWikiRaw(el);
    if (rawToken !== null) {
      const isBlockToken =
        el.tagName.toLowerCase() === 'div' ||
        el.getAttribute('data-wiki-kind') === 'infobox';
      if (isBlockToken) {
        flushInlineBuffer();
        result += `${rawToken}\n\n`;
      } else {
        inlineBuffer += rawToken;
      }
      return;
    }

    const tag = el.tagName.toLowerCase();

    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        flushInlineBuffer();
        const level = Number(tag[1]);
        const text = serializeInlineChildren(el).replace(/\n+/g, ' ').trim();
        if (text) {
          result += `${'#'.repeat(level)} ${text}\n\n`;
        }
        break;
      }
      case 'p':
      case 'div': {
        flushInlineBuffer();
        // Check if div contains block elements
        const hasBlockChildren = Array.from(el.children).some((c) =>
          ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'pre', 'table', 'hr'].includes(
            c.tagName.toLowerCase()
          )
        );
        if (hasBlockChildren) {
          result += serializeBlockNodes(el);
        } else {
          const text = serializeInlineChildren(el)
            .replace(/^\n+|\n+$/g, '')
            .trimEnd();
          if (text.trim()) {
            result += `${text}\n\n`;
          }
        }
        break;
      }
      case 'blockquote': {
        flushInlineBuffer();
        const inner = serializeBlockNodes(el).trim();
        if (inner) {
          const quoted = inner
            .split('\n')
            .map((line) => (line.trim() ? `> ${line}` : '>'))
            .join('\n');
          result += `${quoted}\n\n`;
        }
        break;
      }
      case 'ul': {
        flushInlineBuffer();
        result += serializeListElement(el, false, 0);
        break;
      }
      case 'ol': {
        flushInlineBuffer();
        result += serializeListElement(el, true, 0);
        break;
      }
      case 'pre': {
        flushInlineBuffer();
        const lang = (el.getAttribute('data-lang') || '').trim();
        const codeEl = el.querySelector('code');
        const codeText = (codeEl ? codeEl.textContent : el.textContent) ?? '';
        const cleaned = codeText.replace(/\u00a0/g, ' ').replace(/\n+$/g, '');
        const fence = cleaned.includes('```') ? '~~~~' : '```';
        result += `${fence}${lang}\n${cleaned}\n${fence}\n\n`;
        break;
      }
      case 'table': {
        flushInlineBuffer();
        result += serializeTableElement(el);
        break;
      }
      case 'hr': {
        flushInlineBuffer();
        result += '---\n\n';
        break;
      }
      default: {
        inlineBuffer += serializeInlineNode(el);
        break;
      }
    }
  });

  flushInlineBuffer();
  return result;
}

/**
 * Serializes the Formatted WYSIWYG editor DOM back into clean Wiki Markdown.
 */
export function editorElementToMarkdown(root: HTMLElement): string {
  const raw = serializeBlockNodes(root);
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
