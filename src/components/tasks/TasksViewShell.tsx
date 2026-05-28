'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { Plus, LayoutGrid, Table2, Columns3, Users, Lock, Clock, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task, TaskView, TaskVisibility, Profile, TaskPriority, PendingTask } from '@/types/database'
import { PRIORITY_LABELS } from '@/lib/constants'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SortingState, VisibilityState, ColumnSizingState } from '@tanstack/react-table'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import TaskTabView from './TaskTabView'
import TaskTableView, { DEFAULT_COLUMN_ORDER, COLUMN_LABELS } from './TaskTableView'
import TaskBoardView from './TaskBoardView'
import BulkActionToolbar from './BulkActionToolbar'
import TaskDetailPanel from './TaskDetailPanel'
import TaskDialog from './TaskDialog'
import ColumnPanel from './ColumnPanel'
import SubTabBar, { type SaveViewFilters } from './SubTabBar'
import DueDateFilter from './DueDateFilter'
import {
  type DueDateFilterValue,
  type SortKey,
  type SubTabPresetId,
  SUB_TAB_FILTERS,
  SUB_TAB_LABELS,
  PRESET_SUB_TABS,
  matchesDueDate,
  sortTasks,
} from '@/lib/task-filters'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabMode = 'account' | 'private' | 'pending_review'
type ViewMode = 'board' | 'table'

interface TaskViewConfig {
  tab_mode?: string
  subTabPresetId?: string
  filterAssignee?: string | null
  filterPriority?: string | null
  filterAccount?: string | null
  dueDate?: DueDateFilterValue
  sortKey?: SortKey
  sortDir?: 'asc' | 'desc'
  sorting?: SortingState
  columnOrder?: string[]
  columnVisibility?: VisibilityState
  columnSizing?: ColumnSizingState
}

