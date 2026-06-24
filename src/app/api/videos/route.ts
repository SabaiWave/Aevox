import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/is-admin'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { runPipeline } from '@/agents/orchestrator'
import { createRunStore, pushEvent, markRunDone } from '@/lib/pipeline-events'
import { checkRateLimit } from '@/lib/rate-limit'
import { getValidYouTubeToken } from '@/lib/youtube-token-refresh'
import type { ChannelConfig, SSEEvent } from '@/types'

const schema = z.object({
  configId: z.string().uuid(),
  topic: z
    .string()
    .min(1)
    .max(500)
    .transform(s => s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')),
  dryRun: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  // ── 0. Auth ────────────────────────────────────────────────────────────────
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 0a. Rate limit (by userId, post-auth) ─────────────────────────────────
  const { limited, retryAfterSeconds } = checkRateLimit(`pipeline:${userId}`, { windowMs: 60_000, max: 20 })
  if (limited) {
    return Response.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    })
  }

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

  const { configId, topic, dryRun } = parsed.data

  // ── 1a. Validate dryRun — admin only ──────────────────────────────────────
  if (dryRun) {
    const adminOk = await isAdmin()
    if (!adminOk) return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── 2. Generate runId ──────────────────────────────────────────────────────
  const runId = crypto.randomUUID()

  // ── 3. Resolve Clerk userId → internal uuid ────────────────────────────────
  const supabase = getSupabaseServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single()
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })
  const userUuid = user.id

  // ── 4. Fetch config from Supabase (scoped to this user) ───────────────────
  const { data: row, error: fetchError } = await supabase
    .from('channel_configs')
    .select(
      'id, user_id, name, niche, tone, script_structure, target_duration_min, forbidden_topics, voice_id, voice_model, yt_title_template, yt_description_template, yt_tags, yt_category_id, yt_privacy, created_at, updated_at',
    )
    .eq('id', configId)
    .eq('user_id', userUuid)
    .single()

  if (fetchError || !row) {
    return Response.json({ error: 'Config not found' }, { status: 404 })
  }

  // ── 5. Map snake_case columns to ChannelConfig camelCase ──────────────────
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

  // ── 6. Insert initial videos row ──────────────────────────────────────────
  const now = new Date().toISOString()
  const { error: insertError } = await supabase.from('videos').insert({
    id: runId,
    user_id: userUuid,
    config_id: configId,
    topic,
    status: 'running',
    created_at: now,
    updated_at: now,
  })

  if (insertError) {
    console.error('[api/videos] Failed to create videos row:', insertError.message)
    return Response.json({ error: 'Failed to create video' }, { status: 500 })
  }

  // ── 7. Create event store ──────────────────────────────────────────────────
  createRunStore(runId)

  // ── 8. Resolve YouTube token (best-effort — pipeline degrades if not connected) ──
  const { accessToken: youtubeAccessToken } = await getValidYouTubeToken(userUuid)

  // ── 9. Fire pipeline async — do NOT await ─────────────────────────────────
  runPipeline(runId, topic, config, youtubeAccessToken, (event: SSEEvent) => {
    pushEvent(runId, event)
    if (event.type === 'pipeline_done' || event.type === 'pipeline_error') {
      markRunDone(runId)
    }
  }, { isDryRun: dryRun }).catch(err => console.error('[api/videos] runPipeline threw:', err))

  // ── 10. Return runId immediately ───────────────────────────────────────────
  return Response.json({ data: { runId } }, { status: 200 })
}
