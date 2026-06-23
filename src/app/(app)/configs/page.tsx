export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getSupabaseServerClient } from '@/lib/supabase-server'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfigRow {
  id: string
  name: string
  niche: string
  tone: string
  created_at: string
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '1.5rem',
}

const h1Style: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  margin: 0,
}

const newConfigBtnStyle: React.CSSProperties = {
  display: 'inline-block',
  background: 'var(--color-primary)',
  color: 'var(--color-text-primary)',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontWeight: 500,
  padding: '0.5rem 1rem',
  textDecoration: 'none',
}

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface-1)',
  border: '1px solid var(--color-border-1)',
  borderRadius: '8px',
  padding: '1.25rem',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
}

const cardLeftStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
}

const configNameStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 500,
  color: 'var(--color-text-primary)',
  textDecoration: 'none',
  display: 'block',
  marginBottom: '0.25rem',
}

const nicheAndToneStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--color-text-secondary)',
  marginBottom: '0.375rem',
}

const configIdStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-text-tertiary)',
  fontFamily: 'var(--font-mono)',
}

const editLinkStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--color-primary)',
  textDecoration: 'none',
  flexShrink: 0,
  marginLeft: '1rem',
  alignSelf: 'center',
}

const emptyCenterStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '3rem 0',
}

const emptyTitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 500,
  color: 'var(--color-text-primary)',
  marginBottom: '0.5rem',
}

const emptySubtitleStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--color-text-secondary)',
  marginBottom: '1.5rem',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ConfigsPage() {
  const { userId } = await auth()
  const supabase = getSupabaseServerClient()

  // Resolve Clerk userId → internal uuid
  const { data: userRow } = userId
    ? await supabase.from('users').select('id').eq('clerk_id', userId).single()
    : { data: null }

  const { data: configs, error: listError } = await supabase
    .from('channel_configs')
    .select('id, name, niche, tone, created_at')
    .eq('user_id', userRow?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(50)

  if (listError) {
    console.error('[ConfigsPage] Failed to fetch configs:', listError.message)
  }

  const rows: ConfigRow[] = configs ?? []

  return (
    <div>
      <div style={headerRowStyle}>
        <h1 style={h1Style}>Channel Configs</h1>
        <Link href="/configs/new" style={newConfigBtnStyle}>
          New Config
        </Link>
      </div>

      {rows.length === 0 ? (
        <div style={emptyCenterStyle}>
          <p style={emptyTitleStyle}>No configs yet</p>
          <p style={emptySubtitleStyle}>Create your first channel config</p>
          <Link href="/configs/new" style={newConfigBtnStyle}>
            Create Config
          </Link>
        </div>
      ) : (
        <div style={listStyle}>
          {rows.map((config) => (
            <ConfigCard key={config.id} config={config} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Card (separated to allow hover via inline style swap workaround) ─────────

function ConfigCard({ config }: { config: ConfigRow }) {
  return (
    <div style={cardStyle}>
      <div style={cardLeftStyle}>
        <Link href={`/configs/${config.id}`} style={configNameStyle}>
          {config.name}
        </Link>
        <p style={nicheAndToneStyle}>
          {config.niche} &middot; {config.tone}
        </p>
        <span style={configIdStyle}>{config.id}</span>
      </div>
      <Link href={`/configs/${config.id}`} style={editLinkStyle}>
        Edit
      </Link>
    </div>
  )
}
