export type WikiThemeId =
  | 'classic-slate'
  | 'archival-parchment'
  | 'botanical-atlas'
  | 'cobalt-monograph'
  | 'windows-1';

export type RgbTuple = [number, number, number];

export interface WikiThemePdfTokens {
  pageBg: RgbTuple;
  surfaceBg: RgbTuple;
  chipBg: RgbTuple;
  blockquoteBg: RgbTuple;
  codeBlockBg: RgbTuple;
  codeBlockText: RgbTuple;
  codeBlockBorder: RgbTuple;
  heading: RgbTuple;
  body: RgbTuple;
  muted: RgbTuple;
  border: RgbTuple;
  accent: RgbTuple;
  missingLink: RgbTuple;
}

export interface WikiThemeDefinition {
  id: WikiThemeId;
  name: string;
  tagline: string;
  typographyLabel: string;
  editionLabel: string;
  lightSwatches: [string, string, string];
  darkSwatches: [string, string, string];
  metaThemeColor: {
    light: string;
    dark: string;
  };
  pdf: {
    light: WikiThemePdfTokens;
    dark: WikiThemePdfTokens;
  };
}

export const DEFAULT_WIKI_THEME_ID: WikiThemeId = 'classic-slate';

/**
 * Extensible theme catalog registered inside the Wiki-site.
 * New themes added in future iterations only need an entry here and corresponding
 * CSS custom property overrides in src/index.css.
 */
