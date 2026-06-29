export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { checkVoiceQuota } from '@/lib/quota'
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>
}) {
  const { upgraded } = await searchParams
  const showUpgradeBanner = upgraded === 'true'
  const { userId } = await auth()
  const supabase = getSupabaseServerClient()

  // Resolve Clerk userId → internal uuid
  const { data: userRow } = userId
    ? await supabase.from('users').select('id, tier').eq('clerk_id', userId).single()
    : { data: null }
  const userUuid = userRow?.id ?? null
  const tier = userRow?.tier ?? 'free'

  // Compute videosLimit based on tier (undefined = no cap, Pro)
  const videosLimit = tier === 'free' ? 2 : tier === 'starter' ? 8 : undefined

  // Fetch recent pipeline runs (scoped to this user, including dry runs)
  const { data: runs, error: runsError } = userUuid
    ? await supabase
        .from('videos')
        .select('id, topic, status, config_id, created_at, updated_at, is_dry_run')
        .eq('user_id', userUuid)
        .order('created_at', { ascending: false })
        .limit(10)
    : { data: [], error: null }

  if (runsError) console.error('[Dashboard] Failed to fetch runs:', runsError.message)

  // Fetch usage stats for this month (scoped to this user, exclude dry runs)
  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const { count: videosUsed } = userUuid
    ? await supabase
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userUuid)
        .eq('status', 'complete')
        .eq('is_dry_run', false)
        .gte('created_at', startOfMonth.toISOString())
    : { count: 0 }

  const voiceQuota = userUuid ? await checkVoiceQuota(userUuid, tier) : { used: 0, limit: undefined as number | undefined, allowed: true }

  // Always fetch actual voice chars used this month regardless of tier (Pro skips quota check but still has real usage)
  const startOfMonthUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()
  const { data: usageLogs } = userUuid
    ? await supabase
        .from('usage_logs')
        .select('chars_used')
        .eq('user_id', userUuid)
        .eq('event_type', 'voice_chars_used')
        .gte('created_at', startOfMonthUTC)
    : { data: [] }
  const charsUsedActual = (usageLogs ?? []).reduce((sum, row) => sum + (Number(row.chars_used) || 0), 0)

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
          Your recent videos
        </p>
      </div>

      {/* Upgrade success banner */}
      {showUpgradeBanner && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--color-status-complete)',
            backgroundColor: 'color-mix(in srgb, var(--color-status-complete) 8%, transparent)',
            fontSize: '0.875rem',
            color: 'var(--color-status-complete)',
            fontWeight: 500,
          }}
        >
          You&apos;re now on the {tier} plan —{' '}
          {tier === 'starter' ? '8 videos/month' : tier === 'pro' ? 'unlimited videos' : ''} unlocked.
        </div>
      )}

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

        {/* New Video button */}
        <Link
          href="/video/new"
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
          New Video
        </Link>
      </div>

      {/* Section 3: Usage widget */}
      <UsageWidget
        charsUsed={charsUsedActual}
        charsLimit={voiceQuota.limit}
        videosUsed={videosUsed ?? 0}
        videosLimit={videosLimit}
        tier={tier}
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
          Recent Videos
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
              No videos yet
            </p>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}
            >
              Generate your first video to see results here.
            </p>
            <Link
              href="/video/new"
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
              New Video
            </Link>
          </div>
        ) : (
          /* Runs list */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {runs.map((run) => (
              <Link
                key={run.id}
                href={`/video/${run.id}`}
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
                      title={run.topic}
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
                      title={run.id}
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
