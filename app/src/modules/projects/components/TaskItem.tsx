import { formatDate, isOverdue } from '../../../core/dates'
import { PRIORITY_LABELS } from '../types'
import type { TaskRow } from '../types'

export function TaskItem({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
}: {
  task: TaskRow
  onToggleComplete: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const overdue = isOverdue(task.due_date) && task.status !== 'completed'
  return (
    <li className={'task-item' + (task.status === 'completed' ? ' completed' : '')}>
      <label className="task-checkbox">
        <input type="checkbox" checked={task.status === 'completed'} onChange={onToggleComplete} />
        <span className="task-title">{task.title}</span>
      </label>
      <div className="task-meta">
        <span className={`badge badge-priority-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
        {task.due_date && (
          <span className={'deadline-label' + (overdue ? ' overdue' : '')}>{formatDate(task.due_date)}</span>
        )}
        <button type="button" className="icon-btn" onClick={onEdit} title="تعديل المهمة">
          ✎
        </button>
        <button type="button" className="icon-btn icon-btn-danger" onClick={onDelete} title="حذف المهمة">
          🗑
        </button>
      </div>
    </li>
  )
}
