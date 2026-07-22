import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey)
}

function createSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the env file for your mode (.env.development, .env.staging, or .env.production).',
    )
  }

  return createClient<Database>(supabaseUrl, supabasePublishableKey)
}

let client: SupabaseClient<Database> | undefined

/** Lazy singleton — only constructs when first used with valid env vars. */
export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    client = createSupabaseClient()
  }
  return client
}
