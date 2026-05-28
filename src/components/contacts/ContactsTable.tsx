'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { Contact } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Pencil, Trash2, Plus, Star } from 'lucide-react'

const CONTACT_ROLES = [
  'Champion',
  'Economic Buyer',
  'Executive Sponsor',
  'Technical Lead',
  'Admin',
  'End User',
  'Procurement',
  'Other',
]

interface ContactFormData {
  name: string
  email: string
  roles: string[]
  phone: string
  linkedin_url: string
  is_primary: boolean
}

const EMPTY_FORM: ContactFormData = { name: '', email: '', roles: [], phone: '', linkedin_url: '', is_primary: false }

interface ContactDialogProps {
  open: boolean
  onClose: () => void
  initial?: ContactFormData
  title: string
  onSave: (data: ContactFormData) => Promise<void>
}

function RoleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
      )}
    >
      {label}
    </button>
  )
}

function ContactDialog({ open, onClose, initial = EMPTY_FORM, title, onSave }: ContactDialogProps) {
  const [form, setForm] = useState<ContactFormData>(initial)
  const [saving, setSaving] = useState(false)

  function update(key: keyof ContactFormData, value: string | boolean | string[]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleRole(role: string) {
    setForm(f => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role],
    }))
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Name *</label>
            <Input value={form.name} onChange={(e) => update('name', e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Email</label>
            <Input value={form.email} onChange={(e) => update('email', e.target.value)} className="mt-1" type="email" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-2">Roles</label>
            <div className="flex flex-wrap gap-2">
              {CONTACT_ROLES.map(role => (
                <RoleChip
                  key={role}
                  label={role}
                  active={form.roles.includes(role)}
                  onClick={() => toggleRole(role)}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Phone</label>
            <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="mt-1" type="tel" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">LinkedIn</label>
            <Input value={form.linkedin_url} onChange={(e) => update('linkedin_url', e.target.value)} className="mt-1" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={(e) => update('is_primary', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-slate-700">Primary contact</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ContactsTableProps {
  contacts: Contact[]
  accountId: string
  isLoading?: boolean
  onMutate: () => void
}

export default function ContactsTable({ contacts, accountId, isLoading, onMutate }: ContactsTableProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)

  async function handleAdd(form: ContactFormData) {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role: form.roles, account_id: accountId }),
    })
    if (!res.ok) { toast.error('Failed to add contact'); return }
    toast.success('Contact added')
    onMutate()
  }

  async function handleEdit(form: ContactFormData) {
    if (!editing) return
    const res = await fetch(`/api/contacts/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role: form.roles }),
    })
    if (!res.ok) { toast.error('Failed to update contact'); return }
    toast.success('Contact updated')
    onMutate()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this contact?')) return
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); return }
    toast.success('Contact deleted')
    onMutate()
  }

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}</div>
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">No contacts yet.</div>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => {
            const roles = Array.isArray(c.role) ? c.role : (c.role ? [c.role as unknown as string] : [])
            return (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                    {(c.name ?? 'U').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-900">{c.name}</span>
                      {c.is_primary && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {c.email && <span className="text-xs text-slate-500">{c.email}</span>}
                      {roles.map(r => (
                        <Badge key={r} variant="secondary" className="text-xs h-4 px-1.5">{r}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="w-7 h-7 p-0" onClick={() => setEditing(c)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="w-7 h-7 p-0 text-red-400 hover:text-red-600" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ContactDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Contact"
        onSave={handleAdd}
      />
      {editing && (
        <ContactDialog
          open
          onClose={() => setEditing(null)}
          title="Edit Contact"
          initial={{
            name: editing.name,
            email: editing.email ?? '',
            roles: Array.isArray(editing.role) ? editing.role : (editing.role ? [editing.role as unknown as string] : []),
            phone: editing.phone ?? '',
            linkedin_url: editing.linkedin_url ?? '',
            is_primary: editing.is_primary,
          }}
          onSave={handleEdit}
        />
      )}
    </div>
  )
}
