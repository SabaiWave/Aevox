'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  configs: { id: string; name: string }[]
}

const QUICKFILL_TOPIC = 'The Revenge of the Phi Ta Khon Festival'

const inputStyle: React.CSSProperties = {
  background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border-2)',
  borderRadius: '8px',
  fontSize: '0.875rem',
  padding: '0.5rem 0.75rem',
  color: 'var(--color-text-primary)',
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  marginBottom: '0.375rem',
}

export function DevTriggerForm({ configs }: Props) {
  const [selectedConfigId, setSelectedConfigId] = useState(configs[0]?.id ?? '')
  const [topic, setTopic] = useState('')
  const [isDryRun, setIsDryRun] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [runId, setRunId] = useState<string | null>(null)

  function handleQuickFill() {
    setSelectedConfigId(configs[0]?.id ?? '')
    setTopic(QUICKFILL_TOPIC)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim() || !selectedConfigId) return
    setIsSubmitting(true)
    setError('')
    setRunId(null)

    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configId: selectedConfigId,
          topic: topic.trim(),
          dryRun: isDryRun,
        }),
      })
      const json = (await res.json()) as { data?: { runId: string }; error?: string }
      if (json.data?.runId) {
        setRunId(json.data.runId)
      } else {
        setError(json.error ?? 'Failed to start pipeline')
      }
    } catch {
      setError('Failed to start pipeline')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (configs.length === 0) {
    return (
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
        No channel configs found for your account.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* QuickFill + Dry-run row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleQuickFill}
          style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: '4px',
            border: '1px dashed var(--color-border-2)',
            background: 'transparent',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
          }}
        >
          QuickFill
        </button>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.75rem',
            color: isDryRun ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
          }}
        >
          <input
            type="checkbox"
            checked={isDryRun}
            onChange={e => setIsDryRun(e.target.checked)}
            style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
          />
          Test run
        </label>
      </div>

      {/* Config selector */}
      <div>
        <label htmlFor="dev-config-select" style={labelStyle}>
          Channel Config
        </label>
        <select
          id="dev-config-select"
          value={selectedConfigId}
          onChange={e => setSelectedConfigId(e.target.value)}
          style={inputStyle}
          disabled={isSubmitting}
        >
          {configs.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Topic input */}
      <div>
        <label htmlFor="dev-topic-input" style={labelStyle}>
          Topic
        </label>
        <input
          id="dev-topic-input"
          type="text"
          placeholder="Enter a topic…"
          maxLength={500}
          value={topic}
          onChange={e => setTopic(e.target.value)}
          style={inputStyle}
          disabled={isSubmitting}
        />
      </div>

      {/* Submit */}
      <div>
        <button
          type="submit"
          disabled={isSubmitting || !topic.trim()}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-text-primary)',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            padding: '0.5rem 1rem',
            cursor: isSubmitting || !topic.trim() ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || !topic.trim() ? 0.6 : 1,
          }}
        >
          {isSubmitting ? 'Starting…' : 'Run Pipeline'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-status-failed)', margin: 0 }}>
          {error}
        </p>
      )}

      {/* Success */}
      {runId && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--color-border-1)',
            backgroundColor: 'var(--color-surface-2)',
            fontSize: '0.875rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
          }}
        >
          <span style={{ color: 'var(--color-text-secondary)' }}>Pipeline started</span>
          <code
            style={{
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: 'var(--color-text-primary)',
              wordBreak: 'break-all',
            }}
          >
            {runId}
          </code>
          <Link
            href={`/video/${runId}`}
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-primary)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            View run →
          </Link>
        </div>
      )}
    </form>
  )
}
