interface LogMeta {
  agent?: string
  runId?: string
  configId?: string
  durationMs?: number
  error?: string
  [key: string]: unknown
}

function sendToBetterStack(entry: object): Promise<void> {
  const token = process.env.BETTERSTACK_SOURCE_TOKEN
  const url = process.env.BETTERSTACK_INGEST_URL
  if (!token || !url) return Promise.resolve()
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(entry),
  }).then(() => {}).catch((err) => {
    if (process.env.NODE_ENV !== 'production') console.error('BetterStack send failed:', err)
  })
}

function buildEnvContext() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
  const region = process.env.VERCEL_REGION
  return {
    env: process.env.NODE_ENV ?? 'development',
    ...(sha ? { sha } : {}),
    ...(region ? { region } : {}),
  }
}

function emit(level: 'info' | 'warn' | 'error', message: string, meta: LogMeta = {}): Promise<void> {
  const entry = { dt: new Date().toISOString(), level, message, ...buildEnvContext(), ...meta }

  if (process.env.NODE_ENV !== 'production') {
    const prefix = level === 'error' ? '✖' : level === 'warn' ? '⚠' : '✔'
    const hasMeta = Object.keys(meta).length > 0
    if (level === 'error') console.error(prefix, message, hasMeta ? meta : '')
    else if (level === 'warn') console.warn(prefix, message, hasMeta ? meta : '')
    else console.log(prefix, message, hasMeta ? meta : '')
  } else {
    const line = JSON.stringify(entry)
    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
  }

  return sendToBetterStack(entry)
}

export const log = {
  info: (message: string, meta?: LogMeta): Promise<void> => emit('info', message, meta),
  warn: (message: string, meta?: LogMeta): Promise<void> => emit('warn', message, meta),
  error: (message: string, meta?: LogMeta): Promise<void> => emit('error', message, meta),
}
