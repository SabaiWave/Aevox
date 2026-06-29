import { Skeleton } from '@/components/ui/Skeleton'

export default function VideoRunLoading() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header: topic + status badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1 }}>
          <Skeleton style={{ width: '300px', height: '1.5rem' }} />
          <Skeleton style={{ width: '200px', height: '0.75rem' }} />
        </div>
        <Skeleton style={{ width: '72px', height: '22px', borderRadius: '999px' }} />
      </div>

      {/* Stage tracker: 4 rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Skeleton style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
            <Skeleton style={{ width: '80px', height: '0.875rem' }} />
            <Skeleton style={{ width: '64px', height: '20px', borderRadius: '999px', marginLeft: 'auto' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
