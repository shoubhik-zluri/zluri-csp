'use client'

import useSWR from 'swr'
import type { Contact } from '@/types/database'

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export function useContacts(accountId: string) {
  const { data, error, isLoading, mutate } = useSWR<Contact[]>(
    `/api/contacts?accountId=${accountId}`,
    fetcher
  )
  return { contacts: data ?? [], isLoading, isError: !!error, mutate }
}
