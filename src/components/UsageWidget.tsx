interface UsageWidgetProps {
  charsUsed: number
  charsLimit: number
  videosUsed: number
  videosLimit: number
  tier: string
}

interface MeterProps {
  label: string
  used: number
  limit: number
  tier: string
}

function getMeterFillColor(pct: number): string {
  if (pct >= 1) return 'var(--color-status-failed)'
  if (pct > 0.8) return 'var(--color-status-running)'
  return 'var(--color-primary)'
}

function UsageMeter({ label, used, limit, tier }: MeterProps) {
  const pct = limit > 0 ? Math.min(used / limit, 1) : 0
  const fillColor = getMeterFillColor(pct)
  const fillWidth = `${(pct * 100).toFixed(1)}%`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      {/* Tier badge */}
      <span
        style={{
          fontSize: '0.75rem',
          color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontWeight: 500,
        }}
      >
        {tier}
      </span>

      {/* Label + values row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          {label}
        </span>
        <span
          className="font-mono text-sm"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>

      {/* Progress bar */}
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
            width: fillWidth,
            backgroundColor: fillColor,
            borderRadius: '2px',
            transition: 'width 0.3s ease, background-color 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}

export function UsageWidget({
  charsUsed,
  charsLimit,
  videosUsed,
  videosLimit,
  tier,
}: UsageWidgetProps) {
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
      <UsageMeter
        label="ElevenLabs characters"
        used={charsUsed}
        limit={charsLimit}
        tier={tier}
      />
      <UsageMeter
        label="Videos this month"
        used={videosUsed}
        limit={videosLimit}
        tier={tier}
      />
    </div>
  )
}
