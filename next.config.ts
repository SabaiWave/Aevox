import type { NextConfig } from "next"

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
  // Phase 5 — add Stripe vars here
]

if (process.env.VERCEL) {
  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Build failed — missing required env vars: ${missing.join(', ')}`)
  }
}

const nextConfig: NextConfig = {}

export default nextConfig
