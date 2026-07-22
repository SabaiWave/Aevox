/**
 * Integration test — real agent implementations, DRY_RUN=true.
 * Distinct from orchestrator.test.ts (which mocks all agents).
 * Catches regressions in agent DRY_RUN paths + orchestration wiring.
 */
import { darkloreConfig } from '@/__fixtures__/configs/darklore'

// ─── Supabase mock (only external dependency in DRY_RUN) ──────────────────────

const mockUpsert = jest.fn().mockResolvedValue({ error: null })

jest.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: jest.fn(() => ({
    from: jest.fn(() => ({ upsert: mockUpsert })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example.com/audio.mp3' } }),
      })),
    },
  })),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { runPipeline } from '@/agents/orchestrator'

// ─── Constants ────────────────────────────────────────────────────────────────

const TOPIC = 'The Pontianak — Malaysian vampire ghost'
const RUN_ID = 'integration-test-run-001'

// ─── Full pipeline DRY_RUN ────────────────────────────────────────────────────

describe('runPipeline (integration — real agents, DRY_RUN=true)', () => {
  beforeAll(() => {
    process.env.DRY_RUN = 'true'
  })

  afterAll(() => {
    delete process.env.DRY_RUN
  })

  beforeEach(() => {
    mockUpsert.mockClear()
    mockUpsert.mockResolvedValue({ error: null })
  })

  it('completes all four stages with status success', async () => {
    const result = await runPipeline(RUN_ID, TOPIC, darkloreConfig, '')

    expect(result.status).toBe('complete')
    expect(result.research?.status).toBe('success')
    expect(result.script?.status).toBe('success')
    expect(result.voice?.status).toBe('success')
    expect(result.publish?.status).toBe('success')
  })

  it('research result has SourcePackage shape', async () => {
    const result = await runPipeline(RUN_ID, TOPIC, darkloreConfig, '')

    expect(result.research?.data).not.toBeNull()
    expect(Array.isArray(result.research!.data!.sources)).toBe(true)
    expect(typeof result.research!.data!.summary).toBe('string')
  })

  it('script result has non-empty string content', async () => {
    const result = await runPipeline(RUN_ID, TOPIC, darkloreConfig, '')

    expect(typeof result.script?.data).toBe('string')
    expect((result.script!.data as string).length).toBeGreaterThan(0)
  })

  it('voice result has audioUrl and charsUsed', async () => {
    const result = await runPipeline(RUN_ID, TOPIC, darkloreConfig, '')

    expect(typeof result.voice?.data?.audioUrl).toBe('string')
    expect(result.voice!.data!.audioUrl.length).toBeGreaterThan(0)
    expect(typeof result.voice!.data!.charsUsed).toBe('number')
    expect(result.voice!.data!.charsUsed).toBeGreaterThan(0)
  })

  it('publish result has videoId and videoUrl', async () => {
    const result = await runPipeline(RUN_ID, TOPIC, darkloreConfig, '')

    expect(typeof result.publish?.data?.videoId).toBe('string')
    expect(typeof result.publish?.data?.videoUrl).toBe('string')
  })

  it('has no degradedContext when all stages succeed', async () => {
    const result = await runPipeline(RUN_ID, TOPIC, darkloreConfig, '')

    expect(result.degradedContext).toBeNull()
  })

  it('reports totalDurationMs', async () => {
    const result = await runPipeline(RUN_ID, TOPIC, darkloreConfig, '')

    expect(typeof result.totalDurationMs).toBe('number')
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0)
  })

  it('fires SSE events in correct order', async () => {
    const events: string[] = []
    await runPipeline(RUN_ID, TOPIC, darkloreConfig, '', (e) => {
      events.push(e.type + (e.stage ? `:${e.stage}` : ''))
    })

    expect(events).toEqual([
      'stage_start:research',
      'stage_complete:research',
      'stage_start:script',
      'stage_complete:script',
      'stage_start:voice',
      'stage_complete:voice',
      'stage_start:video',
      'stage_complete:video',
      'stage_start:publish',
      'stage_complete:publish',
      'pipeline_done',
    ])
  })

  it('writes to Supabase once with status complete', async () => {
    await runPipeline(RUN_ID, TOPIC, darkloreConfig, '')

    expect(mockUpsert).toHaveBeenCalledTimes(1)
    const call = mockUpsert.mock.calls[0][0]
    expect(call.status).toBe('complete')
    expect(call.id).toBe(RUN_ID)
    expect(call.topic).toBe(TOPIC)
  })
})
