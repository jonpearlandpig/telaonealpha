import { subscribe, getRuntimeEventBus } from './eventBus'
import { persistRuntimeEvent } from './eventStore'
import { persistRuntimeDerivations } from './orchestrationPersistence'

declare global {
  var __telaRuntimeBootstrapReady: boolean | undefined
}

export function bootstrapRuntimeSpine() {
  const bus = getRuntimeEventBus()

  if (!globalThis.__telaRuntimeBootstrapReady) {
    subscribe('*', async (event) => {
      await persistRuntimeEvent(event)
      await persistRuntimeDerivations(event)
    })
    globalThis.__telaRuntimeBootstrapReady = true
  }

  return bus
}
