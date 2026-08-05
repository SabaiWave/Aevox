import { ResearchAgent } from '@/agents/research'
import { ScriptAgent } from '@/agents/script'
import { VoiceAgent } from '@/agents/voice'
import { VideoAgent } from '@/agents/video'
import { PublishAgent } from '@/agents/publish'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { checkVoiceQuota } from '@/lib/quota'
import { log } from '@/lib/logger'
import type {
  AgentResult,
  ChannelConfig,
  DegradedContext,
  PipelineResult,
  PipelineRunStatus,
  PublishOutput,
  SourcePackage,
  SSEEvent,
  VideoOutput,
  VoiceOutput,
} from '@/types'

// ─── Cost rates (USD) ─────────────────────────────────────────────────────────

const COST_RATES = {
  tavilyPerSearch: 0.015,
  claudeInputPerMTok: 3.0,
  claudeOutputPerMTok: 15.0,
  elevenLabsPerKChars: 0.18,
  // FAL.ai: flux-dev $0.025/image, flux-pro $0.05/image
  // Update when switching model for production
  falPerImage: 0.025,
}

export interface CostSummary {
  research: { searches: number; usd: number }
  script: { tokensIn: number; tokensOut: number; usd: number }
  voice: { chars: number; usd: number }
  video: { images: number; usd: number }
  totalUsd: number
  reusedStages?: string[]
}

export function buildCostSummary(
  researchResult: AgentResult<SourcePackage> | null,
  scriptResult: AgentResult<string> | null,
  voiceResult: AgentResult<VoiceOutput> | null,
  videoResult: AgentResult<VideoOutput> | null,
  reusedStages?: Set<string>,
): CostSummary {
  const reused = reusedStages ?? new Set<string>()

  const searches = reused.has('research') ? 0 : (researchResult?.usage?.searchCount ?? 0)
  const tokensIn = reused.has('script') ? 0 : (scriptResult?.usage?.tokensIn ?? 0)
  const tokensOut = reused.has('script') ? 0 : (scriptResult?.usage?.tokensOut ?? 0)
  const chars = reused.has('voice') ? 0 : (voiceResult?.usage?.charsUsed ?? voiceResult?.data?.charsUsed ?? 0)
  const images = reused.has('video') ? 0 : (videoResult?.data?.imageCount ?? 0)

  const researchUsd = searches * COST_RATES.tavilyPerSearch
  const scriptUsd =
    (tokensIn / 1_000_000) * COST_RATES.claudeInputPerMTok +
    (tokensOut / 1_000_000) * COST_RATES.claudeOutputPerMTok
  const voiceUsd = (chars / 1000) * COST_RATES.elevenLabsPerKChars
  const videoUsd = images * COST_RATES.falPerImage

  const totalUsd = researchUsd + scriptUsd + voiceUsd + videoUsd

  return {
    research: { searches, usd: researchUsd },
    script: { tokensIn, tokensOut, usd: scriptUsd },
    voice: { chars, usd: voiceUsd },
    video: { images, usd: videoUsd },
    totalUsd,
    reusedStages: reused.size > 0 ? [...reused] : undefined,
  }
}

function logCostSummary(runId: string, cost: CostSummary): void {
  const reused = new Set(cost.reusedStages ?? [])
  void log.info('[orchestrator] cost summary', {
    runId,
    isRetry: reused.size > 0,
    reusedStages: [...reused],
    research: reused.has('research') ? null : { searches: cost.research.searches, usd: cost.research.usd },
    script: reused.has('script') ? null : { tokensIn: cost.script.tokensIn, tokensOut: cost.script.tokensOut, usd: cost.script.usd },
    voice: reused.has('voice') ? null : { chars: cost.voice.chars, usd: cost.voice.usd },
    video: reused.has('video') ? null : { images: cost.video.images, usd: cost.video.usd },
    totalUsd: cost.totalUsd,
  })
}

// ─── buildDegradedContext ─────────────────────────────────────────────────────

