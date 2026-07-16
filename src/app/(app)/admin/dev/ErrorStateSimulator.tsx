'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

const FAKE_RUN_ID = '00000000-0000-0000-0000-000000000000'

const ERROR_STATES: { label: string; description: string; path: string }[] = [
  {
    label: 'Run not found',
    description: 'Video page with no matching DB row',
    path: `/video/${FAKE_RUN_ID}`,
  },
]

const btnStyle: React.CSSProperties = {
  fontSize: '0.8125rem',
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid var(--color-border-2)',
  background: 'var(--color-surface-2)',
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

export function ErrorStateSimulator() {
  const router = useRouter()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {ERROR_STATES.map(state => (
        <div
          key={state.path}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>
              {state.label}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
              {state.description}
            </p>
          </div>
          <button
            style={{ ...btnStyle, display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            onClick={() => router.push(state.path)}
          >
            Simulate <ArrowRight size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
