'use client'

import useSWR from 'swr'
import type { Task, SuccessPlan } from '@/types/database'

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function useTasks(accountId: string) {
  const { data, error, isLoading, mutate } = useSWR<{ plans: SuccessPlan[]; unplanned: Task[] }>(
    `/api/tasks?accountId=${accountId}`,
    fetcher
  )
  return {
    plans: data?.plans ?? [],
    unplanned: data?.unplanned ?? [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useMyTasks() {
  const { data, error, isLoading, mutate } = useSWR<Task[]>('/api/tasks/my', fetcher)
  return { tasks: data ?? [], isLoading, isError: !!error, mutate }
}
