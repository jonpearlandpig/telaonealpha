import { subscribe, getRuntimeEventBus } from './eventBus'
import { persistRuntimeEvent } from './eventStore'

declare global {
  var __telaRuntimeBootstrapReady: boolean | undefined
}

export function bootstrapRuntimeSpine() {
  const bus = getRuntimeEventBus()

  if (!globalThis.__telaRuntimeBootstrapReady) {
    subscribe('*', async (event) => {
      await persistRuntimeEvent(event)
    })
    globalThis.__telaRuntimeBootstrapReady = true
  }

  return bus
}
