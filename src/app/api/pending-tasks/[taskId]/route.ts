import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedClient } from '@/lib/api-auth'

const acceptSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  assignee_name_raw: z.string().optional().nullable(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  // Fetch the pending task
  const { data: pendingTask, error: fetchError } = await supabase
    .from('pending_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('status', 'pending')
    .single()

  if (fetchError || !pendingTask) {
    return NextResponse.json({ error: 'Pending task not found' }, { status: 404 })
  }

  // Parse optional overrides from body (may be empty)
  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    // empty body is fine
  }

  const parsed = acceptSchema.safeParse({
    title: body.title ?? pendingTask.title,
    description: body.description ?? pendingTask.description,
    due_date: body.due_date ?? pendingTask.due_date,
    assignee_name_raw: body.assignee_name_raw ?? pendingTask.assignee_name_raw,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const overrides = parsed.data

  // Idempotency: reject if this pending task was already accepted (reference_task_id set)
  if (pendingTask.reference_task_id) {
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', pendingTask.reference_task_id)
      .single()
    if (existingTask) {
      return NextResponse.json({ pendingTask, task: existingTask })
    }
  }

  // Create real task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      account_id: pendingTask.account_id,
      title: overrides.title,
      description: overrides.description ?? null,
      due_date: overrides.due_date ?? null,
      owner_id: pendingTask.assignee_id ?? null,
      status: 'open' as const,
      created_by: user.id,
      source_note_id: pendingTask.note_id ?? null,
      project_id: null,
    })
    .select('*, owner:profiles!owner_id(id, full_name, avatar_url)')
    .single()

  if (taskError) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }

  // Mark pending task as accepted
  const { error: updateError } = await supabase
    .from('pending_tasks')
    .update({ status: 'accepted', reference_task_id: task.id })
    .eq('id', taskId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update pending task status' }, { status: 500 })
  }

  return NextResponse.json({ pendingTask: { ...pendingTask, status: 'accepted' }, task })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const body = await request.json().catch(() => ({}))
  const reference_task_id = body.reference_task_id ?? null

  const { data, error } = await supabase
    .from('pending_tasks')
    .update({ status: 'accepted', reference_task_id })
    .eq('id', taskId)
    .eq('status', 'pending')
    .select('id')

  if (error) return NextResponse.json({ error: 'Failed to accept pending task' }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'Task not found or already resolved' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const { data, error } = await supabase
    .from('pending_tasks')
    .update({ status: 'rejected' })
    .eq('id', taskId)
    .eq('status', 'pending')
    .select('id')

  if (error) return NextResponse.json({ error: 'Failed to reject task' }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'Task not found or already resolved' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
