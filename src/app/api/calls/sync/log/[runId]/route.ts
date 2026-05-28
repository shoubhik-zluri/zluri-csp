import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedClient } from '@/lib/api-auth'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  if (!request.headers.get('authorization')?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { runId } = await params

  const schema = z.object({
    calls_fetched: z.number().int().min(0).optional(),
    calls_matched: z.number().int().min(0).optional(),
    calls_skipped: z.number().int().min(0).optional(),
    tasks_suggested: z.number().int().min(0).optional(),
    status: z.enum(['completed', 'failed']).optional(),
    error_text: z.string().optional(),
  })

  const result = schema.safeParse(await request.json())
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 422 })

  const updates: Record<string, unknown> = { ...result.data }
  if (result.data.status === 'completed' || result.data.status === 'failed') {
    updates.completed_at = new Date().toISOString()
  }

  const serviceClient = await createServiceClient()
  const { data, error } = await serviceClient
    .from('sync_run_logs')
    .update(updates)
    .eq('id', runId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update sync run log' }, { status: 500 })
  return NextResponse.json(data)
}
