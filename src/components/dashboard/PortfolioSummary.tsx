'use client'

import { useAccounts } from '@/hooks/useAccounts'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, Building2, AlertTriangle, TrendingUp } from 'lucide-react'

export default function PortfolioSummary() {
  const { accounts, isLoading } = useAccounts()

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )

  const totalARR = accounts.reduce((sum, a) => sum + (a.arr ?? 0), 0)
  const highRiskARR = accounts
    .filter((a) => a.sentiment === 'high_risk')
    .reduce((sum, a) => sum + (a.arr ?? 0), 0)
  const highRiskCount = accounts.filter((a) => a.sentiment === 'high_risk').length
  const renewingIn30 = accounts.filter((a) => {
    if (!a.renewal_date) return false
    const days = Math.ceil((new Date(a.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days >= 0 && days <= 30
  }).length

  const stats = [
    {
      label: 'Total ARR',
      value: formatCurrency(totalARR),
      icon: DollarSign,
      color: 'bg-blue-50 text-blue-700',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Accounts',
      value: accounts.length.toString(),
      icon: Building2,
      color: 'bg-slate-50 text-slate-700',
      iconBg: 'bg-slate-100',
    },
    {
      label: 'High Risk ARR',
      value: formatCurrency(highRiskARR),
      sub: `${highRiskCount} accounts`,
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-700',
      iconBg: 'bg-red-100',
    },
    {
      label: 'Renewing in 30d',
      value: renewingIn30.toString(),
      sub: 'accounts',
      icon: TrendingUp,
      color: 'bg-amber-50 text-amber-700',
      iconBg: 'bg-amber-100',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(({ label, value, sub, icon: Icon, color, iconBg }) => (
        <div key={label} className={`rounded-xl border border-slate-200 p-4 ${color}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
              {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
            </div>
            <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
