'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount } from '@/hooks/useAccounts'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import HealthScoreBadge from '@/components/accounts/HealthScoreBadge'
import SentimentBadge from '@/components/accounts/SentimentBadge'
import TaskDialog from '@/components/tasks/TaskDialog'
import NoteDialog from '@/components/notes/NoteDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronRight, Plus } from 'lucide-react'

const TABS = [
  { label: 'Overview', path: 'overview' },
  { label: 'Contacts', path: 'contacts' },
  { label: 'Tasks', path: 'tasks' },
  { label: 'Projects', path: 'projects' },
  { label: 'Call Logs', path: 'notes' },
  { label: 'AI Insights', path: 'ai-insights' },
]

export default function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ accountId: string }>
}) {
  const { accountId } = use(params)
  const { account, isLoading, mutate } = useAccount(accountId)
  const pathname = usePathname()
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [addNoteOpen, setAddNoteOpen] = useState(false)

  return (
    <div>
      {/* Account Header */}
      <div className="bg-white border-b border-[#e5e2e1] px-6 pt-4 pb-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-[#737687] mb-2">
          <Link href="/accounts" className="hover:text-[#434655] transition-colors">Accounts</Link>
          <ChevronRight className="w-3 h-3" />
          {isLoading
            ? <Skeleton className="h-3 w-24" />
            : <span className="text-[#434655] font-medium">{account?.name}</span>
          }
        </div>

        {/* Account name + meta + actions */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {isLoading ? (
              <Skeleton className="h-7 w-48" />
            ) : (
              <>
                <h1 className="text-xl font-semibold text-[#1c1b1b] truncate">{account?.name}</h1>
                {account?.arr != null && (
                  <span className="text-sm font-medium text-[#737687] shrink-0">
                    {formatCurrency(account.arr)}
                  </span>
                )}
                <HealthScoreBadge score={account?.health_score ?? null} />
                <SentimentBadge sentiment={account?.sentiment ?? null} />
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setAddNoteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#e5e2e1] text-[#434655] hover:border-blue-400 hover:text-blue-600 transition-colors bg-white"
            >
              <Plus className="w-3.5 h-3.5" />Log Call
            </button>
            <button
              onClick={() => setAddTaskOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#e5e2e1] text-[#434655] hover:border-blue-400 hover:text-blue-600 transition-colors bg-white"
            >
              <Plus className="w-3.5 h-3.5" />Add Task
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(({ label, path }) => {
            const href = `/accounts/${accountId}/${path}`
            const active = pathname === href
            return (
              <Link
                key={path}
                href={href}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  active
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-[#737687] hover:text-[#434655]'
                )}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="p-6">{children}</div>

      <TaskDialog
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        accountId={accountId}
        onSaved={() => mutate()}
      />
      <NoteDialog
        open={addNoteOpen}
        onClose={() => setAddNoteOpen(false)}
        accountId={accountId}
        onSaved={() => mutate()}
      />
    </div>
  )
}
