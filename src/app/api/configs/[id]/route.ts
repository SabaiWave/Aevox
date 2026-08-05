import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { checkRateLimit } from '@/lib/rate-limit'

// ─── Validation ────────────────────────────────────────────────────────────────

const configBodySchema = z.object({
  name: z.string().min(1).max(100),
  niche: z.string().min(1).max(100),
  tone: z.string().min(1).max(100),
  scriptStructure: z.string().min(1).max(1000),
  targetDurationMin: z.number().int().min(1).max(20),
  forbiddenTopics: z.array(z.string().max(100)).max(20),
  voiceId: z.string().min(1).max(100),
  voiceModel: z.string().min(1).max(100),
  ytTitleTemplate: z.string().max(200),
  ytDescriptionTemplate: z.string().max(5000),
  ytTags: z.array(z.string().max(50)).max(15),
  ytCategoryId: z.string().max(10),
  ytPrivacy: z.enum(['private', 'unlisted', 'public']),
})

const uuidSchema = z.string().uuid()

// ─── GET /api/configs/[id] — fetch single config ──────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── 0. Rate limit (by IP, pre-auth) ───────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const { limited: getLimited, retryAfterSeconds: getRetry } = await checkRateLimit(`configs-read:${ip}`, { windowMs: 60_000, max: 30 })
  if (getLimited) {
    return Response.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(getRetry) },
    })
  }

  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 2. Validate path param ─────────────────────────────────────────────────
  const { id } = await params
  if (!uuidSchema.safeParse(id).success) {
    return Response.json({ error: 'Invalid config id' }, { status: 400 })
  }

  // ── 3. Resolve Clerk userId → internal uuid ────────────────────────────────
  const supabase = getSupabaseServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single()
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  // ── 4. Fetch config scoped to this user ───────────────────────────────────
  const { data: row, error } = await supabase
    .from('channel_configs')
    .select(
      'id, user_id, name, niche, tone, script_structure, target_duration_min, forbidden_topics, voice_id, voice_model, yt_title_template, yt_description_template, yt_tags, yt_category_id, yt_privacy, created_at, updated_at',
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !row) {
    return Response.json({ error: 'Config not found' }, { status: 404 })
  }

  return Response.json({ data: row }, { status: 200 })
}

// ─── PUT /api/configs/[id] — update existing config ──────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── 0. Rate limit (by IP, pre-auth) ───────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const { limited: putLimited, retryAfterSeconds: putRetry } = await checkRateLimit(`configs-update:${ip}`, { windowMs: 60_000, max: 10 })
  if (putLimited) {
    return Response.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(putRetry) },
    })
  }

  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // ── 2. Validate path param ─────────────────────────────────────────────────
  const { id } = await params
  if (!uuidSchema.safeParse(id).success) {
    return Response.json({ error: 'Invalid config id' }, { status: 400 })
  }

  // ── 3. Parse + validate body ───────────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = configBodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 },
    )
  }

  // ── 4. Resolve Clerk userId → internal uuid ────────────────────────────────
  const supabase = getSupabaseServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single()
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  // ── 5. Update config scoped to this user ──────────────────────────────────
  const { data, error } = await supabase
    .from('channel_configs')
    .update({
      name: parsed.data.name,
      niche: parsed.data.niche,
      tone: parsed.data.tone,
      script_structure: parsed.data.scriptStructure,
      target_duration_min: parsed.data.targetDurationMin,
      forbidden_topics: parsed.data.forbiddenTopics,
      voice_id: parsed.data.voiceId,
      voice_model: parsed.data.voiceModel,
      yt_title_template: parsed.data.ytTitleTemplate,
      yt_description_template: parsed.data.ytDescriptionTemplate,
      yt_tags: parsed.data.ytTags,
      yt_category_id: parsed.data.ytCategoryId,
      yt_privacy: parsed.data.ytPrivacy,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .single()

  if (error || !data) {
    // No row returned means config not found or belongs to a different user
    return Response.json({ error: 'Config not found' }, { status: 404 })
  }

  return Response.json({ data: { id: data.id } }, { status: 200 })
}
