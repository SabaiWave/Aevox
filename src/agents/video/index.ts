import { fal } from '@fal-ai/client'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { dryRunVideoOutput } from '@/__fixtures__/video'
import type { AgentResult, ChannelConfig, VideoOutput } from '@/types'

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
      .on('start', (cmd) => console.log(`[VideoAgent] FFmpeg clip ${index} start: ${cmd.slice(0, 120)}`))
      .on('end', () => { console.log(`[VideoAgent] FFmpeg clip ${index} done`); resolve() })
      .on('error', (err) => { console.error(`[VideoAgent] FFmpeg clip ${index} error:`, err.message); reject(err) })
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
      return {
        status: 'success',
        data: dryRunVideoOutput,
        durationMs: Date.now() - start,
      }
    }

    if (!process.env.FAL_KEY) {
      return {
        status: 'failed',
        data: null,
        error: 'FAL_KEY env var not set',
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
      // Set up temp directories
      fs.mkdirSync(imagesDir, { recursive: true })
      fs.mkdirSync(clipsDir, { recursive: true })

      // ── Step 1: Split script into beats ──────────────────────────────────
      // VIDEO_BEAT_COUNT env var caps beats for cheap test runs (e.g. VIDEO_BEAT_COUNT=2 = 12s, ~$0.05)
      // Production: derive from target duration so clips match narration length (6s per beat)
      const derivedBeatCount = Math.max(1, Math.round((config.targetDurationMin * 60) / 6))
      const beatTarget = process.env.VIDEO_BEAT_COUNT
        ? Math.max(1, parseInt(process.env.VIDEO_BEAT_COUNT, 10) || derivedBeatCount)
        : derivedBeatCount
      const allBeats = splitScriptIntoBeats(script, beatTarget)
      const beats = allBeats.slice(0, beatTarget)
      const imageCount = beats.length
      console.log(`[VideoAgent] ${imageCount} beats (target=${beatTarget}), tmpDir=${tmpDir}`)

      // ── Step 2: Resolve style suffix ──────────────────────────────────────
      const styleKey = config.niche?.toLowerCase().replace(/\s+/g, '') ?? ''
      const styleSuffix =
        style_modifiers[styleKey] ??
        style_modifiers['darklore']

      // ── Step 3: Generate images via FAL.ai FLUX.2 [dev] ──────────────────
      console.log(`[VideoAgent] Step 3: generating ${beats.length} images via FAL.ai`)
      const imagePaths: string[] = []
      for (let i = 0; i < beats.length; i++) {
        const beat = beats[i]
        const prompt = `${beat}\n\n${styleSuffix}`

        console.log(`[VideoAgent] FAL image ${i + 1}/${beats.length} — submitting`)
        let result: Awaited<ReturnType<typeof fal.subscribe>>
        try {
          result = await fal.subscribe('fal-ai/flux/dev', {
            input: {
              prompt,
              image_size: 'landscape_16_9',
              num_images: 1,
            },
          })
          console.log(`[VideoAgent] FAL image ${i + 1}/${beats.length} — received`)
        } catch (falErr) {
          cleanup()
          const msg = falErr instanceof Error ? falErr.message : String(falErr)
          console.error(`[VideoAgent] FAL image ${i + 1} failed:`, msg)
          return {
            status: 'failed',
            data: null,
            error: `FAL.ai image generation failed (beat ${i}): ${msg}`.slice(0, 200),
            durationMs: Date.now() - start,
          }
        }

        const imageUrl = (result.data as Record<string, unknown> & { images?: Array<{ url: string }> })
          .images?.[0]?.url as string

        if (!imageUrl) {
          console.error(`[VideoAgent] FAL image ${i + 1} — no URL in response:`, JSON.stringify(result.data).slice(0, 200))
          cleanup()
          return {
            status: 'failed',
            data: null,
            error: `FAL.ai returned no image URL for beat ${i}`,
            durationMs: Date.now() - start,
          }
        }

        const imageResp = await fetch(imageUrl)
        if (!imageResp.ok) {
          console.error(`[VideoAgent] download image ${i + 1} failed: HTTP ${imageResp.status}`)
          cleanup()
          return {
            status: 'failed',
            data: null,
            error: `Failed to download FAL.ai image for beat ${i}: ${imageResp.status}`.slice(0, 120),
            durationMs: Date.now() - start,
          }
        }
        const imageBuffer = Buffer.from(await imageResp.arrayBuffer())
        const imagePath = path.join(imagesDir, `beat_${i}.jpg`)
        fs.writeFileSync(imagePath, imageBuffer)
        imagePaths.push(imagePath)
        console.log(`[VideoAgent] image ${i + 1} saved (${imageBuffer.length} bytes)`)
      }

      // ── Step 4: Apply Ken Burns effect — parallel across all clips ─────────
      console.log(`[VideoAgent] Step 4: Ken Burns FFmpeg on ${imagePaths.length} clips (parallel)`)
      const clipEntries = await Promise.all(
        imagePaths.map(async (imgPath, i) => {
          const clipPath = path.join(clipsDir, `clip_${i}.mp4`)
          await applyKenBurns(imgPath, clipPath, i)
          return clipPath
        }),
      )
      const clipPaths = clipEntries

      // ── Step 5: Download narration MP3 locally ────────────────────────────
      console.log(`[VideoAgent] Step 5: downloading narration audio`)
      const audioResp = await fetch(audioUrl)
      if (!audioResp.ok) {
        console.error(`[VideoAgent] narration download failed: HTTP ${audioResp.status}`)
        cleanup()
        return {
          status: 'failed',
          data: null,
          error: `Failed to download narration audio: ${audioResp.status}`.slice(0, 120),
          durationMs: Date.now() - start,
        }
      }
      const audioBuffer = Buffer.from(await audioResp.arrayBuffer())
      fs.writeFileSync(narrationPath, audioBuffer)
      console.log(`[VideoAgent] narration saved (${audioBuffer.length} bytes)`)

      // ── Step 6: Write concat list and merge clips + narration ─────────────
      console.log(`[VideoAgent] Step 6: FFmpeg merge ${clipPaths.length} clips + audio`)
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
          .on('start', (cmd) => console.log(`[VideoAgent] FFmpeg merge start: ${cmd.slice(0, 120)}`))
          .on('end', () => { console.log('[VideoAgent] FFmpeg merge done'); resolve() })
          .on('error', (err) => { console.error('[VideoAgent] FFmpeg merge error:', err.message); reject(err) })
          .run()
      })

      // ── Step 7: Upload MP4 to Supabase Storage ─────────────────────────────
      console.log(`[VideoAgent] Step 7: uploading to Supabase Storage`)
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
        console.error('[VideoAgent] Supabase upload failed:', uploadError.message)
        cleanup()
        return {
          status: 'failed',
          data: null,
          error: `Supabase storage upload failed: ${uploadError.message}`.slice(0, 120),
          durationMs: Date.now() - start,
        }
      }
      console.log('[VideoAgent] Supabase upload done')

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
      console.error('[VideoAgent] Uncaught error:', message)
      return {
        status: 'failed',
        data: null,
        error: `VideoAgent failed: ${message}`.slice(0, 300),
        durationMs: Date.now() - start,
      }
    }
  }
}
