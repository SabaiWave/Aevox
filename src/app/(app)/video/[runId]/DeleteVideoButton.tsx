'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { deleteVideo } from '@/app/(app)/dashboard/actions'

export function DeleteVideoButton({ runId }: { runId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await deleteVideo(runId)
    router.push('/dashboard')
  }

  if (confirming) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          Delete this video?
        </span>
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          style={{
            fontSize: '0.8125rem',
            color: 'var(--color-text-tertiary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'var(--color-status-failed)',
            background: 'none',
            border: '1px solid var(--color-status-failed)',
            borderRadius: '6px',
            cursor: deleting ? 'not-allowed' : 'pointer',
            padding: '4px 10px',
            opacity: deleting ? 0.5 : 1,
            transition: 'opacity 0.15s ease',
          }}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    )
  }

  return (
    <Tooltip content="Delete video" side="bottom">
      <button
        onClick={() => setConfirming(true)}
        aria-label="Delete video"
        style={{
          background: 'none',
          border: '1px solid var(--color-border-2)',
          borderRadius: '6px',
          cursor: 'pointer',
          padding: '4px 8px',
          color: 'var(--color-text-tertiary)',
          display: 'flex',
          alignItems: 'center',
          transition: 'color 0.15s ease, border-color 0.15s ease',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-status-failed)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-status-failed)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-tertiary)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border-2)'
        }}
      >
        <Trash2 size={14} />
      </button>
    </Tooltip>
  )
}
