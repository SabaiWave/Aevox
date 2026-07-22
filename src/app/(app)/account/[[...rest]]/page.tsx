import { UserProfile } from '@clerk/nextjs'

export const metadata = { title: 'Account — Klipto' }

const appearance = {
  elements: {
    card: { boxShadow: 'none', borderRadius: '12px' },
    navbar: { borderRadius: '12px 0 0 12px' },
    navbarHeader: { paddingBottom: '0.75rem' },
  },
}

export default function AccountPage() {
  return (
    <main style={{ padding: '2rem 1.5rem', display: 'flex', justifyContent: 'center', minHeight: '100%' }}>
      <UserProfile appearance={appearance} />
    </main>
  )
}
