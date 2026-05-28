import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedClient } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const { data: plans, error: plansError } = await supabase
    .from('success_plans')
    .select(`
      *,
      owner:profiles!owner_id(id, full_name, avatar_url),
      tasks(*, owner:profiles!owner_id(id, full_name, avatar_url), project:projects!project_id(id, name))
    `)
    .eq('account_id', accountId)
    .order('created_at')

  if (plansError) return NextResponse.json({ error: plansError.message }, { status: 500 })

  const { data: unplanned, error: unplannedError } = await supabase
    .from('tasks')
    .select('*, owner:profiles!owner_id(id, full_name, avatar_url), project:projects!project_id(id, name)')
    .eq('account_id', accountId)
    .is('plan_id', null)
    .order('due_date', { nullsFirst: false })

  if (unplannedError) return NextResponse.json({ error: unplannedError.message }, { status: 500 })

  return NextResponse.json({ plans: plans ?? [], unplanned: unplanned ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const body = await request.json()

  const visibility = body.visibility ?? 'internal'
  if (visibility !== 'private' && !body.account_id) {
    return NextResponse.json({ error: 'account_id required for internal/external tasks' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...body, visibility, created_by: user.id, status: body.status ?? 'open' })
    .select('*, account:accounts!account_id(id, name), project:projects!project_id(id, name), owner:profiles!owner_id(id, full_name, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
