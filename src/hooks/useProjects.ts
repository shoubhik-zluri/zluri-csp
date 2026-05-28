'use client'

import useSWR from 'swr'
import type { Project } from '@/types/database'

async function fetcher(url: string): Promise<Project[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch projects')
  return res.json()
}

export function useProjects(accountId?: string) {
  const url = accountId
    ? `/api/projects?accountId=${accountId}`
    : '/api/projects'

  const { data, error, isLoading, mutate } = useSWR<Project[]>(url, fetcher, {
    revalidateOnFocus: true,
  })

  return {
    projects: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  }
}
