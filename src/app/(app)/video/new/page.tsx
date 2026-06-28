export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/is-admin'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { NewRunForm } from './NewRunForm'

export default async function NewPipelinePage() {
  const { userId } = await auth()
  const adminUser = await isAdmin()
  const supabase = getSupabaseServerClient()

  const { data: userRow } = userId
    ? await supabase.from('users').select('id').eq('clerk_id', userId).single()
    : { data: null }

  const [{ data: configRows }, { data: youtubeToken }] = await Promise.all([
    userRow
      ? supabase.from('channel_configs').select('id, name').eq('user_id', userRow.id).order('name')
      : Promise.resolve({ data: [] }),
    userRow
      ? supabase.from('user_youtube_tokens').select('id').eq('user_id', userRow.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const configs = (configRows ?? []).map(r => ({ id: r.id as string, name: r.name as string }))
  const youtubeConnected = !!youtubeToken

  return (
    <div style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        What&apos;s your next video about?
      </h1>
      {!youtubeConnected && (
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--color-status-running)',
            backgroundColor: 'color-mix(in srgb, var(--color-status-running) 8%, transparent)',
            fontSize: '0.875rem',
            color: 'var(--color-status-running)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>YouTube not connected — your video will be generated but not published.</span>
          <a
            href="/dashboard"
            style={{
              marginLeft: 'auto',
              color: 'var(--color-primary)',
              fontWeight: 500,
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
              padding: '4px 12px',
              border: '1px solid var(--color-primary)',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            Connect
          </a>
        </div>
      )}
      <NewRunForm configs={configs} isAdmin={adminUser} />
    </div>
  )
}
