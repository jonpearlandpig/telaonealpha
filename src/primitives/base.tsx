'use client'

import type { CSSProperties, PropsWithChildren } from 'react'
import { colors } from '@/design/colors'
import { glass } from '@/design/glass'
import { spacing } from '@/design/spacing'
import { typography } from '@/design/typography'

export type PrimitiveProps = PropsWithChildren<{ title?: string; subtitle?: string; style?: CSSProperties }>

export function PrimitiveCard({ title, subtitle, style, children }: PrimitiveProps) {
  return (
    <section style={{ ...glass.card, padding: spacing.lg, color: colors.cream, ...style }}>
      {title && <h3 style={{ margin: 0, ...typography.title }}>{title}</h3>}
      {subtitle && <p style={{ margin: '6px 0 0', color: colors.muted, ...typography.body }}>{subtitle}</p>}
      {children ? <div style={{ marginTop: spacing.md }}>{children}</div> : null}
    </section>
  )
}
