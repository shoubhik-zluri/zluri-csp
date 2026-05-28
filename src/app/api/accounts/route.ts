import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedClient } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    const { mockAccounts } = await import('@/lib/mock-data')
    return NextResponse.json(mockAccounts)
  }

  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user, profile } = auth

  let query = supabase
    .from('accounts')
    .select('*, csm:profiles!csm_id(id, full_name, avatar_url, email)')
    .order('name')

  if (profile?.role !== 'admin') {
    query = query.eq('csm_id', user.id)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    const body = await request.json()
    return NextResponse.json({ id: `acc-${Date.now()}`, ...body }, { status: 201 })
  }

  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const body = await request.json()
  const { data, error } = await supabase
    .from('accounts')
    .insert(body)
    .select('*, csm:profiles!csm_id(id, full_name, avatar_url, email)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
