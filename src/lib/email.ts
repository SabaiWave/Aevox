import { Resend } from 'resend'
import { log } from '@/lib/logger'

let client: Resend | null = null

export function getResend(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY!)
  return client
}

export function getFromAddress(): string {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const domain = new URL(appUrl).hostname
    return `Klipto <noreply@${domain}>`
  } catch {
    log.warn('[email] NEXT_PUBLIC_APP_URL missing or invalid — using fallback from address')
    return 'noreply@klipto.ai'
  }
}
