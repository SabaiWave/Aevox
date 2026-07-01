import type {
  AgentResult,
  PublishOutput,
  SourcePackage,
  VoiceOutput,
} from '@/types'
import { dryRunSourcePackage } from '@/__fixtures__/research'
import { dryRunScript } from '@/__fixtures__/script'
import { dryRunVoiceOutput } from '@/__fixtures__/voice'
import { dryRunPublishOutput } from '@/__fixtures__/publish'
import { darkloreConfig } from '@/__fixtures__/configs/darklore'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockResearchRun = jest.fn<Promise<AgentResult<SourcePackage>>, [string, unknown]>()
const mockScriptRun = jest.fn<Promise<AgentResult<string>>, [string, SourcePackage, unknown]>()
const mockVoiceRun = jest.fn<Promise<AgentResult<VoiceOutput>>, [string, unknown, string]>()
const mockPublishRun = jest.fn<Promise<AgentResult<PublishOutput>>, [string, string, unknown, string]>()

jest.mock('@/agents/research', () => ({
  ResearchAgent: jest.fn().mockImplementation(() => ({ run: mockResearchRun })),
}))

jest.mock('@/agents/script', () => ({
  ScriptAgent: jest.fn().mockImplementation(() => ({ run: mockScriptRun })),
}))

jest.mock('@/agents/voice', () => ({
  VoiceAgent: jest.fn().mockImplementation(() => ({ run: mockVoiceRun })),
}))

jest.mock('@/agents/publish', () => ({
  PublishAgent: jest.fn().mockImplementation(() => ({ run: mockPublishRun })),
}))

const mockUpsert = jest.fn().mockResolvedValue({ error: null })
jest.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: jest.fn(() => ({
    from: jest.fn(() => ({ upsert: mockUpsert })),
  })),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { runPipeline, buildDegradedContext } from '@/agents/orchestrator'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const successResearch: AgentResult<SourcePackage> = {
  status: 'success',
  data: dryRunSourcePackage,
  durationMs: 100,
}

const successScript: AgentResult<string> = {
  status: 'success',
  data: dryRunScript,
  durationMs: 200,
}

const successVoice: AgentResult<VoiceOutput> = {
  status: 'success',
  data: dryRunVoiceOutput,
  durationMs: 300,
}

const successPublish: AgentResult<PublishOutput> = {
  status: 'success',
  data: dryRunPublishOutput,
  durationMs: 150,
}

const failedResearch: AgentResult<SourcePackage> = {
  status: 'failed',
  data: null,
  error: 'Tavily error 500',
  durationMs: 50,
}

const failedScript: AgentResult<string> = {
  status: 'failed',
  data: null,
  error: 'Anthropic returned empty',
  durationMs: 80,
}

const failedVoice: AgentResult<VoiceOutput> = {
  status: 'failed',
  data: null,
  error: 'ElevenLabs quota exceeded',
  durationMs: 20,
}

const degradedPublish: AgentResult<PublishOutput> = {
  status: 'degraded',
  data: null,
  error: 'YouTube publish requires OAuth',
  durationMs: 10,
}

const RUN_ID = 'test-run-id-001'
const TOPIC = 'The Pontianak — Malaysian vampire ghost'
const OAUTH = 'test-oauth-token'

// ─── buildDegradedContext ─────────────────────────────────────────────────────

