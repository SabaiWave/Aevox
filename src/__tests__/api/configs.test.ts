import { NextRequest } from 'next/server'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAuth = jest.fn()
jest.mock('@/lib/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
  currentUser: jest.fn(),
  isApiRoute: jest.fn(),
}))

const mockFrom = jest.fn()
jest.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: jest.fn(() => ({ from: mockFrom })),
}))

const mockCheckRateLimit = jest.fn()
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { POST } from '@/app/api/configs/route'
import { GET, PUT } from '@/app/api/configs/[id]/route'

// ─── Constants ────────────────────────────────────────────────────────────────

const CLERK_USER_ID = 'clerk_user_abc123'
const USER_UUID = 'aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb'
const CONFIG_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const INVALID_UUID = 'not-a-valid-uuid'

const VALID_BODY = {
  name: 'DarkLore',
  niche: 'SE Asia folklore',
  tone: 'atmospheric',
  scriptStructure: 'hook-mystery-reveal-reflection-cta',
  targetDurationMin: 10,
  forbiddenTopics: ['politics'],
  voiceId: 'ABCDEFGHIJabcdefgh01',
  voiceModel: 'eleven_multilingual_v2',
  ytTitleTemplate: '{topic} | DarkLore',
  ytDescriptionTemplate: 'Folklore from SE Asia. {topic}',
  ytTags: ['folklore', 'SEAsia'],
  ytCategoryId: '22',
  ytPrivacy: 'private' as const,
}

const DB_CONFIG_ROW = {
  id: CONFIG_UUID,
  user_id: USER_UUID,
  name: 'DarkLore',
  niche: 'SE Asia folklore',
  tone: 'atmospheric',
  script_structure: 'hook-mystery-reveal-reflection-cta',
  target_duration_min: 10,
  forbidden_topics: ['politics'],
  voice_id: 'ABCDEFGHIJabcdefgh01',
  voice_model: 'eleven_multilingual_v2',
  yt_title_template: '{topic} | DarkLore',
  yt_description_template: 'Folklore from SE Asia. {topic}',
  yt_tags: ['folklore', 'SEAsia'],
  yt_category_id: '22',
  yt_privacy: 'private',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/configs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify(body),
  })
}

function makeGetRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/configs/${id}`, {
    method: 'GET',
    headers: { 'x-forwarded-for': '1.2.3.4' },
  })
}

function makePutRequest(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/configs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    body: JSON.stringify(body),
  })
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

/** Mock user lookup returning the internal UUID */
function mockUserFound(): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: USER_UUID }, error: null }),
          }),
        }),
      }
    }
    return {}
  })
}

/** Mock user lookup returning null (user not found) */
function mockUserNotFound(): void {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }
    }
    return {}
  })
}

function notLimited(): void {
  mockCheckRateLimit.mockReturnValue({ limited: false, retryAfterSeconds: 0 })
}

function isLimited(): void {
  mockCheckRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 30 })
}

// ─── POST /api/configs ────────────────────────────────────────────────────────

describe('POST /api/configs', () => {
  beforeAll(() => {
    process.env.DRY_RUN = 'true'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    notLimited()
  })

  it('returns 429 when rate limited', async () => {
    isLimited()

    const res = await POST(makePostRequest(VALID_BODY))

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('Too many requests')
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await POST(makePostRequest(VALID_BODY))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 404 when user not found in DB', async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })
    mockUserNotFound()

    const res = await POST(makePostRequest(VALID_BODY))

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('User not found')
  })

  it('returns 400 on invalid body (missing required field)', async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })
    // name is required — omit it
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name: _omitted, ...bodyWithoutName } = VALID_BODY

    const res = await POST(makePostRequest(bodyWithoutName))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid request')
    expect(body.details).toBeDefined()
  })

  it('returns 201 with config id on happy path', async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: USER_UUID }, error: null }),
            }),
          }),
        }
      }
      if (table === 'channel_configs') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: CONFIG_UUID }, error: null }),
            }),
          }),
        }
      }
      return {}
    })

    const res = await POST(makePostRequest(VALID_BODY))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data).toBeDefined()
    expect(body.data.id).toBe(CONFIG_UUID)
  })
})

// ─── GET /api/configs/[id] ────────────────────────────────────────────────────

describe('GET /api/configs/[id]', () => {
  beforeAll(() => {
    process.env.DRY_RUN = 'true'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    notLimited()
  })

  it('returns 429 when rate limited', async () => {
    isLimited()

    const res = await GET(makeGetRequest(CONFIG_UUID), makeParams(CONFIG_UUID))

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('Too many requests')
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await GET(makeGetRequest(CONFIG_UUID), makeParams(CONFIG_UUID))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 on invalid UUID param', async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })

    const res = await GET(makeGetRequest(INVALID_UUID), makeParams(INVALID_UUID))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid config id')
  })

  it('returns 404 when config not found', async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: USER_UUID }, error: null }),
            }),
          }),
        }
      }
      if (table === 'channel_configs') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const res = await GET(makeGetRequest(CONFIG_UUID), makeParams(CONFIG_UUID))

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Config not found')
  })

  it('returns 200 with config data on happy path', async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: USER_UUID }, error: null }),
            }),
          }),
        }
      }
      if (table === 'channel_configs') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: DB_CONFIG_ROW, error: null }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const res = await GET(makeGetRequest(CONFIG_UUID), makeParams(CONFIG_UUID))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toBeDefined()
    expect(body.data.id).toBe(CONFIG_UUID)
    expect(body.data.name).toBe('DarkLore')
  })
})

// ─── PUT /api/configs/[id] ────────────────────────────────────────────────────

describe('PUT /api/configs/[id]', () => {
  beforeAll(() => {
    process.env.DRY_RUN = 'true'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    notLimited()
  })

  it('returns 429 when rate limited', async () => {
    isLimited()

    const res = await PUT(makePutRequest(CONFIG_UUID, VALID_BODY), makeParams(CONFIG_UUID))

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('Too many requests')
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await PUT(makePutRequest(CONFIG_UUID, VALID_BODY), makeParams(CONFIG_UUID))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 on invalid body', async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })
    // targetDurationMin out of range (max: 60)
    const invalidBody = { ...VALID_BODY, targetDurationMin: 999 }

    const res = await PUT(makePutRequest(CONFIG_UUID, invalidBody), makeParams(CONFIG_UUID))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid request')
    expect(body.details).toBeDefined()
  })

  it('returns 404 when config not found or belongs to a different user', async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: USER_UUID }, error: null }),
            }),
          }),
        }
      }
      if (table === 'channel_configs') {
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const res = await PUT(makePutRequest(CONFIG_UUID, VALID_BODY), makeParams(CONFIG_UUID))

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Config not found')
  })

  it('returns 200 on happy path', async () => {
    mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: USER_UUID }, error: null }),
            }),
          }),
        }
      }
      if (table === 'channel_configs') {
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest
                    .fn()
                    .mockResolvedValue({ data: { id: CONFIG_UUID }, error: null }),
                }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const res = await PUT(makePutRequest(CONFIG_UUID, VALID_BODY), makeParams(CONFIG_UUID))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toBeDefined()
    expect(body.data.id).toBe(CONFIG_UUID)
  })
})
