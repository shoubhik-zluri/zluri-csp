import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedClient } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase } = auth

  const { data, error } = await supabase
    .from('custom_field_definitions')
    .select('*')
    .order('position', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedClient(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supabase, user } = auth

  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  if (!body.field_type) return NextResponse.json({ error: 'field_type required' }, { status: 400 })

  // Place new field at end
  const { count } = await supabase
    .from('custom_field_definitions')
    .select('*', { count: 'exact', head: true })

  const { data, error } = await supabase
    .from('custom_field_definitions')
    .insert({
      name: body.name.trim(),
      field_type: body.field_type,
      options: body.options ?? [],
      is_required: body.is_required ?? false,
      position: count ?? 0,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
