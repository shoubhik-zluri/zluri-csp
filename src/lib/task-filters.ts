import type { Task, Profile } from '@/types/database'

// ─── Date helpers ──────────────────────────────────────────────────────────────

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function isOverdue(task: Task): boolean {
  if (!task.due_date) return false
  return new Date(task.due_date + 'T00:00:00') < startOfDay(new Date())
}

export function isDueThisWeek(task: Task): boolean {
  if (!task.due_date) return false
  const due = new Date(task.due_date + 'T00:00:00')
  const today = startOfDay(new Date())
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)
  return due >= today && due < weekEnd
}

export function isDueThisMonth(task: Task): boolean {
  if (!task.due_date) return false
  const due = new Date(task.due_date + 'T00:00:00')
  const today = new Date()
  return due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth()
}

export function isDueToday(task: Task): boolean {
  if (!task.due_date) return false
  const due = new Date(task.due_date + 'T00:00:00')
  const today = startOfDay(new Date())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return due >= today && due < tomorrow
}

// ─── Sub-tab filters ───────────────────────────────────────────────────────────

export type SubTabPresetId = 'open' | 'due_this_week' | 'overdue' | 'completed' | 'all'

export const PRESET_SUB_TABS: SubTabPresetId[] = ['open', 'due_this_week', 'overdue', 'completed']
export const PENDING_REVIEW_PRESET: SubTabPresetId = 'all'

export const SUB_TAB_FILTERS: Record<SubTabPresetId, (t: Task) => boolean> = {
  all:           ()  => true,
  open:          (t) => t.status === 'open' || t.status === 'in_progress',
  due_this_week: (t) => isDueThisWeek(t) && t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'pending_review',
  overdue:       (t) => isOverdue(t) && t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'pending_review',
  completed:     (t) => t.status === 'completed',
}

export const SUB_TAB_LABELS: Record<SubTabPresetId, string> = {
  all:           'All Pending',
  open:          'Open',
  due_this_week: 'Due This Week',
  overdue:       'Overdue',
  completed:     'Completed',
}

// ─── Due date filter ───────────────────────────────────────────────────────────

export type DueDateFilterValue =
  | { kind: 'all' }
  | { kind: 'today' }
  | { kind: 'this_week' }
  | { kind: 'this_month' }
  | { kind: 'custom'; start: string; end: string }

export function matchesDueDate(task: Task, filter: DueDateFilterValue): boolean {
  if (filter.kind === 'all') return true
  if (!task.due_date) return false
  if (filter.kind === 'today') return isDueToday(task)
  if (filter.kind === 'this_week') return isDueThisWeek(task)
  if (filter.kind === 'this_month') return isDueThisMonth(task)
  if (filter.kind === 'custom') {
    const due = new Date(task.due_date + 'T00:00:00')
    const start = new Date(filter.start + 'T00:00:00')
    const end = new Date(filter.end + 'T00:00:00')
    end.setDate(end.getDate() + 1) // inclusive end
    return due >= start && due < end
  }
  return true
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

export type SortKey = 'sort_order' | 'due_date' | 'priority' | 'title' | 'assignee'

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

export function sortTasks(tasks: Task[], key: SortKey, dir: 'asc' | 'desc'): Task[] {
  return [...tasks].sort((a, b) => {
    let cmp = 0
    switch (key) {
      case 'sort_order': cmp = (a.sort_order ?? 0) - (b.sort_order ?? 0); break
      case 'due_date':   cmp = (a.due_date ?? 'zzz').localeCompare(b.due_date ?? 'zzz'); break
      case 'priority':   cmp = (PRIORITY_RANK[a.priority ?? 'medium'] ?? 2) - (PRIORITY_RANK[b.priority ?? 'medium'] ?? 2); break
      case 'title':      cmp = a.title.localeCompare(b.title); break
      case 'assignee': {
        const aName = (a.owner as Pick<Profile, 'full_name'> | null)?.full_name ?? ''
        const bName = (b.owner as Pick<Profile, 'full_name'> | null)?.full_name ?? ''
        cmp = aName.localeCompare(bName)
        break
      }
    }
    return dir === 'asc' ? cmp : -cmp
  })
}
