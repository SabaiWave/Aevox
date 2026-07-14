import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/is-admin'
import Sidebar from '@/components/layout/Sidebar'
import AppFooter from '@/components/layout/AppFooter'
import { ClerkDarkFix } from '@/components/layout/ClerkDarkFix'
import styles from './layout.module.css'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const showAdmin = await isAdmin()
  return (
    <div className="app-shell">
      <ClerkDarkFix />
      <Sidebar showAdmin={showAdmin} />
      <div className={styles.contentWrapper}>
        <main className="main-content">{children}</main>
        <AppFooter />
      </div>
    </div>
  )
}
