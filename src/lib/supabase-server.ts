import { createClient, SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let serverClient: SupabaseClient<any, any, any> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseServerClient(): SupabaseClient<any, any, any> {
  if (!serverClient) {
    serverClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'klipto' }, auth: { persistSession: false } }
    )
  }
  return serverClient
}
