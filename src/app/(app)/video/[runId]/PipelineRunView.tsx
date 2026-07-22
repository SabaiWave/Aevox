'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { AgentResult, PipelineRun, PipelineStage, StageState, SSEEvent } from '@/types'
import { PipelineStageTracker } from '@/components/PipelineStageTracker'
import type { StageInfo } from '@/components/PipelineStageTracker'
import { AgentResultCard } from '@/components/AgentResultCard'
import { RunStatusBadge } from '@/components/RunStatusBadge'
import { DeleteVideoButton } from './DeleteVideoButton'
import { RetryButton } from './RetryButton'

interface PipelineRunViewProps {
  runId: string
  initialRun: PipelineRun
  configName?: string | null
}

function deriveStages(run: PipelineRun): StageInfo[] {
  return [
    {
      stage: 'research' as PipelineStage,
      state: run.researchResult
        ? run.researchResult.status === 'success'
          ? 'complete'
          : 'failed'
        : 'pending',
      errorMessage: run.researchResult?.error,
      durationMs: run.researchResult?.durationMs,
    },
    {
      stage: 'script' as PipelineStage,
      state: run.scriptResult
        ? run.scriptResult.status === 'success'
          ? 'complete'
          : 'failed'
        : 'pending',
      errorMessage: run.scriptResult?.error,
      durationMs: run.scriptResult?.durationMs,
    },
    {
      stage: 'voice' as PipelineStage,
      state: run.voiceResult
        ? run.voiceResult.status === 'success'
          ? 'complete'
          : run.voiceResult.status === 'degraded'
            ? 'degraded'
            : 'failed'
        : 'pending',
      errorMessage: run.voiceResult?.error,
      durationMs: run.voiceResult?.durationMs,
    },
    {
      stage: 'video' as PipelineStage,
      state: run.videoResult
        ? run.videoResult.status === 'success'
          ? 'complete'
          : run.videoResult.status === 'degraded'
            ? 'degraded'
            : 'failed'
        : 'pending',
      errorMessage: run.videoResult?.error,
      durationMs: run.videoResult?.durationMs,
    },
    {
      stage: 'publish' as PipelineStage,
      state: run.publishResult
        ? run.publishResult.status === 'success'
          ? 'complete'
          : run.publishResult.status === 'degraded'
            ? 'degraded'
            : 'failed'
        : 'pending',
      errorMessage: run.publishResult?.error,
      durationMs: run.publishResult?.durationMs,
    },
  ]
}

function initialStages(run: PipelineRun): StageInfo[] {
  if (run.status !== 'running' && run.status !== 'pending') {
    return deriveStages(run)
  }
  return [
    { stage: 'research', state: 'pending' },
    { stage: 'script', state: 'pending' },
    { stage: 'voice', state: 'pending' },
    { stage: 'video', state: 'pending' },
    { stage: 'publish', state: 'pending' },
  ]
}

const STAGE_ORDER: PipelineStage[] = ['research', 'script', 'voice', 'video', 'publish']

function stageIndex(stage: PipelineStage): number {
  return STAGE_ORDER.indexOf(stage)
}

function badgeStatus(status: PipelineRun['status']): StageState | 'complete' | 'partial' {
  if (status === 'complete') return 'complete'
  if (status === 'partial') return 'partial'
  if (status === 'failed') return 'failed'
  if (status === 'running') return 'running'
  return 'pending'
}

function isRetryable(run: PipelineRun): boolean {
  if (run.status !== 'partial' && run.status !== 'failed') return false
  return (
    run.researchResult?.status === 'success' ||
    run.scriptResult?.status === 'success' ||
    run.voiceResult?.status === 'success' ||
    run.videoResult?.status === 'success'
  ) ?? false
}

