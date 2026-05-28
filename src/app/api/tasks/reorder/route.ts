import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedClient } from '@/lib/api-auth'

export async function PATCH(request: NextRequest) {
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const { items } = await request.json() as { items: Array<{ id: string; sort_order: number }> }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items required' }, { status: 400 })
  }

  const updates = items.map(({ id, sort_order }) =>
    supabase.from('tasks').update({ sort_order }).eq('id', id)
  )
  await Promise.all(updates)

  return NextResponse.json({ ok: true })
}
