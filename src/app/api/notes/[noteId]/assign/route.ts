import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedClient } from '@/lib/api-auth'
import { inngest } from '@/inngest/client'

const assignSchema = z.object({
  account_id: z.string().uuid(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await params
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const body = await request.json().catch(() => ({}))
  const parsed = assignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { account_id } = parsed.data

  const { data: note, error } = await supabase
    .from('meeting_notes')
    .update({ account_id, match_confidence: 'high', match_reasons: ['manual_assignment'] })
    .eq('id', noteId)
    .is('account_id', null)
    .select('*')
    .single()

  if (error || !note) {
    return NextResponse.json({ error: 'Note not found or already assigned' }, { status: 404 })
  }

  // Trigger extraction now that the note has an account
  await inngest.send({
    name: 'note/created',
    data: {
      noteId: note.id,
      accountId: account_id,
      title: note.title ?? '',
      content: note.content,
    },
  })

  return NextResponse.json(note)
}
