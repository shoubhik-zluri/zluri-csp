'use client'

import { use } from 'react'
import { useContacts } from '@/hooks/useContacts'
import ContactsTable from '@/components/contacts/ContactsTable'

export default function AccountContactsPage({
  params,
}: {
  params: Promise<{ accountId: string }>
}) {
  const { accountId } = use(params)
  const { contacts, isLoading, mutate } = useContacts(accountId)

  return (
    <ContactsTable
      contacts={contacts}
      accountId={accountId}
      isLoading={isLoading}
      onMutate={mutate}
    />
  )
}
