'use client'

import { ShowTelaShell } from './ShowTelaShell'
import type { ShowTelaViewModel } from './types'

export function ShowTelaRuntime({ vm, user }: { vm: ShowTelaViewModel; user?: { name: string; email: string; image: string } }) {
  return (
    <ShowTelaShell
      vm={vm}
      onPearlDrop={() => {}}
      user={user}
    />
  )
}
