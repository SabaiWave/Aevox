import type { SSEEvent } from '@/types'

interface RunEventStore {
  events: SSEEvent[]
  done: boolean
}

const store = new Map<string, RunEventStore>()

export function createRunStore(runId: string): void {
  store.set(runId, { events: [], done: false })
  // Safety cleanup — if stream client disconnects before pipeline_done, this prevents leak
  setTimeout(() => store.delete(runId), 5 * 60 * 1000) // 5 min TTL
}

export function pushEvent(runId: string, event: SSEEvent): void {
  const run = store.get(runId)
  if (run) run.events.push(event)
}

export function markRunDone(runId: string): void {
  const run = store.get(runId)
  if (run) run.done = true
}

export function getRunStore(runId: string): RunEventStore | undefined {
  return store.get(runId)
}

export function deleteRunStore(runId: string): void {
  store.delete(runId)
}
