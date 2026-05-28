'use client'

import useSWR from 'swr'
import type { Task, TaskView } from '@/types/database'
import TasksViewShell from '@/components/tasks/TasksViewShell'

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default function TasksPage() {
  const { data: tasks = [], isLoading, mutate } = useSWR<Task[]>('/api/tasks/all', fetcher)
  const { data: savedViews = [], mutate: mutateViews } = useSWR<TaskView[]>('/api/task-views', fetcher)

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tighter text-[#1c1b1b] mb-1">My Tasks</h1>
        <p className="text-[#434655] text-sm">
          {isLoading ? 'Loading…' : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} across your portfolio`}
        </p>
      </div>

      <TasksViewShell
        context="global"
        tasks={tasks}
        savedViews={savedViews}
        isLoading={isLoading}
        onTaskUpdate={mutate}
        onMutateSavedViews={mutateViews}
      />
    </div>
  )
}