export const WIKI_THEMES: WikiThemeDefinition[] = [
  {
    id: 'classic-slate',
    name: 'Clássico Editorial',
    tagline: 'Base neutra em slate e branco puro com azul técnico de alta precisão.',
    typographyLabel: 'Bricolage Grotesque + Plus Jakarta Sans',
    editionLabel: 'Tema padrão',
    lightSwatches: ['bg-[#f8f9fa]', 'bg-[#ffffff]', 'bg-[#1d4ed8]'],
    darkSwatches: ['bg-[#0b0f17]', 'bg-[#0f1623]', 'bg-[#60a5fa]'],
    metaThemeColor: {
      light: '#1d4ed8',
      dark: '#0f1623',
    },
    pdf: {
      light: {
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
      },
      dark: {
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
      },
    },
  },
  {
    id: 'archival-parchment',
    name: 'Pergaminho Arquivístico',
    tagline: 'Papel alabastro quente, tinta carvão e acentos em terracota para leitura longa.',
    typographyLabel: 'Playfair Display + Lora',
    editionLabel: 'Coleção Editorial',
    lightSwatches: ['bg-[#f5f1e8]', 'bg-[#fbf9f5]', 'bg-[#9a3412]'],
    darkSwatches: ['bg-[#12100e]', 'bg-[#1b1815]', 'bg-[#fb923c]'],
    metaThemeColor: {
      light: '#9a3412',
      dark: '#1b1815',
    },
    pdf: {
      light: {
        pageBg: [251, 249, 245],
        surfaceBg: [242, 236, 224],
        chipBg: [235, 229, 217],
        blockquoteBg: [244, 239, 229],
        codeBlockBg: [28, 25, 23],
        codeBlockText: [245, 240, 230],
        codeBlockBorder: [223, 214, 197],
        heading: [28, 25, 23],
        body: [41, 37, 36],
        muted: [120, 113, 108],
        border: [223, 214, 197],
        accent: [154, 52, 18],
        missingLink: [146, 64, 14],
      },
      dark: {
        pageBg: [27, 24, 21],
        surfaceBg: [18, 16, 14],
        chipBg: [43, 37, 31],
        blockquoteBg: [35, 31, 27],
        codeBlockBg: [13, 11, 9],
        codeBlockText: [245, 240, 230],
        codeBlockBorder: [53, 46, 39],
        heading: [245, 240, 230],
        body: [214, 207, 194],
        muted: [168, 162, 158],
        border: [53, 46, 39],
        accent: [251, 146, 60],
        missingLink: [252, 211, 77],
      },
    },
  },
  {
    id: 'botanical-atlas',
    name: 'Atlas Botânico',
    tagline: 'Superfícies em pedra natural suave e verde-floresta para bases enciclopédicas.',
    typographyLabel: 'Bricolage Grotesque + Plus Jakarta Sans',
    editionLabel: 'Coleção Naturalia',
    lightSwatches: ['bg-[#f3f7f4]', 'bg-[#fcfefd]', 'bg-[#15803d]'],
    darkSwatches: ['bg-[#08110c]', 'bg-[#0d1b13]', 'bg-[#4ade80]'],
    metaThemeColor: {
      light: '#15803d',
      dark: '#0d1b13',
    },
    pdf: {
      light: {
        pageBg: [252, 254, 253],
        surfaceBg: [236, 243, 238],
        chipBg: [225, 236, 229],
        blockquoteBg: [239, 246, 241],
        codeBlockBg: [15, 36, 25],
        codeBlockText: [236, 253, 245],
        codeBlockBorder: [207, 224, 212],
        heading: [15, 36, 25],
        body: [31, 58, 43],
        muted: [82, 112, 95],
        border: [207, 224, 212],
        accent: [21, 128, 61],
        missingLink: [180, 83, 9],
      },
      dark: {
        pageBg: [13, 27, 19],
        surfaceBg: [8, 17, 12],
        chipBg: [22, 46, 32],
        blockquoteBg: [19, 38, 27],
        codeBlockBg: [6, 12, 8],
        codeBlockText: [236, 253, 245],
        codeBlockBorder: [31, 59, 42],
        heading: [236, 253, 245],
        body: [187, 247, 208],
        muted: [134, 180, 152],
        border: [31, 59, 42],
        accent: [74, 222, 128],
        missingLink: [251, 191, 36],
      },
    },
  },
  {
    id: 'cobalt-monograph',
    name: 'Monografia Cobalto',
    tagline: 'Estética técnica institucional com tipografia geométrica Outfit e índigo profundo.',
    typographyLabel: 'Outfit + Plus Jakarta Sans',
    editionLabel: 'Coleção Técnica',
    lightSwatches: ['bg-[#f4f6fb]', 'bg-[#ffffff]', 'bg-[#4338ca]'],
    darkSwatches: ['bg-[#090c18]', 'bg-[#0f1428]', 'bg-[#818cf8]'],
    metaThemeColor: {
      light: '#4338ca',
      dark: '#0f1428',
    },
    pdf: {
      light: {
        pageBg: [255, 255, 255],
        surfaceBg: [238, 242, 250],
        chipBg: [228, 234, 248],
        blockquoteBg: [241, 244, 252],
        codeBlockBg: [15, 20, 40],
        codeBlockText: [224, 231, 255],
        codeBlockBorder: [213, 222, 240],
        heading: [15, 23, 42],
        body: [30, 41, 59],
        muted: [91, 104, 134],
        border: [213, 222, 240],
        accent: [67, 56, 202],
        missingLink: [180, 83, 9],
      },
      dark: {
        pageBg: [15, 20, 40],
        surfaceBg: [9, 12, 24],
        chipBg: [30, 38, 72],
        blockquoteBg: [22, 29, 56],
        codeBlockBg: [6, 8, 17],
        codeBlockText: [224, 231, 255],
        codeBlockBorder: [38, 48, 86],
        heading: [248, 250, 252],
        body: [199, 210, 254],
        muted: [148, 163, 204],
        border: [38, 48, 86],
        accent: [129, 140, 248],
        missingLink: [251, 191, 36],
      },
    },
  },
  {
    id: 'windows-1',
    name: 'Windows 1.0 (1985)',
    tagline:
      'Janelas em mosaico sem cantos arredondados, bordas pretas nítidas, papel branco e azul EGA clássico.',
    typographyLabel: 'IBM Plex Mono + IBM Plex Sans',
    editionLabel: 'Coleção Retrô',
    lightSwatches: ['bg-[#c6d3d6]', 'bg-[#ffffff]', 'bg-[#0000aa]'],
    darkSwatches: ['bg-[#04080e]', 'bg-[#0b1220]', 'bg-[#38bdf8]'],
    metaThemeColor: {
      light: '#0000aa',
      dark: '#0b1220',
    },
    pdf: {
      light: {
        pageBg: [255, 255, 255],
        surfaceBg: [232, 238, 240],
        chipBg: [216, 226, 230],
        blockquoteBg: [240, 245, 246],
        codeBlockBg: [0, 0, 0],
        codeBlockText: [255, 255, 255],
        codeBlockBorder: [0, 0, 0],
        heading: [0, 0, 0],
        body: [17, 24, 39],
        muted: [68, 80, 92],
        border: [0, 0, 0],
        accent: [0, 0, 170],
        missingLink: [170, 0, 0],
      },
      dark: {
        pageBg: [11, 18, 32],
        surfaceBg: [4, 8, 14],
        chipBg: [22, 34, 56],
        blockquoteBg: [15, 25, 44],
        codeBlockBg: [2, 5, 10],
        codeBlockText: [224, 242, 254],
        codeBlockBorder: [56, 189, 248],
        heading: [248, 250, 252],
        body: [219, 234, 254],
        muted: [148, 163, 184],
        border: [56, 189, 248],
        accent: [56, 189, 248],
        missingLink: [251, 191, 36],
      },
    },
  },
];

const THEME_BY_ID = new Map<string, WikiThemeDefinition>(WIKI_THEMES.map((t) => [t.id, t]));

export function isRegisteredWikiThemeId(id?: string | null): id is WikiThemeId {
  return Boolean(id && THEME_BY_ID.has(id));
}

export function getWikiThemeById(id?: string | null): WikiThemeDefinition {
  if (id && THEME_BY_ID.has(id)) {
    return THEME_BY_ID.get(id)!;
  }
  return THEME_BY_ID.get(DEFAULT_WIKI_THEME_ID)!;
}
