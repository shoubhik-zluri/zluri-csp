'use client'

import Link from 'next/link'
import { useMyTasks } from '@/hooks/useTasks'
import { formatDate, cn } from '@/lib/utils'
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/lib/constants'
import type { Task, Account } from '@/types/database'
import { CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { mutate } from 'swr'

export default function MyTasksWidget() {
  const { tasks, isLoading, mutate: refresh } = useMyTasks()

  async function markComplete(task: Task) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    if (!res.ok) { toast.error('Failed to update'); return }
    refresh()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isLoading) return <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />

  const overdue = tasks.filter((t) => t.due_date && new Date(`${t.due_date}T00:00:00`) < today)
  const upcoming = tasks.filter((t) => !t.due_date || new Date(`${t.due_date}T00:00:00`) >= today)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-400" />
        My Tasks
        {tasks.length > 0 && (
          <span className="ml-auto text-xs text-slate-400 font-normal">{tasks.length} pending</span>
        )}
      </h3>

      {tasks.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">All caught up!</p>
      ) : (
        <div className="space-y-2">
          {overdue.length > 0 && (
            <div className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">Overdue</div>
          )}
          {[...overdue, ...upcoming].map((task) => {
            const account = task.account as Pick<Account, 'id' | 'name'> | null
            const isTaskOverdue = task.due_date && new Date(`${task.due_date}T00:00:00`) < today
            return (
              <div key={task.id} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 group">
                <button
                  onClick={() => markComplete(task)}
                  className="mt-0.5 shrink-0 text-slate-300 hover:text-green-500 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {account && (
                      <Link href={`/accounts/${account.id}/tasks`} className="text-xs text-blue-500 hover:underline truncate">
                        {account.name}
                      </Link>
                    )}
                    {task.due_date && (
                      <span className={cn('text-xs', isTaskOverdue ? 'text-red-500' : 'text-slate-400')}>
                        {isTaskOverdue ? '⚠ ' : ''}{formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
