import { dryRunScript } from '@/__fixtures__/script'
import { dryRunSourcePackage } from '@/__fixtures__/research'
import { darkloreConfig } from '@/__fixtures__/configs/darklore'

// ─── Anthropic mock ───────────────────────────────────────────────────────────

const mockMessagesCreate = jest.fn()

jest.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
  }))
  return { __esModule: true, default: MockAnthropic }
})

// ─── Import after mocks ───────────────────────────────────────────────────────

import { ScriptAgent } from '@/agents/script'

// ─── ScriptAgent ──────────────────────────────────────────────────────────────

describe('ScriptAgent', () => {
  const TOPIC = 'The Pontianak — Malaysian vampire ghost'

  // ── DRY_RUN path ──────────────────────────────────────────────────────────

  describe('DRY_RUN=true', () => {
    beforeAll(() => {
      process.env.DRY_RUN = 'true'
    })

    afterAll(() => {
      delete process.env.DRY_RUN
    })

    it('returns status success with non-empty script string', async () => {
      const agent = new ScriptAgent()
      const result = await agent.run(TOPIC, dryRunSourcePackage, darkloreConfig)

      expect(result.status).toBe('success')
      expect(typeof result.data).toBe('string')
      expect(result.data!.trim().length).toBeGreaterThan(0)
      expect(result.data).toBe(dryRunScript)
    })

    it('sets durationMs on result', async () => {
      const agent = new ScriptAgent()
      const result = await agent.run(TOPIC, dryRunSourcePackage, darkloreConfig)

      expect(typeof result.durationMs).toBe('number')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })
  })

  // ── Live path ──────────────────────────────────────────────────────────────

  describe('live path', () => {
    beforeEach(() => {
      process.env.DRY_RUN = 'false'
      jest.clearAllMocks()
    })

    afterEach(() => {
      delete process.env.ANTHROPIC_API_KEY
      delete process.env.DRY_RUN
    })

    it('returns status failed when ANTHROPIC_API_KEY is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY

      const agent = new ScriptAgent()
      const result = await agent.run(TOPIC, dryRunSourcePackage, darkloreConfig)

      expect(result.status).toBe('failed')
      expect(typeof result.error).toBe('string')
      expect(result.error!.length).toBeGreaterThan(0)
      // Must not expose env var name in error message
      expect(result.error).not.toContain('ANTHROPIC_API_KEY')
      expect(result.data).toBeNull()
    })

    it('returns status failed and never throws when Anthropic throws', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key'
      mockMessagesCreate.mockRejectedValue(new Error('Service unavailable'))

      const agent = new ScriptAgent()

      await expect(
        agent.run(TOPIC, dryRunSourcePackage, darkloreConfig),
      ).resolves.toMatchObject({
        status: 'failed',
        data: null,
      })
    })

    it('returns status success with script string when Anthropic returns content', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key'
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'In the dark of night, the Pontianak walks.' }],
      })

      const agent = new ScriptAgent()
      const result = await agent.run(TOPIC, dryRunSourcePackage, darkloreConfig)

      expect(result.status).toBe('success')
      expect(typeof result.data).toBe('string')
      expect(result.data!.length).toBeGreaterThan(0)
      expect(result.data).toBe('In the dark of night, the Pontianak walks.')
    })
  })

  // ── Topic sanitization ─────────────────────────────────────────────────────

  describe('topic sanitization', () => {
    beforeAll(() => {
      process.env.DRY_RUN = 'false'
      process.env.ANTHROPIC_API_KEY = 'test-key'
    })

    afterAll(() => {
      delete process.env.DRY_RUN
      delete process.env.ANTHROPIC_API_KEY
    })

    beforeEach(() => {
      jest.clearAllMocks()
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'A valid script output.' }],
      })
    })

    it('strips control characters and enforces max 500 chars on topic', async () => {
      // Topic with control chars and over 500 chars
      const controlChars = '\x01\x02\x03\x0B\x0C\x0E\x1F'
      const longTopic = 'A'.repeat(600)
      const rawTopic = controlChars + longTopic

      const agent = new ScriptAgent()
      const result = await agent.run(rawTopic, dryRunSourcePackage, darkloreConfig)

      expect(result.status).toBe('success')
      expect(mockMessagesCreate).toHaveBeenCalledTimes(1)

      // Verify the user message passed to Anthropic has sanitized topic
      const callArgs = mockMessagesCreate.mock.calls[0][0]
      const userMessage = callArgs.messages[0].content as string

      // The topic in the message should not contain the control chars
      expect(userMessage).not.toMatch(/[\x01\x02\x03\x0B\x0C\x0E\x1F]/)
      // The topic portion should be at most 500 chars (original long topic was 600)
      const topicLine = userMessage.split('\n')[0] // "Topic: ..."
      const topicValue = topicLine.replace('Topic: ', '')
      expect(topicValue.length).toBeLessThanOrEqual(500)
    })
  })
})
