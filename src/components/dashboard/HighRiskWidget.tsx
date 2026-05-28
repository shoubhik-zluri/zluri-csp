'use client'

import Link from 'next/link'
import { useAccounts } from '@/hooks/useAccounts'
import { formatCurrency } from '@/lib/utils'
import SentimentBadge from '@/components/accounts/SentimentBadge'
import HealthScoreBadge from '@/components/accounts/HealthScoreBadge'
import { AlertTriangle } from 'lucide-react'

export default function HighRiskWidget() {
  const { accounts, isLoading } = useAccounts()

  if (isLoading) return <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />

  const atRisk = accounts
    .filter((a) => a.sentiment === 'high_risk' || (a.health_score !== null && a.health_score < 30))
    .sort((a, b) => (b.arr ?? 0) - (a.arr ?? 0))
    .slice(0, 8)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-400" />
        High Risk Accounts
        {atRisk.length > 0 && (
          <span className="ml-auto text-xs text-red-500 font-medium">{atRisk.length} accounts</span>
        )}
      </h3>

      {atRisk.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No high risk accounts.</p>
      ) : (
        <div className="space-y-2">
          {atRisk.map((account) => (
            <Link
              key={account.id}
              href={`/accounts/${account.id}/overview`}
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                  {account.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <SentimentBadge sentiment={account.sentiment} />
                  <HealthScoreBadge score={account.health_score} />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-700 shrink-0 ml-3">
                {formatCurrency(account.arr)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
