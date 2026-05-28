'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, TrendingUp, Calendar, CheckSquare, ChevronRight, Sparkles, Loader2 } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn } from '@/lib/utils'

interface Account {
  id: string
  name: string
  arr: number
  health_score: number
  sentiment: string
  renewal_date: string
  risk_signals: string[]
  csm: { id: string; full_name: string } | null
}

interface Task {
  id: string
  title: string
  due_date: string
  status: string
  account: { id: string; name: string } | null
}

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n}`
}

function daysUntil(dateStr: string) {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function isOverdue(task: Task) {
  return task.due_date && new Date(task.due_date) < new Date(new Date().toDateString())
}

interface SyncRunLog {
  id: string
  status: 'running' | 'completed' | 'failed'
  tasks_suggested: number
  started_at: string
  completed_at: string | null
  error_text: string | null
}

export default function DashboardPage() {
  const { user, isAdmin } = useCurrentUser()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [syncLog, setSyncLog] = useState<SyncRunLog | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then(r => r.json()),
      fetch('/api/tasks/my').then(r => r.json()),
      fetch('/api/calls/sync/status').then(r => r.ok ? r.json() : null),
      fetch('/api/pending-tasks').then(r => r.ok ? r.json() : []),
    ]).then(([accs, tsks, sync, pending]) => {
      setAccounts(Array.isArray(accs) ? accs : [])
      setTasks(Array.isArray(tsks) ? tsks : [])
      if (sync) setSyncLog(sync)
      setPendingCount(Array.isArray(pending) ? pending.length : 0)
    }).finally(() => setLoading(false))
  }, [])

  async function triggerSync() {
    if (syncing) return
    setSyncing(true)
    try {
      const res = await fetch('/api/calls/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      if (res.ok) {
        const { runId } = await res.json()
        setSyncLog({ id: runId, status: 'running', tasks_suggested: 0, started_at: new Date().toISOString(), completed_at: null, error_text: null })
      }
    } finally {
      setSyncing(false)
    }
  }

  const totalArr = accounts.reduce((s, a) => s + (a.arr ?? 0), 0)
  const atRiskArr = accounts.filter(a => a.sentiment === 'high_risk').reduce((s, a) => s + (a.arr ?? 0), 0)
  const renewingSoon = accounts.filter(a => a.renewal_date && daysUntil(a.renewal_date) <= 90 && daysUntil(a.renewal_date) > 0)
  const renewingArr = renewingSoon.reduce((s, a) => s + (a.arr ?? 0), 0)
  const highRisk = accounts.filter(a => a.sentiment === 'high_risk').sort((a, b) => b.arr - a.arr)
  const overdueTasks = tasks.filter(isOverdue)
  const openTasks = tasks.filter(t => !isOverdue(t))

  // Team Performance (admin only) — rank CSMs by avg health score
  const csmStatsMap = accounts.reduce<Record<string, { name: string; count: number; totalHealth: number }>>((acc, a) => {
    const id = a.csm?.id ?? '__none__'
    const name = a.csm?.full_name ?? 'Unassigned'
    if (!acc[id]) acc[id] = { name, count: 0, totalHealth: 0 }
    acc[id].count++
    acc[id].totalHealth += a.health_score ?? 0
    return acc
  }, {})
  const csmRanked = Object.values(csmStatsMap)
    .map(s => ({ ...s, avgHealth: s.count > 0 ? Math.round(s.totalHealth / s.count) : 0 }))
    .sort((a, b) => b.avgHealth - a.avgHealth)

  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#737687]" />
      </div>
    )
  }

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tighter text-[#1c1b1b] mb-1">Good morning, {firstName}</h1>
        <p className="text-[#434655] text-sm">
          {isAdmin ? `Team portfolio · ${accounts.length} accounts across all CSMs` : 'Your portfolio pulse for today'}
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {[
          { label: 'Total ARR', value: fmt(totalArr), sub: `${accounts.length} accounts`, subClass: 'text-[#434655]', icon: TrendingUp, href: '/accounts' },
          { label: isAdmin ? 'All Accounts' : 'My Accounts', value: String(accounts.length), sub: isAdmin ? 'across your team' : 'in your portfolio', subClass: 'text-[#434655]', icon: null, href: '/accounts' },
          { label: 'At-Risk ARR', value: fmt(atRiskArr), sub: `${highRisk.length} accounts flagged`, subClass: atRiskArr > 0 ? 'text-[#af1a25]' : 'text-[#434655]', icon: AlertTriangle, href: '/accounts?sentiment=high_risk' },
          { label: 'Renewing (90d)', value: fmt(renewingArr), sub: `${renewingSoon.length} accounts`, subClass: 'text-[#434655]', icon: Calendar, href: '/accounts?renewal=90' },
        ].map(({ label, value, sub, subClass, icon: Icon, href }) => (
          <Link key={label} href={href} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-[10px] font-bold tracking-widest uppercase text-[#434655] mb-2">{label}</div>
            <div className="text-3xl font-extrabold tracking-tighter text-[#1c1b1b] mb-1">{value}</div>
            <div className={`text-xs font-medium flex items-center gap-1 ${subClass}`}>
              {Icon && <Icon className="w-3 h-3" />}{sub}
            </div>
          </Link>
        ))}
      </div>

      {/* Sync Status Strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'px-2 py-0.5 rounded-full text-xs font-semibold',
            !syncLog ? 'bg-slate-100 text-slate-400' :
            syncLog.status === 'completed' ? 'bg-green-100 text-green-700' :
            syncLog.status === 'running'   ? 'bg-blue-100 text-blue-700' :
                                             'bg-red-100 text-red-700'
          )}>
            {!syncLog ? 'Never synced' : syncLog.status === 'running' ? 'Syncing…' : syncLog.status}
          </div>
          {syncLog?.completed_at && (
            <span className="text-xs text-slate-400 truncate">
              Last sync {new Date(syncLog.completed_at).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {pendingCount > 0 && (
            <Link href="/task-review" className="text-xs font-semibold text-blue-600 hover:underline">
              Review {pendingCount} task{pendingCount !== 1 ? 's' : ''} →
            </Link>
          )}
          {isAdmin && (
            <button
              onClick={triggerSync}
              disabled={syncing || syncLog?.status === 'running'}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
            >
              {syncing ? 'Starting…' : 'Sync Calls'}
            </button>
          )}
        </div>
      </div>

      {/* AI Signal Strip */}
      <div className="bg-blue-600/5 border border-blue-600/10 rounded-xl p-4 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-blue-700">Ask Claude about your portfolio</div>
            <p className="text-xs text-[#434655]">Get AI summaries, risk analysis, and draft emails for any account.</p>
          </div>
        </div>
        <Link href="/ai-insights"
          className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-blue-700 transition-colors">
          AI Insights
        </Link>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-3 gap-6">
        {/* My Tasks */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-base text-[#1c1b1b] tracking-tight">My Tasks</h3>
            {overdueTasks.length > 0 && (
              <span className="text-[10px] font-bold bg-red-100 text-[#af1a25] px-2 py-0.5 rounded-full">
                {overdueTasks.length} overdue
              </span>
            )}
          </div>
          {tasks.length === 0 ? (
            <p className="text-xs text-[#737687] text-center py-6">No tasks due soon</p>
          ) : (
            <div className="space-y-2">
              {[...overdueTasks, ...openTasks].map(task => (
                <div key={task.id}
                  className={`flex items-start gap-3 p-3 rounded-xl ${isOverdue(task) ? 'bg-red-50 border border-red-100' : 'bg-[#f6f3f2]'}`}>
                  <CheckSquare className={`w-4 h-4 mt-0.5 shrink-0 ${isOverdue(task) ? 'text-[#af1a25]' : 'text-[#434655]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#1c1b1b] truncate">{task.title}</div>
                    <div className={`text-xs mt-0.5 font-medium ${isOverdue(task) ? 'text-[#af1a25]' : 'text-[#434655]'}`}>
                      {isOverdue(task) ? `Overdue · ${task.due_date}` : `Due ${task.due_date}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Renewals */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-base text-[#1c1b1b] tracking-tight">Upcoming Renewals</h3>
            <span className="text-[10px] font-bold bg-[#e5e2e1] text-[#434655] px-2 py-0.5 rounded-full">Next 90 days</span>
          </div>
          {renewingSoon.length === 0 ? (
            <p className="text-xs text-[#737687] text-center py-6">No renewals in next 90 days</p>
          ) : (
            <div className="space-y-2">
              {renewingSoon.slice(0, 5).map(acc => {
                const days = daysUntil(acc.renewal_date)
                const urgency = days <= 14 ? 'bg-red-50 text-[#af1a25]' : days <= 30 ? 'bg-amber-50 text-amber-700' : 'bg-[#f6f3f2] text-[#434655]'
                return (
                  <Link key={acc.id} href={`/accounts/${acc.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#f6f3f2] hover:bg-[#ebe7e7] transition-colors">
                    <div>
                      <div className="text-sm font-bold text-[#1c1b1b]">{acc.name}</div>
                      <div className="text-xs text-[#434655]">{acc.renewal_date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#1c1b1b]">{fmt(acc.arr)}</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgency}`}>{days}d</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* High Risk (members) / Team Performance (admins) */}
        {isAdmin ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base text-[#1c1b1b] tracking-tight">Team Performance</h3>
              <span className="text-[10px] font-bold bg-[#e5e2e1] text-[#434655] px-2 py-0.5 rounded-full">Avg Health</span>
            </div>
            {csmRanked.length === 0 ? (
              <p className="text-xs text-[#737687] text-center py-6">No accounts assigned yet</p>
            ) : (
              <div className="space-y-2">
                {csmRanked.slice(0, 5).map((csm, i) => {
                  const barColor = csm.avgHealth >= 80 ? '#22c55e' : csm.avgHealth >= 60 ? '#3b82f6' : '#af1a25'
                  return (
                    <div key={csm.name} className="flex items-center gap-3 p-3 rounded-xl bg-[#f6f3f2]">
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#1c1b1b] truncate">{csm.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-[#e5e2e1] rounded-full">
                            <div className="h-full rounded-full" style={{ width: `${csm.avgHealth}%`, background: barColor }} />
                          </div>
                          <span className="text-xs font-bold text-[#434655] shrink-0">{csm.avgHealth}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-[#737687] shrink-0">{csm.count} acct{csm.count !== 1 ? 's' : ''}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base text-[#1c1b1b] tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#af1a25] inline-block"></span>
                High Risk Accounts
              </h3>
              <Link href="/accounts" className="text-blue-600 text-xs font-bold hover:underline">View all</Link>
            </div>
            {highRisk.length === 0 ? (
              <p className="text-xs text-[#737687] text-center py-6">No high risk accounts</p>
            ) : (
              <div className="space-y-2">
                {highRisk.slice(0, 5).map(acc => (
                  <Link key={acc.id} href={`/accounts/${acc.id}`}
                    className="block p-3 rounded-xl bg-red-50 border border-red-100 hover:border-red-200 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-sm font-bold text-[#1c1b1b]">{acc.name}</div>
                      <div className="text-sm font-bold text-[#1c1b1b]">{fmt(acc.arr)}</div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(acc.risk_signals ?? []).slice(0, 2).map(s => (
                        <span key={s} className="text-[10px] font-bold bg-red-100 text-[#93000a] px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
