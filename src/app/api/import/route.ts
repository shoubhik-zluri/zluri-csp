import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { normalizeValue } from '@/lib/csv/parser'
import type { ImportError } from '@/types/database'

interface ImportRow {
  [key: string]: string
}

interface ImportBody {
  rows: ImportRow[]
  mapping: Record<string, string>   // { csvHeader: dbField }
  filename?: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body: ImportBody = await request.json()
  const { rows, mapping, filename } = body

  // Resolve CSM emails to profile IDs
  const emailCol = Object.entries(mapping).find(([, f]) => f === 'csm_email')?.[0]
  const nameCol = Object.entries(mapping).find(([, f]) => f === 'csm_name')?.[0]

  const csmEmailToId: Record<string, string> = {}
  const csmNameToId: Record<string, string> = {}

  if (emailCol) {
    const uniqueEmails = [...new Set(rows.map((r) => r[emailCol]?.trim().toLowerCase()).filter(Boolean))] as string[]
    if (uniqueEmails.length > 0) {
      const { data: profiles } = await serviceClient.from('profiles').select('id, email').in('email', uniqueEmails)
      for (const p of profiles ?? []) csmEmailToId[p.email.toLowerCase()] = p.id
    }
  }

  if (nameCol) {
    const uniqueNames = [...new Set(rows.map((r) => r[nameCol]?.trim()).filter(Boolean))] as string[]
    if (uniqueNames.length > 0) {
      const { data: profiles } = await serviceClient.from('profiles').select('id, full_name').in('full_name', uniqueNames)
      for (const p of profiles ?? []) if (p.full_name) csmNameToId[p.full_name] = p.id
    }
  }

  const orgIdCol = Object.entries(mapping).find(([, f]) => f === 'org_id')?.[0]

  // Pre-fetch existing org_ids to distinguish inserts from updates
  const orgIds = orgIdCol
    ? ([...new Set(rows.map((r) => r[orgIdCol]?.trim()).filter(Boolean))] as string[])
    : []

  const existingOrgIds = new Set<string>()
  if (orgIds.length > 0) {
    const { data: existing } = await serviceClient
      .from('accounts')
      .select('org_id')
      .in('org_id', orgIds)
    for (const row of existing ?? []) existingOrgIds.add(row.org_id)
  }

  let inserted = 0
  let updated = 0
  const errors: ImportError[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const accountData: Record<string, unknown> = {}
    const integrationData: Record<string, unknown> = {}
    const rowErrors: string[] = []

    for (const [csvCol, dbField] of Object.entries(mapping)) {
      if (dbField === 'skip' || !row[csvCol]) continue

      if (['slack_channel_name', 'email_domain', 'jira_project_key'].includes(dbField)) {
        integrationData[dbField] = row[csvCol].trim()
        continue
      }

      if (dbField === 'csm_email') {
        const email = row[csvCol].trim().toLowerCase()
        const id = csmEmailToId[email]
        if (id) accountData['csm_id'] = id
        // If CSM not found, skip silently — account imports without CSM assigned
        continue
      }

      if (dbField === 'csm_name') {
        const name = row[csvCol].trim()
        const id = csmNameToId[name]
        if (id) accountData['csm_id'] = id
        // If CSM not found, skip silently — account imports without CSM assigned
        continue
      }

      const { value, error } = normalizeValue(dbField, row[csvCol])
      if (error) {
        rowErrors.push(`${dbField}: ${error}`)
      } else {
        accountData[dbField] = value
      }
    }

    if (!accountData['name']) {
      errors.push({ row: i + 1, message: 'Account name is required' })
      continue
    }

    if (rowErrors.length > 0) {
      errors.push({ row: i + 1, message: rowErrors.join('; ') })
      continue
    }

    // org_id is mandatory — reject row if missing
    if (!accountData['org_id']) {
      errors.push({ row: i + 1, message: 'org_id is required — map the Organization ID column' })
      continue
    }

    // Upsert account on org_id
    const { data: account, error: upsertError } = await serviceClient
      .from('accounts')
      .upsert(accountData, { onConflict: 'org_id', ignoreDuplicates: false })
      .select('id, org_id')
      .single()

    if (upsertError) {
      errors.push({ row: i + 1, message: upsertError.message })
      continue
    }

    // Track insert vs update
    if (existingOrgIds.has(account.org_id)) updated++
    else inserted++

    // Upsert integration data if present
    if (Object.keys(integrationData).length > 0) {
      await serviceClient
        .from('account_integrations')
        .upsert(
          { account_id: account.id, ...integrationData },
          { onConflict: 'account_id', ignoreDuplicates: false }
        )
    }
  }

  // Log the import
  await serviceClient.from('import_logs').insert({
    imported_by: user.id,
    filename: filename ?? 'unknown',
    total_rows: rows.length,
    inserted_rows: inserted,
    updated_rows: updated,
    error_rows: errors.length,
    errors,
  })

  return NextResponse.json({ inserted, updated, errors, total: rows.length })
}
