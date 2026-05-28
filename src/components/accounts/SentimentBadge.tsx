import { cn } from '@/lib/utils'
import { SENTIMENT_LABELS, SENTIMENT_COLORS } from '@/lib/constants'
import type { Sentiment } from '@/types/database'

interface SentimentBadgeProps {
  sentiment: Sentiment | null
  className?: string
}

export default function SentimentBadge({ sentiment, className }: SentimentBadgeProps) {
  if (!sentiment) {
    return (
      <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-400 border border-slate-200', className)}>
        No Pulse
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex px-2 py-0.5 rounded-full text-xs font-medium border',
        SENTIMENT_COLORS[sentiment],
        className
      )}
    >
      {SENTIMENT_LABELS[sentiment]}
    </span>
  )
}