describe('buildDegradedContext', () => {
  it('produces no gap messages when all stages succeed', () => {
    const ctx = buildDegradedContext(successResearch, successScript, successVoice, null, successPublish)
    expect(ctx.failedStages).toHaveLength(0)
    expect(ctx.gapMessages).toHaveLength(0)
    expect(ctx.availableData.research).toBeDefined()
    expect(ctx.availableData.script).toBeDefined()
    expect(ctx.availableData.voice).toBeDefined()
    expect(ctx.availableData.publish).toBeDefined()
  })

  it('produces research gap message when research failed', () => {
    const ctx = buildDegradedContext(failedResearch, null, null, null, null)
    expect(ctx.failedStages).toContain('research')
    expect(ctx.gapMessages).toContain('Research failed — script may lack source context')
    expect(ctx.availableData.research).toBeUndefined()
  })

  it('produces script gap message when script failed', () => {
    const ctx = buildDegradedContext(successResearch, failedScript, null, null, null)
    expect(ctx.failedStages).toContain('script')
    expect(ctx.gapMessages).toContain('Script generation failed — no voiceover available')
    expect(ctx.availableData.research).toBeDefined()
    expect(ctx.availableData.script).toBeUndefined()
  })

  it('produces voice gap message when voice failed', () => {
    const ctx = buildDegradedContext(successResearch, successScript, failedVoice, null, null)
    expect(ctx.failedStages).toContain('voice')
    expect(ctx.gapMessages).toContain('Voice synthesis failed — no audio file available')
  })

  it('produces publish gap message when publish is degraded', () => {
    const ctx = buildDegradedContext(successResearch, successScript, successVoice, null, degradedPublish)
    expect(ctx.failedStages).toContain('publish')
    expect(ctx.gapMessages).toContain('Publish failed — video not uploaded to YouTube')
  })

  it('produces all 4 gap messages when all stages fail', () => {
    const ctx = buildDegradedContext(failedResearch, failedScript, failedVoice, null, degradedPublish)
    expect(ctx.failedStages).toHaveLength(4)
    expect(ctx.gapMessages).toHaveLength(4)
    expect(Object.keys(ctx.availableData)).toHaveLength(0)
  })

  it('includes only successful stage data in availableData', () => {
    const ctx = buildDegradedContext(successResearch, failedScript, null, null, null)
    expect(ctx.availableData.research).toBe(dryRunSourcePackage)
    expect(ctx.availableData.script).toBeUndefined()
    expect(ctx.availableData.voice).toBeUndefined()
  })
})

// ─── runPipeline ──────────────────────────────────────────────────────────────

