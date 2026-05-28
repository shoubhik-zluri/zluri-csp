'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, LayoutGrid, List, GanttChart, ExternalLink, Copy, Check, Loader2 } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import NewProjectModal from '@/components/projects/NewProjectModal'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/lib/constants'
import type { ProjectStatus } from '@/types/database'

// Gantt: dynamic 12-month window from Jan 1 of current year
const YEAR = new Date().getFullYear()
const TIMELINE_START = new Date(`${YEAR}-01-01`)
const TIMELINE_END   = new Date(`${YEAR + 1}-01-01`)
const TOTAL_DAYS = (TIMELINE_END.getTime() - TIMELINE_START.getTime()) / 86400000
const GANTT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function dayOffset(d: string) {
  return Math.max(0, (new Date(d).getTime() - TIMELINE_START.getTime()) / 86400000)
}

function CopyLinkButton({ projectId }: { projectId: string }) {
  const [copied, setCopied] = useState(false)
  function copy(e: React.MouseEvent) {
    e.preventDefault()
    navigator.clipboard.writeText(`${window.location.origin}/projects/${projectId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1 text-[10px] font-bold text-[#434655] hover:text-blue-600 transition-colors">
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}

type View = 'grid' | 'list' | 'gantt'
type Filter = 'All' | 'On Track' | 'Delayed' | 'At Risk' | 'Completed'

const FILTER_MAP: Record<Filter, ProjectStatus | null> = {
  'All': null, 'On Track': 'on_track', 'Delayed': 'delayed', 'At Risk': 'at_risk', 'Completed': 'completed',
}

export default function ProjectsPage() {
  const [view, setView]       = useState<View>('grid')
  const [filter, setFilter]   = useState<Filter>('All')
  const [newOpen, setNewOpen] = useState(false)

  const { projects, isLoading, mutate } = useProjects()

  const filtered = projects.filter(p =>
    FILTER_MAP[filter] === null || p.status === FILTER_MAP[filter]
  )

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-[#1c1b1b] mb-1">Projects</h1>
          <p className="text-[#434655] text-sm">
            {isLoading ? 'Loading…' : `${projects.length} project${projects.length !== 1 ? 's' : ''} across your portfolio`}
          </p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />New Project
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {(['All', 'On Track', 'Delayed', 'At Risk', 'Completed'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'text-[#434655] bg-[#f0edec] hover:bg-[#e5e2e1]'
              }`}>
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-[#f0edec] rounded-xl p-1">
          {([
            { id: 'grid',  icon: LayoutGrid, label: 'Board' },
            { id: 'list',  icon: List,        label: 'List'  },
            { id: 'gantt', icon: GanttChart,  label: 'Gantt' },
          ] as { id: View; icon: React.ComponentType<{ className?: string }>; label: string }[]).map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                view === id ? 'bg-white text-[#1c1b1b] shadow-sm' : 'text-[#434655] hover:text-[#1c1b1b]'
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-[#737687]" />
        </div>
      ) : (
        <>
          {/* ── Grid view ── */}
          {view === 'grid' && (
            <div className="grid grid-cols-3 gap-5">
              {filtered.map(p => {
                const pct = p.tasks_total > 0 ? Math.round((p.tasks_done / p.tasks_total) * 100) : 0
                const colors = PROJECT_STATUS_COLORS[p.status]
                const accountName = (p.account as { name: string } | null)?.name ?? '—'
                const ownerName = (p.owner as { full_name: string | null } | null)?.full_name ?? '—'
                return (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all flex flex-col gap-4 cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-[10px] font-bold tracking-widest uppercase text-[#434655] mb-1">{accountName}</div>
                        <h3 className="font-bold text-[#1c1b1b] tracking-tight">{p.name}</h3>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-3 ${colors.badge}`}>
                        {PROJECT_STATUS_LABELS[p.status]}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#e5e2e1] rounded-full">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: colors.bar }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#434655]">
                      <span>{p.tasks_done}/{p.tasks_total} tasks · {pct}%</span>
                      <span>{p.due_date ? `Due ${p.due_date}` : 'No due date'}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-[#f0edec]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold">
                          {ownerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-xs text-[#434655]">{ownerName}</span>
                      </div>
                      <div className="flex items-center gap-3" onClick={e => e.preventDefault()}>
                        <CopyLinkButton projectId={p.id} />
                        <Link href={`/accounts/${p.account_id}/overview`}
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline">
                          <ExternalLink className="w-3 h-3" />Account
                        </Link>
                      </div>
                    </div>
                  </Link>
                )
              })}
              <button
                onClick={() => setNewOpen(true)}
                className="bg-[#f6f3f2] rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-[#434655] hover:bg-[#ebe7e7] transition-colors border-2 border-dashed border-[#c3c5d8]/60 min-h-[180px]">
                <Plus className="w-7 h-7 text-[#737687]" />
                <span className="text-sm font-semibold">New Project</span>
              </button>
            </div>
          )}

          {/* ── List view ── */}
          {view === 'list' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-sm text-[#737687]">No projects match the selected filter.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#f0edec]">
                      {['Project', 'Account', 'Status', 'Progress', 'Due', 'Owner', ''].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold tracking-widest uppercase text-[#434655] px-4 py-3 first:px-6">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const pct = p.tasks_total > 0 ? Math.round((p.tasks_done / p.tasks_total) * 100) : 0
                      const colors = PROJECT_STATUS_COLORS[p.status]
                      const accountName = (p.account as { name: string } | null)?.name ?? '—'
                      const ownerName = (p.owner as { full_name: string | null } | null)?.full_name ?? '—'
                      return (
                        <tr key={p.id} className="border-b border-[#f6f3f2] hover:bg-[#f6f3f2] transition-colors cursor-pointer"
                          onClick={() => window.location.href = `/projects/${p.id}`}>
                          <td className="px-6 py-4 font-semibold text-sm text-[#1c1b1b]">{p.name}</td>
                          <td className="px-4 py-4 text-xs text-[#434655]">{accountName}</td>
                          <td className="px-4 py-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                              {PROJECT_STATUS_LABELS[p.status]}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-[#e5e2e1] rounded-full">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors.bar }} />
                              </div>
                              <span className="text-xs text-[#434655]">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-xs text-[#434655]">{p.due_date ?? '—'}</td>
                          <td className="px-4 py-4 text-xs text-[#434655]">{ownerName}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <CopyLinkButton projectId={p.id} />
                              <Link href={`/accounts/${p.account_id}/overview`} className="text-blue-600 hover:text-blue-700">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Gantt view ── */}
          {view === 'gantt' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="flex border-b border-[#f0edec]">
                <div className="w-64 shrink-0 px-6 py-3 text-[10px] font-bold tracking-widest uppercase text-[#434655] border-r border-[#f0edec]">
                  Project
                </div>
                <div className="flex-1 flex">
                  {GANTT_MONTHS.map(m => (
                    <div key={m} className="flex-1 text-center text-[10px] font-bold tracking-widest uppercase text-[#434655] py-3 border-r border-[#f0edec] last:border-r-0">
                      {m}
                    </div>
                  ))}
                </div>
              </div>
              {filtered.length === 0 ? (
                <div className="py-16 text-center text-sm text-[#737687]">No projects to display.</div>
              ) : filtered.map(p => {
                const startDays = dayOffset(p.start_date ?? p.due_date ?? `${YEAR}-01-01`)
                const endDays   = dayOffset(p.due_date ?? `${YEAR}-12-31`)
                const leftPct   = (startDays / TOTAL_DAYS) * 100
                const widthPct  = Math.max(1, ((endDays - startDays) / TOTAL_DAYS) * 100)
                const pct       = p.tasks_total > 0 ? Math.round((p.tasks_done / p.tasks_total) * 100) : 0
                const colors    = PROJECT_STATUS_COLORS[p.status]
                const accountName = (p.account as { name: string } | null)?.name ?? '—'
                return (
                  <div key={p.id} className="flex border-b border-[#f6f3f2] hover:bg-[#f6f3f2] transition-colors group">
                    <div className="w-64 shrink-0 px-6 py-4 border-r border-[#f0edec]">
                      <div className="font-semibold text-sm text-[#1c1b1b] truncate">{p.name}</div>
                      <div className="text-[10px] text-[#737687]">{accountName}</div>
                    </div>
                    <div className="flex-1 relative py-4 px-2">
                      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
                        <div key={i} className="absolute top-0 bottom-0 border-r border-[#f0edec]"
                          style={{ left: `${(i+1) * (100/12)}%` }} />
                      ))}
                      <div className="absolute top-1/2 -translate-y-1/2 h-6 rounded-full flex items-center overflow-hidden"
                        style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: '#e5e2e1' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: colors.bar }} />
                        <span className="absolute inset-0 flex items-center px-2 text-[9px] font-bold text-white mix-blend-screen">
                          {p.name.length > 20 ? p.name.slice(0, 18) + '…' : p.name}
                        </span>
                      </div>
                    </div>
                    <div className="w-28 shrink-0 flex items-center justify-end gap-2 pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyLinkButton projectId={p.id} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <NewProjectModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSaved={() => mutate()}
      />
    </div>
  )
}
