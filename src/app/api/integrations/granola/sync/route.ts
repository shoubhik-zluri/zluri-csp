import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { fetchGranolaDocs, normalizeDoc } from '@/lib/agents/granola'
import { matchMeetingToAccount } from '@/lib/agents/matching'
import { extractInsights } from '@/lib/agents/insights'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = await createServiceClient()
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()

  const body2 = await request.clone().json().catch(() => ({}))
  const { accountId: reqAccountId } = body2 as { accountId?: string }

  // Admins can sync globally; CSMs can sync their own accounts
  if (profile?.role !== 'admin') {
    if (!reqAccountId) {
      return NextResponse.json({ error: 'Specify an accountId to sync' }, { status: 403 })
    }
    const { data: acc } = await serviceClient
      .from('accounts').select('csm_id').eq('id', reqAccountId).single()
    if (acc?.csm_id !== user.id) {
      return NextResponse.json({ error: 'Not your account' }, { status: 403 })
    }
  }

  if (!process.env.GRANOLA_REFRESH_TOKEN) {
    return NextResponse.json({ error: 'GRANOLA_REFRESH_TOKEN not configured' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  // accountId = filter to only meetings for this account (called from Notes tab)
  // undefined = global sync across all accounts
  const { accountId } = body as { accountId?: string }

  // Determine `since` — earliest sync time, so we catch all un-synced meetings
  const { data: lastSyncRows } = await serviceClient
    .from('account_integrations')
    .select('granola_last_synced_at')
    .order('granola_last_synced_at', { ascending: true })
    .limit(1)

  const lastSynced = lastSyncRows?.[0]?.granola_last_synced_at
  const since = lastSynced ? new Date(lastSynced) : undefined

  // Agent 1: Fetch from Granola
  let docs
  try {
    docs = await fetchGranolaDocs(since)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Granola API error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  let synced = 0
  let unmatched = 0
  let skipped = 0

  for (const doc of docs) {
    const meeting = normalizeDoc(doc)

    // Skip notes with no meaningful content
    if (!meeting.content || meeting.content.length < 30) {
      skipped++
      continue
    }

    // Skip internal-only meetings (all @zluri.com, no customers)
    if (meeting.externalDomains.length === 0) {
      skipped++
      continue
    }

    // Agent 2: Match meeting → account via email domain or title keywords
    const matchResult = await matchMeetingToAccount(
      meeting.externalDomains,
      meeting.title,
      serviceClient
    )

    // If syncing from an account's Notes tab: only keep meetings that belong to THIS account
    if (accountId) {
      if (matchResult.accountId !== accountId) {
        skipped++
        continue
      }
    } else {
      // Global sync: skip if no match found
      if (!matchResult.accountId) {
        unmatched++
        continue
      }
    }

    const resolvedAccountId = matchResult.accountId ?? accountId!

    // Agent 3: Extract insights via Claude
    let metadata: Record<string, unknown> = {
      matchInfo: { confidence: matchResult.confidence, matchedOn: matchResult.reasons[0] ?? null },
      granola_id: doc.id,
    }

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const insights = await extractInsights(meeting.title, meeting.content)
        metadata = { ...metadata, insights }
      } catch {
        // Insights failed — store note anyway without them
      }
    }

    // Upsert — dedup on external_id so re-syncing never creates duplicates
    const { error } = await serviceClient
      .from('meeting_notes')
      .upsert(
        {
          account_id: resolvedAccountId,
          title: meeting.title,
          content: meeting.content,
          meeting_date: meeting.date,
          source: 'granola' as const,
          attendees: meeting.attendeeEmails,
          external_id: meeting.externalId,
          created_by: user.id,
          metadata,
        },
        { onConflict: 'external_id', ignoreDuplicates: false }
      )

    if (error) {
      // If upsert fails (e.g. no unique constraint yet), fall back to insert
      await serviceClient.from('meeting_notes').insert({
        account_id: resolvedAccountId,
        title: meeting.title,
        content: meeting.content,
        meeting_date: meeting.date,
        source: 'granola' as const,
        attendees: meeting.attendeeEmails,
        external_id: meeting.externalId,
        created_by: user.id,
        metadata,
      })
    }

    synced++
  }

  // Mark all account_integrations as synced now
  await serviceClient
    .from('account_integrations')
    .update({ granola_last_synced_at: new Date().toISOString() })
    .not('account_id', 'is', null)

  return NextResponse.json({
    synced,
    unmatched,
    skipped,
    total: docs.length,
  })
}
