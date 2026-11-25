export type ProfanityFieldKey = 'title' | 'slug' | 'tags' | 'summary' | 'content';

export interface ProfanityMatch {
  field: ProfanityFieldKey;
  fieldLabel: string;
  term: string;
  maskedTerm: string;
  start: number;
  end: number;
}

export interface ProfanityCheckInput {
  title?: string;
  slug?: string;
  tags?: string;
  summary?: string;
  content?: string;
}

export interface ProfanityCheckResult {
  hasProfanity: boolean;
  matches: ProfanityMatch[];
  fields: ProfanityFieldKey[];
  uniqueMaskedTerms: string[];
}

const FIELD_LABELS: Record<ProfanityFieldKey, string> = {
  title: 'Título',
  slug: 'Identificador (:slug)',
  tags: 'Tags',
  summary: 'Resumo da edição',
  content: 'Conteúdo do artigo',
};

/**
 * Unambiguous Portuguese and English offensive terms / slurs (normalized, lowercase, accent-free).
 * Multi-meaning everyday words (e.g., animal names or technical terms) are intentionally omitted
 * to prevent false positives in encyclopedic articles.
 */
const SINGLE_WORD_BLOCKLIST = new Set<string>([
  // Portuguese
  'arrombado',
  'arrombada',
  'arrombados',
  'arrombadas',
  'babaca',
  'babacas',
  'boceta',
  'bocetas',
  'boquete',
  'boquetes',
  'bosta',
  'bostas',
  'buceta',
  'bucetas',
  'cacete',
  'cacetes',
  'caralho',
  'caralhos',
  'corno',
  'corna',
  'cornos',
  'cornas',
  'cuzao',
  'cuzoes',
  'cuzona',
  'cuzonas',
  'cuzinho',
  'desgracado',
  'desgracada',
  'desgracados',
  'desgracadas',
  'escroto',
  'escrota',
  'escrotos',
  'escrotas',
  'fdp',
  'foda',
  'fodas',
  'fodase',
  'foder',
  'fodido',
  'fodida',
  'fodidos',
  'fodidas',
  'fuder',
  'fudido',
  'fudida',
  'fudidos',
  'fudidas',
  'imbecil',
  'imbecis',
  'kralho',
  'krl',
  'merda',
  'merdas',
  'otario',
  'otaria',
  'otarios',
  'otarias',
  'piroca',
  'pirocas',
  'porra',
  'porras',
  'pqp',
  'punheta',
  'punhetas',
  'puta',
  'putas',
  'putaria',
  'putarias',
  'puto',
  'putos',
  'retardado',
  'retardada',
  'retardados',
  'retardadas',
  'siririca',
  'tnc',
  'trouxa',
  'trouxas',
  'vagabundo',
  'vagabunda',
  'vagabundos',
  'vagabundas',
  'viado',
  'viados',
  'vsf',
  'vtnc',
  'vtmnc',
  'xereca',
  'xoxota',

  // English
  'asshole',
  'assholes',
  'bastard',
  'bastards',
  'bitch',
  'bitches',
  'bitching',
  'bullshit',
  'cock',
  'cocks',
  'cocksucker',
  'cunt',
  'cunts',
  'dick',
  'dicks',
  'dickhead',
  'dumbass',
  'fag',
  'faggot',
  'faggots',
  'fuck',
  'fucked',
  'fucker',
  'fuckers',
  'fucking',
  'jackass',
  'motherfucker',
  'motherfuckers',
  'nigga',
  'niggas',
  'nigger',
  'niggers',
  'pussy',
  'pussies',
  'shit',
  'shits',
  'shitty',
  'slut',
  'sluts',
  'twat',
  'whore',
  'whores',
]);

const PHRASE_PATTERNS: RegExp[] = [
  /\bfilh[oa]s?\s+d[aeo]\s+puta\b/gi,
  /\bputa\s+que\s+(?:te\s+)?pariu\b/gi,
  /\bvai\s+(?:se\s+)?f[ou]der\b/gi,
  /\bvai\s+tomar\s+no\s+cu\b/gi,
  /\btomar\s+no\s+cu\b/gi,
  /\bpau\s+no\s+cu\b/gi,
  /\bva[i]?\s+(?:a|pra|pro)\s+merda\b/gi,
  /\bson\s+of\s+a\s+bitch\b/gi,
  /\bpiece\s+of\s+shit\b/gi,
  /\bfuck\s+(?:you|off)\b/gi,
];

const LEET_CHAR_MAP: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '0': 'o',
  '$': 's',
  '5': 's',
  '7': 't',
};

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeToken(rawToken: string): {
  plain: string;
  deleet: string;
  collapsedOne: string;
  collapsedTwo: string;
} {
  const lower = stripAccents(rawToken).toLowerCase();
  const plain = lower.replace(/[^a-z0-9]/g, '');

  let deleet = '';
  for (const ch of lower) {
    deleet += LEET_CHAR_MAP[ch] ?? ch;
  }
  deleet = deleet.replace(/[^a-z]/g, '');

  const collapsedOne = deleet.replace(/(.)\1{2,}/g, '$1');
  const collapsedTwo = deleet.replace(/(.)\1{2,}/g, '$1$1');
  return { plain, deleet, collapsedOne, collapsedTwo };
}

