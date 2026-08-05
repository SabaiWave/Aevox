'use client'

import { useState } from 'react'

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const json = await res.json()

      if (!res.ok || !json.data?.url) {
        setError('Could not open billing portal. Try again.')
        return
      }

      if (!json.data.url.startsWith('https://billing.stripe.com/')) {
        throw new Error('Invalid portal URL')
      }

      window.location.href = json.data.url
    } catch {
      setError('Could not open billing portal. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          backgroundColor: 'transparent',
          color: 'var(--color-primary)',
          border: '1px solid var(--color-primary)',
          borderRadius: '8px',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'opacity 0.15s ease',
        }}
        onMouseEnter={e => {
          if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'
        }}
        onMouseLeave={e => {
          if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = '1'
        }}
      >
        {loading ? 'Opening…' : 'Manage Plan'}
      </button>
      {error && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-status-failed)', margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  )
}
