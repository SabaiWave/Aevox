export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { NewRunForm } from './NewRunForm'

export default async function NewPipelinePage() {
  const { userId } = await auth()
  const supabase = getSupabaseServerClient()

  const { data: userRow } = userId
    ? await supabase.from('users').select('id').eq('clerk_id', userId).single()
    : { data: null }

  const { data: configRows } = userRow
    ? await supabase.from('channel_configs').select('id, name').eq('user_id', userRow.id).order('name')
    : { data: [] }

  const configs = (configRows ?? []).map(r => ({ id: r.id as string, name: r.name as string }))

  return (
    <div style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
        What's your next video about?
      </h1>
      <NewRunForm configs={configs} />
    </div>
  )
}
