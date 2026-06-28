import { getSupabaseServerClient } from '@/lib/supabase-server'

// ─── Tier limits ──────────────────────────────────────────────────────────────

// Pro is excluded — unlimited, no cap enforced
const VOICE_CHAR_CAPS: Record<string, number> = {
  free: 10_000,
  starter: 100_000,
}

export interface QuotaResult {
  allowed: boolean
  used: number
  limit: number | undefined
}

// ─── checkVoiceQuota ──────────────────────────────────────────────────────────

/**
 * Check whether userUuid has remaining ElevenLabs character quota for the
 * current UTC calendar month.
 *
 * Fail-open: on any DB error, logs and returns { allowed: true } so a Supabase
 * hiccup never blocks a pipeline run.
 */
export async function checkVoiceQuota(
  userUuid: string,
  userTier: string,
): Promise<QuotaResult> {
  const cap = VOICE_CHAR_CAPS[userTier]

  // Pro — no cap, skip DB entirely.
  if (userTier === 'pro') {
    return { allowed: true, used: 0, limit: undefined }
  }

  // Unknown tier — fail safe: apply free-tier cap.
  const effectiveCap = cap ?? VOICE_CHAR_CAPS['free']

  try {
    const supabase = getSupabaseServerClient()

    // UTC month start — e.g. "2025-06-01T00:00:00.000Z"
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

    const { data, error } = await supabase
      .from('usage_logs')
      .select('chars_used')
      .eq('user_id', userUuid)
      .eq('event_type', 'voice_chars_used')
      .gte('created_at', monthStart)

    if (error) {
      console.error('[quota] Supabase error checking voice quota:', error.message)
      return { allowed: true, used: 0, limit: effectiveCap }
    }

    const used = (data ?? []).reduce((sum, row) => sum + (Number(row.chars_used) || 0), 0)
    const allowed = used < effectiveCap

    return { allowed, used, limit: effectiveCap }
  } catch (err) {
    console.error('[quota] Unexpected error checking voice quota:', err instanceof Error ? err.message : err)
    return { allowed: true, used: 0, limit: effectiveCap }
  }
}
