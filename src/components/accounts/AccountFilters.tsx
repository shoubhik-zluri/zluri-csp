'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Profile } from '@/types/database'

export interface AccountFilterState {
  csmId: string
  sentiment: string
  renewalWindow: string
  health: string
}

interface AccountFiltersProps {
  filters: AccountFilterState
  onChange: (filters: AccountFilterState) => void
  csms: Profile[]
}

export default function AccountFilters({ filters, onChange, csms }: AccountFiltersProps) {
  function update(key: keyof AccountFilterState, value: string | null) {
    onChange({ ...filters, [key]: value ?? 'all' })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={filters.csmId} onValueChange={(v) => update('csmId', v)}>
        <SelectTrigger className="w-40 h-8 text-xs">
          <SelectValue placeholder="All CSMs" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All CSMs</SelectItem>
          {csms.map((csm) => (
            <SelectItem key={csm.id} value={csm.id}>{csm.full_name ?? csm.email}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.sentiment} onValueChange={(v) => update('sentiment', v)}>
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue placeholder="All Pulses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Pulses</SelectItem>
          <SelectItem value="high_risk">High Risk</SelectItem>
          <SelectItem value="some_risk">Some Risk</SelectItem>
          <SelectItem value="good">Good</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.health} onValueChange={(v) => update('health', v)}>
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue placeholder="Health Band" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Health</SelectItem>
          <SelectItem value="critical">Critical (0–30)</SelectItem>
          <SelectItem value="at_risk">At Risk (31–60)</SelectItem>
          <SelectItem value="healthy">Healthy (61–100)</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.renewalWindow} onValueChange={(v) => update('renewalWindow', v)}>
        <SelectTrigger className="w-40 h-8 text-xs">
          <SelectValue placeholder="Renewal Window" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Renewals</SelectItem>
          <SelectItem value="30">Renewing in 30d</SelectItem>
          <SelectItem value="60">Renewing in 60d</SelectItem>
          <SelectItem value="90">Renewing in 90d</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
