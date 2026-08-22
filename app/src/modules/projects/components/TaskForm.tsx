import { useState } from 'react'
import { Modal } from '../../../core/ui/Modal'
import { validateTaskInput } from '../validation'
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from '../types'
import type { TaskInput, TaskRow } from '../types'

const EMPTY_INPUT: TaskInput = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  due_date: null,
}

function toInput(task: TaskRow): TaskInput {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
  }
}

export function TaskForm({
  task,
  onSubmit,
  onClose,
}: {
  task?: TaskRow
  onSubmit: (input: TaskInput) => Promise<void>
  onClose: () => void
}) {
  const [input, setInput] = useState<TaskInput>(task ? toInput(task) : EMPTY_INPUT)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = validateTaskInput(input)
    if (!result.valid) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setSaving(true)
    setSubmitError(null)
    try {
      await onSubmit(input)
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'تعذر حفظ المهمة.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={task ? 'تعديل المهمة' : 'مهمة جديدة'} onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="task-title">العنوان *</label>
          <input
            id="task-title"
            value={input.title}
            onChange={(e) => setInput({ ...input, title: e.target.value })}
            aria-invalid={Boolean(errors.title)}
            autoFocus
          />
          {errors.title && <span className="form-error">{errors.title}</span>}
        </div>
        <div className="form-row">
          <label htmlFor="task-description">الوصف</label>
          <textarea
            id="task-description"
            value={input.description}
            onChange={(e) => setInput({ ...input, description: e.target.value })}
            rows={2}
          />
        </div>
        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="task-status">الحالة</label>
            <select
              id="task-status"
              value={input.status}
              onChange={(e) => setInput({ ...input, status: e.target.value as TaskInput['status'] })}
            >
              {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="task-priority">الأولوية</label>
            <select
              id="task-priority"
              value={input.priority}
              onChange={(e) => setInput({ ...input, priority: e.target.value as TaskInput['priority'] })}
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="task-due">تاريخ الاستحقاق</label>
            <input
              id="task-due"
              type="date"
              value={input.due_date ? input.due_date.slice(0, 10) : ''}
              onChange={(e) =>
                setInput({ ...input, due_date: e.target.value ? new Date(e.target.value).toISOString() : null })
              }
              aria-invalid={Boolean(errors.due_date)}
            />
            {errors.due_date && <span className="form-error">{errors.due_date}</span>}
          </div>
        </div>

        {submitError && <p className="form-error form-error-global">{submitError}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'جارٍ الحفظ…' : task ? 'حفظ التعديلات' : 'إضافة المهمة'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
