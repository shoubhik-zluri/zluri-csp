'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { Lock, Users, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task, TaskStatus, TaskPriority, TaskVisibility, SuccessPlan, Profile, Account, Project } from '@/types/database'
import { TASK_STATUS_LABELS, PRIORITY_LABELS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface TaskFormData {
  title: string
  description: string
  due_date: string
  priority: TaskPriority
  owner_id: string | null
  plan_id: string | null
  account_id: string | null
  project_id: string | null
  visibility: TaskVisibility
  // edit only
  status?: TaskStatus
}

const EMPTY: TaskFormData = {
  title: '',
  description: '',
  due_date: '',
  priority: 'medium',
  owner_id: null,
  plan_id: null,
  account_id: null,
  project_id: null,
  visibility: 'internal',
}

async function jsonFetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

const VISIBILITY_OPTIONS: { value: TaskVisibility; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'private', label: 'Private', icon: <Lock className="w-3.5 h-3.5" />, description: 'Only you' },
  { value: 'internal', label: 'Internal', icon: <Users className="w-3.5 h-3.5" />, description: 'Team only' },
  { value: 'external', label: 'External', icon: <Globe className="w-3.5 h-3.5" />, description: 'Customer-facing' },
]

interface TaskDefaultValues {
  title?: string
  description?: string
  due_date?: string
  owner_id?: string | null
  account_id?: string | null
  project_id?: string | null
}

interface TaskDialogProps {
  open: boolean
  onClose: () => void
  accountId?: string
  task?: Task
  onSaved?: (created?: Task) => void
  defaultVisibility?: TaskVisibility
  defaultValues?: TaskDefaultValues
}

