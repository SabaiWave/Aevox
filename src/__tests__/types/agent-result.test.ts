import type { AgentResult } from '@/types'

describe('AgentResult', () => {
  it('accepts a success result', () => {
    const result: AgentResult<string> = {
      status: 'success',
      data: 'hello',
    }
    expect(result.status).toBe('success')
    expect(result.data).toBe('hello')
  })

  it('accepts a failed result with null data', () => {
    const result: AgentResult<string> = {
      status: 'failed',
      data: null,
      error: 'Something went wrong',
    }
    expect(result.status).toBe('failed')
    expect(result.data).toBeNull()
  })

  it('accepts a degraded result with optional fields', () => {
    const result: AgentResult<string> = {
      status: 'degraded',
      data: 'partial result',
      confidence: 0.4,
      gaps: ['missing context', 'no sources'],
      sourceUrls: ['https://example.com'],
      durationMs: 1200,
    }
    expect(result.status).toBe('degraded')
    expect(result.confidence).toBe(0.4)
    expect(result.gaps).toHaveLength(2)
    expect(result.sourceUrls).toContain('https://example.com')
    expect(result.durationMs).toBe(1200)
  })
})
