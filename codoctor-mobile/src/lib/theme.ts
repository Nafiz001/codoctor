// Codoctor design tokens — mirrors the web app's tailwind palette
// Warm clay/terracotta brand + warm neutral slate + brick red + sage green

export const colors = {
  // Paper / surface
  paper: '#FBF7F0',
  surface: '#FFFFFF',
  surfaceCard: '#FDFBF8',

  // Ink
  ink: '#2A2320',
  inkSoft: '#483E37',
  inkMuted: '#6E625A',
  inkFaint: '#A99C8F',

  // Brand — warm clay / terracotta
  brand50: '#FAF1EB',
  brand100: '#F3DECF',
  brand200: '#E6BB9F',
  brand300: '#D89870',
  brand400: '#C9774A',
  brand500: '#B85C38',
  brand600: '#9F4E2E',
  brand700: '#813F27',

  // Slate — warm neutrals
  slate50: '#FAF7F2',
  slate100: '#F2ECE3',
  slate200: '#E6DCCF',
  slate300: '#D4C7B5',
  slate400: '#B3A491',
  slate500: '#8C7E6D',
  slate600: '#6E6253',
  slate700: '#564C40',
  slate800: '#3B3329',
  slate900: '#2A2320',

  // Red — brick / danger
  red50: '#FBEDEA',
  red100: '#F6D9D2',
  red200: '#EBB3A6',
  red500: '#C0392B',
  red600: '#A52E22',
  red700: '#87271E',

  // Amber — caution
  amber50: '#FFF8ED',
  amber100: '#FDEECB',
  amber500: '#D97706',
  amber600: '#B45309',
  amber700: '#92400E',

  // Emerald — sage green / ok
  emerald50: '#EEF3F0',
  emerald100: '#D9E5DE',
  emerald500: '#57796B',
  emerald600: '#466356',

  // Sky — info
  sky50: '#EFF8FF',
  sky100: '#DBEFFE',
  sky500: '#0369A1',
  sky600: '#075985',

  // Indigo
  indigo50: '#EEF2FF',
  indigo100: '#E0E7FF',
  indigo500: '#6366F1',
  indigo600: '#4F46E5',

  // Pure white/black
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#2A2320',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#2A2320',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#2A2320',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// Tone palette — maps AgentKey tones to color sets
export interface TonePalette {
  bg: string;
  border: string;
  text: string;
  badge: string;
  badgeText: string;
}

export const TONE_PALETTES: Record<string, TonePalette> = {
  brand: {
    bg: colors.brand50,
    border: colors.brand200,
    text: colors.brand700,
    badge: colors.brand500,
    badgeText: colors.white,
  },
  red: {
    bg: colors.red50,
    border: colors.red200,
    text: colors.red700,
    badge: colors.red500,
    badgeText: colors.white,
  },
  amber: {
    bg: colors.amber50,
    border: colors.amber100,
    text: colors.amber700,
    badge: colors.amber500,
    badgeText: colors.white,
  },
  sky: {
    bg: colors.sky50,
    border: colors.sky100,
    text: colors.sky600,
    badge: colors.sky500,
    badgeText: colors.white,
  },
  indigo: {
    bg: colors.indigo50,
    border: colors.indigo100,
    text: colors.indigo600,
    badge: colors.indigo500,
    badgeText: colors.white,
  },
  emerald: {
    bg: colors.emerald50,
    border: colors.emerald100,
    text: colors.emerald600,
    badge: colors.emerald500,
    badgeText: colors.white,
  },
  slate: {
    bg: colors.slate50,
    border: colors.slate200,
    text: colors.slate600,
    badge: colors.slate500,
    badgeText: colors.white,
  },
};
