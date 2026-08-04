import { getSupabaseServerClient } from '@/lib/supabase-server'
import type { AgentResult, ChannelConfig, VoiceOutput } from '@/types'
import { log } from '@/lib/logger'

export class VoiceAgent {
  async run(
    script: string,
    config: ChannelConfig,
    runId: string,
    opts?: { dryRun?: boolean },
  ): Promise<AgentResult<VoiceOutput>> {
    const start = Date.now()
    const storagePath = `videos/${runId}/audio.mp3`
    const isDryRun = opts?.dryRun || process.env.DRY_RUN === 'true'

    await log.info('[VoiceAgent] start', { agent: 'VoiceAgent', runId, configId: config.id, stage: 'voice' })

    try {
      if (isDryRun) {
        const { dryRunVoiceOutput } = await import('@/__fixtures__/voice')
        await log.info('[VoiceAgent] complete', { agent: 'VoiceAgent', runId, configId: config.id, stage: 'voice', durationMs: Date.now() - start, dryRun: true })
        return {
          status: 'success',
          data: {
            ...dryRunVoiceOutput,
            durationSeconds: Math.round((script.length / 150) * 60),
            charsUsed: script.length,
          },
          durationMs: Date.now() - start,
          usage: { charsUsed: script.length },
        }
      }

      const apiKey = process.env.ELEVENLABS_API_KEY
      if (!apiKey) {
        await log.error('[VoiceAgent] failed', { agent: 'VoiceAgent', runId, configId: config.id, stage: 'voice', durationMs: Date.now() - start, error: 'Voice agent is not configured' })
        return {
          status: 'failed',
          data: null,
          error: 'Voice service is unavailable. Please contact support.',
          durationMs: Date.now() - start,
        }
      }
      if (!/^[a-zA-Z0-9]{10,40}$/.test(config.voiceId)) {
        await log.error('[VoiceAgent] failed', { agent: 'VoiceAgent', runId, configId: config.id, stage: 'voice', durationMs: Date.now() - start, error: 'Invalid voice ID' })
        return {
          status: 'failed',
          data: null,
          error: 'Invalid voice ID',
          durationMs: Date.now() - start,
        }
      }
      const safeScript = script.replace(/[\x00-\x08\x0B\x0C\x0D\x0E-\x1F]/g, '').slice(0, 5000)
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text: safeScript,
            model_id: config.voiceModel,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        }
      )

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText)
        let userMessage = 'Voice generation failed. Please try again.'
        let parsedErr: { detail?: { code?: string } } = {}
        try { parsedErr = JSON.parse(errText) } catch { /* not JSON */ }
        const errCode = parsedErr?.detail?.code
        if (errCode === 'quota_exceeded' || response.status === 402) {
          userMessage = 'Voice character quota exceeded for this billing period. Upgrade your plan to continue.'
        } else if (response.status === 404) {
          userMessage = 'Voice generation failed — voice ID not found. Update the voice ID in your channel config.'
        } else if (response.status === 401) {
          userMessage = 'Voice generation failed — API configuration error. Contact support.'
        } else if (response.status === 429) {
          userMessage = 'Voice generation is temporarily unavailable. Try again shortly.'
        }
        await log.error('[VoiceAgent] failed', { agent: 'VoiceAgent', runId, configId: config.id, stage: 'voice', durationMs: Date.now() - start, statusCode: response.status, detail: errText })
        return {
          status: 'failed',
          data: null,
          error: userMessage,
          durationMs: Date.now() - start,
        }
      }

      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = Buffer.from(arrayBuffer)

      const supabase = getSupabaseServerClient()

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(storagePath, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        })

      if (uploadError) {
        await log.error('[VoiceAgent] failed', { agent: 'VoiceAgent', runId, configId: config.id, stage: 'voice', durationMs: Date.now() - start, error: `Supabase upload error: ${uploadError.message}` })
        return {
          status: 'failed',
          data: null,
          error: 'Failed to save audio file. Please try again.',
          durationMs: Date.now() - start,
        }
      }

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(storagePath)

      await log.info('[VoiceAgent] complete', { agent: 'VoiceAgent', runId, configId: config.id, stage: 'voice', durationMs: Date.now() - start })
      return {
        status: 'success',
        data: {
          audioUrl: urlData.publicUrl,
          durationSeconds: Math.round((safeScript.length / 150) * 60),
          charsUsed: safeScript.length,
        },
        durationMs: Date.now() - start,
        usage: { charsUsed: safeScript.length },
      }
    } catch (err) {
      await log.error('[VoiceAgent] failed', { agent: 'VoiceAgent', runId, configId: config.id, stage: 'voice', durationMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) })
      return {
        status: 'failed',
        data: null,
        error: 'Voice generation failed unexpectedly. Please try again.',
        durationMs: Date.now() - start,
      }
    }
  }
}
