/**
 * Generates voice sample MP3s for each curated voice and uploads to Supabase Storage.
 * Stored at: audio bucket → voice-samples/{voiceId}.mp3
 * Usage: npm run voices:seed
 *
 * Run once when adding new voices to the curated list.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SAMPLE_TEXT =
  'Deep in the mountains, an ancient legend has endured for centuries. Tonight, we uncover its secrets.'

const VOICE_MODEL = 'eleven_multilingual_v2'

const VOICES = [
  { id: 'daniel', voiceId: 'onwK4e9ZLuTAKqWW03F9' },
  { id: 'callum', voiceId: 'N2lVS1w4EtoT3dr4eOWO' },
  { id: 'liam', voiceId: 'TX3LPaxmHKxFdv7VOQHJ' },
  { id: 'arnold', voiceId: 'VR6AewLTigWG4xSOukaG' },
  { id: 'josh', voiceId: 'TxGEqnHWrfWFTfGW9XjX' },
  { id: 'rachel', voiceId: '21m00Tcm4TlvDq8ikWAM' },
  { id: 'matilda', voiceId: 'XrExE9yKIg1WjnnlVkGX' },
  { id: 'dorothy', voiceId: 'ThT5KcBeYPX3keUQqHPh' },
  { id: 'freya', voiceId: 'jsCqWAovK2LkecY7zXl4' },
  { id: 'james', voiceId: 'ZQe5CZNOzWyzPSCn5a3c' },
]

async function generateSample(voiceId: string, apiKey: string): Promise<Buffer> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: SAMPLE_TEXT,
      model_id: VOICE_MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`ElevenLabs error for ${voiceId}: ${response.status} ${err}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!apiKey || !supabaseUrl || !supabaseKey) {
    console.error('Missing env: ELEVENLABS_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'klipto' },
    auth: { persistSession: false },
  })

  for (const voice of VOICES) {
    const storagePath = `voice-samples/${voice.voiceId}.mp3`
    console.log(`[${voice.id}] generating...`)

    try {
      const audio = await generateSample(voice.voiceId, apiKey)

      const { error } = await supabase.storage.from('media').upload(storagePath, audio, {
        contentType: 'audio/mpeg',
        upsert: true,
      })

      if (error) {
        console.error(`[${voice.id}] upload failed: ${error.message}`)
        continue
      }

      const { data } = supabase.storage.from('media').getPublicUrl(storagePath)
      console.log(`[${voice.id}] ✓ ${data.publicUrl}`)
    } catch (err) {
      console.error(`[${voice.id}] failed:`, err instanceof Error ? err.message : err)
    }
  }

  console.log('\nDone.')
}

main()
