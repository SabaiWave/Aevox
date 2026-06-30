'use client'

import { useState } from 'react'

type ActionState = {
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning'
  message: string
}

const idle: ActionState = { status: 'idle', message: '' }

type Action = 'fill_videos' | 'fill_chars' | 'clear'

const btnBase: React.CSSProperties = {
  fontSize: '0.875rem',
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 500,
}

function StatusText({ state }: { state: ActionState }) {
  if (state.status === 'idle' || state.status === 'loading') return null
  const color =
    state.status === 'success'
      ? 'var(--color-status-complete)'
      : state.status === 'warning'
        ? 'var(--color-status-running)'
        : 'var(--color-status-failed)'
  return <span style={{ fontSize: '0.8125rem', color }}>{state.message}</span>
}

export function QuotaSimButtons() {
  const [videoFillState, setVideoFillState] = useState<ActionState>(idle)
  const [charFillState, setCharFillState] = useState<ActionState>(idle)
  const [clearState, setClearState] = useState<ActionState>(idle)

  async function callSim(action: Action, setState: (s: ActionState) => void) {
    setState({ status: 'loading', message: '' })
    try {
      const res = await fetch('/api/admin/quota-sim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = (await res.json()) as {
        success?: boolean
        count?: number
        error?: string
        warning?: string
      }
      if (json.success) {
        if (json.warning) {
          setState({ status: 'warning', message: json.warning })
        } else {
          setState({
            status: 'success',
            message: `${action === 'clear' ? 'Deleted' : 'Inserted'} ${json.count ?? 0} row${json.count === 1 ? '' : 's'}.`,
          })
        }
      } else {
        setState({ status: 'error', message: json.error ?? 'Unknown error' })
      }
    } catch {
      setState({ status: 'error', message: 'Request failed' })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Fill row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          style={{
            ...btnBase,
            backgroundColor: 'var(--color-status-running)',
            color: 'var(--color-text-primary)',
            opacity: videoFillState.status === 'loading' ? 0.6 : 1,
            cursor: videoFillState.status === 'loading' ? 'not-allowed' : 'pointer',
          }}
          disabled={videoFillState.status === 'loading'}
          onClick={() => callSim('fill_videos', setVideoFillState)}
        >
          {videoFillState.status === 'loading' ? 'Filling…' : 'Hit Video Cap'}
        </button>
        <button
          style={{
            ...btnBase,
            backgroundColor: 'var(--color-accent-primary)',
            color: 'var(--color-text-primary)',
            opacity: charFillState.status === 'loading' ? 0.6 : 1,
            cursor: charFillState.status === 'loading' ? 'not-allowed' : 'pointer',
          }}
          disabled={charFillState.status === 'loading'}
          onClick={() => callSim('fill_chars', setCharFillState)}
        >
          {charFillState.status === 'loading' ? 'Filling…' : 'Hit Char Cap'}
        </button>
        <StatusText state={videoFillState.status !== 'idle' && videoFillState.status !== 'loading' ? videoFillState : charFillState} />
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
        <StatusText state={clearState} />
      </div>
    </div>
  )
}
