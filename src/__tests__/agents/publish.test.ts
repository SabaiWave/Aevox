import { dryRunPublishOutput } from '@/__fixtures__/publish'
import { darkloreConfig } from '@/__fixtures__/configs/darklore'

// ─── Import after mocks ───────────────────────────────────────────────────────

import { PublishAgent } from '@/agents/publish'

// Prevent any real network calls
const mockFetch = jest.fn()
global.fetch = mockFetch

// ─── PublishAgent ─────────────────────────────────────────────────────────────

describe('PublishAgent', () => {
  const AUDIO_URL = 'https://storage.example.com/pipeline/run-001/audio.mp3'
  const TOPIC = 'The Pontianak — Malaysian vampire ghost'
  const VALID_OAUTH = 'valid-oauth-token-1234567890'

  // ── DRY_RUN path ──────────────────────────────────────────────────────────

  describe('DRY_RUN=true', () => {
    beforeAll(() => {
      process.env.DRY_RUN = 'true'
    })

    afterAll(() => {
      delete process.env.DRY_RUN
    })

    it('returns status success with PublishOutput shape', async () => {
      const agent = new PublishAgent()
      const result = await agent.run(AUDIO_URL, TOPIC, darkloreConfig, VALID_OAUTH)

      expect(result.status).toBe('success')
      expect(result.data).not.toBeNull()
      expect(typeof result.data!.videoId).toBe('string')
      expect(typeof result.data!.videoUrl).toBe('string')
      expect(typeof result.data!.title).toBe('string')
      expect(result.data).toEqual(dryRunPublishOutput)
    })

    it('sets durationMs on result', async () => {
      const agent = new PublishAgent()
      const result = await agent.run(AUDIO_URL, TOPIC, darkloreConfig, VALID_OAUTH)

      expect(typeof result.durationMs).toBe('number')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })
  })

  // ── Live path ──────────────────────────────────────────────────────────────

  describe('live path', () => {
    beforeEach(() => {
      process.env.DRY_RUN = 'false'
      mockFetch.mockReset()
    })

    afterEach(() => {
      delete process.env.DRY_RUN
    })

    it('returns status failed when oauthToken is empty', async () => {
      const agent = new PublishAgent()
      const result = await agent.run(AUDIO_URL, TOPIC, darkloreConfig, '')

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
      expect(typeof result.error).toBe('string')
    })

    it('returns status failed when oauthToken is too short (under 10 chars after trim)', async () => {
      const agent = new PublishAgent()
      const result = await agent.run(AUDIO_URL, TOPIC, darkloreConfig, '   short')

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
    })

    it('sanitizes oauthToken with control chars and proceeds to upload', async () => {
      // Token with control characters but sufficient length after sanitization
      const tokenWithControlChars = 'valid\x01token\x0Bwith\x1Fchars1234'

      // Mock: audio fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })
      // Mock: YouTube upload succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'abc123', snippet: { title: 'Test Video' } }),
      })

      const agent = new PublishAgent()
      const result = await agent.run(AUDIO_URL, TOPIC, darkloreConfig, tokenWithControlChars)

      // Should proceed past validation (token is long enough) and succeed
      expect(result.status).toBe('success')
      expect(result.data?.videoId).toBe('abc123')
    })

    it('rejects a token that is all control chars (empty after stripping)', async () => {
      const agent = new PublishAgent()
      const result = await agent.run(
        AUDIO_URL,
        'The Pontianak',
        darkloreConfig,
        '\x01'.repeat(15) // 15 control chars — passes raw length check but strips to empty
      )
      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
    })

    it('returns status success with videoId when upload succeeds', async () => {
      // Mock: audio fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1024),
      })
      // Mock: YouTube upload succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'yt-video-xyz', snippet: { title: 'My Uploaded Video' } }),
      })

      const agent = new PublishAgent()
      const result = await agent.run(AUDIO_URL, TOPIC, darkloreConfig, VALID_OAUTH)

      expect(result.status).toBe('success')
      expect(result.data).not.toBeNull()
      expect(result.data!.videoId).toBe('yt-video-xyz')
      expect(result.data!.videoUrl).toBe('https://www.youtube.com/watch?v=yt-video-xyz')
      expect(typeof result.data!.title).toBe('string')
    })

    it('returns status failed when audio fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403 })

      const agent = new PublishAgent()
      const result = await agent.run(AUDIO_URL, TOPIC, darkloreConfig, VALID_OAUTH)

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
      expect(result.error).toContain('Failed to fetch audio')
    })

    it('returns status failed when YouTube upload returns non-ok status', async () => {
      // Mock: audio fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })
      // Mock: YouTube upload fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      })

      const agent = new PublishAgent()
      const result = await agent.run(AUDIO_URL, TOPIC, darkloreConfig, VALID_OAUTH)

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
      expect(result.error).toContain('YouTube authorization expired')
    })
  })

  // ── Never-throws guarantee ─────────────────────────────────────────────────

  describe('never throws', () => {
    beforeEach(() => {
      // Trigger catch block by giving DRY_RUN an unexpected state and throwing
      // We override DRY_RUN to 'false' then pass an object that causes sanitizeTopic to throw
      process.env.DRY_RUN = 'false'
      mockFetch.mockReset()
    })

    afterEach(() => {
      delete process.env.DRY_RUN
    })

    it('returns failed if an unexpected error occurs inside the catch block', async () => {
      // Make DRY_RUN false so we reach past the early return
      const prevDryRun = process.env.DRY_RUN
      process.env.DRY_RUN = 'false'
      try {
        const agent = new PublishAgent()
        // Pass null as config to force a TypeError inside the try block
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await agent.run(AUDIO_URL, TOPIC, null as any, 'a-valid-oauth-token-here')
        expect(result.status).toBe('failed')
        expect(result.data).toBeNull()
      } finally {
        if (prevDryRun === undefined) delete process.env.DRY_RUN
        else process.env.DRY_RUN = prevDryRun
      }
    })
  })
})
