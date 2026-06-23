import { ResearchAgent } from '@/agents/research'
import { ScriptAgent } from '@/agents/script'
import { VoiceAgent } from '@/agents/voice'
import { PublishAgent } from '@/agents/publish'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import type {
  AgentResult,
  ChannelConfig,
  DegradedContext,
  PipelineResult,
  PipelineRunStatus,
  PublishOutput,
  SourcePackage,
  SSEEvent,
  VoiceOutput,
} from '@/types'

// ─── Cost rates (USD) ─────────────────────────────────────────────────────────

const COST_RATES = {
  tavilyPerSearch: 0.015,
  claudeInputPerMTok: 3.0,
  claudeOutputPerMTok: 15.0,
  elevenLabsPerKChars: 0.18,
}

export interface CostSummary {
  research: { searches: number; usd: number }
  script: { tokensIn: number; tokensOut: number; usd: number }
  voice: { chars: number; usd: number }
  totalUsd: number
}

export function buildCostSummary(
  researchResult: AgentResult<SourcePackage> | null,
  scriptResult: AgentResult<string> | null,
  voiceResult: AgentResult<VoiceOutput> | null,
): CostSummary {
  const searches = researchResult?.usage?.searchCount ?? 0
  const tokensIn = scriptResult?.usage?.tokensIn ?? 0
  const tokensOut = scriptResult?.usage?.tokensOut ?? 0
  const chars = voiceResult?.usage?.charsUsed ?? voiceResult?.data?.charsUsed ?? 0

  const researchUsd = searches * COST_RATES.tavilyPerSearch
  const scriptUsd =
    (tokensIn / 1_000_000) * COST_RATES.claudeInputPerMTok +
    (tokensOut / 1_000_000) * COST_RATES.claudeOutputPerMTok
  const voiceUsd = (chars / 1000) * COST_RATES.elevenLabsPerKChars

  const totalUsd = researchUsd + scriptUsd + voiceUsd

  return {
    research: { searches, usd: researchUsd },
    script: { tokensIn, tokensOut, usd: scriptUsd },
    voice: { chars, usd: voiceUsd },
    totalUsd,
  }
}

function logCostSummary(runId: string, cost: CostSummary): void {
  const fmt = (n: number) => `$${n.toFixed(4)}`
  console.log(`[Run ${runId.slice(0, 8)}] Cost summary:`)
  console.log(`  Research  — ${cost.research.searches} search(es)          ${fmt(cost.research.usd)}`)
  console.log(`  Script    — ${cost.script.tokensIn} in / ${cost.script.tokensOut} out tokens  ${fmt(cost.script.usd)}`)
  console.log(`  Voice     — ${cost.voice.chars} chars               ${fmt(cost.voice.usd)}`)
  console.log(`  ────────────────────────────────────────────`)
  console.log(`  Total                                        ${fmt(cost.totalUsd)}`)
}

// ─── buildDegradedContext ─────────────────────────────────────────────────────

