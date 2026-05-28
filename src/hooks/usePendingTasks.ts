'use client'

import useSWR from 'swr'
import type { PendingTask } from '@/types/database'

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function usePendingTasks(accountId: string) {
  const { data, error, isLoading, mutate } = useSWR<PendingTask[]>(
    `/api/pending-tasks?accountId=${accountId}`,
    fetcher
  )
  return { data: data ?? [], isLoading, isError: !!error, mutate }
}

export function useAllPendingTasks() {
  const { data, error, isLoading, mutate } = useSWR<PendingTask[]>(
    '/api/pending-tasks/all',
    fetcher
  )
  return { data: data ?? [], isLoading, isError: !!error, mutate }
}
