import Anthropic from '@anthropic-ai/sdk'
import type { AgentResult, ChannelConfig, SourcePackage } from '@/types'
import { dryRunScript } from '@/__fixtures__/script'

function sanitizeTopic(raw: string): string {
  // Strip control characters except \n and \t, enforce max 500 chars
  return raw
    .replace(/[\x00-\x08\x0B\x0C\x0D\x0E-\x1F]/g, '')
    .slice(0, 500)
}

function sanitizeField(s: string): string {
  return s.replace(/[\x00-\x1F]/g, ' ').slice(0, 200)
}

function buildSystemPrompt(config: ChannelConfig): string {
  const forbidden =
    config.forbiddenTopics.length > 0
      ? `\nNever mention: ${config.forbiddenTopics.map(t => t.replace(/[\r\n]/g, ' ').slice(0, 100)).join(', ')}.`
      : ''

  return [
    `You are a YouTube scriptwriter for the channel "${sanitizeField(config.name)}".`,
    `Niche: ${sanitizeField(config.niche)}.`,
    `Tone: ${sanitizeField(config.tone)}.`,
    `Script structure: ${sanitizeField(config.scriptStructure)}.`,
    `Target duration: ${config.targetDurationMin} minutes of spoken voiceover (approximately ${config.targetDurationMin * 130} words).`,
    `Write ONLY the voiceover script — no stage directions, no headers, no meta-commentary.`,
    `The script will be read aloud by a voice AI; write for the ear, not the eye.${forbidden}`,
  ].join(' ')
}

function buildUserMessage(
  topic: string,
  research: SourcePackage,
): string {
  const topSources = research.sources
    .slice(0, 3)
    .map((s, i) => {
      const snippet = (s.snippet ?? '').slice(0, 300)
      return `Source ${i + 1} — ${s.title}:\n${snippet}`
    })
    .join('\n\n')

  return [
    `Topic: ${topic}`,
    ``,
    `Research summary:`,
    research.summary.slice(0, 2000),
    ``,
    `Supporting sources:`,
    topSources,
    ``,
    `Write the YouTube voiceover script for this topic now.`,
  ].join('\n')
}

export class ScriptAgent {
  async run(
    topic: string,
    research: SourcePackage,
    config: ChannelConfig,
  ): Promise<AgentResult<string>> {
    const start = Date.now()

    if (process.env.DRY_RUN === 'true') {
      return {
        status: 'success',
        data: dryRunScript,
        durationMs: Date.now() - start,
      }
    }

    try {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        return {
          status: 'failed',
          data: null,
          error: 'Script agent is not configured',
          durationMs: Date.now() - start,
        }
      }

      const client = new Anthropic({ apiKey })
      const cleanTopic = sanitizeTopic(topic)

      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: buildSystemPrompt(config),
        messages: [
          {
            role: 'user',
            content: buildUserMessage(cleanTopic, research),
          },
        ],
      })

      const block = message.content.find((b) => b.type === 'text')
      if (!block || block.type !== 'text' || !block.text.trim()) {
        return {
          status: 'failed',
          data: null,
          error: 'Anthropic returned an empty script',
          durationMs: Date.now() - start,
        }
      }

      return {
        status: 'success',
        data: block.text.trim(),
        durationMs: Date.now() - start,
        usage: {
          tokensIn: message.usage.input_tokens,
          tokensOut: message.usage.output_tokens,
        },
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
