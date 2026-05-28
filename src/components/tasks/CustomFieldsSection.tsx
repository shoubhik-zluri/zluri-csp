'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CustomFieldDefinition } from '@/types/database'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// ─── Value display helpers ────────────────────────────────────────────────────

function displayValue(field: CustomFieldDefinition, value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (field.field_type === 'multi_select' && Array.isArray(value)) return value.join(', ')
  return String(value)
}

// ─── Inline field editor ──────────────────────────────────────────────────────

function FieldEditor({
  field,
  value,
  onSave,
  onCancel,
}: {
  field: CustomFieldDefinition
  value: unknown
  onSave: (v: unknown) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<unknown>(value ?? (field.field_type === 'multi_select' ? [] : ''))

  function commit() { onSave(draft === '' ? null : draft) }

  if (field.field_type === 'single_select') {
    return (
      <Select
        value={String(draft ?? '__none')}
        onValueChange={(v) => { onSave(v === '__none' ? null : v) }}
      >
        <SelectTrigger className="h-7 text-xs mt-0.5 w-full">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">—</SelectItem>
          {field.options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
        </SelectContent>
      </Select>
    )
  }

  if (field.field_type === 'multi_select') {
    const selected = Array.isArray(draft) ? draft as string[] : []
    return (
      <div className="space-y-1 mt-1">
        {field.options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...selected, opt]
                  : selected.filter((s) => s !== opt)
                setDraft(next)
              }}
              className="rounded accent-blue-600"
            />
            {opt}
          </label>
        ))}
        <div className="flex gap-2 pt-1">
          <button onClick={commit} className="text-[10px] font-semibold text-blue-600 hover:underline">Save</button>
          <button onClick={onCancel} className="text-[10px] text-[#737687] hover:underline">Cancel</button>
        </div>
      </div>
    )
  }

  const inputType = field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'

  return (
    <input
      autoFocus
      type={inputType}
      value={String(draft ?? '')}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel() }}
      className="w-full text-sm text-[#1c1b1b] bg-transparent border-b border-blue-400 outline-none py-0.5 mt-0.5"
    />
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

interface CustomFieldsSectionProps {
  taskId: string
}

export default function CustomFieldsSection({ taskId }: CustomFieldsSectionProps) {
  const { data: definitions = [] } = useSWR<CustomFieldDefinition[]>('/api/custom-fields', fetcher)
  const { data: values = {}, mutate } = useSWR<Record<string, unknown>>(
    `/api/tasks/${taskId}/custom-fields`,
    fetcher
  )
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)

  const saveValue = useCallback(async (fieldId: string, value: unknown) => {
    setEditingFieldId(null)
    const prev = values[fieldId]
    mutate({ ...values, [fieldId]: value }, false)

    const res = await fetch(`/api/tasks/${taskId}/custom-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_id: fieldId, value }),
    })
    if (!res.ok) {
      mutate({ ...values, [fieldId]: prev }, false)
      toast.error('Failed to save')
    }
  }, [taskId, values, mutate])

  if (definitions.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontal className="w-3.5 h-3.5 text-[#434655]" />
        <span className="text-xs font-bold text-[#434655] uppercase tracking-widest">Custom Fields</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {definitions.map((field) => {
          const value = values[field.id]
          const isEditing = editingFieldId === field.id
          const display = displayValue(field, value)

          const isFullWidth = field.field_type === 'multi_select' || field.field_type === 'text'

          return (
            <div
              key={field.id}
              className={cn('bg-[#f6f3f2] rounded-xl p-3', isFullWidth && 'col-span-2')}
            >
              <div className="text-[10px] font-bold tracking-widest uppercase text-[#737687] mb-1">
                {field.name}{field.is_required && <span className="text-red-400 ml-0.5">*</span>}
              </div>

              {isEditing ? (
                <FieldEditor
                  field={field}
                  value={value}
                  onSave={(v) => saveValue(field.id, v)}
                  onCancel={() => setEditingFieldId(null)}
                />
              ) : (
                <div
                  onClick={() => setEditingFieldId(field.id)}
                  title="Click to edit"
                  className={cn(
                    'text-sm font-medium cursor-pointer hover:bg-[#ebe7e7] rounded px-1 -mx-1 transition-colors min-h-[1.25rem]',
                    display ? 'text-[#1c1b1b]' : 'text-[#737687] italic'
                  )}
                >
                  {display || 'Set value…'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
