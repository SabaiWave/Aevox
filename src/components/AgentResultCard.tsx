'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Tooltip } from './ui/Tooltip'
import type {
  AgentResult,
  PipelineStage,
  StageState,
  SourcePackage,
  VoiceOutput,
  VideoOutput,
  PublishOutput,
} from '@/types'
import { RunStatusBadge } from './RunStatusBadge'

interface AgentResultCardProps {
  stage: PipelineStage
  result: AgentResult<unknown> | null
  state: StageState
  errorMessage?: string
}

const STAGE_LABEL_MAP: Record<PipelineStage, string> = {
  research: 'Research',
  script: 'Script',
  voice: 'Voice',
  video: 'Video',
  publish: 'Publish',
}

const STAGE_FRIENDLY_ERROR: Record<PipelineStage, string> = {
  research: 'Research failed. Try a different topic or check your connection.',
  script: 'Script generation failed. Try again in a moment.',
  voice: 'Voice synthesis failed. Check your ElevenLabs quota.',
  video: 'Video generation failed. Check your FAL.ai connection.',
  publish: 'Publishing failed. Reconnect your YouTube account and try again.',
}

function friendlyError(stage: PipelineStage, rawError: string | undefined): string {
  if (rawError && rawError.length < 120 && !rawError.includes('{') && !rawError.includes('HTTP')) {
    return rawError
  }
  return STAGE_FRIENDLY_ERROR[stage]
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                fontWeight: 500,
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textDecoration: 'none',
              }}
            >
              {source.title}
            </a>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-accent)',
                display: 'block',
                marginTop: '0.125rem',
              }}
            >
              {extractDomain(source.url)}
            </span>
          </div>
          <Tooltip content="Source confidence score" side="left">
            <span
              className="font-mono text-sm"
              style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, cursor: 'default' }}
            >
              {(source.confidence * 100).toFixed(0)}%
            </span>
          </Tooltip>
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
          alignItems: 'center',
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
        <a
          href={data.audioUrl}
          download
          style={{
            marginLeft: 'auto',
            color: 'var(--color-primary)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Download MP3
        </a>
      </div>
    </div>
  )
}

function VideoBody({ data }: { data: VideoOutput }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <video
        controls
        src={data.videoUrl}
        style={{ width: '100%', borderRadius: '4px' }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.8125rem',
          color: 'var(--color-text-tertiary)',
        }}
      >
        <span>
          Duration:{' '}
          <span className="font-mono">{data.durationSeconds}s</span>
        </span>
        <span>
          Images:{' '}
          <span className="font-mono">{data.imageCount}</span>
        </span>
        <a
          href={data.videoUrl}
          download
          style={{
            marginLeft: 'auto',
            color: 'var(--color-primary)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Download MP4
        </a>
      </div>
    </div>
  )
}

function PublishBody({ data }: { data: PublishOutput }) {
  const cleanTitle = data.title.replace(/^\{|\}$/g, '')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <a
        href={data.videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: 'var(--color-accent)',
          fontSize: '0.875rem',
          textDecoration: 'none',
        }}
      >
        {cleanTitle}
      </a>
      <a
        href={data.videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: '0.75rem',
          color: 'var(--color-text-tertiary)',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        View on YouTube <ExternalLink size={12} />
      </a>
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
    case 'video':
      return <VideoBody data={result.data as VideoOutput} />
    case 'publish':
      return <PublishBody data={result.data as PublishOutput} />
  }
}

export function AgentResultCard({ stage, result, state, errorMessage }: AgentResultCardProps) {
  const hasData = !!result?.data
  const resolvedError = result?.error ?? errorMessage
  const hasError = state === 'failed' && !!resolvedError
  const canExpand = hasData || hasError
  const [isExpanded, setIsExpanded] = useState(state !== 'pending' && canExpand)

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
      {canExpand ? (
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
          <span style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--color-text-primary)', flex: 1 }}>
            {STAGE_LABEL_MAP[stage]}
          </span>
          <RunStatusBadge status={state} />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginLeft: '0.25rem' }} aria-hidden="true">
            {isExpanded ? '▼' : '▶'}
          </span>
        </button>
      ) : (
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.875rem 1rem',
          }}
        >
          <span style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--color-text-primary)', flex: 1 }}>
            {STAGE_LABEL_MAP[stage]}
          </span>
          <RunStatusBadge status={state} />
        </div>
      )}

      {/* Body */}
      {isExpanded && canExpand && (
        <div
          style={{
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-2)',
            borderRadius: '8px',
            margin: '0 0.75rem 0.75rem',
            padding: '0.75rem',
          }}
        >
          {hasData ? (
            <ResultBody stage={stage} result={result} />
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-status-failed)', margin: 0 }}>
              {friendlyError(stage, resolvedError)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
