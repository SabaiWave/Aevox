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
  VoiceOutput,
} from '@/types'

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
    researchResult = await research.run(topic, config)

    if (researchResult.status === 'failed' || !researchResult.data) {
      // Research failed — skip remaining stages
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

    // ── Stage 2: Script ────────────────────────────────────────────────────
    scriptResult = await script.run(topic, researchResult.data, config)

    if (scriptResult.status === 'failed' || !scriptResult.data) {
      // Script failed — skip remaining stages
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

    // ── Stage 3: Voice ─────────────────────────────────────────────────────
    voiceResult = await voice.run(scriptResult.data, config, runId)

    // Voice failure is non-fatal — continue to publish attempt
    const audioUrl = voiceResult.status === 'success' && voiceResult.data
      ? voiceResult.data.audioUrl
      : ''

    // ── Stage 4: Publish ───────────────────────────────────────────────────
    // Only attempt publish if we have a real audio URL
    if (audioUrl) {
      publishResult = await publish.run(audioUrl, topic, config, oauthToken)
    } else {
      publishResult = {
        status: 'failed',
        data: null,
        error: 'No audio URL available for publish',
      }
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
    })

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
