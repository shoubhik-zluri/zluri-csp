'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, ChevronRight, ChevronDown, X, Building2, Search } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import CreateAccountModal from '@/components/accounts/CreateAccountModal'

interface Account {
  id: string
  name: string
  arr: number
  health_score: number
  sentiment: string
  lifecycle_stage: string
  renewal_date: string
  contract_type: string
  risk_signals: string[]
  status: string
  csm: { id: string; full_name: string } | null
}

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  return `$${(n / 1000).toFixed(0)}K`
}

function healthBadge(score: number) {
  if (score >= 61) return { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' }
  if (score >= 31) return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' }
  return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' }
}

const sentimentBadge: Record<string, string> = {
  good: 'bg-green-100 text-green-700',
  some_risk: 'bg-amber-100 text-amber-700',
  high_risk: 'bg-red-100 text-red-700',
}
const sentimentLabel: Record<string, string> = {
  good: 'Positive', some_risk: 'Some Risk', high_risk: 'At Risk',
}

function csmShort(name: string | undefined) {
  if (!name) return '—'
  const parts = name.split(' ')
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

interface FilterState {
  sentiment: string
  csmId: string
  healthBand: string
  renewalWindow: string
}

interface FilterDropdownProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onSelect: (v: string) => void
  open: boolean
  onToggle: () => void
  onClose: () => void
}

function FilterDropdown({ label, value, options, onSelect, open, onToggle, onClose }: FilterDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)
  const selectedLabel = options.find(o => o.value === value)?.label ?? 'All'

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors border ${
          value
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-[#c3c5d8]/50 text-[#434655] hover:border-blue-400'
        }`}
      >
        <span className="text-xs opacity-70">{label}:</span>
        <span className="font-semibold text-xs">{selectedLabel}</span>
        {value ? (
          <X className="w-3 h-3" onClick={(e) => { e.stopPropagation(); onSelect('') }} />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-[#e5e2e1] rounded-xl shadow-lg z-20 min-w-36 py-1">
          <button
            className="w-full text-left px-4 py-2 text-xs text-[#737687] hover:bg-[#f6f3f2] transition-colors"
            onClick={() => { onSelect(''); onClose() }}
          >
            All
          </button>
          {options.map(opt => (
            <button
              key={opt.value}
              className={`w-full text-left px-4 py-2 text-xs hover:bg-[#f6f3f2] transition-colors ${
                value === opt.value ? 'font-bold text-blue-600' : 'text-[#1c1b1b]'
              }`}
              onClick={() => { onSelect(opt.value); onClose() }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AccountsPageInner() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMine, setViewMine] = useState(false)
  const [filters, setFilters] = useState<FilterState>({ sentiment: '', csmId: '', healthBand: '', renewalWindow: '' })
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const { user, isAdmin, isLoading: userLoading } = useCurrentUser()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Read URL params on mount
  useEffect(() => {
    const sentiment = searchParams.get('sentiment') ?? ''
    const renewal = searchParams.get('renewal') ?? ''
    setFilters(f => ({ ...f, sentiment, renewalWindow: renewal }))
  }, [searchParams])

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(data => setAccounts(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  // Unique CSMs from accounts list
  const csmOptions = Array.from(
    new Map(
      accounts
        .filter(a => a.csm?.id)
        .map(a => [a.csm!.id, a.csm!.full_name])
    ).entries()
  ).map(([id, name]) => ({ value: id, label: name }))

  function setFilter(key: keyof FilterState, value: string) {
    setFilters(f => ({ ...f, [key]: value }))
    // Strip URL params when user manually changes filters
    if (key === 'sentiment' || key === 'renewalWindow') {
      const params = new URLSearchParams(searchParams.toString())
      if (key === 'sentiment') value ? params.set('sentiment', value) : params.delete('sentiment')
      if (key === 'renewalWindow') value ? params.set('renewal', value) : params.delete('renewal')
      router.replace(`/accounts?${params.toString()}`, { scroll: false })
    }
  }

  function clearAllFilters() {
    setFilters({ sentiment: '', csmId: '', healthBand: '', renewalWindow: '' })
    router.replace('/accounts', { scroll: false })
  }

  const hasActiveFilters = Object.values(filters).some(Boolean)

  let displayed = isAdmin && viewMine
    ? accounts.filter(a => a.csm?.id === user?.id)
    : accounts

  if (filters.sentiment) displayed = displayed.filter(a => a.sentiment === filters.sentiment)
  if (filters.csmId) displayed = displayed.filter(a => a.csm?.id === filters.csmId)
  if (filters.healthBand) {
    if (filters.healthBand === 'healthy') displayed = displayed.filter(a => (a.health_score ?? 0) >= 61)
    else if (filters.healthBand === 'at_risk') displayed = displayed.filter(a => (a.health_score ?? 0) >= 31 && (a.health_score ?? 0) < 61)
    else if (filters.healthBand === 'critical') displayed = displayed.filter(a => (a.health_score ?? 0) < 31)
  }
  if (filters.renewalWindow) {
    const days = parseInt(filters.renewalWindow)
    displayed = displayed.filter(a => {
      const d = daysUntil(a.renewal_date)
      return d !== null && d > 0 && d <= days
    })
  }

  const totalArr = displayed.reduce((s, a) => s + (a.arr ?? 0), 0)

  if (loading || userLoading) {
    return (
      <div className="px-8 py-8 max-w-[1400px] mx-auto">
        <div className="h-9 w-48 bg-[#f0edec] rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-[#f0edec] rounded animate-pulse mb-8" />
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="h-10 bg-[#f6f3f2]/60 border-b border-[#f0edec]" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-6 py-4 border-b border-[#f0edec] last:border-0">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-9 h-9 rounded-xl bg-[#f0edec] animate-pulse shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 bg-[#f0edec] rounded animate-pulse" />
                  <div className="h-2.5 w-20 bg-[#f0edec] rounded animate-pulse" />
                </div>
              </div>
              <div className="h-3.5 w-16 bg-[#f0edec] rounded animate-pulse" />
              <div className="h-6 w-16 bg-[#f0edec] rounded-full animate-pulse" />
              <div className="h-3.5 w-20 bg-[#f0edec] rounded animate-pulse" />
              <div className="h-3.5 w-24 bg-[#f0edec] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const pageTitle = isAdmin && !viewMine ? 'All Accounts' : 'My Portfolio'
  const pageSubtitle = isAdmin && !viewMine
    ? `${displayed.length} accounts across your team · ${fmt(totalArr)} total ARR`
    : `${displayed.length} active accounts · ${fmt(totalArr)} total ARR`

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-[#1c1b1b] mb-1">{pageTitle}</h1>
          <p className="text-[#434655] text-sm">{pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex items-center gap-1 bg-[#f0edec] rounded-xl p-1">
              <button
                onClick={() => setViewMine(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!viewMine ? 'bg-white text-[#1c1b1b] shadow-sm' : 'text-[#434655] hover:text-[#1c1b1b]'}`}
              >
                All Accounts
              </button>
              <button
                onClick={() => setViewMine(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMine ? 'bg-white text-[#1c1b1b] shadow-sm' : 'text-[#434655] hover:text-[#1c1b1b]'}`}
              >
                My Portfolio
              </button>
            </div>
          )}
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />Create Account
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <button
          onClick={clearAllFilters}
          className={`px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${
            hasActiveFilters
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-[#f0edec] text-[#434655] hover:bg-[#e5e2e1]'
          }`}
        >
          {hasActiveFilters && <X className="w-3 h-3" />}
          {hasActiveFilters ? 'Clear Filters' : 'All Filters'}
        </button>

        <FilterDropdown
          label="Sentiment"
          value={filters.sentiment}
          options={[
            { value: 'good', label: 'Positive' },
            { value: 'some_risk', label: 'Some Risk' },
            { value: 'high_risk', label: 'At Risk' },
          ]}
          onSelect={(v) => setFilter('sentiment', v)}
          open={openFilter === 'sentiment'}
          onToggle={() => setOpenFilter(o => o === 'sentiment' ? null : 'sentiment')}
          onClose={() => setOpenFilter(null)}
        />

        {isAdmin && csmOptions.length > 0 && (
          <FilterDropdown
            label="CSM"
            value={filters.csmId}
            options={csmOptions}
            onSelect={(v) => setFilter('csmId', v)}
            open={openFilter === 'csm'}
            onToggle={() => setOpenFilter(o => o === 'csm' ? null : 'csm')}
            onClose={() => setOpenFilter(null)}
          />
        )}

        <FilterDropdown
          label="Health"
          value={filters.healthBand}
          options={[
            { value: 'healthy', label: 'Healthy (61+)' },
            { value: 'at_risk', label: 'At Risk (31–60)' },
            { value: 'critical', label: 'Critical (<31)' },
          ]}
          onSelect={(v) => setFilter('healthBand', v)}
          open={openFilter === 'health'}
          onToggle={() => setOpenFilter(o => o === 'health' ? null : 'health')}
          onClose={() => setOpenFilter(null)}
        />

        <FilterDropdown
          label="Renewal"
          value={filters.renewalWindow}
          options={[
            { value: '30', label: 'Next 30 days' },
            { value: '60', label: 'Next 60 days' },
            { value: '90', label: 'Next 90 days' },
          ]}
          onSelect={(v) => setFilter('renewalWindow', v)}
          open={openFilter === 'renewal'}
          onToggle={() => setOpenFilter(o => o === 'renewal' ? null : 'renewal')}
          onClose={() => setOpenFilter(null)}
        />
      </div>

      {displayed.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm">
          {hasActiveFilters ? (
            <EmptyState
              icon={<Search />}
              title="No matches"
              body="Try adjusting your filters"
              action={{ label: 'Clear filters', onClick: clearAllFilters }}
            />
          ) : (
            <EmptyState
              icon={<Building2 />}
              title="No accounts yet"
              body="Import accounts or create one manually"
              action={{ label: 'Create Account', onClick: () => setCreateOpen(true) }}
            />
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#f6f3f2]/60">
                {['Account', 'ARR', 'Health / Pulse', 'CSM', 'Renewal', ''].map(h => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#434655]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0edec]">
              {displayed.map(acc => {
                const h = healthBadge(acc.health_score ?? 0)
                return (
                  <tr key={acc.id} className="hover:bg-[#f6f3f2] transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <Link href={`/accounts/${acc.id}/overview`} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#dce1ff] flex items-center justify-center font-bold text-[#004bd8] text-sm shrink-0">
                          {acc.name[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1c1b1b] text-sm">{acc.name}</span>
                            {acc.status === 'churned' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 uppercase tracking-wide">Churned</span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#434655]">{acc.contract_type ?? '—'}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-[#1c1b1b] text-sm">{fmt(acc.arr ?? 0)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${h.bg} ${h.text} text-xs font-bold w-fit`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${h.dot}`} />
                          {acc.health_score ?? '—'}
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold w-fit ${sentimentBadge[acc.sentiment] ?? 'bg-gray-100 text-gray-700'}`}>
                          {sentimentLabel[acc.sentiment] ?? acc.sentiment ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[#1c1b1b]">{csmShort(acc.csm?.full_name)}</td>
                    <td className="px-6 py-4 text-sm text-[#1c1b1b]">{acc.renewal_date ?? '—'}</td>
                    <td className="px-6 py-4">
                      <ChevronRight className="w-4 h-4 text-[#737687] group-hover:text-[#1c1b1b] transition-colors" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-6 py-4 flex items-center justify-between border-t border-[#f0edec]">
            <span className="text-xs text-[#434655]">
              Showing {displayed.length} of {accounts.length} accounts
              {hasActiveFilters && ' (filtered)'}
            </span>
          </div>
        </div>
      )}

      <CreateAccountModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          fetch('/api/accounts')
            .then(r => r.json())
            .then(data => setAccounts(Array.isArray(data) ? data : []))
        }}
      />
    </div>
  )
}

export default function AccountsPage() {
  return (
    <Suspense fallback={
      <div className="px-8 py-8 max-w-[1400px] mx-auto">
        <div className="h-9 w-48 bg-[#f0edec] rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-[#f0edec] rounded animate-pulse mb-8" />
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-6 py-4 border-b border-[#f0edec] last:border-0">
              <div className="w-9 h-9 rounded-xl bg-[#f0edec] animate-pulse shrink-0" />
              <div className="h-3.5 w-40 bg-[#f0edec] rounded animate-pulse flex-1" />
              <div className="h-3.5 w-16 bg-[#f0edec] rounded animate-pulse" />
              <div className="h-6 w-16 bg-[#f0edec] rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    }>
      <AccountsPageInner />
    </Suspense>
  )
}
