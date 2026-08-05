import { fal } from '@fal-ai/client'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { dryRunVideoOutput } from '@/__fixtures__/video'
import type { AgentResult, ChannelConfig, VideoOutput } from '@/types'
import { log } from '@/lib/logger'

// ─── Style modifiers ──────────────────────────────────────────────────────────
// Supports future Phase 10 style presets keyed by config.niche or pipeline_mode

const style_modifiers: Record<string, string> = {
  darklore:
    'dark gothic cinematic illustration, atmospheric Southeast Asian mythology, dramatic lighting, detailed oil painting textures, mysterious shadows, intricate cultural details',
}

// ─── Beat splitting ───────────────────────────────────────────────────────────

function splitScriptIntoBeats(script: string, target = 12): string[] {
  const paragraphs = script
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  let beats: string[] = []

  if (paragraphs.length >= 10 && paragraphs.length <= 15) {
    beats = paragraphs
  } else if (paragraphs.length > 15) {
    // Too many paragraphs — group
    const chunkSize = Math.ceil(paragraphs.length / target)
    for (let i = 0; i < paragraphs.length; i += chunkSize) {
      beats.push(paragraphs.slice(i, i + chunkSize).join('\n\n'))
    }
    beats = beats.slice(0, 15)
  } else {
    // Too few paragraphs — try splitting by sentence
    const sentences = script
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0)

    if (sentences.length >= target) {
      const chunkSize = Math.ceil(sentences.length / target)
      for (let i = 0; i < sentences.length; i += chunkSize) {
        beats.push(sentences.slice(i, i + chunkSize).join(' '))
      }
      beats = beats.slice(0, 15)
    } else {
      // Not enough sentences either — use what we have
      beats = paragraphs.length > 0 ? paragraphs : [script.slice(0, 500)]
    }
  }

  // Enforce minimum of 10 beats by cycling through existing beats
  if (beats.length < 10 && beats.length > 0) {
    const base = [...beats]
    while (beats.length < 10) {
      beats.push(base[beats.length % base.length])
    }
  }

  return beats
}

// ─── Ken Burns effect via FFmpeg ──────────────────────────────────────────────

function applyKenBurns(
  imagePath: string,
  outputClipPath: string,
  index: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Even index: zoom in; odd index: zoom out
    const zoomFilter =
      index % 2 === 0
        ? `z='min(zoom+0.0015,1.5)'`
        : `z='if(lte(zoom,1.0),1.5,max(1.001,zoom-0.0015))'`

    // 6 seconds at 25fps = 150 frames; output 1920x1080
    const zoompanFilter = `zoompan=${zoomFilter}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=150:s=1920x1080:fps=25`

    ffmpeg(imagePath)
      .outputOptions([
        '-vf', zoompanFilter,
        '-t', '6',
        '-c:v', 'libx264',
        '-preset', 'ultrafast', // much faster encode; file size trade-off acceptable for pipeline
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
      ])
      .output(outputClipPath)
      .on('end', () => { resolve() })
      .on('error', (err) => { reject(err) })
      .run()
  })
}

// ─── VideoAgent ───────────────────────────────────────────────────────────────

