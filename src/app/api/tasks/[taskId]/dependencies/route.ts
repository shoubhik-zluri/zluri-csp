import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedClient } from '@/lib/api-auth'

const TASK_SELECT = 'id, title, status, due_date, priority, visibility, task_number'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const [{ data: blockedBy }, { data: blocking }] = await Promise.all([
    supabase
      .from('task_dependencies')
      .select(`id, depends_on:tasks!depends_on_id(${TASK_SELECT})`)
      .eq('task_id', taskId),
    supabase
      .from('task_dependencies')
      .select(`id, task:tasks!task_id(${TASK_SELECT})`)
      .eq('depends_on_id', taskId),
  ])

  return NextResponse.json({
    blocked_by: (blockedBy ?? []).map((r: Record<string, unknown>) => ({ dep_id: r.id, ...(r.depends_on as object) })),
    blocking:   (blocking  ?? []).map((r: Record<string, unknown>) => ({ dep_id: r.id, ...(r.task as object) })),
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const body = await request.json().catch(() => ({}))
  const depends_on_id: string | undefined = body.depends_on_id
  if (!depends_on_id) return NextResponse.json({ error: 'depends_on_id required' }, { status: 400 })

  const { error } = await supabase
    .from('task_dependencies')
    .insert({ task_id: taskId, depends_on_id })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Dependency already exists' }, { status: 409 })
    if (error.code === '23514') return NextResponse.json({ error: 'A task cannot depend on itself' }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return new NextResponse(null, { status: 201 })
}
