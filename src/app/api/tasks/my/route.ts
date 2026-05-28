import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedClient } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const threeDaysFromNow = new Date(today)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  const { data, error } = await supabase
    .from('tasks')
    .select('*, account:accounts!account_id(id, name)')
    .eq('owner_id', user.id)
    .in('status', ['pending_review', 'open', 'in_progress'])
    .lte('due_date', threeDaysFromNow.toISOString().split('T')[0])
    .order('due_date', { nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