export class VideoAgent {
  async run(
    script: string,
    config: ChannelConfig,
    audioUrl: string,
    runId: string,
    opts?: { dryRun?: boolean },
  ): Promise<AgentResult<VideoOutput>> {
    const start = Date.now()

    // DRY_RUN guard — must be inside run() per api.md conventions
    const isDryRun = opts?.dryRun || process.env.DRY_RUN === 'true'

    if (isDryRun) {
      await log.info('[VideoAgent] complete', { agent: 'VideoAgent', runId, configId: config.id, stage: 'video', durationMs: Date.now() - start, dryRun: true })
      return {
        status: 'success',
        data: dryRunVideoOutput,
        durationMs: Date.now() - start,
      }
    }

    if (!process.env.FAL_KEY) {
      await log.error('[VideoAgent] failed', { agent: 'VideoAgent', runId, configId: config.id, stage: 'video', durationMs: Date.now() - start, error: 'FAL_KEY env var not set' })
      return {
        status: 'failed',
        data: null,
        error: 'Video generation is not configured. Contact support.',
        durationMs: Date.now() - start,
      }
    }

    // Configure external clients inside run() — never at module level
    fal.config({ credentials: process.env.FAL_KEY ?? '' })
    ffmpeg.setFfmpegPath(ffmpegInstaller.path)

    const tmpDir = path.join(os.tmpdir(), runId)
    const imagesDir = path.join(tmpDir, 'images')
    const clipsDir = path.join(tmpDir, 'clips')
    const outputPath = path.join(tmpDir, 'output.mp4')
    const concatPath = path.join(tmpDir, 'concat.txt')
    const narrationPath = path.join(tmpDir, 'narration.mp3')

    const cleanup = () => {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
    }

    try {
      await log.info('[VideoAgent] start', { agent: 'VideoAgent', runId, configId: config.id, stage: 'video' })
      // Set up temp directories
      fs.mkdirSync(imagesDir, { recursive: true })
      fs.mkdirSync(clipsDir, { recursive: true })

      // ── Step 1: Split script into beats ──────────────────────────────────
      // VIDEO_BEAT_COUNT env var caps beats for cheap test runs (e.g. VIDEO_BEAT_COUNT=2 = 12s, ~$0.05)
      // Production: derive from target duration so clips match narration length (6s per beat)
      const MAX_IMAGES_PER_RUN = 30
      const derivedBeatCount = Math.min(Math.max(1, Math.round((config.targetDurationMin * 60) / 6)), MAX_IMAGES_PER_RUN)
      const beatTarget = process.env.VIDEO_BEAT_COUNT
        ? Math.max(1, Math.min(parseInt(process.env.VIDEO_BEAT_COUNT, 10) || derivedBeatCount, MAX_IMAGES_PER_RUN))
        : derivedBeatCount
      const allBeats = splitScriptIntoBeats(script, beatTarget)
      const beats = allBeats.slice(0, beatTarget)
      const imageCount = beats.length
      // ── Step 2: Resolve style suffix ──────────────────────────────────────
      const styleKey = config.niche?.toLowerCase().replace(/\s+/g, '') ?? ''
      const styleSuffix =
        style_modifiers[styleKey] ??
        style_modifiers['darklore']

      // ── Step 3: Generate images via FAL.ai FLUX.2 [dev] ──────────────────
      const imagePaths: string[] = []
      for (let i = 0; i < beats.length; i++) {
        const beat = beats[i]
        const prompt = `${beat}\n\n${styleSuffix}`

        let result: Awaited<ReturnType<typeof fal.subscribe>>
        try {
          result = await fal.subscribe('fal-ai/flux/dev', {
            input: {
              prompt,
              image_size: 'landscape_16_9',
              num_images: 1,
            },
          })
        } catch (falErr) {
          cleanup()
          const msg = falErr instanceof Error ? falErr.message : String(falErr)
          await log.error('[VideoAgent] failed', { agent: 'VideoAgent', runId, configId: config.id, stage: 'video', durationMs: Date.now() - start, error: `FAL.ai image generation failed (beat ${i}): ${msg}`.slice(0, 200) })
          return {
            status: 'failed',
            data: null,
            error: 'Image generation failed. Please try again.',
            durationMs: Date.now() - start,
          }
        }

        const imageUrl = (result.data as Record<string, unknown> & { images?: Array<{ url: string }> })
          .images?.[0]?.url as string

        if (!imageUrl) {
          cleanup()
          await log.error('[VideoAgent] failed', { agent: 'VideoAgent', runId, configId: config.id, stage: 'video', durationMs: Date.now() - start, error: `FAL.ai returned no image URL for beat ${i}` })
          return {
            status: 'failed',
            data: null,
            error: 'Image generation returned no result. Please try again.',
            durationMs: Date.now() - start,
          }
        }

        const imageResp = await fetch(imageUrl)
        if (!imageResp.ok) {
          cleanup()
          await log.error('[VideoAgent] failed', { agent: 'VideoAgent', runId, configId: config.id, stage: 'video', durationMs: Date.now() - start, error: `Failed to download FAL.ai image for beat ${i}: ${imageResp.status}` })
          return {
            status: 'failed',
            data: null,
            error: 'Failed to retrieve generated image. Please try again.',
            durationMs: Date.now() - start,
          }
        }
        const imageBuffer = Buffer.from(await imageResp.arrayBuffer())
        const imagePath = path.join(imagesDir, `beat_${i}.jpg`)
        fs.writeFileSync(imagePath, imageBuffer)
        imagePaths.push(imagePath)
      }

      // ── Step 4: Apply Ken Burns effect — parallel across all clips ─────────
      const clipEntries = await Promise.all(
        imagePaths.map(async (imgPath, i) => {
          const clipPath = path.join(clipsDir, `clip_${i}.mp4`)
          await applyKenBurns(imgPath, clipPath, i)
          return clipPath
        }),
      )
      const clipPaths = clipEntries

      // ── Step 5: Download narration MP3 locally ────────────────────────────
      const audioResp = await fetch(audioUrl)
      if (!audioResp.ok) {
        cleanup()
        await log.error('[VideoAgent] failed', { agent: 'VideoAgent', runId, configId: config.id, stage: 'video', durationMs: Date.now() - start, error: `Failed to download narration audio: ${audioResp.status}` })
        return {
          status: 'failed',
          data: null,
          error: 'Failed to retrieve audio for video composition. Please try again.',
          durationMs: Date.now() - start,
        }
      }
      const audioBuffer = Buffer.from(await audioResp.arrayBuffer())
      fs.writeFileSync(narrationPath, audioBuffer)

      // ── Step 6: Write concat list and merge clips + narration ─────────────
      const concatLines = clipPaths.map((p) => `file '${p}'`).join('\n')
      fs.writeFileSync(concatPath, concatLines)

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(concatPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .input(narrationPath)
          .outputOptions([
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-shortest',
          ])
          .output(outputPath)
          .on('end', () => { resolve() })
          .on('error', (err) => { reject(err) })
          .run()
      })

      // ── Step 7: Upload MP4 to Supabase Storage ─────────────────────────────
      const supabase = getSupabaseServerClient()
      const fileBuffer = fs.readFileSync(outputPath)

      const videoStoragePath = `videos/${runId}/output.mp4`
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(videoStoragePath, fileBuffer, {
          contentType: 'video/mp4',
          upsert: true,
        })

      if (uploadError) {
        cleanup()
        await log.error('[VideoAgent] failed', { agent: 'VideoAgent', runId, configId: config.id, stage: 'video', durationMs: Date.now() - start, error: `Supabase storage upload failed: ${uploadError.message}` })
        return {
          status: 'failed',
          data: null,
          error: 'Failed to save video file. Please try again.',
          durationMs: Date.now() - start,
        }
      }

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(videoStoragePath)

      // ── Step 8: Estimate duration and clean up temp files ─────────────────
      // 6 seconds per image clip (matches Ken Burns d=150 at 25fps)
      const durationSeconds = imageCount * 6

      try {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      } catch {
        // Non-fatal — cleanup failure should not fail the pipeline
      }

      await log.info('[VideoAgent] complete', { agent: 'VideoAgent', runId, configId: config.id, stage: 'video', durationMs: Date.now() - start })
      return {
        status: 'success',
        data: {
          videoUrl: urlData.publicUrl,
          durationSeconds,
          imageCount,
        },
        durationMs: Date.now() - start,
      }
    } catch (err) {
      cleanup()
      const message = err instanceof Error ? err.message : String(err)
      await log.error('[VideoAgent] failed', { agent: 'VideoAgent', runId, configId: config.id, stage: 'video', durationMs: Date.now() - start, error: message })
      return {
        status: 'failed',
        data: null,
        error: 'Video generation failed unexpectedly. Please try again.',
        durationMs: Date.now() - start,
      }
    }
  }
}