describe('runPipeline', () => {
  beforeAll(() => {
    process.env.DRY_RUN = 'true'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpsert.mockResolvedValue({ error: null })
  })

  it('runs full pipeline end-to-end and returns complete status', async () => {
    mockResearchRun.mockResolvedValue(successResearch)
    mockScriptRun.mockResolvedValue(successScript)
    mockVoiceRun.mockResolvedValue(successVoice)
    mockPublishRun.mockResolvedValue(successPublish)

    const result = await runPipeline(RUN_ID, TOPIC, darkloreConfig, OAUTH)

    expect(result.runId).toBe(RUN_ID)
    expect(result.status).toBe('complete')
    expect(result.research?.status).toBe('success')
    expect(result.script?.status).toBe('success')
    expect(result.voice?.status).toBe('success')
    expect(result.publish?.status).toBe('success')
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0)
  })

  it('calls all 4 agents in sequence', async () => {
    const order: string[] = []
    mockResearchRun.mockImplementation(async () => { order.push('research'); return successResearch })
    mockScriptRun.mockImplementation(async () => { order.push('script'); return successScript })
    mockVoiceRun.mockImplementation(async () => { order.push('voice'); return successVoice })
    mockPublishRun.mockImplementation(async () => { order.push('publish'); return successPublish })

    await runPipeline(RUN_ID, TOPIC, darkloreConfig, OAUTH)

    expect(order).toEqual(['research', 'script', 'voice', 'publish'])
  })

  it('writes to pipeline_runs after pipeline completes', async () => {
    mockResearchRun.mockResolvedValue(successResearch)
    mockScriptRun.mockResolvedValue(successScript)
    mockVoiceRun.mockResolvedValue(successVoice)
    mockPublishRun.mockResolvedValue(successPublish)

    await runPipeline(RUN_ID, TOPIC, darkloreConfig, OAUTH)

    expect(mockUpsert).toHaveBeenCalledTimes(1)
    const upsertArg = mockUpsert.mock.calls[0][0]
    expect(upsertArg.id).toBe(RUN_ID)
    expect(upsertArg.topic).toBe(TOPIC)
    expect(upsertArg.config_id).toBe(darkloreConfig.id)
  })

  it('stops at research failure, returns failed status with degradedContext', async () => {
    mockResearchRun.mockResolvedValue(failedResearch)

    const result = await runPipeline(RUN_ID, TOPIC, darkloreConfig, OAUTH)

    expect(result.status).toBe('failed')
    expect(result.script).toBeNull()
    expect(result.voice).toBeNull()
    expect(result.publish).toBeNull()
    expect(result.degradedContext).not.toBeNull()
    expect(result.degradedContext?.gapMessages).toContain(
      'Research failed — script may lack source context',
    )

    expect(mockScriptRun).not.toHaveBeenCalled()
    expect(mockVoiceRun).not.toHaveBeenCalled()
    expect(mockPublishRun).not.toHaveBeenCalled()
  })

  it('stops at script failure, returns failed status with degradedContext', async () => {
    mockResearchRun.mockResolvedValue(successResearch)
    mockScriptRun.mockResolvedValue(failedScript)

    const result = await runPipeline(RUN_ID, TOPIC, darkloreConfig, OAUTH)

    expect(result.status).toBe('failed')
    expect(result.research?.status).toBe('success')
    expect(result.voice).toBeNull()
    expect(result.publish).toBeNull()
    expect(result.degradedContext?.gapMessages).toContain(
      'Script generation failed — no voiceover available',
    )

    expect(mockVoiceRun).not.toHaveBeenCalled()
    expect(mockPublishRun).not.toHaveBeenCalled()
  })

  it('continues past voice failure, returns complete with degradedContext', async () => {
    mockResearchRun.mockResolvedValue(successResearch)
    mockScriptRun.mockResolvedValue(successScript)
    mockVoiceRun.mockResolvedValue(failedVoice)

    const result = await runPipeline(RUN_ID, TOPIC, darkloreConfig, OAUTH)

    expect(result.status).toBe('complete')
    expect(result.voice?.status).toBe('failed')
    expect(result.degradedContext).not.toBeNull()
    expect(result.degradedContext?.gapMessages).toContain(
      'Voice synthesis failed — no audio file available',
    )
    // VideoAgent runs in DRY_RUN with empty audioUrl and returns stub videoUrl
    // Publish is then called with the stub video URL
    expect(mockPublishRun).toHaveBeenCalled()
  })

  it('returns complete when publish is degraded (Phase 2 stub)', async () => {
    mockResearchRun.mockResolvedValue(successResearch)
    mockScriptRun.mockResolvedValue(successScript)
    mockVoiceRun.mockResolvedValue(successVoice)
    mockPublishRun.mockResolvedValue(degradedPublish)

    const result = await runPipeline(RUN_ID, TOPIC, darkloreConfig, OAUTH)

    expect(result.status).toBe('complete')
    expect(result.degradedContext?.gapMessages).toContain(
      'Publish failed — video not uploaded to YouTube',
    )
  })

  it('does not throw when Supabase write fails', async () => {
    mockResearchRun.mockResolvedValue(successResearch)
    mockScriptRun.mockResolvedValue(successScript)
    mockVoiceRun.mockResolvedValue(successVoice)
    mockPublishRun.mockResolvedValue(successPublish)
    mockUpsert.mockResolvedValue({ error: { message: 'DB connection timeout' } })

    // Must not throw
    const result = await runPipeline(RUN_ID, TOPIC, darkloreConfig, OAUTH)
    expect(result.status).toBe('complete')
  })

  it('returns failed status on unexpected top-level error', async () => {
    mockResearchRun.mockRejectedValue(new Error('Unexpected agent throw'))

    const result = await runPipeline(RUN_ID, TOPIC, darkloreConfig, OAUTH)

    expect(result.status).toBe('failed')
    expect(result.degradedContext).not.toBeNull()
  })
})
