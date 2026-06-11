// TODO: Add rate limiting before auth (Phase 3 is pre-auth MVP).
// Rate limit by IP once Upstash/Redis is wired in (Phase 4).
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { runPipeline } from '@/agents/orchestrator'
import { createRunStore, pushEvent, markRunDone } from '@/lib/pipeline-events'
import type { ChannelConfig, SSEEvent } from '@/types'

// Pre-auth stub. Replaced in Phase 4 with real Clerk userId.
// Do not ship DRY_RUN=false with this value in production.
const PRE_AUTH_USER_ID = 'anonymous'

const schema = z.object({
  configId: z.string().uuid(),
  topic: z
    .string()
    .min(1)
    .max(500)
    // eslint-disable-next-line no-control-regex
    .transform(s => s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')),
})

export async function POST(req: NextRequest) {
  // ── 1. Parse + validate body ───────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const { configId, topic } = parsed.data

  // ── 2. Generate runId ──────────────────────────────────────────────────────
  const runId = crypto.randomUUID()

  // ── 3. Fetch config from Supabase ──────────────────────────────────────────
  const supabase = getSupabaseServerClient()
  const { data: row, error: fetchError } = await supabase
    .from('channel_configs')
    .select(
      'id, user_id, name, niche, tone, script_structure, target_duration_min, forbidden_topics, voice_id, voice_model, yt_title_template, yt_description_template, yt_tags, yt_category_id, yt_privacy, created_at, updated_at',
    )
    .eq('id', configId)
    .single()

  if (fetchError || !row) {
    return Response.json({ error: 'Config not found' }, { status: 404 })
  }

  // ── 4. Map snake_case columns to ChannelConfig camelCase ──────────────────
  const config: ChannelConfig = {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    niche: row.niche,
    tone: row.tone,
    scriptStructure: row.script_structure,
    targetDurationMin: row.target_duration_min,
    forbiddenTopics: row.forbidden_topics,
    voiceId: row.voice_id,
    voiceModel: row.voice_model,
    ytTitleTemplate: row.yt_title_template,
    ytDescriptionTemplate: row.yt_description_template,
    ytTags: row.yt_tags,
    ytCategoryId: row.yt_category_id,
    ytPrivacy: row.yt_privacy,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

  // ── 5. Insert initial pipeline_runs row ────────────────────────────────────
  const now = new Date().toISOString()
  const { error: insertError } = await supabase.from('pipeline_runs').insert({
    id: runId,
    user_id: PRE_AUTH_USER_ID, // pre-auth stub — replaced in Phase 4 with real userId
    config_id: configId,
    topic,
    status: 'running',
    created_at: now,
    updated_at: now,
  })

  if (insertError) {
    console.error('[api/pipeline] Failed to create pipeline_runs row:', insertError.message)
    return Response.json({ error: 'Failed to create pipeline run' }, { status: 500 })
  }

  // ── 6. Create event store ──────────────────────────────────────────────────
  createRunStore(runId)

  // ── 7. Fire pipeline async — do NOT await ─────────────────────────────────
  runPipeline(runId, topic, config, '', (event: SSEEvent) => {
    pushEvent(runId, event)
    if (event.type === 'pipeline_done' || event.type === 'pipeline_error') {
      markRunDone(runId)
    }
  }).catch(err => console.error('[api/pipeline] runPipeline threw:', err))

  // ── 8. Return runId immediately ────────────────────────────────────────────
  return Response.json({ data: { runId } }, { status: 200 })
}
