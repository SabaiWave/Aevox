import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <Skeleton style={{ width: '120px', height: '1.5rem' }} />
        <Skeleton style={{ width: '160px', height: '0.875rem' }} />
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton style={{ width: '200px', height: '34px', borderRadius: '4px' }} />
        <Skeleton style={{ width: '100px', height: '36px', borderRadius: '8px' }} />
      </div>

      {/* Usage widget */}
      <div style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Skeleton style={{ width: '140px', height: '0.75rem' }} />
          <Skeleton style={{ width: '80px', height: '0.75rem' }} />
        </div>
        {[0, 1].map((i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton style={{ width: '120px', height: '0.875rem' }} />
              <Skeleton style={{ width: '80px', height: '0.875rem' }} />
            </div>
            <Skeleton style={{ width: '100%', height: '4px', borderRadius: '2px' }} />
          </div>
        ))}
      </div>

      {/* Recent runs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Skeleton style={{ width: '120px', height: '1.125rem', marginBottom: '0.25rem' }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border-1)', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
              <Skeleton style={{ width: '240px', height: '0.875rem' }} />
              <Skeleton style={{ width: '180px', height: '0.75rem' }} />
            </div>
            <Skeleton style={{ width: '64px', height: '20px', borderRadius: '999px' }} />
            <Skeleton style={{ width: '100px', height: '0.75rem' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
