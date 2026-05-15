import type { DurableArtifactRow, DurableEntityRow, DurableSnapshotRow } from './schema'

type Store = {
  artifacts: DurableArtifactRow[]
  entities: DurableEntityRow[]
  snapshots: DurableSnapshotRow[]
  ingestionJobs: Array<Record<string, unknown>>
}

const globalStore: Store = { artifacts: [], entities: [], snapshots: [], ingestionJobs: [] }

export function getSupabaseClient() {
  return {
    store: globalStore,
  }
}
