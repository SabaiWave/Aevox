import type { NextConfig } from "next"
import { withSentryConfig } from '@sentry/nextjs'

// Fail Vercel build if required env vars are missing (VERCEL=1 is set automatically)
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  // Phase 2 — agents
  'ANTHROPIC_API_KEY',
  'TAVILY_API_KEY',
  'ELEVENLABS_API_KEY',
  // Phase 4 — auth + YouTube OAuth
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'YOUTUBE_CLIENT_ID',
  'YOUTUBE_CLIENT_SECRET',
  'YOUTUBE_TOKEN_ENCRYPTION_KEY',
  // Phase 5 — Billing
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_STARTER_PRICE_ID',
  'STRIPE_PRO_PRICE_ID',
]

if (process.env.VERCEL) {
  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Build failed — missing required env vars: ${missing.join(', ')}`)
  }
}

const csp = [
  "default-src 'self'",
  // Clerk and Stripe inject client-side scripts
  "script-src 'self' 'unsafe-eval' https://js.stripe.com https://*.clerk.accounts.dev https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  // Browser-side API connections: Supabase realtime, Clerk, Stripe
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.clerk.accounts.dev https://api.clerk.dev https://js.stripe.com https://*.stripe.com",
  // Clerk and Stripe render iframes for their hosted UI
  "frame-src https://js.stripe.com https://*.clerk.accounts.dev",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ')

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL ?? 'https://klipto.app',
          },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { disable: true },
})
