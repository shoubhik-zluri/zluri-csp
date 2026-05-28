import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedClient } from '@/lib/api-auth'

// GET — returns all custom field values for a task as { [fieldId]: value }
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const { data, error } = await supabase
    .from('custom_field_values')
    .select('field_id, value')
    .eq('task_id', taskId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const map = Object.fromEntries((data ?? []).map((r: { field_id: string; value: unknown }) => [r.field_id, r.value]))
  return NextResponse.json(map)
}

// POST — upsert a single field value { field_id, value }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const { field_id, value } = await request.json()
  if (!field_id) return NextResponse.json({ error: 'field_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('custom_field_values')
    .upsert({ task_id: taskId, field_id, value }, { onConflict: 'task_id,field_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
