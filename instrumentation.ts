export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
    logStartup()
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

function logStartup() {
  const env = process.env.NODE_ENV ?? 'unknown'
  const isDev = env === 'development'

  const checks = {
    // Core — required
    ANTHROPIC_API_KEY:                    !!process.env.ANTHROPIC_API_KEY,
    TAVILY_API_KEY:                       !!process.env.TAVILY_API_KEY,
    ELEVENLABS_API_KEY:                   !!process.env.ELEVENLABS_API_KEY,
    // Observability
    SENTRY_DSN:                           !!process.env.SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_DSN:               !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    BETTERSTACK_SOURCE_TOKEN:             !!process.env.BETTERSTACK_SOURCE_TOKEN,
    BETTERSTACK_INGEST_URL:               !!process.env.BETTERSTACK_INGEST_URL,
    // Auth
    CLERK_SECRET_KEY:                     !!process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:    !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    // Database
    NEXT_PUBLIC_SUPABASE_URL:             !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY:            !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    // YouTube OAuth
    YOUTUBE_CLIENT_ID:                    !!process.env.YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET:                !!process.env.YOUTUBE_CLIENT_SECRET,
    YOUTUBE_TOKEN_ENCRYPTION_KEY:         !!process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY,
    // Billing
    STRIPE_SECRET_KEY:                    !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET:                !!process.env.STRIPE_WEBHOOK_SECRET,
    // App
    NEXT_PUBLIC_APP_URL:                  !!process.env.NEXT_PUBLIC_APP_URL,
    ADMIN_USER_IDS:                       !!process.env.ADMIN_USER_IDS,
  }

  const required = ['ANTHROPIC_API_KEY', 'TAVILY_API_KEY', 'ELEVENLABS_API_KEY']
  const missing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k)

  if (isDev) {
    const fmt = (key: keyof typeof checks, label: string, isRequired = false) =>
      `  ${label.padEnd(42)}${checks[key] ? '✓ set' : isRequired ? '✗ MISSING — required' : '– not configured'}`

    console.log('\n─────────────────────────────────────────────────────')
    console.log(`  Klipto  [${env.toUpperCase()}]`)
    console.log('─────────────────────────────────────────────────────')
    console.log(fmt('ANTHROPIC_API_KEY',                 'ANTHROPIC_API_KEY',                 true))
    console.log(fmt('TAVILY_API_KEY',                    'TAVILY_API_KEY',                    true))
    console.log(fmt('ELEVENLABS_API_KEY',                'ELEVENLABS_API_KEY',                true))
    console.log('  ·')
    console.log(fmt('SENTRY_DSN',                        'SENTRY_DSN'))
    console.log(fmt('NEXT_PUBLIC_SENTRY_DSN',            'NEXT_PUBLIC_SENTRY_DSN'))
    console.log(fmt('BETTERSTACK_SOURCE_TOKEN',          'BETTERSTACK_SOURCE_TOKEN'))
    console.log(fmt('BETTERSTACK_INGEST_URL',            'BETTERSTACK_INGEST_URL'))
    console.log('  ·')
    console.log(fmt('CLERK_SECRET_KEY',                  'CLERK_SECRET_KEY'))
    console.log(fmt('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'))
    console.log('  ·')
    console.log(fmt('NEXT_PUBLIC_SUPABASE_URL',          'NEXT_PUBLIC_SUPABASE_URL'))
    console.log(fmt('SUPABASE_SERVICE_ROLE_KEY',         'SUPABASE_SERVICE_ROLE_KEY'))
    console.log('  ·')
    console.log(fmt('YOUTUBE_CLIENT_ID',                 'YOUTUBE_CLIENT_ID'))
    console.log(fmt('YOUTUBE_CLIENT_SECRET',             'YOUTUBE_CLIENT_SECRET'))
    console.log(fmt('YOUTUBE_TOKEN_ENCRYPTION_KEY',      'YOUTUBE_TOKEN_ENCRYPTION_KEY'))
    console.log('  ·')
    console.log(fmt('STRIPE_SECRET_KEY',                 'STRIPE_SECRET_KEY'))
    console.log(fmt('STRIPE_WEBHOOK_SECRET',             'STRIPE_WEBHOOK_SECRET'))
    console.log('  ·')
    console.log(fmt('NEXT_PUBLIC_APP_URL',               'NEXT_PUBLIC_APP_URL'))
    console.log(fmt('ADMIN_USER_IDS',                    'ADMIN_USER_IDS'))
    console.log(`  ${'DRY_RUN'.padEnd(42)}${process.env.DRY_RUN === 'true' ? 'true — fixture data, zero API cost' : 'false — real API calls'}`)
    console.log('─────────────────────────────────────────────────────\n')
  } else {
    console.log(JSON.stringify({
      level: 'info',
      message: 'Klipto server starting',
      env,
      keysConfigured: Object.entries(checks).filter(([, v]) => v).map(([k]) => k),
      keysMissing: missing,
    }))
  }

  if (missing.some(k => required.includes(k))) {
    console.error('ERROR: Required API keys are not set. See .env.local for setup instructions.')
  }
}