function isTokenProfane(rawToken: string): boolean {
  if (!rawToken || rawToken.length < 3 || rawToken.length > 40) return false;
  // Ignore pure numeric tokens (e.g. years, versions, counts)
  if (/^\d+$/.test(rawToken)) return false;

  const { plain, deleet, collapsedOne, collapsedTwo } = normalizeToken(rawToken);
  if (plain && SINGLE_WORD_BLOCKLIST.has(plain)) return true;

  // Apply leetspeak decoding only if the raw token actually contains letters (prevents e.g. "404" or "501")
  const hasLetter = /[a-z]/i.test(stripAccents(rawToken));
  if (!hasLetter) return false;

  if (deleet && SINGLE_WORD_BLOCKLIST.has(deleet)) return true;
  if (collapsedOne && SINGLE_WORD_BLOCKLIST.has(collapsedOne)) return true;
  if (collapsedTwo && SINGLE_WORD_BLOCKLIST.has(collapsedTwo)) return true;

  return false;
}

export function maskProfaneTerm(term: string): string {
  const trimmed = term.trim();
  if (trimmed.length <= 2) return '*'.repeat(trimmed.length);
  if (trimmed.length <= 4) {
    return `${trimmed[0]}${'*'.repeat(trimmed.length - 1)}`;
  }
  return `${trimmed[0]}${'*'.repeat(Math.min(5, trimmed.length - 2))}${trimmed[trimmed.length - 1]}`;
}

/**
 * Replaces embedded data:image/...;base64,... URIs with same-length spaces so
 * character offsets in the original text stay exact while avoiding false hits
 * inside base64 payloads.
 */
function blankOutDataUris(text: string): string {
  return text.replace(
    /data:image\/[a-z0-9+.-]+;base64,[A-Za-z0-9+/=]+/gi,
    (match) => ' '.repeat(match.length)
  );
}

function scanField(field: ProfanityFieldKey, rawValue: string): ProfanityMatch[] {
  if (!rawValue || !rawValue.trim()) return [];

  const sanitizedForScan = blankOutDataUris(rawValue);
  const matches: ProfanityMatch[] = [];
  const coveredRanges: Array<{ start: number; end: number }> = [];

  // 1. Check multi-word offensive phrases first (accent-stripped copy keeps character length 1:1 for ASCII/common Latin,
  //    so we match against the original string using a whitespace-tolerant regex or accent-insensitive normalized copy).
  const normalizedPreserveLen = sanitizedForScan.replace(/[\u0300-\u036f]/g, '');
  // Note: NFD could change indices, so only strip accents per-character via lookup to preserve exact offsets:
  let accentFreeSameLen = '';
  for (let i = 0; i < sanitizedForScan.length; i += 1) {
    const ch = sanitizedForScan[i];
    const base = stripAccents(ch);
    accentFreeSameLen += base.length === 1 ? base : ch;
  }

  // Fallback if unused warning
  void normalizedPreserveLen;

  for (const pattern of PHRASE_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(accentFreeSameLen)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      const originalSnippet = rawValue.slice(start, end);
      matches.push({
        field,
        fieldLabel: FIELD_LABELS[field],
        term: originalSnippet,
        maskedTerm: originalSnippet
          .split(/(\s+)/)
          .map((part) => (/\s+/.test(part) ? part : maskProfaneTerm(part)))
          .join(''),
        start,
        end,
      });
      coveredRanges.push({ start, end });
      if (matches.length >= 25) break;
    }
    if (matches.length >= 25) break;
  }

  // 2. Scan individual word tokens (letters/digits + common leetspeak symbols)
  const tokenRegex = /[\p{L}\p{N}@!$]+/gu;
  let tokenMatch: RegExpExecArray | null;
  while ((tokenMatch = tokenRegex.exec(sanitizedForScan)) !== null) {
    if (matches.length >= 25) break;
    const start = tokenMatch.index;
    const end = start + tokenMatch[0].length;

    const alreadyCovered = coveredRanges.some(
      (range) => start >= range.start && end <= range.end
    );
    if (alreadyCovered) continue;

    if (isTokenProfane(tokenMatch[0])) {
      matches.push({
        field,
        fieldLabel: FIELD_LABELS[field],
        term: tokenMatch[0],
        maskedTerm: maskProfaneTerm(tokenMatch[0]),
        start,
        end,
      });
    }
  }

  return matches;
}

export function checkArticleProfanity(input: ProfanityCheckInput): ProfanityCheckResult {
  const orderedFields: Array<[ProfanityFieldKey, string | undefined]> = [
    ['title', input.title],
    ['slug', input.slug],
    ['tags', input.tags],
    ['content', input.content],
    ['summary', input.summary],
  ];

  const allMatches: ProfanityMatch[] = [];
  const fieldSet = new Set<ProfanityFieldKey>();
  const maskedSet = new Set<string>();

  for (const [field, value] of orderedFields) {
    if (!value) continue;
    const found = scanField(field, value);
    for (const item of found) {
      allMatches.push(item);
      fieldSet.add(item.field);
      maskedSet.add(item.maskedTerm.toLowerCase());
      if (allMatches.length >= 30) break;
    }
    if (allMatches.length >= 30) break;
  }

  return {
    hasProfanity: allMatches.length > 0,
    matches: allMatches,
    fields: Array.from(fieldSet),
    uniqueMaskedTerms: Array.from(maskedSet),
  };
}
