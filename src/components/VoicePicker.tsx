'use client'

import { useState, useRef, useEffect } from 'react'
import { VOICES, getVoiceSampleUrl } from '@/lib/voices'

interface VoicePickerProps {
  selectedVoiceId: string
  onChange: (voiceId: string) => void
  error?: boolean
}

export default function VoicePicker({ selectedVoiceId, onChange, error }: VoicePickerProps) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  function handlePlay(voiceId: string, e: React.MouseEvent) {
    e.stopPropagation()

    if (playingId === voiceId) {
      audioRef.current?.pause()
      if (audioRef.current) audioRef.current.currentTime = 0
      setPlayingId(null)
      return
    }

    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.currentTime = 0

    const audio = new Audio(getVoiceSampleUrl(voiceId))
    audioRef.current = audio
    audio.onended = () => setPlayingId(null)
    audio.play().catch(() => setPlayingId(null))
    setPlayingId(voiceId)
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.5rem',
      }}
    >
      {VOICES.map((voice) => {
        const selected = selectedVoiceId === voice.voiceId
        const playing = playingId === voice.voiceId

        return (
          <div
            key={voice.id}
            onClick={() => onChange(voice.voiceId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              padding: '0.75rem',
              background: selected ? 'rgba(124, 58, 237, 0.08)' : 'var(--color-surface-1)',
              border: `1px solid ${
                error && !selected
                  ? 'var(--color-status-failed)'
                  : selected
                  ? 'var(--color-primary)'
                  : 'var(--color-border-2)'
              }`,
              borderRadius: '8px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  marginBottom: '0.125rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {voice.name}
              </div>
              <div
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--color-text-tertiary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {voice.description}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => handlePlay(voice.voiceId, e)}
              style={{
                flexShrink: 0,
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: `1px solid ${playing ? 'var(--color-primary)' : 'var(--color-border-2)'}`,
                background: playing ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                color: playing ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontFamily: 'inherit',
              }}
              aria-label={playing ? `Stop ${voice.name}` : `Preview ${voice.name}`}
            >
              {playing ? '■' : '▶'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
