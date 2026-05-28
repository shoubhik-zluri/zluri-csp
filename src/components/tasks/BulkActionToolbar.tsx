'use client'

import { useState, useRef, useEffect } from 'react'
import { CheckCircle2, ChevronDown, Trash2, UserCircle, Flag, Circle } from 'lucide-react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import type { Profile, TaskStatus, TaskPriority } from '@/types/database'
import { TASK_STATUS_LABELS, PRIORITY_LABELS } from '@/lib/constants'

interface BulkActionToolbarProps {
  selectedTaskIds: Set<string>
  onAction: () => void
  onClear: () => void
}

const STATUS_OPTIONS: TaskStatus[] = ['open', 'in_progress', 'completed', 'cancelled']
const PRIORITY_OPTIONS: TaskPriority[] = ['critical', 'high', 'medium', 'low']

async function bulkPatch(ids: Set<string>, body: Record<string, unknown>): Promise<boolean> {
  const results = await Promise.all(
    Array.from(ids).map(id =>
      fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    )
  )
  return results.every(r => r.ok)
}

export default function BulkActionToolbar({ selectedTaskIds, onAction, onClear }: BulkActionToolbarProps) {
  const [openMenu, setOpenMenu] = useState<'status' | 'assign' | 'priority' | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: users = [] } = useSWR<Profile[]>(
    '/api/users',
    (url: string) => fetch(url).then(r => r.json()),
    { revalidateOnFocus: false }
  )

  useEffect(() => {
    if (!openMenu) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openMenu])

  const count = selectedTaskIds.size
  if (count === 0) return null

  async function markComplete() {
    const ok = await bulkPatch(selectedTaskIds, { status: 'completed' })
    if (!ok) { toast.error('Some tasks could not be updated'); return }
    toast.success(`${count} task${count !== 1 ? 's' : ''} completed`)
    onAction(); onClear()
  }

  async function changeStatus(status: TaskStatus) {
    setOpenMenu(null)
    const ok = await bulkPatch(selectedTaskIds, { status })
    if (!ok) { toast.error('Some tasks could not be updated'); return }
    toast.success('Status updated')
    onAction(); onClear()
  }

  async function assign(ownerId: string | null) {
    setOpenMenu(null)
    const ok = await bulkPatch(selectedTaskIds, { owner_id: ownerId })
    if (!ok) { toast.error('Some tasks could not be assigned'); return }
    toast.success('Assignee updated')
    onAction(); onClear()
  }

  async function changePriority(priority: TaskPriority) {
    setOpenMenu(null)
    const ok = await bulkPatch(selectedTaskIds, { priority })
    if (!ok) { toast.error('Some tasks could not be updated'); return }
    toast.success('Priority updated')
    onAction(); onClear()
  }

  async function deleteTasks() {
    const results = await Promise.all(
      Array.from(selectedTaskIds).map(id => fetch(`/api/tasks/${id}`, { method: 'DELETE' }))
    )
    const ok = results.every(r => r.ok || r.status === 204)
    if (!ok) { toast.error('Some tasks could not be deleted'); return }
    toast.success(`${count} task${count !== 1 ? 's' : ''} deleted`)
    setDeleteConfirm(false)
    onAction(); onClear()
  }

  return (
    <div
      ref={ref}
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-[#1c1b1b] text-white rounded-2xl px-4 py-3 shadow-2xl shadow-black/30',
        'flex items-center gap-3 flex-wrap',
        'animate-in slide-in-from-bottom-4 duration-200'
      )}
    >
      <span className="text-sm font-semibold whitespace-nowrap mr-1">
        {count} task{count !== 1 ? 's' : ''} selected
      </span>

      <div className="h-4 w-px bg-white/20 shrink-0" />

      {/* Mark complete */}
      <button
        onClick={markComplete}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors whitespace-nowrap"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />Mark Complete
      </button>

      {/* Status picker */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(o => o === 'status' ? null : 'status')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors whitespace-nowrap"
        >
          <Circle className="w-3.5 h-3.5 shrink-0" />Status<ChevronDown className="w-3 h-3 shrink-0" />
        </button>
        {openMenu === 'status' && (
          <div className="absolute bottom-full mb-2 left-0 bg-white text-[#1c1b1b] rounded-xl shadow-xl border border-[#e5e2e1] py-1 min-w-36 z-10">
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => changeStatus(s)} className="w-full text-left px-4 py-2 text-xs hover:bg-[#f6f3f2] transition-colors">
                {TASK_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Assign picker */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(o => o === 'assign' ? null : 'assign')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors whitespace-nowrap"
        >
          <UserCircle className="w-3.5 h-3.5 shrink-0" />Assign<ChevronDown className="w-3 h-3 shrink-0" />
        </button>
        {openMenu === 'assign' && (
          <div className="absolute bottom-full mb-2 left-0 bg-white text-[#1c1b1b] rounded-xl shadow-xl border border-[#e5e2e1] py-1 min-w-44 z-10 max-h-48 overflow-y-auto">
            <button onClick={() => assign(null)} className="w-full text-left px-4 py-2 text-xs hover:bg-[#f6f3f2] transition-colors text-[#737687]">
              Unassigned
            </button>
            {users.map(u => (
              <button key={u.id} onClick={() => assign(u.id)} className="w-full text-left px-4 py-2 text-xs hover:bg-[#f6f3f2] transition-colors">
                {u.full_name ?? u.email}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Priority picker */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(o => o === 'priority' ? null : 'priority')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors whitespace-nowrap"
        >
          <Flag className="w-3.5 h-3.5 shrink-0" />Priority<ChevronDown className="w-3 h-3 shrink-0" />
        </button>
        {openMenu === 'priority' && (
          <div className="absolute bottom-full mb-2 left-0 bg-white text-[#1c1b1b] rounded-xl shadow-xl border border-[#e5e2e1] py-1 min-w-32 z-10">
            {PRIORITY_OPTIONS.map(p => (
              <button key={p} onClick={() => changePriority(p)} className="w-full text-left px-4 py-2 text-xs hover:bg-[#f6f3f2] transition-colors capitalize">
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-4 w-px bg-white/20 shrink-0" />

      {/* Delete */}
      {deleteConfirm ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-300 whitespace-nowrap">Delete {count}?</span>
          <button onClick={deleteTasks} className="px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-xs font-semibold transition-colors">Yes</button>
          <button onClick={() => setDeleteConfirm(false)} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs transition-colors">No</button>
        </div>
      ) : (
        <button
          onClick={() => setDeleteConfirm(true)}
          className="p-1.5 rounded-lg hover:bg-red-500/20 text-[#737687] hover:text-red-300 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      <button onClick={onClear} className="ml-1 text-[#737687] hover:text-white text-sm transition-colors leading-none">
        ✕
      </button>
    </div>
  )
}
