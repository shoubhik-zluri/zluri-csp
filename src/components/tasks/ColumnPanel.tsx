'use client'

import { X, GripVertical, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { VisibilityState } from '@tanstack/react-table'

interface ColumnPanelProps {
  open: boolean
  onClose: () => void
  columnOrder: string[]
  columnVisibility: VisibilityState
  onColumnOrderChange: (order: string[]) => void
  onColumnVisibilityChange: (vis: VisibilityState) => void
  columnLabels: Record<string, string>
  alwaysVisibleColumns: string[]
  showAccountColumn?: boolean
}

function SortableColumnRow({
  id,
  label,
  isVisible,
  isAlwaysVisible,
  onToggle,
}: {
  id: string
  label: string
  isVisible: boolean
  isAlwaysVisible: boolean
  onToggle: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 transition-colors',
        !isVisible && 'opacity-40'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-[#c3c5d8] hover:text-[#737687] cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span className={cn('flex-1 text-sm text-[#434655]', !isVisible && 'line-through text-[#c3c5d8]')}>
        {label}
      </span>
      <button
        onClick={onToggle}
        disabled={isAlwaysVisible}
        className={cn(
          'shrink-0 transition-colors',
          isAlwaysVisible ? 'text-[#e5e2e1] cursor-not-allowed' : 'text-[#737687] hover:text-[#434655]'
        )}
        title={isAlwaysVisible ? 'Always visible' : isVisible ? 'Hide column' : 'Show column'}
      >
        {isVisible
          ? <Eye className="w-3.5 h-3.5" />
          : <EyeOff className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

export default function ColumnPanel({
  open,
  onClose,
  columnOrder,
  columnVisibility,
  onColumnOrderChange,
  onColumnVisibilityChange,
  columnLabels,
  alwaysVisibleColumns,
  showAccountColumn = true,
}: ColumnPanelProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = columnOrder.indexOf(active.id as string)
    const newIndex = columnOrder.indexOf(over.id as string)
    if (oldIndex !== -1 && newIndex !== -1) {
      onColumnOrderChange(arrayMove(columnOrder, oldIndex, newIndex))
    }
  }

  function toggleVisibility(colId: string) {
    onColumnVisibilityChange({
      ...columnVisibility,
      [colId]: columnVisibility[colId] === false ? true : false,
    })
  }

  // Title is always first/visible; exclude from sortable context so it can't be reordered
  const sortableColumns = columnOrder.filter(id => id !== 'title' && (id !== 'account' || showAccountColumn))
  const visibleColumns = columnOrder.filter(id => id !== 'account' || showAccountColumn)

  if (!open) return null

  return (
    <div className="fixed right-0 top-0 bottom-0 z-40 flex pointer-events-none">
      {/* backdrop — transparent, just blocks clicks behind panel */}
      <div className="flex-1" onClick={onClose} style={{ pointerEvents: 'auto' }} />
      <div
        className="w-64 bg-white border-l border-[#e5e2e1] shadow-xl flex flex-col"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0edec]">
          <span className="text-sm font-semibold text-[#1c1b1b]">Columns</span>
          <button onClick={onClose} className="text-[#737687] hover:text-[#434655] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Column list */}
        <div className="flex-1 overflow-y-auto py-1">
          {/* Title row — always first, not draggable or hideable */}
          <div className="flex items-center gap-2 px-3 py-2 opacity-50">
            <GripVertical className="w-3.5 h-3.5 text-[#c3c5d8] cursor-not-allowed shrink-0" />
            <span className="flex-1 text-sm text-[#434655]">{columnLabels['title'] ?? 'Title'}</span>
            <Eye className="w-3.5 h-3.5 text-[#e5e2e1] cursor-not-allowed shrink-0" />
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableColumns} strategy={verticalListSortingStrategy}>
              {sortableColumns.map((colId) => (
                <SortableColumnRow
                  key={colId}
                  id={colId}
                  label={columnLabels[colId] ?? colId}
                  isVisible={columnVisibility[colId] !== false}
                  isAlwaysVisible={alwaysVisibleColumns.includes(colId)}
                  onToggle={() => toggleVisibility(colId)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="px-4 py-3 border-t border-[#f0edec] text-xs text-[#737687]">
          Drag rows to reorder columns
        </div>
      </div>
    </div>
  )
}
