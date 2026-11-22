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

  // 3. {{Em construção}} / {{WIP}}
  if (key === 'em construcao' || key === 'wip' || key === 'construcao' || key === 'manutencao') {
    const note = pickParam(call, ['texto', 'nota', '1']);
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

export const STARTER_TEMPLATE_SLUG = 'predefinicao-boas-vindas';
export const STARTER_TEMPLATE_TITLE = 'Predefinição:Boas-vindas';
export const STARTER_TEMPLATE_CATEGORY = 'reference';
export const STARTER_TEMPLATE_TAGS = ['predefinicao', 'template', 'mediawiki', 'onboarding'];
export const STARTER_TEMPLATE_SUMMARY =
  'Reusable MediaWiki-style community welcome template with parameter substitution';
export const STARTER_TEMPLATE_CONTENT = `<noinclude>
This page defines a reusable **MediaWiki-style Predefinição** (\`{{Predefinição:Boas-vindas}}\` or \`{{Boas-vindas|nome=...}}\`). Anything inside \`<noinclude>\` appears only here as template documentation, while content outside \`<noinclude>\` is transcluded into articles.

## How to use

\`\`\`markdown
{{Predefinição:Boas-vindas|colaborador=WazzimaGiygg|tema=Documentação Aberta}}
\`\`\`

## Example output

</noinclude>{{Aviso|tipo=sucesso|título=Welcome, {{{colaborador|Collaborator}}}!|texto=Thank you for contributing to {{{tema|WazzimaGiygg Maker}}}. Check the [[markdown-guide|Markdown & Templates Guide]] or explore [[ecossistema-wazzimagiygg|WazzimaGiygg Ecosystem Products]].}}`;
