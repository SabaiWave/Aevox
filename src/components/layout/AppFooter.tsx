import Link from 'next/link'
import styles from './AppFooter.module.css'

export default function AppFooter() {
  return (
    <footer className={styles.footer}>
      <span>© 2026 Klipto</span>
      <div className={styles.links}>
        <Link href="/privacy" className={styles.link}>
          Privacy Policy
        </Link>
        <Link href="/terms" className={styles.link}>
          Terms of Service
        </Link>
        <Link href="/contact" className={styles.link}>
          Contact
        </Link>
      </div>
    </footer>
  )
}
