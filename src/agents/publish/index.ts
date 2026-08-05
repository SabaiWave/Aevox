import type { AgentResult, ChannelConfig, PublishOutput } from '@/types'
import { dryRunPublishOutput } from '@/__fixtures__/publish'
import { log } from '@/lib/logger'

function sanitizeTopic(topic: string): string {
  return topic
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control chars except \n \t
    .slice(0, 200)
}

async function uploadToYouTube(
  mediaUrl: string,
  topic: string,
  config: ChannelConfig,
  accessToken: string,
  safeTags: string[]
): Promise<PublishOutput> {
  // 1. Fetch the media file from Supabase storage URL
  const audioRes = await fetch(mediaUrl)
  if (!audioRes.ok) throw new Error(`Failed to fetch audio: ${audioRes.status}`)
  const audioBlob = await audioRes.arrayBuffer()

  // 2. Build video metadata
  // Handle both {topic} and {{topic}} template styles
  const sanitizedTopic = sanitizeTopic(topic)
  const sanitizedChannel = config.name.replace(/[\x00-\x1F]/g, '')
  const title = config.ytTitleTemplate
    .replace(/\{\{topic\}\}|\{topic\}/g, sanitizedTopic)
    .replace(/\{\{channel\}\}|\{channel\}/g, sanitizedChannel)
    .slice(0, 100)

  const description = config.ytDescriptionTemplate
    .replace(/\{\{topic\}\}|\{topic\}/g, sanitizedTopic)
    .replace(/\{\{channel\}\}|\{channel\}/g, sanitizedChannel)
    .slice(0, 5000)

  const metadata = {
    snippet: {
      title,
      description,
      tags: safeTags,
      categoryId: config.ytCategoryId,
    },
    status: {
      privacyStatus: config.ytPrivacy,
    },
  }

  // 3. Build multipart body
  const boundary = `boundary_${Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('')}`
  const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`
  const audioPart = `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`
  const closing = `\r\n--${boundary}--`

  const encoder = new TextEncoder()
  const metadataBytes = encoder.encode(metadataPart)
  const audioPartHeaderBytes = encoder.encode(audioPart)
  const closingBytes = encoder.encode(closing)

  const totalLength =
    metadataBytes.length + audioPartHeaderBytes.length + audioBlob.byteLength + closingBytes.length
  const body = new Uint8Array(totalLength)
  let offset = 0
  body.set(metadataBytes, offset)
  offset += metadataBytes.length
  body.set(audioPartHeaderBytes, offset)
  offset += audioPartHeaderBytes.length
  body.set(new Uint8Array(audioBlob), offset)
  offset += audioBlob.byteLength
  body.set(closingBytes, offset)

  // 4. POST to YouTube
  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    }
  )

  if (!uploadRes.ok) {
    await uploadRes.text()
    if (uploadRes.status === 401) throw new Error('YouTube authorization expired. Reconnect your YouTube account and try again.')
    if (uploadRes.status === 403) throw new Error('YouTube permission denied. Ensure your account has upload access.')
    throw new Error('YouTube upload failed. Check your YouTube connection and try again.')
  }

  const result = (await uploadRes.json()) as { id: string; snippet?: { title?: string } }
  if (!result.id) throw new Error('YouTube response missing video ID')

  return {
    videoId: result.id,
    videoUrl: `https://www.youtube.com/watch?v=${result.id}`,
    title: result.snippet?.title ?? title,
  }
}

export class PublishAgent {
  async run(
    mediaUrl: string,
    topic: string,
    config: ChannelConfig,
    oauthToken: string,
    opts?: { dryRun?: boolean },
  ): Promise<AgentResult<PublishOutput>> {
    const start = Date.now()
    const isDryRun = opts?.dryRun || process.env.DRY_RUN === 'true'

    await log.info('[PublishAgent] start', { agent: 'PublishAgent', configId: config.id, stage: 'publish' })

    try {
      if (isDryRun) {
        await log.info('[PublishAgent] complete', { agent: 'PublishAgent', configId: config.id, stage: 'publish', durationMs: Date.now() - start, dryRun: true })
        return {
          status: 'success',
          data: dryRunPublishOutput,
          durationMs: Date.now() - start,
        }
      }

      // Strip control chars first, then validate the actual string used in the header
      const safeToken = oauthToken.replace(/[\x00-\x1F]/g, '')
      if (!safeToken || safeToken.trim().length < 10) {
        await log.error('[PublishAgent] failed', { agent: 'PublishAgent', configId: config.id, stage: 'publish', durationMs: Date.now() - start, error: 'Invalid OAuth token' })
        return {
          status: 'failed',
          data: null,
          error: 'Invalid OAuth token',
          durationMs: Date.now() - start,
        }
      }

      // Sanitize ytTags before use
      const safeTags = config.ytTags
        .map(t => t.replace(/[\x00-\x1F<>]/g, '').slice(0, 30))
        .slice(0, 15)

      const data = await uploadToYouTube(mediaUrl, topic, config, safeToken, safeTags)

      await log.info('[PublishAgent] complete', { agent: 'PublishAgent', configId: config.id, stage: 'publish', durationMs: Date.now() - start })
      return {
        status: 'success',
        data,
        durationMs: Date.now() - start,
      }
    } catch (err) {
      await log.error('[PublishAgent] failed', { agent: 'PublishAgent', configId: config.id, stage: 'publish', durationMs: Date.now() - start, error: err instanceof Error ? err.message : String(err) })
      return {
        status: 'failed',
        data: null,
        error: err instanceof Error ? err.message.slice(0, 120) : 'Upload failed',
        durationMs: Date.now() - start,
      }
    }
  }
}
