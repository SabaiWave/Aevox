'use client'

import * as RadixTooltip from '@radix-ui/react-tooltip'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  if (!content) return <>{children}</>
  return (
    <RadixTooltip.Provider delayDuration={400}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            style={{
              backgroundColor: 'var(--color-surface-1)',
              border: '1px solid var(--color-border-2)',
              borderRadius: '6px',
              padding: '0.375rem 0.625rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              fontFamily: 'var(--font-geist-sans, Geist, system-ui, sans-serif)',
              color: 'var(--color-text-primary)',
              maxWidth: '240px',
              lineHeight: 1.4,
              zIndex: 50,
              boxShadow: 'none',
            }}
          >
            {content}
            <RadixTooltip.Arrow
              style={{ fill: 'var(--color-border-2)' }}
            />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
