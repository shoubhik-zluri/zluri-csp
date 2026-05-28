'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Profile } from '@/types/database'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function CreateAccountModal({ open, onClose, onCreated }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    csm_id: '',
    arr: '',
    renewal_date: '',
    contract_type: '',
    tier: '',
    segment: '',
  })

  useEffect(() => {
    if (!open) return
    fetch('/api/users').then(r => r.json()).then(d => setProfiles(Array.isArray(d) ? d : []))
  }, [open])

  function update(key: string, value: string | null) {
    setForm(f => ({ ...f, [key]: value ?? '' }))
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Account name is required'); return }
    setSaving(true)
    try {
      const body: Record<string, unknown> = { name: form.name.trim() }
      if (form.csm_id) body.csm_id = form.csm_id
      if (form.arr) body.arr = parseFloat(form.arr)
      if (form.renewal_date) body.renewal_date = form.renewal_date
      if (form.contract_type) body.contract_type = form.contract_type
      if (form.tier) body.tier = form.tier
      if (form.segment) body.segment = form.segment

      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to create account')
        return
      }
      toast.success('Account created')
      onCreated()
      onClose()
      setForm({ name: '', csm_id: '', arr: '', renewal_date: '', contract_type: '', tier: '', segment: '' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Account Name *</label>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Acme Corp"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">CSM Owner</label>
            <Select value={form.csm_id} onValueChange={(v) => update('csm_id', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Assign to CSM..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">ARR ($)</label>
            <Input
              value={form.arr}
              onChange={(e) => update('arr', e.target.value)}
              placeholder="50000"
              type="number"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Renewal Date</label>
            <Input
              value={form.renewal_date}
              onChange={(e) => update('renewal_date', e.target.value)}
              type="date"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Contract Type</label>
            <Select value={form.contract_type} onValueChange={(v) => update('contract_type', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="multi-year">Multi-Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Tier</label>
            <Select value={form.tier} onValueChange={(v) => update('tier', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select tier..." />
              </SelectTrigger>
              <SelectContent>
                {['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Segment</label>
            <Select value={form.segment} onValueChange={(v) => update('segment', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select segment..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enterprise">Enterprise</SelectItem>
                <SelectItem value="mid_market">Mid Market</SelectItem>
                <SelectItem value="smb">SMB</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Creating...' : 'Create Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
