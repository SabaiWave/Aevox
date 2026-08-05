export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import UpgradeButton from './UpgradeButton'
import ManageSubscriptionButton from './ManageSubscriptionButton'

const creatorFeatures = [
  '8 videos per month',
  'Full research, script, voice, and video pipeline',
  'YouTube auto-publish',
  'Unlimited channels',
]

const studioFeatures = [
  'Unlimited videos',
  'Everything in Creator',
  'Priority processing',
  'Early access to new formats',
]

function formatCancelDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function PlanCard({
  name,
  price,
  features,
  plan,
  label,
  isCurrent,
  cancelAt,
}: {
  name: string
  price: string
  features: string[]
  plan: 'starter' | 'pro'
  label: string
  isCurrent: boolean
  cancelAt?: Date | null
}) {
  return (
    <div
      style={{
        flex: '1 1 280px',
        backgroundColor: 'var(--color-surface-1)',
        border: `1px solid ${isCurrent ? 'var(--color-primary)' : 'var(--color-border-1)'}`,
        borderRadius: '8px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <p style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>
            {name}
          </p>
          {isCurrent && (
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid var(--color-primary)',
                color: 'var(--color-primary)',
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              }}
            >
              Current plan
            </span>
          )}
          {isCurrent && cancelAt && (
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid var(--color-status-running)',
                color: 'var(--color-status-running)',
                backgroundColor: 'color-mix(in srgb, var(--color-status-running) 12%, transparent)',
              }}
            >
              Cancels {formatCancelDate(cancelAt)}
            </span>
          )}
        </div>
        <p style={{ margin: 0 }}>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {price}
          </span>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>/mo</span>
        </p>
      </div>

      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {features.map(feature => (
          <li
            key={feature}
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ color: 'var(--color-status-complete)', flexShrink: 0 }}>✓</span>
            {feature}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid var(--color-border-2)',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--color-text-tertiary)',
            textAlign: 'center',
          }}
        >
          Current plan
        </div>
      ) : (
        <UpgradeButton plan={plan} label={label} />
      )}
    </div>
  )
}

export default async function UpgradePage() {
  const { userId } = await auth()
  const supabase = getSupabaseServerClient()

  const { data: userRow } = userId
    ? await supabase.from('users').select('tier, subscription_cancel_at').eq('clerk_id', userId).single()
    : { data: null }

  const currentTier = userRow?.tier ?? 'free'
  const cancelAt = userRow?.subscription_cancel_at ? new Date(userRow.subscription_cancel_at) : null

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Your Plan
        </h1>
        {currentTier !== 'free' && <ManageSubscriptionButton />}
      </div>
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
          margin: '0 0 2rem',
        }}
      >
        Manage your plan or change at any time
      </p>

      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '1.5rem' }}>
        <PlanCard
          name="Creator"
          price="$49"
          features={creatorFeatures}
          plan="starter"
          label="Get Creator"
          isCurrent={currentTier === 'starter'}
          cancelAt={cancelAt}
        />
        <PlanCard
          name="Studio"
          price="$99"
          features={studioFeatures}
          plan="pro"
          label="Get Studio"
          isCurrent={currentTier === 'pro'}
          cancelAt={cancelAt}
        />
      </div>
    </div>
  )
}
