import { z } from 'zod'

export const CreateNoteSchema = z.object({
  account_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).nullable().optional(),
  content: z.string().min(1),
  meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.enum(['manual', 'granola', 'google_meet', 'zoom', 'clari_copilot']).default('manual'),
  attendees: z.array(z.string()).optional().default([]),
  external_id: z.string().nullable().optional(),
})

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>
