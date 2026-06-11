import type { PipelineStage, StageState } from '@/types'
import { RunStatusBadge } from './RunStatusBadge'

export interface StageInfo {
  stage: PipelineStage
  state: StageState
  durationMs?: number
  errorMessage?: string
  gapMessage?: string
}

interface PipelineStageTrackerProps {
  stages: StageInfo[]
}

const STAGE_LABEL_MAP: Record<PipelineStage, string> = {
  research: 'Research',
  script: 'Script',
  voice: 'Voice',
  publish: 'Publish',
}

function formatDuration(ms: number): string {
  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}m ${secs}s`
}

export function PipelineStageTracker({ stages }: PipelineStageTrackerProps) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {stages.map((info) => (
          <div key={info.stage}>
            {/* Stage row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              {/* Running pulse dot */}
              {info.state === 'running' && (
                <span className="stage-running-dot" aria-hidden="true" />
              )}

              {/* Stage name */}
              <span
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  flex: 1,
                }}
              >
                {STAGE_LABEL_MAP[info.stage]}
              </span>

              {/* Duration — shown when running or complete */}
              {info.durationMs !== undefined &&
                (info.state === 'running' || info.state === 'complete') && (
                  <span
                    className="font-mono text-sm"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {formatDuration(info.durationMs)}
                  </span>
                )}

              {/* Badge */}
              <RunStatusBadge status={info.state} />
            </div>

            {/* Error message */}
            {info.state === 'failed' && info.errorMessage && (
              <p
                style={{
                  marginTop: '0.25rem',
                  marginLeft: '0',
                  fontSize: '0.875rem',
                  color: 'var(--color-status-failed)',
                }}
              >
                {info.errorMessage}
              </p>
            )}

            {/* Gap message */}
            {info.state === 'degraded' && info.gapMessage && (
              <p
                style={{
                  marginTop: '0.25rem',
                  fontSize: '0.875rem',
                  color: 'var(--color-status-degraded)',
                }}
              >
                {info.gapMessage}
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
