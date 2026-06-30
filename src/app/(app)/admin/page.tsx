export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/is-admin'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { UserRow } from './UserRow'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminPage() {
  const adminOk = await isAdmin()
  if (!adminOk) redirect('/')

  const supabase = getSupabaseServerClient()

  // Fetch all users ordered by created_at DESC
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, tier, created_at, support_notes')
    .order('created_at', { ascending: false })
    .limit(100)

  if (usersError) {
    return (
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
        }}
      >
        <p style={{ color: 'var(--color-status-failed)', fontSize: '0.875rem' }}>
          Failed to load users.
        </p>
      </div>
    )
  }

  // Fetch last 10 runs per user in one query, then group client-side
  // We select user_id to group, limited to 10 per user via application logic
  const userIds = (users ?? []).map(u => u.id as string)

  const runsByUser: Record<string, Array<{ id: string; topic: string; status: string; created_at: string }>> = {}

  if (userIds.length > 0) {
    const { data: allRuns } = await supabase
      .from('videos')
      .select('id, topic, status, created_at, user_id')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .limit(userIds.length * 10)

    if (allRuns) {
      for (const run of allRuns) {
        const uid = run.user_id as string
        if (!runsByUser[uid]) runsByUser[uid] = []
        if (runsByUser[uid].length < 10) {
          runsByUser[uid].push({
            id: run.id as string,
            topic: run.topic as string,
            status: run.status as string,
            created_at: run.created_at as string,
          })
        }
      }
    }
  }

  const userList = users ?? []

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Admin
        </h1>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            marginTop: '0.375rem',
            marginBottom: 0,
          }}
        >
          {userList.length} user{userList.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* User list */}
      {userList.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          No users yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {userList.map(user => (
            <UserRow
              key={user.id as string}
              userId={user.id as string}
              email={(user.email as string | null) ?? '—'}
              tier={(user.tier as string | null) ?? 'free'}
              joinedFormatted={formatDate(user.created_at as string)}
              supportNotes={(user.support_notes as string | null) ?? null}
              runs={runsByUser[user.id as string] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}
