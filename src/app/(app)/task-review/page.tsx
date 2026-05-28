'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { toast } from 'sonner'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAllPendingTasks } from '@/hooks/usePendingTasks'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import TaskReviewDialog from '@/components/tasks/TaskReviewDialog'
import type { PendingTask, Account, SyncRunLog, ConfidenceLevel } from '@/types/database'

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

const CONFIDENCE_ORDER: Record<ConfidenceLevel, number> = { high: 0, medium: 1, low: 2 }

function sortByConfidence(a: PendingTask, b: PendingTask): number {
  const aOrder = a.confidence ? CONFIDENCE_ORDER[a.confidence] : 3
  const bOrder = b.confidence ? CONFIDENCE_ORDER[b.confidence] : 3
  return aOrder - bOrder
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

function SyncStatusStrip({ log, syncing }: { log: SyncRunLog | null; syncing: boolean }) {
  if (!log && !syncing) return null

  const statusStyles: Record<SyncRunLog['status'], string> = {
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="flex items-center gap-3 py-2.5 px-4 rounded-lg bg-slate-50 border border-slate-100 text-sm text-slate-600 mb-6">
      {syncing ? (
        <>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
            running
          </span>
          <span>Sync in progress…</span>
        </>
      ) : log ? (
        <>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${statusStyles[log.status]}`}>
            {log.status}
          </span>
          <span>
            Last sync {timeAgo(log.started_at)}
            {' · '}
            {log.tasks_suggested} task{log.tasks_suggested !== 1 ? 's' : ''} suggested
          </span>
        </>
      ) : null}
    </div>
  )
}

interface PendingTaskRowProps {
  task: PendingTask
  onAccept: (task: PendingTask) => void
  onReject: (task: PendingTask) => void
  rejecting: boolean
}

function PendingTaskRow({ task, onAccept, onReject, rejecting }: PendingTaskRowProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <ConfidenceBadge confidence={task.confidence} />
          <TaskTypeBadge taskType={task.task_type} />
        </div>
        <p className="text-sm font-medium text-slate-900">{task.title}</p>
        {task.justification && (
          <p className="text-xs text-slate-400 italic mt-0.5">{task.justification}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {task.assignee_name_raw && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600 font-medium">
              {task.assignee_name_raw}
            </span>
          )}
          {task.due_date && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-600 font-medium">
              {task.due_date}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAccept(task)}
          className="text-xs h-7 px-2.5"
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onReject(task)}
          disabled={rejecting}
          className="text-xs h-7 px-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50"
        >
          Reject
        </Button>
      </div>
    </div>
  )
}

export default function TaskReviewPage() {
  const { data: pendingTasks, isLoading: tasksLoading, mutate: mutatePending } = useAllPendingTasks()
  const { data: accounts = [], isLoading: accountsLoading } = useSWR<Account[]>('/api/accounts', fetcher)
  const { data: syncLog, mutate: mutateSyncLog } = useSWR<SyncRunLog | null>('/api/calls/sync/status', fetcher)
  const { isAdmin } = useCurrentUser()

  const [selectedTask, setSelectedTask] = useState<PendingTask | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const accountNameMap = new Map<string, string>(
    accounts.map((a) => [a.id, a.name])
  )

  // Filter to only pending status
  const pending = pendingTasks.filter((t) => t.status === 'pending')

  // Group by account_id
  const grouped = new Map<string, PendingTask[]>()
  for (const task of pending) {
    const group = grouped.get(task.account_id) ?? []
    group.push(task)
    grouped.set(task.account_id, group)
  }

  // Sort within each group
  for (const [key, tasks] of grouped) {
    grouped.set(key, [...tasks].sort(sortByConfidence))
  }

  async function handleSync() {
    if (syncing) return
    setSyncing(true)
    try {
      const res = await fetch('/api/calls/sync', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error ?? 'Sync failed')
      }
      toast.success('Sync triggered — tasks will appear shortly')
      mutateSyncLog()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleReject(task: PendingTask) {
    setRejectingId(task.id)
    try {
      const res = await fetch(`/api/pending-tasks/${task.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error ?? 'Failed to reject task')
      }
      toast.success('Task dismissed')
      mutatePending()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject task')
    } finally {
      setRejectingId(null)
    }
  }

  const isLoading = tasksLoading || accountsLoading

  return (
    <div className="px-8 py-8 max-w-[860px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-[#1c1b1b] mb-1">
            Task Review
          </h1>
          <p className="text-[#434655] text-sm">
            {isLoading
              ? 'Loading…'
              : `${pending.length} task${pending.length !== 1 ? 's' : ''} pending across your portfolio`}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Calls
          </Button>
        )}
      </div>

      <div className="border-t border-slate-200 mt-4 mb-6" />

      {/* Sync status strip */}
      <SyncStatusStrip log={syncLog ?? null} syncing={syncing} />

      {/* Main content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-400 mb-4" />
          <h3 className="text-sm font-semibold text-slate-700 mb-1">All caught up</h3>
          <p className="text-xs text-slate-400">No pending AI-suggested tasks.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([accountId, tasks]) => {
            const accountName = accountNameMap.get(accountId) ?? accountId
            return (
              <div key={accountId}>
                <div className="flex items-center gap-2 mb-3">
                  <Link
                    href={`/accounts/${accountId}/tasks`}
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    {accountName}
                  </Link>
                  <span className="text-xs text-slate-400">
                    {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <PendingTaskRow
                      key={task.id}
                      task={task}
                      onAccept={(t) => setSelectedTask(t)}
                      onReject={handleReject}
                      rejecting={rejectingId === task.id}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Accept dialog */}
      <TaskReviewDialog
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onAccepted={() => {
          mutatePending()
          setSelectedTask(null)
        }}
      />
    </div>
  )
}
