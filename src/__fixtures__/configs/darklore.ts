import type { ChannelConfig } from '@/types'

export const darkloreConfig: ChannelConfig = {
  id: 'darklore-seed-id',
  userId: 'seed-user-id',
  name: 'DarkLore',
  niche: 'SE Asia folklore, urban legends, and mythological horror',
  tone: 'atmospheric, slow-burn suspense with cultural reverence',
  scriptStructure: 'hook-mystery-reveal-reflection-cta',
  targetDurationMin: 10,
  forbiddenTopics: [
    'modern politics',
    'real living people',
    'graphic gore',
    'religious mockery',
  ],
  voiceId: 'ABCDEFGHIJabcdefgh01',
  voiceModel: 'eleven_multilingual_v2',
  ytTitleTemplate: '{topic} | DarkLore',
  ytDescriptionTemplate:
    'Exploring the dark folklore of Southeast Asia. {topic}\n\n#folklore #SEAsia #horror #mythology',
  ytTags: [
    'folklore',
    'SE Asia',
    'mythology',
    'horror',
    'urban legends',
    'Thailand',
    'Philippines',
    'Indonesia',
    'Malaysia',
    'Vietnam',
  ],
  ytCategoryId: '22',
  ytPrivacy: 'private',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}
