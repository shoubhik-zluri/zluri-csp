import { cn } from '@/lib/utils'
import { RENEWAL_STAGE_LABELS, RENEWAL_STAGE_COLORS } from '@/lib/constants'
import type { RenewalStage } from '@/types/database'

interface RenewalStageBadgeProps {
  stage: RenewalStage | null
  className?: string
}

export default function RenewalStageBadge({ stage, className }: RenewalStageBadgeProps) {
  if (!stage) return (
    <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-400', className)}>
      Not Set
    </span>
  )

  return (
    <span
      className={cn(
        'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
        RENEWAL_STAGE_COLORS[stage],
        className
      )}
    >
      {RENEWAL_STAGE_LABELS[stage]}
    </span>
  )
}
