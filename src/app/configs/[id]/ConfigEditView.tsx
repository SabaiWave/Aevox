'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ChannelConfigForm, { type ChannelConfigFormData } from '@/components/ChannelConfigForm'
import { getSupabaseClient } from '@/lib/supabase'
import type { ChannelConfig } from '@/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConfigEditViewProps {
  config?: ChannelConfig
  id: string
}

// Pre-auth stub. Replaced in Phase 4 with real Clerk userId.
const PRE_AUTH_USER_ID = 'anonymous'

// ─── Styles ───────────────────────────────────────────────────────────────────

const headerStyle: React.CSSProperties = {
  marginBottom: '1.5rem',
}

const backLinkStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--color-accent)',
  textDecoration: 'none',
  display: 'inline-block',
  marginBottom: '0.75rem',
}

const h1Style: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  margin: 0,
}

const savedTextStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--color-status-complete)',
  marginTop: '0.75rem',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConfigEditView({ config, id }: ConfigEditViewProps) {
  const router = useRouter()
  const isNew = id === 'new'

  const [isSaving, setIsSaving] = useState(false)
  const [savedVisible, setSavedVisible] = useState(false)

  // Auto-hide the "Saved" feedback after 3 seconds
  useEffect(() => {
    if (!savedVisible) return
    const timer = setTimeout(() => setSavedVisible(false), 3000)
    return () => clearTimeout(timer)
  }, [savedVisible])

  async function handleSave(formData: ChannelConfigFormData) {
    setIsSaving(true)
    setSavedVisible(false)

    try {
      const supabase = getSupabaseClient()

      if (isNew) {
        const { data, error } = await supabase
          .from('channel_configs')
          .insert({
            user_id: PRE_AUTH_USER_ID,
            name: formData.name,
            niche: formData.niche,
            tone: formData.tone,
            script_structure: formData.scriptStructure,
            target_duration_min: formData.targetDurationMin,
            forbidden_topics: formData.forbiddenTopics,
            voice_id: formData.voiceId,
            voice_model: formData.voiceModel,
            yt_title_template: formData.ytTitleTemplate,
            yt_description_template: formData.ytDescriptionTemplate,
            yt_tags: formData.ytTags,
            yt_category_id: formData.ytCategoryId,
            yt_privacy: formData.ytPrivacy,
          })
          .select('id')
          .single()

        if (error || !data) {
          throw new Error(error?.message ?? 'Insert failed')
        }

        router.push(`/configs/${data.id}`)
      } else {
        const { error } = await supabase
          .from('channel_configs')
          .update({
            name: formData.name,
            niche: formData.niche,
            tone: formData.tone,
            script_structure: formData.scriptStructure,
            target_duration_min: formData.targetDurationMin,
            forbidden_topics: formData.forbiddenTopics,
            voice_id: formData.voiceId,
            voice_model: formData.voiceModel,
            yt_title_template: formData.ytTitleTemplate,
            yt_description_template: formData.ytDescriptionTemplate,
            yt_tags: formData.ytTags,
            yt_category_id: formData.ytCategoryId,
            yt_privacy: formData.ytPrivacy,
          })
          .eq('id', id)

        if (error) {
          throw new Error(error.message)
        }

        setSavedVisible(true)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const pageTitle = isNew ? 'New Channel Config' : `Edit: ${config?.name ?? ''}`

  return (
    <div>
      <div style={headerStyle}>
        <Link href="/configs" style={backLinkStyle}>
          &larr; All Configs
        </Link>
        <h1 style={h1Style}>{pageTitle}</h1>
      </div>

      <ChannelConfigForm config={config} onSave={handleSave} isSaving={isSaving} />

      {savedVisible && (
        <p style={savedTextStyle}>Saved successfully</p>
      )}
    </div>
  )
}
