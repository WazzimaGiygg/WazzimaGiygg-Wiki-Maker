import { jsPDF } from 'jspdf';
import type {
  Blockquote,
  Code,
  Heading,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Table,
  TableCell,
} from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type { WikiPage } from '../types/wiki';
import {
  extractArticleReferences,
  formatRelativeTime,
  parseMarkdownWithInfoboxes,
  preprocessWikiLinks,
  type InfoboxBlock,
  type InfoboxType,
  type PredefinicaoBlock,
  type WikiReferenceItem,
} from './markdownUtils';
import { expandTemplatesInWikitext } from '../services/templateService';

import {
  DEFAULT_WIKI_THEME_ID,
  getWikiThemeById,
  type WikiThemeDefinition,
} from './wikiThemes';

export interface ExportArticlePdfOptions {
  page: WikiPage;
  wikiPages?: WikiPage[];
  categoryLabel: string;
  siteTitle: string;
  isDark: boolean;
  theme?: WikiThemeDefinition;
  existingSlugs: Set<string>;
  enableReferences?: boolean;
  referencesTitle?: string;
  enableInfoboxes?: boolean;
  autoUserInfobox?: InfoboxBlock | null;
}

type Rgb = [number, number, number];

interface PdfThemePalette {
  isDark: boolean;
  pageBg: Rgb;
  surfaceBg: Rgb;
  chipBg: Rgb;
  blockquoteBg: Rgb;
  codeBlockBg: Rgb;
  codeBlockText: Rgb;
  codeBlockBorder: Rgb;
  heading: Rgb;
  body: Rgb;
  muted: Rgb;
  border: Rgb;
  accent: Rgb;
  missingLink: Rgb;
  infoboxHeaders: Record<InfoboxType, { bg: Rgb; border: Rgb; label: Rgb }>;
}

const LIGHT_THEME: PdfThemePalette = {
  isDark: false,
  pageBg: [255, 255, 255],
  surfaceBg: [248, 250, 252],
  chipBg: [241, 245, 249],
  blockquoteBg: [248, 250, 252],
  codeBlockBg: [15, 23, 42],
  codeBlockText: [226, 232, 240],
  codeBlockBorder: [226, 232, 240],
  heading: [15, 23, 42],
  body: [30, 41, 59],
  muted: [100, 116, 139],
  border: [226, 232, 240],
  accent: [29, 78, 216],
  missingLink: [146, 64, 14],
  infoboxHeaders: {
    general: { bg: [241, 245, 249], border: [226, 232, 240], label: [71, 85, 105] },
    user: { bg: [240, 249, 255], border: [186, 230, 253], label: [7, 89, 133] },
    character: { bg: [239, 246, 255], border: [191, 219, 254], label: [30, 64, 175] },
    location: { bg: [236, 253, 245], border: [167, 243, 208], label: [6, 95, 70] },
    item: { bg: [255, 251, 235], border: [253, 230, 138], label: [146, 64, 14] },
    organization: { bg: [255, 241, 242], border: [254, 205, 211], label: [159, 18, 57] },
    project: { bg: [238, 242, 255], border: [199, 210, 254], label: [55, 48, 163] },
  },
};

const DARK_THEME: PdfThemePalette = {
  isDark: true,
  pageBg: [15, 22, 35],
  surfaceBg: [11, 15, 23],
  chipBg: [30, 41, 59],
  blockquoteBg: [17, 24, 39],
  codeBlockBg: [7, 10, 16],
  codeBlockText: [226, 232, 240],
  codeBlockBorder: [30, 41, 59],
  heading: [248, 250, 252],
  body: [203, 213, 225],
  muted: [148, 163, 184],
  border: [30, 41, 59],
  accent: [96, 165, 250],
  missingLink: [251, 191, 36],
  infoboxHeaders: {
    general: { bg: [30, 41, 59], border: [51, 65, 85], label: [203, 213, 225] },
    user: { bg: [12, 45, 72], border: [12, 74, 110], label: [125, 211, 252] },
    character: { bg: [23, 37, 84], border: [30, 58, 138], label: [147, 197, 253] },
    location: { bg: [6, 55, 41], border: [6, 78, 59], label: [110, 231, 183] },
    item: { bg: [69, 26, 3], border: [120, 53, 15], label: [252, 211, 77] },
    organization: { bg: [76, 5, 25], border: [136, 19, 55], label: [253, 164, 175] },
    project: { bg: [30, 27, 75], border: [49, 46, 129], label: [165, 180, 252] },
  },
};

const INFOBOX_LABELS: Record<InfoboxType, string> = {
  general: 'GENERAL INFO',
  user: 'COLLABORATOR',
  character: 'CHARACTER',
  location: 'LOCATION',
  item: 'ITEM / ARTIFACT',
  organization: 'ORGANIZATION',
  project: 'PROJECT / SYSTEM',
};

const PAGE_WIDTH = 595.28; // A4 pt
const PAGE_HEIGHT = 841.89; // A4 pt
const MARGIN_X = 46;
const MARGIN_TOP = 46;
const MARGIN_BOTTOM = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const MAX_Y = PAGE_HEIGHT - MARGIN_BOTTOM;

const WIN_ANSI_PUNCT_MAP: Record<string, string> = {
  '\u2014': '\u2014',
  '\u2013': '\u2013',
  '\u2018': '\u2018',
  '\u2019': '\u2019',
  '\u201c': '\u201c',
  '\u201d': '\u201d',
  '\u2022': '\u2022',
  '\u2026': '\u2026',
  '\u20ac': '\u20ac',
  '\u2122': '\u2122',
  '\u2192': '->',
  '\u2190': '<-',
  '\u2191': '^',
  '\u2193': 'v',
  '\u2713': '[x]',
  '\u2714': '[x]',
  '\u2717': '[ ]',
  '\u2610': '[ ]',
  '\u2611': '[x]',
  '\u00a0': ' ',
};

function toPdfSafeText(input: string): string {
  let out = '';
  for (const ch of input) {
    if (ch === '\u200b' || ch === '\ufeff') continue;
    if (WIN_ANSI_PUNCT_MAP[ch] !== undefined) {
      out += WIN_ANSI_PUNCT_MAP[ch];
      continue;
    }
    const code = ch.charCodeAt(0);
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) {
      out += ch;
    } else if (ch === '\n' || ch === '\r' || ch === '\t') {
      out += ch === '\t' ? '  ' : ch;
    } else {
      const decomposed = ch.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
      for (const d of decomposed) {
        const dc = d.charCodeAt(0);
        if ((dc >= 0x20 && dc <= 0x7e) || (dc >= 0xa0 && dc <= 0xff)) {
          out += d;
        }
      }
    }
  }
  return out;
}

interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
  linkUrl?: string;
  isMissingWikiLink?: boolean;
  isSup?: boolean;
  color?: Rgb;
}

interface StyledToken {
  text: string;
  isSpace: boolean;
  font: 'helvetica' | 'courier';
  fontStyle: 'normal' | 'bold' | 'italic' | 'bolditalic';
  fontSize: number;
  color: Rgb;
  codeBg: boolean;
  strike: boolean;
  underline: boolean;
  linkUrl?: string;
  yOffset: number;
}

interface LaidOutLine {
  tokens: Array<StyledToken & { width: number }>;
  height: number;
  endedWithNewline?: boolean;
  justifyWidth?: number;
}

function buildLinkDestination(slug: string): string {
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}${window.location.pathname}#/page/${slug}`;
  }
  return `#/page/${slug}`;
}

function parseMarkdownAst(markdown: string): Root {
  return unified().use(remarkParse).use(remarkGfm).parse(markdown);
}

function collectInlineRuns(
  nodes: PhrasingContent[],
  existingSlugs: Set<string>,
  inherited: Omit<InlineRun, 'text'> = {}
): InlineRun[] {
  const runs: InlineRun[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case 'text': {
        if (node.value) {
          runs.push({ ...inherited, text: node.value });
        }
        break;
      }
      case 'strong': {
        runs.push(...collectInlineRuns(node.children, existingSlugs, { ...inherited, bold: true }));
        break;
      }
      case 'emphasis': {
        runs.push(
          ...collectInlineRuns(node.children, existingSlugs, { ...inherited, italic: true })
        );
        break;
      }
      case 'delete': {
        runs.push(
          ...collectInlineRuns(node.children, existingSlugs, { ...inherited, strike: true })
        );
        break;
      }
      case 'inlineCode': {
        if (node.value) {
          runs.push({ ...inherited, text: node.value, code: true });
        }
        break;
      }
      case 'break': {
        runs.push({ ...inherited, text: '\n' });
        break;
      }
      case 'link': {
        const href = node.url || '';
        if (href.startsWith('https://wiki.ref/')) {
          const refPath = href.replace('https://wiki.ref/', '');
          const slashIdx = refPath.indexOf('/');
          const refNum = slashIdx === -1 ? refPath : refPath.slice(0, slashIdx);
          runs.push({
            ...inherited,
            text: `[${refNum}]`,
            bold: true,
            isSup: true,
          });
        } else if (href.startsWith('https://wiki.internal/')) {
          const targetSlug = href.replace('https://wiki.internal/', '');
          const exists = existingSlugs.has(targetSlug);
          runs.push(
            ...collectInlineRuns(node.children, existingSlugs, {
              ...inherited,
              linkUrl: buildLinkDestination(targetSlug),
              isMissingWikiLink: !exists,
            })
          );
        } else {
          runs.push(
            ...collectInlineRuns(node.children, existingSlugs, {
              ...inherited,
              linkUrl: href || undefined,
            })
          );
        }
        break;
      }
      case 'image': {
        const label = node.alt?.trim() || 'Image';
        runs.push({
          ...inherited,
          text: `[${label}]`,
          linkUrl: node.url || undefined,
          italic: true,
        });
        break;
      }
      case 'html': {
        const stripped = node.value.replace(/<[^>]+>/g, '').trim();
        if (stripped) {
          runs.push({ ...inherited, text: stripped });
        }
        break;
      }
      default: {
        if ('children' in node && Array.isArray((node as { children?: PhrasingContent[] }).children)) {
          runs.push(
            ...collectInlineRuns(
              (node as { children: PhrasingContent[] }).children,
              existingSlugs,
              inherited
            )
          );
        }
      }
    }
  }

  return runs;
}

async function fetchImageAsPngDataUrl(
  url: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const trimmed = url.trim();
  if (
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('/assets/')
  ) {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    let settled = false;

    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, 3500);

    img.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        const naturalW = img.naturalWidth || 400;
        const naturalH = img.naturalHeight || 240;
        const canvas = document.createElement('canvas');
        canvas.width = naturalW;
        canvas.height = naturalH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        resolve({ dataUrl, width: naturalW, height: naturalH });
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(null);
    };

    img.src = trimmed;
  });
}

class WikiPdfWriter {
  readonly doc: jsPDF;
  readonly theme: PdfThemePalette;
  readonly existingSlugs: Set<string>;
  y = MARGIN_TOP;

