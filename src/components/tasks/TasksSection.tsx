'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { Task, SuccessPlan, TaskStatus } from '@/types/database'
import { formatDate, cn } from '@/lib/utils'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react'

interface TaskFormData {
  title: string
  description: string
  due_date: string
  status: TaskStatus
  plan_id: string | null
}

const EMPTY_TASK: TaskFormData = { title: '', description: '', due_date: '', status: 'open', plan_id: null }

function TaskDialog({
  open, onClose, initial = EMPTY_TASK, title, onSave, plans,
}: {
  open: boolean
  onClose: () => void
  initial?: TaskFormData
  title: string
  onSave: (data: TaskFormData) => Promise<void>
  plans: SuccessPlan[]
}) {
  const [form, setForm] = useState<TaskFormData>(initial)

  function handleClose() {
    setForm(initial)
    onClose()
  }
  const [saving, setSaving] = useState(false)

  function update(key: keyof TaskFormData, value: string | null) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try { await onSave(form); onClose() } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#434655]">Title *</label>
            <Input value={form.title} onChange={(e) => update('title', e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#434655]">Description</label>
            <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} className="mt-1" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#434655]">Due Date</label>
              <Input type="date" value={form.due_date} onChange={(e) => update('due_date', e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#434655]">Status</label>
              <Select value={form.status} onValueChange={(v) => v && update('status', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['open', 'in_progress', 'completed', 'cancelled'] as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {plans.length > 0 && (
            <div>
              <label className="text-xs font-medium text-[#434655]">Success Plan</label>
              <Select value={form.plan_id ?? '__none'} onValueChange={(v) => update('plan_id', v === '__none' ? null : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="No plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No plan</SelectItem>
                  {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TaskRow({ task, plans, onMutate }: { task: Task; plans: SuccessPlan[]; onMutate: () => void }) {
  const [editing, setEditing] = useState(false)

  async function quickToggleStatus() {
    const next: TaskStatus = task.status === 'completed' ? 'open' : 'completed'
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (!res.ok) { toast.error('Failed to update'); return }
    onMutate()
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return
    const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); return }
    toast.success('Task deleted')
    onMutate()
  }

  async function handleEdit(form: TaskFormData) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) { toast.error('Failed to update'); return }
    toast.success('Task updated')
    onMutate()
  }

  const isOverdue = task.due_date && task.status !== 'completed' && new Date(`${task.due_date}T00:00:00`) < new Date()

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border transition-colors',
      task.status === 'completed' ? 'border-[#f0edec] bg-[#f6f3f2] opacity-60' : 'border-[#e5e2e1] bg-white'
    )}>
      <button onClick={quickToggleStatus} className="mt-0.5 shrink-0 text-[#737687] hover:text-blue-600 transition-colors">
        {task.status === 'completed'
          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
          : <Circle className="w-4 h-4" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium', task.status === 'completed' && 'line-through text-[#737687]')}>
            {task.title}
          </span>
          <span className={cn('px-1.5 py-0.5 rounded text-xs', TASK_STATUS_COLORS[task.status])}>
            {TASK_STATUS_LABELS[task.status]}
          </span>
        </div>
        {task.description && <p className="text-xs text-[#737687] mt-0.5 truncate">{task.description}</p>}
        {task.due_date && (
          <div className={cn('flex items-center gap-1 mt-1 text-xs', isOverdue ? 'text-red-500' : 'text-[#737687]')}>
            <Clock className="w-3 h-3" />
            {isOverdue ? 'Overdue · ' : ''}{formatDate(task.due_date)}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" className="w-7 h-7 p-0" onClick={() => setEditing(true)}>
          <Pencil className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="sm" className="w-7 h-7 p-0 text-red-400 hover:text-red-600" onClick={handleDelete}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      {editing && (
        <TaskDialog
          open
          onClose={() => setEditing(false)}
          title="Edit Task"
          initial={{ title: task.title, description: task.description ?? '', due_date: task.due_date ?? '', status: task.status, plan_id: task.plan_id }}
          plans={plans}
          onSave={handleEdit}
        />
      )}
    </div>
  )
}

interface TasksSectionProps {
  plans: SuccessPlan[]
  unplanned: Task[]
  accountId: string
  isLoading?: boolean
  onMutate: () => void
}

export default function TasksSection({ plans, unplanned, accountId, isLoading, onMutate }: TasksSectionProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [collapsedPlans, setCollapsedPlans] = useState<Set<string>>(new Set())

  function togglePlan(id: string) {
    setCollapsedPlans((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAddTask(form: TaskFormData) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, account_id: accountId }),
    })
    if (!res.ok) { toast.error('Failed to create task'); return }
    toast.success('Task created')
    onMutate()
  }

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-[#f0edec] rounded animate-pulse" />)}</div>

  const allPlans = plans ?? []

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Task
        </Button>
      </div>

      {/* Success Plans — hidden in Beta */}
      {false && allPlans.map((plan) => {
        const isCollapsed = collapsedPlans.has(plan.id)
        const planTasks = (plan.tasks ?? []) as Task[]
        return (
          <div key={plan.id} className="mb-4">
            <button
              onClick={() => togglePlan(plan.id)}
              className="flex items-center gap-2 text-sm font-semibold text-[#434655] mb-2 hover:text-[#1c1b1b] transition-colors"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {plan.name}
              <span className="text-xs text-[#737687] font-normal ml-1">{planTasks.length} tasks</span>
            </button>
            {!isCollapsed && (
              <div className="pl-4 space-y-2">
                {planTasks.length === 0
                  ? <p className="text-xs text-[#737687]">No tasks in this plan.</p>
                  : planTasks.map((t) => <TaskRow key={t.id} task={t} plans={allPlans} onMutate={onMutate} />)
                }
              </div>
            )}
          </div>
        )
      })}

      {/* Unplanned tasks */}
      {unplanned.length > 0 && (
        <div>
          {allPlans.length > 0 && (
            <div className="text-xs font-semibold text-[#737687] uppercase tracking-wider mb-2">Unplanned</div>
          )}
          <div className="space-y-2">
            {unplanned.map((t) => <TaskRow key={t.id} task={t} plans={allPlans} onMutate={onMutate} />)}
          </div>
        </div>
      )}

      {allPlans.length === 0 && unplanned.length === 0 && (
        <div className="text-center py-12 text-[#737687] text-sm">No tasks yet.</div>
      )}

      <TaskDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Task"
        plans={allPlans}
        onSave={handleAddTask}
      />
    </div>
  )
}
