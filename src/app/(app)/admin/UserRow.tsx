'use client'

import { useState } from 'react'
import { RunStatusBadge } from '@/components/RunStatusBadge'
import { SupportNotesEditor } from './SupportNotesEditor'
import type { StageState } from '@/types'

interface Run {
  id: string
  topic: string
  status: string
  created_at: string
}

interface UserRowProps {
  userId: string
  email: string
  tier: string
  joinedFormatted: string
  supportNotes: string | null
  runs: Run[]
}

function toStageState(status: string): StageState {
  if (status === 'complete') return 'complete'
  if (status === 'failed') return 'failed'
  if (status === 'running') return 'running'
  if (status === 'degraded') return 'degraded'
  return 'pending'
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '…' : str
}

const TIER_COLORS: Record<string, string> = {
  free: 'var(--color-text-secondary)',
  starter: 'var(--color-status-running)',
  pro: 'var(--color-primary)',
}

export function UserRow({ userId, email, tier, joinedFormatted, supportNotes, runs }: UserRowProps) {
  const [expanded, setExpanded] = useState(false)

  const tierColor = TIER_COLORS[tier] ?? 'var(--color-text-secondary)'

  return (
    <div
      style={{
        border: '1px solid var(--color-border-1)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Row header */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.75rem 1rem',
          background: 'var(--color-surface-1)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {email}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: tierColor,
            background: `color-mix(in srgb, ${tierColor} 15%, transparent)`,
            whiteSpace: 'nowrap',
          }}
        >
          {tier}
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-tertiary)',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
          }}
        >
          {joinedFormatted}
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)',
            flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        >
          ▾
        </span>
      </button>

      {/* Expanded section */}
      {expanded && (
        <div
          style={{
            padding: '1rem',
            background: 'var(--color-surface-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            borderTop: '1px solid var(--color-border-1)',
          }}
        >
          {/* Run history */}
          <div>
            <h3
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                margin: '0 0 0.5rem 0',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Last 10 runs
            </h3>
            {runs.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
                No runs yet.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <thead>
                    <tr>
                      {['Run ID', 'Topic', 'Status', 'Created'].map(h => (
                        <th
                          key={h}
                          style={{
                            textAlign: 'left',
                            padding: '0.375rem 0.5rem',
                            borderBottom: '1px solid var(--color-border-1)',
                            color: 'var(--color-text-secondary)',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            fontSize: '0.75rem',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map(run => (
                      <tr key={run.id} style={{ borderBottom: '1px solid var(--color-border-1)' }}>
                        <td style={{ padding: '0.375rem 0.5rem' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '0.7rem',
                              color: 'var(--color-text-tertiary)',
                            }}
                          >
                            {run.id}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '0.375rem 0.5rem',
                            color: 'var(--color-text-secondary)',
                            maxWidth: '240px',
                          }}
                          title={run.topic}
                        >
                          {truncate(run.topic, 40)}
                        </td>
                        <td style={{ padding: '0.375rem 0.5rem', whiteSpace: 'nowrap' }}>
                          <RunStatusBadge status={toStageState(run.status)} />
                        </td>
                        <td
                          style={{
                            padding: '0.375rem 0.5rem',
                            whiteSpace: 'nowrap',
                            color: 'var(--color-text-tertiary)',
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                          }}
                        >
                          {new Date(run.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Support notes */}
          <SupportNotesEditor userId={userId} initialNotes={supportNotes} />
        </div>
      )}
    </div>
  )
}
