import { inngest } from '@/inngest/client'
import { createAdminClient } from '@/lib/supabase/server'
import { extractInsights } from '@/lib/agents/insights'
import { isStructuredActionItem } from '@/lib/utils'
import type { StructuredActionItem } from '@/types/database'

interface NoteCreatedEvent {
  noteId: string
  accountId: string
  title: string
  content: string
}

export const extractNoteInsights = inngest.createFunction(
  {
    id: 'extract-note-insights',
    retries: 3,
    triggers: [{ event: 'note/created' }],
  },
  async ({ event, step }) => {
    const { noteId, accountId, title, content } = event.data as NoteCreatedEvent

    const insights = await step.run('extract-insights', () =>
      extractInsights(title, content)
    )

    await step.run('save-and-create-pending-tasks', async () => {
      const supabase = createAdminClient()

      // Fetch existing metadata + external_id to preserve matchInfo/granola_id
      const { data: noteRow } = await supabase
        .from('meeting_notes')
        .select('external_id, metadata')
        .eq('id', noteId)
        .single()
      const sourceCallId = noteRow?.external_id ?? null

      // Merge insights into existing metadata to preserve matchInfo and granola_id
      await supabase
        .from('meeting_notes')
        .update({ metadata: { ...(noteRow?.metadata ?? {}), insights } })
        .eq('id', noteId)

      if (!insights.actionItems || insights.actionItems.length === 0) return

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')

      await supabase
        .from('pending_tasks')
        .delete()
        .eq('note_id', noteId)
        .eq('status', 'pending')

      const rows = insights.actionItems
        .map((item): StructuredActionItem => {
          if (isStructuredActionItem(item)) return item
          return { title: String(item), assignee_name: null, due_date: null }
        })
        .filter((item) => item.title.trim().length > 0)
        .map((item) => {
          let assigneeId: string | null = null
          if (item.assignee_name && profiles) {
            const needle = item.assignee_name.toLowerCase()
            const match = profiles.find(
              (p) =>
                p.full_name?.toLowerCase().startsWith(needle) ||
                p.full_name?.toLowerCase().includes(needle)
            )
            if (match) assigneeId = match.id
          }

          return {
            note_id: noteId,
            account_id: accountId,
            title: item.title.trim(),
            assignee_name_raw: item.assignee_name ?? null,
            assignee_id: assigneeId,
            due_date: item.due_date ?? null,
            status: 'pending' as const,
            description: item.justification ?? null,
            task_type: 'action_item' as const,
            confidence: item.confidence ?? null,
            justification: item.justification ?? null,
            priority: item.priority ?? null,
            source_call_id: sourceCallId,
          }
        })

      if (rows.length > 0) {
        await supabase.from('pending_tasks').insert(rows)
      }
    })

    return { noteId, pendingCount: insights.actionItems.length }
  }
)
