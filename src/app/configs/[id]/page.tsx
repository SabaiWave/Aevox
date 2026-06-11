export default async function ConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Config</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>Config ID: {id}</p>
    </div>
  )
}
