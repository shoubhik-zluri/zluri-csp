'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  open: boolean
  onClose: () => void
  accountId: string
  onSaved?: () => void
}

export default function NoteDialog({ open, onClose, accountId, onSaved }: Props) {
  const [form, setForm] = useState({ title: '', content: '', meeting_date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  function update(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.content.trim()) { toast.error('Note content is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          title: form.title.trim() || null,
          content: form.content.trim(),
          meeting_date: form.meeting_date,
          source: 'manual',
          attendees: [],
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to save note')
        return
      }
      toast.success('Note saved')
      onSaved?.()
      onClose()
      setForm({ title: '', content: '', meeting_date: new Date().toISOString().split('T')[0] })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log a Call</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#434655]">Title (optional)</label>
            <Input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. QBR follow-up"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#434655]">Meeting Date</label>
            <Input
              value={form.meeting_date}
              onChange={(e) => update('meeting_date', e.target.value)}
              type="date"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#434655]">Content *</label>
            <textarea
              value={form.content}
              onChange={(e) => update('content', e.target.value)}
              placeholder="What was discussed, decisions made, next steps..."
              rows={5}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Log Call'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
