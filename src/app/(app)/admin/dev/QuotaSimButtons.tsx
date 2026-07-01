'use client'

import { useState } from 'react'

type ActionState = {
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning'
  message: string
}

const idle: ActionState = { status: 'idle', message: '' }

type Action = 'fill_videos' | 'fill_chars' | 'clear' | 'clear_real' | 'clear_dry' | 'clear_all'

const btnBase: React.CSSProperties = {
  fontSize: '0.875rem',
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 500,
  whiteSpace: 'nowrap',
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
  const [clearSimState, setClearSimState] = useState<ActionState>(idle)
  const [clearRealState, setClearRealState] = useState<ActionState>(idle)
  const [clearDryState, setClearDryState] = useState<ActionState>(idle)
  const [clearAllState, setClearAllState] = useState<ActionState>(idle)

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
            message: `${action.startsWith('clear') ? 'Deleted' : 'Inserted'} ${json.count ?? 0} row${json.count === 1 ? '' : 's'}.`,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Fill row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
            title="Inserts simulated rows (is_simulated=true, is_dry_run=false) to reach video cap. Counts toward quota. Cleared by 'Clear Sim Data'."
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
            title="Inserts 1 simulated row with chars_used set to exceed char cap (is_simulated=true, is_dry_run=false). Counts toward quota. Cleared by 'Clear Sim Data'."
          >
            {charFillState.status === 'loading' ? 'Filling…' : 'Hit Char Cap'}
          </button>
        </div>
        {/* Fill status lines */}
        <StatusText state={videoFillState} />
        <StatusText state={charFillState} />
      </div>

      {/* Clear section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
          Clear
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            style={{
              ...btnBase,
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-2)',
              opacity: clearSimState.status === 'loading' ? 0.6 : 1,
              cursor: clearSimState.status === 'loading' ? 'not-allowed' : 'pointer',
            }}
            disabled={clearSimState.status === 'loading'}
            onClick={() => callSim('clear', setClearSimState)}
          >
            {clearSimState.status === 'loading' ? 'Clearing…' : 'Clear Sim Data'}
          </button>
          <button
            style={{
              ...btnBase,
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-status-failed)',
              border: '1px solid var(--color-status-failed)',
              opacity: clearRealState.status === 'loading' ? 0.6 : 1,
              cursor: clearRealState.status === 'loading' ? 'not-allowed' : 'pointer',
            }}
            disabled={clearRealState.status === 'loading'}
            onClick={() => callSim('clear_real', setClearRealState)}
          >
            {clearRealState.status === 'loading' ? 'Clearing…' : 'Clear Real Runs'}
          </button>
          <button
            style={{
              ...btnBase,
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-2)',
              opacity: clearDryState.status === 'loading' ? 0.6 : 1,
              cursor: clearDryState.status === 'loading' ? 'not-allowed' : 'pointer',
            }}
            disabled={clearDryState.status === 'loading'}
            onClick={() => callSim('clear_dry', setClearDryState)}
          >
            {clearDryState.status === 'loading' ? 'Clearing…' : 'Clear Dry Runs'}
          </button>
          <button
            style={{
              ...btnBase,
              backgroundColor: 'var(--color-status-failed)',
              color: '#fff',
              opacity: clearAllState.status === 'loading' ? 0.6 : 1,
              cursor: clearAllState.status === 'loading' ? 'not-allowed' : 'pointer',
            }}
            disabled={clearAllState.status === 'loading'}
            onClick={() => callSim('clear_all', setClearAllState)}
          >
            {clearAllState.status === 'loading' ? 'Nuking…' : '☢ Nuke All Videos'}
          </button>
        </div>
        {/* Clear status lines */}
        <StatusText state={clearSimState} />
        <StatusText state={clearRealState} />
        <StatusText state={clearDryState} />
        <StatusText state={clearAllState} />
      </div>
    </div>
  )
}
