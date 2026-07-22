import { dryRunVideoOutput } from '@/__fixtures__/video'
import { darkloreConfig } from '@/__fixtures__/configs/darklore'

// ─── Global fetch mock (module-level per testing rules) ───────────────────────

const mockFetch = jest.fn()
global.fetch = mockFetch

// ─── FAL.ai mock ──────────────────────────────────────────────────────────────
// TDZ rule: wrap mock var in a lazy function, not a direct reference.

const mockFalSubscribe = jest.fn()

jest.mock('@fal-ai/client', () => ({
  fal: {
    config: jest.fn(),
    subscribe: (...args: unknown[]) => mockFalSubscribe(...args),
  },
}))

// ─── FFmpeg mock ──────────────────────────────────────────────────────────────
// fluent-ffmpeg default export is a callable factory with .setFfmpegPath().
// Build a fresh chainable builder per call so sequential applyKenBurns
// invocations each get an independent Promise resolver.
// All factory logic lives inside the jest.mock() callback to avoid TDZ issues.

jest.mock('fluent-ffmpeg', () => {
  function makeFfmpegBuilder() {
    const builder: Record<string, unknown> = {}
    builder.outputOptions = jest.fn(() => builder)
    builder.output = jest.fn(() => builder)
    builder.inputOptions = jest.fn(() => builder)
    builder.input = jest.fn(() => builder)
    builder.on = jest.fn((event: string, cb: () => void) => {
      if (event === 'end') {
        // Schedule resolution in the next microtask (after .run() is called)
        Promise.resolve().then(cb)
      }
      return builder
    })
    builder.run = jest.fn()
    return builder
  }

  function factory() {
    return makeFfmpegBuilder()
  }
  factory.setFfmpegPath = jest.fn()

  return { __esModule: true, default: factory }
})

jest.mock('@ffmpeg-installer/ffmpeg', () => ({
  __esModule: true,
  default: { path: '/mock/ffmpeg' },
}))

// ─── fs mock ──────────────────────────────────────────────────────────────────

const mockMkdirSync = jest.fn()
const mockWriteFileSync = jest.fn()
const mockReadFileSync = jest.fn().mockReturnValue(Buffer.from('fake-mp4'))
const mockRmSync = jest.fn()

jest.mock('fs', () => ({
  __esModule: true,
  default: {
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
    writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
    rmSync: (...args: unknown[]) => mockRmSync(...args),
  },
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  rmSync: (...args: unknown[]) => mockRmSync(...args),
}))

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockUpload = jest.fn()
const mockGetPublicUrl = jest.fn()

jest.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(...args),
      })),
    },
  })),
}))

// ─── Import agent after all mocks are set up ─────────────────────────────────

import { VideoAgent } from '@/agents/video'

// ─── Constants ────────────────────────────────────────────────────────────────

// Three distinct paragraphs to produce 3 beats (< 10, so agent cycles to 10)
const SCRIPT =
  'The pontianak haunts the forests of Malay mythology.\n\n' +
  'She appears as a beautiful woman luring men to their doom.\n\n' +
  'Her cry signals death to those who hear it echo through the night.'

const AUDIO_URL = 'https://storage.example.com/audio/run-001/narration.mp3'
const RUN_ID = 'test-run-video-001'

// ─── Mock reset helpers ───────────────────────────────────────────────────────

function setupStorageMocks() {
  mockUpload.mockResolvedValue({ data: {}, error: null })
  mockGetPublicUrl.mockReturnValue({
    data: { publicUrl: 'https://storage.example.com/videos/output.mp4' },
  })
}

function setupFalSuccess() {
  mockFalSubscribe.mockResolvedValue({
    data: { images: [{ url: 'https://fal.ai/image.jpg' }] },
  })
}

function setupFetchSuccess() {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    arrayBuffer: async () => new ArrayBuffer(512),
  })
}

// ─── VideoAgent ───────────────────────────────────────────────────────────────

