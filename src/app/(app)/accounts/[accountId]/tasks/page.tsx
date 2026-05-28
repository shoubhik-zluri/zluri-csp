'use client'

import { use } from 'react'
import useSWR from 'swr'
import type { Task, SuccessPlan, TaskView } from '@/types/database'
import TasksViewShell from '@/components/tasks/TasksViewShell'

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default function AccountTasksPage({
  params,
}: {
  params: Promise<{ accountId: string }>
}) {
  const { accountId } = use(params)
  const { data, isLoading, mutate } = useSWR<{ plans: SuccessPlan[]; unplanned: Task[] }>(
    `/api/tasks?accountId=${accountId}`,
    fetcher
  )
  const { data: savedViews = [], mutate: mutateViews } = useSWR<TaskView[]>('/api/task-views', fetcher)

  const allTasks: Task[] = [
    ...(data?.plans ?? []).flatMap((p) => (p.tasks ?? []) as Task[]),
    ...(data?.unplanned ?? []),
  ]

  return (
    <TasksViewShell
      context="account"
      accountId={accountId}
      tasks={allTasks}
      savedViews={savedViews}
      isLoading={isLoading}
      onTaskUpdate={mutate}
      onMutateSavedViews={mutateViews}
    />
  )
}
