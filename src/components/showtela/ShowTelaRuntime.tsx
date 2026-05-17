'use client'

import { ShowTelaShell } from './ShowTelaShell'
import type { ShowTelaViewModel } from './types'

export function ShowTelaRuntime({ vm }: { vm: ShowTelaViewModel }) {
  return (
    <ShowTelaShell
      vm={vm}
      onPearlDrop={() => {}}
    />
  )
}
