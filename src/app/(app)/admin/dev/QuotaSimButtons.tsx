'use client'

import { useState } from 'react'

type ActionState = {
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string
}

const idle: ActionState = { status: 'idle', message: '' }

export function QuotaSimButtons() {
  const [fillState, setFillState] = useState<ActionState>(idle)
  const [clearState, setClearState] = useState<ActionState>(idle)

  async function callSim(action: 'fill' | 'clear', setState: (s: ActionState) => void) {
    setState({ status: 'loading', message: '' })
    try {
      const res = await fetch('/api/admin/quota-sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = (await res.json()) as { success?: boolean; count?: number; error?: string }
      if (json.success) {
        setState({
          status: 'success',
          message: `${action === 'fill' ? 'Inserted' : 'Deleted'} ${json.count ?? 0} row${json.count === 1 ? '' : 's'}.`,
        })
      } else {
        setState({ status: 'error', message: json.error ?? 'Unknown error' })
      }
    } catch {
      setState({ status: 'error', message: 'Request failed' })
    }
  }

  const btnBase: React.CSSProperties = {
    fontSize: '0.875rem',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 500,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Fill row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          style={{
            ...btnBase,
            backgroundColor: 'var(--color-status-running)',
            color: 'var(--color-text-primary)',
            opacity: fillState.status === 'loading' ? 0.6 : 1,
            cursor: fillState.status === 'loading' ? 'not-allowed' : 'pointer',
          }}
          disabled={fillState.status === 'loading'}
          onClick={() => callSim('fill', setFillState)}
        >
          {fillState.status === 'loading' ? 'Filling…' : 'Hit Tier Cap'}
        </button>
        {fillState.status === 'success' && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-status-complete)' }}>
            {fillState.message}
          </span>
        )}
        {fillState.status === 'error' && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-status-failed)' }}>
            {fillState.message}
          </span>
        )}
      </div>

      {/* Clear row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          style={{
            ...btnBase,
            backgroundColor: 'var(--color-surface-2)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-2)',
            opacity: clearState.status === 'loading' ? 0.6 : 1,
            cursor: clearState.status === 'loading' ? 'not-allowed' : 'pointer',
          }}
          disabled={clearState.status === 'loading'}
          onClick={() => callSim('clear', setClearState)}
        >
          {clearState.status === 'loading' ? 'Clearing…' : 'Clear Sim Data'}
        </button>
        {clearState.status === 'success' && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-status-complete)' }}>
            {clearState.message}
          </span>
        )}
        {clearState.status === 'error' && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-status-failed)' }}>
            {clearState.message}
          </span>
        )}
      </div>
    </div>
  )
}
