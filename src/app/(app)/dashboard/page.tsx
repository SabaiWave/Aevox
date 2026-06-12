export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { RunStatusBadge } from '@/components/RunStatusBadge'
import { UsageWidget } from '@/components/UsageWidget'
import YouTubeConnectionBadge from '@/components/YouTubeConnectionBadge'
import type { StageState } from '@/types'

function toStageState(status: string): StageState {
  if (status === 'complete') return 'complete'
  if (status === 'failed') return 'failed'
  if (status === 'running') return 'running'
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

export default async function DashboardPage() {
  const { userId } = await auth()
  const supabase = getSupabaseServerClient()

  // Resolve Clerk userId → internal uuid
  const { data: userRow } = userId
    ? await supabase.from('users').select('id').eq('clerk_id', userId).single()
    : { data: null }
  const userUuid = userRow?.id ?? ''

  // Fetch recent pipeline runs (scoped to this user)
  const { data: runs, error: runsError } = await supabase
    .from('pipeline_runs')
    .select('id, topic, status, config_id, created_at, updated_at')
    .eq('user_id', userUuid)
    .order('created_at', { ascending: false })
    .limit(10)

  if (runsError) console.error('[Dashboard] Failed to fetch runs:', runsError.message)

  // Fetch usage stats for this month (scoped to this user)
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: usageLogs } = await supabase
    .from('usage_logs')
    .select('chars_used')
    .eq('user_id', userUuid)
    .gte('created_at', startOfMonth.toISOString())

  const charsUsed = (usageLogs ?? []).reduce(
    (sum, row) => sum + (row.chars_used ?? 0),
    0
  )
  const { count: videosUsed } = await supabase
    .from('pipeline_runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userUuid)
    .eq('status', 'complete')

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      {/* Section 1: Page header */}
      <div>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Dashboard
        </h1>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
            marginTop: '0.375rem',
            marginBottom: 0,
          }}
        >
          Your recent pipeline runs
        </p>
      </div>

      {/* Section 2: Action bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* YouTube connection badge */}
        <YouTubeConnectionBadge />

        {/* Start New Run button */}
        <Link
          href="/configs"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 500,
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-text-primary)',
            textDecoration: 'none',
          }}
        >
          Start New Run
        </Link>
      </div>

      {/* Section 3: Usage widget */}
      <UsageWidget
        charsUsed={charsUsed}
        charsLimit={50000}
        videosUsed={videosUsed ?? 0}
        videosLimit={2}
        tier="free"
      />

      {/* Section 4: Recent runs */}
      <div>
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            marginTop: 0,
            marginBottom: '1rem',
          }}
        >
          Recent Runs
        </h2>

        {!runs || runs.length === 0 ? (
          /* Empty state */
          <div
            style={{
              backgroundColor: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-1)',
              borderRadius: '8px',
              padding: '2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <p
              style={{
                fontSize: '0.9375rem',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                margin: 0,
              }}
            >
              No pipeline runs yet
            </p>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              Start your first run to see results here.
            </p>
            <Link
              href="/configs"
              style={{
                marginTop: '0.75rem',
                display: 'inline-block',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 500,
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-text-primary)',
                textDecoration: 'none',
              }}
            >
              Start New Run
            </Link>
          </div>
        ) : (
          /* Runs list */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {runs.map((run) => (
              <Link
                key={run.id}
                href={`/pipeline/${run.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--color-surface-1)',
                    border: '1px solid var(--color-border-1)',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  {/* Left: topic + run ID */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '300px',
                      }}
                    >
                      {run.topic}
                    </span>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-tertiary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {run.id}
                    </span>
                  </div>

                  {/* Center: status badge */}
                  <div style={{ flexShrink: 0 }}>
                    <RunStatusBadge status={toStageState(run.status)} />
                  </div>

                  {/* Right: created date */}
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-tertiary)',
                      flexShrink: 0,
                    }}
                  >
                    {formatDate(run.created_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
