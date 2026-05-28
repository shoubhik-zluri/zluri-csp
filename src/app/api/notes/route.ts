import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedClient } from '@/lib/api-auth'
import { CreateNoteSchema } from '@/lib/schemas'
import { inngest } from '@/inngest/client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('accountId')
  const unassigned = searchParams.get('unassigned')

  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  let query = supabase
    .from('meeting_notes')
    .select('*, created_by_profile:profiles!created_by(id, full_name, avatar_url)')
    .order('meeting_date', { ascending: false })

  if (unassigned === 'true') {
    query = query.is('account_id', null)
  } else if (accountId) {
    query = query.eq('account_id', accountId)
  } else {
    return NextResponse.json({ error: 'accountId or unassigned=true required' }, { status: 400 })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const body = await request.json()
  const parsed = CreateNoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('meeting_notes')
    .insert({ ...parsed.data, created_by: user.id })
    .select('*, created_by_profile:profiles!created_by(id, full_name, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: 'Failed to create note' }, { status: 400 })

  // Fire extraction event only for assigned notes
  if (data.account_id) {
    await inngest.send({
      name: 'note/created',
      data: {
        noteId: data.id,
        accountId: data.account_id,
        title: data.title ?? '',
        content: data.content,
      },
    })
  }

  return NextResponse.json(data, { status: 201 })
}
