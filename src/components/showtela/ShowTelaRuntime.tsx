'use client'

import { ShowTelaShell } from './ShowTelaShell'
import type { ShowTelaViewModel } from './types'

export function ShowTelaRuntime({ vm, isDemoMode = false }: { vm: ShowTelaViewModel; isDemoMode?: boolean }) {
  return (
    <ShowTelaShell
      vm={vm}
      isDemoMode={isDemoMode}
    />
  )
}
