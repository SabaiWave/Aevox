import { getSupabaseServerClient } from '@/lib/supabase-server'
import type { AgentResult, ChannelConfig, VoiceOutput } from '@/types'

export class VoiceAgent {
  async run(
    script: string,
    config: ChannelConfig,
    runId: string
  ): Promise<AgentResult<VoiceOutput>> {
    const start = Date.now()
    const storagePath = `pipeline/${runId}/audio.mp3`

    try {
      let audioBuffer: Buffer

      if (process.env.DRY_RUN === 'true') {
        audioBuffer = Buffer.alloc(32)
      } else {
        const apiKey = process.env.ELEVENLABS_API_KEY
        if (!apiKey) {
          return {
            status: 'failed',
            data: null,
            error: 'Voice agent is not configured',
            durationMs: Date.now() - start,
          }
        }
        if (!/^[a-zA-Z0-9]{10,40}$/.test(config.voiceId)) {
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
          console.error(`[VoiceAgent] ElevenLabs ${response.status}:`, errText)
          let userMessage = `Voice generation failed (${response.status})`
          if (response.status === 402) {
            userMessage = 'ElevenLabs: paid plan required for this voice. Use a voice from your own ElevenLabs account.'
          } else if (response.status === 401) {
            userMessage = 'ElevenLabs: invalid API key.'
          } else if (response.status === 429) {
            userMessage = 'ElevenLabs: rate limit exceeded. Try again shortly.'
          }
          return {
            status: 'failed',
            data: null,
            error: userMessage,
            durationMs: Date.now() - start,
          }
        }

        const arrayBuffer = await response.arrayBuffer()
        audioBuffer = Buffer.from(arrayBuffer)
      }

      const supabase = getSupabaseServerClient()

      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(storagePath, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        })

      if (uploadError) {
        return {
          status: 'failed',
          data: null,
          error: `Supabase upload error: ${uploadError.message}`,
          durationMs: Date.now() - start,
        }
      }

      const { data: urlData } = supabase.storage
        .from('audio')
        .getPublicUrl(storagePath)

      const audioUrl = urlData.publicUrl
      const durationSeconds =
        process.env.DRY_RUN === 'true'
          ? Math.round((script.length / 150) * 60)
          : Math.round((script.length / 150) * 60)

      return {
        status: 'success',
        data: {
          audioUrl,
          durationSeconds,
          charsUsed: script.length,
        },
        durationMs: Date.now() - start,
        usage: { charsUsed: script.length },
      }
    } catch (err) {
      console.error('[VoiceAgent] Unexpected error:', err)
      return {
        status: 'failed',
        data: null,
        error: 'Voice generation failed unexpectedly. Check server logs.',
        durationMs: Date.now() - start,
      }
    }
  }
}
