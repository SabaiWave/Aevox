'use client'

import { useState } from 'react'

interface UpgradeButtonProps {
  plan: 'starter' | 'pro'
  label: string
}

export default function UpgradeButton({ plan, label }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      const json = await res.json()

      if (!res.ok || !json.data?.url) {
        setError(json.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      window.location.href = json.data.url
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-text-primary)',
          border: 'none',
          borderRadius: '8px',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          filter: loading ? 'none' : undefined,
          transition: 'filter 0.15s ease',
          width: '100%',
        }}
        onMouseEnter={e => {
          if (!loading) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.15)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.filter = ''
        }}
      >
        {loading ? 'Redirecting…' : label}
      </button>
      {error && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-status-failed)', margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  )
}
