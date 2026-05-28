'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type { PendingTask, ConfidenceLevel } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  task: PendingTask | null
  onClose: () => void
  onAccepted: () => void
}

function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel | null | undefined }) {
  if (!confidence) return null
  const styles: Record<ConfidenceLevel, string> = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-[#f0edec] text-[#737687]',
  }
  return (
    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${styles[confidence]}`}>
      {confidence}
    </span>
  )
}

function TaskTypeBadge({ taskType }: { taskType: PendingTask['task_type'] }) {
  if (taskType === 'action_item') return null
  if (taskType === 'risk') {
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
        Risk
      </span>
    )
  }
  return (
    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
      Expansion
    </span>
  )
}

export default function TaskReviewDialog({ task, onClose, onAccepted }: Props) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [assigneeName, setAssigneeName] = useState(task?.assignee_name_raw ?? '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setDueDate(task?.due_date ?? '')
    setAssigneeName(task?.assignee_name_raw ?? '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id])

  async function handleAccept() {
    if (!task) return
    setLoading(true)
    try {
      const res = await fetch(`/api/pending-tasks/${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || task.title,
          description: description || null,
          due_date: dueDate || null,
          assignee_name_raw: assigneeName || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error ?? 'Failed to accept task')
      }
      toast.success('Task created successfully')
      onAccepted()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!task} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review AI-suggested task</DialogTitle>
        </DialogHeader>

        {task && (
          <div className="space-y-4">
            {/* AI Reasoning (read-only) */}
            <div className="rounded-lg bg-[#f6f3f2] border border-[#f0edec] p-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#737687]">AI Reasoning</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <ConfidenceBadge confidence={task.confidence} />
                <TaskTypeBadge taskType={task.task_type} />
              </div>
              {task.justification && (
                <p className="text-sm text-[#737687] italic">{task.justification}</p>
              )}
            </div>

            {/* Editable fields */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="task-title" className="text-sm font-medium text-[#434655]">Title</label>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="task-description" className="text-sm font-medium text-[#434655]">Description</label>
                <Textarea
                  id="task-description"
                  value={description ?? ''}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="task-due-date" className="text-sm font-medium text-[#434655]">Due date</label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={dueDate ?? ''}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="task-assignee" className="text-sm font-medium text-[#434655]">Assignee</label>
                <Input
                  id="task-assignee"
                  value={assigneeName ?? ''}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder="Assignee name"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={loading || !task}>
            {loading ? 'Accepting…' : 'Accept & create task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
