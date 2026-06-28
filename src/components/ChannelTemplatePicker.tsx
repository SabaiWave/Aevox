'use client'

import { Fingerprint, Landmark, TrendingUp, Eye, Atom, Zap } from 'lucide-react'
import { CHANNEL_TEMPLATES, type ChannelTemplate } from '@/lib/channel-templates'
import type { LucideIcon } from 'lucide-react'

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  'true-crime': Fingerprint,
  'history-documentary': Landmark,
  'finance-explainer': TrendingUp,
  'horror-paranormal': Eye,
  'science-discovery': Atom,
  'motivation': Zap,
}

interface ChannelTemplatePickerProps {
  selectedId: string | null
  onSelect: (template: ChannelTemplate) => void
}

export default function ChannelTemplatePicker({ selectedId, onSelect }: ChannelTemplatePickerProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {CHANNEL_TEMPLATES.map((template) => {
        const selected = selectedId === template.id
        const Icon = TEMPLATE_ICONS[template.id]

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.375rem 0.75rem',
              background: selected ? 'rgba(124, 58, 237, 0.12)' : 'var(--color-surface-1)',
              border: `1px solid ${selected ? 'var(--color-primary)' : 'var(--color-border-2)'}`,
              borderRadius: '999px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {Icon && (
              <Icon
                size={13}
                color={selected ? 'var(--color-primary)' : 'var(--color-text-tertiary)'}
                strokeWidth={2}
              />
            )}
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: selected ? 600 : 400,
                color: selected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              }}
            >
              {template.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
