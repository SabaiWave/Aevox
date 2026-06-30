import { Resend } from 'resend'
import { render } from '@react-email/components'
import { log } from '@/lib/logger'

let client: Resend | null = null

export function getResend(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY!)
  return client
}

// TODO: klipto.studio not yet verified in Resend — swap onboarding@resend.dev for
// noreply@klipto.studio once domain verification (SPF/DKIM/DMARC) is complete,
// or upgrade Resend plan to add a second verified domain.
export function getFromAddress(): string {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const hostname = new URL(appUrl).hostname
    if (hostname && hostname !== 'localhost') {
      return `Klipto <noreply@${hostname}>`
    }
  } catch {
    // fall through
  }
  log.warn('[email] non-production APP_URL — using Resend test sender')
  return 'onboarding@resend.dev'
}

export async function sendWelcomeEmail(to: string): Promise<void> {
  const { default: WelcomeEmail } = await import('@/emails/welcome')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const html = await render(WelcomeEmail({ appUrl }))
  const { error } = await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject: "You're in. — Klipto",
    html,
  })
  if (error) throw new Error(error.message)
}
