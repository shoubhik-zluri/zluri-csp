/**
 * GET  /api/auth/api-keys — list my API keys (hash hidden)
 * POST /api/auth/api-keys — generate a new key (raw key returned ONCE)
 * DELETE /api/auth/api-keys?id=<uuid> — revoke a key
 */
import { NextResponse, type NextRequest } from 'next/server'
import { generateApiKey, hashApiKey } from '@/lib/api-auth'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, last_used_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name: string = body?.name?.trim() || 'My Claude Key'

  const rawKey = generateApiKey()
  const keyHash = hashApiKey(rawKey)

  const { data, error } = await supabase
    .from('api_keys')
    .insert({ user_id: user.id, name, key_hash: keyHash })
    .select('id, name, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Return the raw key ONCE — not stored anywhere, cannot be recovered
  return NextResponse.json({ ...data, raw_key: rawKey }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
