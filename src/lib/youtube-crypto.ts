import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // bytes for AES-256

function getKey(): Buffer {
  const hex = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY
  if (!hex) throw new Error('YOUTUBE_TOKEN_ENCRYPTION_KEY not set')
  const buf = Buffer.from(hex, 'hex')
  if (buf.length !== KEY_LENGTH)
    throw new Error('YOUTUBE_TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes)')
  return buf
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptToken(encoded: string): string {
  const [ivHex, tagHex, ciphertextHex] = encoded.split(':')
  if (!ivHex || !tagHex || !ciphertextHex) throw new Error('Invalid token format')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
}
