import { auth, currentUser } from '@clerk/nextjs/server'

export { auth, currentUser }

export function isApiRoute(req: Request): boolean {
  const url = new URL(req.url)
  return url.pathname.startsWith('/api/')
}
