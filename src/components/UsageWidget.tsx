interface UsageWidgetProps {
  videosUsed: number
  videosLimit: number
  tier: string
}

function getMeterFillColor(pct: number): string {
  if (pct >= 1) return 'var(--color-status-failed)'
  if (pct > 0.8) return 'var(--color-status-running)'
  return 'var(--color-primary)'
}

export function UsageWidget({ videosUsed, videosLimit, tier }: UsageWidgetProps) {
  const pct = videosLimit > 0 ? Math.min(videosUsed / videosLimit, 1) : 0
  const fillColor = getMeterFillColor(pct)

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface-1)',
        border: '1px solid var(--color-border-1)',
        borderRadius: '8px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      {/* Label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Videos this month
        </span>
        <span className="font-mono" style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
          {videosUsed} / {videosLimit}
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
            width: `${(pct * 100).toFixed(1)}%`,
            backgroundColor: fillColor,
            borderRadius: '2px',
            transition: 'width 0.3s ease, background-color 0.3s ease',
          }}
        />
      </div>

      {/* Plan label */}
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>
        {tier} plan
      </span>
    </div>
  )
}
