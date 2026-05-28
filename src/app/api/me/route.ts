import { NextResponse } from 'next/server'

export async function GET() {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    const { mockUser } = await import('@/lib/mock-data')
    return NextResponse.json(mockUser)
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return NextResponse.json(data)
}