export default function TaskDialog({ open, onClose, accountId, task, onSaved, defaultVisibility, defaultValues }: TaskDialogProps) {
  const isEdit = !!task
  const [form, setForm] = useState<TaskFormData>(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (task) {
        setForm({
          title: task.title,
          description: task.description ?? '',
          due_date: task.due_date ?? '',
          priority: task.priority ?? 'medium',
          owner_id: task.owner_id,
          plan_id: task.plan_id,
          account_id: task.account_id,
          project_id: task.project_id,
          visibility: task.visibility ?? 'internal',
          status: task.status,
        })
      } else {
        setForm({
          ...EMPTY,
          account_id: accountId ?? defaultValues?.account_id ?? null,
          visibility: defaultVisibility ?? 'internal',
          ...(defaultValues ? {
            title: defaultValues.title ?? '',
            description: defaultValues.description ?? '',
            due_date: defaultValues.due_date ?? '',
            owner_id: defaultValues.owner_id ?? null,
            project_id: defaultValues.project_id ?? null,
          } : {}),
        })
      }
    }
  }, [open, task, accountId, defaultVisibility])

  const effectiveAccountId = accountId ?? form.account_id

  const { data: plansData } = useSWR(
    open && effectiveAccountId ? `/api/tasks?accountId=${effectiveAccountId}` : null,
    jsonFetcher
  )
  const { data: projectsData } = useSWR<Project[]>(
    open && effectiveAccountId ? `/api/projects?accountId=${effectiveAccountId}` : null,
    jsonFetcher
  )
  const { data: users } = useSWR<Profile[]>(open ? '/api/users' : null, jsonFetcher)
  const { data: accounts } = useSWR<Account[]>(open && !accountId ? '/api/accounts' : null, jsonFetcher)

  const plans: SuccessPlan[] = plansData?.plans ?? []
  const projects: Project[] = projectsData ?? []

  function update<K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value }
      // Clear account-dependent fields when account changes
      if (key === 'account_id') { next.project_id = null; next.plan_id = null }
      return next
    })
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    const resolvedAccountId = accountId ?? form.account_id
    if (!isEdit && form.visibility !== 'private' && !resolvedAccountId) {
      toast.error('Account is required for internal and external tasks')
      return
    }

    setSaving(true)
    try {
      if (isEdit && task) {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            description: form.description || null,
            due_date: form.due_date || null,
            priority: form.priority,
            owner_id: form.owner_id,
            plan_id: form.plan_id,
            project_id: form.project_id,
            visibility: form.visibility,
            status: form.status,
          }),
        })
        if (!res.ok) { toast.error('Failed to update task'); return }
        toast.success('Task updated')
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            description: form.description || null,
            due_date: form.due_date || null,
            priority: form.priority,
            owner_id: form.owner_id,
            plan_id: form.plan_id,
            project_id: form.project_id,
            account_id: resolvedAccountId,
            visibility: form.visibility,
          }),
        })
        if (!res.ok) { toast.error('Failed to create task'); return }
        const created: Task = await res.json()
        toast.success('Task created')
        onSaved?.(created)
        onClose()
        return
      }
      onSaved?.()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const EDIT_STATUSES: TaskStatus[] = ['pending_review', 'open', 'in_progress', 'completed', 'cancelled']

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">

          {/* Visibility segmented control */}
          <div>
            <label className="text-xs font-medium text-[#434655]">Visibility</label>
            <div className="flex mt-1 border border-[#e5e2e1] rounded-lg overflow-hidden">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update('visibility', opt.value)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors border-r border-[#e5e2e1] last:border-r-0',
                    form.visibility === opt.value
                      ? 'bg-[#1c1b1b] text-white'
                      : 'text-[#737687] hover:bg-[#f6f3f2]'
                  )}
                >
                  {opt.icon}{opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#434655]">Title *</label>
            <Input value={form.title} onChange={(e) => update('title', e.target.value)} className="mt-1" autoFocus />
          </div>
          <div>
            <label className="text-xs font-medium text-[#434655]">Description</label>
            <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} className="mt-1" rows={2} />
          </div>

          {/* Account selector — only when no accountId prop and not editing */}
          {!accountId && !isEdit && (
            <div>
              <label className="text-xs font-medium text-[#434655]">
                Account {form.visibility !== 'private' ? '*' : <span className="text-[#737687] font-normal">(optional)</span>}
              </label>
              <Select value={form.account_id ?? '__none'} onValueChange={(v) => update('account_id', v === '__none' ? null : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue>
                    {form.account_id
                      ? ((accounts ?? []).find(a => a.id === form.account_id)?.name ?? '…')
                      : 'No account'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No account</SelectItem>
                  {(accounts ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Project selector — always shown for non-private; disabled until account selected */}
          {form.visibility !== 'private' && (
            <div>
              <label className="text-xs font-medium text-[#434655]">Project <span className="text-[#737687] font-normal">(optional)</span></label>
              <Select
                value={form.project_id ?? '__none'}
                onValueChange={(v) => update('project_id', v === '__none' ? null : v)}
                disabled={!effectiveAccountId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue>
                    {form.project_id
                      ? (projects.find(p => p.id === form.project_id)?.name ?? '…')
                      : (effectiveAccountId ? 'No project' : 'Select an account first')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No project</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#434655]">Due Date</label>
              <Input type="date" value={form.due_date} onChange={(e) => update('due_date', e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#434655]">Priority</label>
              <Select value={form.priority} onValueChange={(v) => v && update('priority', v as TaskPriority)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="text-xs font-medium text-[#434655]">Assignee</label>
            <Select value={form.owner_id ?? '__none__'} onValueChange={(v) => update('owner_id', v === '__none__' ? null : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue>
                  {form.owner_id
                    ? (users ?? []).find((u) => u.id === form.owner_id)?.full_name ?? '…'
                    : 'Unassigned'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {(users ?? []).map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Status — edit mode only */}
          {isEdit && (
            <div>
              <label className="text-xs font-medium text-[#434655]">Status</label>
              <Select value={form.status} onValueChange={(v) => v && update('status', v as TaskStatus)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EDIT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {plans.length > 0 && (
            <div>
              <label className="text-xs font-medium text-[#434655]">Success Plan</label>
              <Select value={form.plan_id ?? '__none'} onValueChange={(v) => update('plan_id', v === '__none' ? null : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue>
                    {form.plan_id
                      ? (plans.find(p => p.id === form.plan_id)?.name ?? '…')
                      : 'No plan'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No plan</SelectItem>
                  {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
