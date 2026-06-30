import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import LandingNavMobile from './LandingNavMobile'
import styles from './LandingNav.module.css'

export default async function LandingNav() {
  const { userId } = await auth()
  const isAuthed = !!userId

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.wordmark}>KLIPTO</Link>

        <div className={styles.desktop}>
          {isAuthed ? (
            <>
              <Link href="/dashboard" className={styles.ghost}>Dashboard</Link>
              <UserButton />
            </>
          ) : (
            <>
              <Link href="/sign-in" className={styles.ghost}>Sign in</Link>
              <Link href="/sign-up" className={styles.primary}>Start free</Link>
            </>
          )}
        </div>

        <LandingNavMobile isAuthed={isAuthed} />
      </nav>
    </header>
  )
}
