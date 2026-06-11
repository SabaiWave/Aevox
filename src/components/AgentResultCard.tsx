'use client'

import { useState, useEffect } from 'react'
import type {
  AgentResult,
  PipelineStage,
  StageState,
  SourcePackage,
  VoiceOutput,
  PublishOutput,
} from '@/types'
import { RunStatusBadge } from './RunStatusBadge'

interface AgentResultCardProps {
  stage: PipelineStage
  result: AgentResult<unknown> | null
  state: StageState
}

const STAGE_LABEL_MAP: Record<PipelineStage, string> = {
  research: 'Research',
  script: 'Script',
  voice: 'Voice',
  publish: 'Publish',
}

function ResearchBody({ data }: { data: SourcePackage }) {
  if (!Array.isArray(data.sources)) {
    return <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem' }}>No source data available</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {data.sources.map((source, i) => (
        <div
          key={i}
          style={{
            paddingBottom: '0.5rem',
            borderBottom: '1px solid var(--color-border-2)',
          }}
        >
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--color-accent)',
              fontSize: '0.8125rem',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: 'none',
            }}
          >
            {source.url}
          </a>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginTop: '0.125rem',
            }}
          >
            <span
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-primary)',
                flex: 1,
                marginRight: '0.5rem',
              }}
            >
              {source.title}
            </span>
            <span
              className="font-mono text-sm"
              style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}
            >
              {(source.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ScriptBody({ data }: { data: string }) {
  return (
    <div
      style={{
        maxHeight: '200px',
        overflowY: 'auto',
        fontSize: '0.875rem',
        lineHeight: '1.6',
        color: 'var(--color-text-secondary)',
        whiteSpace: 'pre-wrap',
      }}
    >
      {data}
    </div>
  )
}

function VoiceBody({ data }: { data: VoiceOutput }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <audio
        controls
        src={data.audioUrl}
        style={{
          width: '100%',
          height: '36px',
          // Note: native audio element appearance is browser-controlled.
          // The dark theme from the page body naturally applies in modern browsers.
          colorScheme: 'dark',
        }}
      />
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          fontSize: '0.8125rem',
          color: 'var(--color-text-tertiary)',
        }}
      >
        <span>
          Duration:{' '}
          <span className="font-mono">{data.durationSeconds.toFixed(1)}s</span>
        </span>
        <span>
          Chars:{' '}
          <span className="font-mono">{data.charsUsed.toLocaleString()}</span>
        </span>
      </div>
    </div>
  )
}

function PublishBody({ data }: { data: PublishOutput }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <a
        href={data.videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono"
        style={{
          color: 'var(--color-accent)',
          fontSize: '0.875rem',
          textDecoration: 'none',
        }}
      >
        {data.title}
      </a>
      <span
        className="font-mono text-sm"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        {data.videoId}
      </span>
    </div>
  )
}

function ResultBody({
  stage,
  result,
}: {
  stage: PipelineStage
  result: AgentResult<unknown> | null
}) {
  if (!result || !result.data) {
    return (
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
        No data available
      </p>
    )
  }

  switch (stage) {
    case 'research':
      return <ResearchBody data={result.data as SourcePackage} />
    case 'script':
      return <ScriptBody data={result.data as string} />
    case 'voice':
      return <VoiceBody data={result.data as VoiceOutput} />
    case 'publish':
      return <PublishBody data={result.data as PublishOutput} />
  }
}

export function AgentResultCard({ stage, result, state }: AgentResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(state !== 'pending')

  useEffect(() => {
    setIsExpanded(state !== 'pending')
  }, [state])

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface-1)',
        border: '1px solid var(--color-border-1)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.875rem 1rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontSize: '1.125rem',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            flex: 1,
          }}
        >
          {STAGE_LABEL_MAP[stage]}
        </span>
        <RunStatusBadge status={state} />
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-tertiary)',
            marginLeft: '0.25rem',
          }}
          aria-hidden="true"
        >
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {/* Body */}
      {isExpanded && (
        <div
          style={{
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-2)',
            borderRadius: '8px',
            margin: '0 0.75rem 0.75rem',
            padding: '0.75rem',
          }}
        >
          <ResultBody stage={stage} result={result} />
        </div>
      )}
    </div>
  )
}
