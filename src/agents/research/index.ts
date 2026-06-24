import type { AgentResult, ChannelConfig, ResearchSource, SourcePackage } from '@/types'
import { dryRunSourcePackage } from '@/__fixtures__/research'

interface TavilyResult {
  url: string
  title: string
  content: string
  score: number
}

interface TavilyResponse {
  results: TavilyResult[]
  answer?: string
}

export class ResearchAgent {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(topic: string, _config: ChannelConfig, opts?: { dryRun?: boolean }): Promise<AgentResult<SourcePackage>> {
    const start = Date.now()
    const isDryRun = opts?.dryRun || process.env.DRY_RUN === 'true'

    if (isDryRun) {
      return {
        status: 'success',
        data: dryRunSourcePackage,
        confidence: dryRunSourcePackage.confidence,
        gaps: dryRunSourcePackage.gaps,
        sourceUrls: dryRunSourcePackage.sources.map((s) => s.url),
        durationMs: Date.now() - start,
      }
    }

    try {
      const apiKey = process.env.TAVILY_API_KEY
      if (!apiKey) {
        return {
          status: 'failed',
          data: null,
          error: 'TAVILY_API_KEY is not set',
          durationMs: Date.now() - start,
        }
      }

      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query: topic,
          search_depth: 'advanced',
          max_results: 8,
        }),
      })

      if (!response.ok) {
        return {
          status: 'failed',
          data: null,
          error: `Tavily returned ${response.status}`,
          durationMs: Date.now() - start,
        }
      }

      const json = (await response.json()) as TavilyResponse

      if (!Array.isArray(json.results)) {
        throw new Error('Tavily response missing results array')
      }

      const sources: ResearchSource[] = (json.results ?? []).map((r) => ({
        url: r.url,
        title: r.title,
        snippet: r.content,
        confidence: Math.min(1, Math.max(0, r.score ?? 0)),
      }))

      const overallConfidence =
        sources.length > 0
          ? sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length
          : 0

      const data: SourcePackage = {
        sources,
        summary: json.answer ?? `Research results for: ${topic}`,
        confidence: overallConfidence,
        gaps: [],
      }

      return {
        status: 'success',
        data,
        confidence: overallConfidence,
        gaps: [],
        sourceUrls: sources.map((s) => s.url),
        durationMs: Date.now() - start,
        usage: { searchCount: 1 },
      }
    } catch (err) {
      return {
        status: 'failed',
        data: null,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      }
    }
  }
}
