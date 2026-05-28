/**
 * POST /api/auth/exchange
 * Validates an API key and returns the associated user_id.
 * Used by the zluri-mcp server on startup to verify its key is valid.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { hashApiKey } from '@/lib/api-auth'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const apiKey: string | undefined = body?.api_key

  if (!apiKey || typeof apiKey !== 'string') {
    return NextResponse.json({ error: 'api_key required' }, { status: 400 })
  }

  const keyHash = hashApiKey(apiKey)
  const serviceClient = createServiceRoleClient()

  const { data: keyRow, error } = await serviceClient
    .from('api_keys')
    .select('user_id, name, created_at')
    .eq('key_hash', keyHash)
    .single()

  if (error || !keyRow) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', keyRow.user_id)
    .single()

  return NextResponse.json({
    valid: true,
    user_id: keyRow.user_id,
    key_name: keyRow.name,
    user: profile,
  })
}
