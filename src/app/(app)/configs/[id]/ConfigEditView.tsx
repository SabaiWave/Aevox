'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ChannelConfigForm, { type ChannelConfigFormData } from '@/components/ChannelConfigForm'
import type { ChannelConfig } from '@/types'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConfigEditViewProps {
  config?: ChannelConfig
  id: string
  isAdmin?: boolean
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConfigEditView({ config, id, isAdmin }: ConfigEditViewProps) {
  const router = useRouter()
  const isNew = id === 'new'

  const [isSaving, setIsSaving] = useState(false)

  async function handleSave(formData: ChannelConfigFormData) {
    setIsSaving(true)

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
        router.push('/configs')
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
        router.push('/configs')
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

      <ChannelConfigForm config={config} onSave={handleSave} isSaving={isSaving} isAdmin={isAdmin} />
    </div>
  )
}
