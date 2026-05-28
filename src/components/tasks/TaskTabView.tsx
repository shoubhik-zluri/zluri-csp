'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Clock, Circle, CheckCircle2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task, Profile, TaskPriority, PendingTask, TaskVisibility } from '@/types/database'
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, VISIBILITY_COLORS } from '@/lib/constants'
import { isOverdue } from '@/lib/task-filters'
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import PendingTaskCard from './PendingTaskCard'
import TaskDialog from './TaskDialog'

// ─── Priority badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: TaskPriority | null }) {
  if (!priority || priority === 'medium') return null
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', PRIORITY_COLORS[priority])}>
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

// ─── Sortable row wrapper ──────────────────────────────────────────────────────

function SortableTaskRow({ task, children }: { task: Task; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="relative group/row"
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/row:opacity-100 cursor-grab active:cursor-grabbing text-[#c3c5d8] hover:text-[#737687] transition-opacity"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      {children}
    </div>
  )
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  showAccount,
  onMutate,
  onOpenDetail,
  actions,
}: {
  task: Task
  showAccount?: boolean
  onMutate: () => void
  onOpenDetail: (task: Task) => void
  actions?: React.ReactNode
}) {
  const overdue = isOverdue(task)
  const account = task.account as { id: string; name: string } | null
  const owner = task.owner as Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null

  async function toggleComplete(e: React.MouseEvent) {
    e.stopPropagation()
    const next = task.status === 'completed' ? 'open' : 'completed'
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (!res.ok) { toast.error('Failed to update task'); return }
    onMutate()
  }

  return (
    <div
      onClick={() => onOpenDetail(task)}
      className={cn(
        'flex items-start gap-3 p-3 pl-7 rounded-lg border transition-colors cursor-pointer',
        task.status === 'completed' ? 'border-[#e5e2e1] bg-[#f6f3f2] opacity-60' : 'border-[#e5e2e1] bg-white hover:border-blue-200 hover:bg-blue-50/30'
      )}
    >
      {task.status !== 'pending_review' && (
        <button onClick={toggleComplete} className="mt-0.5 shrink-0 text-[#c3c5d8] hover:text-blue-500 transition-colors">
          {task.status === 'completed'
            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
            : <Circle className="w-4 h-4" />}
        </button>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-sm font-medium', task.status === 'completed' && 'line-through text-[#737687]')}>
            {task.title}
          </span>
          <PriorityBadge priority={task.priority} />
          <span className={cn('px-1.5 py-0.5 rounded text-[10px]', TASK_STATUS_COLORS[task.status])}>
            {TASK_STATUS_LABELS[task.status]}
          </span>
          {task.visibility === 'external' && (
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', VISIBILITY_COLORS['external'])}>
              External
            </span>
          )}
        </div>
        {task.description && <p className="text-xs text-[#737687] mt-0.5 truncate">{task.description}</p>}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {task.due_date && (
            <div className={cn('flex items-center gap-1 text-xs', overdue ? 'text-red-500 font-medium' : 'text-[#737687]')}>
              <Clock className="w-3 h-3" />
              {overdue ? 'Overdue · ' : ''}{task.due_date}
            </div>
          )}
          {owner?.full_name && <span className="text-xs text-[#737687]">{owner.full_name}</span>}
          {showAccount && account && (
            <Link href={`/accounts/${account.id}/tasks`} className="text-xs text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
              {account.name}
            </Link>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </div>
  )
}

// ─── Accept/Reject actions ────────────────────────────────────────────────────

function PendingActions({ task, onMutate }: { task: Task; onMutate: () => void }) {
  const [confirming, setConfirming] = useState(false)

  async function accept() {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'open' }),
    })
    if (!res.ok) { toast.error('Failed to accept task'); return }
    toast.success('Task accepted')
    onMutate()
  }

  async function reject() {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    if (!res.ok) { toast.error('Failed to reject task'); return }
    toast.success('Task rejected')
    setConfirming(false)
    onMutate()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-[#737687]">Reject?</span>
        <button onClick={reject} className="text-xs font-semibold text-red-500 hover:text-red-700">Yes</button>
        <button onClick={() => setConfirming(false)} className="text-xs text-[#737687] hover:text-[#434655]">No</button>
      </div>
    )
  }

  return (
    <>
      <button onClick={accept} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-1">Accept</button>
      <button onClick={() => setConfirming(true)} className="text-xs font-semibold text-red-400 hover:text-red-600 px-1">Reject</button>
    </>
  )
}

// ─── Main component (pure renderer — no tabs, no filters) ─────────────────────

interface TaskTabViewProps {
  tasks: Task[]              // pre-filtered and pre-sorted by TasksViewShell
  showAccount?: boolean
  showPendingActions?: boolean
  pendingTasks?: PendingTask[]
  onTaskUpdate: () => void
  onOpenDetail: (task: Task) => void
  onDragEnd: (event: DragEndEvent) => void
  onPendingTasksUpdate?: () => void
}

export default function TaskTabView({
  tasks,
  showAccount,
  showPendingActions,
  pendingTasks,
  onTaskUpdate,
  onOpenDetail,
  onDragEnd,
  onPendingTasksUpdate,
}: TaskTabViewProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const hasPendingTasks = pendingTasks && pendingTasks.length > 0
  const [editPending, setEditPending] = useState<PendingTask | null>(null)

  async function handleEditAcceptSaved(created?: Task) {
    if (!editPending || !created) return
    await fetch(`/api/pending-tasks/${editPending.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference_task_id: created.id }),
    })
    setEditPending(null)
    onPendingTasksUpdate?.()
    onTaskUpdate()
  }

  if (tasks.length === 0 && !hasPendingTasks) {
    return (
      <div className="text-center py-12 text-[#737687] text-sm">
        No tasks match the current filters.
      </div>
    )
  }

  const editPendingAccountId = (editPending?.account as { id: string } | null)?.id ?? editPending?.account_id ?? undefined

  return (
    <div className="space-y-4">
      {/* Edit & Accept dialog */}
      <TaskDialog
        open={!!editPending}
        onClose={() => setEditPending(null)}
        accountId={editPendingAccountId}
        defaultVisibility={'internal' as TaskVisibility}
        defaultValues={editPending ? {
          title: editPending.title,
          description: editPending.description ?? undefined,
          due_date: editPending.due_date ?? undefined,
          owner_id: editPending.assignee_id ?? null,
          account_id: editPendingAccountId ?? null,
        } : undefined}
        onSaved={handleEditAcceptSaved}
      />

      {/* AI-suggested pending tasks — shown above regular tasks in Pending Review */}
      {hasPendingTasks && (
        <div className="space-y-2">
          {pendingTasks!.map((pt) => (
            <PendingTaskCard
              key={pt.id}
              pendingTask={pt}
              onAccepted={() => { onPendingTasksUpdate?.(); onTaskUpdate() }}
              onRejected={() => onPendingTasksUpdate?.()}
              onEditAccept={setEditPending}
            />
          ))}
        </div>
      )}

      {/* Regular tasks */}
      {tasks.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {tasks.map((task) => (
                <SortableTaskRow key={task.id} task={task}>
                  <TaskRow
                    task={task}
                    showAccount={showAccount}
                    onMutate={onTaskUpdate}
                    onOpenDetail={onOpenDetail}
                    actions={showPendingActions ? (
                      <PendingActions task={task} onMutate={onTaskUpdate} />
                    ) : undefined}
                  />
                </SortableTaskRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
