'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { toast } from 'sonner'
import { PhoneMissed, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MeetingNote, Account, MatchConfidence } from '@/types/database'

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

const CONFIDENCE_STYLES: Record<MatchConfidence, string> = {
  high:   'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-slate-100 text-slate-500',
  none:   'bg-red-50 text-red-500',
}

function MatchConfidenceBadge({ confidence }: { confidence: MatchConfidence | null | undefined }) {
  if (!confidence) return null
  return (
    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${CONFIDENCE_STYLES[confidence]}`}>
      {confidence}
    </span>
  )
}

interface NoteRowProps {
  note: MeetingNote
  accounts: Account[]
  onAssigned: () => void
}

function NoteRow({ note, accounts, onAssigned }: NoteRowProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  async function handleAssign() {
    if (!selectedAccountId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/notes/${note.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: selectedAccountId }),
      })
      if (!res.ok) throw new Error('Failed to assign')
      toast.success('Call assigned — insights will be extracted shortly')
      onAssigned()
    } catch {
      toast.error('Failed to assign call')
    } finally {
      setLoading(false)
    }
  }

  const reasons = note.match_reasons ?? []
  const meetingDate = note.meeting_date
    ? new Date(note.meeting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <MatchConfidenceBadge confidence={note.match_confidence} />
            <span className="text-sm font-medium text-slate-800 truncate">{note.title ?? 'Untitled call'}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            <span>{note.source}</span>
            {meetingDate && <span>{meetingDate}</span>}
            {note.attendees.length > 0 && (
              <span>{note.attendees.slice(0, 2).join(', ')}{note.attendees.length > 2 ? ` +${note.attendees.length - 2}` : ''}</span>
            )}
          </div>
          {reasons.length > 0 && (
            <p className="mt-1 text-xs text-slate-400 italic">
              Match hints: {reasons.join(', ')}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedAccountId} onValueChange={(v) => v && setSelectedAccountId(v)}>
          <SelectTrigger className="h-8 text-sm flex-1">
            <SelectValue placeholder="Select account…" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={handleAssign}
          disabled={!selectedAccountId || loading}
          className="shrink-0"
        >
          {loading ? 'Assigning…' : 'Assign'}
        </Button>
      </div>
    </div>
  )
}

export default function UnassignedCallsPage() {
  const { data: notes = [], mutate: mutateNotes } = useSWR<MeetingNote[]>(
    '/api/notes?unassigned=true',
    fetcher
  )
  const { data: accounts = [] } = useSWR<Account[]>('/api/accounts', fetcher)

  function handleAssigned() {
    mutateNotes()
    mutate('/api/notes?unassigned=true')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <PhoneMissed className="w-6 h-6 text-slate-400" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Unassigned Calls</h1>
          <p className="text-sm text-slate-500">
            Calls synced from Granola or Clari that couldn&apos;t be matched to an account automatically.
          </p>
        </div>
        {notes.length > 0 && (
          <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
            {notes.length}
          </span>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-12 flex flex-col items-center text-center gap-2">
          <Building2 className="w-8 h-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">All calls assigned</p>
          <p className="text-xs text-slate-400">New unmatched calls will appear here after sync.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              accounts={accounts}
              onAssigned={handleAssigned}
            />
          ))}
        </div>
      )}
    </div>
  )
}
