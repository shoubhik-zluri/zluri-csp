'use client'

import { use } from 'react'
import { useAccount } from '@/hooks/useAccounts'
import AccountIntegrations from '@/components/accounts/AccountIntegrations'
import { Skeleton } from '@/components/ui/skeleton'

export default function AccountIntegrationsPage({ params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = use(params)
  const { account, isLoading } = useAccount(accountId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (!account) return <div className="text-sm text-slate-400">Account not found.</div>

  return <AccountIntegrations account={account} />
}
