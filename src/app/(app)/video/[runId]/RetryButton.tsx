'use client'

import { useState } from 'react'

interface RetryButtonProps {
  runId: string
  onRetryStarted: () => void
}

export function RetryButton({ runId, onRetryStarted }: RetryButtonProps) {
  const [retrying, setRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRetry() {
    setRetrying(true)
    setError(null)
    try {
      const res = await fetch(`/api/videos/${runId}/retry`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Retry failed')
        return
      }
      onRetryStarted()
    } catch {
      setError('Network error — please try again')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
      <button
        onClick={handleRetry}
        disabled={retrying}
        style={{
          cursor: retrying ? 'default' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--color-primary)',
          background: 'transparent',
          border: '1px solid var(--color-primary)',
          borderRadius: '8px',
          padding: '4px 12px',
          opacity: retrying ? 0.6 : 1,
        }}
      >
        {retrying ? 'Retrying…' : 'Retry Failed Stages'}
      </button>
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-status-failed)' }}>
          {error}
        </span>
      )}
    </div>
  )
}
