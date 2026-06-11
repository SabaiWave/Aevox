import { NextRequest } from 'next/server'
import { getRunStore, deleteRunStore } from '@/lib/pipeline-events'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(runId)) {
    return new Response(
      `data: ${JSON.stringify({ type: 'pipeline_error', message: 'Invalid run ID', timestamp: new Date().toISOString() })}\n\n`,
      {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        status: 400,
      },
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let sentCount = 0
      const maxWaitMs = 120_000 // 2 min timeout
      const startMs = Date.now()

      const send = (event: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        )
      }

      while (true) {
        const runStore = getRunStore(runId)

        if (!runStore) {
          send({ type: 'pipeline_error', message: 'Run not found', timestamp: new Date().toISOString() })
          break
        }

        // Send any new events
        while (sentCount < runStore.events.length) {
          send(runStore.events[sentCount])
          sentCount++
        }

        if (runStore.done) {
          deleteRunStore(runId)
          break
        }

        if (Date.now() - startMs > maxWaitMs) {
          send({ type: 'pipeline_error', message: 'Stream timeout', timestamp: new Date().toISOString() })
          break
        }

        // Poll every 250ms
        await new Promise(r => setTimeout(r, 250))
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
