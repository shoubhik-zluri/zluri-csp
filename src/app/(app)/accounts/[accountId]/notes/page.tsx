'use client'

import { use } from 'react'
import { useNotes } from '@/hooks/useNotes'
import NotesList from '@/components/notes/NotesList'

export default function AccountNotesPage({
  params,
}: {
  params: Promise<{ accountId: string }>
}) {
  const { accountId } = use(params)
  const { notes, isLoading, mutate } = useNotes(accountId)

  return (
    <NotesList
      notes={notes}
      accountId={accountId}
      isLoading={isLoading}
      onMutate={mutate}
    />
  )
}
