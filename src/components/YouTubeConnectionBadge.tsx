'use client'

import { useEffect, useState } from 'react'

type YouTubeStatus = 'connected' | 'disconnected' | 'expired' | 'loading'

const DOT_COLOR: Record<YouTubeStatus, string> = {
  connected: 'var(--color-status-complete)',
  disconnected: 'var(--color-status-pending)',
  expired: 'var(--color-status-running)',
  loading: 'var(--color-status-pending)',
}

const LABEL: Record<YouTubeStatus, string> = {
  connected: 'YouTube connected',
  disconnected: 'YouTube not connected',
  expired: 'YouTube token expired',
  loading: 'Checking YouTube…',
}

export default function YouTubeConnectionBadge() {
  const [status, setStatus] = useState<YouTubeStatus>('loading')
  useEffect(() => {
    fetch('/api/auth/youtube/status')
      .then((r) => r.json())
      .then((body) => setStatus(body.data?.status ?? 'disconnected'))
      .catch(() => setStatus('disconnected'))
  }, [])

  const showButton = status === 'disconnected' || status === 'expired'
  const buttonLabel = status === 'expired' ? 'Reconnect' : 'Connect YouTube'

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '6px 12px',
        borderRadius: '4px',
        border: '1px solid var(--color-border-1)',
        backgroundColor: 'var(--color-surface-1)',
      }}
    >
      {/* Status dot */}
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: DOT_COLOR[status],
          flexShrink: 0,
        }}
      />

      {/* Label */}
      <span
        style={{
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
        }}
      >
        {LABEL[status]}
      </span>

      {/* Connect / Reconnect button */}
      {showButton && (
        <button
          onClick={() => { window.location.href = '/api/auth/youtube' }}
          style={{
            cursor: 'pointer',
            background: 'transparent',
            border: '1px solid var(--color-primary)',
            borderRadius: '8px',
            color: 'var(--color-primary)',
            fontSize: '0.875rem',
            fontWeight: 500,
            padding: '2px 12px',
            lineHeight: '1.5',
          }}
        >
          {buttonLabel}
        </button>
      )}
    </div>
  )
}
