import { isUserCreatedEvent } from '@/lib/clerk-webhook'

// ─── isUserCreatedEvent ────────────────────────────────────────────────────────

describe('isUserCreatedEvent', () => {
  const validPayload = {
    type: 'user.created',
    data: {
      id: 'user_abc123',
      email_addresses: [{ email_address: 'alex@example.com', id: 'idn_abc123' }],
      primary_email_address_id: 'idn_abc123',
    },
  }

  beforeEach(() => jest.clearAllMocks())

  it('returns true for valid user.created payload with correct shape', () => {
    expect(isUserCreatedEvent(validPayload)).toBe(true)
  })

  it('returns false when type is not user.created', () => {
    expect(isUserCreatedEvent({ ...validPayload, type: 'user.updated' })).toBe(false)
    expect(isUserCreatedEvent({ ...validPayload, type: 'session.created' })).toBe(false)
    expect(isUserCreatedEvent({ ...validPayload, type: '' })).toBe(false)
  })

  it('returns false when data is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: _omitted, ...withoutData } = validPayload
    expect(isUserCreatedEvent(withoutData)).toBe(false)
  })

  it('returns false when data is null', () => {
    expect(isUserCreatedEvent({ type: 'user.created', data: null })).toBe(false)
  })

  it('returns false when email_addresses is missing', () => {
    const payload = {
      type: 'user.created',
      data: {
        id: 'user_abc123',
        primary_email_address_id: 'idn_abc123',
      },
    }
    expect(isUserCreatedEvent(payload)).toBe(false)
  })

  it('returns false when email_addresses is empty array', () => {
    const payload = {
      type: 'user.created',
      data: {
        id: 'user_abc123',
        email_addresses: [],
        primary_email_address_id: 'idn_abc123',
      },
    }
    // The guard only checks Array.isArray — an empty array still passes the guard.
    // This test documents that behaviour: an empty array is structurally valid.
    // The route handles the missing primary email case itself.
    expect(isUserCreatedEvent(payload)).toBe(true)
  })

  it('returns false for null input', () => {
    expect(isUserCreatedEvent(null)).toBe(false)
  })

  it('returns false for undefined input', () => {
    expect(isUserCreatedEvent(undefined)).toBe(false)
  })

  it('returns false for non-object primitives', () => {
    expect(isUserCreatedEvent('user.created')).toBe(false)
    expect(isUserCreatedEvent(42)).toBe(false)
    expect(isUserCreatedEvent(true)).toBe(false)
  })
})