export function buildDegradedContext(
  researchResult: AgentResult<SourcePackage> | null,
  scriptResult: AgentResult<string> | null,
  voiceResult: AgentResult<VoiceOutput> | null,
  videoResult: AgentResult<VideoOutput> | null,
  publishResult: AgentResult<PublishOutput> | null,
): DegradedContext {
  const failedStages: string[] = []
  const gapMessages: string[] = []

  const availableData: DegradedContext['availableData'] = {}

  if (researchResult && researchResult.status === 'success' && researchResult.data !== null) {
    availableData.research = researchResult.data
  }
  if (researchResult && (researchResult.status === 'failed' || researchResult.status === 'degraded')) {
    failedStages.push('research')
    gapMessages.push('Research failed — script may lack source context')
  }

  if (scriptResult && scriptResult.status === 'success' && scriptResult.data !== null) {
    availableData.script = scriptResult.data
  }
  if (scriptResult && (scriptResult.status === 'failed' || scriptResult.status === 'degraded')) {
    failedStages.push('script')
    gapMessages.push('Script generation failed — no voiceover available')
  }

  if (voiceResult && voiceResult.status === 'success' && voiceResult.data !== null) {
    availableData.voice = voiceResult.data
  }
  if (voiceResult && (voiceResult.status === 'failed' || voiceResult.status === 'degraded')) {
    failedStages.push('voice')
    gapMessages.push('Voice synthesis failed — no audio file available')
  }

  if (videoResult && videoResult.status === 'success' && videoResult.data !== null) {
    availableData.video = videoResult.data
  }
  if (videoResult && (videoResult.status === 'failed' || videoResult.status === 'degraded')) {
    failedStages.push('video')
    gapMessages.push('Video generation failed — no video file available')
  }

  if (publishResult && publishResult.status === 'success' && publishResult.data !== null) {
    availableData.publish = publishResult.data
  }
  if (publishResult && (publishResult.status === 'failed' || publishResult.status === 'degraded')) {
    failedStages.push('publish')
    gapMessages.push('Publish failed — video not uploaded to YouTube')
  }

  return { failedStages, gapMessages, availableData }
}

// ─── runPipeline ──────────────────────────────────────────────────────────────

export interface PriorResults {
  research?: AgentResult<SourcePackage> | null
  script?: AgentResult<string> | null
  voice?: AgentResult<VoiceOutput> | null
  video?: AgentResult<VideoOutput> | null
}

