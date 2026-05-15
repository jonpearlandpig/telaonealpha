'use client'
import { colors } from '@/design/colors'
import { layout } from '@/design/layout'
import { shadows } from '@/design/shadows'

export function HomeHeader() {
  const action = { width: layout.touchTarget, height: layout.touchTarget }
  return (
    <header style={{ height: layout.headerHeight, background: colors.overlay, boxShadow: shadows.header }} className='sticky top-0 z-40 backdrop-blur-md border-b border-[var(--border)] px-6 py-5 flex items-end justify-between'>
      <h1 className='text-3xl tracking-tight' style={{ fontFamily: 'var(--font-canela)', color: colors.textPrimary }}>ShowTELA</h1>
      <div className='flex gap-2'>
        {['🔔','⌕','✉️'].map((icon) => <button key={icon} style={action} className='rounded-full border border-[var(--border)] bg-white text-sm'>{icon}</button>)}
      </div>
    </header>
  )
}
