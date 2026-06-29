import { CSSProperties } from 'react'

interface SkeletonProps {
  style?: CSSProperties
  className?: string
}

export function Skeleton({ style, className }: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: 'var(--color-surface-1)',
        borderRadius: '4px',
        animation: 'klipto-pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  )
}
