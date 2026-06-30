import { render } from '@react-email/components'
import { log } from '@/lib/logger'

const BREVO_API = 'https://api.brevo.com/v3/smtp/email'

export function getFromAddress(): string {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const hostname = new URL(appUrl).hostname
    if (hostname && hostname !== 'localhost') {
      return `noreply@${hostname}`
    }
  } catch {
    // fall through
  }
  log.warn('[email] non-production APP_URL — Brevo requires a verified sender domain')
  return ''
}

interface SendEmailOptions {
  from: string
  to: string
  subject: string
  html?: string
  text?: string
}

export async function sendEmail({ from, to, subject, html, text }: SendEmailOptions): Promise<void> {
  const res = await fetch(BREVO_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      sender: { email: from },
      to: [{ email: to }],
      subject,
      ...(html ? { htmlContent: html } : {}),
      ...(text ? { textContent: text } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `Brevo API error ${res.status}`)
  }
}

export async function sendWelcomeEmail(to: string): Promise<void> {
  const { default: WelcomeEmail } = await import('@/emails/welcome')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const html = await render(WelcomeEmail({ appUrl }))
  await sendEmail({
    from: getFromAddress(),
    to,
    subject: "You're in. — Klipto",
    html,
  })
}
