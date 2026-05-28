import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedClient } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const { data, error } = await supabase
    .from('tasks')
    .select('*, account:accounts!account_id(id, name), project:projects!project_id(id, name), owner:profiles!owner_id(id, full_name, avatar_url)')
    .or(`owner_id.eq.${user.id},created_by.eq.${user.id}`)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
