export const runtime = 'nodejs'
export const maxDuration = 120

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/is-admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { runPipeline } from '@/agents/orchestrator'
import { log } from '@/lib/logger'
import type { ChannelConfig, PipelineResult } from '@/types'

// Hardcoded DarkLore smoke-test fixture — used when no configId is supplied
const DARKLORE_TOPIC = "The Pontianak: Malaysia's Most Feared Ghost"

const schema = z.object({
  configId: z.string().uuid().optional(),
  topic: z.string().min(1).max(500).optional(),
})

export async function POST(req: NextRequest) {
  // ── 0. Auth ────────────────────────────────────────────────────────────────
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Not found' }, { status: 404 })

  // ── 1. Admin gate — 404 to avoid leaking route existence to non-admins ─────
  const adminOk = await isAdmin()
  if (!adminOk) return Response.json({ error: 'Not found' }, { status: 404 })

  // ── 2. Rate limit: 3 req/hour per userId (pipeline runs are expensive) ─────
  const { limited, retryAfterSeconds } = await checkRateLimit(`debug:pipeline:${userId}`, {
    windowMs: 3_600_000, // 1 hour
    max: 3,
  })
  if (limited) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
    )
  }

  // ── 3. Parse body — both params optional; defaults to DarkLore fixture ──────
  let raw: unknown = {}
  try {
    raw = await req.json()
  } catch {
    // empty body is fine — all params have defaults
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request body' },
      { status: 400 },
    )
  }

  const topic = parsed.data.topic ?? DARKLORE_TOPIC
  const configId = parsed.data.configId

  // ── 4. Resolve admin's Supabase user record ───────────────────────────────
  const supabase = getSupabaseServerClient()
  const { data: adminUser } = await supabase
    .from('users')
    .select('id, tier')
    .eq('clerk_id', userId)
    .single()

  if (!adminUser) {
    return Response.json({ error: 'Admin user not found in Supabase' }, { status: 404 })
  }

  const userUuid: string = adminUser.id
  const tier: string = adminUser.tier ?? 'pro'

  // ── 5. Build ChannelConfig ────────────────────────────────────────────────
  let config: ChannelConfig

  if (configId) {
    // Fetch real config — admin bypass, no user_id scoping
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

    config = {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      niche: row.niche,
      tone: row.tone,
      scriptStructure: row.script_structure,
      targetDurationMin: row.target_duration_min,
      forbiddenTopics: row.forbidden_topics ?? [],
      voiceId: row.voice_id,
      voiceModel: row.voice_model,
      ytTitleTemplate: row.yt_title_template,
      ytDescriptionTemplate: row.yt_description_template,
      ytTags: row.yt_tags ?? [],
      ytCategoryId: row.yt_category_id,
      ytPrivacy: row.yt_privacy,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  } else {
    // Hardcoded DarkLore fixture — userId set to admin so quota checks resolve
    const now = new Date().toISOString()
    config = {
      id: 'debug-darklore-fixture',
      userId: userUuid,
      name: 'DarkLore (Debug Fixture)',
      niche: 'SE Asia folklore and urban legends',
      tone: 'mysterious, atmospheric, educational',
      scriptStructure: 'hook → origin story → modern sightings → cultural significance → close',
      targetDurationMin: 8,
      forbiddenTopics: [],
      voiceId: 'debug-fixture',
      voiceModel: 'eleven_multilingual_v2',
      ytTitleTemplate: '{{title}} | DarkLore',
      ytDescriptionTemplate: '{{description}}',
      ytTags: ['folklore', 'SE Asia', 'urban legends'],
      ytCategoryId: '22',
      ytPrivacy: 'private',
      createdAt: now,
      updatedAt: now,
    }
  }

  // ── 6. Insert initial videos row before pipeline runs ─────────────────────
  const runId = crypto.randomUUID()
  const now = new Date().toISOString()

  const { error: insertError } = await supabase.from('videos').insert({
    id: runId,
    user_id: userUuid,
    config_id: configId ?? null,
    topic,
    status: 'running',
    is_dry_run: true,
    created_at: now,
    updated_at: now,
  })

  if (insertError) {
    await log.error('[debug/pipeline] Failed to insert videos row', {
      error: insertError.message,
      runId,
    })
    return Response.json({ error: 'Failed to create debug run' }, { status: 500 })
  }

  // ── 7. Force DRY_RUN=true regardless of env — this is a debug tool ────────
  const prevDryRun = process.env.DRY_RUN
  process.env.DRY_RUN = 'true'

  let result: PipelineResult
  try {
    result = await runPipeline(
      runId,
      topic,
      config,
      '', // no YouTube OAuth token — publish stage degrades gracefully on dry run
      undefined, // no SSE — synchronous collect mode
      { isDryRun: true, userTier: tier },
    )
  } catch (err) {
    await supabase
      .from('videos')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', runId)
    await log.error('[debug/pipeline] runPipeline threw unexpectedly', { runId, error: String(err) })
    return Response.json({ error: 'Pipeline failed unexpectedly' }, { status: 500 })
  } finally {
    // Restore env var regardless of outcome
    if (prevDryRun === undefined) {
      delete process.env.DRY_RUN
    } else {
      process.env.DRY_RUN = prevDryRun
    }
  }

  // Ensure final status is persisted — orchestrator may conflict with the pre-inserted row
  const finalStatus = result.status === 'complete' ? 'complete' : result.status
  await supabase
    .from('videos')
    .update({ status: finalStatus, updated_at: new Date().toISOString() })
    .eq('id', runId)

  await log.info('[debug/pipeline] Dry-run complete', { runId, status: result.status })

  return Response.json({ data: result }, { status: 200 })
}
