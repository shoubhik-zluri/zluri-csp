'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DueDateFilterValue } from '@/lib/task-filters'

const PRESETS: { kind: DueDateFilterValue['kind']; label: string }[] = [
  { kind: 'today',      label: 'Due Today' },
  { kind: 'this_week',  label: 'Due This Week' },
  { kind: 'this_month', label: 'Due This Month' },
  { kind: 'custom',     label: 'Custom Range…' },
]

interface DueDateFilterProps {
  value: DueDateFilterValue
  onChange: (v: DueDateFilterValue) => void
}

export default function DueDateFilter({ value, onChange }: DueDateFilterProps) {
  const [open, setOpen] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Keep custom inputs in sync when restoring a saved custom filter
  useEffect(() => {
    if (value.kind === 'custom') {
      setCustomStart(value.start)
      setCustomEnd(value.end)
    }
  }, [value])

  const isActive = value.kind !== 'all'

  function applyCustom() {
    if (customStart && customEnd) {
      onChange({ kind: 'custom', start: customStart, end: customEnd })
      setOpen(false)
    }
  }

  function label() {
    if (value.kind === 'all') return 'Due Date'
    if (value.kind === 'today') return 'Due Today'
    if (value.kind === 'this_week') return 'This Week'
    if (value.kind === 'this_month') return 'This Month'
    if (value.kind === 'custom') return `${value.start} – ${value.end}`
    return 'Due Date'
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium border rounded-lg transition-colors',
          isActive
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'border-[#e5e2e1] text-[#434655] hover:bg-[#f6f3f2]'
        )}
      >
        <Calendar className="w-3 h-3 shrink-0" />
        <span className="max-w-[110px] truncate">{label()}</span>
        {isActive
          ? <X className="w-3 h-3 shrink-0 opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onChange({ kind: 'all' }) }} />
          : <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />}
      </button>

      {open && (
        <div className="absolute left-0 top-9 bg-white border border-[#e5e2e1] rounded-xl shadow-lg z-30 w-52 py-1.5">
          <button
            onClick={() => { onChange({ kind: 'all' }); setOpen(false) }}
            className={cn(
              'w-full text-left px-3 py-1.5 text-xs hover:bg-[#f6f3f2] transition-colors',
              value.kind === 'all' ? 'font-semibold text-blue-600' : 'text-[#434655]'
            )}
          >
            All dates
          </button>
          <div className="border-t border-[#f0edec] my-1" />
          {PRESETS.filter(p => p.kind !== 'custom').map((preset) => (
            <button
              key={preset.kind}
              onClick={() => {
                onChange({ kind: preset.kind } as DueDateFilterValue)
                setOpen(false)
              }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs hover:bg-[#f6f3f2] transition-colors',
                value.kind === preset.kind ? 'font-semibold text-blue-600' : 'text-[#434655]'
              )}
            >
              {preset.label}
            </button>
          ))}
          <div className="border-t border-[#f0edec] my-1" />
          {/* Custom range */}
          <div className="px-3 py-1.5 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#737687]">Custom Range</p>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="flex-1 border border-[#e5e2e1] rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-blue-400"
              />
              <span className="text-[#c3c5d8] text-xs">–</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="flex-1 border border-[#e5e2e1] rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-blue-400"
              />
            </div>
            <button
              onClick={applyCustom}
              disabled={!customStart || !customEnd}
              className="w-full text-xs font-semibold text-blue-600 hover:underline disabled:opacity-40 text-left"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
