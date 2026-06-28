import { NextRequest } from 'next/server'
import { darkloreConfig } from '@/__fixtures__/configs/darklore'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAuth = jest.fn()
jest.mock('@/lib/auth', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
  currentUser: jest.fn(),
  isApiRoute: jest.fn(),
}))

// Supabase chainable mock
const mockFrom = jest.fn()

jest.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: jest.fn(() => ({ from: mockFrom })),
}))

jest.mock('@/agents/orchestrator', () => ({
  runPipeline: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/pipeline-events', () => ({
  createRunStore: jest.fn(),
  pushEvent: jest.fn(),
  markRunDone: jest.fn(),
  getRunStore: jest.fn(),
  deleteRunStore: jest.fn(),
}))

jest.mock('@/lib/youtube-token-refresh', () => ({
  getValidYouTubeToken: jest.fn().mockResolvedValue({ accessToken: '', connected: false }),
}))

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ limited: false, retryAfterSeconds: 0 }),
}))

jest.mock('@/lib/is-admin', () => ({
  isAdmin: jest.fn().mockResolvedValue(false),
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import { POST } from '@/app/api/videos/route'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_CONFIG_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const VALID_TOPIC = 'The Pontianak — Malaysian vampire ghost'
const CLERK_USER_ID = 'clerk_user_123'
const USER_UUID = 'deadbeef-dead-beef-dead-beefdeadbeef'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Build a Supabase mock chain for the happy-path sequence:
// 1. from('users').select('id').eq('clerk_id', ...).single()  → { data: { id: USER_UUID } }
// 2. from('channel_configs').select(...).eq('id', ...).eq('user_id', ...).single() → { data: row }
// 3. from('videos').insert({...}) → { error: null }
function setupHappyPathMocks(): void {
  const dbRow = {
    id: VALID_CONFIG_UUID,
    user_id: USER_UUID,
    name: darkloreConfig.name,
    niche: darkloreConfig.niche,
    tone: darkloreConfig.tone,
    script_structure: darkloreConfig.scriptStructure,
    target_duration_min: darkloreConfig.targetDurationMin,
    forbidden_topics: darkloreConfig.forbiddenTopics,
    voice_id: darkloreConfig.voiceId,
    voice_model: darkloreConfig.voiceModel,
    yt_title_template: darkloreConfig.ytTitleTemplate,
    yt_description_template: darkloreConfig.ytDescriptionTemplate,
    yt_tags: darkloreConfig.ytTags,
    yt_category_id: darkloreConfig.ytCategoryId,
    yt_privacy: darkloreConfig.ytPrivacy,
    created_at: darkloreConfig.createdAt,
    updated_at: darkloreConfig.updatedAt,
  }

  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: USER_UUID, tier: 'free' }, error: null }),
          }),
        }),
      }
    }
    if (table === 'channel_configs') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: dbRow, error: null }),
            }),
          }),
        }),
      }
    }
    if (table === 'videos') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      }
    }
    return {}
  })
}

// ─── POST /api/pipeline ───────────────────────────────────────────────────────