export async function runPipeline(
  runId: string,
  topic: string,
  config: ChannelConfig,
  oauthToken: string,
  onEvent?: (event: SSEEvent) => void,
  opts?: { isDryRun?: boolean; userTier?: string; priorResults?: PriorResults },
): Promise<PipelineResult> {
  const startMs = Date.now()
  const reusedStages = new Set<string>()

  let researchResult: AgentResult<SourcePackage> | null = null
  let scriptResult: AgentResult<string> | null = null
  let voiceResult: AgentResult<VoiceOutput> | null = null
  let videoResult: AgentResult<VideoOutput> | null = null
  let publishResult: AgentResult<PublishOutput> | null = null

  try {
    const research = new ResearchAgent()
    const script = new ScriptAgent()
    const voice = new VoiceAgent()
    const video = new VideoAgent()
    const publish = new PublishAgent()

    const agentOpts = { dryRun: opts?.isDryRun }

    // ── Stage 1: Research ──────────────────────────────────────────────────
    const priorResearch = opts?.priorResults?.research
    if (priorResearch?.status === 'success' && priorResearch.data) {
      researchResult = priorResearch
      reusedStages.add('research')
      onEvent?.({ type: 'stage_complete', stage: 'research', state: 'complete', data: researchResult, timestamp: new Date().toISOString() })
    } else {
      onEvent?.({ type: 'stage_start', stage: 'research', state: 'running', timestamp: new Date().toISOString() })
      researchResult = await research.run(topic, config, agentOpts)

      if (researchResult.status === 'failed' || !researchResult.data) {
        // Research failed — skip remaining stages
        onEvent?.({ type: 'stage_failed', stage: 'research', state: 'failed', message: researchResult.error, timestamp: new Date().toISOString() })
        const degradedContext = buildDegradedContext(researchResult, null, null, null, null)
        const totalDurationMs = Date.now() - startMs

        await writePipelineRun({
          runId,
          topic,
          config,
          status: 'failed',
          researchResult,
          scriptResult: null,
          voiceResult: null,
          videoResult: null,
          publishResult: null,
          degradedContext,
          isDryRun: opts?.isDryRun,
        })

        onEvent?.({ type: 'pipeline_done', status: 'failed', timestamp: new Date().toISOString() })
        return {
          runId,
          status: 'failed',
          research: researchResult,
          script: null,
          voice: null,
          video: null,
          publish: null,
          degradedContext,
          totalDurationMs,
        }
      }

      onEvent?.({ type: 'stage_complete', stage: 'research', state: 'complete', data: researchResult, timestamp: new Date().toISOString() })
    }

    // ── Stage 2: Script ────────────────────────────────────────────────────
    const priorScript = opts?.priorResults?.script
    if (priorScript?.status === 'success' && priorScript.data) {
      scriptResult = priorScript
      reusedStages.add('script')
      onEvent?.({ type: 'stage_complete', stage: 'script', state: 'complete', data: scriptResult, timestamp: new Date().toISOString() })
    } else {
      onEvent?.({ type: 'stage_start', stage: 'script', state: 'running', timestamp: new Date().toISOString() })
      scriptResult = await script.run(topic, researchResult.data!, config, agentOpts)

      if (scriptResult.status === 'failed' || !scriptResult.data) {
        // Script failed — skip remaining stages
        onEvent?.({ type: 'stage_failed', stage: 'script', state: 'failed', message: scriptResult.error, timestamp: new Date().toISOString() })
        const degradedContext = buildDegradedContext(researchResult, scriptResult, null, null, null)
        const totalDurationMs = Date.now() - startMs

        await writePipelineRun({
          runId,
          topic,
          config,
          status: 'failed',
          researchResult,
          scriptResult,
          voiceResult: null,
          videoResult: null,
          publishResult: null,
          degradedContext,
          isDryRun: opts?.isDryRun,
        })

        onEvent?.({ type: 'pipeline_done', status: 'failed', timestamp: new Date().toISOString() })
        return {
          runId,
          status: 'failed',
          research: researchResult,
          script: scriptResult,
          voice: null,
          video: null,
          publish: null,
          degradedContext,
          totalDurationMs,
        }
      }

      onEvent?.({ type: 'stage_complete', stage: 'script', state: 'complete', data: scriptResult, timestamp: new Date().toISOString() })
    }

    // ── Stage 3: Voice ─────────────────────────────────────────────────────
    const priorVoice = opts?.priorResults?.voice
    if (priorVoice?.status === 'success' && priorVoice.data) {
      voiceResult = priorVoice
      reusedStages.add('voice')
      onEvent?.({ type: 'stage_complete', stage: 'voice', state: 'complete', data: voiceResult, timestamp: new Date().toISOString() })
    } else {
      if (!opts?.userTier) {
        void log.info('[orchestrator] userTier not provided — defaulting to pro', { runId, warning: 'userTier missing from caller' })
      }
      const voiceQuota = await checkVoiceQuota(config.userId, opts?.userTier ?? 'pro')
      if (!voiceQuota.allowed) {
        onEvent?.({ type: 'pipeline_error', message: 'Voice character quota exceeded for this billing period. Upgrade your plan to continue.', timestamp: new Date().toISOString() })
        const degradedContext = buildDegradedContext(researchResult, scriptResult, null, null, null)
        const totalDurationMs = Date.now() - startMs

        await writePipelineRun({
          runId,
          topic,
          config,
          status: 'failed',
          researchResult,
          scriptResult,
          voiceResult: null,
          videoResult: null,
          publishResult: null,
          degradedContext,
          isDryRun: opts?.isDryRun,
        })

        onEvent?.({ type: 'pipeline_done', status: 'failed', timestamp: new Date().toISOString() })
        return {
          runId,
          status: 'failed',
          research: researchResult,
          script: scriptResult,
          voice: null,
          video: null,
          publish: null,
          degradedContext,
          totalDurationMs,
        }
      }

      onEvent?.({ type: 'stage_start', stage: 'voice', state: 'running', timestamp: new Date().toISOString() })
      voiceResult = await voice.run(scriptResult.data!, config, runId, agentOpts)

      if (voiceResult.status === 'failed' || voiceResult.status === 'degraded') {
        onEvent?.({ type: 'stage_failed', stage: 'voice', state: 'failed', message: voiceResult.error, timestamp: new Date().toISOString() })
      } else {
        onEvent?.({ type: 'stage_complete', stage: 'voice', state: 'complete', data: voiceResult, timestamp: new Date().toISOString() })
      }
    }

    const audioUrl = voiceResult.status === 'success' && voiceResult.data
      ? voiceResult.data.audioUrl
      : ''

    // ── Stage 4: Video ─────────────────────────────────────────────────────
    const priorVideo = opts?.priorResults?.video
    if (priorVideo?.status === 'success' && priorVideo.data) {
      videoResult = priorVideo
      reusedStages.add('video')
      onEvent?.({ type: 'stage_complete', stage: 'video', state: 'complete', data: videoResult, timestamp: new Date().toISOString() })
    } else {
      onEvent?.({ type: 'stage_start', stage: 'video', state: 'running', timestamp: new Date().toISOString() })
      videoResult = await video.run(scriptResult.data!, config, audioUrl, runId, agentOpts)

      if (videoResult.status === 'failed' || videoResult.status === 'degraded') {
        onEvent?.({ type: 'stage_failed', stage: 'video', state: 'failed', message: videoResult.error, timestamp: new Date().toISOString() })
      } else {
        onEvent?.({ type: 'stage_complete', stage: 'video', state: 'complete', data: videoResult, timestamp: new Date().toISOString() })
      }
    }

    const videoUrl = videoResult.status === 'success' && videoResult.data
      ? videoResult.data.videoUrl
      : ''

    // ── Stage 5: Publish ───────────────────────────────────────────────────
    onEvent?.({ type: 'stage_start', stage: 'publish', state: 'running', timestamp: new Date().toISOString() })
    if (videoUrl) {
      publishResult = await publish.run(videoUrl, topic, config, oauthToken, agentOpts)
    } else {
      publishResult = {
        status: 'failed',
        data: null,
        error: 'Publish skipped — video generation did not complete.',
      }
    }

    // ── Publish complete/failed event ──────────────────────────────────────
    if (publishResult.status === 'failed' || publishResult.status === 'degraded') {
      onEvent?.({ type: 'stage_failed', stage: 'publish', state: 'failed', message: publishResult.error, timestamp: new Date().toISOString() })
    } else {
      onEvent?.({ type: 'stage_complete', stage: 'publish', state: 'complete', data: publishResult, timestamp: new Date().toISOString() })
    }

    // ── Determine final status ─────────────────────────────────────────────
    // 'complete' when research AND script succeeded (voice/publish may be degraded)
    const anyFailure =
      (voiceResult.status === 'failed') ||
      (videoResult.status === 'failed') ||
      (videoResult.status === 'degraded') ||
      (publishResult.status === 'failed') ||
      (publishResult.status === 'degraded')

    // complete = published to YouTube; partial = research+script+voice ok but video/publish failed
    const finalStatus: PipelineRunStatus =
      publishResult?.status === 'success' ? 'complete' : 'partial'

    const hasDegraded = anyFailure
    const degradedContext = hasDegraded
      ? buildDegradedContext(researchResult, scriptResult, voiceResult, videoResult, publishResult)
      : null

    const totalDurationMs = Date.now() - startMs
    const costSummary = buildCostSummary(researchResult, scriptResult, voiceResult, videoResult, reusedStages)
    logCostSummary(runId, costSummary)

    await writePipelineRun({
      runId,
      topic,
      config,
      status: finalStatus,
      researchResult,
      scriptResult,
      voiceResult,
      videoResult,
      publishResult,
      degradedContext,
      costSummary,
      isDryRun: opts?.isDryRun,
      isRetry: reusedStages.size > 0,
    })

    onEvent?.({ type: 'pipeline_done', status: finalStatus, timestamp: new Date().toISOString() })
    return {
      runId,
      status: finalStatus,
      research: researchResult,
      script: scriptResult,
      voice: voiceResult,
      video: videoResult,
      publish: publishResult,
      degradedContext,
      totalDurationMs,
    }
  } catch (err) {
    // Top-level safety net — agents should never throw, but protect regardless
    void log.error('[orchestrator] unexpected top-level error', { runId, error: err instanceof Error ? err.message : String(err) })
    onEvent?.({ type: 'pipeline_error', message: err instanceof Error ? err.message : 'Unknown error', timestamp: new Date().toISOString() })

    const degradedContext = buildDegradedContext(
      researchResult,
      scriptResult,
      voiceResult,
      videoResult,
      publishResult,
    )
    const totalDurationMs = Date.now() - startMs

    try {
      await writePipelineRun({
        runId,
        topic,
        config,
        status: 'failed',
        researchResult,
        scriptResult,
        voiceResult,
        videoResult,
        publishResult,
        degradedContext,
        isDryRun: opts?.isDryRun,
      })
    } catch {
      // non-fatal — Supabase write failure in error path
    }

    onEvent?.({ type: 'pipeline_done', status: 'failed', timestamp: new Date().toISOString() })
    return {
      runId,
      status: 'failed',
      research: researchResult,
      script: scriptResult,
      voice: voiceResult,
      video: videoResult,
      publish: publishResult,
      degradedContext,
      totalDurationMs,
    }
  }
}

