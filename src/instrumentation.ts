export async function register() {
  // Phase 6: wire Sentry register() here
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    logStartup()
  }
}

function logStartup() {
  const env = process.env.NODE_ENV ?? 'unknown'
  const isDev = env === 'development'

  const checks = {
    // Phase 1 — Supabase
    NEXT_PUBLIC_SUPABASE_URL:       !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:      !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    // Phase 2 — Agents
    ANTHROPIC_API_KEY:              !!process.env.ANTHROPIC_API_KEY,
    TAVILY_API_KEY:                 !!process.env.TAVILY_API_KEY,
    ELEVENLABS_API_KEY:             !!process.env.ELEVENLABS_API_KEY,
    // Phase 4 — Auth + YouTube
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY:                  !!process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET:              !!process.env.CLERK_WEBHOOK_SECRET,
    NEXT_PUBLIC_APP_URL:               !!process.env.NEXT_PUBLIC_APP_URL,
    YOUTUBE_CLIENT_ID:                 !!process.env.YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET:             !!process.env.YOUTUBE_CLIENT_SECRET,
    YOUTUBE_TOKEN_ENCRYPTION_KEY:      !!process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY,
    // Phase 5 — Billing
    STRIPE_SECRET_KEY:                 !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET:             !!process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_STARTER_PRICE_ID:           !!process.env.STRIPE_STARTER_PRICE_ID,
    STRIPE_PRO_PRICE_ID:               !!process.env.STRIPE_PRO_PRICE_ID,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    // Phase 6 — Observability (add here)
  }

  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY',
    'TAVILY_API_KEY',
    'ELEVENLABS_API_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_STARTER_PRICE_ID',
    'STRIPE_PRO_PRICE_ID',
  ]

  const missing = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k)

  if (isDev) {
    const fmt = (key: keyof typeof checks, label: string, isRequired = false) =>
      `  ${label.padEnd(36)}${checks[key] ? '✓ set' : isRequired ? '✗ MISSING — app will not work' : '✗ not configured'}`

    console.log('\n─────────────────────────────────────────────────')
    console.log(`  Klipto  [${env.toUpperCase()}]`)
    console.log('─────────────────────────────────────────────────')
    console.log(fmt('NEXT_PUBLIC_SUPABASE_URL',      'NEXT_PUBLIC_SUPABASE_URL',      true))
    console.log(fmt('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', true))
    console.log(fmt('SUPABASE_SERVICE_ROLE_KEY',     'SUPABASE_SERVICE_ROLE_KEY',     true))
    console.log('  ·')
    console.log(fmt('ANTHROPIC_API_KEY',             'ANTHROPIC_API_KEY',             true))
    console.log(fmt('TAVILY_API_KEY',                'TAVILY_API_KEY',                true))
    console.log(fmt('ELEVENLABS_API_KEY',            'ELEVENLABS_API_KEY',            true))
    console.log('  ·')
    console.log(fmt('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', true))
    console.log(fmt('CLERK_SECRET_KEY',              'CLERK_SECRET_KEY',              true))
    console.log(fmt('CLERK_WEBHOOK_SECRET',          'CLERK_WEBHOOK_SECRET'))
    console.log(fmt('NEXT_PUBLIC_APP_URL',           'NEXT_PUBLIC_APP_URL'))
    console.log(fmt('YOUTUBE_CLIENT_ID',             'YOUTUBE_CLIENT_ID'))
    console.log(fmt('YOUTUBE_CLIENT_SECRET',         'YOUTUBE_CLIENT_SECRET'))
    console.log(fmt('YOUTUBE_TOKEN_ENCRYPTION_KEY',  'YOUTUBE_TOKEN_ENCRYPTION_KEY'))
    console.log('  ·')
    console.log(fmt('STRIPE_SECRET_KEY',             'STRIPE_SECRET_KEY',             true))
    console.log(fmt('STRIPE_WEBHOOK_SECRET',         'STRIPE_WEBHOOK_SECRET',         true))
    console.log(fmt('STRIPE_STARTER_PRICE_ID',       'STRIPE_STARTER_PRICE_ID',       true))
    console.log(fmt('STRIPE_PRO_PRICE_ID',           'STRIPE_PRO_PRICE_ID',           true))
    console.log(fmt('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'))
    console.log(`  ${'DRY_RUN'.padEnd(36)}${process.env.DRY_RUN === 'true' ? 'true — fixture data, zero API cost' : 'false — real API calls'}`)
    console.log(`  ${'ADMIN_USER_IDS'.padEnd(36)}${process.env.ADMIN_USER_IDS ? 'set' : 'not set — admin features disabled'}`)
    console.log('─────────────────────────────────────────────────\n')
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
    console.error('ERROR: Required API keys are not set. See .env.example for setup instructions.')
  }
}
