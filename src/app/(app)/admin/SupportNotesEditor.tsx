'use client'

import { useState } from 'react'

interface SupportNotesEditorProps {
  userId: string
  initialNotes: string | null
}

export function SupportNotesEditor({ userId, initialNotes }: SupportNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function handleSave() {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/support-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notes }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFeedback({ type: 'error', message: (data as { error?: string }).error ?? 'Save failed' })
      } else {
        setFeedback({ type: 'success', message: 'Saved' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label
        style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
        }}
      >
        Support notes
      </label>
      <textarea
        value={notes}
        onChange={e => {
          setNotes(e.target.value)
          setFeedback(null)
        }}
        maxLength={2000}
        rows={3}
        style={{
          width: '100%',
          resize: 'vertical',
          padding: '0.5rem 0.75rem',
          borderRadius: '6px',
          border: '1px solid var(--color-border-1)',
          background: 'var(--color-surface-2)',
          color: 'var(--color-text-primary)',
          fontSize: '0.8125rem',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
        placeholder="Add support notes…"
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.375rem 0.875rem',
            borderRadius: '6px',
            border: 'none',
            background: saving ? 'var(--color-surface-2)' : 'var(--color-primary)',
            color: saving ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {feedback && (
          <span
            style={{
              fontSize: '0.8125rem',
              color:
                feedback.type === 'success'
                  ? 'var(--color-status-complete)'
                  : 'var(--color-status-failed)',
            }}
          >
            {feedback.message}
          </span>
        )}
      </div>
    </div>
  )
}
