'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Clock, ChevronUp, ChevronDown, ChevronsUpDown, CheckCircle2, Circle, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type ColumnSizingState,
  type Header,
  type Row,
} from '@tanstack/react-table'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn, formatTaskId } from '@/lib/utils'
import type { Task, Profile, TaskPriority, TaskStatus, TaskVisibility } from '@/types/database'
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, VISIBILITY_LABELS, VISIBILITY_COLORS } from '@/lib/constants'
import { isOverdue } from '@/lib/task-filters'

// ─── Exports consumed by TasksViewShell ───────────────────────────────────────

export const DEFAULT_COLUMN_ORDER = ['title', 'status', 'priority', 'visibility', 'assignee', 'due_date', 'account', 'project', 'section', 'task_id']

export const COLUMN_LABELS: Record<string, string> = {
  title:      'Title',
  status:     'Status',
  priority:   'Priority',
  visibility: 'Visibility',
  assignee:   'Assignee',
  due_date:   'Due Date',
  account:    'Account',
  project:    'Project',
  section:    'Section',
  task_id:    'Task ID',
}

// ─── Static column header (title — not draggable/reorderable) ────────────────

function StaticColumnHeader({ header }: { header: Header<Task, unknown> }) {
  const sorted = header.column.getIsSorted()
  const canSort = header.column.getCanSort()

  return (
    <th
      style={{ width: header.getSize(), minWidth: header.column.columnDef.minSize, position: 'relative' }}
      className="px-3 py-2.5 text-xs font-semibold text-[#737687] bg-[#f6f3f2] select-none"
    >
      <div className="flex items-center gap-0.5 overflow-hidden">
        <span className="w-3.5 shrink-0" /> {/* spacer matching drag-handle width */}
        <button
          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
          className={cn(
            'flex items-center gap-1 min-w-0 overflow-hidden',
            canSort && 'hover:text-[#434655] cursor-pointer'
          )}
        >
          <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
          {canSort && (
            sorted === 'asc' ? <ChevronUp className="w-3 h-3 shrink-0" /> :
            sorted === 'desc' ? <ChevronDown className="w-3 h-3 shrink-0" /> :
            <ChevronsUpDown className="w-3 h-3 shrink-0 text-[#c3c5d8]" />
          )}
        </button>
      </div>
      <div
        onMouseDown={header.getResizeHandler()}
        onTouchStart={header.getResizeHandler()}
        className={cn(
          'absolute top-0 right-0 h-full w-1 cursor-col-resize select-none touch-none z-10',
          header.column.getIsResizing() ? 'bg-blue-400' : 'opacity-0 hover:opacity-100 hover:bg-[#c3c5d8]'
        )}
      />
    </th>
  )
}

// ─── Sortable column header ───────────────────────────────────────────────────