describe('VideoAgent', () => {
  // ── DRY_RUN=true ────────────────────────────────────────────────────────────

  describe('DRY_RUN=true', () => {
    beforeAll(() => {
      process.env.DRY_RUN = 'true'
    })

    afterAll(() => {
      delete process.env.DRY_RUN
    })

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('returns status success with dryRunVideoOutput fixture', async () => {
      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(result.status).toBe('success')
      expect(result.data).toEqual(dryRunVideoOutput)
    })

    it('returns AgentResult shape with durationMs', async () => {
      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(typeof result.status).toBe('string')
      expect(typeof result.durationMs).toBe('number')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('makes no FAL.ai calls', async () => {
      const agent = new VideoAgent()
      await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(mockFalSubscribe).not.toHaveBeenCalled()
    })

    it('makes no fetch calls', async () => {
      const agent = new VideoAgent()
      await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('makes no Supabase storage calls', async () => {
      const agent = new VideoAgent()
      await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('respects opts.dryRun=true even when DRY_RUN env is false', async () => {
      const prev = process.env.DRY_RUN
      process.env.DRY_RUN = 'false'
      try {
        const agent = new VideoAgent()
        const result = await agent.run(
          SCRIPT,
          darkloreConfig,
          AUDIO_URL,
          RUN_ID,
          { dryRun: true },
        )
        expect(result.status).toBe('success')
        expect(result.data).toEqual(dryRunVideoOutput)
        expect(mockFalSubscribe).not.toHaveBeenCalled()
      } finally {
        process.env.DRY_RUN = prev
      }
    })
  })

  // ── Missing FAL_KEY guard ────────────────────────────────────────────────────

  describe('FAL_KEY guard', () => {
    beforeEach(() => {
      process.env.DRY_RUN = 'false'
      delete process.env.FAL_KEY
      jest.clearAllMocks()
    })

    afterEach(() => {
      delete process.env.DRY_RUN
      delete process.env.FAL_KEY
    })

    it('returns status failed when FAL_KEY is not set', async () => {
      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
      expect(result.error).toContain('FAL_KEY')
    })
  })

  // ── Live path — happy path ──────────────────────────────────────────────────

  describe('live path — happy path', () => {
    beforeEach(() => {
      process.env.DRY_RUN = 'false'
      process.env.FAL_KEY = 'test-fal-key'
      jest.clearAllMocks()
      // Re-assign after clearAllMocks (implementations are wiped)
      mockReadFileSync.mockReturnValue(Buffer.from('fake-mp4'))
      setupFalSuccess()
      setupFetchSuccess()
      setupStorageMocks()
    })

    afterEach(() => {
      delete process.env.DRY_RUN
      delete process.env.FAL_KEY
    })

    it('returns status success with videoUrl', async () => {
      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(result.status).toBe('success')
      expect(result.data).not.toBeNull()
      expect(typeof result.data!.videoUrl).toBe('string')
      expect(result.data!.videoUrl.length).toBeGreaterThan(0)
    })

    it('returns correct VideoOutput shape', async () => {
      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(result.data).toMatchObject({
        videoUrl: expect.any(String),
        durationSeconds: expect.any(Number),
        imageCount: expect.any(Number),
      })
    })

    it('returns imageCount with durationSeconds = imageCount * 6', async () => {
      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(result.data!.imageCount).toBeGreaterThan(0)
      expect(result.data!.durationSeconds).toBe(result.data!.imageCount * 6)
    })

    it('calls FAL.ai subscribe for each beat', async () => {
      const agent = new VideoAgent()
      await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(mockFalSubscribe).toHaveBeenCalled()
      expect(mockFalSubscribe.mock.calls.length).toBeGreaterThan(0)
    })

    it('calls FAL.ai with correct model and landscape image size', async () => {
      const agent = new VideoAgent()
      await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      const firstCall = mockFalSubscribe.mock.calls[0]
      expect(firstCall[0]).toBe('fal-ai/flux/dev')
      expect(firstCall[1].input.image_size).toBe('landscape_16_9')
      expect(firstCall[1].input.num_images).toBe(1)
    })

    it('uploads MP4 to Supabase storage with correct path', async () => {
      const agent = new VideoAgent()
      await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(mockUpload).toHaveBeenCalledWith(
        `videos/${RUN_ID}/output.mp4`,
        expect.any(Buffer),
        expect.objectContaining({ contentType: 'video/mp4' }),
      )
    })

    it('returns the Supabase public URL as videoUrl', async () => {
      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(result.data!.videoUrl).toBe(
        'https://storage.example.com/videos/output.mp4',
      )
    })

    it('sets durationMs on result', async () => {
      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(typeof result.durationMs).toBe('number')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })
  })

  // ── FAL.ai returns no image URL ─────────────────────────────────────────────

  describe('FAL.ai returns no image URL', () => {
    beforeEach(() => {
      process.env.DRY_RUN = 'false'
      process.env.FAL_KEY = 'test-fal-key'
      jest.clearAllMocks()
      mockReadFileSync.mockReturnValue(Buffer.from('fake-mp4'))
      setupStorageMocks()
    })

    afterEach(() => {
      delete process.env.DRY_RUN
      delete process.env.FAL_KEY
    })

    it('returns status failed when images array is empty', async () => {
      mockFalSubscribe.mockResolvedValue({ data: { images: [] } })

      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
      expect(typeof result.error).toBe('string')
    })

    it('returns status failed when images field is missing', async () => {
      mockFalSubscribe.mockResolvedValue({ data: {} })

      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
    })

    it('returns status failed when image url is undefined', async () => {
      mockFalSubscribe.mockResolvedValue({
        data: { images: [{ url: undefined }] },
      })

      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
    })

    it('error message mentions beat index', async () => {
      mockFalSubscribe.mockResolvedValue({ data: { images: [] } })

      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(result.error).toContain('beat')
    })
  })

  // ── FAL.ai subscribe throws ──────────────────────────────────────────────────

  describe('FAL.ai subscribe throws', () => {
    beforeEach(() => {
      process.env.DRY_RUN = 'false'
      process.env.FAL_KEY = 'test-fal-key'
      jest.clearAllMocks()
      mockReadFileSync.mockReturnValue(Buffer.from('fake-mp4'))
      setupStorageMocks()
    })

    afterEach(() => {
      delete process.env.DRY_RUN
      delete process.env.FAL_KEY
    })

    it('returns status failed, does not throw', async () => {
      mockFalSubscribe.mockRejectedValue(new Error('FAL.ai network timeout'))

      const agent = new VideoAgent()

      await expect(
        agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID),
      ).resolves.toMatchObject({
        status: 'failed',
        data: null,
      })
    })

    it('captures error message from thrown exception', async () => {
      mockFalSubscribe.mockRejectedValue(new Error('Connection refused'))

      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(result.status).toBe('failed')
      expect(typeof result.error).toBe('string')
      expect(result.error!.length).toBeGreaterThan(0)
    })

    it('caps error message at 200 chars', async () => {
      mockFalSubscribe.mockRejectedValue(
        new Error('x'.repeat(300) + ' FAL.ai very long error message'),
      )

      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(result.error!.length).toBeLessThanOrEqual(200)
    })
  })

  // ── Image download fails ─────────────────────────────────────────────────────

  describe('image download fails', () => {
    beforeEach(() => {
      process.env.DRY_RUN = 'false'
      process.env.FAL_KEY = 'test-fal-key'
      jest.clearAllMocks()
      mockReadFileSync.mockReturnValue(Buffer.from('fake-mp4'))
      setupFalSuccess()
      setupStorageMocks()
    })

    afterEach(() => {
      delete process.env.DRY_RUN
      delete process.env.FAL_KEY
    })

    it('returns status failed when image fetch returns non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
      })

      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
    })
  })

  // ── Supabase upload fails ────────────────────────────────────────────────────

  describe('Supabase upload fails', () => {
    beforeEach(() => {
      process.env.DRY_RUN = 'false'
      process.env.FAL_KEY = 'test-fal-key'
      jest.clearAllMocks()
      mockReadFileSync.mockReturnValue(Buffer.from('fake-mp4'))
      setupFalSuccess()
      setupFetchSuccess()
    })

    afterEach(() => {
      delete process.env.DRY_RUN
      delete process.env.FAL_KEY
    })

    it('returns status failed when Supabase upload returns error', async () => {
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: 'Bucket not found' },
      })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: '' } })

      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(result.status).toBe('failed')
      expect(result.data).toBeNull()
      expect(result.error).toContain('Supabase storage upload failed')
    })

    it('includes Supabase error message in result error', async () => {
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: 'Exceeded storage limit' },
      })
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: '' } })

      const agent = new VideoAgent()
      const result = await agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID)

      expect(result.error).toContain('Exceeded storage limit')
    })

    it('does not throw — resolves with AgentResult on unexpected error', async () => {
      mockUpload.mockRejectedValue(new Error('Supabase connection lost'))
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: '' } })

      const agent = new VideoAgent()

      await expect(
        agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID),
      ).resolves.toMatchObject({
        status: 'failed',
        data: null,
      })
    })
  })

  // ── Never-throws guarantee ───────────────────────────────────────────────────

  describe('never throws on unexpected error', () => {
    beforeEach(() => {
      process.env.DRY_RUN = 'false'
      process.env.FAL_KEY = 'test-fal-key'
      jest.clearAllMocks()
    })

    afterEach(() => {
      delete process.env.DRY_RUN
      delete process.env.FAL_KEY
    })

    it('resolves with status failed when mkdirSync throws', async () => {
      mockMkdirSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })

      const agent = new VideoAgent()

      await expect(
        agent.run(SCRIPT, darkloreConfig, AUDIO_URL, RUN_ID),
      ).resolves.toMatchObject({
        status: 'failed',
        data: null,
      })
    })
  })
})
