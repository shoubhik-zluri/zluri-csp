// Granola API client + data normalization

const GRANOLA_API = 'https://api.granola.ai'

export interface GranolaAttendee {
  email: string
  displayName?: string
  self?: boolean
  organizer?: boolean
  responseStatus?: string
}

export interface GranolaDoc {
  id: string
  title: string | null
  created_at: string
  updated_at: string
  notes_plain: string | null
  notes_markdown: string | null
  valid_meeting: boolean | null
  google_calendar_event: {
    id?: string
    summary?: string
    start?: { dateTime?: string; date?: string }
    end?: { dateTime?: string; date?: string }
    attendees?: GranolaAttendee[]
  } | null
  overview: string | null
  chapters: Array<{ title: string; summary: string }> | null
}

export interface NormalizedMeeting {
  externalId: string
  title: string
  date: string // ISO date string
  content: string
  attendeeEmails: string[]
  externalDomains: string[]
  rawDoc: GranolaDoc
}

// Refresh the access token using the stored refresh token
export async function refreshGranolaToken(): Promise<string> {
  const refreshToken = process.env.GRANOLA_REFRESH_TOKEN
  if (!refreshToken) throw new Error('GRANOLA_REFRESH_TOKEN not set')

  const res = await fetch(`${GRANOLA_API}/v1/refresh-access-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!res.ok) throw new Error(`Granola token refresh failed: ${res.status}`)
  const data = await res.json()
  if (!data.access_token) throw new Error('No access_token in refresh response')
  return data.access_token
}

// Fetch all Granola documents, optionally filtered to those updated after `since`
export async function fetchGranolaDocs(since?: Date): Promise<GranolaDoc[]> {
  const accessToken = await refreshGranolaToken()

  const res = await fetch(`${GRANOLA_API}/v2/get-documents`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Accept-Encoding': 'gzip',
    },
  })

  if (!res.ok) throw new Error(`Granola API error: ${res.status}`)
  const data = await res.json()
  const docs: GranolaDoc[] = data.docs ?? []

  // Filter to valid meetings with content, optionally since a date
  return docs.filter((doc) => {
    if (!doc.valid_meeting) return false
    if (!doc.notes_plain && !doc.notes_markdown && !doc.overview) return false
    if (since) {
      const updatedAt = new Date(doc.updated_at || doc.created_at)
      return updatedAt > since
    }
    return true
  })
}

// Extract external (non-Zluri) attendee emails and their domains
function getExternalAttendees(doc: GranolaDoc): { emails: string[]; domains: string[] } {
  const attendees = doc.google_calendar_event?.attendees ?? []
  const externalEmails = attendees
    .map((a) => a.email?.toLowerCase().trim())
    .filter((e): e is string => !!e && !e.endsWith('@zluri.com'))

  const domains = [...new Set(externalEmails.map((e) => e.split('@')[1]).filter(Boolean))]
  return { emails: externalEmails, domains }
}

// Convert Granola doc to our normalized format
export function normalizeDoc(doc: GranolaDoc): NormalizedMeeting {
  const calEvent = doc.google_calendar_event
  const dateStr = calEvent?.start?.dateTime
    ?? calEvent?.start?.date
    ?? doc.created_at

  const date = dateStr.split('T')[0] // YYYY-MM-DD

  // Build content: prefer markdown notes, then plain, then overview
  const content = doc.notes_markdown || doc.notes_plain || doc.overview || ''

  const { emails, domains } = getExternalAttendees(doc)

  return {
    externalId: doc.id,
    title: doc.title || calEvent?.summary || 'Meeting',
    date,
    content: content.trim(),
    attendeeEmails: emails,
    externalDomains: domains,
    rawDoc: doc,
  }
}
