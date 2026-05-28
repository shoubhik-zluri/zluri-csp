'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type { Account, Sentiment, LifecycleStage, ExecEngagement, RenewalStage, ContractType, CustomerType, AccountTier, AccountStatus, Segment } from '@/types/database'
import { formatCurrency, formatDate, daysUntil, cn } from '@/lib/utils'
import {
  SENTIMENT_LABELS, LIFECYCLE_STAGE_LABELS, LIFECYCLE_STAGE_COLORS,
  EXEC_ENGAGEMENT_LABELS, RENEWAL_STAGE_LABELS, CONTRACT_TYPE_LABELS,
  RISK_SIGNAL_OPTIONS, CUSTOMER_TYPE_LABELS, TIER_LABELS,
  ACCOUNT_STATUS_LABELS, SEGMENT_LABELS, MODULE_OPTIONS,
} from '@/lib/constants'
import HealthScoreBadge from './HealthScoreBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { X, ExternalLink } from 'lucide-react'
import { useNotes } from '@/hooks/useNotes'

interface AccountOverviewPanelProps {
  account: Account
  onUpdate?: (updated: Partial<Account>) => void
}

interface FieldUpdater {
  (field: keyof Account, value: unknown): Promise<void>
}

// --- Shared primitives ---

function InlineSelect<T extends string>({
  value, options, onSave, placeholder = 'Set...',
}: {
  value: T | null | undefined
  options: Record<T, string>
  onSave: (val: T | null) => void
  placeholder?: string
}) {
  const selectedLabel = value ? (options[value as T] ?? null) : null
  return (
    <Select value={value ?? '__null'} onValueChange={(v) => onSave(!v || v === '__null' ? null : v as T)}>
      <SelectTrigger className="h-7 text-xs w-auto min-w-28 border-dashed">
        <SelectValue>
          <span className={selectedLabel ? 'text-[#1c1b1b]' : 'text-[#737687]'}>
            {selectedLabel ?? placeholder}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__null" className="text-[#737687]">{placeholder}</SelectItem>
        {(Object.entries(options) as [T, string][]).map(([val, label]) => (
          <SelectItem key={val} value={val}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function InlineTextEdit({
  value, onSave, placeholder = '—',
}: {
  value: string | null | undefined
  onSave: (val: string | null) => void
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  function start() { setDraft(value ?? ''); setEditing(true) }
  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed !== (value ?? '')) onSave(trimmed || null)
  }

  if (editing) {
    return (
      <input
        autoFocus value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="text-sm text-right w-full max-w-40 rounded px-1.5 py-0.5 border border-blue-400 outline-none bg-white"
      />
    )
  }
  return (
    <button onClick={start} className="text-sm text-[#1c1b1b] hover:text-blue-600 hover:underline cursor-pointer transition-colors text-right">
      {value || <span className="text-[#737687]">{placeholder}</span>}
    </button>
  )
}

// Toggle removed — contract type "multi-year" covers this

// Section header — sentence case, no uppercase
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-[#737687] mb-3">{children}</h3>
}

// Row uses vertical spacing only — no horizontal border dividers
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[#434655] shrink-0 w-36">{label}</span>
      <div className="text-sm text-[#1c1b1b] text-right">{children}</div>
    </div>
  )
}

// White card on #f6f3f2 background — no border needed
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('bg-white rounded-xl p-5', className)}>{children}</div>
}

// Chip button for multi-select sets (lifecycle, exec engagement, risk signals, modules)
function Chip({
  label, active, onClick, activeClass = 'bg-blue-100 text-blue-700',
}: { label: string; active: boolean; onClick: () => void; activeClass?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
        active ? activeClass : 'bg-[#f0edec] text-[#434655] hover:bg-[#e5e2e1]'
      )}
    >
      {active && <X className="w-3 h-3" />}
      {label}
    </button>
  )
}

function PulseNotesField({ value, onSave }: { value: string | null | undefined; onSave: (val: string | null) => void }) {
  const [draft, setDraft] = useState(value ?? '')
  const [dirty, setDirty] = useState(false)

  function handleChange(v: string) { setDraft(v); setDirty(v !== (value ?? '')) }
  function handleBlur() {
    if (!dirty) return
    onSave(draft.trim() || null)
    setDirty(false)
  }

  return (
    <textarea
      value={draft}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      placeholder="Why is this account flagged? Add context here..."
      rows={3}
      className="w-full text-sm text-[#1c1b1b] placeholder:text-[#737687] bg-[#f6f3f2] rounded-lg px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all"
    />
  )
}

// --- Main component ---

