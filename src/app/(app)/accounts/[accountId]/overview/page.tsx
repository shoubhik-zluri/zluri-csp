'use client'

import { use } from 'react'
import { useAccount } from '@/hooks/useAccounts'
import AccountOverviewPanel from '@/components/accounts/AccountOverviewPanel'
import { Skeleton } from '@/components/ui/skeleton'
import type { Account } from '@/types/database'

export default function AccountOverviewPage({
  params,
}: {
  params: Promise<{ accountId: string }>
}) {
  const { accountId } = use(params)
  const { account, isLoading, mutate } = useAccount(accountId)

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!account) {
    return <p className="text-slate-500 text-sm">Account not found.</p>
  }

  return (
    <AccountOverviewPanel
      account={account}
      onUpdate={(updated) => mutate({ ...account, ...updated } as Account, false)}
    />
  )
}
