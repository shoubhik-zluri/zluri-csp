'use client'

import { use, useState, useCallback } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import type { Project, Task } from '@/types/database'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/lib/constants'
import {
  ArrowLeft, ChevronRight, Copy, Check, ExternalLink,
  Table2, LayoutGrid, GanttChart, Plus, ChevronDown,
  AlertCircle, Pencil,
} from 'lucide-react'
import TaskTableView, { DEFAULT_COLUMN_ORDER } from '@/components/tasks/TaskTableView'
import TaskBoardView from '@/components/tasks/TaskBoardView'
import TaskDetailPanel from '@/components/tasks/TaskDetailPanel'
import TaskDialog from '@/components/tasks/TaskDialog'
import EditProjectModal from '@/components/projects/EditProjectModal'
import type { SortingState, VisibilityState, ColumnSizingState } from '@tanstack/react-table'
import type { DragEndEvent } from '@dnd-kit/core'

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

function CopyLink({ projectId }: { projectId: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/projects/${projectId}`); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="flex items-center gap-1.5 text-xs font-semibold text-[#434655] hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-[#f0edec] transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}

// ─── Timeline view (Gantt) ────────────────────────────────────────────────────

const STATUS_BAR_COLORS: Record<string, string> = {
  open: '#737687', in_progress: '#004bd8', completed: '#176e00', cancelled: '#c3c5d8', pending_review: '#d97706',
}

function TimelineView({ tasks, project, onOpenDetail }: { tasks: Task[]; project: Project; onOpenDetail: (t: Task) => void }) {
  const tStart = new Date(project.start_date ?? project.due_date ?? new Date().toISOString().split('T')[0])
  tStart.setDate(1)
  const tEnd = new Date(project.due_date ?? new Date().toISOString().split('T')[0])
  tEnd.setMonth(tEnd.getMonth() + 1, 1)
  const totalMs = tEnd.getTime() - tStart.getTime()

  function pct(d: string) { return Math.max(0, Math.min(100, (new Date(d).getTime() - tStart.getTime()) / totalMs * 100)) }

  // Build week columns
  const weeks: Date[] = []
  const weekCur = new Date(tStart)
  while (weekCur < tEnd) {
    weeks.push(new Date(weekCur))
    weekCur.setDate(weekCur.getDate() + 7)
  }
  if (weeks.length === 0) weeks.push(new Date(tStart))

  // Build month groups for spanning header
  const monthGroups: { label: string; weekCount: number }[] = []
  weeks.forEach(week => {
    const label = week.toLocaleString('default', { month: 'short', year: '2-digit' })
    if (!monthGroups.length || monthGroups[monthGroups.length - 1].label !== label) {
      monthGroups.push({ label, weekCount: 1 })
    } else {
      monthGroups[monthGroups.length - 1].weekCount++
    }
  })

  const todayPct = pct(new Date().toISOString().slice(0, 10))
  const sections = [...new Set(tasks.map(t => t.section ?? 'Unsectioned'))]

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
      {/* Two-row sticky header: months (top) + weeks (bottom) */}
      <div className="flex sticky top-0 bg-white z-10 border-b border-[#e5e2e1]">
        <div className="w-56 shrink-0 border-r border-[#f0edec]">
          <div className="px-5 py-2 text-[10px] font-bold tracking-widest uppercase text-[#737687] border-b border-[#f0edec]">Task</div>
          <div className="px-5 py-1.5" />
        </div>
        <div className="flex-1">
          {/* Month row */}
          <div className="flex border-b border-[#f0edec]">
            {monthGroups.map((mg, i) => (
              <div
                key={i}
                style={{ flex: mg.weekCount }}
                className="text-center text-[10px] font-bold tracking-widest uppercase text-[#737687] py-2 border-r border-[#f0edec] last:border-r-0"
              >
                {mg.label}
              </div>
            ))}
          </div>
          {/* Week row */}
          <div className="flex">
            {weeks.map((w, i) => (
              <div key={i} className="flex-1 text-center text-[10px] text-[#737687] py-1.5 border-r border-[#f0edec] last:border-r-0 truncate px-1">
                {w.toLocaleString('default', { month: 'short', day: 'numeric' })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {sections.map(section => {
        const sectionTasks = tasks.filter(t => (t.section ?? 'Unsectioned') === section)
        return (
          <div key={section}>
            <div className="flex bg-[#f6f3f2] border-b border-[#e5e2e1]">
              <div className="w-56 shrink-0 px-5 py-2 text-xs font-bold text-[#1c1b1b] border-r border-[#f0edec]">{section}</div>
              <div className="flex-1" />
            </div>
            {sectionTasks.map(task => (
              <div key={task.id} className="flex border-b border-[#f6f3f2] hover:bg-[#f6f3f2] transition-colors group">
                <div className="w-56 shrink-0 px-5 py-3 border-r border-[#f0edec] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_BAR_COLORS[task.status] ?? '#737687' }} />
                  <span className="text-xs font-semibold text-[#1c1b1b] truncate">{task.title}</span>
                </div>
                <div className="flex-1 relative py-3 min-h-[44px]">
                  {/* Week grid lines */}
                  {weeks.map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-r border-[#f0edec]"
                      style={{ left: `${((i + 1) / weeks.length) * 100}%` }} />
                  ))}
                  {/* Today line */}
                  {todayPct > 0 && todayPct < 100 && (
                    <div className="absolute top-0 bottom-0 w-px bg-blue-500/50 z-10" style={{ left: `${todayPct}%` }} />
                  )}
                  {/* Task dot — clickable */}
                  {task.due_date && (
                    <button
                      onClick={() => onOpenDetail(task)}
                      title={task.title}
                      className="absolute top-1/2 -translate-y-1/2 rounded-full cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 transition-shadow"
                      style={{
                        left: `${pct(task.due_date)}%`,
                        width: 10,
                        height: 10,
                        marginLeft: -5,
                        background: STATUS_BAR_COLORS[task.status] ?? '#737687',
                        opacity: task.status === 'completed' ? 0.6 : 1,
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ─── Table view with section grouping ────────────────────────────────────────

function ProjectTableView({
  tasks,
  onTaskUpdate,
  onOpenDetail,
  projectId,
  accountId,
}: {
  tasks: Task[]
  onTaskUpdate: () => void
  onOpenDetail: (t: Task) => void
  projectId: string
  accountId: string | null
}) {
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newTaskSection, setNewTaskSection] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_ORDER)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ account: false })
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const sections = [...new Set(tasks.map(t => t.section ?? ''))]
  const unsectioned = tasks.filter(t => !t.section)
  const sectioned = sections.filter(Boolean)

  function toggleSection(s: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  function renderGroup(label: string | null, groupTasks: Task[]) {
    const key = label ?? '__none__'
    const collapsed = label ? collapsedSections.has(label) : false
    return (
      <div key={key} className="mb-4">
        {label && (
          <button
            onClick={() => toggleSection(label)}
            className="flex items-center gap-2 mb-2 text-sm font-semibold text-[#1c1b1b] hover:text-[#434655] transition-colors"
          >
            {collapsed
              ? <ChevronRight className="w-3.5 h-3.5 text-[#737687]" />
              : <ChevronDown className="w-3.5 h-3.5 text-[#737687]" />}
            {label}
            <span className="text-xs text-[#737687] font-normal">{groupTasks.length} tasks</span>
          </button>
        )}
        {!collapsed && (
          <TaskTableView
            tasks={groupTasks}
            showAccount={false}
            onTaskUpdate={onTaskUpdate}
            onOpenDetail={onOpenDetail}
            sorting={sorting}
            onSortingChange={setSorting}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            columnSizing={columnSizing}
            onColumnSizingChange={setColumnSizing}
            onRowDragEnd={() => {}}
          />
        )}
        <button
          onClick={() => { setNewTaskSection(label); setNewTaskOpen(true) }}
          className="flex items-center gap-1.5 mt-2 text-xs text-[#737687] hover:text-blue-600 transition-colors"
        >
          <Plus className="w-3 h-3" />Add task{label ? ` to ${label}` : ''}
        </button>
      </div>
    )
  }

  return (
    <>
      {sectioned.map(section => renderGroup(section, tasks.filter(t => t.section === section)))}
      {unsectioned.length > 0 && renderGroup(null, unsectioned)}
      {tasks.length === 0 && (
        <div className="text-center py-12 text-[#737687] text-sm">No tasks in this project yet.</div>
      )}
      <TaskDialog
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        accountId={accountId ?? undefined}
        onSaved={() => { onTaskUpdate(); setNewTaskOpen(false) }}
      />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type View = 'table' | 'board' | 'timeline'

export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)

  const { data: project, isLoading: projectLoading, mutate } = useSWR<Project>(
    `/api/projects/${projectId}`,
    fetcher
  )
  const { data: tasks = [], mutate: mutateTasks, isLoading: tasksLoading } = useSWR<Task[]>(
    `/api/tasks/by-project?projectId=${projectId}`,
    fetcher
  )

  const [view, setView] = useState<View>('table')
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const handleDragEnd = useCallback((_e: DragEndEvent) => {}, [])

  const isLoading = projectLoading || tasksLoading

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="bg-white border-b border-[#f0edec] px-8 pt-6 pb-6 shrink-0">
          <div className="h-4 w-32 bg-[#f0edec] rounded animate-pulse mb-4" />
          <div className="h-8 w-64 bg-[#f0edec] rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-[#f0edec] rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-sm font-medium text-[#434655] mb-1">Project not found</p>
        <Link href="/projects" className="text-xs text-blue-600 hover:underline">Back to Projects</Link>
      </div>
    )
  }

  const total    = tasks.length || project.tasks_total
  const done     = tasks.filter(t => t.status === 'completed').length || project.tasks_done
  const pct      = total ? Math.round((done / total) * 100) : 0
  const colors   = PROJECT_STATUS_COLORS[project.status]
  const accountName = (project.account as { name: string } | null)?.name ?? '—'
  const owner       = project.owner as { full_name: string | null; avatar_url: string | null } | null
  const ownerName   = owner?.full_name ?? '—'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-[#f0edec] px-8 pt-6 pb-0 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-[#737687] mb-4">
          <Link href="/projects" className="hover:text-[#1c1b1b] flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3 h-3" />Projects
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#1c1b1b] font-medium">{project.name}</span>
        </div>

        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-[#737687] mb-1">{accountName}</div>
            <h1 className="text-2xl font-extrabold tracking-tighter text-[#1c1b1b] mb-1">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-[#737687] mb-2">{project.description}</p>
            )}
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${colors.badge}`}>
              {PROJECT_STATUS_LABELS[project.status]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CopyLink projectId={project.id} />
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#434655] hover:text-[#1c1b1b] px-3 py-2 rounded-lg hover:bg-[#f0edec] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />Edit
            </button>
            <button
              onClick={() => setNewTaskOpen(true)}
              className="flex items-center gap-1.5 bg-[#004bd8] text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />New Task
            </button>
            <Link
              href={`/accounts/${project.account_id}/overview`}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />View Account
            </Link>
          </div>
        </div>

        {/* KPI strip */}
        <div className="flex gap-6 mb-5 items-end">
          {[
            { label: 'Progress', value: `${pct}%` },
            { label: 'Tasks',    value: `${done}/${total}` },
            { label: 'Due',      value: project.due_date ?? '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-[10px] font-bold tracking-widest uppercase text-[#737687] mb-0.5">{label}</div>
              <div className="text-sm font-bold text-[#1c1b1b]">{value}</div>
            </div>
          ))}
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase text-[#737687] mb-0.5">Owner</div>
            <div className="flex items-center gap-1.5">
              {owner?.avatar_url && (
                <img src={owner.avatar_url} alt={ownerName} className="w-5 h-5 rounded-full object-cover" />
              )}
              {!owner?.avatar_url && ownerName !== '—' && (
                <div className="w-5 h-5 rounded-full bg-[#004bd8] flex items-center justify-center text-[9px] font-bold text-white">
                  {ownerName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-bold text-[#1c1b1b]">{ownerName}</span>
            </div>
          </div>
          <div className="flex-1 flex items-end pb-0.5">
            <div className="w-full h-1.5 bg-[#e5e2e1] rounded-full">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors.bar }} />
            </div>
          </div>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-0">
          {([
            { id: 'table',    icon: Table2,    label: 'Table'    },
            { id: 'board',    icon: LayoutGrid, label: 'Board'   },
            { id: 'timeline', icon: GanttChart, label: 'Timeline'},
          ] as { id: View; icon: React.ComponentType<{ className?: string }>; label: string }[]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                view === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-[#737687] hover:text-[#1c1b1b]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {view === 'table' && (
          <ProjectTableView
            tasks={tasks}
            onTaskUpdate={mutateTasks}
            onOpenDetail={setDetailTask}
            projectId={projectId}
            accountId={project.account_id}
          />
        )}
        {view === 'board' && (
          <TaskBoardView
            tasks={tasks}
            showAccount={false}
            onTaskUpdate={mutateTasks}
            onOpenDetail={setDetailTask}
          />
        )}
        {view === 'timeline' && (
          <TimelineView tasks={tasks} project={project} onOpenDetail={setDetailTask} />
        )}
      </div>

      {/* Task detail panel */}
      {detailTask && (
        <TaskDetailPanel
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onTaskUpdate={() => { mutateTasks(); setDetailTask(null) }}
        />
      )}

      {/* New task dialog */}
      <TaskDialog
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        accountId={project.account_id}
        onSaved={() => { mutateTasks(); setNewTaskOpen(false) }}
      />

      {/* Edit project modal */}
      <EditProjectModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={project}
        onSaved={() => { mutate(); setEditOpen(false) }}
      />
    </div>
  )
}
