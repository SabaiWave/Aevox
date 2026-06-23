import { encryptToken, decryptToken } from '@/lib/youtube-crypto'

// ─── Setup ────────────────────────────────────────────────────────────────────

const VALID_KEY = '0'.repeat(64) // 64 hex zeros = 32 zero bytes, valid AES-256 key

beforeAll(() => {
  process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY = VALID_KEY
})

// ─── encryptToken ─────────────────────────────────────────────────────────────

describe('encryptToken', () => {
  it('returns a string in iv:tag:ciphertext format (contains exactly 2 colons)', () => {
    const result = encryptToken('test-access-token')
    const colons = result.split(':').length - 1
    expect(typeof result).toBe('string')
    expect(colons).toBe(2)
  })

  it('produces different ciphertexts on two calls with the same input (random IV)', () => {
    const first = encryptToken('same-plaintext')
    const second = encryptToken('same-plaintext')
    expect(first).not.toBe(second)
  })

  it('throws when YOUTUBE_TOKEN_ENCRYPTION_KEY is not set', () => {
    const saved = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY
    delete process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY
    expect(() => encryptToken('token')).toThrow('YOUTUBE_TOKEN_ENCRYPTION_KEY not set')
    process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY = saved
  })

  it('throws when key is wrong length (32 hex chars instead of 64)', () => {
    const saved = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY
    process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY = '0'.repeat(32)
    expect(() => encryptToken('token')).toThrow('YOUTUBE_TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes)')
    process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY = saved
  })
})

// ─── decryptToken ─────────────────────────────────────────────────────────────

describe('decryptToken', () => {
  it('round-trips correctly — decryptToken(encryptToken(plaintext)) === plaintext', () => {
    const plaintext = 'ya29.a0AccessToken-ExampleString'
    const encrypted = encryptToken(plaintext)
    const decrypted = decryptToken(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('throws on malformed input (missing colons)', () => {
    expect(() => decryptToken('nocollonsatall')).toThrow('Invalid token format')
  })
})
