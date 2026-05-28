'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { toast } from 'sonner'
import type { CustomFieldDefinition, CustomFieldType } from '@/types/database'

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  single_select: 'Single Select',
  multi_select: 'Multi Select',
}

const FIELD_TYPE_OPTIONS: CustomFieldType[] = ['text', 'number', 'date', 'single_select', 'multi_select']

// ─── Add field form ───────────────────────────────────────────────────────────

function AddFieldForm({ onCreated }: { onCreated: (field: CustomFieldDefinition) => void }) {
  const [name, setName] = useState('')
  const [fieldType, setFieldType] = useState<CustomFieldType>('text')
  const [optionsRaw, setOptionsRaw] = useState('')
  const [saving, setSaving] = useState(false)

  const needsOptions = fieldType === 'single_select' || fieldType === 'multi_select'

  async function handleCreate() {
    if (!name.trim()) { toast.error('Name is required'); return }
    if (needsOptions && !optionsRaw.trim()) { toast.error('Add at least one option'); return }

    const options = needsOptions
      ? optionsRaw.split('\n').map((s) => s.trim()).filter(Boolean)
      : []

    setSaving(true)
    try {
      const res = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), field_type: fieldType, options }),
      })
      if (!res.ok) { toast.error('Failed to create field'); return }
      const data = await res.json()
      toast.success('Field created')
      onCreated(data)
      setName('')
      setFieldType('text')
      setOptionsRaw('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm space-y-4 border border-[#e5e2e1]">
      <h3 className="text-xs font-bold tracking-widest uppercase text-[#434655]">New field</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#434655] mb-1">Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            placeholder="e.g. Customer Segment"
            className="w-full border border-[#e5e2e1] rounded-xl px-3 py-2 text-sm text-[#1c1b1b] focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#434655] mb-1">Type *</label>
          <select
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
            className="w-full border border-[#e5e2e1] rounded-xl px-3 py-2 text-sm text-[#1c1b1b] focus:outline-none focus:border-blue-500 bg-white"
          >
            {FIELD_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {needsOptions && (
        <div>
          <label className="block text-xs font-medium text-[#434655] mb-1">
            Options <span className="font-normal text-[#737687]">(one per line)</span>
          </label>
          <textarea
            value={optionsRaw}
            onChange={(e) => setOptionsRaw(e.target.value)}
            placeholder={`Enterprise\nMid-Market\nSMB`}
            rows={4}
            className="w-full border border-[#e5e2e1] rounded-xl px-3 py-2 text-sm text-[#1c1b1b] focus:outline-none focus:border-blue-500 resize-none font-mono"
          />
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={saving}
        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />{saving ? 'Creating…' : 'Create field'}
      </button>
    </div>
  )
}

// ─── Edit options inline ──────────────────────────────────────────────────────

function OptionEditor({
  options,
  onChange,
}: {
  options: string[]
  onChange: (opts: string[]) => void
}) {
  const [newOpt, setNewOpt] = useState('')

  function add() {
    const trimmed = newOpt.trim()
    if (!trimmed || options.includes(trimmed)) return
    onChange([...options, trimmed])
    setNewOpt('')
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <span
            key={opt}
            className="flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full"
          >
            {opt}
            <button
              onClick={() => onChange(options.filter((o) => o !== opt))}
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newOpt}
          onChange={(e) => setNewOpt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Add option…"
          className="flex-1 border border-[#e5e2e1] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-400"
        />
        <button onClick={add} className="text-xs font-semibold text-blue-600 hover:underline px-1">Add</button>
      </div>
    </div>
  )
}

// ─── Field row ────────────────────────────────────────────────────────────────

function FieldRow({
  field,
  isFirst,
  isLast,
  onMove,
  onUpdate,
  onDelete,
}: {
  field: CustomFieldDefinition
  isFirst: boolean
  isLast: boolean
  onMove: (dir: 'up' | 'down') => void
  onUpdate: (updates: Partial<CustomFieldDefinition>) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(field.name)
  const [options, setOptions] = useState(field.options)
  const [saving, setSaving] = useState(false)

  const needsOptions = field.field_type === 'single_select' || field.field_type === 'multi_select'

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    const body: Record<string, unknown> = { name: name.trim() }
    if (needsOptions) body.options = options
    const res = await fetch(`/api/custom-fields/${field.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) { toast.error('Failed to save'); setSaving(false); return }
    onUpdate({ name: name.trim(), options })
    setEditing(false)
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${field.name}"? All existing values will be lost.`)) return
    const res = await fetch(`/api/custom-fields/${field.id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); return }
    onDelete()
    toast.success('Field deleted')
  }

  return (
    <div className="px-5 py-4 flex items-start gap-3 group">
      {/* Reorder */}
      <div className="flex flex-col gap-0.5 mt-0.5 shrink-0">
        <button
          onClick={() => onMove('up')}
          disabled={isFirst}
          className="text-[#c3c5d8] hover:text-[#434655] disabled:opacity-20 transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onMove('down')}
          disabled={isLast}
          className="text-[#c3c5d8] hover:text-[#434655] disabled:opacity-20 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[#e5e2e1] rounded-lg px-3 py-1.5 text-sm text-[#1c1b1b] focus:outline-none focus:border-blue-500"
            />
            {needsOptions && (
              <OptionEditor options={options} onChange={setOptions} />
            )}
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditing(false); setName(field.name); setOptions(field.options) }} className="text-xs text-slate-400 hover:underline">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#1c1b1b]">{field.name}</span>
            <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {FIELD_TYPE_LABELS[field.field_type]}
            </span>
            {field.is_required && (
              <span className="text-[10px] font-medium bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Required</span>
            )}
            {needsOptions && field.options.length > 0 && (
              <span className="text-xs text-[#737687]">{field.options.join(' · ')}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-[#737687] hover:text-[#1c1b1b] px-2 py-1 rounded-lg hover:bg-[#f0edec] transition-colors"
          >
            Edit
          </button>
        )}
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg text-[#c3c5d8] hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Tab ──────────────────────────────────────────────────────────────────────

export default function CustomFieldsTab() {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/custom-fields')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setFields(d) })
      .finally(() => setLoading(false))
  }, [])

  function handleCreated(field: CustomFieldDefinition) {
    setFields((f) => [...f, field])
  }

  function handleUpdate(id: string, updates: Partial<CustomFieldDefinition>) {
    setFields((f) => f.map((x) => x.id === id ? { ...x, ...updates } : x))
  }

  function handleDelete(id: string) {
    setFields((f) => f.filter((x) => x.id !== id))
  }

  async function handleMove(index: number, dir: 'up' | 'down') {
    const swapIndex = dir === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= fields.length) return

    const reordered = [...fields]
    ;[reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]]
    const withPositions = reordered.map((f, i) => ({ ...f, position: i }))
    setFields(withPositions)

    // Persist both swapped fields
    await Promise.all([
      fetch(`/api/custom-fields/${withPositions[index].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: withPositions[index].position }),
      }),
      fetch(`/api/custom-fields/${withPositions[swapIndex].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: withPositions[swapIndex].position }),
      }),
    ])
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-base font-bold text-[#1c1b1b] mb-1 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />Custom Fields
        </h2>
        <p className="text-sm text-[#434655]">
          Define extra fields that appear on every task. Useful for tracking customer-specific metadata.
        </p>
      </div>

      <AddFieldForm onCreated={handleCreated} />

      <div>
        <h3 className="text-xs font-bold tracking-widest uppercase text-[#434655] mb-3">
          Fields ({fields.length})
        </h3>
        {loading ? (
          <div className="text-sm text-[#737687]">Loading…</div>
        ) : fields.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-[#e5e2e1]">
            <SlidersHorizontal className="w-8 h-8 text-[#c3c5d8] mx-auto mb-2" />
            <p className="text-sm text-[#737687]">No custom fields yet. Create one above.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm divide-y divide-[#f0edec] border border-[#e5e2e1]">
            {fields.map((field, i) => (
              <FieldRow
                key={field.id}
                field={field}
                isFirst={i === 0}
                isLast={i === fields.length - 1}
                onMove={(dir) => handleMove(i, dir)}
                onUpdate={(updates) => handleUpdate(field.id, updates)}
                onDelete={() => handleDelete(field.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
