-- Seed: DarkLore channel config for local development
-- Run after migrations: supabase db reset (applies migrations + seed)

INSERT INTO users (id, clerk_id, email, tier)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'seed_clerk_user',
  'seed@darklore.dev',
  'pro'
)
ON CONFLICT (clerk_id) DO NOTHING;

INSERT INTO channel_configs (
  id,
  user_id,
  name,
  niche,
  tone,
  script_structure,
  target_duration_min,
  forbidden_topics,
  voice_id,
  voice_model,
  yt_title_template,
  yt_description_template,
  yt_tags,
  yt_category_id,
  yt_privacy,
  created_at,
  updated_at
)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'DarkLore',
  'SE Asia folklore, urban legends, and mythological horror',
  'atmospheric, slow-burn suspense with cultural reverence',
  'hook-mystery-reveal-reflection-cta',
  10,
  ARRAY['modern politics', 'real living people', 'graphic gore', 'religious mockery'],
  'placeholder-voice-id',
  'eleven_multilingual_v2',
  '{topic} | DarkLore',
  E'Exploring the dark folklore of Southeast Asia. {topic}\n\n#folklore #SEAsia #horror #mythology',
  ARRAY['folklore', 'SE Asia', 'mythology', 'horror', 'urban legends', 'Thailand', 'Philippines', 'Indonesia', 'Malaysia', 'Vietnam'],
  '22',
  'private',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
