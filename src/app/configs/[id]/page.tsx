import { getSupabaseServerClient } from '@/lib/supabase-server'
import type { ChannelConfig } from '@/types'
import ConfigEditView from './ConfigEditView'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const isNew = id === 'new'

  if (isNew) {
    return <ConfigEditView id="new" config={undefined} />
  }

  // ── Fetch existing config ──────────────────────────────────────────────────
  const supabase = getSupabaseServerClient()
  const { data: row, error } = await supabase
    .from('channel_configs')
    .select(
      'id, user_id, name, niche, tone, script_structure, target_duration_min, forbidden_topics, voice_id, voice_model, yt_title_template, yt_description_template, yt_tags, yt_category_id, yt_privacy, created_at, updated_at',
    )
    .eq('id', id)
    .single()

  if (error || !row) {
    return (
      <div
        style={{
          padding: '2rem',
          color: 'var(--color-status-failed)',
          fontSize: '0.875rem',
        }}
      >
        Config not found.
      </div>
    )
  }

  // ── Map snake_case → ChannelConfig camelCase ───────────────────────────────
  const config: ChannelConfig = {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    niche: row.niche,
    tone: row.tone,
    scriptStructure: row.script_structure,
    targetDurationMin: row.target_duration_min,
    forbiddenTopics: row.forbidden_topics,
    voiceId: row.voice_id,
    voiceModel: row.voice_model,
    ytTitleTemplate: row.yt_title_template,
    ytDescriptionTemplate: row.yt_description_template,
    ytTags: row.yt_tags,
    ytCategoryId: row.yt_category_id,
    ytPrivacy: row.yt_privacy,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

  return <ConfigEditView id={id} config={config} />
}
