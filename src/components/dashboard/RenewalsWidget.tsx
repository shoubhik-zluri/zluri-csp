'use client'

import Link from 'next/link'
import { useAccounts } from '@/hooks/useAccounts'
import { formatCurrency, formatDate, daysUntil, cn } from '@/lib/utils'
import type { Account } from '@/types/database'
import { RefreshCw } from 'lucide-react'

export default function RenewalsWidget() {
  const { accounts, isLoading } = useAccounts()

  if (isLoading) return <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in90 = new Date(today)
  in90.setDate(in90.getDate() + 90)

  const upcoming = accounts
    .filter((a) => {
      if (!a.renewal_date) return false
      const d = new Date(a.renewal_date)
      return d >= today && d <= in90
    })
    .sort((a, b) => new Date(a.renewal_date!).getTime() - new Date(b.renewal_date!).getTime())
    .slice(0, 8)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <RefreshCw className="w-4 h-4 text-slate-400" />
        Upcoming Renewals
        <span className="ml-auto text-xs text-slate-400 font-normal">Next 90 days</span>
      </h3>

      {upcoming.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No renewals in the next 90 days.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((account) => {
            const days = daysUntil(account.renewal_date)
            return (
              <Link
                key={account.id}
                href={`/accounts/${account.id}/overview`}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                    {account.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(account.renewal_date)}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-semibold text-slate-700">{formatCurrency(account.arr)}</p>
                  <p className={cn(
                    'text-xs mt-0.5',
                    days !== null && days <= 14 ? 'text-red-500 font-medium' :
                    days !== null && days <= 30 ? 'text-orange-500' :
                    'text-slate-400'
                  )}>
                    {days === 0 ? 'Today' : `${days}d`}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
