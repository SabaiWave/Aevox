import { auth } from '@/lib/auth'

export async function isAdmin(): Promise<boolean> {
  const { userId } = await auth()
  if (!userId) return false
  const adminIds = process.env.ADMIN_USER_IDS?.split(',').map(s => s.trim()).filter(Boolean) ?? []
  return adminIds.includes(userId)
}
