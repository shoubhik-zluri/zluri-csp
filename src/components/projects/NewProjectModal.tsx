'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { useAccounts } from '@/hooks/useAccounts'
import type { ProjectStatus, Profile } from '@/types/database'
import { PROJECT_STATUS_LABELS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface NewProjectModalProps {
  open: boolean
  onClose: () => void
  prefilledAccountId?: string
  onSaved?: () => void
}

interface FormData {
  name: string
  account_id: string
  status: ProjectStatus
  start_date: string
  due_date: string
  description: string
  owner_id: string
}

const EMPTY: FormData = {
  name: '',
  account_id: '',
  status: 'on_track',
  start_date: '',
  due_date: '',
  description: '',
  owner_id: '',
}

async function jsonFetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

export default function NewProjectModal({ open, onClose, prefilledAccountId, onSaved }: NewProjectModalProps) {
  const [form, setForm] = useState<FormData>({ ...EMPTY, account_id: prefilledAccountId ?? '' })
  const [saving, setSaving] = useState(false)
  const { accounts } = useAccounts()
  const { data: users } = useSWR<Profile[]>(open ? '/api/users' : null, jsonFetcher)

  useEffect(() => {
    if (open) setForm({ ...EMPTY, account_id: prefilledAccountId ?? '' })
  }, [open, prefilledAccountId])

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Project name is required'); return }
    if (!form.account_id) { toast.error('Account is required'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          account_id: form.account_id,
          status: form.status,
          start_date: form.start_date || null,
          due_date: form.due_date || null,
          description: form.description || null,
          owner_id: form.owner_id || null,
        }),
      })
      if (!res.ok) { toast.error('Failed to create project'); return }
      toast.success('Project created')
      onSaved?.()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#434655]">Project Name *</label>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Q3 Renewal — Acme Corp"
              className="mt-1"
              autoFocus
            />
          </div>

          {!prefilledAccountId && (
            <div>
              <label className="text-xs font-medium text-[#434655]">Account *</label>
              <Select value={form.account_id || '__none'} onValueChange={(v) => update('account_id', !v || v === '__none' ? '' : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue>
                    {form.account_id
                      ? (accounts.find(a => a.id === form.account_id)?.name ?? '…')
                      : 'Select account…'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Select account…</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name ?? a.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-[#434655]">Status</label>
            <Select value={form.status} onValueChange={(v) => update('status', v as ProjectStatus)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PROJECT_STATUS_LABELS) as [ProjectStatus, string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-[#434655]">Owner <span className="text-[#737687] font-normal">(optional)</span></label>
            <Select value={form.owner_id || '__none'} onValueChange={(v) => update('owner_id', !v || v === '__none' ? '' : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue>
                  {form.owner_id
                    ? ((users ?? []).find(u => u.id === form.owner_id)?.full_name ?? '…')
                    : 'Unassigned'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Unassigned</SelectItem>
                {(users ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#434655]">Start Date</label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => update('start_date', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#434655]">Due Date</label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => update('due_date', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#434655]">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Optional — what's this project about?"
              className="mt-1"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Creating…' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
