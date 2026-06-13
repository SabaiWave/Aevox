import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient<any, any, any> | null = null

export function getSupabaseClient(): SupabaseClient<any, any, any> {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: 'klipto' }, auth: { persistSession: false } }
    )
  }
  return client
}
