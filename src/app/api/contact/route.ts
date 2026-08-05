import { z } from 'zod'
import { isApiRoute } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendEmail, getFromAddress } from '@/lib/email'
import { log } from '@/lib/logger'

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  message: z.string().min(1).max(2000),
})

export async function POST(req: Request): Promise<Response> {
  if (!isApiRoute(req)) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  const { limited, retryAfterSeconds } = ip === 'unknown'
    ? { limited: true, retryAfterSeconds: 0 }
    : await checkRateLimit(`contact:${ip}`, { windowMs: 15 * 60 * 1000, max: 5 })

  if (limited) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = contactSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid fields' }, { status: 400 })
  }

  const { name, email } = parsed.data

  try {
    await sendEmail({
      from: getFromAddress(),
      to: process.env.SUPPORT_EMAIL!,
      subject: `Contact form: ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${parsed.data.message}`,
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    log.error('[contact] send failed', { error })
    return Response.json({ error: 'Failed to send message' }, { status: 500 })
  }

  return Response.json({ success: true })
}
