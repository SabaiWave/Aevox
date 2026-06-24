'use client'

import { useState, KeyboardEvent } from 'react'
import type { ChannelConfig } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChannelConfigFormData {
  name: string
  niche: string
  tone: string
  scriptStructure: string
  targetDurationMin: number
  forbiddenTopics: string[]
  voiceId: string
  voiceModel: string
  ytTitleTemplate: string
  ytDescriptionTemplate: string
  ytTags: string[]
  ytCategoryId: string
  ytPrivacy: 'private' | 'unlisted' | 'public'
}

interface ChannelConfigFormProps {
  config?: Partial<ChannelConfig>
  onSave: (data: ChannelConfigFormData) => Promise<void>
  isSaving?: boolean
  isAdmin?: boolean
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
  letterSpacing: '0.1em',
  marginBottom: '1rem',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  marginBottom: '0.375rem',
}

function inputStyle(focused: boolean, error?: boolean): React.CSSProperties {
  return {
    width: '100%',
    background: 'var(--color-surface-1)',
    border: `1px solid ${error ? 'var(--color-status-failed)' : focused ? 'var(--color-primary)' : 'var(--color-border-2)'}`,
    borderRadius: '8px',
    fontSize: '0.875rem',
    padding: '0.5rem 0.75rem',
    color: 'var(--color-text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }
}

const fieldStyle: React.CSSProperties = {
  marginBottom: '1.25rem',
}

const errorTextStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--color-status-failed)',
  marginTop: '0.25rem',
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '2rem',
}

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid var(--color-border-1)',
  marginBottom: '1.5rem',
}

// ─── Tag Input ─────────────────────────────────────────────────────────────────

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

function TagInput({ tags, onChange, placeholder = 'Type and press Enter' }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [focused, setFocused] = useState(false)

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = inputValue.trim()
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed])
      }
      setInputValue('')
    }
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index))
  }

  return (
    <div>
      {tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.375rem',
            marginBottom: '0.5rem',
          }}
        >
          {tags.map((tag, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border-2)',
                borderRadius: '4px',
                fontSize: '0.875rem',
                padding: '2px 8px',
                color: 'var(--color-text-primary)',
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(i)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-tertiary)',
                  fontSize: '0.75rem',
                  padding: '0 2px',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={inputStyle(focused)}
      />
    </div>
  )
}

// ─── Focused input wrappers ────────────────────────────────────────────────────

interface TextInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: boolean
}

function TextInput({ value, onChange, placeholder, error }: TextInputProps) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      style={inputStyle(focused, error)}
    />
  )
}

interface TextareaInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}

function TextareaInput({ value, onChange, placeholder, rows = 4 }: TextareaInputProps) {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle(focused), resize: 'vertical' }}
    />
  )
}

interface NumberInputProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}

function NumberInput({ value, onChange, min, max }: NumberInputProps) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      min={min}
      max={max}
      style={inputStyle(focused)}
    />
  )
}

interface SelectInputProps {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}

