import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { extractNoteInsights } from '@/inngest/functions/extractNoteInsights'
import { syncCalls } from '@/inngest/functions/syncCalls'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [extractNoteInsights, syncCalls],
})
