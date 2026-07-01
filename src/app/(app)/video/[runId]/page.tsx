export const dynamic = 'force-dynamic'

import { getSupabaseServerClient } from '@/lib/supabase-server'
import type { PipelineRun } from '@/types'
import { PipelineRunView } from './PipelineRunView'

interface PageProps {
  params: Promise<{ runId: string }>
}

export default async function PipelinePage({ params }: PageProps) {
  const { runId } = await params

  const supabase = getSupabaseServerClient()
  const { data: row, error } = await supabase
    .from('videos')
    .select(
      'id, user_id, config_id, topic, status, research_result, script_result, voice_result, video_result, publish_result, error_message, created_at, updated_at',
    )
    .eq('id', runId)
    .single()

  if (error || !row) {
    return (
      <div
        style={{
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
          marginTop: '4rem',
        }}
      >
        <p
          style={{
            fontSize: '1.125rem',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          Run not found
        </p>
        <p
          className="font-mono"
          style={{
            fontSize: '0.8125rem',
            color: 'var(--color-text-tertiary)',
          }}
        >
          {runId}
        </p>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          This video generation does not exist or has been removed.
        </p>
      </div>
    )
  }

  const { data: configRow } = row.config_id
    ? await supabase.from('channel_configs').select('name').eq('id', row.config_id).single()
    : { data: null }

  const run: PipelineRun = {
    id: row.id,
    userId: row.user_id,
    configId: row.config_id,
    topic: row.topic,
    status: row.status,
    researchResult: row.research_result ?? null,
    scriptResult: row.script_result ?? null,
    voiceResult: row.voice_result ?? null,
    videoResult: row.video_result ?? null,
    publishResult: row.publish_result ?? null,
    errorMessage: row.error_message ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

  return <PipelineRunView runId={runId} initialRun={run} configName={configRow?.name ?? null} />
}
