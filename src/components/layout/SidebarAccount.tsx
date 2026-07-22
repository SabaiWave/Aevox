'use client'

import Link from 'next/link'
import { useClerk } from '@clerk/nextjs'
import { Settings, LogOut } from 'lucide-react'

export function SidebarAccount() {
  const { signOut } = useClerk()

  return (
    <div style={{ borderTop: '1px solid var(--color-border-1)', paddingTop: '0.5rem' }}>
      <Link href="/account" className="nav-item">
        <Settings size={16} />
        <span>Account</span>
      </Link>
      <button
        onClick={() => signOut({ redirectUrl: '/' })}
        className="nav-item"
        style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
      >
        <LogOut size={16} />
        <span>Sign Out</span>
      </button>
    </div>
  )
}
