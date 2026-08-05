'use client'

import { Tooltip } from '@/components/ui/Tooltip'

interface UsageWidgetProps {
  charsUsed: number
  charsLimit: number | undefined  // undefined = unlimited (pro)
  videosUsed: number
  videosLimit: number | undefined  // undefined = no cap (Pro)
  tier: string
}

function getMeterFillColor(pct: number): string {
  if (pct >= 1) return 'var(--color-status-failed)'
  if (pct > 0.8) return 'var(--color-status-running)'
  return 'var(--color-primary)'
}

interface MeterProps {
  label: string
  used: number
  limit: number | undefined
}

function UsageMeter({ label, used, limit }: MeterProps) {
  const pct = limit && limit > 0 ? Math.min(used / limit, 1) : 0
  const fillColor = getMeterFillColor(pct)
  const limitLabel = limit === undefined || limit === 0 ? '∞' : limit.toLocaleString()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
        <span className="font-mono" style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
          {used.toLocaleString()} / {limitLabel}
        </span>
      </div>
      <div
        style={{
          height: '4px',
          borderRadius: '2px',
          backgroundColor: 'var(--color-border-1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${(pct * 100).toFixed(1)}%`,
            backgroundColor: fillColor,
            borderRadius: '2px',
            transition: 'width 0.3s ease, background-color 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}

export function UsageWidget({ charsUsed, charsLimit, videosUsed, videosLimit, tier }: UsageWidgetProps) {
  const isPaid = tier === 'starter' || tier === 'pro'
  const tierLabel: Record<string, string> = { free: 'Free', starter: 'Creator', pro: 'Studio' }
  const planName = tierLabel[tier] ?? tier

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface-1)',
        border: '1px solid var(--color-border-1)',
        borderRadius: '8px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* Tier label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>
          Usage this month
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            textTransform: 'capitalize',
            color: isPaid ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
          }}
        >
          {planName} Plan
        </span>
      </div>

      <Tooltip content="Voice narration used this month">
        <div><UsageMeter label="Voice characters" used={charsUsed} limit={charsLimit} /></div>
      </Tooltip>
      <Tooltip content="Videos generated this month">
        <div><UsageMeter label="Videos this month" used={videosUsed} limit={videosLimit} /></div>
      </Tooltip>
    </div>
  )
}
