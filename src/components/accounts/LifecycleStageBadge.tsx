import { cn } from '@/lib/utils'
import { LIFECYCLE_STAGE_LABELS, LIFECYCLE_STAGE_COLORS } from '@/lib/constants'
import type { LifecycleStage } from '@/types/database'

interface LifecycleStageBadgeProps {
  stage: LifecycleStage[] | LifecycleStage | null
  className?: string
}

export default function LifecycleStageBadge({ stage, className }: LifecycleStageBadgeProps) {
  if (!stage) return null
  const stages = Array.isArray(stage) ? stage : [stage]
  if (stages.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {stages.map((s) => (
        <span
          key={s}
          className={cn(
            'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
            LIFECYCLE_STAGE_COLORS[s],
            className
          )}
        >
          {LIFECYCLE_STAGE_LABELS[s]}
        </span>
      ))}
    </div>
  )
}
