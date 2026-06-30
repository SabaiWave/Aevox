'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Menu, X } from 'lucide-react'
import styles from './LandingNav.module.css'

interface Props {
  isAuthed: boolean
}

export default function LandingNavMobile({ isAuthed }: Props) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

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
                <Link href="/dashboard" className={styles.drawerLink} onClick={close}>Dashboard</Link>
              ) : (
                <>
                  <Link href="/sign-in" className={styles.drawerLink} onClick={close}>Sign in</Link>
                  <Link href="/sign-up" className={`${styles.drawerLink} ${styles.drawerCta}`} onClick={close}>Start free</Link>
                </>
              )}
            </div>

            {isAuthed && (
              <div className={styles.drawerFooter}>
                <UserButton />
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
