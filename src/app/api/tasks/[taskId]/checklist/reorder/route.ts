import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedClient } from '@/lib/api-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const { items } = await request.json() as { items: Array<{ id: string; position: number }> }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items required' }, { status: 400 })
  }

  const updates = items.map(({ id, position }) =>
    supabase.from('task_checklist_items').update({ position }).eq('id', id).eq('task_id', taskId)
  )
  await Promise.all(updates)

  return NextResponse.json({ ok: true })
}
