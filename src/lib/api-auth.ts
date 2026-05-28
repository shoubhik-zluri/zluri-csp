/**
 * Unified auth helper that accepts both:
 * - Cookie-based sessions (browser users)
 * - Bearer API keys (CSM Claude MCP integration)
 *
 * Usage in route handlers:
 *   const auth = await getAuthenticatedClient(request)
 *   if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *   const { supabase, user, profile } = auth
 */

import crypto from 'crypto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

type AuthResult = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any | null
}

export async function getAuthenticatedClient(request: NextRequest): Promise<AuthResult | null> {
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const rawKey = authHeader.slice(7).trim()
    const keyHash = sha256(rawKey)

    const serviceClient = createServiceRoleClient()

    // Look up the API key
    const { data: keyRow, error: keyError } = await serviceClient
      .from('api_keys')
      .select('user_id, id')
      .eq('key_hash', keyHash)
      .single()

    if (keyError || !keyRow) return null

    // Update last_used_at async (don't await — don't delay the request)
    serviceClient
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRow.id)
      .then(() => {})

    // Get the user record
    const { data: { user }, error: userError } = await serviceClient.auth.admin.getUserById(keyRow.user_id)
    if (userError || !user) return null

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return { supabase: serviceClient, user, profile }
  }

  // Cookie-based session (browser)
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { supabase, user, profile }
}

export function generateApiKey(): string {
  return 'zsk_' + crypto.randomBytes(32).toString('hex')
}

export function hashApiKey(key: string): string {
  return sha256(key)
}
