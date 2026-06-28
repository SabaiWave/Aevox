export interface ChannelTemplate {
  id: string
  name: string
  tagline: string
  niche: string
  tone: string
  scriptStructure: string
  voiceId: string
  ytCategoryId: string
}

export const CHANNEL_TEMPLATES: ChannelTemplate[] = [
  {
    id: 'true-crime',
    name: 'True Crime',
    tagline: 'Cold cases & criminal minds',
    niche: 'True crime & criminal justice',
    tone: 'Suspenseful, investigative',
    scriptStructure:
      'Hook — victim intro (45s) → Crime scene reconstruction (2min) → Investigation timeline (3min) → Trial & verdict (2min) → Outro + lingering questions (30s)',
    voiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum
    ytCategoryId: '24',
  },
  {
    id: 'history-documentary',
    name: 'History',
    tagline: 'Forgotten events & lost empires',
    niche: 'History & historical events',
    tone: 'Authoritative, educational',
    scriptStructure:
      'Hook — historical mystery (30s) → Era context (2min) → Key events deep-dive (4min) → Legacy & modern impact (2min) → Outro (30s)',
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel
    ytCategoryId: '27',
  },
  {
    id: 'finance-explainer',
    name: 'Finance',
    tagline: 'Money concepts made simple',
    niche: 'Personal finance & investing',
    tone: 'Clear, practical, confident',
    scriptStructure:
      'Hook — relatable money problem (30s) → Core concept explained (2min) → Real-world examples (3min) → Actionable takeaways (2min) → Outro + CTA (30s)',
    voiceId: 'TX3LPaxmHKxFdv7VOQHJ', // Liam
    ytCategoryId: '27',
  },
  {
    id: 'horror-paranormal',
    name: 'Horror',
    tagline: 'Hauntings, folklore & the unknown',
    niche: 'Horror & paranormal storytelling',
    tone: 'Eerie, mysterious, unsettling',
    scriptStructure:
      'Hook — unsettling teaser (45s) → Location or entity background (2min) → Eyewitness accounts (3min) → Expert analysis (1min) → Outro — open ending (30s)',
    voiceId: 'N2lVS1w4EtoT3dr4eOWO', // Callum
    ytCategoryId: '24',
  },
  {
    id: 'science-discovery',
    name: 'Science',
    tagline: 'Discoveries that change everything',
    niche: 'Science & discovery',
    tone: 'Curious, engaging, accessible',
    scriptStructure:
      'Hook — surprising fact or question (30s) → Scientific context (2min) → Deep dive into the discovery (4min) → Real-world implications (2min) → Outro (30s)',
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
    ytCategoryId: '28',
  },
  {
    id: 'motivation',
    name: 'Motivation',
    tagline: 'Stories that drive action',
    niche: 'Motivational storytelling & self-improvement',
    tone: 'Inspiring, direct, energetic',
    scriptStructure:
      'Hook — relatable struggle (30s) → Story of adversity (2min) → Turning point moment (2min) → Lessons & principles (3min) → Call to action (30s)',
    voiceId: 'ZQe5CZNOzWyzPSCn5a3c', // James
    ytCategoryId: '26',
  },
]

export const YOUTUBE_CATEGORIES = [
  { value: '1', label: 'Film & Animation' },
  { value: '2', label: 'Autos & Vehicles' },
  { value: '10', label: 'Music' },
  { value: '15', label: 'Pets & Animals' },
  { value: '17', label: 'Sports' },
  { value: '19', label: 'Travel & Events' },
  { value: '20', label: 'Gaming' },
  { value: '22', label: 'People & Blogs' },
  { value: '23', label: 'Comedy' },
  { value: '24', label: 'Entertainment' },
  { value: '25', label: 'News & Politics' },
  { value: '26', label: 'Howto & Style' },
  { value: '27', label: 'Education' },
  { value: '28', label: 'Science & Technology' },
  { value: '29', label: 'Nonprofits & Activism' },
]
