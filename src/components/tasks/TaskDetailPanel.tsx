'use client'

import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { X, CheckSquare, Square, Plus, Trash2, MessageSquare, Clock, User, GripVertical, Building2, Folder, Lock, Users, Globe, Link2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { cn, formatDate, formatTaskId } from '@/lib/utils'
import type { Task, TaskComment, ChecklistItem, Profile, TaskStatus, TaskPriority, TaskVisibility, Account, Project, TaskDependencyEntry } from '@/types/database'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, VISIBILITY_LABELS, VISIBILITY_COLORS } from '@/lib/constants'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CommentRenderer, TiptapInlineEditor } from './TiptapCommentEditor'
import TiptapCommentEditor from './TiptapCommentEditor'
import CustomFieldsSection from './CustomFieldsSection'
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Sortable checklist item ──────────────────────────────────────────────────

function SortableChecklistItem({
  item, onToggle, onDelete,
}: {
  item: ChecklistItem
  onToggle: (item: ChecklistItem) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-1.5 group py-0.5"
    >
      <button
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-[#c3c5d8] hover:text-[#737687] shrink-0"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => onToggle(item)} className="shrink-0 text-[#737687] hover:text-blue-600 transition-colors">
        {item.is_checked
          ? <CheckSquare className="w-4 h-4 text-[#176e00]" />
          : <Square className="w-4 h-4" />}
      </button>
      {/* Render as CommentRenderer to support @mentions in text */}
      <div className={cn('flex-1 min-w-0', item.is_checked && 'line-through opacity-50')}>
        <CommentRenderer content={item.text} />
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-[#c3c5d8] hover:text-red-400 shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Dependencies section ─────────────────────────────────────────────────────

function DependencyRow({
  entry,
  onRemove,
  onOpen,
  taskDueDate,
}: {
  entry: TaskDependencyEntry
  onRemove: (depId: string) => void
  onOpen: (id: string) => void
  taskDueDate?: string | null
}) {
  const dueLate = entry.due_date && taskDueDate && entry.due_date > taskDueDate

  return (
    <div className="flex items-center gap-2 py-1 group/dep">
      <div
        className={cn('flex-1 flex items-center gap-2 min-w-0 cursor-pointer hover:text-blue-600 transition-colors')}
        onClick={() => onOpen(entry.id)}
      >
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0', TASK_STATUS_COLORS[entry.status])}>
          {TASK_STATUS_LABELS[entry.status]}
        </span>
        <span className="text-xs text-[#1c1b1b] truncate">{entry.title}</span>
        {entry.task_number && (
          <span className="text-[10px] font-mono text-[#c3c5d8] shrink-0">{formatTaskId(entry)}</span>
        )}
        {dueLate && (
          <span title="Dependency due after this task" className="shrink-0 text-amber-500">
            <AlertTriangle className="w-3 h-3" />
          </span>
        )}
      </div>
      {entry.due_date && (
        <span className="text-[10px] text-[#737687] shrink-0">{formatDate(entry.due_date)}</span>
      )}
      <button
        onClick={() => onRemove(entry.dep_id)}
        className="opacity-0 group-hover/dep:opacity-100 text-[#c3c5d8] hover:text-red-400 transition-colors shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

function DependenciesSection({
  taskId,
  taskDueDate,
  accountId,
  onOpenTask,
}: {
  taskId: string
  taskDueDate?: string | null
  accountId?: string | null
  onOpenTask: (taskId: string) => void
}) {
  const { data, mutate } = useSWR<{ blocked_by: TaskDependencyEntry[]; blocking: TaskDependencyEntry[] }>(
    `/api/tasks/${taskId}/dependencies`,
    fetcher
  )
  const { data: allTasks = [] } = useSWR<Task[]>('/api/tasks/all', fetcher)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)

  const blockedBy = data?.blocked_by ?? []
  const blocking  = data?.blocking  ?? []

  const searchResults = search.trim().length > 1
    ? allTasks.filter(t =>
        t.id !== taskId &&
        !blockedBy.some(d => d.id === t.id) &&
        t.title.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : []

  async function addDependency(dependsOnId: string) {
    setSearch('')
    setAdding(false)
    const res = await fetch(`/api/tasks/${taskId}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depends_on_id: dependsOnId }),
    })
    if (!res.ok) { toast.error('Failed to add dependency'); return }

    // Date hint: if dependency due date > this task's due date, suggest update
    const dep = allTasks.find(t => t.id === dependsOnId)
    if (dep?.due_date && taskDueDate && dep.due_date > taskDueDate) {
      const nextDay = new Date(dep.due_date)
      nextDay.setDate(nextDay.getDate() + 1)
      const hint = nextDay.toISOString().slice(0, 10)
      toast('Dependency due after this task', {
        description: `Consider updating this task's due date to ${formatDate(hint)}`,
      })
    }
    mutate()
  }

  async function removeDependency(depId: string) {
    const res = await fetch(`/api/tasks/${taskId}/dependencies/${depId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to remove dependency'); return }
    mutate()
  }

  const hasAny = blockedBy.length > 0 || blocking.length > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[#434655] uppercase tracking-widest flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" />Dependencies
        </span>
        <button
          onClick={() => setAdding(a => !a)}
          className="text-xs text-[#737687] hover:text-blue-600 flex items-center gap-0.5 transition-colors"
        >
          <Plus className="w-3 h-3" />Add
        </button>
      </div>

      {adding && (
        <div className="relative mb-2">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full text-xs border border-[#e5e2e1] rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-20 top-full mt-1 w-full bg-white border border-[#e5e2e1] rounded-lg shadow-lg overflow-hidden">
              {searchResults.map(t => (
                <button
                  key={t.id}
                  onClick={() => addDependency(t.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-[#f6f3f2] transition-colors"
                >
                  <span className={cn('px-1.5 py-0.5 rounded font-semibold text-[10px] shrink-0', TASK_STATUS_COLORS[t.status])}>
                    {TASK_STATUS_LABELS[t.status]}
                  </span>
                  <span className="truncate text-[#1c1b1b]">{t.title}</span>
                  {t.task_number && <span className="ml-auto font-mono text-[#c3c5d8] text-[10px] shrink-0">{formatTaskId(t)}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {blockedBy.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-semibold text-[#737687] uppercase tracking-widest mb-1">Blocked by</div>
          {blockedBy.map(e => (
            <DependencyRow key={e.dep_id} entry={e} onRemove={removeDependency} onOpen={onOpenTask} taskDueDate={taskDueDate} />
          ))}
        </div>
      )}

      {blocking.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-[#737687] uppercase tracking-widest mb-1">Blocking</div>
          {blocking.map(e => (
            <DependencyRow key={e.dep_id} entry={e} onRemove={removeDependency} onOpen={onOpenTask} taskDueDate={taskDueDate} />
          ))}
        </div>
      )}

      {!hasAny && !adding && (
        <p className="text-xs text-[#c3c5d8]">No dependencies</p>
      )}
    </div>
  )
}

// ─── Checklist section ────────────────────────────────────────────────────────

function ChecklistSection({ taskId, users }: { taskId: string; users: Profile[] }) {
  const { data: items = [], mutate } = useSWR<ChecklistItem[]>(`/api/tasks/${taskId}/checklist`, fetcher)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const done = items.filter((i) => i.is_checked).length
  const total = items.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  async function addItem(content: string) {
    const position = items.length
    const tempId = `temp-${Date.now()}`
    mutate([...items, { id: tempId, task_id: taskId, text: content, is_checked: false, position, created_at: '', updated_at: '' }], false)
    const res = await fetch(`/api/tasks/${taskId}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content, position }),
    })
    if (!res.ok) { toast.error('Failed to add item'); mutate() }
    else mutate()
  }

  async function toggleItem(item: ChecklistItem) {
    mutate(items.map((i) => i.id === item.id ? { ...i, is_checked: !i.is_checked } : i), false)
    const res = await fetch(`/api/tasks/${taskId}/checklist/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_checked: !item.is_checked }),
    })
    if (!res.ok) { toast.error('Failed to update'); mutate() }
    else mutate()
  }

  async function deleteItem(itemId: string) {
    mutate(items.filter((i) => i.id !== itemId), false)
    const res = await fetch(`/api/tasks/${taskId}/checklist/${itemId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); mutate() }
    else mutate()
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    const newItems = arrayMove(items, oldIndex, newIndex).map((item, idx) => ({ ...item, position: idx }))
    mutate(newItems, false)
    fetch(`/api/tasks/${taskId}/checklist/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: newItems.map((i) => ({ id: i.id, position: i.position })) }),
    }).then((r) => { if (!r.ok) mutate() })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-3.5 h-3.5 text-[#434655]" />
          <span className="text-xs font-bold text-[#434655] uppercase tracking-widest">Checklist</span>
        </div>
        {total > 0 && <span className="text-[10px] font-bold text-[#737687]">{done}/{total}</span>}
      </div>

      {total > 0 && (
        <div className="w-full h-1.5 bg-[#e5e2e1] rounded-full mb-3">
          <div className="h-full rounded-full bg-[#176e00] transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5 mb-2">
            {items.map((item) => (
              <SortableChecklistItem key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add item — Tiptap inline editor with @mention support */}
      <div className="flex items-center gap-2 mt-1 min-w-0">
        <Plus className="w-4 h-4 text-[#737687] shrink-0" />
        <TiptapInlineEditor
          users={users}
          onSubmit={addItem}
          placeholder="Add item… (@ to mention)"
        />
      </div>
    </div>
  )
}

// ─── Comments section ─────────────────────────────────────────────────────────

function CommentsSection({ taskId, users }: { taskId: string; users: Profile[] }) {
  const { data: comments = [], mutate } = useSWR<TaskComment[]>(`/api/tasks/${taskId}/comments`, fetcher)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments.length])

  async function handleSubmit(content: string) {
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) { toast.error('Failed to post comment'); return }
    mutate()
  }

  async function handleDelete(commentId: string) {
    mutate(comments.filter((c) => c.id !== commentId), false)
    const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); mutate() }
    else mutate()
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-3.5 h-3.5 text-[#434655]" />
        <span className="text-xs font-bold text-[#434655] uppercase tracking-widest">
          Comments {comments.length > 0 && `(${comments.length})`}
        </span>
      </div>

      {comments.length > 0 && (
        <div className="space-y-3 mb-4">
          {comments.map((comment) => {
            const author = comment.author as Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | undefined
            return (
              <div key={comment.id} className="flex items-start gap-3 group">
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarImage src={author?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700 font-bold">
                    {getInitials(author?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-[#f6f3f2] rounded-xl px-4 py-3 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1c1b1b]">{author?.full_name ?? 'Unknown'}</span>
                      <span className="text-[10px] text-[#737687]">
                        {new Date(comment.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#c3c5d8] hover:text-red-400 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <CommentRenderer content={comment.content} />
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {comments.length === 0 && <p className="text-xs text-[#737687] mb-4">No comments yet.</p>}

      <TiptapCommentEditor users={users} onSubmit={handleSubmit} />
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface TaskDetailPanelProps {
  task: Task
  onClose: () => void
  onTaskUpdate: () => void
}

const VISIBILITY_ICONS: Record<TaskVisibility, React.ReactNode> = {
  private: <Lock className="w-3 h-3" />,
  internal: <Users className="w-3 h-3" />,
  external: <Globe className="w-3 h-3" />,
}

export default function TaskDetailPanel({ task: rootTask, onClose, onTaskUpdate }: TaskDetailPanelProps) {
  // Navigation stack for drilling into dependency tasks
  const [taskStack, setTaskStack] = useState<Task[]>([rootTask])
  const task = taskStack[taskStack.length - 1]

  function openDepTask(taskId: string) {
    fetch(`/api/tasks/${taskId}`)
      .then(r => r.ok ? r.json() : null)
      .then(t => { if (t) setTaskStack(s => [...s, t]) })
  }
  function goBack() {
    setTaskStack(s => s.length > 1 ? s.slice(0, -1) : s)
  }

  const { data: users = [] } = useSWR<Profile[]>('/api/users', fetcher)
  const { data: accounts = [] } = useSWR<Account[]>('/api/accounts', fetcher)
  const [draft, setDraft] = useState({ ...task })
  const [editingField, setEditingField] = useState<string | null>(null)

  const { data: projects = [] } = useSWR<Project[]>(
    draft.account_id ? `/api/projects?accountId=${draft.account_id}` : null,
    fetcher
  )

  useEffect(() => { setDraft({ ...task }); setEditingField(null) }, [task.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function saveField(field: string, value: unknown) {
    const prev = draft[field as keyof typeof draft]
    setDraft((d) => ({ ...d, [field]: value }))
    setEditingField(null)
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    if (!res.ok) {
      setDraft((d) => ({ ...d, [field]: prev }))
      toast.error('Failed to save')
    } else {
      onTaskUpdate()
    }
  }

  const ownerUser = users.find((u) => u.id === draft.owner_id)
  const currentAccount = accounts.find((a) => a.id === draft.account_id)
    ?? (task.account as { id: string; name: string } | null)


  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="w-[560px] h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">

        {/* Header — status + priority as clickable selects */}
        {/* Back navigation when drilling into a dependency */}
        {taskStack.length > 1 && (
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-xs text-[#737687] hover:text-[#1c1b1b] px-6 pt-3 pb-0 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />Back
          </button>
        )}

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0edec] shrink-0">
          <div className="flex items-center gap-2">
            <Select value={draft.status} onValueChange={(v) => saveField('status', v as TaskStatus)}>
              <SelectTrigger className={cn(
                'h-auto px-2 py-0.5 rounded text-xs font-semibold border-0 shadow-none focus:ring-0 focus:ring-offset-0 gap-1 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-50',
                TASK_STATUS_COLORS[draft.status]
              )}>
                <SelectValue>{TASK_STATUS_LABELS[draft.status]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(['pending_review', 'open', 'in_progress', 'completed', 'cancelled'] as TaskStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={draft.priority ?? 'medium'} onValueChange={(v) => saveField('priority', v as TaskPriority)}>
              <SelectTrigger className={cn(
                'h-auto px-2 py-0.5 rounded text-xs font-semibold border-0 shadow-none focus:ring-0 focus:ring-offset-0 gap-1 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-50',
                PRIORITY_COLORS[draft.priority ?? 'medium']
              )}>
                <SelectValue>{PRIORITY_LABELS[draft.priority ?? 'medium']}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={draft.visibility ?? 'internal'} onValueChange={(v) => saveField('visibility', v as TaskVisibility)}>
              <SelectTrigger className={cn(
                'h-auto px-2 py-0.5 rounded text-xs font-semibold border-0 shadow-none focus:ring-0 focus:ring-offset-0 gap-1 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:opacity-50',
                VISIBILITY_COLORS[draft.visibility ?? 'internal']
              )}>
                <SelectValue>
                  <span className="flex items-center gap-1">
                    {VISIBILITY_ICONS[draft.visibility ?? 'internal']}
                    {VISIBILITY_LABELS[draft.visibility ?? 'internal']}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(['private', 'internal', 'external'] as TaskVisibility[]).map((v) => (
                  <SelectItem key={v} value={v}>{VISIBILITY_LABELS[v]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button onClick={onClose} className="text-[#737687] hover:text-[#1c1b1b] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Inline-editable title + description */}
          <div>
            {editingField === 'title' ? (
              <input
                autoFocus
                defaultValue={draft.title}
                onBlur={(e) => saveField('title', e.target.value.trim() || draft.title)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                className="text-xl font-extrabold tracking-tight text-[#1c1b1b] w-full bg-transparent border-b-2 border-blue-400 outline-none pb-0.5 mb-1"
              />
            ) : (
              <h2
                onClick={() => setEditingField('title')}
                title="Click to edit"
                className="text-xl font-extrabold tracking-tight text-[#1c1b1b] mb-1 cursor-text hover:bg-[#f6f3f2] rounded px-1 -mx-1 transition-colors"
              >
                {draft.title}
              </h2>
            )}
            {draft.task_number && (
              <div className="text-[10px] font-mono font-semibold text-[#737687] mb-1 px-1 -mx-1">
                {formatTaskId({ visibility: draft.visibility, task_number: draft.task_number })}
              </div>
            )}

            {editingField === 'description' ? (
              <textarea
                autoFocus
                defaultValue={draft.description ?? ''}
                onBlur={(e) => saveField('description', e.target.value.trim() || null)}
                className="w-full text-sm text-[#434655] leading-relaxed bg-[#f6f3f2] rounded-lg px-2 py-1.5 outline-none resize-none border-0"
                rows={3}
              />
            ) : (
              <p
                onClick={() => setEditingField('description')}
                title="Click to edit"
                className={cn(
                  'text-sm leading-relaxed cursor-text hover:bg-[#f6f3f2] rounded px-1 -mx-1 transition-colors min-h-[1.25rem]',
                  draft.description ? 'text-[#434655]' : 'text-[#737687] italic'
                )}
              >
                {draft.description || 'Add a description…'}
              </p>
            )}
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Assignee */}
            <div className="bg-[#f6f3f2] rounded-xl p-3">
              <div className="text-[10px] font-bold tracking-widest uppercase text-[#737687] mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3" />Assignee
              </div>
              <Select value={draft.owner_id ?? 'none'} onValueChange={(v) => saveField('owner_id', v === 'none' ? null : v)}>
                <SelectTrigger className="h-auto p-0 border-0 shadow-none focus:ring-0 focus:ring-offset-0 text-sm font-medium text-[#1c1b1b] [&>svg]:ml-1 [&>svg]:opacity-40 [&>svg]:w-3 [&>svg]:h-3">
                  <SelectValue>
                    {ownerUser ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={ownerUser.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700 font-bold">
                            {getInitials(ownerUser.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{ownerUser.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-[#737687]">Unassigned</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due date */}
            <div className="bg-[#f6f3f2] rounded-xl p-3">
              <div className="text-[10px] font-bold tracking-widest uppercase text-[#737687] mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />Due Date
              </div>
              {editingField === 'due_date' ? (
                <input
                  type="date"
                  autoFocus
                  defaultValue={draft.due_date ?? ''}
                  onBlur={(e) => saveField('due_date', e.target.value || null)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                  className="text-sm font-medium text-[#1c1b1b] bg-transparent outline-none border-b border-blue-400 w-full"
                />
              ) : (
                <span
                  onClick={() => setEditingField('due_date')}
                  title="Click to edit"
                  className={cn(
                    'text-sm font-medium cursor-pointer hover:bg-[#ebe7e7] rounded px-1 -mx-1 transition-colors',
                    draft.due_date ? 'text-[#1c1b1b]' : 'text-[#737687] italic'
                  )}
                >
                  {draft.due_date ? formatDate(draft.due_date) : 'Set due date…'}
                </span>
              )}
            </div>

            {/* Account — editable select */}
            <div className="bg-[#f6f3f2] rounded-xl p-3 col-span-2">
              <div className="text-[10px] font-bold tracking-widest uppercase text-[#737687] mb-1.5 flex items-center gap-1">
                <Building2 className="w-3 h-3" />Account
              </div>
              <Select
                value={draft.account_id ?? 'none'}
                onValueChange={(v) => {
                  const newAccountId = v === 'none' ? null : v
                  setDraft((d) => ({ ...d, account_id: newAccountId, project_id: null }))
                  saveField('account_id', newAccountId)
                }}
              >
                <SelectTrigger className="h-auto p-0 border-0 shadow-none focus:ring-0 focus:ring-offset-0 text-sm font-medium text-[#1c1b1b] [&>svg]:ml-1 [&>svg]:opacity-40 [&>svg]:w-3 [&>svg]:h-3">
                  <SelectValue>
                    {currentAccount?.name ?? <span className="text-[#737687] italic">No account</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(draft.visibility === 'private') && (
                    <SelectItem value="none">No account</SelectItem>
                  )}
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project — only when account is set */}
            {draft.account_id && (
              <div className="bg-[#f6f3f2] rounded-xl p-3 col-span-2">
                <div className="text-[10px] font-bold tracking-widest uppercase text-[#737687] mb-1.5 flex items-center gap-1">
                  <Folder className="w-3 h-3" />Project
                </div>
                <Select value={draft.project_id ?? 'none'} onValueChange={(v) => saveField('project_id', v === 'none' ? null : v)}>
                  <SelectTrigger className="h-auto p-0 border-0 shadow-none focus:ring-0 focus:ring-offset-0 text-sm font-medium text-[#1c1b1b] [&>svg]:ml-1 [&>svg]:opacity-40 [&>svg]:w-3 [&>svg]:h-3">
                    <SelectValue>
                      {projects.find((p) => p.id === draft.project_id)?.name
                        ?? (task.project as { id: string; name: string } | null)?.name
                        ?? <span className="text-[#737687] italic">No project</span>}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <CustomFieldsSection taskId={task.id} />

          <div className="border-t border-[#f0edec]" />

          <DependenciesSection
            taskId={task.id}
            taskDueDate={draft.due_date}
            accountId={task.account_id}
            onOpenTask={openDepTask}
          />

          <div className="border-t border-[#f0edec]" />

          <ChecklistSection taskId={task.id} users={users} />

          <div className="border-t border-[#f0edec]" />

          <CommentsSection taskId={task.id} users={users} />

          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}
