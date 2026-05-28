'use client'

import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { X, ChevronDown, ChevronUp, Check, Download, Sparkles, Clock, User } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { MeetingNote, CallLogFrequency, PendingTask } from '@/types/database'

const FREQUENCY_OPTIONS: { value: CallLogFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'ad_hoc', label: 'Ad hoc' },
]

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  granola: 'Granola',
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  clari_copilot: 'Clari',
}

const SOURCE_COLORS: Record<string, string> = {
  manual: 'bg-[#f0edec] text-[#434655]',
  granola: 'bg-purple-100 text-purple-700',
  google_meet: 'bg-blue-100 text-blue-700',
  zoom: 'bg-cyan-100 text-cyan-700',
  clari_copilot: 'bg-orange-100 text-orange-700',
}

const SENTIMENT_COLORS = {
  positive: 'bg-green-50 text-green-700',
  neutral: 'bg-[#f0edec] text-[#737687]',
  negative: 'bg-red-50 text-red-600',
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-50 text-green-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-[#f0edec] text-[#737687]',
}

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

interface CallLogDetailPanelProps {
  note: MeetingNote | null
  onClose: () => void
  onMutate: () => void
  onPendingTaskAccepted?: () => void
}

export default function CallLogDetailPanel({ note, onClose, onMutate, onPendingTaskAccepted }: CallLogDetailPanelProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [editingTranscript, setEditingTranscript] = useState(false)
  const [draftTranscript, setDraftTranscript] = useState('')
  const [saving, setSaving] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const pendingUrl = note ? `/api/pending-tasks?noteId=${note.id}` : null
  const { data: pendingTasks = [], mutate: mutatePending } = useSWR<PendingTask[]>(
    pendingUrl,
    fetcher
  )

  useEffect(() => {
    if (note?.transcript) setDraftTranscript(note.transcript)
  }, [note?.id])

  async function patch(fields: Partial<MeetingNote>) {
    if (!note) return
    setSaving(true)
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) { toast.error('Failed to save'); return }
      onMutate()
    } finally {
      setSaving(false)
    }
  }

  async function acceptPending(id: string) {
    const res = await fetch(`/api/pending-tasks/${id}`, { method: 'POST' })
    if (!res.ok) { toast.error('Failed to accept task'); return }
    toast.success('Task created')
    mutatePending()
    onPendingTaskAccepted?.()
  }

  async function rejectPending(id: string) {
    const res = await fetch(`/api/pending-tasks/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to dismiss'); return }
    mutatePending()
  }

  function downloadTranscript() {
    if (!note?.transcript) return
    const blob = new Blob([note.transcript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${note.title ?? formatDate(note.meeting_date)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sentiment = note?.metadata?.insights?.sentimentHint ?? null
  const summary = note?.metadata?.insights?.summary ?? null

  const shown = !!note

  return (
    <div
      className={cn(
        'fixed right-0 top-0 bottom-0 z-50 w-[480px] bg-white border-l border-[#e5e2e1] shadow-2xl flex flex-col',
        'transition-transform duration-200 ease-out',
        shown ? 'translate-x-0' : 'translate-x-full'
      )}
      ref={panelRef}
    >
      {note && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-[#e5e2e1] shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <h2 className="text-base font-semibold text-[#1c1b1b] truncate">
                {note.title || formatDate(note.meeting_date)}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-[#737687]">{formatDate(note.meeting_date)}</span>
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', SOURCE_COLORS[note.source])}>
                  {SOURCE_LABELS[note.source]}
                </span>
                {sentiment && (
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium capitalize', SENTIMENT_COLORS[sentiment])}>
                    {sentiment}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 text-[#737687] hover:text-[#434655] transition-colors p-1 rounded hover:bg-[#f0edec]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Frequency */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#737687] mb-2">Frequency</p>
              <div className="flex gap-1.5 flex-wrap">
                {FREQUENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => patch({ frequency: note.frequency === opt.value ? null : opt.value })}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                      note.frequency === opt.value
                        ? 'bg-[#004bd8] text-white border-[#004bd8]'
                        : 'bg-white text-[#737687] border-[#e5e2e1] hover:border-[#004bd8] hover:text-[#004bd8]'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {summary && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#737687] mb-2">AI Summary</p>
                <p className="text-sm text-[#434655] leading-relaxed">{summary}</p>
              </div>
            )}

            {/* Notes content */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#737687] mb-2">Notes</p>
              <p className="text-sm text-[#434655] leading-relaxed whitespace-pre-wrap">{note.content}</p>
            </div>

            {/* Action Items (pending tasks for this note) */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#737687] mb-2">
                Action Items
                {pendingTasks.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold normal-case tracking-normal">
                    {pendingTasks.length}
                  </span>
                )}
              </p>
              {pendingTasks.length === 0 ? (
                <p className="text-xs text-[#737687]">No AI-suggested action items for this call.</p>
              ) : (
                <div className="space-y-2">
                  {pendingTasks.map((pt) => (
                    <div
                      key={pt.id}
                      className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50/60 border-l-4 border-l-amber-400"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                            <Sparkles className="w-2.5 h-2.5" />AI
                          </span>
                          {pt.confidence && (
                            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', CONFIDENCE_COLORS[pt.confidence] ?? CONFIDENCE_COLORS.low)}>
                              {pt.confidence}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-[#1c1b1b]">{pt.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {pt.assignee_name_raw && (
                            <span className="inline-flex items-center gap-1 text-xs text-[#737687]">
                              <User className="w-3 h-3" />{pt.assignee_name_raw}
                            </span>
                          )}
                          {pt.due_date && (
                            <span className="inline-flex items-center gap-1 text-xs text-[#737687]">
                              <Clock className="w-3 h-3" />{pt.due_date}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => acceptPending(pt.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#004bd8] text-white hover:bg-blue-700 transition-colors"
                        >
                          <Check className="w-3 h-3" />Accept
                        </button>
                        <button
                          onClick={() => rejectPending(pt.id)}
                          className="p-1 text-[#c3c5d8] hover:text-red-400 transition-colors rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transcript */}
            <div>
              <button
                onClick={() => setTranscriptOpen((v) => !v)}
                className="w-full flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-[#737687] hover:text-[#434655] transition-colors mb-2"
              >
                <span>Transcript</span>
                {transcriptOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {transcriptOpen && (
                <div className="space-y-2">
                  {note.transcript ? (
                    <>
                      {editingTranscript ? (
                        <>
                          <textarea
                            value={draftTranscript}
                            onChange={(e) => setDraftTranscript(e.target.value)}
                            rows={12}
                            className="w-full text-xs text-[#434655] leading-relaxed border border-[#e5e2e1] rounded-lg p-3 focus:outline-none focus:border-blue-400 resize-none font-mono"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={async () => { await patch({ transcript: draftTranscript }); setEditingTranscript(false) }}
                              disabled={saving}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-40"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingTranscript(false); setDraftTranscript(note.transcript ?? '') }}
                              className="text-xs text-[#737687] hover:text-[#434655]"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-[#434655] leading-relaxed whitespace-pre-wrap font-mono max-h-64 overflow-y-auto border border-[#f0edec] rounded-lg p-3 bg-[#f6f3f2]">
                            {note.transcript}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={downloadTranscript}
                              className="inline-flex items-center gap-1 text-xs text-[#737687] hover:text-[#434655] transition-colors"
                            >
                              <Download className="w-3 h-3" />Download .txt
                            </button>
                            <button
                              onClick={() => { setDraftTranscript(note.transcript ?? ''); setEditingTranscript(true) }}
                              className="text-xs text-[#737687] hover:text-[#434655] transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-[#737687]">No transcript attached.</p>
                      {!editingTranscript ? (
                        <button
                          onClick={() => { setDraftTranscript(''); setEditingTranscript(true) }}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Paste transcript
                        </button>
                      ) : (
                        <>
                          <textarea
                            autoFocus
                            value={draftTranscript}
                            onChange={(e) => setDraftTranscript(e.target.value)}
                            rows={10}
                            placeholder="Paste transcript here…"
                            className="w-full text-xs text-[#434655] leading-relaxed border border-[#e5e2e1] rounded-lg p-3 focus:outline-none focus:border-blue-400 resize-none font-mono"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={async () => { await patch({ transcript: draftTranscript }); setEditingTranscript(false) }}
                              disabled={saving || !draftTranscript.trim()}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-40"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTranscript(false)}
                              className="text-xs text-[#737687] hover:text-[#434655]"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  )
}
