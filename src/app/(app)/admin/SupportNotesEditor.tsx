'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type SupportNote = { ts: string; note: string }

interface SupportNotesEditorProps {
  userId: string
  initialNotes: SupportNote[] | null
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SupportNotesEditor({ userId, initialNotes }: SupportNotesEditorProps) {
  const router = useRouter()
  const [notes, setNotes] = useState<SupportNote[]>(initialNotes ?? [])
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function handleSave() {
    if (!draft.trim()) return
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/support-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, note: draft.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFeedback({ type: 'error', message: (data as { error?: string }).error ?? 'Save failed' })
      } else {
        const data = await res.json() as { entry: SupportNote }
        setNotes(prev => [data.entry, ...prev])
        setDraft('')
        setFeedback({ type: 'success', message: 'Saved' })
        router.refresh()
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
        }}
      >
        Support notes
      </span>

      {/* Past entries */}
      {notes.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          {notes.map((entry, i) => (
            <div
              key={i}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--color-border-1)',
                background: 'var(--color-surface-1)',
              }}
            >
              <div
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--color-text-tertiary)',
                  marginBottom: '0.25rem',
                }}
              >
                {formatTs(entry.ts)}
              </div>
              <div
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-primary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {entry.note}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New note input */}
      <textarea
        value={draft}
        onChange={e => {
          setDraft(e.target.value)
          setFeedback(null)
        }}
        maxLength={2000}
        rows={3}
        placeholder="Add a note…"
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
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={handleSave}
          disabled={saving || !draft.trim()}
          style={{
            padding: '0.375rem 0.875rem',
            borderRadius: '6px',
            border: 'none',
            background: saving || !draft.trim() ? 'var(--color-surface-2)' : 'var(--color-primary)',
            color: saving || !draft.trim() ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: saving || !draft.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Add note'}
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
