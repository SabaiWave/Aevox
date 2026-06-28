export interface CuratedVoice {
  id: string
  name: string
  description: string
  voiceId: string
  voiceModel: string
}

export const VOICES: CuratedVoice[] = [
  {
    id: 'daniel',
    name: 'Daniel',
    description: 'Deep British male · Documentary',
    voiceId: 'onwK4e9ZLuTAKqWW03F9',
    voiceModel: 'eleven_multilingual_v2',
  },
  {
    id: 'callum',
    name: 'Callum',
    description: 'Intense male · Dramatic storytelling',
    voiceId: 'N2lVS1w4EtoT3dr4eOWO',
    voiceModel: 'eleven_multilingual_v2',
  },
  {
    id: 'liam',
    name: 'Liam',
    description: 'Articulate male · Clear narration',
    voiceId: 'TX3LPaxmHKxFdv7VOQHJ',
    voiceModel: 'eleven_multilingual_v2',
  },
  {
    id: 'arnold',
    name: 'Arnold',
    description: 'Crisp American male · Authoritative',
    voiceId: 'VR6AewLTigWG4xSOukaG',
    voiceModel: 'eleven_multilingual_v2',
  },
  {
    id: 'josh',
    name: 'Josh',
    description: 'Deep American male · Conversational',
    voiceId: 'TxGEqnHWrfWFTfGW9XjX',
    voiceModel: 'eleven_multilingual_v2',
  },
  {
    id: 'rachel',
    name: 'Rachel',
    description: 'Warm American female · Narrative',
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    voiceModel: 'eleven_multilingual_v2',
  },
  {
    id: 'matilda',
    name: 'Matilda',
    description: 'Warm female · Conversational',
    voiceId: 'XrExE9yKIg1WjnnlVkGX',
    voiceModel: 'eleven_multilingual_v2',
  },
  {
    id: 'dorothy',
    name: 'Dorothy',
    description: 'Pleasant British female · Educational',
    voiceId: 'ThT5KcBeYPX3keUQqHPh',
    voiceModel: 'eleven_multilingual_v2',
  },
  {
    id: 'freya',
    name: 'Freya',
    description: 'Expressive female · Engaging',
    voiceId: 'jsCqWAovK2LkecY7zXl4',
    voiceModel: 'eleven_multilingual_v2',
  },
  {
    id: 'james',
    name: 'James',
    description: 'Calm male · Meditative narration',
    voiceId: 'ZQe5CZNOzWyzPSCn5a3c',
    voiceModel: 'eleven_multilingual_v2',
  },
]

export const DEFAULT_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'

export function getVoiceSampleUrl(voiceId: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${base}/storage/v1/object/public/media/voice-samples/${voiceId}.mp3`
}