export default function AccountOverviewPanel({ account, onUpdate }: AccountOverviewPanelProps) {
  const [_saving, setSaving] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Array<{ id: string; full_name: string | null }>>([])
  const { notes } = useNotes(account.id)
  const expansionSignals = notes?.[0]?.metadata?.insights?.expansionSignals ?? []

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => setProfiles(Array.isArray(d) ? d : []))
  }, [])

  const csm = account.csm as { id: string; full_name: string | null; avatar_url: string | null } | null
  const daysToRenewal = daysUntil(account.renewal_date)

  // Handle exec_engagement as array (post-migration) or string (pre-migration fallback)
  const execEngagements: ExecEngagement[] = Array.isArray(account.exec_engagement)
    ? account.exec_engagement
    : account.exec_engagement ? [account.exec_engagement as ExecEngagement] : []

  const updateField: FieldUpdater = async (field, value) => {
    setSaving(field)
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const updated = await res.json()
      onUpdate?.(updated)
      toast.success('Saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(null)
    }
  }

  function toggleArr<T>(field: keyof Account, current: T[], val: T) {
    const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
    updateField(field, next)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* ── LEFT COLUMN ── */}
      <div className="space-y-5">

        {/* Account details */}
        <Card>
          <SectionLabel>Account details</SectionLabel>
          <Row label="Org ID">
            <span className="text-xs font-mono text-[#737687]">{account.org_id}</span>
          </Row>
          <Row label="ARR">
            <span className="font-semibold">{formatCurrency(account.arr)}</span>
          </Row>
          <Row label="Status">
            <InlineSelect<AccountStatus>
              value={account.status ?? 'active'}
              options={ACCOUNT_STATUS_LABELS}
              onSave={(v) => updateField('status', v ?? 'active')}
              placeholder="Set status..."
            />
          </Row>
          <Row label="Industry">
            <span className="text-[#434655]">{account.industry ?? '—'}</span>
          </Row>
          <Row label="Region">
            <span className="text-[#434655]">{account.region ?? '—'}</span>
          </Row>
          <Row label="Customer since">
            <span className="text-[#434655]">{formatDate(account.customer_since) ?? '—'}</span>
          </Row>
          {account.website && (
            <Row label="Website">
              <a href={account.website} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 justify-end">
                {account.website.replace(/^https?:\/\//, '')}
                <ExternalLink className="w-3 h-3" />
              </a>
            </Row>
          )}
        </Card>

        {/* Contract details */}
        <Card>
          <SectionLabel>Contract details</SectionLabel>
          <Row label="Customer type">
            <InlineSelect<CustomerType>
              value={account.customer_type}
              options={CUSTOMER_TYPE_LABELS}
              onSave={(v) => updateField('customer_type', v)}
              placeholder="IGA / SMP..."
            />
          </Row>
          <Row label="Tier">
            <InlineSelect<AccountTier>
              value={account.tier}
              options={TIER_LABELS}
              onSave={(v) => updateField('tier', v)}
              placeholder="Set tier..."
            />
          </Row>
          <Row label="Segment">
            <InlineSelect<Segment>
              value={account.segment}
              options={SEGMENT_LABELS}
              onSave={(v) => updateField('segment', v)}
              placeholder="Set segment..."
            />
          </Row>
          <Row label="Contract type">
            <InlineSelect<ContractType>
              value={account.contract_type}
              options={CONTRACT_TYPE_LABELS}
              onSave={(v) => updateField('contract_type', v)}
              placeholder="Set type..."
            />
          </Row>
          <Row label="Renewal date">
            <div className="text-right">
              <div className={cn(
                'text-sm font-medium',
                daysToRenewal !== null && daysToRenewal < 0 ? 'text-red-600' :
                daysToRenewal !== null && daysToRenewal <= 30 ? 'text-orange-600' :
                'text-[#1c1b1b]'
              )}>
                {formatDate(account.renewal_date) ?? '—'}
              </div>
              {daysToRenewal !== null && (
                <div className="text-xs text-[#737687] mt-0.5">
                  {daysToRenewal < 0
                    ? `${Math.abs(daysToRenewal)} days overdue`
                    : daysToRenewal === 0 ? 'Today'
                    : `${daysToRenewal} days away`}
                </div>
              )}
            </div>
          </Row>
          <Row label="Contract renewal">
            <span className="text-[#434655]">{formatDate(account.contract_renewal_date) ?? '—'}</span>
          </Row>
          <Row label="Renewal stage">
            <InlineSelect<RenewalStage>
              value={account.renewal_stage}
              options={RENEWAL_STAGE_LABELS}
              onSave={(v) => updateField('renewal_stage', v)}
              placeholder="Set stage..."
            />
          </Row>
        </Card>

        {/* Team */}
        <Card>
          <SectionLabel>Team</SectionLabel>
          <Row label="CSM owner">
            <Select
              value={account.csm_id ?? '__none__'}
              onValueChange={(v) => updateField('csm_id', v === '__none__' ? null : v)}
            >
              <SelectTrigger className="h-7 text-xs w-auto min-w-36 border-dashed">
                <SelectValue>
                  {csm ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={csm.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                          {getInitials(csm.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{csm.full_name}</span>
                    </div>
                  ) : <span className="text-[#737687]">Unassigned</span>}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-[#737687]">Unassigned</SelectItem>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Account executive">
            <InlineTextEdit
              value={account.associated_ae}
              onSave={(v) => updateField('associated_ae', v)}
              placeholder="Add AE name..."
            />
          </Row>
          <Row label="CS engineer">
            <InlineTextEdit
              value={account.associated_cse}
              onSave={(v) => updateField('associated_cse', v)}
              placeholder="Add CSE name..."
            />
          </Row>
          <Row label="Partner sourced">
            <button
              onClick={() => updateField('partner_sourced', !account.partner_sourced)}
              className={cn('w-9 h-5 rounded-full relative transition-colors flex-shrink-0',
                account.partner_sourced ?? false ? 'bg-blue-600' : 'bg-[#e5e2e1]')}
            >
              <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                account.partner_sourced ?? false ? 'left-4' : 'left-0.5')} />
            </button>
          </Row>
          {(account.partner_sourced ?? false) && (
            <Row label="Partner name">
              <InlineTextEdit
                value={account.partner_name}
                onSave={(v) => updateField('partner_name', v)}
                placeholder="Add partner name..."
              />
            </Row>
          )}
        </Card>

      </div>

      {/* ── RIGHT COLUMN ── */}
      <div className="space-y-5">

        {/* Health & pulse */}
        <Card>
          <SectionLabel>Health & pulse</SectionLabel>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[#434655]">Health score</span>
            <HealthScoreBadge score={account.health_score} showBand />
          </div>
          <div className="mb-4">
            <span className="text-sm text-[#434655] block mb-2">CSM pulse</span>
            <div className="flex gap-2 flex-wrap">
              {([
                { value: 'good' as Sentiment, label: 'Good', inactive: 'bg-green-50 text-green-700 hover:bg-green-100', active: 'bg-green-500 text-white' },
                { value: 'some_risk' as Sentiment, label: 'Some Risk', inactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100', active: 'bg-amber-500 text-white' },
                { value: 'high_risk' as Sentiment, label: 'High Risk', inactive: 'bg-red-50 text-red-700 hover:bg-red-100', active: 'bg-red-500 text-white' },
              ]).map(({ value, label, inactive, active }) => (
                <button
                  key={value}
                  onClick={() => updateField('sentiment', value)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-semibold transition-all',
                    account.sentiment === value ? active : inactive
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm text-[#434655] block mb-1.5">Pulse notes</span>
            <PulseNotesField value={account.notes} onSave={(v) => updateField('notes', v)} />
          </div>
        </Card>

        {/* Lifecycle stage — visual chip multi-select */}
        <Card>
          <SectionLabel>Lifecycle stage</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(LIFECYCLE_STAGE_LABELS) as [LifecycleStage, string][]).map(([val, label]) => {
              const active = (account.lifecycle_stage ?? []).includes(val)
              return (
                <button
                  key={val}
                  onClick={() => toggleArr('lifecycle_stage', account.lifecycle_stage ?? [], val)}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                    active
                      ? cn(LIFECYCLE_STAGE_COLORS[val])
                      : 'bg-[#f0edec] text-[#434655] hover:bg-[#e5e2e1]'
                  )}
                >
                  {active && <X className="w-3 h-3" />}
                  {label}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Exec engagement — visual chip multi-select */}
        <Card>
          <SectionLabel>Exec engagement</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(EXEC_ENGAGEMENT_LABELS) as [ExecEngagement, string][]).map(([val, label]) => {
              const active = execEngagements.includes(val)
              return (
                <Chip
                  key={val}
                  label={label}
                  active={active}
                  activeClass="bg-indigo-100 text-indigo-700"
                  onClick={() => toggleArr('exec_engagement', execEngagements, val)}
                />
              )
            })}
          </div>
        </Card>

        {/* Modules purchased — fixed options chip multi-select */}
        <Card>
          <SectionLabel>Modules purchased</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {MODULE_OPTIONS.map((mod) => {
              const active = (account.modules_purchased ?? []).includes(mod)
              return (
                <Chip
                  key={mod}
                  label={mod}
                  active={active}
                  activeClass="bg-blue-600 text-white"
                  onClick={() => toggleArr('modules_purchased', account.modules_purchased ?? [], mod)}
                />
              )
            })}
          </div>
        </Card>

        {/* Risk signals */}
        <Card>
          <SectionLabel>Risk signals</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {RISK_SIGNAL_OPTIONS.map(({ value, label }) => {
              const active = (account.risk_signals ?? []).includes(value)
              return (
                <Chip
                  key={value}
                  label={label}
                  active={active}
                  activeClass="bg-red-100 text-red-700"
                  onClick={() => toggleArr('risk_signals', account.risk_signals ?? [], value)}
                />
              )
            })}
          </div>
          {(account.risk_signals ?? []).length === 0 && (
            <p className="text-xs text-[#737687] mt-1">No active risk signals</p>
          )}
        </Card>

        {/* Expansion Signals */}
        {expansionSignals.length > 0 && (
          <Card>
            <SectionLabel>Expansion signals</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {expansionSignals.map((signal, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                  {signal}
                </span>
              ))}
            </div>
          </Card>
        )}

      </div>
    </div>
  )
}
