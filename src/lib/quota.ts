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

  // Pro (or any unknown tier) — no cap. Warn on unknown to surface typos/bugs.
  if (cap === undefined) {
    if (userTier !== 'pro') {
      console.warn('[quota] Unknown tier passed to checkVoiceQuota — defaulting to unlimited:', userTier)
    }
    return { allowed: true, used: 0, limit: undefined }
  }

  try {
    const supabase = getSupabaseServerClient()

    // UTC month start — e.g. "2025-06-01T00:00:00.000Z"
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

    const { data, error } = await supabase
      .from('usage_logs')
      .select('value')
      .eq('user_id', userUuid)
      .eq('event_type', 'voice_chars_used')
      .gte('created_at', monthStart)

    if (error) {
      console.error('[quota] Supabase error checking voice quota:', error.message)
      return { allowed: true, used: 0, limit: cap }
    }

    const used = (data ?? []).reduce((sum, row) => sum + (Number(row.value) || 0), 0)
    const allowed = used < cap

    return { allowed, used, limit: cap }
  } catch (err) {
    console.error('[quota] Unexpected error checking voice quota:', err instanceof Error ? err.message : err)
    return { allowed: true, used: 0, limit: cap }
  }
}
