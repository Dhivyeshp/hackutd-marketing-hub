import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'

export const hasSupabaseEnv = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key'
)

export const supabase = !bypassAuth && hasSupabaseEnv
  ? createClient(
      supabaseUrl,
      supabaseAnonKey
    )
  : null