function SelectInput({ value, onChange, options }: SelectInputProps) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...inputStyle(focused), cursor: 'pointer' }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ChannelConfigForm({ config, onSave, isSaving, isAdmin }: ChannelConfigFormProps) {
  // ── Field state ──
  const [name, setName] = useState(config?.name ?? '')
  const [niche, setNiche] = useState(config?.niche ?? '')
  const [tone, setTone] = useState(config?.tone ?? '')
  const [scriptStructure, setScriptStructure] = useState(config?.scriptStructure ?? '')
  const [targetDurationMin, setTargetDurationMin] = useState(config?.targetDurationMin ?? 10)
  const [forbiddenTopics, setForbiddenTopics] = useState<string[]>(config?.forbiddenTopics ?? [])
  const [voiceId, setVoiceId] = useState(config?.voiceId ?? '')
  const [voiceModel, setVoiceModel] = useState(config?.voiceModel ?? 'eleven_multilingual_v2')
  const [ytTitleTemplate, setYtTitleTemplate] = useState(config?.ytTitleTemplate ?? '')
  const [ytDescriptionTemplate, setYtDescriptionTemplate] = useState(config?.ytDescriptionTemplate ?? '')
  const [ytTags, setYtTags] = useState<string[]>(config?.ytTags ?? [])
  const [ytCategoryId, setYtCategoryId] = useState(config?.ytCategoryId ?? '')
  const [ytPrivacy, setYtPrivacy] = useState<'private' | 'unlisted' | 'public'>(
    config?.ytPrivacy ?? 'private'
  )

  // ── Validation errors ──
  const [errors, setErrors] = useState<Partial<Record<'name' | 'niche' | 'tone' | 'scriptStructure' | 'voiceId', string>>>({})
  const [formError, setFormError] = useState<string>('')

  // ── Submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    const newErrors: typeof errors = {}
    if (!name.trim()) newErrors.name = 'Name is required'
    if (!niche.trim()) newErrors.niche = 'Niche is required'
    if (!tone.trim()) newErrors.tone = 'Tone is required'
    if (!scriptStructure.trim()) newErrors.scriptStructure = 'Script structure is required'
    if (!voiceId.trim()) newErrors.voiceId = 'Voice ID is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})

    const formData: ChannelConfigFormData = {
      name: name.trim(),
      niche: niche.trim(),
      tone: tone.trim(),
      scriptStructure: scriptStructure.trim(),
      targetDurationMin,
      forbiddenTopics,
      voiceId: voiceId.trim(),
      voiceModel: voiceModel.trim(),
      ytTitleTemplate: ytTitleTemplate.trim(),
      ytDescriptionTemplate: ytDescriptionTemplate.trim(),
      ytTags,
      ytCategoryId: ytCategoryId.trim(),
      ytPrivacy,
    }

    try {
      await onSave(formData)
    } catch {
      setFormError('Failed to save. Please try again.')
    }
  }

  function quickFill() {
    setName(`DarkLore-${Math.random().toString(36).slice(2, 8)}`)
    setNiche('SE Asia folklore')
    setTone('Mysterious, educational')
    setScriptStructure('Hook (30s) → Origin story (2min) → Mythology deep-dive (4min) → Modern sightings (2min) → Outro + CTA (30s)')
    setVoiceId('21m00Tcm4TlvDq8ikWAM')
    setVoiceModel('eleven_multilingual_v2')
    setYtTitleTemplate('{{topic}} | DarkLore')
    setYtDescriptionTemplate('Deep dive into {{topic}}. Subscribe for more SE Asia folklore.')
    setYtPrivacy('private')
    setErrors({})
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ maxWidth: '640px' }}>

      {isAdmin && (
        <div style={{ marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={quickFill}
            style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', border: '1px dashed var(--color-border-2)', background: 'transparent', color: 'var(--color-text-tertiary)', cursor: 'pointer' }}
          >
            ⚡ Quick fill
          </button>
        </div>
      )}

      {/* ── Section 1: Channel Identity ── */}
      <section style={sectionStyle}>
        <p style={sectionHeadingStyle}>Channel Identity</p>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Name <span style={{ color: 'var(--color-status-failed)' }}>*</span>
          </label>
          <TextInput
            value={name}
            onChange={(v) => { setName(v); if (errors.name) setErrors((prev) => ({ ...prev, name: undefined })) }}
            placeholder="e.g. DarkLore"
            error={!!errors.name}
          />
          {errors.name && <p style={errorTextStyle}>{errors.name}</p>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Niche <span style={{ color: 'var(--color-status-failed)' }}>*</span>
          </label>
          <TextInput
            value={niche}
            onChange={(v) => { setNiche(v); if (errors.niche) setErrors((prev) => ({ ...prev, niche: undefined })) }}
            placeholder="e.g. SE Asia folklore"
            error={!!errors.niche}
          />
          {errors.niche && <p style={errorTextStyle}>{errors.niche}</p>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Tone <span style={{ color: 'var(--color-status-failed)' }}>*</span>
          </label>
          <TextInput
            value={tone}
            onChange={(v) => { setTone(v); if (errors.tone) setErrors((prev) => ({ ...prev, tone: undefined })) }}
            placeholder="e.g. Mysterious, educational"
            error={!!errors.tone}
          />
          {errors.tone && <p style={errorTextStyle}>{errors.tone}</p>}
        </div>
      </section>

      <hr style={dividerStyle} />

      {/* ── Section 2: Script Settings ── */}
      <section style={sectionStyle}>
        <p style={sectionHeadingStyle}>Script Settings</p>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Script Structure <span style={{ color: 'var(--color-status-failed)' }}>*</span>
          </label>
          <TextareaInput
            value={scriptStructure}
            onChange={(v) => { setScriptStructure(v); if (errors.scriptStructure) setErrors((prev) => ({ ...prev, scriptStructure: undefined })) }}
            placeholder="Describe the episode format: hook, story beats, outro, CTA..."
            rows={4}
          />
          {errors.scriptStructure && <p style={errorTextStyle}>{errors.scriptStructure}</p>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Target Duration (minutes)</label>
          <NumberInput
            value={targetDurationMin}
            onChange={setTargetDurationMin}
            min={1}
            max={60}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Forbidden Topics</label>
          <TagInput
            tags={forbiddenTopics}
            onChange={setForbiddenTopics}
            placeholder="Type a topic and press Enter"
          />
        </div>
      </section>

      <hr style={dividerStyle} />

      {/* ── Section 3: Voice Settings ── */}
      <section style={sectionStyle}>
        <p style={sectionHeadingStyle}>Voice Settings</p>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Voice ID <span style={{ color: 'var(--color-status-failed)' }}>*</span>
          </label>
          <TextInput
            value={voiceId}
            onChange={(v) => { setVoiceId(v); if (errors.voiceId) setErrors((prev) => ({ ...prev, voiceId: undefined })) }}
            placeholder="ElevenLabs voice ID"
            error={!!errors.voiceId}
          />
          {errors.voiceId && <p style={errorTextStyle}>{errors.voiceId}</p>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Voice Model</label>
          <TextInput
            value={voiceModel}
            onChange={setVoiceModel}
            placeholder="eleven_multilingual_v2"
          />
        </div>
      </section>

      <hr style={dividerStyle} />

      {/* ── Section 4: YouTube Defaults ── */}
      <section style={sectionStyle}>
        <p style={sectionHeadingStyle}>YouTube Defaults</p>

        <div style={fieldStyle}>
          <label style={labelStyle}>Title Template</label>
          <TextInput
            value={ytTitleTemplate}
            onChange={setYtTitleTemplate}
            placeholder="e.g. {{topic}} | DarkLore"
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Description Template</label>
          <TextareaInput
            value={ytDescriptionTemplate}
            onChange={setYtDescriptionTemplate}
            placeholder="Default YouTube description..."
            rows={4}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Tags</label>
          <TagInput
            tags={ytTags}
            onChange={setYtTags}
            placeholder="Type a tag and press Enter"
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Category ID</label>
          <TextInput
            value={ytCategoryId}
            onChange={setYtCategoryId}
            placeholder="YouTube category number, e.g. 22"
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Privacy</label>
          <SelectInput
            value={ytPrivacy}
            onChange={(v) => setYtPrivacy(v as 'private' | 'unlisted' | 'public')}
            options={[
              { value: 'private', label: 'Private' },
              { value: 'unlisted', label: 'Unlisted' },
              { value: 'public', label: 'Public' },
            ]}
          />
        </div>
      </section>

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={isSaving}
        style={{
          background: isSaving ? 'var(--color-border-2)' : 'var(--color-primary)',
          color: 'var(--color-text-primary)',
          border: 'none',
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontWeight: 500,
          padding: '0.5rem 1rem',
          cursor: isSaving ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          opacity: isSaving ? 0.6 : 1,
        }}
      >
        {isSaving ? 'Saving...' : 'Save Config'}
      </button>
      {formError && (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-status-failed)', marginTop: '0.75rem' }}>
          {formError}
        </p>
      )}
    </form>
  )
}
