'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { PipelineRun, PipelineStage, StageState, SSEEvent } from '@/types'
import { PipelineStageTracker } from '@/components/PipelineStageTracker'
import type { StageInfo } from '@/components/PipelineStageTracker'
import { AgentResultCard } from '@/components/AgentResultCard'
import { RunStatusBadge } from '@/components/RunStatusBadge'

interface PipelineRunViewProps {
  runId: string
  initialRun: PipelineRun
  configs: { id: string; name: string }[]
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
    { stage: 'publish', state: 'pending' },
  ]
}

const STAGE_ORDER: PipelineStage[] = ['research', 'script', 'voice', 'publish']

function stageIndex(stage: PipelineStage): number {
  return STAGE_ORDER.indexOf(stage)
}

function badgeStatus(status: PipelineRun['status']): StageState | 'complete' {
  if (status === 'complete') return 'complete'
  if (status === 'failed') return 'failed'
  if (status === 'running') return 'running'
  return 'pending'
}

export function PipelineRunView({ runId, initialRun, configs }: PipelineRunViewProps) {
  const router = useRouter()
  const [run, setRun] = useState<PipelineRun>(initialRun)
  const [stages, setStages] = useState<StageInfo[]>(() => initialStages(initialRun))
  const [selectedConfigId, setSelectedConfigId] = useState<string>(configs[0]?.id ?? '')
  const [topic, setTopic] = useState<string>('')
  const [isStarting, setIsStarting] = useState<boolean>(false)

  useEffect(() => {
    if (run.status === 'complete' || run.status === 'failed') return

    const es = new EventSource(`/api/pipeline/${runId}/stream`)

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
        setRun(prev => ({ ...prev, status: 'complete' }))
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
  const publishIdx = stageIndex('publish')

  async function handleStartRun(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    setIsStarting(true)
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId: selectedConfigId, topic: topic.trim() }),
      })
      const json = (await res.json()) as { data?: { runId: string } }
      if (json.data?.runId) {
        router.push(`/pipeline/${json.data.runId}`)
      }
    } finally {
      setIsStarting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border-2)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    padding: '0.5rem 0.75rem',
    color: 'var(--color-text-primary)',
    width: '100%',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    marginBottom: '0.375rem',
  }

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
      {/* New run form */}
      <div
        style={{
          backgroundColor: 'var(--color-surface-1)',
          border: '1px solid var(--color-border-1)',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            margin: '0 0 1rem 0',
          }}
        >
          Start New Run
        </h2>

        {configs.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            No channel configs found. Create one first.
          </p>
        ) : (
          <form onSubmit={handleStartRun} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="new-run-config" style={labelStyle}>
                Config
              </label>
              <select
                id="new-run-config"
                value={selectedConfigId}
                onChange={e => setSelectedConfigId(e.target.value)}
                style={inputStyle}
                disabled={isStarting}
              >
                {configs.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="new-run-topic" style={labelStyle}>
                Topic
              </label>
              <input
                id="new-run-topic"
                type="text"
                placeholder="Enter a topic..."
                maxLength={500}
                value={topic}
                onChange={e => setTopic(e.target.value)}
                style={inputStyle}
                disabled={isStarting}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isStarting || !topic.trim()}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  padding: '0.5rem 1rem',
                  cursor: isStarting || !topic.trim() ? 'not-allowed' : 'pointer',
                  opacity: isStarting || !topic.trim() ? 0.6 : 1,
                }}
              >
                {isStarting ? 'Starting...' : 'Start Pipeline'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Page header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            Pipeline Run
          </h1>
          <RunStatusBadge status={badgeStatus(run.status)} />
        </div>

        <span
          className="font-mono"
          style={{
            fontSize: '0.8125rem',
            color: 'var(--color-text-tertiary)',
          }}
        >
          {runId}
        </span>

        {run.topic && (
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--color-text-secondary)',
              margin: 0,
            }}
          >
            {run.topic}
          </p>
        )}
      </div>

      {/* Error banner — only when run is failed and has a top-level error */}
      {run.status === 'failed' && run.errorMessage && (
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
              letterSpacing: '0.05em',
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
          />
          <AgentResultCard
            stage="script"
            result={run.scriptResult}
            state={stages[scriptIdx]?.state ?? 'pending'}
          />
          <AgentResultCard
            stage="voice"
            result={run.voiceResult}
            state={stages[voiceIdx]?.state ?? 'pending'}
          />
          <AgentResultCard
            stage="publish"
            result={run.publishResult}
            state={stages[publishIdx]?.state ?? 'pending'}
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
