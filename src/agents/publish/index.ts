import type { AgentResult, ChannelConfig, PublishOutput } from '@/types'
import { dryRunPublishOutput } from '@/__fixtures__/publish'

function sanitizeTopic(topic: string): string {
  return topic
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control chars except \n \t
    .slice(0, 200)
}

export class PublishAgent {
  async run(
    audioUrl: string,
    topic: string,
    config: ChannelConfig,
    oauthToken: string
  ): Promise<AgentResult<PublishOutput>> {
    const start = Date.now()

    try {
      if (process.env.DRY_RUN === 'true') {
        return {
          status: 'success',
          data: dryRunPublishOutput,
          durationMs: Date.now() - start,
        }
      }

      // Fix 1: strip control chars FIRST, then validate against the actual string used in the header
      const safeToken = oauthToken.replace(/[\x00-\x1F]/g, '')
      if (!safeToken || safeToken.trim().length < 10) {
        return {
          status: 'failed',
          data: null,
          error: 'Invalid OAuth token',
          durationMs: Date.now() - start,
        }
      }

      // Fix 4: sanitize ytTags before use
      const safeTags = config.ytTags
        .map(t => t.replace(/[\x00-\x1F<>]/g, '').slice(0, 30))
        .slice(0, 15)

      // Retain derived values so Phase 4 can reuse them when wiring real upload
      void safeToken
      void safeTags
      void sanitizeTopic(topic)

      // Fix 2: Phase 4 will implement real multipart upload with OAuth
      // For now, return degraded so pipeline can continue without publish
      return {
        status: 'degraded',
        data: null,
        error: 'YouTube publish requires OAuth — configure in Phase 4',
        durationMs: Date.now() - start,
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
