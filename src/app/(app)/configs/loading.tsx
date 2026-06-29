import { Skeleton } from '@/components/ui/Skeleton'

export default function ConfigsLoading() {
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <Skeleton style={{ width: '160px', height: '1.5rem' }} />
        <Skeleton style={{ width: '100px', height: '36px', borderRadius: '8px' }} />
      </div>

      {/* Config cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)', borderRadius: '8px', padding: '1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1 }}>
              <Skeleton style={{ width: '180px', height: '1.125rem' }} />
              <Skeleton style={{ width: '240px', height: '0.875rem' }} />
              <Skeleton style={{ width: '300px', height: '0.75rem' }} />
            </div>
            <Skeleton style={{ width: '36px', height: '0.875rem', marginLeft: '1rem' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