export interface TasksViewShellProps {
  context: 'global' | 'account'
  accountId?: string
  tasks: Task[]
  savedViews: TaskView[]
  isLoading: boolean
  onTaskUpdate: () => void
  onMutateSavedViews: () => void
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

function loadViewMode(key: string): ViewMode {
  try {
    const v = localStorage.getItem(`tasks-view-mode-${key}`)
    if (v === 'table') return 'table'
    if (v === 'board' || v === 'list') return 'board' // migrate 'list' → 'board'
  } catch { /* ignore */ }
  return 'table'
}

function loadTableState(key: string): { columnOrder: string[]; columnVisibility: VisibilityState; columnSizing: ColumnSizingState } {
  try {
    const stored = localStorage.getItem(`tasks-table-state-${key}`)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return { columnOrder: DEFAULT_COLUMN_ORDER, columnVisibility: { task_id: false }, columnSizing: {} }
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'sort_order', label: 'Custom order' },
  { value: 'due_date',   label: 'Due date' },
  { value: 'priority',   label: 'Priority' },
  { value: 'title',      label: 'Title' },
  { value: 'assignee',   label: 'Assignee' },
]

function FilterBar({
  tasks, showAccount,
  filterAssignee, filterPriority, filterAccount, dueDate,
  onAssignee, onPriority, onAccount, onDueDate,
  viewMode, sortKey, sortDir, onSort,
}: {
  tasks: Task[]
  showAccount: boolean
  filterAssignee: string | null
  filterPriority: string | null
  filterAccount: string | null
  dueDate: DueDateFilterValue
  onAssignee: (v: string | null) => void
  onPriority: (v: string | null) => void
  onAccount: (v: string | null) => void
  onDueDate: (v: DueDateFilterValue) => void
  viewMode: ViewMode
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (key: SortKey, dir: 'asc' | 'desc') => void
}) {
  const assignees = Array.from(
    new Map(tasks.filter(t => t.owner_id && t.owner).map(t => [t.owner_id, t.owner as Pick<Profile, 'id' | 'full_name'>])).values()
  )
  const accounts = Array.from(
    new Map(tasks.filter(t => t.account).map(t => [
      (t.account as { id: string; name: string }).id,
      t.account as { id: string; name: string },
    ])).values()
  )

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {assignees.length > 1 && (
        <Select value={filterAssignee ?? 'all'} onValueChange={(v) => onAssignee(v === 'all' ? null : v)}>
          <SelectTrigger className="h-7 text-xs w-36">
            <SelectValue>{filterAssignee ? assignees.find(a => a.id === filterAssignee)?.full_name ?? 'Assignee' : 'All Assignees'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {assignees.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name ?? a.id}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      <Select value={filterPriority ?? 'all'} onValueChange={(v) => onPriority(v === 'all' ? null : v)}>
        <SelectTrigger className="h-7 text-xs w-36">
          <SelectValue>{filterPriority ? PRIORITY_LABELS[filterPriority as TaskPriority] : 'All Priorities'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map(p => (
            <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showAccount && accounts.length > 1 && (
        <Select value={filterAccount ?? 'all'} onValueChange={(v) => onAccount(v === 'all' ? null : v)}>
          <SelectTrigger className="h-7 text-xs w-36">
            <SelectValue>{filterAccount ? accounts.find(a => a.id === filterAccount)?.name ?? 'Account' : 'All Accounts'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      <DueDateFilter value={dueDate} onChange={onDueDate} />

      {/* Sort controls — board view only */}
      {viewMode === 'board' && (
        <div className="ml-auto flex items-center gap-1">
          <Select value={sortKey} onValueChange={(v) => onSort(v as SortKey, sortDir)}>
            <SelectTrigger className="h-7 text-xs w-36">
              <SelectValue>{SORT_OPTIONS.find(o => o.value === sortKey)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <button
            onClick={() => onSort(sortKey, sortDir === 'asc' ? 'desc' : 'asc')}
            className="h-7 w-7 flex items-center justify-center rounded border border-[#e5e2e1] text-[#737687] hover:text-[#434655] hover:bg-[#f6f3f2] transition-colors"
          >
            {sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Shell ───────────────────────────────────────────────────────────────

export default function TasksViewShell({
  context,
  accountId,
  tasks,
  savedViews,
  isLoading,
  onTaskUpdate,
  onMutateSavedViews,
}: TasksViewShellProps) {
  // Top-level tab (global context only)
  const [tabMode, setTabMode] = useState<TabMode>('account')

  const effectiveTabMode = context === 'account' ? 'account' : tabMode
  const stateKey = `${context}-${effectiveTabMode}`

  // View mode — per stateKey, persisted
  const [viewMode, setViewMode] = useState<ViewMode>('board')

  // Sub-tab
  const [activeSubTabId, setActiveSubTabId] = useState<string>('open')

  // User filters
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null)
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [filterAccount, setFilterAccount]   = useState<string | null>(null)
  const [dueDate, setDueDate]               = useState<DueDateFilterValue>({ kind: 'all' })

  // List sort
  const [sortKey, setSortKey] = useState<SortKey>('sort_order')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [dragOrder, setDragOrder] = useState<string[]>([])

  // Table state
  const [sorting, setSorting]                       = useState<SortingState>([{ id: 'due_date', desc: false }])
  const [columnOrder, setColumnOrder]               = useState<string[]>(DEFAULT_COLUMN_ORDER)
  const [columnVisibility, setColumnVisibility]     = useState<VisibilityState>({})
  const [columnSizing, setColumnSizing]             = useState<ColumnSizingState>({})

  // UI state
  const [columnPanelOpen, setColumnPanelOpen] = useState(false)
  const [detailTask, setDetailTask]           = useState<Task | null>(null)
  const [newTaskOpen, setNewTaskOpen]         = useState(false)

  // Bulk selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())

  // ── Pending tasks (AI suggestions) — only fetched in global Pending Review tab ─
  const pendingTasksUrl = useMemo(() => {
    if (context === 'global' && tabMode === 'pending_review') return '/api/pending-tasks/all'
    return null
  }, [context, tabMode])

  const { data: pendingTasks = [], mutate: mutatePendingTasks } = useSWR<PendingTask[]>(
    pendingTasksUrl,
    async (url: string) => { const r = await fetch(url); if (!r.ok) return []; return r.json() }
  )

  // ── Load persisted state after hydration ──────────────────────────────────

  useEffect(() => {
    setViewMode(loadViewMode(stateKey))
    const ts = loadTableState(stateKey)
    setColumnOrder(ts.columnOrder.length ? ts.columnOrder : DEFAULT_COLUMN_ORDER)
    setColumnVisibility(ts.columnVisibility ?? {})
    setColumnSizing(ts.columnSizing ?? {})
    setActiveSubTabId('open')
    setSortKey('sort_order')
    setSortDir('asc')
    setFilterAssignee(null)
    setFilterPriority(null)
    setFilterAccount(null)
    setDueDate({ kind: 'all' })
    setSorting([{ id: 'due_date', desc: false }])
    setSelectedTaskIds(new Set())
  }, [stateKey]) // reset all when context/tab changes

  // ── Persist state ──────────────────────────────────────────────────────────

  useEffect(() => {
    try { localStorage.setItem(`tasks-view-mode-${stateKey}`, viewMode) } catch { /* ignore */ }
  }, [viewMode, stateKey])

  useEffect(() => {
    try {
      localStorage.setItem(`tasks-table-state-${stateKey}`, JSON.stringify({ columnOrder, columnVisibility, columnSizing }))
    } catch { /* ignore */ }
  }, [columnOrder, columnVisibility, columnSizing, stateKey])

  // ── Task partitioning ──────────────────────────────────────────────────────

  const allContextTasks = useMemo(() => {
    if (context === 'account') return tasks
    if (tabMode === 'pending_review') return tasks.filter(t => t.status === 'pending_review')
    if (tabMode === 'private') return tasks.filter(t => t.visibility === 'private' && t.status !== 'pending_review')
    return tasks.filter(t => t.visibility !== 'private' && t.status !== 'pending_review')
  }, [context, tasks, tabMode])

  // Top-level tab counts (global only)
  const pendingReviewCount = useMemo(() =>
    context === 'global' ? tasks.filter(t => t.status === 'pending_review').length : 0,
    [context, tasks]
  )
  const accountTaskCount = useMemo(() =>
    context === 'global' ? tasks.filter(t => t.visibility !== 'private' && t.status !== 'pending_review').length : 0,
    [context, tasks]
  )
  const privateTaskCount = useMemo(() =>
    context === 'global' ? tasks.filter(t => t.visibility === 'private' && t.status !== 'pending_review').length : 0,
    [context, tasks]
  )

  // ── Sub-tab presets ────────────────────────────────────────────────────────

  const presetIds: SubTabPresetId[] = effectiveTabMode === 'pending_review' ? ['all'] : PRESET_SUB_TABS

  // Open filter includes pending_review in account context (no separate PR tab there)
  const openFilter = useCallback((t: Task) =>
    context === 'account'
      ? (t.status === 'open' || t.status === 'in_progress' || t.status === 'pending_review')
      : (t.status === 'open' || t.status === 'in_progress'),
    [context]
  )

  const subTabCounts = useMemo(() =>
    Object.fromEntries(presetIds.map(id => [
      id,
      allContextTasks.filter(id === 'open' ? openFilter : SUB_TAB_FILTERS[id]).length,
    ])),
    [allContextTasks, presetIds, openFilter]
  )

  // ── Sub-tab filter ─────────────────────────────────────────────────────────

  const subTabFiltered = useMemo(() => {
    const savedView = savedViews.find(v => v.id === activeSubTabId)
    if (savedView) {
      const cfg = savedView.config as TaskViewConfig
      const presetId = cfg.subTabPresetId as SubTabPresetId | undefined
      if (presetId === 'open') return allContextTasks.filter(openFilter)
      if (presetId && SUB_TAB_FILTERS[presetId]) return allContextTasks.filter(SUB_TAB_FILTERS[presetId])
      return allContextTasks
    }
    const presetId = activeSubTabId as SubTabPresetId
    if (presetId === 'open') return allContextTasks.filter(openFilter)
    if (SUB_TAB_FILTERS[presetId]) return allContextTasks.filter(SUB_TAB_FILTERS[presetId])
    return allContextTasks
  }, [allContextTasks, activeSubTabId, savedViews, openFilter])

  // ── User filters ───────────────────────────────────────────────────────────

  const filtered = useMemo(() =>
    subTabFiltered
      .filter(t => !filterAssignee || t.owner_id === filterAssignee)
      .filter(t => !filterPriority || t.priority === filterPriority)
      .filter(t => !filterAccount || (t.account as { id: string } | null)?.id === filterAccount)
      .filter(t => matchesDueDate(t, dueDate)),
    [subTabFiltered, filterAssignee, filterPriority, filterAccount, dueDate]
  )

  // Board gets user filters only — sub-tab status filter is intentionally skipped
  // so all 4 status columns always show tasks
  const filteredForBoard = useMemo(() =>
    allContextTasks
      .filter(t => !filterAssignee || t.owner_id === filterAssignee)
      .filter(t => !filterPriority || t.priority === filterPriority)
      .filter(t => !filterAccount || (t.account as { id: string } | null)?.id === filterAccount)
      .filter(t => matchesDueDate(t, dueDate)),
    [allContextTasks, filterAssignee, filterPriority, filterAccount, dueDate]
  )

  // ── Sort for list view ─────────────────────────────────────────────────────

  const sortedForList = useMemo(() => {
    if (sortKey === 'sort_order') {
      const idSet = new Set(filtered.map(t => t.id))
      const ordered = dragOrder.filter(id => idSet.has(id)).map(id => filtered.find(t => t.id === id)!).filter(Boolean)
      const extra = filtered.filter(t => !dragOrder.includes(t.id))
      return [...ordered, ...extra]
    }
    return sortTasks(filtered, sortKey, sortDir)
  }, [filtered, sortKey, sortDir, dragOrder])

  // ── Data for table view (dragOrder-sorted when no column sort) ─────────────

  const filteredForTable = useMemo(() => {
    if (sorting.length === 0 && dragOrder.length > 0) {
      const idSet = new Set(filtered.map(t => t.id))
      const ordered = dragOrder.filter(id => idSet.has(id)).map(id => filtered.find(t => t.id === id)!).filter(Boolean)
      const extra = filtered.filter(t => !dragOrder.includes(t.id))
      return [...ordered, ...extra]
    }
    return filtered
  }, [filtered, sorting, dragOrder])

  // ── Drag order sync ────────────────────────────────────────────────────────

  // Reset on sub-tab or context change
  useEffect(() => { setDragOrder([]) }, [activeSubTabId, effectiveTabMode])

  // Add new / remove deleted from dragOrder
  useEffect(() => {
    setDragOrder(prev => {
      const allIds = new Set(tasks.map(t => t.id))
      const existing = prev.filter(id => allIds.has(id))
      const added = tasks.filter(t => !prev.includes(t.id)).map(t => t.id)
      return [...existing, ...added]
    })
  }, [tasks])

  // ── Drag end handler (shared list + table) ─────────────────────────────────

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = dragOrder.indexOf(active.id as string)
    const newIndex = dragOrder.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(dragOrder, oldIndex, newIndex)
    setDragOrder(newOrder)

    const prevId  = newOrder[newIndex - 1]
    const nextId  = newOrder[newIndex + 1]
    const prevTask = prevId ? tasks.find(t => t.id === prevId) : null
    const nextTask = nextId ? tasks.find(t => t.id === nextId) : null
    const prevSort = prevTask?.sort_order ?? 0
    const nextSort = nextTask?.sort_order ?? prevSort + 200000

    fetch('/api/tasks/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: active.id, sort_order: (prevSort + nextSort) / 2 }] }),
    }).catch(() => toast.error('Failed to save order'))
  }, [dragOrder, tasks])

  // ── Saved views ────────────────────────────────────────────────────────────

  const relevantSavedViews = useMemo(() =>
    savedViews.filter(v => {
      const cfg = v.config as TaskViewConfig
      const cfgTab = cfg.tab_mode ?? 'account'
      return v.view_mode === viewMode && cfgTab === effectiveTabMode
    }),
    [savedViews, viewMode, effectiveTabMode]
  )

  async function handleSaveView(name: string, filters: SaveViewFilters) {
    const cfg: TaskViewConfig = {
      tab_mode: effectiveTabMode,
      subTabPresetId: presetIds.includes(activeSubTabId as SubTabPresetId) ? activeSubTabId : undefined,
      filterAssignee: filters.filterAssignee,
      filterPriority: filters.filterPriority,
      filterAccount,
      dueDate: filters.dueDate,
      sortKey, sortDir, sorting, columnOrder, columnVisibility, columnSizing,
    }
    const res = await fetch('/api/task-views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, view_mode: viewMode, config: cfg }),
    })
    if (!res.ok) { toast.error('Failed to save view'); return }
    toast.success(`View "${name}" saved`)
    onMutateSavedViews()
  }

  async function handleDeleteView(id: string) {
    const res = await fetch(`/api/task-views/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete view'); return }
    if (activeSubTabId === id) setActiveSubTabId(presetIds[0])
    onMutateSavedViews()
  }

  function handleSubTabChange(id: string) {
    setActiveSubTabId(id)
    // Restore saved view config
    const savedView = savedViews.find(v => v.id === id)
    if (savedView) {
      const cfg = savedView.config as TaskViewConfig
      setFilterAssignee(cfg.filterAssignee ?? null)
      setFilterPriority(cfg.filterPriority ?? null)
      setFilterAccount(cfg.filterAccount ?? null)
      if (cfg.dueDate) setDueDate(cfg.dueDate)
      if (cfg.sortKey) setSortKey(cfg.sortKey)
      if (cfg.sortDir) setSortDir(cfg.sortDir)
      if (cfg.sorting) setSorting(cfg.sorting)
      if (cfg.columnOrder) setColumnOrder(cfg.columnOrder)
      if (cfg.columnVisibility) setColumnVisibility(cfg.columnVisibility)
      if (cfg.columnSizing) setColumnSizing(cfg.columnSizing)
    } else {
      // Preset tab — clear filters
      setFilterAssignee(null); setFilterPriority(null); setFilterAccount(null)
      setDueDate({ kind: 'all' })
      setSortKey('sort_order'); setSortDir('asc')
    }
  }

  function switchView(mode: ViewMode) {
    setViewMode(mode)
    if (presetIds.includes(activeSubTabId as SubTabPresetId)) setActiveSubTabId(presetIds[0])
    else setActiveSubTabId(presetIds[0])
  }

  function handleTabModeChange(mode: TabMode) {
    setTabMode(mode)
    setActiveSubTabId('open')
    setFilterAssignee(null); setFilterPriority(null); setFilterAccount(null)
    setDueDate({ kind: 'all' })
    setSortKey('sort_order'); setSortDir('asc')
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const showAccount = context === 'global' && (tabMode === 'account' || tabMode === 'pending_review')
  const showPendingActions = context === 'global' && tabMode === 'pending_review'
  const defaultVisibility: TaskVisibility = (context === 'global' && tabMode === 'private') ? 'private' : 'internal'

  const presetTabItems = presetIds.map(id => ({
    id,
    label: id === 'open' && context === 'account' ? 'Open / Review' : SUB_TAB_LABELS[id],
    count: subTabCounts[id] ?? 0,
  }))

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Top-level tabs — global context only */}
      {context === 'global' && (
        <div className="flex items-center gap-1 border border-[#e5e2e1] rounded-xl p-1 bg-[#f0edec] mb-5">
          {[
            { id: 'pending_review' as TabMode, icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending Review', count: pendingReviewCount + (tabMode === 'pending_review' ? pendingTasks.length : 0) },
            { id: 'account' as TabMode,        icon: <Users className="w-3.5 h-3.5" />, label: 'Account Tasks',  count: accountTaskCount },
            { id: 'private' as TabMode,        icon: <Lock className="w-3.5 h-3.5" />,  label: 'Private',       count: privateTaskCount },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabModeChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tabMode === tab.id ? 'bg-white text-[#1c1b1b] shadow-sm' : 'text-[#737687] hover:text-[#434655]'
              )}
            >
              {tab.icon}{tab.label}
              {tab.count > 0 && (
                <span className="ml-1 text-[10px] font-bold bg-[#e5e2e1] text-[#434655] rounded-full px-1.5 py-0.5">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar: view toggle + Columns button + New Task */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center border border-[#e5e2e1] rounded-lg overflow-hidden">
          <button
            onClick={() => switchView('board')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
              viewMode === 'board' ? 'bg-[#1c1b1b] text-white' : 'text-[#737687] hover:bg-[#f6f3f2]'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />Board
          </button>
          <button
            onClick={() => switchView('table')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-[#e5e2e1]',
              viewMode === 'table' ? 'bg-[#1c1b1b] text-white' : 'text-[#737687] hover:bg-[#f6f3f2]'
            )}
          >
            <Table2 className="w-3.5 h-3.5" />Table
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'table' && (
            <button
              onClick={() => setColumnPanelOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-[#434655] border border-[#e5e2e1] rounded-lg hover:bg-[#f6f3f2] transition-colors"
            >
              <Columns3 className="w-3.5 h-3.5" />Columns
            </button>
          )}
          <button
            onClick={() => setNewTaskOpen(true)}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-full font-semibold text-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />New Task
          </button>
        </div>
      </div>

      {/* Sub-tab bar — hidden in board mode */}
      {viewMode === 'table' && (
        <SubTabBar
          presets={presetTabItems}
          savedViews={relevantSavedViews}
          activeSubTabId={activeSubTabId}
          onTabChange={handleSubTabChange}
          onSaveView={handleSaveView}
          onDeleteView={handleDeleteView}
          currentFilters={{ filterAssignee, filterPriority, dueDate }}
          assignees={Array.from(
            new Map(allContextTasks.filter(t => t.owner_id && t.owner).map(t => [t.owner_id, t.owner as { id: string; full_name: string | null }])).values()
          )}
        />
      )}

      {/* Filter bar */}
      <FilterBar
        tasks={allContextTasks}
        showAccount={showAccount}
        filterAssignee={filterAssignee}
        filterPriority={filterPriority}
        filterAccount={filterAccount}
        dueDate={dueDate}
        onAssignee={setFilterAssignee}
        onPriority={setFilterPriority}
        onAccount={setFilterAccount}
        onDueDate={setDueDate}
        viewMode={viewMode}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(k, d) => { setSortKey(k); setSortDir(d) }}
      />

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-[#f0edec] rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Pending Review — always list view, shown regardless of viewMode toggle */}
      {!isLoading && effectiveTabMode === 'pending_review' && (
        <TaskTabView
          tasks={sortedForList}
          showAccount={showAccount}
          showPendingActions={showPendingActions}
          pendingTasks={pendingTasks}
          onTaskUpdate={onTaskUpdate}
          onOpenDetail={setDetailTask}
          onDragEnd={handleDragEnd}
          onPendingTasksUpdate={mutatePendingTasks}
        />
      )}

      {/* Board view — receives user-filter-only tasks; sub-tab filter bypassed intentionally */}
      {!isLoading && viewMode === 'board' && effectiveTabMode !== 'pending_review' && (
        <TaskBoardView
          tasks={filteredForBoard}
          showAccount={showAccount}
          onTaskUpdate={onTaskUpdate}
          onOpenDetail={setDetailTask}
        />
      )}

      {/* Table view */}
      {!isLoading && viewMode === 'table' && effectiveTabMode !== 'pending_review' && (
        <TaskTableView
          tasks={filteredForTable}
          showAccount={showAccount}
          onTaskUpdate={onTaskUpdate}
          onOpenDetail={setDetailTask}
          sorting={sorting}
          onSortingChange={setSorting}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
          columnVisibility={{
            ...columnVisibility,
            account: showAccount ? (columnVisibility.account !== false) : false,
          }}
          onColumnVisibilityChange={setColumnVisibility}
          columnSizing={columnSizing}
          onColumnSizingChange={setColumnSizing}
          onRowDragEnd={handleDragEnd}
          selectedTaskIds={selectedTaskIds}
          onSelectionChange={setSelectedTaskIds}
        />
      )}

      {/* Bulk action toolbar */}
      <BulkActionToolbar
        selectedTaskIds={selectedTaskIds}
        onAction={() => { onTaskUpdate(); setSelectedTaskIds(new Set()) }}
        onClear={() => setSelectedTaskIds(new Set())}
      />

      {/* Task detail panel */}
      {detailTask && (
        <TaskDetailPanel
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onTaskUpdate={() => { onTaskUpdate(); setDetailTask(null) }}
        />
      )}

      {/* Column panel */}
      <ColumnPanel
        open={columnPanelOpen}
        onClose={() => setColumnPanelOpen(false)}
        columnOrder={columnOrder}
        columnVisibility={columnVisibility}
        onColumnOrderChange={setColumnOrder}
        onColumnVisibilityChange={setColumnVisibility}
        columnLabels={COLUMN_LABELS}
        alwaysVisibleColumns={['title']}
        showAccountColumn={showAccount}
      />

      {/* New task dialog */}
      <TaskDialog
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        accountId={accountId}
        defaultVisibility={defaultVisibility}
        onSaved={() => { onTaskUpdate(); setNewTaskOpen(false) }}
      />
    </div>
  )
}
