import type { Scheme } from '@/settings/resolve';

export const palettes = {
  light: {
    background: '#F7F7F7',
    surface: '#EFEFEF',
    accent: '#1C1C1E',
    onAccent: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#8E8E93',
    placeholder: '#B5B5BA',
    danger: '#FF3B30',
  },
  dark: {
    background: '#0B0B0C',
    surface: '#1C1C1E',
    accent: '#F2F2F2',
    onAccent: '#1C1C1E',
    text: '#F2F2F2',
    textSecondary: '#8E8E93',
    placeholder: '#5A5A5F',
    danger: '#FF453A',
  },
} as const satisfies Record<Scheme, Record<string, string>>;

export type Colors = { [K in keyof (typeof palettes)['light']]: string };

export const radius = { sm: 12, md: 16, lg: 20, xl: 24, full: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const typography = {
  largeTitle: { fontSize: 34, fontWeight: '800' },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 17, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '600' },
} as const;

/** Program card gradients: [top-left, bottom-right]. */
export const programGradients = {
  pink: ['#FF9ACB', '#FF5E9C'],
  lilac: ['#D9B8FF', '#A98BFF'],
  coral: ['#FF8A65', '#FF4E3A'],
  blue: ['#7CC4FF', '#3D8BFF'],
  purple: ['#B07CFF', '#7B3DFF'],
  amber: ['#FFD36B', '#FF9A3D'],
} as const;

export type ProgramColor = keyof typeof programGradients;

/** Settings stats card: deeper than the program blue so white text stays readable. */
export const statsGradient = ['#3A8DFF', '#1466F0'] as const;
