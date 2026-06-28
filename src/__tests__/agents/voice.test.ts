import { darkloreConfig } from '@/__fixtures__/configs/darklore'
import type { ChannelConfig } from '@/types'

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockUpload = jest.fn().mockResolvedValue({ data: {}, error: null })
const mockGetPublicUrl = jest.fn().mockReturnValue({
  data: { publicUrl: 'https://storage.example.com/audio.mp3' },
})

jest.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  })),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { VoiceAgent } from '@/agents/voice'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// A config with a voiceId that passes the /^[a-zA-Z0-9]{10,40}$/ validation
const validVoiceConfig: ChannelConfig = {
  ...darkloreConfig,
  voiceId: 'abcdefghij1234567890', // 20 alphanumeric chars
}

const SCRIPT = 'The pontianak is a vampiric spirit from Malay folklore.'
const RUN_ID = 'test-run-001'

// ─── VoiceAgent ───────────────────────────────────────────────────────────────

describe('VoiceAgent', () => {
  // ── DRY_RUN path ──────────────────────────────────────────────────────────

  describe('DRY_RUN=true', () => {
    beforeAll(() => {
      process.env.DRY_RUN = 'true'
    })

    afterAll(() => {
      delete process.env.DRY_RUN
    })

    beforeEach(() => {
      jest.clearAllMocks()
      mockUpload.mockResolvedValue({ data: {}, error: null })
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/audio.mp3' },
      })
    })

    it('returns status success with audioUrl (skips Supabase upload)', async () => {
      const agent = new VoiceAgent()
      const result = await agent.run(SCRIPT, validVoiceConfig, RUN_ID)

      expect(result.status).toBe('success')
      expect(result.data).not.toBeNull()
      expect(typeof result.data!.audioUrl).toBe('string')
      expect(result.data!.audioUrl.length).toBeGreaterThan(0)
      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('sets durationMs on result', async () => {
      const agent = new VoiceAgent()
      const result = await agent.run(SCRIPT, validVoiceConfig, RUN_ID)

      expect(typeof result.durationMs).toBe('number')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('calculates durationSeconds from script length', async () => {
      const agent = new VoiceAgent()
      const result = await agent.run(SCRIPT, validVoiceConfig, RUN_ID)

      const expected = Math.round((SCRIPT.length / 150) * 60)
      expect(result.data!.durationSeconds).toBe(expected)
    })

    it('sets charsUsed to script.length', async () => {
      const agent = new VoiceAgent()
      const result = await agent.run(SCRIPT, validVoiceConfig, RUN_ID)

      expect(result.data!.charsUsed).toBe(SCRIPT.length)
    })
  })

  // ── Live path ──────────────────────────────────────────────────────────────

  describe('live path', () => {
    let originalFetch: typeof global.fetch

    beforeEach(() => {
      process.env.DRY_RUN = 'false'
      originalFetch = global.fetch
      jest.clearAllMocks()
      mockUpload.mockResolvedValue({ data: {}, error: null })
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/audio.mp3' },
      })
    })

    afterEach(() => {
      global.fetch = originalFetch
      delete process.env.ELEVENLABS_API_KEY
      delete process.env.DRY_RUN
    })

    it('returns status failed when ELEVENLABS_API_KEY is missing', async () => {
      delete process.env.ELEVENLABS_API_KEY

      const agent = new VoiceAgent()
      const result = await agent.run(SCRIPT, validVoiceConfig, RUN_ID)

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
      expect(typeof result.error).toBe('string')
    })

    it('returns status failed when voiceId is invalid', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key'
      // voiceId with hyphens fails the /^[a-zA-Z0-9]{10,40}$/ regex — explicit override, not darkloreConfig
      const invalidVoiceConfig: ChannelConfig = { ...validVoiceConfig, voiceId: 'invalid-voice-id' }
      const agent = new VoiceAgent()
      const result = await agent.run(SCRIPT, invalidVoiceConfig, RUN_ID)

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Invalid voice ID')
      expect(result.data).toBeNull()
    })

    it('returns status failed when ElevenLabs returns non-ok response', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key'
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'quota exceeded',
        statusText: 'Too Many Requests',
      } as Response)

      const agent = new VoiceAgent()
      const result = await agent.run(SCRIPT, validVoiceConfig, RUN_ID)

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
    })

    it('returns quota exceeded message when ElevenLabs returns 401 with quota_exceeded code', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key'
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ detail: { code: 'quota_exceeded', message: 'exceeds quota' } }),
        statusText: 'Unauthorized',
      } as Response)

      const agent = new VoiceAgent()
      const result = await agent.run(SCRIPT, validVoiceConfig, RUN_ID)

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Voice character quota exceeded for this billing period. Upgrade your plan to continue.')
    })

    it('returns quota exceeded message when ElevenLabs returns 402', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key'
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 402,
        text: async () => 'Payment Required',
        statusText: 'Payment Required',
      } as Response)

      const agent = new VoiceAgent()
      const result = await agent.run(SCRIPT, validVoiceConfig, RUN_ID)

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Voice character quota exceeded for this billing period. Upgrade your plan to continue.')
    })

    it('returns status failed when Supabase upload returns an error', async () => {
      process.env.ELEVENLABS_API_KEY = 'test-key'
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(32),
      } as Response)
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: 'Storage bucket not found' },
      })

      const agent = new VoiceAgent()
      const result = await agent.run(SCRIPT, validVoiceConfig, RUN_ID)

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
      expect(result.error).toContain('Supabase upload error')
    })
  })

  // ── Never-throws guarantee ─────────────────────────────────────────────────

  describe('never throws on unexpected error', () => {
    beforeEach(() => {
      process.env.DRY_RUN = 'false'
      process.env.ELEVENLABS_API_KEY = 'test-key'
      jest.clearAllMocks()
      mockUpload.mockResolvedValue({ data: {}, error: null })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://storage.example.com/audio.mp3' } })
    })

    afterEach(() => {
      delete process.env.DRY_RUN
      delete process.env.ELEVENLABS_API_KEY
    })

    it('resolves with status failed instead of throwing on unexpected error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network catastrophe'))

      const agent = new VoiceAgent()

      await expect(
        agent.run(SCRIPT, validVoiceConfig, RUN_ID),
      ).resolves.toMatchObject({
        status: 'failed',
        data: null,
      })
    })
  })
})
