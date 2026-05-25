import { createRuntimeEvent, type RuntimeEvent, type RuntimeEventHandler, type RuntimeEventInput } from './runtimeTypes'

const WILDCARD = '*'

class RuntimeEventBus {
  private subscribers = new Map<string, Set<RuntimeEventHandler>>()

  subscribe(type: string, handler: RuntimeEventHandler): () => void {
    const current = this.subscribers.get(type) ?? new Set<RuntimeEventHandler>()
    current.add(handler)
    this.subscribers.set(type, current)

    return () => {
      const active = this.subscribers.get(type)
      if (!active) return
      active.delete(handler)
      if (active.size === 0) this.subscribers.delete(type)
    }
  }

  async emit<TPayload extends Record<string, unknown>>(input: RuntimeEventInput<TPayload>): Promise<RuntimeEvent<TPayload>> {
    const event = createRuntimeEvent(input)
    await this.dispatch(event)
    return event
  }

  async dispatch(event: RuntimeEvent): Promise<PromiseSettledResult<void>[]> {
    const handlers = new Set<RuntimeEventHandler>([
      ...(this.subscribers.get(event.type) ?? []),
      ...(this.subscribers.get(WILDCARD) ?? []),
    ])

    return Promise.allSettled(
      [...handlers].map(async (handler) => {
        await handler(event)
      }),
    )
  }
}

declare global {
  var __telaRuntimeEventBus: RuntimeEventBus | undefined
}

export function getRuntimeEventBus(): RuntimeEventBus {
  if (!globalThis.__telaRuntimeEventBus) {
    globalThis.__telaRuntimeEventBus = new RuntimeEventBus()
  }
  return globalThis.__telaRuntimeEventBus
}

export function subscribe(type: string, handler: RuntimeEventHandler) {
  return getRuntimeEventBus().subscribe(type, handler)
}

export function emitRuntimeEvent<TPayload extends Record<string, unknown>>(input: RuntimeEventInput<TPayload>) {
  return getRuntimeEventBus().emit(input)
}

export function dispatchRuntimeEvent(event: RuntimeEvent) {
  return getRuntimeEventBus().dispatch(event)
}
