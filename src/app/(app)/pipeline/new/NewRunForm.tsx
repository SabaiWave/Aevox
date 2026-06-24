'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  configs: { id: string; name: string }[]
  isAdmin?: boolean
}

export function NewRunForm({ configs, isAdmin }: Props) {
  const router = useRouter()
  const [selectedConfigId, setSelectedConfigId] = useState(configs[0]?.id ?? '')
  const [topic, setTopic] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [isDryRun, setIsDryRun] = useState(false)
  const [error, setError] = useState('')

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim() || !selectedConfigId) return
    setIsStarting(true)
    setError('')
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId: selectedConfigId, topic: topic.trim(), ...(isDryRun && { dryRun: true }) }),
      })
      const json = (await res.json()) as { data?: { runId: string }; error?: string }
      if (json.data?.runId) {
        router.push(`/pipeline/${json.data.runId}`)
      } else {
        setError(json.error ?? 'Failed to start generation')
        setIsStarting(false)
      }
    } catch {
      setError('Failed to start generation')
      setIsStarting(false)
    }
  }

  if (configs.length === 0) {
    return (
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
        No channel configs found. <Link href="/configs/new" style={{ color: 'var(--color-primary)' }}>Create one first.</Link>
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => { setSelectedConfigId(configs[0]?.id ?? ''); setTopic('The Pontianak: jungle ghost of SE Asia') }}
            style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', border: '1px dashed var(--color-border-2)', background: 'transparent', color: 'var(--color-text-tertiary)', cursor: 'pointer' }}
          >
            ⚡ Quick fill
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.75rem', color: isDryRun ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
            <input
              type="checkbox"
              checked={isDryRun}
              onChange={e => setIsDryRun(e.target.checked)}
              style={{ accentColor: 'var(--color-primary)', cursor: 'pointer' }}
            />
            Dry run
          </label>
        </div>
      )}
      <div>
        <label htmlFor="config-select" style={labelStyle}>Config</label>
        <select
          id="config-select"
          value={selectedConfigId}
          onChange={e => setSelectedConfigId(e.target.value)}
          style={inputStyle}
          disabled={isStarting}
        >
          {configs.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="topic-input" style={labelStyle}>Topic</label>
        <input
          id="topic-input"
          type="text"
          placeholder="Enter a topic..."
          maxLength={500}
          value={topic}
          onChange={e => setTopic(e.target.value)}
          style={inputStyle}
          disabled={isStarting}
        />
      </div>

      {error && (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-status-failed)', margin: 0 }}>{error}</p>
      )}

      <div>
        <button
          type="submit"
          disabled={isStarting || !topic.trim()}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            padding: '0.5rem 1rem',
            cursor: isStarting || !topic.trim() ? 'not-allowed' : 'pointer',
            opacity: isStarting || !topic.trim() ? 0.6 : 1,
          }}
        >
          {isStarting ? 'Generating…' : 'Generate'}
        </button>
      </div>
    </form>
  )
}
