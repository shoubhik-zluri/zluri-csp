import { inngest } from '@/inngest/client'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchGranolaDocs, normalizeDoc } from '@/lib/agents/granola'
import { matchMeetingToAccount } from '@/lib/agents/matching'

interface SyncRequestedEvent {
  runId?: string
  sources?: string[]
  triggeredBy?: string
  triggerType?: string
}

export const syncCalls = inngest.createFunction(
  {
    id: 'sync-calls',
    retries: 2,
    triggers: [
      { event: 'calls/sync-requested' },
      { cron: '0 2 * * *' },
    ],
  },
  async ({ event, step }) => {
    let runId = ''

    runId = await step.run('init-run-log', async () => {
      const eventData = event.data as SyncRequestedEvent | undefined

      if (eventData?.runId) {
        return eventData.runId
      }

      const supabase = createAdminClient()
      const { data: runLog, error } = await supabase
        .from('sync_run_logs')
        .insert({
          trigger_type: 'scheduled',
          triggered_by: null,
          sources: ['granola'],
          status: 'running',
        })
        .select('id')
        .single()

      if (error || !runLog) {
        throw new Error(`Failed to create sync_run_log: ${error?.message ?? 'no data'}`)
      }

      return runLog.id as string
    })

    try {
      const docs = await step.run('fetch-calls', async () => {
        const supabase = createAdminClient()

        const { data: lastRun } = await supabase
          .from('sync_run_logs')
          .select('started_at')
          .eq('status', 'completed')
          .order('started_at', { ascending: false })
          .limit(1)
          .single()

        let since: Date
        if (lastRun?.started_at) {
          since = new Date(lastRun.started_at)
        } else {
          since = new Date()
          since.setDate(since.getDate() - 30)
        }

        const granolaDocs = await fetchGranolaDocs(since)
        // TODO: add Clari when MCP tools are available
        // TODO: add Zoom when MCP tools are available
        return granolaDocs
      })

      // Match all docs — store every result including unmatched
      const allMatchResults = await step.run('normalize-and-match', async () => {
        const supabase = createAdminClient()

        const results: Array<{
          normalized: ReturnType<typeof normalizeDoc>
          accountId: string | null
          confidence: string
          reasons: string[]
        }> = []

        for (const doc of docs) {
          const normalized = normalizeDoc(doc)
          const match = await matchMeetingToAccount(
            normalized.externalDomains,
            normalized.title,
            supabase
          )
          results.push({
            normalized,
            accountId: match.accountId,
            confidence: match.confidence,
            reasons: match.reasons,
          })
        }

        return results
      })

      const { counts, newNoteEvents } = await step.run('upsert-notes', async () => {
        const supabase = createAdminClient()

        let callsMatched = 0
        let callsUnmatched = 0
        let tasksTriggered = 0
        const noteEvents: Array<{ name: string; data: { noteId: string; accountId: string; title: string; content: string } }> = []

        for (const { normalized, accountId, confidence, reasons } of allMatchResults) {
          // Skip low-confidence auto-assignment: store as unassigned
          const effectiveAccountId = confidence === 'high' ? accountId : null

          if (effectiveAccountId) {
            callsMatched++
          } else {
            callsUnmatched++
          }

          // Dedup by external_id
          const { data: existing } = await supabase
            .from('meeting_notes')
            .select('id')
            .eq('external_id', normalized.externalId)
            .single()

          if (existing) continue

          const { data: newNote, error: insertError } = await supabase
            .from('meeting_notes')
            .insert({
              account_id: effectiveAccountId,
              title: normalized.title,
              content: normalized.content,
              meeting_date: normalized.date,
              source: 'granola' as const,
              attendees: normalized.attendeeEmails,
              external_id: normalized.externalId,
              created_by: null,
              match_confidence: confidence,
              match_reasons: reasons,
              metadata: {
                matchInfo: { confidence, matchedOn: reasons[0] ?? null },
              },
            })
            .select('id')
            .single()

          if (insertError || !newNote) {
            console.error(
              `Failed to insert meeting note for external_id=${normalized.externalId}:`,
              insertError?.message
            )
            continue
          }

          // Only fire note/created for high-confidence matched notes
          if (effectiveAccountId) {
            noteEvents.push({
              name: 'note/created',
              data: {
                noteId: newNote.id,
                accountId: effectiveAccountId,
                title: normalized.title,
                content: normalized.content,
              },
            })
            tasksTriggered++
          }
        }

        return {
          counts: {
            callsFetched: docs.length,
            callsMatched,
            callsSkipped: 0,
            callsUnmatched,
            tasksTriggered,
          },
          newNoteEvents: noteEvents,
        }
      })

      if (newNoteEvents.length > 0) {
        await step.sendEvent('fire-note-created-events', newNoteEvents)
      }

      await step.run('complete-run-log', async () => {
        const supabase = createAdminClient()
        await supabase
          .from('sync_run_logs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            calls_fetched: counts.callsFetched,
            calls_matched: counts.callsMatched,
            calls_skipped: counts.callsSkipped,
            calls_unmatched: counts.callsUnmatched,
            tasks_suggested: counts.tasksTriggered,
          })
          .eq('id', runId)
      })

      return { runId, ...counts }
    } catch (err) {
      if (runId) {
        const supabase = createAdminClient()
        await supabase
          .from('sync_run_logs')
          .update({
            status: 'failed',
            error_text: err instanceof Error ? err.message : String(err),
            completed_at: new Date().toISOString(),
          })
          .eq('id', runId)
      }
      throw err
    }
  }
)
