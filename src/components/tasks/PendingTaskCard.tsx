'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Sparkles, Clock, User, Check, X, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PendingTask } from '@/types/database'

interface PendingTaskCardProps {
  pendingTask: PendingTask
  onAccepted: () => void
  onRejected: () => void
  onEditAccept?: (pendingTask: PendingTask) => void
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high:   'bg-green-50 text-green-700',
  medium: 'bg-amber-50 text-amber-700',
  low:    'bg-[#f0edec] text-[#737687]',
}

export default function PendingTaskCard({ pendingTask, onAccepted, onRejected, onEditAccept }: PendingTaskCardProps) {
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const noteLabel = pendingTask.note?.title
    ?? (pendingTask.note?.meeting_date ? `Call on ${pendingTask.note.meeting_date}` : null)
    ?? 'a call log'

  async function handleAccept() {
    setAccepting(true)
    try {
      const res = await fetch(`/api/pending-tasks/${pendingTask.id}`, { method: 'POST' })
      if (!res.ok) { toast.error('Failed to accept task'); return }
      toast.success('Task created')
      onAccepted()
    } finally {
      setAccepting(false)
    }
  }

  async function handleReject() {
    setRejecting(true)
    try {
      const res = await fetch(`/api/pending-tasks/${pendingTask.id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Failed to dismiss suggestion'); return }
      onRejected()
    } finally {
      setRejecting(false)
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 pl-4 rounded-lg border border-amber-200 bg-amber-50/60 border-l-4 border-l-amber-400">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
            <Sparkles className="w-2.5 h-2.5" />AI suggestion
          </span>
          {pendingTask.confidence && (
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', CONFIDENCE_COLORS[pendingTask.confidence] ?? CONFIDENCE_COLORS.low)}>
              {pendingTask.confidence} confidence
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-[#1c1b1b]">{pendingTask.title}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-[#737687]">From {noteLabel}</span>
          {pendingTask.account?.name && (
            <span className="text-xs text-[#737687]">{pendingTask.account.name}</span>
          )}
          {pendingTask.assignee_name_raw && (
            <span className="inline-flex items-center gap-1 text-xs text-[#737687]">
              <User className="w-3 h-3" />{pendingTask.assignee_name_raw}
            </span>
          )}
          {pendingTask.due_date && (
            <span className="inline-flex items-center gap-1 text-xs text-[#737687]">
              <Clock className="w-3 h-3" />{pendingTask.due_date}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleAccept}
          disabled={accepting || rejecting}
          title="Accept as-is"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-[#004bd8] text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Check className="w-3 h-3" />{accepting ? '…' : 'Accept'}
        </button>
        {onEditAccept && (
          <button
            onClick={() => onEditAccept(pendingTask)}
            disabled={accepting || rejecting}
            title="Edit before accepting"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-[#e5e2e1] text-[#434655] hover:border-blue-300 hover:text-blue-600 transition-colors disabled:opacity-50"
          >
            <Pencil className="w-3 h-3" />Edit
          </button>
        )}
        <button
          onClick={handleReject}
          disabled={accepting || rejecting}
          title="Dismiss suggestion"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-[#737687] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
