'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ChannelConfigForm, { type ChannelConfigFormData } from '@/components/ChannelConfigForm'
import type { ChannelConfig } from '@/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConfigEditViewProps {
  config?: ChannelConfig
  id: string
}

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
      if (isNew) {
        const res = await fetch('/api/configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        const json = await res.json()
        if (!res.ok || !json.data?.id) {
          throw new Error(json.error ?? 'Create failed')
        }
        router.push(`/configs/${json.data.id}`)
      } else {
        const res = await fetch(`/api/configs/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error ?? 'Update failed')
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