function SortableColumnHeader({ header }: { header: Header<Task, unknown> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.column.id,
  })

  const sorted = header.column.getIsSorted()
  const canSort = header.column.getCanSort()

  return (
    <th
      ref={setNodeRef}
      style={{
        width: header.getSize(),
        minWidth: header.column.columnDef.minSize,
        position: 'relative',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="px-3 py-2.5 text-xs font-semibold text-[#737687] bg-[#f6f3f2] select-none group/th"
    >
      <div className="flex items-center gap-0.5 overflow-hidden">
        {/* Drag handle (separate from sort) */}
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover/th:opacity-100 cursor-grab active:cursor-grabbing text-[#c3c5d8] hover:text-[#737687] shrink-0 transition-opacity mr-0.5"
        >
          <GripVertical className="w-3 h-3" />
        </button>
        {/* Sort button */}
        <button
          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
          className={cn(
            'flex items-center gap-1 min-w-0 overflow-hidden',
            canSort && 'hover:text-[#434655] cursor-pointer'
          )}
        >
          <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
          {canSort && (
            sorted === 'asc' ? <ChevronUp className="w-3 h-3 shrink-0" /> :
            sorted === 'desc' ? <ChevronDown className="w-3 h-3 shrink-0" /> :
            <ChevronsUpDown className="w-3 h-3 shrink-0 text-[#c3c5d8]" />
          )}
        </button>
      </div>
      {/* Column resize handle */}
      <div
        onMouseDown={header.getResizeHandler()}
        onTouchStart={header.getResizeHandler()}
        className={cn(
          'absolute top-0 right-0 h-full w-1 cursor-col-resize select-none touch-none z-10',
          header.column.getIsResizing() ? 'bg-blue-400' : 'opacity-0 hover:opacity-100 hover:bg-[#c3c5d8]'
        )}
      />
    </th>
  )
}

// ─── Sortable table row ───────────────────────────────────────────────────────

function SortableTableRow({
  row,
  canDrag,
  onOpenDetail,
  onTaskUpdate,
  isSelected,
  onToggleSelect,
}: {
  row: Row<Task>
  canDrag: boolean
  onOpenDetail: (task: Task) => void
  onTaskUpdate: () => void
  isSelected?: boolean
  onToggleSelect?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.original.id,
  })

  async function toggleComplete(e: React.MouseEvent) {
    e.stopPropagation()
    const task = row.original
    const next = task.status === 'completed' ? 'open' : 'completed'
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (!res.ok) toast.error('Failed to update task')
    else onTaskUpdate()
  }

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      onClick={() => onOpenDetail(row.original)}
      className={cn(
        'cursor-pointer transition-colors group/tablerow',
        isSelected ? 'bg-blue-50/50' : row.original.status === 'completed' ? 'bg-[#f6f3f2]/60 opacity-60' : 'hover:bg-blue-50/30'
      )}
    >
      {onToggleSelect && (
        <td className="px-3 py-3 w-8">
          <input
            type="checkbox"
            checked={isSelected ?? false}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="w-3.5 h-3.5 rounded border-[#c3c5d8] accent-blue-600 cursor-pointer"
          />
        </td>
      )}
      {row.getVisibleCells().map((cell, cellIdx) => {
        if (cellIdx === 0) {
          // Title cell — includes row drag handle + checkbox
          const task = row.original
          const isComplete = task.status === 'completed'
          return (
            <td
              key={cell.id}
              style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}
              className="px-3 py-3 overflow-hidden"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {/* Row drag handle */}
                <button
                  {...attributes}
                  {...listeners}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    'cursor-grab active:cursor-grabbing text-[#c3c5d8] hover:text-[#737687] shrink-0 transition-opacity',
                    canDrag ? 'opacity-0 group-hover/tablerow:opacity-100' : 'invisible'
                  )}
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </button>
                {/* Completion toggle */}
                {task.status !== 'pending_review' && (
                  <button
                    onClick={toggleComplete}
                    className="shrink-0 text-[#c3c5d8] hover:text-blue-500 transition-colors"
                  >
                    {isComplete
                      ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                      : <Circle className="w-4 h-4" />}
                  </button>
                )}
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium truncate', isComplete && 'line-through text-[#737687]')}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-[#737687] truncate mt-0.5">{task.description}</p>
                  )}
                </div>
              </div>
            </td>
          )
        }
        return (
          <td
            key={cell.id}
            style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}
            className="px-3 py-3 overflow-hidden"
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        )
      })}
    </tr>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TaskTableViewProps {
  tasks: Task[]
  showAccount?: boolean
  onTaskUpdate: () => void
  onOpenDetail: (task: Task) => void
  // Table state — all owned by TasksViewShell
  sorting: SortingState
  onSortingChange: (s: SortingState) => void
  columnOrder: string[]
  onColumnOrderChange: (order: string[]) => void
  columnVisibility: VisibilityState
  onColumnVisibilityChange: (vis: VisibilityState) => void
  columnSizing: ColumnSizingState
  onColumnSizingChange: (sizing: ColumnSizingState) => void
  onRowDragEnd: (event: DragEndEvent) => void
  // Bulk selection
  selectedTaskIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

export default function TaskTableView({
  tasks,
  showAccount,
  onTaskUpdate,
  onOpenDetail,
  sorting,
  onSortingChange,
  columnOrder,
  onColumnOrderChange,
  columnVisibility,
  onColumnVisibilityChange,
  columnSizing,
  onColumnSizingChange,
  onRowDragEnd,
  selectedTaskIds,
  onSelectionChange,
}: TaskTableViewProps) {
  const hasSelection = !!onSelectionChange
  const allSelected = hasSelection && tasks.length > 0 && tasks.every(t => selectedTaskIds?.has(t.id))
  const someSelected = hasSelection && !allSelected && tasks.some(t => selectedTaskIds?.has(t.id))

  function toggleAll() {
    if (!onSelectionChange) return
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(tasks.map(t => t.id)))
    }
  }

  function toggleOne(id: string) {
    if (!onSelectionChange || !selectedTaskIds) return
    const next = new Set(selectedTaskIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }
  const canDragRows = sorting.length === 0

  const colDragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const rowDragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleColumnDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = columnOrder.indexOf(active.id as string)
    const newIndex = columnOrder.indexOf(over.id as string)
    if (oldIndex !== -1 && newIndex !== -1) {
      onColumnOrderChange(arrayMove(columnOrder, oldIndex, newIndex))
    }
  }

  const columns = useMemo<ColumnDef<Task>[]>(() => [
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Title',
      enableHiding: false,
      size: 240,
      minSize: 120,
      // Cell rendered inline in SortableTableRow for first column
      cell: () => null,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      size: 110,
      minSize: 80,
      cell: ({ getValue }) => {
        const s = getValue() as TaskStatus
        return (
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap', TASK_STATUS_COLORS[s])}>
            {TASK_STATUS_LABELS[s]}
          </span>
        )
      },
    },
    {
      id: 'priority',
      accessorKey: 'priority',
      header: 'Priority',
      size: 90,
      minSize: 70,
      cell: ({ getValue }) => {
        const p = getValue() as TaskPriority | null
        if (!p) return <span className="text-[#c3c5d8] text-xs">—</span>
        return (
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap', PRIORITY_COLORS[p])}>
            {PRIORITY_LABELS[p]}
          </span>
        )
      },
    },
    {
      id: 'visibility',
      accessorKey: 'visibility',
      header: 'Visibility',
      size: 100,
      minSize: 70,
      cell: ({ getValue }) => {
        const v = (getValue() as TaskVisibility | null) ?? 'internal'
        return (
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap', VISIBILITY_COLORS[v])}>
            {VISIBILITY_LABELS[v]}
          </span>
        )
      },
    },
    {
      id: 'assignee',
      header: 'Assignee',
      size: 140,
      minSize: 80,
      accessorFn: (row) => (row.owner as Pick<Profile, 'full_name'> | null)?.full_name ?? '',
      cell: ({ row }) => {
        const owner = row.original.owner as Pick<Profile, 'full_name' | 'avatar_url'> | null
        if (!owner?.full_name) return <span className="text-[#c3c5d8] text-xs">—</span>
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-bold shrink-0">
              {owner.full_name[0].toUpperCase()}
            </div>
            <span className="text-sm text-[#434655] truncate">{owner.full_name}</span>
          </div>
        )
      },
    },
    {
      id: 'due_date',
      accessorKey: 'due_date',
      header: 'Due Date',
      size: 110,
      minSize: 80,
      cell: ({ row }) => {
        const task = row.original
        if (!task.due_date) return <span className="text-[#c3c5d8] text-xs">—</span>
        const overdue = isOverdue(task)
        return (
          <div className={cn('flex items-center gap-1 text-xs whitespace-nowrap', overdue ? 'text-red-500 font-medium' : 'text-[#737687]')}>
            <Clock className="w-3 h-3 shrink-0" />
            {task.due_date}
          </div>
        )
      },
    },
    {
      id: 'account',
      header: 'Account',
      size: 130,
      minSize: 80,
      accessorFn: (row) => (row.account as { name: string } | null)?.name ?? '',
      cell: ({ row }) => {
        const account = row.original.account as { id: string; name: string } | null
        if (!account) return <span className="text-[#c3c5d8] text-xs">—</span>
        return (
          <Link
            href={`/accounts/${account.id}/tasks`}
            className="text-xs text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {account.name}
          </Link>
        )
      },
    },
    {
      id: 'project',
      header: 'Project',
      size: 120,
      minSize: 80,
      accessorFn: (row) => (row.project as { name: string } | null)?.name ?? '',
      cell: ({ row }) => {
        const project = row.original.project as { id: string; name: string } | null
        if (!project) return <span className="text-[#c3c5d8] text-xs">—</span>
        return <span className="text-xs text-[#434655] truncate">{project.name}</span>
      },
    },
    {
      id: 'section',
      header: 'Section',
      size: 110,
      minSize: 70,
      accessorKey: 'section',
      cell: ({ row }) => {
        const section = row.original.section
        if (!section) return <span className="text-[#c3c5d8] text-xs">—</span>
        return <span className="text-xs text-[#434655] truncate">{section}</span>
      },
    },
    {
      id: 'task_id',
      header: 'Task ID',
      size: 90,
      minSize: 80,
      enableSorting: false,
      cell: ({ row }) => {
        const id = formatTaskId(row.original)
        if (!id) return <span className="text-[#c3c5d8] text-xs">—</span>
        return <span className="text-xs font-mono text-[#737687]">{id}</span>
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [])

  // TanStack uses Updater<T> (value or fn) — unwrap to plain value before forwarding to shell
  function unwrap<T>(updaterOrValue: T | ((old: T) => T), current: T): T {
    return typeof updaterOrValue === 'function' ? (updaterOrValue as (old: T) => T)(current) : updaterOrValue
  }

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting, columnVisibility, columnOrder, columnSizing },
    onSortingChange:          (u) => onSortingChange(unwrap(u, sorting)),
    onColumnVisibilityChange: (u) => onColumnVisibilityChange(unwrap(u, columnVisibility)),
    onColumnOrderChange:      (u) => onColumnOrderChange(unwrap(u, columnOrder)),
    onColumnSizingChange:     (u) => onColumnSizingChange(unwrap(u, columnSizing)),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: 'onChange',
    defaultColumn: { minSize: 60, size: 120, maxSize: 600 },
  })

  const visibleColumnOrder = columnOrder.filter(
    (id) => columnVisibility[id] !== false && (id !== 'account' || showAccount)
  )
  // Title is always first and non-draggable; exclude from sortable context
  const draggableColumnOrder = visibleColumnOrder.filter(id => id !== 'title')
  const rowIds = table.getRowModel().rows.map((r) => r.original.id)

  return (
    <div>
      <div className="border border-[#e5e2e1] rounded-xl overflow-x-auto">
        <table
          style={{ tableLayout: 'fixed', width: table.getTotalSize() }}
          className="text-left min-w-full"
        >
          <thead className="border-b border-[#e5e2e1]">
            {table.getHeaderGroups().map((headerGroup) => (
              <DndContext
                key={headerGroup.id}
                sensors={colDragSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleColumnDragEnd}
              >
                <SortableContext items={draggableColumnOrder} strategy={horizontalListSortingStrategy}>
                  <tr>
                    {hasSelection && (
                      <th className="px-3 py-2.5 w-8 bg-[#f6f3f2]">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => { if (el) el.indeterminate = someSelected }}
                          onChange={toggleAll}
                          onClick={(e) => e.stopPropagation()}
                          className="w-3.5 h-3.5 rounded border-[#c3c5d8] accent-blue-600 cursor-pointer"
                        />
                      </th>
                    )}
                    {headerGroup.headers.map((header) =>
                      header.column.id === 'title'
                        ? <StaticColumnHeader key={header.id} header={header} />
                        : <SortableColumnHeader key={header.id} header={header} />
                    )}
                  </tr>
                </SortableContext>
              </DndContext>
            ))}
          </thead>
          <DndContext
            sensors={rowDragSensors}
            collisionDetection={closestCenter}
            onDragEnd={onRowDragEnd}
          >
            <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
              <tbody className="divide-y divide-[#f0edec]">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={table.getVisibleLeafColumns().length}
                      className="px-4 py-12 text-center text-sm text-[#737687]"
                    >
                      No tasks match the current filters.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <SortableTableRow
                      key={row.id}
                      row={row}
                      canDrag={canDragRows}
                      onOpenDetail={onOpenDetail}
                      onTaskUpdate={onTaskUpdate}
                      isSelected={selectedTaskIds?.has(row.original.id) ?? false}
                      onToggleSelect={hasSelection ? () => toggleOne(row.original.id) : undefined}
                    />
                  ))
                )}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>

      {table.getRowModel().rows.length > 0 && (
        <p className="text-xs text-[#737687] mt-2 px-1">
          {table.getRowModel().rows.length} task{table.getRowModel().rows.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
