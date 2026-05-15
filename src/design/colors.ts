export const colors = {
  background: '#0D1B2A',
  surface: '#13263A',
  cream: '#EAE0D2',
  gold: '#C4973A',
  muted: '#8E9BAA',
  border: 'rgba(255,255,255,0.08)',
  glassLight: 'rgba(255,255,255,0.06)',
  glassDark: 'rgba(13,27,42,0.72)',
} as const

export type TelaColorToken = keyof typeof colors
