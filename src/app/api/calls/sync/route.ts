import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedClient } from '@/lib/api-auth'
import { inngest } from '@/inngest/client'

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user, profile } = auth

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schema = z.object({
    sources: z.array(z.string()).optional().default(['granola']),
  })

  const result = schema.safeParse(await request.json().catch(() => ({})))
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 422 })

  const { sources } = result.data

  const { data: runLog, error } = await supabase
    .from('sync_run_logs')
    .insert({
      trigger_type: 'manual',
      triggered_by: user.id,
      sources,
      status: 'running',
    })
    .select()
    .single()

  if (error || !runLog) {
    return NextResponse.json({ error: 'Failed to create run log' }, { status: 500 })
  }

  await inngest.send({
    name: 'calls/sync-requested',
    data: { runId: runLog.id, sources, triggeredBy: user.id, triggerType: 'manual' },
  })

  return NextResponse.json({ runId: runLog.id }, { status: 202 })
}