export function buildDegradedContext(
  researchResult: AgentResult<SourcePackage> | null,
  scriptResult: AgentResult<string> | null,
  voiceResult: AgentResult<VoiceOutput> | null,
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

export async function runPipeline(
  runId: string,
  topic: string,
  config: ChannelConfig,
  oauthToken: string,
  onEvent?: (event: SSEEvent) => void,
): Promise<PipelineResult> {
  const startMs = Date.now()

  let researchResult: AgentResult<SourcePackage> | null = null
  let scriptResult: AgentResult<string> | null = null
  let voiceResult: AgentResult<VoiceOutput> | null = null
  let publishResult: AgentResult<PublishOutput> | null = null

  try {
    const research = new ResearchAgent()
    const script = new ScriptAgent()
    const voice = new VoiceAgent()
    const publish = new PublishAgent()

    // ── Stage 1: Research ──────────────────────────────────────────────────
    onEvent?.({ type: 'stage_start', stage: 'research', state: 'running', timestamp: new Date().toISOString() })
    researchResult = await research.run(topic, config)

    if (researchResult.status === 'failed' || !researchResult.data) {
      // Research failed — skip remaining stages
      onEvent?.({ type: 'stage_failed', stage: 'research', state: 'failed', message: researchResult.error, timestamp: new Date().toISOString() })
      const degradedContext = buildDegradedContext(researchResult, null, null, null)
      const totalDurationMs = Date.now() - startMs

      await writePipelineRun({
        runId,
        topic,
        config,
        status: 'failed',
        researchResult,
        scriptResult: null,
        voiceResult: null,
        publishResult: null,
        degradedContext,
      })

      onEvent?.({ type: 'pipeline_done', timestamp: new Date().toISOString() })
      return {
        runId,
        status: 'failed',
        research: researchResult,
        script: null,
        voice: null,
        publish: null,
        degradedContext,
        totalDurationMs,
      }
    }

    onEvent?.({ type: 'stage_complete', stage: 'research', state: 'complete', data: researchResult, timestamp: new Date().toISOString() })

    // ── Stage 2: Script ────────────────────────────────────────────────────
    onEvent?.({ type: 'stage_start', stage: 'script', state: 'running', timestamp: new Date().toISOString() })
    scriptResult = await script.run(topic, researchResult.data, config)

    if (scriptResult.status === 'failed' || !scriptResult.data) {
      // Script failed — skip remaining stages
      onEvent?.({ type: 'stage_failed', stage: 'script', state: 'failed', message: scriptResult.error, timestamp: new Date().toISOString() })
      const degradedContext = buildDegradedContext(researchResult, scriptResult, null, null)
      const totalDurationMs = Date.now() - startMs

      await writePipelineRun({
        runId,
        topic,
        config,
        status: 'failed',
        researchResult,
        scriptResult,
        voiceResult: null,
        publishResult: null,
        degradedContext,
      })

      onEvent?.({ type: 'pipeline_done', timestamp: new Date().toISOString() })
      return {
        runId,
        status: 'failed',
        research: researchResult,
        script: scriptResult,
        voice: null,
        publish: null,
        degradedContext,
        totalDurationMs,
      }
    }

    onEvent?.({ type: 'stage_complete', stage: 'script', state: 'complete', data: scriptResult, timestamp: new Date().toISOString() })

    // ── Stage 3: Voice ─────────────────────────────────────────────────────
    onEvent?.({ type: 'stage_start', stage: 'voice', state: 'running', timestamp: new Date().toISOString() })
    voiceResult = await voice.run(scriptResult.data, config, runId)

    // Voice failure is non-fatal — continue to publish attempt
    if (voiceResult.status === 'failed' || voiceResult.status === 'degraded') {
      onEvent?.({ type: 'stage_failed', stage: 'voice', state: 'failed', message: voiceResult.error, timestamp: new Date().toISOString() })
    } else {
      onEvent?.({ type: 'stage_complete', stage: 'voice', state: 'complete', data: voiceResult, timestamp: new Date().toISOString() })
    }

    const audioUrl = voiceResult.status === 'success' && voiceResult.data
      ? voiceResult.data.audioUrl
      : ''

    // ── Stage 4: Publish ───────────────────────────────────────────────────
    // Only attempt publish if we have a real audio URL
    onEvent?.({ type: 'stage_start', stage: 'publish', state: 'running', timestamp: new Date().toISOString() })
    if (audioUrl) {
      publishResult = await publish.run(audioUrl, topic, config, oauthToken)
    } else {
      publishResult = {
        status: 'failed',
        data: null,
        error: 'No audio URL available for publish',
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
      (publishResult.status === 'failed') ||
      (publishResult.status === 'degraded')

    // research + script are the critical path per spec.
    // Voice/publish failures are captured in degradedContext but do not fail the pipeline.
    const finalStatus: PipelineRunStatus = 'complete'

    const hasDegraded = anyFailure
    const degradedContext = hasDegraded
      ? buildDegradedContext(researchResult, scriptResult, voiceResult, publishResult)
      : null

    const totalDurationMs = Date.now() - startMs
    const costSummary = buildCostSummary(researchResult, scriptResult, voiceResult)
    logCostSummary(runId, costSummary)

    await writePipelineRun({
      runId,
      topic,
      config,
      status: finalStatus,
      researchResult,
      scriptResult,
      voiceResult,
      publishResult,
      degradedContext,
      costSummary,
    })

    onEvent?.({ type: 'pipeline_done', timestamp: new Date().toISOString() })
    return {
      runId,
      status: finalStatus,
      research: researchResult,
      script: scriptResult,
      voice: voiceResult,
      publish: publishResult,
      degradedContext,
      totalDurationMs,
    }
  } catch (err) {
    // Top-level safety net — agents should never throw, but protect regardless
    console.error('[orchestrator] Unexpected top-level error:', err instanceof Error ? err.message : err)
    onEvent?.({ type: 'pipeline_error', message: err instanceof Error ? err.message : 'Unknown error', timestamp: new Date().toISOString() })

    const degradedContext = buildDegradedContext(
      researchResult,
      scriptResult,
      voiceResult,
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
        publishResult,
        degradedContext,
      })
    } catch {
      // non-fatal — Supabase write failure in error path
    }

    return {
      runId,
      status: 'failed',
      research: researchResult,
      script: scriptResult,
      voice: voiceResult,
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
  publishResult: AgentResult<PublishOutput> | null
  degradedContext: DegradedContext | null
  costSummary?: CostSummary
}

async function writePipelineRun(args: WriteArgs): Promise<void> {
  try {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.from('pipeline_runs').upsert({
      id: args.runId,
      user_id: args.config.userId,
      topic: args.topic,
      config_id: args.config.id,
      status: args.status,
      research_result: args.researchResult,
      script_result: args.scriptResult,
      voice_result: args.voiceResult,
      publish_result: args.publishResult,
      error_message: args.degradedContext?.gapMessages.join('; ') ?? null,
      cost_summary: args.costSummary ?? null,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error('[orchestrator] Supabase write failed:', error.message)
    }
  } catch (err) {
    // Supabase failures never propagate — in-memory result is source of truth
    console.error('[orchestrator] Supabase write threw unexpectedly:', err instanceof Error ? err.message : err)
  }
}
