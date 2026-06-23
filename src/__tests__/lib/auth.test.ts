import { isApiRoute } from '@/lib/auth'

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
  currentUser: jest.fn(),
}))

describe('isApiRoute', () => {
  it('returns true for /api/pipeline', () => {
    const req = new Request('http://localhost/api/pipeline')
    expect(isApiRoute(req)).toBe(true)
  })

  it('returns true for /api/webhooks/clerk', () => {
    const req = new Request('http://localhost/api/webhooks/clerk')
    expect(isApiRoute(req)).toBe(true)
  })

  it('returns false for /dashboard', () => {
    const req = new Request('http://localhost/dashboard')
    expect(isApiRoute(req)).toBe(false)
  })

  it('returns false for /sign-in', () => {
    const req = new Request('http://localhost/sign-in')
    expect(isApiRoute(req)).toBe(false)
  })

  it('returns false for /configs', () => {
    const req = new Request('http://localhost/configs')
    expect(isApiRoute(req)).toBe(false)
  })
})
