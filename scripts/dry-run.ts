/**
 * Runs the full pipeline in DRY_RUN mode — fixture data, zero API spend, real DB writes.
 * Usage: npm run pipeline:dry
 *
 * Env: DRY_RUN=true is set by the npm script. Supabase write failures are non-fatal.
 */
import { randomUUID } from 'crypto'
import { darkloreConfig } from '../src/__fixtures__/configs/darklore'
import { runPipeline } from '../src/agents/orchestrator'

const TOPIC = 'The Pontianak — Malaysian vampire ghost'
const RUN_ID = randomUUID()

console.log(`\n[dry-run] runId: ${RUN_ID}`)
console.log(`[dry-run] topic: ${TOPIC}`)
console.log(`[dry-run] config: ${darkloreConfig.name}\n`)

function onEvent(event: { type: string; stage?: string; state?: string; message?: string }) {
  const stage = event.stage ? ` [${event.stage}]` : ''
  const msg = event.message ? ` — ${event.message}` : ''
  console.log(`  ${event.type}${stage}${msg}`)
}

runPipeline(RUN_ID, TOPIC, darkloreConfig, '', onEvent)
  .then((result) => {
    console.log(`\n[dry-run] status: ${result.status}`)
    console.log(`[dry-run] duration: ${result.totalDurationMs}ms`)
    if (result.research?.status) console.log(`  research : ${result.research.status}`)
    if (result.script?.status)   console.log(`  script   : ${result.script.status}`)
    if (result.voice?.status)    console.log(`  voice    : ${result.voice.status}`)
    if (result.publish?.status)  console.log(`  publish  : ${result.publish.status}`)
    if (result.degradedContext?.gapMessages.length) {
      console.log(`\n[dry-run] degraded:`)
      result.degradedContext.gapMessages.forEach((m) => console.log(`  - ${m}`))
    }
    console.log()
    process.exit(result.status === 'complete' ? 0 : 1)
  })
  .catch((err) => {
    console.error('[dry-run] fatal:', err)
    process.exit(1)
  })
