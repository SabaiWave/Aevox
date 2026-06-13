import { createClient, SupabaseClient } from '@supabase/supabase-js'

let serverClient: SupabaseClient<any, any, any> | null = null

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
