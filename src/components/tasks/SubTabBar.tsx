'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskView } from '@/types/database'
import type { DueDateFilterValue } from '@/lib/task-filters'
import { PRIORITY_LABELS } from '@/lib/constants'
import type { TaskPriority } from '@/types/database'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface SaveViewFilters {
  filterAssignee: string | null
  filterPriority: string | null
  dueDate: DueDateFilterValue
}

interface SubTabBarProps {
  presets: { id: string; label: string; count: number }[]
  savedViews: TaskView[]
  activeSubTabId: string
  onTabChange: (id: string) => void
  onSaveView: (name: string, filters: SaveViewFilters) => Promise<void>
  onDeleteView: (id: string) => Promise<void>
  currentFilters: SaveViewFilters
  assignees: { id: string; full_name: string | null }[]
}

const DUE_DATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all',        label: 'All dates' },
  { value: 'today',      label: 'Due Today' },
  { value: 'this_week',  label: 'Due This Week' },
  { value: 'this_month', label: 'Due This Month' },
]

function dueDateKind(f: DueDateFilterValue): string {
  return f.kind === 'custom' ? 'all' : f.kind
}

function kindToFilter(kind: string): DueDateFilterValue {
  if (kind === 'today')      return { kind: 'today' }
  if (kind === 'this_week')  return { kind: 'this_week' }
  if (kind === 'this_month') return { kind: 'this_month' }
  return { kind: 'all' }
}

export default function SubTabBar({
  presets,
  savedViews,
  activeSubTabId,
  onTabChange,
  onSaveView,
  onDeleteView,
  currentFilters,
  assignees,
}: SubTabBarProps) {
  const [showModal, setShowModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [modalFilters, setModalFilters] = useState<SaveViewFilters>(currentFilters)
  const [saving, setSaving] = useState(false)

  function openModal() {
    setSaveName('')
    setModalFilters(currentFilters)
    setShowModal(true)
  }

  async function handleSave() {
    if (!saveName.trim()) return
    setSaving(true)
    try {
      await onSaveView(saveName.trim(), modalFilters)
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center border-b border-[#e5e2e1] mb-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {/* Preset tabs */}
        {presets.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors -mb-px shrink-0',
              activeSubTabId === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-[#737687] hover:text-[#434655]'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                activeSubTabId === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-[#e5e2e1] text-[#737687]'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}

        {/* Saved view tabs */}
        {savedViews.map((view) => (
          <div key={view.id} className="flex items-center group shrink-0 -mb-px">
            <button
              onClick={() => onTabChange(view.id)}
              className={cn(
                'flex items-center gap-1 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
                activeSubTabId === view.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-[#737687] hover:text-[#434655]'
              )}
            >
              {view.name}
            </button>
            <button
              onClick={async (e) => { e.stopPropagation(); await onDeleteView(view.id) }}
              className="opacity-0 group-hover:opacity-100 -ml-2 mr-1 p-0.5 text-[#c3c5d8] hover:text-red-400 transition-all rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Save button — "+" icon only */}
        <button
          onClick={openModal}
          className="flex items-center justify-center px-2 py-2 text-[#737687] hover:text-[#004bd8] whitespace-nowrap shrink-0 border-b-2 border-transparent -mb-px transition-colors"
          title="Save current view as a tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Save view modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save view</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-medium text-[#434655]">View name</label>
              <Input
                autoFocus
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                placeholder="e.g. My open tasks"
                className="mt-1"
              />
            </div>

            {assignees.length > 0 && (
              <div>
                <label className="text-xs font-medium text-[#434655]">Assignee</label>
                <Select
                  value={modalFilters.filterAssignee ?? 'all'}
                  onValueChange={(v) => setModalFilters(f => ({ ...f, filterAssignee: v === 'all' || v === null ? null : v }))}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue>
                      {modalFilters.filterAssignee
                        ? (assignees.find(a => a.id === modalFilters.filterAssignee)?.full_name ?? 'Unknown')
                        : 'All assignees'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All assignees</SelectItem>
                    {assignees.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.full_name ?? a.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-[#434655]">Priority</label>
              <Select
                value={modalFilters.filterPriority ?? 'all'}
                onValueChange={(v) => setModalFilters(f => ({ ...f, filterPriority: v === 'all' || v === null ? null : v }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue>
                    {modalFilters.filterPriority
                      ? PRIORITY_LABELS[modalFilters.filterPriority as TaskPriority]
                      : 'All priorities'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map(p => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-[#434655]">Due date</label>
              <Select
                value={dueDateKind(modalFilters.dueDate)}
                onValueChange={(v) => setModalFilters(f => ({ ...f, dueDate: kindToFilter(v ?? 'all') }))}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue>
                    {DUE_DATE_OPTIONS.find(o => o.value === dueDateKind(modalFilters.dueDate))?.label ?? 'All dates'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DUE_DATE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !saveName.trim()}>
              {saving ? 'Saving…' : 'Save view'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
