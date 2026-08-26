import { useState } from 'react'
import { TaskItem } from './TaskItem'
import { TaskForm } from './TaskForm'
import { EmptyState } from '../../../core/ui/States'
import { useToastStore } from '../../../core/ui/toastStore'
import {
  completeTask,
  createTask,
  reopenTask,
  softDeleteTask,
  restoreTask,
  updateTask,
  ValidationFailedError,
} from '../service'
import { computeProgress } from '../service'
import type { TaskInput, TaskRow } from '../types'

export function TaskPanel({ projectId, tasks }: { projectId: string; tasks: TaskRow[] }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskRow | undefined>(undefined)
  const pushToast = useToastStore((s) => s.push)

  const liveTasks = tasks.filter((t) => !t.deleted_at)
  const progress = computeProgress(liveTasks)

  async function handleCreate(input: TaskInput) {
    try {
      await createTask(projectId, input)
    } catch (err) {
      if (err instanceof ValidationFailedError) throw new Error(Object.values(err.errors)[0])
      throw err
    }
  }

  async function handleUpdate(input: TaskInput) {
    if (!editingTask) return
    try {
      await updateTask(editingTask.id, input)
    } catch (err) {
      if (err instanceof ValidationFailedError) throw new Error(Object.values(err.errors)[0])
      throw err
    }
  }

  async function handleDelete(task: TaskRow) {
    await softDeleteTask(task.id)
    pushToast({
      message: `تم حذف المهمة "${task.title}".`,
      actionLabel: 'تراجع',
      onAction: () => restoreTask(task.id),
    })
  }

  return (
    <div className="task-panel">
      <div className="task-panel-header">
        <h3>المهام</h3>
        <span className="progress-label">
          {progress.total === 0 ? 'لا مهام بعد' : `${progress.completed}/${progress.total} (${progress.percent}%)`}
        </span>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setFormOpen(true)}>
          + مهمة
        </button>
      </div>

      {progress.total > 0 && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
        </div>
      )}

      {liveTasks.length === 0 ? (
        <EmptyState title="لا توجد مهام لهذا المشروع" description="أضف أول مهمة لبدء تتبع التقدم." />
      ) : (
        <ul className="task-list">
          {liveTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={() => (task.status === 'completed' ? reopenTask(task.id) : completeTask(task.id))}
              onEdit={() => setEditingTask(task)}
              onDelete={() => handleDelete(task)}
            />
          ))}
        </ul>
      )}

      {formOpen && <TaskForm onSubmit={handleCreate} onClose={() => setFormOpen(false)} />}
      {editingTask && (
        <TaskForm task={editingTask} onSubmit={handleUpdate} onClose={() => setEditingTask(undefined)} />
      )}
    </div>
  )
}
