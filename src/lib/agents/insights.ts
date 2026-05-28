// Claude-powered meeting insights extraction
import Anthropic from '@anthropic-ai/sdk'
import type { MeetingInsights, StructuredActionItem } from '@/types/database'

const client = new Anthropic()

export async function extractInsights(
  meetingTitle: string,
  content: string
): Promise<MeetingInsights> {
  if (!content || content.length < 50) {
    return { summary: '', actionItems: [], riskSignals: [], sentimentHint: null, mom: null, expansionSignals: [] }
  }

  // Truncate very long content to stay within token limits
  const truncated = content.length > 8000 ? content.slice(0, 8000) + '...[truncated]' : content

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    tools: [
      {
        name: 'extract_meeting_insights',
        description: 'Extract structured insights from a customer success meeting note',
        input_schema: {
          type: 'object' as const,
          properties: {
            summary: {
              type: 'string',
              description: '2-3 sentence summary of the meeting',
            },
            actionItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  assignee_name: { type: ['string', 'null'] },
                  due_date: {
                    type: ['string', 'null'],
                    description: 'YYYY-MM-DD or null',
                  },
                  confidence: {
                    type: ['string', 'null'],
                    enum: ['high', 'medium', 'low'],
                    description:
                      'high = a specific action was explicitly committed to by a named person; medium = an action was discussed but no explicit commitment or owner was stated; low = inferred from context with no direct mention. null if not determinable.',
                  },
                  justification: {
                    type: ['string', 'null'],
                    description:
                      'A verbatim or near-verbatim excerpt from the note that directly supports this task. Do not paraphrase or synthesize. null if no single sentence serves as a clear anchor.',
                  },
                  priority: {
                    type: ['string', 'null'],
                    enum: ['low', 'medium', 'high'],
                    description:
                      'Only assign priority when the notes explicitly reference urgency, a hard deadline, or an escalation. Otherwise return null. Do not infer priority from business importance.',
                  },
                },
                required: ['title', 'assignee_name', 'due_date', 'confidence', 'justification', 'priority'],
                additionalProperties: false,
              },
            },
            riskSignals: {
              type: 'array',
              items: { type: 'string' },
              description:
                'ONLY signals explicitly stated in the notes. Never infer. If in doubt, return empty array.',
            },
            sentimentHint: {
              type: ['string', 'null'],
              enum: ['positive', 'neutral', 'negative'],
            },
            mom: {
              type: 'string',
              description:
                'Minutes of meeting: 2-3 sentences summarizing key decisions, agreements, and next steps. Suitable for sharing internally. Empty string if no clear decisions were made.',
            },
            expansionSignals: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Expansion opportunities explicitly mentioned in the notes — e.g. interest in additional modules, growth in headcount, new use cases requested. ONLY include signals explicitly stated. Never infer or extrapolate. Return empty array if none.',
            },
          },
          required: ['summary', 'actionItems', 'riskSignals', 'sentimentHint', 'mom', 'expansionSignals'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'extract_meeting_insights' },
    messages: [
      {
        role: 'user',
        content: `Meeting: "${meetingTitle}"\n\n${truncated}`,
      },
    ],
  })

  const toolUse = message.content.find((b) => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    return { summary: '', actionItems: [], riskSignals: [], sentimentHint: null, mom: null, expansionSignals: [] }
  }

  const parsed = toolUse.input as {
    summary?: string
    actionItems?: StructuredActionItem[]
    riskSignals?: string[]
    sentimentHint?: 'positive' | 'neutral' | 'negative' | null
    mom?: string
    expansionSignals?: string[]
  }

  return {
    summary: parsed.summary ?? '',
    actionItems: Array.isArray(parsed.actionItems)
      ? parsed.actionItems.filter((item) => item && item.title && item.title.trim() !== '')
      : [],
    riskSignals: Array.isArray(parsed.riskSignals) ? parsed.riskSignals : [],
    sentimentHint: parsed.sentimentHint ?? null,
    mom: parsed.mom ?? null,
    expansionSignals: Array.isArray(parsed.expansionSignals) ? parsed.expansionSignals : [],
  }
}
