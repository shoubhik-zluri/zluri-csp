import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { StructuredActionItem, Task } from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount.toFixed(0)}`
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDaysUntil(dateStr: string | null | undefined): string {
  const days = daysUntil(dateStr)
  if (days === null) return '—'
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days}d`
}

export function formatTaskId(task: Pick<Task, 'visibility' | 'task_number'>): string {
  if (!task.task_number) return ''
  const prefix = task.visibility === 'external' ? 'ZLE' : task.visibility === 'private' ? 'ZLP' : 'ZLI'
  return `${prefix}-${String(task.task_number).padStart(4, '0')}`
}

export function isStructuredActionItem(item: StructuredActionItem | string): item is StructuredActionItem {
  return typeof item === 'object' && item !== null && 'title' in item
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
