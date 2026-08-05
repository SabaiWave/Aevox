import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import type { AgentResult, PipelineStage } from '@/types'

export const maxDuration = 300

const STAGES: PipelineStage[] = ['research', 'script', 'voice', 'video', 'publish']

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  // ── 0. Auth ────────────────────────────────────────────────────────────────
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

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

  // ── 1. Verify run ownership ────────────────────────────────────────────────
  const supabase = getSupabaseServerClient()
  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single()
  if (!userRow) {
    return new Response(
      `data: ${JSON.stringify({ type: 'pipeline_error', message: 'User not found', timestamp: new Date().toISOString() })}\n\n`,
      {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        status: 403,
      },
    )
  }

  const { data: runRow } = await supabase
    .from('videos')
    .select('id')
    .eq('id', runId)
    .eq('user_id', userRow.id)
    .single()
  if (!runRow) {
    return new Response(
      `data: ${JSON.stringify({ type: 'pipeline_error', message: 'Run not found', timestamp: new Date().toISOString() })}\n\n`,
      {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
        status: 403,
      },
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const maxWaitMs = 600_000
      const startMs = Date.now()

      const send = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      // Track which stages we've already emitted events for
      const reported = new Set<PipelineStage>()
      let currentRunning: PipelineStage | null = null

      while (true) {
        const { data: row } = await supabase
          .from('videos')
          .select('status, research_result, script_result, voice_result, video_result, publish_result')
          .eq('id', runId)
          .single()

        if (!row) {
          send({ type: 'pipeline_error', message: 'Run not found', timestamp: new Date().toISOString() })
          break
        }

        const results: Record<PipelineStage, AgentResult<unknown> | null> = {
          research: row.research_result as AgentResult<unknown> | null,
          script: row.script_result as AgentResult<unknown> | null,
          voice: row.voice_result as AgentResult<unknown> | null,
          video: row.video_result as AgentResult<unknown> | null,
          publish: row.publish_result as AgentResult<unknown> | null,
        }

        // Emit complete/failed for any newly finished stages
        for (const stage of STAGES) {
          if (reported.has(stage)) continue
          const result = results[stage]
          if (!result) continue

          reported.add(stage)
          if (result.status === 'failed' || result.status === 'degraded') {
            send({ type: 'stage_failed', stage, state: 'failed', message: result.error, timestamp: new Date().toISOString() })
          } else {
            send({ type: 'stage_complete', stage, state: 'complete', data: result, timestamp: new Date().toISOString() })
          }
        }

        // Check for terminal status
        if (row.status !== 'running') {
          send({ type: 'pipeline_done', status: row.status, timestamp: new Date().toISOString() })
          break
        }

        // Infer which stage is currently running (first with no result yet)
        const inferredRunning = STAGES.find(s => !results[s]) ?? null
        if (inferredRunning && inferredRunning !== currentRunning) {
          send({ type: 'stage_start', stage: inferredRunning, state: 'running', timestamp: new Date().toISOString() })
          currentRunning = inferredRunning
        }

        if (Date.now() - startMs > maxWaitMs) {
          send({ type: 'pipeline_error', message: 'Stream timeout', timestamp: new Date().toISOString() })
          break
        }

        await new Promise(r => setTimeout(r, 500))
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