  constructor(theme: PdfThemePalette, existingSlugs: Set<string>) {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      compress: true,
    });
    this.theme = theme;
    this.existingSlugs = existingSlugs;
    this.paintPageBackground();
  }

  paintPageBackground(): void {
    this.doc.setFillColor(...this.theme.pageBg);
    this.doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
  }

  nextPage(): void {
    this.doc.addPage();
    this.paintPageBackground();
    this.y = MARGIN_TOP;
  }

  ensureSpace(requiredHeight: number): void {
    if (this.y + requiredHeight > MAX_Y && this.y > MARGIN_TOP + 4) {
      this.nextPage();
    }
  }

  private measureToken(token: StyledToken): number {
    this.doc.setFont(token.font, token.fontStyle);
    this.doc.setFontSize(token.fontSize);
    const w = this.doc.getTextWidth(token.text);
    return token.codeBg ? w + 6 : w;
  }

  private runsToTokens(
    runs: InlineRun[],
    baseFontSize: number,
    baseColor: Rgb,
    baseBold = false,
    baseItalic = false
  ): Array<StyledToken | { newline: true }> {
    const out: Array<StyledToken | { newline: true }> = [];

    for (const run of runs) {
      const safe = toPdfSafeText(run.text);
      if (!safe) continue;

      const isCode = Boolean(run.code);
      const isBold = Boolean(run.bold || baseBold);
      const isItalic = Boolean(run.italic || baseItalic);
      const font: 'helvetica' | 'courier' = isCode ? 'courier' : 'helvetica';
      const fontStyle: StyledToken['fontStyle'] = isCode
        ? isBold
          ? 'bold'
          : 'normal'
        : isBold && isItalic
        ? 'bolditalic'
        : isBold
        ? 'bold'
        : isItalic
        ? 'italic'
        : 'normal';

      const fontSize = run.isSup
        ? Math.max(7, baseFontSize * 0.72)
        : isCode
        ? Math.max(8, baseFontSize * 0.88)
        : baseFontSize;

      const color: Rgb = run.color
        ? run.color
        : run.isMissingWikiLink
        ? this.theme.missingLink
        : run.linkUrl || run.isSup
        ? this.theme.accent
        : isCode
        ? this.theme.heading
        : isBold && baseColor === this.theme.body
        ? this.theme.heading
        : baseColor;

      const parts = safe.split('\n');
      for (let pi = 0; pi < parts.length; pi++) {
        if (pi > 0) {
          out.push({ newline: true });
        }
        const segment = parts[pi];
        if (!segment) continue;

        if (isCode) {
          // Keep short inline code spans atomic unless very wide
          out.push({
            text: segment,
            isSpace: false,
            font,
            fontStyle,
            fontSize,
            color,
            codeBg: true,
            strike: Boolean(run.strike),
            underline: Boolean(run.linkUrl),
            linkUrl: run.linkUrl,
            yOffset: run.isSup ? -baseFontSize * 0.28 : 0,
          });
          continue;
        }

        const chunks = segment.match(/(\s+|[^\s]+)/g) ?? [];
        for (const chunk of chunks) {
          const isSpace = /^\s+$/.test(chunk);
          out.push({
            text: isSpace ? ' ' : chunk,
            isSpace,
            font,
            fontStyle,
            fontSize,
            color,
            codeBg: false,
            strike: Boolean(run.strike),
            underline: Boolean(run.linkUrl),
            linkUrl: run.linkUrl,
            yOffset: run.isSup ? -baseFontSize * 0.28 : 0,
          });
        }
      }
    }

    return out;
  }

  layoutRuns(
    runs: InlineRun[],
    maxWidth: number,
    baseFontSize: number,
    lineHeightRatio: number,
    baseColor: Rgb,
    baseBold = false,
    baseItalic = false
  ): LaidOutLine[] {
    const rawTokens = this.runsToTokens(runs, baseFontSize, baseColor, baseBold, baseItalic);
    const lineHeight = baseFontSize * lineHeightRatio;
    const lines: LaidOutLine[] = [];
    let currentLine: Array<StyledToken & { width: number }> = [];
    let currentWidth = 0;

    const pushLine = (endedWithNewline = false) => {
      while (currentLine.length > 0 && currentLine[currentLine.length - 1].isSpace) {
        currentLine.pop();
      }
      lines.push({ tokens: currentLine, height: lineHeight, endedWithNewline });
      currentLine = [];
      currentWidth = 0;
    };

    const appendToken = (tok: StyledToken) => {
      const width = this.measureToken(tok);
      if (tok.isSpace && currentLine.length === 0) {
        return;
      }

      if (!tok.isSpace && width > maxWidth) {
        if (currentLine.length > 0) {
          pushLine();
        }
        // Hard-wrap overly long unbroken token (e.g. URL)
        this.doc.setFont(tok.font, tok.fontStyle);
        this.doc.setFontSize(tok.fontSize);
        const pieces = this.doc.splitTextToSize(tok.text, Math.max(40, maxWidth - 8)) as string[];
        for (let idx = 0; idx < pieces.length; idx++) {
          const pieceTok: StyledToken = { ...tok, text: pieces[idx], codeBg: false };
          const pw = this.measureToken(pieceTok);
          currentLine.push({ ...pieceTok, width: pw });
          if (idx < pieces.length - 1) {
            pushLine();
          } else {
            currentWidth = pw;
          }
        }
        return;
      }

      if (currentLine.length > 0 && currentWidth + width > maxWidth && !tok.isSpace) {
        pushLine();
      }

      if (tok.isSpace && currentLine.length === 0) {
        return;
      }

      currentLine.push({ ...tok, width });
      currentWidth += width;
    };

    for (const item of rawTokens) {
      if ('newline' in item) {
        pushLine(true);
      } else {
        appendToken(item);
      }
    }

    if (currentLine.length > 0 || lines.length === 0) {
      pushLine(true);
    }

    return lines;
  }

  drawLaidOutLine(
    line: LaidOutLine,
    xStart: number,
    baselineY: number,
    justifyWidth?: number
  ): void {
    let extraPerSpace = 0;
    const targetWidth = justifyWidth ?? line.justifyWidth;
    if (targetWidth && !line.endedWithNewline) {
      const naturalWidth = line.tokens.reduce((sum, t) => sum + t.width, 0);
      const spaceCount = line.tokens.filter((t) => t.isSpace).length;
      const deficit = targetWidth - naturalWidth;
      if (spaceCount > 0 && deficit > 0.5 && naturalWidth >= targetWidth * 0.55) {
        extraPerSpace = deficit / spaceCount;
      }
    }

    let cursorX = xStart;

    for (const tok of line.tokens) {
      this.doc.setFont(tok.font, tok.fontStyle);
      this.doc.setFontSize(tok.fontSize);

      if (tok.codeBg) {
        this.doc.setFillColor(...this.theme.chipBg);
        this.doc.roundedRect(
          cursorX,
          baselineY - tok.fontSize * 0.82,
          tok.width,
          tok.fontSize * 1.12,
          2.5,
          2.5,
          'F'
        );
      }

      this.doc.setTextColor(...tok.color);
      const textX = tok.codeBg ? cursorX + 3 : cursorX;
      const textY = baselineY + tok.yOffset;
      this.doc.text(tok.text, textX, textY);

      if (tok.underline && !tok.isSpace) {
        this.doc.setDrawColor(...tok.color);
        this.doc.setLineWidth(0.5);
        this.doc.line(textX, textY + 1.5, cursorX + tok.width - (tok.codeBg ? 3 : 0), textY + 1.5);
      }

      if (tok.strike && !tok.isSpace) {
        this.doc.setDrawColor(...tok.color);
        this.doc.setLineWidth(0.6);
        this.doc.line(textX, textY - tok.fontSize * 0.3, cursorX + tok.width, textY - tok.fontSize * 0.3);
      }

      if (tok.linkUrl && !tok.isSpace) {
        this.doc.link(
          cursorX,
          textY - tok.fontSize * 0.85,
          tok.width,
          tok.fontSize * 1.15,
          { url: tok.linkUrl }
        );
      }

      cursorX += tok.width + (tok.isSpace ? extraPerSpace : 0);
    }
  }

  renderRunsFlow(
    runs: InlineRun[],
    options: {
      x: number;
      maxWidth: number;
      fontSize?: number;
      lineHeightRatio?: number;
      color?: Rgb;
      bold?: boolean;
      italic?: boolean;
      spaceAfter?: number;
      justify?: boolean;
    }
  ): void {
    const fontSize = options.fontSize ?? 10;
    const lineHeightRatio = options.lineHeightRatio ?? 1.52;
    const color = options.color ?? this.theme.body;
    const lines = this.layoutRuns(
      runs,
      options.maxWidth,
      fontSize,
      lineHeightRatio,
      color,
      options.bold,
      options.italic
    );

    for (const line of lines) {
      this.ensureSpace(line.height);
      const baselineY = this.y + fontSize * 0.85;
      this.drawLaidOutLine(
        line,
        options.x,
        baselineY,
        options.justify ? options.maxWidth : undefined
      );
      this.y += line.height;
    }

    if (options.spaceAfter) {
      this.y += options.spaceAfter;
    }
  }

  renderHeaderSheet(opts: ExportArticlePdfOptions): void {
    const { page, categoryLabel, siteTitle } = opts;
    const leftMeta = toPdfSafeText(`wiki / ${categoryLabel.toLowerCase()} / :${page.slug}`);
    const rightMeta = toPdfSafeText(
      `v${page.version} · ${page.visibility === 'private' ? 'Private' : 'Public'}${
        page.isLocked ? ' · Locked' : ''
      } · ${siteTitle}`
    );

    this.doc.setFont('courier', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(...this.theme.muted);
    this.doc.text(leftMeta, MARGIN_X, this.y + 8);
    const rightWidth = this.doc.getTextWidth(rightMeta);
    this.doc.text(rightMeta, PAGE_WIDTH - MARGIN_X - rightWidth, this.y + 8);
    this.y += 18;

    // Article Title
    const titleLines = this.layoutRuns(
      [{ text: page.title, bold: true }],
      CONTENT_WIDTH,
      21,
      1.24,
      this.theme.heading,
      true
    );
    for (const line of titleLines) {
      this.ensureSpace(line.height);
      this.drawLaidOutLine(line, MARGIN_X, this.y + 18);
      this.y += line.height;
    }
    this.y += 4;

    // Author & tags metadata
    const tagsPart = page.tags.length > 0 ? ` · ${page.tags.map((t) => `#${t}`).join('  ')}` : '';
    const byline = toPdfSafeText(
      `Created by ${page.authorName} · Last edited by ${page.lastEditorName} · ${formatRelativeTime(
        page.updatedAt
      )}${tagsPart}`
    );
    this.renderRunsFlow([{ text: byline }], {
      x: MARGIN_X,
      maxWidth: CONTENT_WIDTH,
      fontSize: 8.5,
      lineHeightRatio: 1.4,
      color: this.theme.muted,
      spaceAfter: 8,
    });

    // Hairline divider
    this.doc.setDrawColor(...this.theme.border);
    this.doc.setLineWidth(0.75);
    this.doc.line(MARGIN_X, this.y, PAGE_WIDTH - MARGIN_X, this.y);
    this.y += 14;
  }

  async renderInfobox(infobox: InfoboxBlock): Promise<void> {
    const palette = this.theme.infoboxHeaders[infobox.type] ?? this.theme.infoboxHeaders.general;
    const boxWidth = CONTENT_WIDTH;
    const padX = 12;
    const innerWidth = boxWidth - padX * 2;

    const titleLines = this.layoutRuns(
      [{ text: infobox.title, bold: true }],
      innerWidth,
      12,
      1.3,
      this.theme.heading,
      true
    );
    const subtitleLines = infobox.subtitle
      ? this.layoutRuns([{ text: infobox.subtitle }], innerWidth, 8.5, 1.35, this.theme.muted)
      : [];

    const headerHeight =
      10 +
      11 + // type label
      titleLines.reduce((acc, l) => acc + l.height, 0) +
      subtitleLines.reduce((acc, l) => acc + l.height, 0) +
      8;

    const embeddedImage = infobox.image ? await fetchImageAsPngDataUrl(infobox.image) : null;
    let imgRenderHeight = 0;
    let imgRenderWidth = 0;
    if (embeddedImage) {
      const maxImgW = Math.min(240, innerWidth);
      const scale = Math.min(maxImgW / embeddedImage.width, 140 / embeddedImage.height, 1);
      imgRenderWidth = embeddedImage.width * scale;
      imgRenderHeight = embeddedImage.height * scale;
    }

    const keyColW = innerWidth * 0.34;
    const valColW = innerWidth - keyColW - 10;

    const precomputedRows = infobox.fields.map((field) => {
      const kLines = this.layoutRuns(
        [{ text: field.key, bold: true }],
        keyColW,
        8.5,
        1.38,
        this.theme.muted,
        true
      );
      const valAst = parseMarkdownAst(preprocessWikiLinks(field.value));
      const firstChild = valAst.children[0];
      const valRuns: InlineRun[] =
        firstChild && 'children' in firstChild
          ? collectInlineRuns(firstChild.children as PhrasingContent[], this.existingSlugs)
          : [{ text: field.value }];
      const vLines = this.layoutRuns(valRuns, valColW, 8.5, 1.38, this.theme.body);
      const rowH =
        Math.max(
          kLines.reduce((s, l) => s + l.height, 0),
          vLines.reduce((s, l) => s + l.height, 0)
        ) + 10;
      return { kLines, vLines, rowH };
    });

    const imageBlockHeight = embeddedImage ? imgRenderHeight + (infobox.imageCaption ? 26 : 16) : 0;
    const rowsHeight = precomputedRows.reduce((acc, r) => acc + r.rowH, 0);
    const totalBoxHeight = headerHeight + imageBlockHeight + Math.max(rowsHeight, 12);

    this.ensureSpace(Math.min(totalBoxHeight, MAX_Y - MARGIN_TOP - 8));

    const startY = this.y;
    const boxHeightForFirstPage = Math.min(totalBoxHeight, MAX_Y - startY);

    // Outer container surface
    this.doc.setFillColor(...this.theme.surfaceBg);
    this.doc.setDrawColor(...this.theme.border);
    this.doc.setLineWidth(0.75);
    this.doc.roundedRect(MARGIN_X, startY, boxWidth, boxHeightForFirstPage, 6, 6, 'FD');

    // Header band
    this.doc.setFillColor(...palette.bg);
    this.doc.setDrawColor(...palette.border);
    this.doc.roundedRect(MARGIN_X, startY, boxWidth, headerHeight, 6, 6, 'F');
    this.doc.line(MARGIN_X, startY + headerHeight, MARGIN_X + boxWidth, startY + headerHeight);

    let cy = startY + 10;
    this.doc.setFont('courier', 'bold');
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(...palette.label);
    this.doc.text(INFOBOX_LABELS[infobox.type] ?? 'GENERAL INFO', MARGIN_X + padX, cy + 7);
    cy += 12;

    for (const line of titleLines) {
      this.drawLaidOutLine(line, MARGIN_X + padX, cy + 10);
      cy += line.height;
    }
    for (const line of subtitleLines) {
      this.drawLaidOutLine(line, MARGIN_X + padX, cy + 7.5);
      cy += line.height;
    }

    this.y = startY + headerHeight;

    // Image block
    if (embeddedImage) {
      const imgX = MARGIN_X + (boxWidth - imgRenderWidth) / 2;
      this.doc.addImage(embeddedImage.dataUrl, 'PNG', imgX, this.y + 8, imgRenderWidth, imgRenderHeight);
      this.y += imgRenderHeight + 14;
      if (infobox.imageCaption) {
        this.renderRunsFlow([{ text: infobox.imageCaption }], {
          x: MARGIN_X + padX,
          maxWidth: innerWidth,
          fontSize: 8,
          lineHeightRatio: 1.3,
          color: this.theme.muted,
          spaceAfter: 4,
        });
      }
      this.doc.setDrawColor(...this.theme.border);
      this.doc.line(MARGIN_X, this.y, MARGIN_X + boxWidth, this.y);
    }

    // Key-value rows
    for (let i = 0; i < precomputedRows.length; i++) {
      const row = precomputedRows[i];
      if (this.y + row.rowH > MAX_Y) {
        this.nextPage();
        this.doc.setFillColor(...this.theme.surfaceBg);
        this.doc.setDrawColor(...this.theme.border);
        this.doc.rect(MARGIN_X, this.y, boxWidth, Math.min(row.rowH, MAX_Y - this.y), 'FD');
      }

      const rowStartY = this.y;
      let ky = rowStartY + 5;
      for (const kl of row.kLines) {
        this.drawLaidOutLine(kl, MARGIN_X + padX, ky + 7.5);
        ky += kl.height;
      }

      let vy = rowStartY + 5;
      for (const vl of row.vLines) {
        this.drawLaidOutLine(vl, MARGIN_X + padX + keyColW + 10, vy + 7.5);
        vy += vl.height;
      }

      this.y = rowStartY + row.rowH;
      if (i < precomputedRows.length - 1) {
        this.doc.setDrawColor(...this.theme.border);
        this.doc.setLineWidth(0.5);
        this.doc.line(MARGIN_X, this.y, MARGIN_X + boxWidth, this.y);
      }
    }

    this.y += 14;
  }

  private inlineRunsFromMarkdown(raw: string): InlineRun[] {
    const ast = parseMarkdownAst(preprocessWikiLinks(raw));
    const runs: InlineRun[] = [];
    for (let i = 0; i < ast.children.length; i++) {
      const c = ast.children[i];
      if ('children' in c) {
        if (i > 0) runs.push({ text: ' ' });
        runs.push(...collectInlineRuns(c.children as PhrasingContent[], this.existingSlugs));
      }
    }
    return runs.length > 0 ? runs : [{ text: raw }];
  }

  renderPredefinicaoBlock(template: PredefinicaoBlock): void {
    const boxWidth = CONTENT_WIDTH;
    const padX = 12;
    const padY = 9;
    const innerWidth = boxWidth - padX * 2;

    const kickerText = toPdfSafeText(template.kicker || 'Template');
    const titleLines = template.title
      ? this.layoutRuns(
          this.inlineRunsFromMarkdown(template.title),
          innerWidth,
          10.5,
          1.32,
          this.theme.heading,
          true
        )
      : [];
    const bodyLines = template.body
      ? this.layoutRuns(
          this.inlineRunsFromMarkdown(template.body),
          innerWidth,
          9,
          1.42,
          this.theme.body,
          false,
          template.variant === 'quote' || template.variant === 'navigation'
        )
      : [];

    const footerRaw = [
      template.author ? `— ${template.author}` : '',
      template.source ? template.source : '',
      template.meta ? template.meta : '',
    ]
      .filter(Boolean)
      .join(' · ');

    const footerLines = footerRaw
      ? this.layoutRuns(
          this.inlineRunsFromMarkdown(footerRaw),
          innerWidth,
          8,
          1.32,
          this.theme.muted
        )
      : [];

    const kickerH = 12;
    const titleH = titleLines.reduce((acc, l) => acc + l.height, 0);
    const bodyH = bodyLines.reduce((acc, l) => acc + l.height, 0);
    const footerH = footerLines.reduce((acc, l) => acc + l.height, 0);
    const totalH =
      padY * 2 +
      kickerH +
      (titleLines.length > 0 ? titleH + 3 : 0) +
      (bodyLines.length > 0 ? bodyH + 2 : 0) +
      (footerLines.length > 0 ? footerH + 4 : 0);

    this.ensureSpace(Math.min(totalH, MAX_Y - MARGIN_TOP - 8));

    const startY = this.y;
    const isWarn =
      template.variant === 'warning' || template.variant === 'alert';
    const boxBg: Rgb = isWarn ? this.theme.blockquoteBg : this.theme.surfaceBg;
    const kickerColor: Rgb =
      template.variant === 'alert' ? this.theme.missingLink : this.theme.accent;

    this.doc.setFillColor(...boxBg);
    this.doc.setDrawColor(...this.theme.border);
    this.doc.setLineWidth(0.75);
    this.doc.roundedRect(
      MARGIN_X,
      startY,
      boxWidth,
      Math.min(totalH, MAX_Y - startY),
      5,
      5,
      'FD'
    );

    let cy = startY + padY;
    this.doc.setFont('courier', 'bold');
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(...kickerColor);
    this.doc.text(kickerText, MARGIN_X + padX, cy + 7);
    cy += kickerH;

    for (const line of titleLines) {
      this.drawLaidOutLine(line, MARGIN_X + padX, cy + 8.5);
      cy += line.height;
    }
    if (titleLines.length > 0) cy += 3;

    for (const line of bodyLines) {
      this.drawLaidOutLine(line, MARGIN_X + padX, cy + 7.5, innerWidth);
      cy += line.height;
    }
    if (bodyLines.length > 0) cy += 2;

    if (footerLines.length > 0) {
      cy += 2;
      for (const line of footerLines) {
        this.drawLaidOutLine(line, MARGIN_X + padX, cy + 6.5);
        cy += line.height;
      }
    }

    this.y = startY + Math.min(totalH, MAX_Y - startY) + 10;
  }

  private renderHeading(node: Heading): void {
    const sizes: Record<number, number> = {
      1: 16.5,
      2: 13.5,
      3: 11.5,
      4: 10.5,
      5: 10,
      6: 9.5,
    };
    const fontSize = sizes[node.depth] ?? 10.5;
    const runs = collectInlineRuns(node.children, this.existingSlugs);
    const lines = this.layoutRuns(runs, CONTENT_WIDTH, fontSize, 1.3, this.theme.heading, true);
    const blockHeight = lines.reduce((sum, l) => sum + l.height, 0);

    // Keep heading attached to subsequent content
    this.ensureSpace(blockHeight + 34);
    if (this.y > MARGIN_TOP + 6) {
      this.y += node.depth <= 2 ? 10 : 6;
    }

    for (const line of lines) {
      this.drawLaidOutLine(line, MARGIN_X, this.y + fontSize * 0.85);
      this.y += line.height;
    }

    if (node.depth <= 2) {
      this.y += 3;
      this.doc.setDrawColor(...this.theme.border);
      this.doc.setLineWidth(0.6);
      this.doc.line(MARGIN_X, this.y, PAGE_WIDTH - MARGIN_X, this.y);
      this.y += 8;
    } else {
      this.y += 4;
    }
  }

  private renderParagraph(node: Paragraph, x = MARGIN_X, width = CONTENT_WIDTH): void {
    const runs = collectInlineRuns(node.children, this.existingSlugs);
    if (runs.length === 0) return;
    this.renderRunsFlow(runs, {
      x,
      maxWidth: width,
      fontSize: 10,
      lineHeightRatio: 1.54,
      color: this.theme.body,
      spaceAfter: 7,
      justify: true,
    });
  }

  private renderBlockquote(node: Blockquote, x = MARGIN_X, width = CONTENT_WIDTH): void {
    const padX = 12;
    const padY = 8;
    const innerWidth = width - padX * 2;
    const innerBlocks = node.children;

    // Collect text lines cleanly inside a subtle surface box with top/bottom borders
    const collectedParagraphs: InlineRun[][] = [];
    for (const child of innerBlocks) {
      if (child.type === 'paragraph') {
        collectedParagraphs.push(collectInlineRuns(child.children, this.existingSlugs));
      } else if (child.type === 'heading') {
        collectedParagraphs.push(
          collectInlineRuns(child.children, this.existingSlugs, { bold: true })
        );
      } else if (child.type === 'list') {
        for (const item of child.children) {
          for (const sub of item.children) {
            if (sub.type === 'paragraph') {
              collectedParagraphs.push([
                { text: '• ' },
                ...collectInlineRuns(sub.children, this.existingSlugs),
              ]);
            }
          }
        }
      }
    }

    if (collectedParagraphs.length === 0) return;

    const layoutGroups = collectedParagraphs.map((runs) =>
      this.layoutRuns(runs, innerWidth, 9.5, 1.48, this.theme.muted, false, true)
    );
    const totalTextH =
      layoutGroups.reduce((sum, g) => sum + g.reduce((s, l) => s + l.height, 0), 0) +
      Math.max(0, layoutGroups.length - 1) * 5;
    const totalH = totalTextH + padY * 2;

    this.ensureSpace(Math.min(totalH, 80));

    let groupIndex = 0;
    let lineIndex = 0;

    while (groupIndex < layoutGroups.length) {
      // Measure how many lines fit on current page
      let sliceH = padY * 2;
      const sliceLines: Array<{ line: LaidOutLine; extraGapAfter: number }> = [];

      while (groupIndex < layoutGroups.length) {
        const group = layoutGroups[groupIndex];
        while (lineIndex < group.length) {
          const line = group[lineIndex];
          if (this.y + sliceH + line.height > MAX_Y && sliceLines.length > 0) {
            break;
          }
          const isLastInGroup = lineIndex === group.length - 1 && groupIndex < layoutGroups.length - 1;
          const gap = isLastInGroup ? 5 : 0;
          sliceLines.push({ line, extraGapAfter: gap });
          sliceH += line.height + gap;
          lineIndex++;
        }

        if (lineIndex >= group.length) {
          groupIndex++;
          lineIndex = 0;
        } else {
          break;
        }
      }

      if (sliceLines.length === 0) {
        this.nextPage();
        continue;
      }

      this.doc.setFillColor(...this.theme.blockquoteBg);
      this.doc.rect(x, this.y, width, sliceH, 'F');
      this.doc.setDrawColor(...this.theme.border);
      this.doc.setLineWidth(0.75);
      this.doc.line(x, this.y, x + width, this.y);
      this.doc.line(x, this.y + sliceH, x + width, this.y + sliceH);

      let cy = this.y + padY;
      for (const entry of sliceLines) {
        this.drawLaidOutLine(entry.line, x + padX, cy + 8, innerWidth);
        cy += entry.line.height + entry.extraGapAfter;
      }

      this.y += sliceH + 4;
      if (groupIndex < layoutGroups.length) {
        this.nextPage();
      }
    }

    this.y += 5;
  }

  private renderCodeBlock(node: Code, x = MARGIN_X, width = CONTENT_WIDTH): void {
    const padX = 12;
    const padY = 10;
    const fontSize = 8.5;
    const lineHeight = 12.5;
    const lang = node.lang ? toPdfSafeText(node.lang.trim()) : '';

    this.doc.setFont('courier', 'normal');
    this.doc.setFontSize(fontSize);

    const rawLines = toPdfSafeText(node.value || '').split('\n');
    const wrappedLines: string[] = [];
    for (const rawLine of rawLines) {
      if (!rawLine) {
        wrappedLines.push('');
        continue;
      }
      const split = this.doc.splitTextToSize(rawLine, width - padX * 2) as string[];
      wrappedLines.push(...split);
    }

    if (wrappedLines.length === 0) return;

    this.ensureSpace(Math.min(wrappedLines.length * lineHeight + padY * 2 + 12, 70));

    let idx = 0;
    let firstSlice = true;

    while (idx < wrappedLines.length) {
      const topExtra = firstSlice && lang ? 14 : 0;
      const availableLines = Math.max(
        1,
        Math.floor((MAX_Y - this.y - padY * 2 - topExtra) / lineHeight)
      );
      const count = Math.min(availableLines, wrappedLines.length - idx);
      const boxH = count * lineHeight + padY * 2 + topExtra;

      this.doc.setFillColor(...this.theme.codeBlockBg);
      this.doc.setDrawColor(...this.theme.codeBlockBorder);
      this.doc.setLineWidth(0.75);
      this.doc.roundedRect(x, this.y, width, boxH, 5, 5, 'FD');

      let cy = this.y + padY;
      if (firstSlice && lang) {
        this.doc.setFont('courier', 'bold');
        this.doc.setFontSize(7.5);
        this.doc.setTextColor(...this.theme.muted);
        this.doc.text(lang, x + padX, cy + 6);
        cy += 14;
      }

      this.doc.setFont('courier', 'normal');
      this.doc.setFontSize(fontSize);
      this.doc.setTextColor(...this.theme.codeBlockText);

      for (let i = 0; i < count; i++) {
        const lineText = wrappedLines[idx + i];
        if (lineText) {
          this.doc.text(lineText, x + padX, cy + 7.5);
        }
        cy += lineHeight;
      }

      idx += count;
      firstSlice = false;
      this.y += boxH;

      if (idx < wrappedLines.length) {
        this.nextPage();
      }
    }

    this.y += 9;
  }

  private async renderList(node: List, x = MARGIN_X, width = CONTENT_WIDTH, depth = 0): Promise<void> {
    const startNumber = node.start ?? 1;

    for (let idx = 0; idx < node.children.length; idx++) {
      const item = node.children[idx] as ListItem;
      const markerWidth = node.ordered ? 20 : 15;
      const itemX = x + markerWidth;
      const itemWidth = Math.max(120, width - markerWidth);

      this.ensureSpace(18);
      const markerBaselineY = this.y + 8.5;

      // Draw list marker (checkbox / bullet circle / ordered index)
      if (typeof item.checked === 'boolean') {
        const boxSize = 8;
        const boxY = this.y + 2;
        this.doc.setDrawColor(...(item.checked ? this.theme.accent : this.theme.muted));
        this.doc.setLineWidth(0.8);
        if (item.checked) {
          this.doc.setFillColor(...this.theme.accent);
          this.doc.roundedRect(x + 2, boxY, boxSize, boxSize, 1.5, 1.5, 'FD');
          this.doc.setDrawColor(...this.theme.pageBg);
          this.doc.setLineWidth(1.2);
          this.doc.line(x + 3.6, boxY + 4.2, x + 5.3, boxY + 6.1);
          this.doc.line(x + 5.3, boxY + 6.1, x + 8.4, boxY + 2.3);
        } else {
          this.doc.roundedRect(x + 2, boxY, boxSize, boxSize, 1.5, 1.5, 'S');
        }
      } else if (node.ordered) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(9.5);
        this.doc.setTextColor(...this.theme.muted);
        this.doc.text(`${startNumber + idx}.`, x + 2, markerBaselineY);
      } else {
        this.doc.setFillColor(...this.theme.muted);
        if (depth % 2 === 0) {
          this.doc.circle(x + 5.5, this.y + 6, 2, 'F');
        } else {
          this.doc.setDrawColor(...this.theme.muted);
          this.doc.setLineWidth(0.75);
          this.doc.circle(x + 5.5, this.y + 6, 2, 'S');
        }
      }

      for (let ci = 0; ci < item.children.length; ci++) {
        const child = item.children[ci];
        if (child.type === 'paragraph') {
          const runs = collectInlineRuns(child.children, this.existingSlugs);
          this.renderRunsFlow(runs, {
            x: itemX,
            maxWidth: itemWidth,
            fontSize: 10,
            lineHeightRatio: 1.48,
            color: this.theme.body,
            spaceAfter: ci === item.children.length - 1 ? 3 : 4,
            justify: true,
          });
        } else if (child.type === 'list') {
          await this.renderList(child, itemX, itemWidth, depth + 1);
        } else if (child.type === 'code') {
          this.renderCodeBlock(child, itemX, itemWidth);
        } else if (child.type === 'blockquote') {
          this.renderBlockquote(child, itemX, itemWidth);
        }
      }
    }

    if (depth === 0) {
      this.y += 5;
    }
  }

  private renderTable(node: Table, x = MARGIN_X, width = CONTENT_WIDTH): void {
    const rows = node.children;
    if (rows.length === 0) return;

    const colCount = Math.max(...rows.map((r) => r.children.length));
    if (colCount <= 0) return;

    const colWidth = width / colCount;
    const cellPadX = 7;
    const cellPadY = 5.5;
    const innerColWidth = Math.max(24, colWidth - cellPadX * 2);

    const layoutRow = (cells: TableCell[], isHeader: boolean) => {
      const cellLayouts = Array.from({ length: colCount }, (_, colIdx) => {
        const cell = cells[colIdx];
        const runs = cell ? collectInlineRuns(cell.children, this.existingSlugs) : [];
        return this.layoutRuns(
          runs,
          innerColWidth,
          8.75,
          1.38,
          isHeader ? this.theme.heading : this.theme.body,
          isHeader
        );
      });

      const contentH = Math.max(
        11,
        ...cellLayouts.map((lines) => lines.reduce((sum, l) => sum + l.height, 0))
      );
      return {
        cellLayouts,
        height: contentH + cellPadY * 2,
      };
    };

    const computedRows = rows.map((row, rIdx) => layoutRow(row.children, rIdx === 0));
    const headerRow = computedRows[0];

    const drawRowAt = (
      computed: ReturnType<typeof layoutRow>,
      isHeader: boolean
    ) => {
      for (let colIdx = 0; colIdx < colCount; colIdx++) {
        const cellX = x + colIdx * colWidth;
        if (isHeader) {
          this.doc.setFillColor(...this.theme.blockquoteBg);
          this.doc.rect(cellX, this.y, colWidth, computed.height, 'F');
        }
        this.doc.setDrawColor(...this.theme.border);
        this.doc.setLineWidth(0.6);
        this.doc.rect(cellX, this.y, colWidth, computed.height, 'S');

        let cy = this.y + cellPadY;
        const lines = computed.cellLayouts[colIdx];
        for (const line of lines) {
          this.drawLaidOutLine(line, cellX + cellPadX, cy + 7.5);
          cy += line.height;
        }
      }
      this.y += computed.height;
    };

    this.ensureSpace(headerRow.height + (computedRows[1]?.height ?? 0) + 8);
    drawRowAt(headerRow, true);

    for (let rIdx = 1; rIdx < computedRows.length; rIdx++) {
      const row = computedRows[rIdx];
      if (this.y + row.height > MAX_Y) {
        this.nextPage();
        drawRowAt(headerRow, true);
      }
      drawRowAt(row, false);
    }

    this.y += 10;
  }

  private async renderBlockNode(node: RootContent): Promise<void> {
    switch (node.type) {
      case 'heading':
        this.renderHeaderSafeHeading(node);
        break;
      case 'paragraph': {
        // Standalone image paragraph check
        if (node.children.length === 1 && node.children[0].type === 'image') {
          const imgNode = node.children[0];
          const embedded = await fetchImageAsPngDataUrl(imgNode.url);
          if (embedded) {
            const scale = Math.min(CONTENT_WIDTH / embedded.width, 260 / embedded.height, 1);
            const w = embedded.width * scale;
            const h = embedded.height * scale;
            this.ensureSpace(h + 24);
            this.doc.addImage(embedded.dataUrl, 'PNG', MARGIN_X, this.y, w, h);
            this.y += h + 6;
            if (imgNode.alt?.trim()) {
              this.renderRunsFlow([{ text: imgNode.alt.trim(), italic: true }], {
                x: MARGIN_X,
                maxWidth: CONTENT_WIDTH,
                fontSize: 8.5,
                lineHeightRatio: 1.35,
                color: this.theme.muted,
                spaceAfter: 8,
              });
            }
            break;
          }
        }
        this.renderParagraph(node);
        break;
      }
      case 'blockquote':
        this.renderBlockquote(node);
        break;
      case 'code':
        this.renderCodeBlock(node);
        break;
      case 'list':
        await this.renderList(node);
        break;
      case 'table':
        this.renderTable(node);
        break;
      case 'thematicBreak':
        this.ensureSpace(16);
        this.y += 6;
        this.doc.setDrawColor(...this.theme.border);
        this.doc.setLineWidth(0.75);
        this.doc.line(MARGIN_X, this.y, PAGE_WIDTH - MARGIN_X, this.y);
        this.y += 12;
        break;
      case 'html': {
        const cleaned = node.value.replace(/<[^>]+>/g, '').trim();
        if (cleaned) {
          this.renderRunsFlow([{ text: cleaned }], {
            x: MARGIN_X,
            maxWidth: CONTENT_WIDTH,
            fontSize: 9.5,
            lineHeightRatio: 1.45,
            color: this.theme.body,
            spaceAfter: 6,
          });
        }
        break;
      }
      default:
        break;
    }
  }

  private renderHeaderSafeHeading(node: Heading): void {
    this.renderHeading(node);
  }

  async renderMarkdownBody(markdown: string): Promise<void> {
    const ast = parseMarkdownAst(preprocessWikiLinks(markdown));
    for (const child of ast.children) {
      await this.renderBlockNode(child);
    }
  }

  renderReferencesSection(references: WikiReferenceItem[], title: string): void {
    if (references.length === 0) return;

    this.ensureSpace(56);
    this.y += 10;
    this.doc.setDrawColor(...this.theme.border);
    this.doc.setLineWidth(0.75);
    this.doc.line(MARGIN_X, this.y, PAGE_WIDTH - MARGIN_X, this.y);
    this.y += 14;

    this.renderRunsFlow(
      [
        { text: title, bold: true },
        { text: `  ·  ${references.length}`, color: this.theme.muted },
      ],
      {
        x: MARGIN_X,
        maxWidth: CONTENT_WIDTH,
        fontSize: 13,
        lineHeightRatio: 1.3,
        color: this.theme.heading,
        bold: true,
        spaceAfter: 8,
      }
    );

    for (const ref of references) {
      this.ensureSpace(18);
      const indexLabel = `[${ref.index}]`;
      this.doc.setFont('courier', 'bold');
      this.doc.setFontSize(8.5);
      this.doc.setTextColor(...this.theme.muted);
      this.doc.text(indexLabel, MARGIN_X, this.y + 8);

      const refAst = parseMarkdownAst(preprocessWikiLinks(ref.content));
      const runs: InlineRun[] = [];
      for (let i = 0; i < refAst.children.length; i++) {
        const c = refAst.children[i];
        if ('children' in c) {
          if (i > 0) runs.push({ text: ' ' });
          runs.push(...collectInlineRuns(c.children as PhrasingContent[], this.existingSlugs));
        }
      }
      if (runs.length === 0) {
        runs.push({ text: ref.content });
      }

      this.renderRunsFlow(runs, {
        x: MARGIN_X + 26,
        maxWidth: CONTENT_WIDTH - 26,
        fontSize: 9,
        lineHeightRatio: 1.45,
        color: this.theme.body,
        spaceAfter: 5,
      });
    }
  }

  applyFooters(siteTitle: string, slug: string, theme?: WikiThemeDefinition): void {
    const total = this.doc.getNumberOfPages();
    const footerY = PAGE_HEIGHT - 24;
    const instSuffix = theme?.institutionMeta
      ? ` · ${theme.institutionMeta.organization} (${theme.institutionMeta.eraLabel})`
      : '';
    const leftText = toPdfSafeText(`${siteTitle}${instSuffix} · :${slug} · CC BY-SA 4.0`);

    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i);
      this.doc.setDrawColor(...this.theme.border);
      this.doc.setLineWidth(0.5);
      this.doc.line(MARGIN_X, footerY - 12, PAGE_WIDTH - MARGIN_X, footerY - 12);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...this.theme.muted);
      this.doc.text(leftText, MARGIN_X, footerY);

      const pageText = toPdfSafeText(`Page ${i} / ${total}`);
      const pageW = this.doc.getTextWidth(pageText);
      this.doc.text(pageText, PAGE_WIDTH - MARGIN_X - pageW, footerY);
    }
  }
}

