'use client'

import { cn } from '@/lib/utils'
import type { MeetingNote, NoteSource, CallLogFrequency } from '@/types/database'
import { formatDate } from '@/lib/utils'

const SOURCE_LABELS: Record<NoteSource, string> = {
  manual: 'Manual',
  granola: 'Granola',
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  clari_copilot: 'Clari',
}

const SOURCE_COLORS: Record<NoteSource, string> = {
  manual: 'bg-[#f0edec] text-[#434655]',
  granola: 'bg-purple-100 text-purple-700',
  google_meet: 'bg-blue-100 text-blue-700',
  zoom: 'bg-cyan-100 text-cyan-700',
  clari_copilot: 'bg-orange-100 text-orange-700',
}

const FREQUENCY_LABELS: Record<CallLogFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  ad_hoc: 'Ad hoc',
}

const FREQUENCY_COLORS: Record<CallLogFrequency, string> = {
  weekly: 'bg-blue-50 text-blue-700',
  biweekly: 'bg-blue-50 text-blue-600',
  monthly: 'bg-indigo-50 text-indigo-700',
  quarterly: 'bg-violet-50 text-violet-700',
  ad_hoc: 'bg-[#f0edec] text-[#737687]',
}

const SENTIMENT_COLORS = {
  positive: 'bg-green-50 text-green-700',
  neutral: 'bg-[#f0edec] text-[#737687]',
  negative: 'bg-red-50 text-red-600',
}

interface CallLogTableViewProps {
  notes: MeetingNote[]
  onSelect: (note: MeetingNote) => void
  onDelete: (id: string) => void
}

export default function CallLogTableView({ notes, onSelect, onDelete }: CallLogTableViewProps) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-16 text-[#737687] text-sm">
        No call logs yet.
      </div>
    )
  }

  return (
    <div className="border border-[#e5e2e1] rounded-xl overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-[#e5e2e1] bg-[#f6f3f2]">
            <th className="px-4 py-2.5 text-xs font-semibold text-[#737687]">Call Title</th>
            <th className="px-4 py-2.5 text-xs font-semibold text-[#737687] w-32">Date</th>
            <th className="px-4 py-2.5 text-xs font-semibold text-[#737687] w-28">Frequency</th>
            <th className="px-4 py-2.5 text-xs font-semibold text-[#737687] w-28">Sentiment</th>
            <th className="px-4 py-2.5 text-xs font-semibold text-[#737687] w-28">Source</th>
            <th className="px-4 py-2.5 w-12" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0edec]">
          {notes.map((note) => {
            const sentiment = note.metadata?.insights?.sentimentHint ?? null
            return (
              <tr
                key={note.id}
                onClick={() => onSelect(note)}
                className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
              >
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-[#1c1b1b]">
                    {note.title || formatDate(note.meeting_date)}
                  </span>
                  {note.title && (
                    <span className="ml-2 text-xs text-[#737687]">{formatDate(note.meeting_date)}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-[#737687] whitespace-nowrap">
                  {formatDate(note.meeting_date)}
                </td>
                <td className="px-4 py-3">
                  {note.frequency ? (
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap', FREQUENCY_COLORS[note.frequency])}>
                      {FREQUENCY_LABELS[note.frequency]}
                    </span>
                  ) : (
                    <span className="text-[#c3c5d8] text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {sentiment ? (
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium capitalize whitespace-nowrap', SENTIMENT_COLORS[sentiment])}>
                      {sentiment}
                    </span>
                  ) : (
                    <span className="text-[#c3c5d8] text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap', SOURCE_COLORS[note.source])}>
                    {SOURCE_LABELS[note.source]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(note.id) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[#c3c5d8] hover:text-red-400 p-1 rounded"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
