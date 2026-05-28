import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedClient } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')
  const noteId = searchParams.get('noteId')

  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  let query = supabase
    .from('pending_tasks')
    .select('*, assignee:profiles!assignee_id(id, full_name, avatar_url), note:meeting_notes!note_id(title, meeting_date), account:accounts!account_id(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (accountId) query = query.eq('account_id', accountId)
  if (noteId) query = query.eq('note_id', noteId)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: 'Failed to fetch pending tasks' }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const schema = z.object({
    note_id: z.string().uuid(),
    account_id: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    task_type: z.enum(['action_item', 'risk', 'expansion']).optional(),
    confidence: z.enum(['high', 'medium', 'low']).optional(),
    justification: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    source_call_id: z.string().optional(),
    assignee_id: z.string().uuid().optional(),
  })

  const result = schema.safeParse(await request.json())
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 422 })

  const { data, error } = await supabase
    .from('pending_tasks')
    .insert({ ...result.data, status: 'pending' })
    .select('*, assignee:profiles!assignee_id(id, full_name, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create pending task' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
