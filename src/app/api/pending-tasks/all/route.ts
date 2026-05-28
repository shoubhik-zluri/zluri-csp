import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedClient } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const { data, error } = await supabase
    .from('pending_tasks')
    .select('*, assignee:profiles!assignee_id(id, full_name, avatar_url), note:meeting_notes!note_id(title, meeting_date), account:accounts!account_id(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch pending tasks' }, { status: 500 })
  return NextResponse.json(data ?? [])
}
