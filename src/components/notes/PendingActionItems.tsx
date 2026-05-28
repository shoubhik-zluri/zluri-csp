'use client'

import Link from 'next/link'
import type { PendingTask, ConfidenceLevel } from '@/types/database'
import { usePendingTasks } from '@/hooks/usePendingTasks'

interface Props {
  noteId: string
  accountId: string
}

function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel | null | undefined }) {
  if (!confidence) return null
  const styles: Record<ConfidenceLevel, string> = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-100 text-slate-500',
  }
  return (
    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${styles[confidence]}`}>
      {confidence}
    </span>
  )
}

function TaskTypeBadge({ taskType }: { taskType: PendingTask['task_type'] }) {
  if (taskType === 'action_item') return null
  if (taskType === 'risk') {
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
        Risk
      </span>
    )
  }
  return (
    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
      Expansion
    </span>
  )
}

export default function PendingActionItems({ noteId, accountId }: Props) {
  const { data: allPending, isLoading } = usePendingTasks(accountId)

  if (isLoading) return null

  const items = allPending.filter(
    (item) => item.note_id === noteId && item.status === 'pending'
  )

  if (items.length === 0) return null

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI-suggested tasks</p>
        <Link href="/task-review" className="text-xs text-blue-600 hover:underline">Review →</Link>
      </div>
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <ConfidenceBadge confidence={item.confidence} />
            <TaskTypeBadge taskType={item.task_type} />
            <span className="text-sm text-slate-800">{item.title}</span>
          </div>
          {item.justification && (
            <p className="text-xs text-slate-500 italic">{item.justification}</p>
          )}
          {item.assignee_name_raw && (
            <p className="text-xs text-slate-600">→ {item.assignee_name_raw}</p>
          )}
          {item.due_date && (
            <p className="text-xs text-slate-400">{item.due_date}</p>
          )}
        </div>
      ))}
    </div>
  )
}
