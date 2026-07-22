import { getSupabaseServerClient } from '@/lib/supabase-server'
import type { AgentResult, ChannelConfig, VoiceOutput } from '@/types'

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

    try {
      if (isDryRun) {
        const { dryRunVoiceOutput } = await import('@/__fixtures__/voice')
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
        return {
          status: 'failed',
          data: null,
          error: `Supabase upload error: ${uploadError.message}`,
          durationMs: Date.now() - start,
        }
      }

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(storagePath)

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
