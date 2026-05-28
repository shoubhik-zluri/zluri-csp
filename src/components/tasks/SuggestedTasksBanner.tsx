'use client'

import { useState } from 'react'
import { Lightbulb, X } from 'lucide-react'
import { usePendingTasks, useAllPendingTasks } from '@/hooks/usePendingTasks'

interface SuggestedTasksBannerProps {
  accountId?: string
  onReviewClick?: () => void
}

export default function SuggestedTasksBanner({ accountId, onReviewClick }: SuggestedTasksBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  // Use the appropriate hook depending on scope
  const accountHook = usePendingTasks(accountId ?? '')
  const globalHook = useAllPendingTasks()

  const { data: pendingTasks } = accountId ? accountHook : globalHook
  const count = pendingTasks.length

  if (dismissed || count === 0) return null

  return (
    <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
      <div className="flex items-center gap-2.5">
        <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="text-sm text-amber-800">
          <span className="font-semibold">{count} suggested task{count !== 1 ? 's' : ''}</span>
          {' '}detected from meeting notes
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onReviewClick && (
          <button
            onClick={onReviewClick}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
          >
            Review in Notes →
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
