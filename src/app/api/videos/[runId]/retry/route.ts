import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { runPipeline } from '@/agents/orchestrator'
import type { PriorResults } from '@/agents/orchestrator'
import { createRunStore, pushEvent, markRunDone } from '@/lib/pipeline-events'
import { getValidYouTubeToken } from '@/lib/youtube-token-refresh'
import type { ChannelConfig, SSEEvent, AgentResult, SourcePackage, VoiceOutput, VideoOutput } from '@/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  // ── 0. Auth ────────────────────────────────────────────────────────────────
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 0a. Rate limit ─────────────────────────────────────────────────────────
  const { limited, retryAfterSeconds } = checkRateLimit(`pipeline-retry:${userId}`, { windowMs: 60_000, max: 10 })
  if (limited) {
    return Response.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    })
  }

  // ── 1. Validate runId ──────────────────────────────────────────────────────
  const { runId } = await params
  if (!UUID_RE.test(runId)) {
    return Response.json({ error: 'Invalid run ID' }, { status: 400 })
  }

  // ── 2. Resolve Supabase user ───────────────────────────────────────────────
  const supabase = getSupabaseServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, tier')
    .eq('clerk_id', userId)
    .single()
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  // ── 3. Fetch existing run (ownership check) ────────────────────────────────
  const { data: run } = await supabase
    .from('videos')
    .select('id, user_id, config_id, topic, status, research_result, script_result, voice_result, video_result, is_dry_run')
    .eq('id', runId)
    .eq('user_id', user.id)
    .single()

  if (!run) return Response.json({ error: 'Run not found' }, { status: 404 })

  // ── 4. Guard: only retry partial or failed runs ────────────────────────────
  if (run.status !== 'partial' && run.status !== 'failed') {
    return Response.json({ error: 'Run is not in a retryable state' }, { status: 409 })
  }

  // ── 5. Build priorResults from stored successful stages ────────────────────
  const priorResults: PriorResults = {}
  const research = run.research_result as AgentResult<SourcePackage> | null
  const script = run.script_result as AgentResult<string> | null
  const voice = run.voice_result as AgentResult<VoiceOutput> | null
  const video = run.video_result as AgentResult<VideoOutput> | null

  if (research?.status === 'success') priorResults.research = research
  if (script?.status === 'success') priorResults.script = script
  if (voice?.status === 'success') priorResults.voice = voice
  if (video?.status === 'success') priorResults.video = video

  // Must have at least one successful stage to retry (otherwise start fresh)
  const hasAnyPrior = Object.keys(priorResults).length > 0
  if (!hasAnyPrior) {
    return Response.json({ error: 'No successful stages to resume from — start a new run instead' }, { status: 409 })
  }

  // ── 6. Fetch config ────────────────────────────────────────────────────────
  const { data: row } = await supabase
    .from('channel_configs')
    .select('id, user_id, name, niche, tone, script_structure, target_duration_min, forbidden_topics, voice_id, voice_model, yt_title_template, yt_description_template, yt_tags, yt_category_id, yt_privacy, created_at, updated_at')
    .eq('id', run.config_id)
    .eq('user_id', user.id)
    .single()

  if (!row) return Response.json({ error: 'Config not found' }, { status: 404 })

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

  // ── 7. Reset run status to running ────────────────────────────────────────
  await supabase
    .from('videos')
    .update({ status: 'running', updated_at: new Date().toISOString() })
    .eq('id', runId)

  // ── 8. Create fresh event store ────────────────────────────────────────────
  createRunStore(runId)

  // ── 9. Resolve YouTube token ───────────────────────────────────────────────
  const { accessToken: youtubeAccessToken } = await getValidYouTubeToken(user.id)

  // ── 10. Fire pipeline async ────────────────────────────────────────────────
  runPipeline(
    runId,
    run.topic,
    config,
    youtubeAccessToken,
    (event: SSEEvent) => {
      pushEvent(runId, event)
      if (event.type === 'pipeline_done' || event.type === 'pipeline_error') {
        markRunDone(runId)
      }
    },
    {
      isDryRun: run.is_dry_run ?? false,
      userTier: user.tier ?? 'free',
      priorResults,
    },
  ).catch(err => console.error('[api/videos/retry] runPipeline threw:', err))

  return Response.json({ data: { runId } }, { status: 200 })
}
