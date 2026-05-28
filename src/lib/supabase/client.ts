import { createBrowserClient } from '@supabase/ssr'

// Database generic is omitted here until `npx supabase gen types` is run after
// connecting a real Supabase project. Replace with:
// import type { Database } from '@/types/database'
// createBrowserClient<Database>(...)
export function createClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createBrowserClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
