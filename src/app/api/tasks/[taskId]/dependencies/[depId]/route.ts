import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedClient } from '@/lib/api-auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; depId: string }> }
) {
  const { depId } = await params
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const { error, count } = await supabase
    .from('task_dependencies')
    .delete({ count: 'exact' })
    .eq('id', depId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
