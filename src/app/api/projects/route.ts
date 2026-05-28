import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedClient } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')

  let query = supabase
    .from('projects')
    .select('*, account:accounts!account_id(id, name), owner:profiles!owner_id(id, full_name, avatar_url)')
    .order('created_at', { ascending: false })

  if (accountId) {
    query = query.eq('account_id', accountId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const body = await request.json()

  const { data, error } = await supabase
    .from('projects')
    .insert({ ...body, created_by: user.id, owner_id: body.owner_id ?? user.id })
    .select('*, account:accounts!account_id(id, name), owner:profiles!owner_id(id, full_name, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
