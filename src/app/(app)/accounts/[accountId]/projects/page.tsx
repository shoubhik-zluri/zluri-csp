'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { Plus, ExternalLink, Loader2 } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import NewProjectModal from '@/components/projects/NewProjectModal'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/lib/constants'

export default function AccountProjectsPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = use(params)
  const { projects, isLoading, mutate } = useProjects(accountId)
  const [newOpen, setNewOpen] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Projects ({projects.length})</h3>
        <button
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />New Project
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">No projects yet</p>
          <p className="text-xs text-slate-400 mb-4">Create the first project for this account.</p>
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />New Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map(p => {
            const pct = p.tasks_total > 0 ? Math.round((p.tasks_done / p.tasks_total) * 100) : 0
            const colors = PROJECT_STATUS_COLORS[p.status]
            const ownerName = (p.owner as { full_name: string | null } | null)?.full_name ?? '—'
            return (
              <Link key={p.id} href={`/projects/${p.id}`}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-sm text-slate-900 leading-snug">{p.name}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 shrink-0 ${colors.badge}`}>
                    {PROJECT_STATUS_LABELS[p.status]}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors.bar }} />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{p.tasks_done}/{p.tasks_total} tasks · {pct}%</span>
                  <span>{p.due_date ? `Due ${p.due_date}` : 'No due date'}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">{ownerName}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <NewProjectModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        prefilledAccountId={accountId}
        onSaved={() => mutate()}
      />
    </div>
  )
}
