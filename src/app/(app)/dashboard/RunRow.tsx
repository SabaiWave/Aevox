'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { RunStatusBadge } from '@/components/RunStatusBadge'
import type { StageState } from '@/types'
import { deleteVideo } from './actions'
import styles from './RunRow.module.css'

function toStageState(status: string): StageState | 'partial' {
  if (status === 'complete') return 'complete'
  if (status === 'partial') return 'partial'
  if (status === 'failed') return 'failed'
  if (status === 'running') return 'running'
  return 'pending'
}

interface RunRowProps {
  run: {
    id: string
    topic: string
    status: string
    created_at: string
  }
  formattedDate: string
}

export function RunRow({ run, formattedDate }: RunRowProps) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await deleteVideo(run.id)
  }

  return (
    <div
      className={styles.row}
      style={{ opacity: deleting ? 0.4 : 1 }}
    >
      {/* Topic + ID — clickable */}
      <Link
        href={`/video/${run.id}`}
        style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span
            title={run.topic}
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '300px',
              display: 'block',
            }}
          >
            {run.topic}
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-tertiary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
            }}
          >
            {run.id}
          </span>
        </div>
      </Link>

      {/* Status badge */}
      <div style={{ flexShrink: 0 }}>
        <RunStatusBadge status={toStageState(run.status)} />
      </div>

      {/* Right side: date OR inline confirm */}
      {confirming ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Delete?</span>
          <button
            onClick={() => setConfirming(false)}
            disabled={deleting}
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--color-status-failed)',
              background: 'none',
              border: 'none',
              cursor: deleting ? 'not-allowed' : 'pointer',
              padding: '2px 4px',
              opacity: deleting ? 0.5 : 1,
            }}
          >
            Delete
          </button>
        </div>
      ) : (
        <>
          <span
            className="font-mono"
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-tertiary)',
              flexShrink: 0,
            }}
          >
            {formattedDate}
          </span>
          <Tooltip content="Delete video" side="left">
            <button
              onClick={() => setConfirming(true)}
              className={styles.deleteBtn}
              aria-label="Delete video"
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </>
      )}
    </div>
  )
}
