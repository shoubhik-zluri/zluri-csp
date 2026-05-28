'use client'

import useSWR from 'swr'
import type { MeetingNote } from '@/types/database'

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function useNotes(accountId: string) {
  const { data, error, isLoading, mutate } = useSWR<MeetingNote[]>(
    `/api/notes?accountId=${accountId}`,
    fetcher
  )
  return { notes: data ?? [], isLoading, isError: !!error, mutate }
}
