import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
  // Disable in development to avoid noise
  enabled: process.env.NODE_ENV === 'production',
})
