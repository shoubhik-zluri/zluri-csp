'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { MeetingNote, NoteSource, MeetingInsights } from '@/types/database'
import { formatDate, getInitials, isStructuredActionItem } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, FileText, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, CheckSquare, LayoutList, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import CallLogTableView from './CallLogTableView'
import CallLogDetailPanel from './CallLogDetailPanel'

const SOURCE_LABELS: Record<NoteSource, string> = {
  manual: 'Manual',
  granola: 'Granola',
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  clari_copilot: 'Clari Copilot',
}

const SOURCE_COLORS: Record<NoteSource, string> = {
  manual: 'bg-[#f0edec] text-[#434655]',
  granola: 'bg-purple-100 text-purple-700',
  google_meet: 'bg-blue-100 text-blue-700',
  zoom: 'bg-cyan-100 text-cyan-700',
  clari_copilot: 'bg-orange-100 text-orange-700',
}

interface NoteFormData {
  title: string
  content: string
  meeting_date: string
}

function AddNoteDialog({ open, onClose, accountId, onSave }: {
  open: boolean
  onClose: () => void
  accountId: string
  onSave: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<NoteFormData>({ title: '', content: '', meeting_date: today })
  const [saving, setSaving] = useState(false)

  function update(key: keyof NoteFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.content.trim()) { toast.error('Content is required'); return }
    if (!form.meeting_date) { toast.error('Date is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, account_id: accountId, source: 'manual' }),
      })
      if (!res.ok) { toast.error('Failed to save call log'); return }
      toast.success('Call log added')
      setForm({ title: '', content: '', meeting_date: today })
      onSave()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Log a Call</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#434655]">Call Date *</label>
            <Input type="date" value={form.meeting_date} onChange={(e) => update('meeting_date', e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#434655]">Title</label>
            <Input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Monthly check-in" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#434655]">Notes *</label>
            <Textarea
              value={form.content}
              onChange={(e) => update('content', e.target.value)}
              placeholder="Key discussion points, action items, follow-ups..."
              className="mt-1"
              rows={6}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Log Call'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InsightsPanel({ insights }: { insights: MeetingInsights }) {
  const [expanded, setExpanded] = useState(false)

  const hasContent = insights.summary || insights.actionItems.length > 0 || insights.riskSignals.length > 0
  if (!hasContent) return null

  return (
    <div className="mt-3 border border-purple-100 rounded-lg bg-purple-50/50">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          AI Summary
          {insights.riskSignals.length > 0 && (
            <span className="ml-1 flex items-center gap-1 text-red-600">
              <AlertTriangle className="w-3 h-3" />
              {insights.riskSignals.length} risk signal{insights.riskSignals.length > 1 ? 's' : ''}
            </span>
          )}
        </span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5">
          {insights.summary && (
            <p className="text-xs text-[#434655] leading-relaxed">{insights.summary}</p>
          )}
          {insights.actionItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#737687] mb-1 flex items-center gap-1">
                <CheckSquare className="w-3 h-3" /> Action Items
              </p>
              <ul className="space-y-1">
                {insights.actionItems.map((item, i) => (
                  <li key={i} className="text-xs text-[#434655] flex gap-1.5">
                    <span className="text-[#737687] shrink-0">·</span>
                    {isStructuredActionItem(item) ? item.title : item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {insights.riskSignals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Risk Signals
              </p>
              <ul className="space-y-1">
                {insights.riskSignals.map((signal, i) => (
                  <li key={i} className="text-xs text-red-600 flex gap-1.5">
                    <span className="shrink-0">·</span>{signal}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface SyncResult {
  synced: number
  matched: number
  unmatched: number
  skipped: number
  total: number
}

interface NotesListProps {
  notes: MeetingNote[]
  accountId: string
  isLoading?: boolean
  onMutate: () => void
}

type ViewMode = 'table' | 'card'

function getStoredViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'table'
  return (localStorage.getItem('call-logs-view-mode') as ViewMode) ?? 'table'
}

export default function NotesList({ notes, accountId, isLoading, onMutate }: NotesListProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode)
  const [selectedNote, setSelectedNote] = useState<MeetingNote | null>(null)

  function switchViewMode(mode: ViewMode) {
    setViewMode(mode)
    localStorage.setItem('call-logs-view-mode', mode)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this call log?')) return
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); return }
    toast.success('Call log deleted')
    if (selectedNote?.id === id) setSelectedNote(null)
    onMutate()
  }

  async function handleSyncGranola() {
    setSyncing(true)
    try {
      const res = await fetch('/api/integrations/granola/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      const data: SyncResult & { error?: string } = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Sync failed')
        return
      }
      toast.success(`Synced ${data.synced} call log${data.synced !== 1 ? 's' : ''} from Granola`)
      onMutate()
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  if (isLoading) return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 bg-[#f0edec] rounded-lg animate-pulse" />
      ))}
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        {/* View toggle */}
        <div className="flex items-center border border-[#e5e2e1] rounded-lg overflow-hidden h-8">
          <button
            onClick={() => switchViewMode('table')}
            className={cn(
              'flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-colors border-r border-[#e5e2e1]',
              viewMode === 'table' ? 'bg-[#1c1b1b] text-white' : 'text-[#737687] hover:bg-[#f6f3f2]'
            )}
          >
            <Table2 className="w-3.5 h-3.5" />Table
          </button>
          <button
            onClick={() => switchViewMode('card')}
            className={cn(
              'flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-colors',
              viewMode === 'card' ? 'bg-[#1c1b1b] text-white' : 'text-[#737687] hover:bg-[#f6f3f2]'
            )}
          >
            <LayoutList className="w-3.5 h-3.5" />Cards
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSyncGranola} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Granola'}
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Log Call
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-16 text-[#737687]">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium text-[#434655]">No call logs yet</p>
          <p className="text-xs mt-1">Log a call manually or sync from Granola.</p>
        </div>
      ) : viewMode === 'table' ? (
        <CallLogTableView
          notes={notes}
          onSelect={setSelectedNote}
          onDelete={handleDelete}
        />
      ) : (
        <div className="space-y-4">
          {notes.map((note) => {
            const author = note.created_by_profile as { full_name: string | null; avatar_url: string | null } | null
            const insights = note.metadata?.insights ?? null
            return (
              <div
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className="bg-white border border-[#e5e2e1] rounded-xl p-4 cursor-pointer hover:border-blue-200 hover:bg-blue-50/20 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#1c1b1b]">
                      {note.title || formatDate(note.meeting_date)}
                    </span>
                    {note.title && (
                      <span className="text-xs text-[#737687]">{formatDate(note.meeting_date)}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_COLORS[note.source]}`}>
                      {SOURCE_LABELS[note.source]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {author && (
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={author.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                          {getInitials(author.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-7 h-7 p-0 text-red-400 hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-[#434655] whitespace-pre-wrap leading-relaxed">{note.content}</p>
                {note.attendees && note.attendees.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    <span className="text-xs text-[#737687]">Attendees:</span>
                    {note.attendees.map((a) => (
                      <Badge key={a} variant="secondary" className="text-xs h-4 px-1.5">{a}</Badge>
                    ))}
                  </div>
                )}
                {insights && <InsightsPanel insights={insights} />}
              </div>
            )
          })}
        </div>
      )}

      <AddNoteDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        accountId={accountId}
        onSave={onMutate}
      />

      {/* Detail panel backdrop */}
      {selectedNote && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={() => setSelectedNote(null)}
        />
      )}

      <CallLogDetailPanel
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
        onMutate={onMutate}
        onPendingTaskAccepted={onMutate}
      />
    </div>
  )
}
