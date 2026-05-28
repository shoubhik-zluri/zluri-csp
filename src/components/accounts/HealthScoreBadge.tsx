import { cn } from '@/lib/utils'
import { getHealthScoreBand, getHealthScoreColor } from '@/lib/constants'

interface HealthScoreBadgeProps {
  score: number | null
  showBand?: boolean
  className?: string
}

export default function HealthScoreBadge({ score, showBand = false, className }: HealthScoreBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
        getHealthScoreColor(score),
        className
      )}
    >
      {score !== null ? score : '—'}
      {showBand && score !== null && (
        <span className="opacity-70">· {getHealthScoreBand(score)}</span>
      )}
    </span>
  )
}
