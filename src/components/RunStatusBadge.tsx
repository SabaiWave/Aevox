import type { StageState } from '@/types'

type BadgeStatus = StageState | 'complete'

interface RunStatusBadgeProps {
  status: BadgeStatus
}

const LABEL_MAP: Record<BadgeStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  complete: 'Complete',
  failed: 'Failed',
  degraded: 'Degraded',
}

const COLOR_VAR_MAP: Record<BadgeStatus, string> = {
  pending: 'var(--color-status-pending)',
  running: 'var(--color-status-running)',
  complete: 'var(--color-status-complete)',
  failed: 'var(--color-status-failed)',
  degraded: 'var(--color-status-degraded)',
}

export function RunStatusBadge({ status }: RunStatusBadgeProps) {
  const colorVar = COLOR_VAR_MAP[status]
  const label = LABEL_MAP[status]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 500,
        color: colorVar,
        background: `color-mix(in srgb, ${colorVar} 15%, transparent)`,
      }}
    >
      {label}
    </span>
  )
}
