'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'

export function UserAvatar() {
  const { user } = useUser()
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const initial = (email.split('@')[0]?.[0] ?? 'A').toUpperCase()

  return (
    <Link
      href="/account"
      aria-label="Account settings"
      title="Account settings"
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-geist-mono), monospace',
        fontSize: '0.72rem',
        fontWeight: 700,
        color: 'var(--color-accent)',
        textDecoration: 'none',
        flexShrink: 0,
      }}
    >
      {initial}
    </Link>
  )
}