export function PipelineRunView({ runId, initialRun, configName }: PipelineRunViewProps) {
  const [run, setRun] = useState<PipelineRun>(initialRun)
  const [stages, setStages] = useState<StageInfo[]>(() => initialStages(initialRun))

  useEffect(() => {
    if (run.status === 'complete' || run.status === 'partial' || run.status === 'failed') return

    const es = new EventSource(`/api/videos/${runId}/stream`)

    es.onmessage = (e: MessageEvent) => {
      let event: SSEEvent
      try {
        event = JSON.parse(e.data as string) as SSEEvent
      } catch {
        return
      }

      if (event.type === 'stage_start' && event.stage) {
        const targetStage = event.stage
        setStages(prev =>
          prev.map(s =>
            s.stage === targetStage ? { ...s, state: 'running' as StageState } : s,
          ),
        )
      }

      if (event.type === 'stage_complete' && event.stage) {
        const targetStage = event.stage
        setStages(prev =>
          prev.map(s =>
            s.stage === targetStage
              ? { ...s, state: 'complete' as StageState, durationMs: undefined }
              : s,
          ),
        )
        if (event.data) {
          const result = event.data as AgentResult<unknown>
          setRun(prev => ({
            ...prev,
            ...(targetStage === 'research' && { researchResult: result as PipelineRun['researchResult'] }),
            ...(targetStage === 'script' && { scriptResult: result as PipelineRun['scriptResult'] }),
            ...(targetStage === 'voice' && { voiceResult: result as PipelineRun['voiceResult'] }),
            ...(targetStage === 'video' && { videoResult: result as PipelineRun['videoResult'] }),
            ...(targetStage === 'publish' && { publishResult: result as PipelineRun['publishResult'] }),
          }))
        }
      }

      if (event.type === 'stage_failed' && event.stage) {
        const targetStage = event.stage
        const errorMessage = event.message
        setStages(prev =>
          prev.map(s =>
            s.stage === targetStage
              ? { ...s, state: 'failed' as StageState, errorMessage }
              : s,
          ),
        )
      }

      if (event.type === 'pipeline_done') {
        setStages(prev =>
          prev.map(s => (s.state === 'running' ? { ...s, state: 'complete' as StageState } : s)),
        )
        setRun(prev => ({ ...prev, status: event.status ?? 'complete' }))
        es.close()
      }

      if (event.type === 'pipeline_error') {
        const errorMessage = event.message
        setStages(prev =>
          prev.map(s =>
            s.state === 'running' ? { ...s, state: 'failed' as StageState, errorMessage } : s,
          ),
        )
        setRun(prev => ({ ...prev, status: 'failed' }))
        es.close()
      }
    }

    es.onerror = () => {
      es.close()
    }

    return () => {
      es.close()
    }
  }, [runId, run.status])

  const researchIdx = stageIndex('research')
  const scriptIdx = stageIndex('script')
  const voiceIdx = stageIndex('voice')
  const videoIdx = stageIndex('video')
  const publishIdx = stageIndex('publish')

  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: '1100px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      {/* Page header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {/* Top row: status + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <RunStatusBadge status={badgeStatus(run.status)} />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isRetryable(run) && (
              <RetryButton
                runId={runId}
                onRetryStarted={() => {
                  setRun(prev => ({ ...prev, status: 'running' }))
                  setStages(prev => prev.map(s =>
                    s.state === 'failed' || s.state === 'pending'
                      ? { ...s, state: 'pending', errorMessage: undefined }
                      : s
                  ))
                }}
              />
            )}
            <DeleteVideoButton runId={runId} />
            <Link
              href="/video/new"
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-primary)',
                textDecoration: 'none',
                padding: '4px 12px',
                border: '1px solid var(--color-primary)',
                borderRadius: '8px',
              }}
            >
              New Video
            </Link>
          </div>
        </div>

        {/* Topic as primary heading */}
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: '0.25rem 0 0',
            lineHeight: 1.3,
          }}
        >
          {run.topic ?? 'Untitled'}
        </h1>

        {/* Config name */}
        {configName && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            {configName}
          </span>
        )}
      </div>

      {/* Error banner — only for hard failures (all stages failed), not partial */}
      {run.status === 'failed' && run.errorMessage && !isRetryable(run) && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--color-status-failed)',
            backgroundColor: 'color-mix(in srgb, var(--color-status-failed) 10%, transparent)',
            fontSize: '0.875rem',
            color: 'var(--color-status-failed)',
          }}
        >
          {run.errorMessage}
        </div>
      )}

      {/* Two-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.6fr)',
          gap: '2rem',
          alignItems: 'start',
        }}
        className="pipeline-grid"
      >
        {/* Left: stage tracker */}
        <div
          style={{
            backgroundColor: 'var(--color-surface-1)',
            border: '1px solid var(--color-border-1)',
            borderRadius: '8px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--color-text-tertiary)',
              margin: '0 0 0.5rem 0',
            }}
          >
            Stages
          </p>
          <PipelineStageTracker stages={stages} />
        </div>

        {/* Right: result cards */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <AgentResultCard
            stage="research"
            result={run.researchResult}
            state={stages[researchIdx]?.state ?? 'pending'}
            errorMessage={stages[researchIdx]?.errorMessage}
          />
          <AgentResultCard
            stage="script"
            result={run.scriptResult}
            state={stages[scriptIdx]?.state ?? 'pending'}
            errorMessage={stages[scriptIdx]?.errorMessage}
          />
          <AgentResultCard
            stage="voice"
            result={run.voiceResult}
            state={stages[voiceIdx]?.state ?? 'pending'}
            errorMessage={stages[voiceIdx]?.errorMessage}
          />
          <AgentResultCard
            stage="video"
            result={run.videoResult}
            state={stages[videoIdx]?.state ?? 'pending'}
            errorMessage={stages[videoIdx]?.errorMessage}
          />
          <AgentResultCard
            stage="publish"
            result={run.publishResult}
            state={stages[publishIdx]?.state ?? 'pending'}
            errorMessage={stages[publishIdx]?.errorMessage}
          />
        </div>
      </div>

      {/* Responsive: collapse to single column on narrow screens */}
      <style>{`
        @media (max-width: 768px) {
          .pipeline-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
