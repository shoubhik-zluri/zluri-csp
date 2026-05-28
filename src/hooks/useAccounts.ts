'use client'

import useSWR from 'swr'
import type { Account } from '@/types/database'

async function fetchAccounts(): Promise<Account[]> {
  const res = await fetch('/api/accounts')
  if (!res.ok) throw new Error('Failed to fetch accounts')
  return res.json()
}

async function fetchAccount(id: string): Promise<Account> {
  const res = await fetch(`/api/accounts/${id}`)
  if (!res.ok) throw new Error('Failed to fetch account')
  return res.json()
}

export function useAccounts() {
  const { data, error, isLoading, mutate } = useSWR<Account[]>('/api/accounts', fetchAccounts, {
    revalidateOnFocus: true,
  })
  return {
    accounts: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  }
}

export function useAccount(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Account>(
    id ? `/api/accounts/${id}` : null,
    (url: string) => fetchAccount(url.split('/').pop()!),
    { revalidateOnFocus: true }
  )
  return {
    account: data ?? null,
    isLoading,
    isError: !!error,
    mutate,
  }
}
