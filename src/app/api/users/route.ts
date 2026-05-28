import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = await createServiceClient()
  const { data, error } = await serviceClient
    .from('profiles')
    .select('*')
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = await createServiceClient()

  const { full_name, email, password, role } = await request.json()
  if (!email || !password || !full_name) {
    return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
  }

  // Create auth user
  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })

  // Set full_name and role on the profile (trigger creates the row)
  await serviceClient
    .from('profiles')
    .update({ full_name, role: role ?? 'member' })
    .eq('id', created.user.id)

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('id', created.user.id)
    .single()

  return NextResponse.json(profile, { status: 201 })
}
