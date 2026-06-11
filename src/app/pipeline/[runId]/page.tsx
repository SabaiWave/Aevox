export default async function PipelinePage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Pipeline Run</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>Run ID: {runId}</p>
    </div>
  )
}
