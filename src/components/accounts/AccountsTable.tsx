'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Account, Profile } from '@/types/database'
import { formatCurrency, formatDate, daysUntil, cn } from '@/lib/utils'
import HealthScoreBadge from './HealthScoreBadge'
import SentimentBadge from './SentimentBadge'
import LifecycleStageBadge from './LifecycleStageBadge'
import RenewalStageBadge from './RenewalStageBadge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

type SortKey = keyof Account | 'csm_name'
type SortDir = 'asc' | 'desc'

interface AccountsTableProps {
  accounts: Account[]
  isLoading?: boolean
}

function DaysUntilRenewal({ date }: { date: string | null }) {
  const days = daysUntil(date)
  if (days === null) return <span className="text-slate-400">—</span>

  const color =
    days < 0 ? 'text-red-600 font-medium' :
    days <= 30 ? 'text-orange-600 font-medium' :
    days <= 90 ? 'text-amber-600' :
    'text-slate-600'

  return (
    <div>
      <div className={cn('text-sm', color)}>
        {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
      </div>
      <div className="text-xs text-slate-400">{formatDate(date)}</div>
    </div>
  )
}

function SortIcon({ field, sortKey, sortDir }: { field: string; sortKey: string; sortDir: SortDir }) {
  if (sortKey !== field) return <ChevronsUpDown className="w-3 h-3 text-slate-300" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-blue-600" />
    : <ChevronDown className="w-3 h-3 text-blue-600" />
}

const PAGE_SIZE = 25

export default function AccountsTable({ accounts, isLoading }: AccountsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(0)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  const sorted = useMemo(() => {
    return [...accounts].sort((a, b) => {
      let aVal: unknown
      let bVal: unknown

      if (sortKey === 'csm_name') {
        aVal = (a.csm as Profile | null)?.full_name ?? ''
        bVal = (b.csm as Profile | null)?.full_name ?? ''
      } else {
        aVal = a[sortKey as keyof Account]
        bVal = b[sortKey as keyof Account]
      }

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [accounts, sortKey, sortDir])

  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)

  function Th({ field, children }: { field: SortKey; children: React.ReactNode }) {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none whitespace-nowrap"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          <SortIcon field={field} sortKey={sortKey} sortDir={sortDir} />
        </div>
      </th>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (!accounts.length) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p className="text-sm">No accounts found.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <Th field="name">Account</Th>
              <Th field="arr">ARR</Th>
              <Th field="renewal_date">Renewal</Th>
              <Th field="health_score">Health</Th>
              <Th field="sentiment">Pulse</Th>
              <Th field="lifecycle_stage">Stage</Th>
              <Th field="renewal_stage">Renewal Stage</Th>
              <Th field="csm_name">CSM</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map((account) => {
              const csm = account.csm as Profile | null
              return (
                <tr
                  key={account.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/accounts/${account.id}/overview`}
                      className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors"
                    >
                      {account.name}
                    </Link>
                    {account.industry && (
                      <div className="text-xs text-slate-400 mt-0.5">{account.industry}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                    {formatCurrency(account.arr)}
                  </td>
                  <td className="px-4 py-3">
                    <DaysUntilRenewal date={account.renewal_date} />
                  </td>
                  <td className="px-4 py-3">
                    <HealthScoreBadge score={account.health_score} />
                  </td>
                  <td className="px-4 py-3">
                    <SentimentBadge sentiment={account.sentiment} />
                  </td>
                  <td className="px-4 py-3">
                    <LifecycleStageBadge stage={account.lifecycle_stage} />
                  </td>
                  <td className="px-4 py-3">
                    <RenewalStageBadge stage={account.renewal_stage} />
                  </td>
                  <td className="px-4 py-3">
                    {csm ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={csm.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                            {getInitials(csm.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-slate-600">{csm.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Unassigned</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">
          <span className="text-xs text-slate-500">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
