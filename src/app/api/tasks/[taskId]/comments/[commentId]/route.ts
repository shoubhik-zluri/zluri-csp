import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedClient } from '@/lib/api-auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; commentId: string }> }
) {
  const { commentId } = await params
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  // Only the author can delete their comment
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId)
    .eq('author_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return new NextResponse(null, { status: 204 })
}