describe('POST /api/pipeline', () => {
  beforeAll(() => {
    process.env.DRY_RUN = 'true'
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Auth ──────────────────────────────────────────────────────────────────

  describe('auth gating', () => {
    it('returns 401 when auth() returns no userId', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const res = await POST(makeRequest({ configId: VALID_CONFIG_UUID, topic: VALID_TOPIC }))

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 when auth() returns undefined userId', async () => {
      mockAuth.mockResolvedValue({ userId: undefined })

      const res = await POST(makeRequest({ configId: VALID_CONFIG_UUID, topic: VALID_TOPIC }))

      expect(res.status).toBe(401)
    })
  })

  // ── User lookup ───────────────────────────────────────────────────────────

  describe('user lookup', () => {
    it('returns 404 when user is not found in Supabase users table', async () => {
      mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })

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

      const res = await POST(makeRequest({ configId: VALID_CONFIG_UUID, topic: VALID_TOPIC }))

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe('User not found')
    })
  })

  // ── Input validation ──────────────────────────────────────────────────────

  describe('input validation', () => {
    beforeEach(() => {
      // Auth passes for validation tests — user lookup not reached for invalid body
      mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })
    })

    it('returns 400 when configId is missing', async () => {
      const res = await POST(makeRequest({ topic: VALID_TOPIC }))

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid request')
      expect(body.details).toBeDefined()
    })

    it('returns 400 when configId is not a UUID', async () => {
      const res = await POST(makeRequest({ configId: 'not-a-uuid', topic: VALID_TOPIC }))

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid request')
    })

    it('returns 400 when topic is missing', async () => {
      const res = await POST(makeRequest({ configId: VALID_CONFIG_UUID }))

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid request')
    })

    it('returns 400 when topic is an empty string', async () => {
      const res = await POST(makeRequest({ configId: VALID_CONFIG_UUID, topic: '' }))

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid request')
    })

    it('returns 400 when request body is not valid JSON', async () => {
      const req = new NextRequest('http://localhost/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'this is not json{{{',
      })

      const res = await POST(req)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid JSON')
    })
  })

  // ── Config lookup ─────────────────────────────────────────────────────────

  describe('config lookup', () => {
    it('returns 404 when config is not found for the user', async () => {
      mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: USER_UUID, tier: 'free' }, error: null }),
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
        if (table === 'videos') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
                }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })

      const res = await POST(makeRequest({ configId: VALID_CONFIG_UUID, topic: VALID_TOPIC }))

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe('Config not found')
    })

    it('returns 404 when config belongs to a different user', async () => {
      mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: USER_UUID, tier: 'free' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'channel_configs') {
          // eq('user_id', userUuid) scopes the query — Supabase returns nothing when it doesn't match
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'videos') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
                }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })

      const res = await POST(makeRequest({ configId: VALID_CONFIG_UUID, topic: VALID_TOPIC }))

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe('Config not found')
    })
  })

  // ── Happy path ────────────────────────────────────────────────────────────

  describe('happy path', () => {
    it('returns 200 with runId when all data is valid', async () => {
      mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })
      setupHappyPathMocks()

      const res = await POST(makeRequest({ configId: VALID_CONFIG_UUID, topic: VALID_TOPIC }))

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toBeDefined()
      expect(typeof body.data.runId).toBe('string')
      expect(body.data.runId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    })

    it('inserts a pipeline_runs row with userUuid (not clerk userId)', async () => {
      mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })

      let insertArg: Record<string, unknown> | null = null
      const mockInsertCapture = jest.fn().mockImplementation((arg: Record<string, unknown>) => {
        insertArg = arg
        return Promise.resolve({ error: null })
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: USER_UUID, tier: 'free' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'channel_configs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: VALID_CONFIG_UUID,
                      user_id: USER_UUID,
                      name: 'DarkLore',
                      niche: 'SE Asia folklore',
                      tone: 'atmospheric',
                      script_structure: 'hook-mystery-reveal-reflection-cta',
                      target_duration_min: 10,
                      forbidden_topics: [],
                      voice_id: 'ABCDEFGHIJabcdefgh01',
                      voice_model: 'eleven_multilingual_v2',
                      yt_title_template: '{topic} | DarkLore',
                      yt_description_template: 'Description',
                      yt_tags: ['folklore'],
                      yt_category_id: '22',
                      yt_privacy: 'private',
                      created_at: '2026-01-01T00:00:00.000Z',
                      updated_at: '2026-01-01T00:00:00.000Z',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'videos') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
                }),
              }),
            }),
            insert: mockInsertCapture,
          }
        }
        return {}
      })

      await POST(makeRequest({ configId: VALID_CONFIG_UUID, topic: VALID_TOPIC }))

      expect(insertArg).not.toBeNull()
      // user_id must be the internal UUID, not the Clerk string
      expect(insertArg!.user_id).toBe(USER_UUID)
      expect(insertArg!.user_id).not.toBe(CLERK_USER_ID)
      expect(insertArg!.config_id).toBe(VALID_CONFIG_UUID)
      expect(insertArg!.topic).toBe(VALID_TOPIC)
      expect(insertArg!.status).toBe('running')
    })

    it('fires runPipeline without awaiting it', async () => {
      mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })
      setupHappyPathMocks()

      const { runPipeline } = jest.requireMock('@/agents/orchestrator')

      await POST(makeRequest({ configId: VALID_CONFIG_UUID, topic: VALID_TOPIC }))

      expect(runPipeline).toHaveBeenCalledTimes(1)
    })
  })

  // ── Supabase insert failure ───────────────────────────────────────────────

  describe('pipeline_runs insert failure', () => {
    it('returns 500 when pipeline_runs insert fails', async () => {
      mockAuth.mockResolvedValue({ userId: CLERK_USER_ID })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: USER_UUID, tier: 'free' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'channel_configs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: VALID_CONFIG_UUID,
                      user_id: USER_UUID,
                      name: 'DarkLore',
                      niche: 'SE Asia folklore',
                      tone: 'atmospheric',
                      script_structure: 'hook-mystery-reveal-reflection-cta',
                      target_duration_min: 10,
                      forbidden_topics: [],
                      voice_id: 'ABCDEFGHIJabcdefgh01',
                      voice_model: 'eleven_multilingual_v2',
                      yt_title_template: '{topic} | DarkLore',
                      yt_description_template: 'Description',
                      yt_tags: ['folklore'],
                      yt_category_id: '22',
                      yt_privacy: 'private',
                      created_at: '2026-01-01T00:00:00.000Z',
                      updated_at: '2026-01-01T00:00:00.000Z',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'videos') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
                }),
              }),
            }),
            insert: jest.fn().mockResolvedValue({ error: { message: 'DB constraint violation' } }),
          }
        }
        return {}
      })

      const res = await POST(makeRequest({ configId: VALID_CONFIG_UUID, topic: VALID_TOPIC }))

      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toBe('Failed to create video')
    })
  })
})
