'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import { Menu, X, Home, LayoutDashboard, Zap, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './LandingNav.module.css'

interface Props {
  isAuthed: boolean
}

export default function LandingNavMobile({ isAuthed }: Props) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const { signOut } = useClerk()
  const pathname = usePathname()

  const authedNav = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/upgrade', label: 'Upgrade', icon: Zap },
    { href: '/configs', label: 'Channels', icon: Settings },
  ]

  return (
    <>
      <button className={styles.hamburger} onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu size={20} />
      </button>

      {open && (
        <>
          <div className={styles.overlay} onClick={close} aria-hidden="true" />
          <div className={styles.drawer} role="dialog" aria-label="Navigation">
            <div className={styles.drawerHeader}>
              <Link href="/" className={styles.wordmark} onClick={close}>KLIPTO</Link>
              <button className={styles.closeBtn} onClick={close} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>

            <div className={styles.drawerLinks}>
              {isAuthed ? (
                authedNav.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(styles.drawerLink, pathname === href && styles.drawerLinkActive)}
                    onClick={close}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </Link>
                ))
              ) : (
                <>
                  <Link href="/sign-in" className={styles.drawerLink} onClick={close}>Sign in</Link>
                  <Link href="/sign-up" className={`${styles.drawerLink} ${styles.drawerCta}`} onClick={close}>Start free</Link>
                </>
              )}
            </div>

            {isAuthed && (
              <div className={styles.drawerFooter}>
                <Link href="/account" className={styles.drawerLink} onClick={close}>
                  <Settings size={16} />
                  <span>Account</span>
                </Link>
                <button
                  className={styles.drawerLink}
                  onClick={() => signOut({ redirectUrl: '/' })}
                  style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
