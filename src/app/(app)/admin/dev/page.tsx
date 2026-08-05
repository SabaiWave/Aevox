export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { isAdmin } from '@/lib/is-admin'
import { auth } from '@/lib/auth'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { RunStatusBadge } from '@/components/RunStatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { DevTriggerForm } from './DevTriggerForm'
import { QuotaSimButtons } from './QuotaSimButtons'
import { ErrorStateSimulator } from './ErrorStateSimulator'
import type { StageState } from '@/types'

function toStageState(status: string): StageState | 'partial' {
  if (status === 'complete') return 'complete'
  if (status === 'partial') return 'partial'
  if (status === 'failed') return 'failed'
  if (status === 'running') return 'running'
  if (status === 'degraded') return 'degraded'
  return 'pending'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '…' : str
}

async function RunLog() {
  const supabase = getSupabaseServerClient()

  const { data: runs, error } = await supabase
    .from('videos')
    .select('id, topic, status, config_id, created_at, channel_configs(name)')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return (
      <p style={{ fontSize: '0.875rem', color: 'var(--color-status-failed)' }}>
        Failed to load run log.
      </p>
    )
  }

  if (!runs || runs.length === 0) {
    return (
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
        No runs yet.
      </p>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.8125rem',
          color: 'var(--color-text-primary)',
        }}
      >
        <thead>
          <tr>
            {['Run ID', 'Config', 'Status', 'Topic', 'Created'].map(h => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  borderBottom: '1px solid var(--color-border-1)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map(run => {
            // channel_configs may be an array or object depending on Supabase join
            const configName =
              Array.isArray(run.channel_configs)
                ? (run.channel_configs[0] as { name: string } | undefined)?.name ?? '—'
                : (run.channel_configs as { name: string } | null)?.name ?? '—'

            return (
              <tr key={run.id} style={{ borderBottom: '1px solid var(--color-border-1)' }}>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    {run.id}
                  </span>
                </td>
                <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>
                  {configName}
                </td>
                <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>
                  <RunStatusBadge status={toStageState(run.status)} />
                </td>
                <td
                  style={{
                    padding: '0.5rem 0.75rem',
                    color: 'var(--color-text-secondary)',
                    maxWidth: '280px',
                  }}
                  title={run.topic}
                >
                  {truncate(run.topic, 40)}
                </td>
                <td
                  style={{
                    padding: '0.5rem 0.75rem',
                    whiteSpace: 'nowrap',
                    color: 'var(--color-text-tertiary)',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                  }}
                >
                  {formatDate(run.created_at)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RunLogSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} style={{ height: '2.25rem', borderRadius: '6px' }} />
      ))}
    </div>
  )
}

async function DevConsoleConfigs() {
  const { userId } = await auth()
  const supabase = getSupabaseServerClient()

  const { data: userRow } = userId
    ? await supabase.from('users').select('id').eq('clerk_id', userId).single()
    : { data: null }

  const { data: configRows } = userRow
    ? await supabase
        .from('channel_configs')
        .select('id, name')
        .eq('user_id', userRow.id)
        .order('name')
    : { data: [] }

  const configs = (configRows ?? []).map(r => ({ id: r.id as string, name: r.name as string }))

  return <DevTriggerForm configs={configs} />
}

const sectionStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-surface-1)',
  border: '1px solid var(--color-border-1)',
  borderRadius: '10px',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
}

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  margin: 0,
}

export default async function AdminDevPage() {
  const adminOk = await isAdmin()
  if (!adminOk) notFound()

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
          Dev Console
        </h1>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            marginTop: '0.375rem',
            marginBottom: 0,
          }}
        >
          Admin-only tools for triggering pipelines and simulating quota.
        </p>
      </div>

      {/* Section 1: Pipeline Trigger */}
      <section style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Pipeline Trigger</h2>
        <Suspense fallback={<RunLogSkeleton />}>
          <DevConsoleConfigs />
        </Suspense>
      </section>

      {/* Section 2: Error State Simulator */}
      <section style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Error State Simulator</h2>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          Trigger UI error screens without breaking real data.
        </p>
        <ErrorStateSimulator />
      </section>

      {/* Section 3: Dev Data Tools */}
      <section style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Dev Data Tools</h2>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          Simulate quota load or clean up test data for your account.
        </p>
        <QuotaSimButtons />
      </section>

      {/* Section 4: Debug API */}
      <section style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Debug API</h2>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          Admin only. Opens in new tab. Check JSON response to confirm what was sent.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {[
            { label: 'Health Check', sublabel: 'GET /api/debug/health', href: '/api/debug/health' },
            { label: 'Sentry Test', sublabel: 'GET /api/debug/sentry — triggers test error', href: '/api/debug/sentry' },
            { label: 'BetterStack Test', sublabel: 'GET /api/debug/betterstack — sends test log', href: '/api/debug/betterstack' },
          ].map(({ label, sublabel, href }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                padding: '0.75rem 1rem',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border-2)',
                borderRadius: '8px',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{label}</span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-tertiary)' }}>{sublabel}</span>
            </a>
          ))}
          <form method="POST" action="/api/debug/pipeline" target="_blank" style={{ display: 'contents' }}>
            <button
              type="submit"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                padding: '0.75rem 1rem',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border-2)',
                borderRadius: '8px',
                textDecoration: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>Pipeline Run</span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-tertiary)' }}>POST /api/debug/pipeline — dry-run smoke test</span>
            </button>
          </form>
          <a
            href="/api/debug/fail"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              padding: '0.75rem 1rem',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border-2)',
              borderRadius: '8px',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-status-failed)' }}>Force Failure Run</span>
            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-tertiary)' }}>GET /api/debug/fail — log.error + Sentry capture</span>
          </a>
        </div>
      </section>

      {/* Section 5: Run Log */}
      <section style={sectionStyle}>
        <h2 style={sectionHeadingStyle}>Last 20 Runs (all users)</h2>
        <Suspense fallback={<RunLogSkeleton />}>
          <RunLog />
        </Suspense>
      </section>
    </div>
  )
}
