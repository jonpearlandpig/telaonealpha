import { colors } from './colors'
import { radius } from './radius'
import { shadows } from './shadows'

export const glass = {
  card: {
    background: `linear-gradient(160deg, ${colors.glassLight}, ${colors.glassDark})`,
    border: `1px solid ${colors.border}`,
    backdropFilter: 'blur(8px)',
    borderRadius: radius.card,
    boxShadow: `${shadows.card}, ${shadows.inset}`,
  },
} as const
