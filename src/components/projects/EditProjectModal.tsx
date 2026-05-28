'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import type { Project, ProjectStatus, Profile } from '@/types/database'
import { PROJECT_STATUS_LABELS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface EditProjectModalProps {
  open: boolean
  onClose: () => void
  project: Project
  onSaved?: () => void
}

interface FormData {
  name: string
  status: ProjectStatus
  start_date: string
  due_date: string
  description: string
  owner_id: string
}

async function jsonFetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

export default function EditProjectModal({ open, onClose, project, onSaved }: EditProjectModalProps) {
  const [form, setForm] = useState<FormData>({
    name: '',
    status: 'on_track',
    start_date: '',
    due_date: '',
    description: '',
    owner_id: '',
  })
  const [saving, setSaving] = useState(false)
  const { data: users } = useSWR<Profile[]>(open ? '/api/users' : null, jsonFetcher)

  useEffect(() => {
    if (open) {
      setForm({
        name: project.name,
        status: project.status,
        start_date: project.start_date ?? '',
        due_date: project.due_date ?? '',
        description: project.description ?? '',
        owner_id: project.owner_id ?? '',
      })
    }
  }, [open, project])

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Project name is required'); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          status: form.status,
          start_date: form.start_date || null,
          due_date: form.due_date || null,
          description: form.description || null,
          owner_id: form.owner_id || null,
        }),
      })
      if (!res.ok) { toast.error('Failed to update project'); return }
      toast.success('Project updated')
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
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#434655]">Project Name *</label>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#434655]">Status</label>
            <Select value={form.status} onValueChange={(v) => v && update('status', v as ProjectStatus)}>
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
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
