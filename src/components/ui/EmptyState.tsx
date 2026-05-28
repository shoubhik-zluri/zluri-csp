'use client'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  body?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export default function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="w-10 h-10 text-[#c3c5d8] mb-3 flex items-center justify-center [&>svg]:w-10 [&>svg]:h-10">
        {icon}
      </div>
      <p className="text-sm font-semibold text-[#434655]">{title}</p>
      {body && <p className="text-xs text-[#737687] mt-1 max-w-xs">{body}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-full hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
