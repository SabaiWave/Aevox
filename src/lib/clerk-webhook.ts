export interface ClerkUserCreatedEvent {
  type: 'user.created'
  data: {
    id: string
    email_addresses: Array<{ email_address: string; id: string }>
    primary_email_address_id: string
  }
}

export function isUserCreatedEvent(payload: unknown): payload is ClerkUserCreatedEvent {
  if (typeof payload !== 'object' || payload === null) return false
  const p = payload as Record<string, unknown>
  if (p['type'] !== 'user.created') return false
  const data = p['data']
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  if (typeof d['id'] !== 'string') return false
  if (!Array.isArray(d['email_addresses'])) return false
  if (typeof d['primary_email_address_id'] !== 'string') return false
  return true
}
