'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { cn, formatDate, formatTaskId } from '@/lib/utils'
import type { Task, TaskPriority, Profile } from '@/types/database'
import { TASK_STATUS_LABELS } from '@/lib/constants'
import { isOverdue } from '@/lib/task-filters'
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import type { TaskStatus } from '@/types/database'

// ─── Priority dot ─────────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<TaskPriority, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-400',
  medium:   'bg-blue-400',
  low:      'bg-[#c3c5d8]',
}

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  showAccount,
  onOpenDetail,
  isDragOverlay = false,
}: {
  task: Task
  showAccount: boolean
  onOpenDetail: (task: Task) => void
  isDragOverlay?: boolean
}) {
  const overdue = isOverdue(task)
  const owner = task.owner as Pick<Profile, 'id' | 'full_name'> | null
  const account = task.account as { id: string; name: string } | null

  return (
    <div
      onClick={() => !isDragOverlay && onOpenDetail(task)}
      className={cn(
        'bg-white border border-[#e5e2e1] rounded-lg p-3 cursor-pointer transition-all',
        isDragOverlay
          ? 'shadow-xl rotate-[1.5deg] scale-[1.02] opacity-95'
          : 'hover:border-blue-200 hover:bg-blue-50/20 hover:shadow-sm'
      )}
    >
      {/* Top row: priority + account */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        {task.priority && task.priority !== 'medium' && (
          <span className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_DOT[task.priority])} />
        )}
        {showAccount && account && (
          <span className="text-[10px] font-medium text-[#737687] bg-[#f0edec] px-1.5 py-0.5 rounded truncate max-w-[120px]">
            {account.name}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-[#1c1b1b] line-clamp-2 leading-snug">{task.title}</p>

      {/* Footer: assignee + due date + task ID */}
      {(owner?.full_name || task.due_date || task.task_number) && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {owner?.full_name && (
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[8px] font-bold shrink-0">
                {owner.full_name[0].toUpperCase()}
              </div>
              <span className="text-xs text-[#737687] truncate max-w-[80px]">{owner.full_name}</span>
            </div>
          )}
          {task.due_date && (
            <span className={cn('inline-flex items-center gap-0.5 text-xs', overdue ? 'text-red-500 font-medium' : 'text-[#737687]')}>
              <Clock className="w-3 h-3 shrink-0" />{formatDate(task.due_date)}
            </span>
          )}
          {task.task_number && (
            <span className="ml-auto text-[10px] font-mono text-[#c3c5d8]">{formatTaskId(task)}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Draggable task card ──────────────────────────────────────────────────────

function DraggableTaskCard({
  task,
  showAccount,
  onOpenDetail,
}: {
  task: Task
  showAccount: boolean
  onOpenDetail: (task: Task) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0 : 1 }}
    >
      <TaskCard task={task} showAccount={showAccount} onOpenDetail={onOpenDetail} />
    </div>
  )
}

// ─── Board column ─────────────────────────────────────────────────────────────

const COLUMN_COLORS: Record<string, string> = {
  open:        'text-blue-600',
  in_progress: 'text-amber-600',
  completed:   'text-green-600',
  cancelled:   'text-[#737687]',
}

function BoardColumn({
  status,
  tasks,
  showAccount,
  onOpenDetail,
  isOver,
}: {
  status: TaskStatus
  tasks: Task[]
  showAccount: boolean
  onOpenDetail: (task: Task) => void
  isOver: boolean
}) {
  const [collapsed, setCollapsed] = useState(status === 'cancelled')
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <div className="flex flex-col min-w-0 w-full">
      {/* Column header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 mb-3 w-full"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-[#737687] shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-[#737687] shrink-0" />}
        <span className={cn('text-xs font-semibold', COLUMN_COLORS[status] ?? 'text-[#434655]')}>
          {TASK_STATUS_LABELS[status as TaskStatus]}
        </span>
        <span className="ml-1 text-[10px] font-bold text-[#737687] bg-[#e5e2e1] rounded-full px-1.5 py-0.5">
          {tasks.length}
        </span>
      </button>

      {/* Drop zone */}
      {!collapsed && (
        <div
          ref={setNodeRef}
          className={cn(
            'flex-1 space-y-2 min-h-[80px] rounded-lg p-1 transition-colors',
            isOver ? 'bg-blue-50/60 ring-2 ring-blue-200 ring-inset' : 'bg-transparent'
          )}
        >
          {tasks.length === 0 ? (
            <div className="text-center py-6 text-[#c3c5d8] text-xs">
              Nothing here
            </div>
          ) : (
            tasks.map((task) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                showAccount={showAccount}
                onOpenDetail={onOpenDetail}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TaskBoardViewProps {
  tasks: Task[]
  showAccount?: boolean
  onTaskUpdate: () => void
  onOpenDetail: (task: Task) => void
}

const BOARD_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'open',        label: 'Open' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'completed',   label: 'Completed' },
  { status: 'cancelled',   label: 'Cancelled' },
]

export default function TaskBoardView({ tasks, showAccount = false, onTaskUpdate, onOpenDetail }: TaskBoardViewProps) {
  const [draggingTask, setDraggingTask] = useState<Task | null>(null)
  const [overColumn, setOverColumn]     = useState<TaskStatus | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find(t => t.id === event.active.id)
    setDraggingTask(task ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    setOverColumn(event.over ? (String(event.over.id) as TaskStatus) : null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingTask(null)
    setOverColumn(null)
    const { active, over } = event
    if (!over) return
    const task = tasks.find(t => t.id === active.id)
    if (!task) return
    const newStatus = over.id as TaskStatus
    if (newStatus === task.status) return

    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) { toast.error('Failed to update task'); return }
    onTaskUpdate()
  }

  const tasksByStatus: Record<TaskStatus, Task[]> = {
    open: [], in_progress: [], completed: [], cancelled: [], pending_review: [],
  }
  for (const t of tasks) {
    if (t.status in tasksByStatus) tasksByStatus[t.status].push(t)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-4 gap-4 items-start">
        {BOARD_COLUMNS.map((col) => (
          <BoardColumn
            key={col.status}
            status={col.status}
            tasks={tasksByStatus[col.status]}
            showAccount={!!showAccount}
            onOpenDetail={onOpenDetail}
            isOver={overColumn === col.status}
          />
        ))}
      </div>

      <DragOverlay>
        {draggingTask && (
          <TaskCard
            task={draggingTask}
            showAccount={!!showAccount}
            onOpenDetail={() => {}}
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
