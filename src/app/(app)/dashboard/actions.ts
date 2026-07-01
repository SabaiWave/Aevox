'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { log } from '@/lib/logger'

export async function deleteVideo(videoId: string): Promise<{ error?: string }> {
  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase = getSupabaseServerClient()

  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', userId)
    .single()

  if (!userRow) return { error: 'User not found' }

  const { error } = await supabase
    .from('videos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', videoId)
    .eq('user_id', userRow.id)
    .is('deleted_at', null)

  if (error) {
    log.error('[deleteVideo] failed', { videoId, error: error.message })
    return { error: 'Failed to delete video' }
  }

  revalidatePath('/dashboard')
  return {}
}
