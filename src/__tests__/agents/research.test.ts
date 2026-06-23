import { dryRunSourcePackage } from '@/__fixtures__/research'
import { darkloreConfig } from '@/__fixtures__/configs/darklore'

// ─── Import after env / mocks ─────────────────────────────────────────────────

import { ResearchAgent } from '@/agents/research'

// Prevent any real network calls
const mockFetch = jest.fn()
global.fetch = mockFetch

// ─── ResearchAgent ────────────────────────────────────────────────────────────

describe('ResearchAgent', () => {
  const TOPIC = 'The Pontianak — Malaysian vampire ghost'

  // ── DRY_RUN path ──────────────────────────────────────────────────────────

  describe('DRY_RUN=true', () => {
    beforeAll(() => {
      process.env.DRY_RUN = 'true'
    })

    afterAll(() => {
      delete process.env.DRY_RUN
    })

    it('returns status success with SourcePackage shape', async () => {
      const agent = new ResearchAgent()
      const result = await agent.run(TOPIC, darkloreConfig)

      expect(result.status).toBe('success')
      expect(result.data).not.toBeNull()
      expect(Array.isArray(result.data!.sources)).toBe(true)
      expect(result.data!.sources.length).toBeGreaterThan(0)
      expect(typeof result.data!.summary).toBe('string')
      expect(typeof result.data!.confidence).toBe('number')
      expect(Array.isArray(result.data!.gaps)).toBe(true)
    })

    it('sets durationMs on result', async () => {
      const agent = new ResearchAgent()
      const result = await agent.run(TOPIC, darkloreConfig)

      expect(typeof result.durationMs).toBe('number')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('returns sourceUrls and confidence on AgentResult', async () => {
      const agent = new ResearchAgent()
      const result = await agent.run(TOPIC, darkloreConfig)

      expect(Array.isArray(result.sourceUrls)).toBe(true)
      expect(result.sourceUrls!.length).toBe(dryRunSourcePackage.sources.length)
      expect(typeof result.confidence).toBe('number')
      result.sourceUrls!.forEach((url) => {
        expect(typeof url).toBe('string')
        expect(url.startsWith('http')).toBe(true)
      })
    })
  })

  // ── Live path ──────────────────────────────────────────────────────────────

  describe('live path', () => {
    let prevDryRun: string | undefined

    beforeEach(() => {
      prevDryRun = process.env.DRY_RUN
      process.env.DRY_RUN = 'false'
      mockFetch.mockReset()
    })

    afterEach(() => {
      if (prevDryRun === undefined) {
        delete process.env.DRY_RUN
      } else {
        process.env.DRY_RUN = prevDryRun
      }
      delete process.env.TAVILY_API_KEY
    })

    it('returns status failed when TAVILY_API_KEY is missing', async () => {
      delete process.env.TAVILY_API_KEY

      const agent = new ResearchAgent()
      const result = await agent.run(TOPIC, darkloreConfig)

      expect(result.status).toBe('failed')
      expect(typeof result.error).toBe('string')
      expect(result.error!.length).toBeGreaterThan(0)
      expect(result.data).toBeNull()
    })

    it('returns status failed when Tavily returns non-ok response', async () => {
      process.env.TAVILY_API_KEY = 'test-key'
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      } as Response)

      const agent = new ResearchAgent()
      const result = await agent.run(TOPIC, darkloreConfig)

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
    })

    it('returns status failed when Tavily returns malformed JSON with no results array', async () => {
      process.env.TAVILY_API_KEY = 'test-key'
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ answer: 'some answer' }), // missing results
      } as Response)

      const agent = new ResearchAgent()
      const result = await agent.run(TOPIC, darkloreConfig)

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
    })

    it('returns status success with mapped SourcePackage when Tavily returns valid results', async () => {
      process.env.TAVILY_API_KEY = 'test-key'
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              url: 'https://example.com/pontianak',
              title: 'Pontianak Origins',
              content: 'The pontianak is a vampiric spirit from Malay folklore.',
              score: 0.9,
            },
            {
              url: 'https://example.com/folklore',
              title: 'SE Asia Folklore',
              content: 'Folklore traditions across SE Asia share common themes.',
              score: 0.75,
            },
          ],
          answer: 'The pontianak is a vampiric spirit.',
        }),
      } as Response)

      const agent = new ResearchAgent()
      const result = await agent.run(TOPIC, darkloreConfig)

      expect(result.status).toBe('success')
      expect(result.data).not.toBeNull()
      expect(result.data!.sources).toHaveLength(2)
      expect(result.data!.sources[0].url).toBe('https://example.com/pontianak')
      expect(result.data!.summary).toBe('The pontianak is a vampiric spirit.')
      expect(typeof result.data!.confidence).toBe('number')
      expect(Array.isArray(result.sourceUrls)).toBe(true)
    })

    it('returns status failed and never throws when fetch throws', async () => {
      process.env.TAVILY_API_KEY = 'test-key'
      mockFetch.mockRejectedValue(new Error('Network error'))

      const agent = new ResearchAgent()

      await expect(agent.run(TOPIC, darkloreConfig)).resolves.toMatchObject({
        status: 'failed',
        data: null,
      })
    })
  })
})