/**
 * Exports the current wiki article as a formatted A4 PDF using jsPDF and the
 * Markdown AST, faithfully reflecting the active Light or Dark visual theme.
 */
export async function exportArticleToPdf(
  opts: ExportArticlePdfOptions
): Promise<{ filename: string; pageCount: number }> {
  const {
    page,
    wikiPages,
    siteTitle,
    isDark,
    theme: providedTheme,
    existingSlugs,
    enableReferences = true,
    referencesTitle = 'Referências',
    enableInfoboxes = true,
    autoUserInfobox = null,
  } = opts;

  const resolvedTheme = providedTheme ?? getWikiThemeById(DEFAULT_WIKI_THEME_ID);
  const modeTokens = isDark ? resolvedTheme.pdf.dark : resolvedTheme.pdf.light;
  const infoboxSource = isDark ? DARK_THEME : LIGHT_THEME;
  const theme: PdfThemePalette = {
    isDark,
    ...modeTokens,
    infoboxHeaders: infoboxSource.infoboxHeaders,
  };
  const writer = new WikiPdfWriter(theme, existingSlugs);

  writer.renderHeaderSheet(opts);

  const expandedContent = expandTemplatesInWikitext(page.content, wikiPages, {
    currentSlug: page.slug,
  });

  const { processedMarkdown, references } = enableReferences
    ? extractArticleReferences(expandedContent)
    : { processedMarkdown: expandedContent, references: [] };

  const segments = enableInfoboxes
    ? parseMarkdownWithInfoboxes(processedMarkdown)
    : [{ kind: 'markdown' as const, content: processedMarkdown }];

  if (autoUserInfobox && enableInfoboxes && !segments.some((s) => s.kind === 'infobox')) {
    await writer.renderInfobox(autoUserInfobox);
  }

  for (const segment of segments) {
    if (segment.kind === 'infobox') {
      await writer.renderInfobox(segment.infobox);
    } else if (segment.kind === 'predefinicao') {
      writer.renderPredefinicaoBlock(segment.template);
    } else if (segment.content.trim()) {
      await writer.renderMarkdownBody(segment.content);
    }
  }

  if (enableReferences && references.length > 0) {
    writer.renderReferencesSection(references, referencesTitle);
  }

  writer.applyFooters(siteTitle, page.slug, resolvedTheme);

  const safeSlug = page.slug.replace(/[^a-zA-Z0-9_-]+/g, '-') || 'article';
  const filename = `${safeSlug}.pdf`;
  writer.doc.save(filename);

  return {
    filename,
    pageCount: writer.doc.getNumberOfPages(),
  };
}