// ─── Supabase write ───────────────────────────────────────────────────────────

interface WriteArgs {
  runId: string
  topic: string
  config: ChannelConfig
  status: PipelineRunStatus
  researchResult: AgentResult<SourcePackage> | null
  scriptResult: AgentResult<string> | null
  voiceResult: AgentResult<VoiceOutput> | null
  videoResult: AgentResult<VideoOutput> | null
  publishResult: AgentResult<PublishOutput> | null
  degradedContext: DegradedContext | null
  costSummary?: CostSummary
  isDryRun?: boolean
  isRetry?: boolean
}

async function writePipelineRun(args: WriteArgs): Promise<void> {
  try {
    const supabase = getSupabaseServerClient()

    const upsertData: Record<string, unknown> = {
      id: args.runId,
      user_id: args.config.userId,
      topic: args.topic,
      config_id: args.config.id,
      status: args.status,
      research_result: args.researchResult,
      script_result: args.scriptResult,
      voice_result: args.voiceResult,
      video_result: args.videoResult,
      publish_result: args.publishResult,
      error_message: args.degradedContext?.gapMessages.join('; ') ?? null,
      is_dry_run: args.isDryRun ?? false,
      updated_at: new Date().toISOString(),
    }

    // On retry, preserve original run's cost_summary — only new stages incurred cost
    if (!args.isRetry) {
      upsertData.cost_summary = args.costSummary ?? null
    }

    const { error } = await supabase.from('videos').upsert(upsertData)

    if (error) {
      void log.error('[orchestrator] Supabase write failed', { runId: args.runId, error: error.message })
    }

    // Skip chars_used update on retry — voice was reused, quota already counted on original run
    if (!args.isRetry && !args.isDryRun && args.voiceResult?.status === 'success') {
      const charsUsed = args.voiceResult.data?.charsUsed ?? 0
      if (charsUsed > 0) {
        const { error: updateError } = await supabase
          .from('videos')
          .update({ chars_used: charsUsed })
          .eq('id', args.runId)
        if (updateError) {
          void log.error('[orchestrator] Failed to update chars_used', { runId: args.runId, error: updateError.message })
        }
      }
    }
  } catch (err) {
    // Supabase failures never propagate — in-memory result is source of truth
    void log.error('[orchestrator] Supabase write threw unexpectedly', { runId: args.runId, error: err instanceof Error ? err.message : String(err) })
  }
}
