import { useState } from 'react'
import { Modal } from '../../../core/ui/Modal'
import { validateProjectInput } from '../validation'
import { PRIORITY_LABELS, PROJECT_STATUS_LABELS } from '../types'
import type { ProjectInput, ProjectRow } from '../types'

const EMPTY_INPUT: ProjectInput = {
  name: '',
  type: '',
  description: '',
  status: 'planning',
  priority: 'medium',
  deadline: null,
  live_url: null,
  repository_url: null,
  tech_stack: [],
  notes: '',
}

function toInput(project: ProjectRow): ProjectInput {
  return {
    name: project.name,
    type: project.type,
    description: project.description,
    status: project.status,
    priority: project.priority,
    deadline: project.deadline,
    live_url: project.live_url,
    repository_url: project.repository_url,
    tech_stack: project.tech_stack,
    notes: project.notes,
  }
}

export function ProjectForm({
  project,
  onSubmit,
  onClose,
}: {
  project?: ProjectRow
  onSubmit: (input: ProjectInput) => Promise<void>
  onClose: () => void
}) {
  const [input, setInput] = useState<ProjectInput>(project ? toInput(project) : EMPTY_INPUT)
  const [techStackText, setTechStackText] = useState(project ? project.tech_stack.join('، ') : '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const finalInput: ProjectInput = {
      ...input,
      tech_stack: techStackText
        .split(/[،,]/)
        .map((t) => t.trim())
        .filter(Boolean),
    }
    const result = validateProjectInput(finalInput)
    if (!result.valid) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    setSaving(true)
    setSubmitError(null)
    try {
      await onSubmit(finalInput)
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'تعذر حفظ المشروع.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={project ? 'تعديل المشروع' : 'مشروع جديد'} onClose={onClose} wide>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="project-name">اسم المشروع *</label>
          <input
            id="project-name"
            value={input.name}
            onChange={(e) => setInput({ ...input, name: e.target.value })}
            aria-invalid={Boolean(errors.name)}
            autoFocus
          />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>

        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="project-type">النوع</label>
            <input
              id="project-type"
              value={input.type}
              onChange={(e) => setInput({ ...input, type: e.target.value })}
              placeholder="مثال: تطبيق ويب"
            />
          </div>
          <div className="form-row">
            <label htmlFor="project-status">الحالة</label>
            <select
              id="project-status"
              value={input.status}
              onChange={(e) => setInput({ ...input, status: e.target.value as ProjectInput['status'] })}
            >
              {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="project-priority">الأولوية</label>
            <select
              id="project-priority"
              value={input.priority}
              onChange={(e) => setInput({ ...input, priority: e.target.value as ProjectInput['priority'] })}
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="project-deadline">الموعد النهائي</label>
            <input
              id="project-deadline"
              type="date"
              value={input.deadline ? input.deadline.slice(0, 10) : ''}
              onChange={(e) =>
                setInput({ ...input, deadline: e.target.value ? new Date(e.target.value).toISOString() : null })
              }
              aria-invalid={Boolean(errors.deadline)}
            />
            {errors.deadline && <span className="form-error">{errors.deadline}</span>}
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="project-description">الوصف</label>
          <textarea
            id="project-description"
            value={input.description}
            onChange={(e) => setInput({ ...input, description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="project-live-url">رابط المنتج / النسخة الحية</label>
            <input
              id="project-live-url"
              value={input.live_url ?? ''}
              onChange={(e) => setInput({ ...input, live_url: e.target.value || null })}
              placeholder="https://"
              aria-invalid={Boolean(errors.live_url)}
            />
            {errors.live_url && <span className="form-error">{errors.live_url}</span>}
          </div>
          <div className="form-row">
            <label htmlFor="project-repo-url">رابط المستودع (Git)</label>
            <input
              id="project-repo-url"
              value={input.repository_url ?? ''}
              onChange={(e) => setInput({ ...input, repository_url: e.target.value || null })}
              placeholder="https://"
              aria-invalid={Boolean(errors.repository_url)}
            />
            {errors.repository_url && <span className="form-error">{errors.repository_url}</span>}
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="project-tech">التقنيات المستخدمة (افصل بفاصلة)</label>
          <input
            id="project-tech"
            value={techStackText}
            onChange={(e) => setTechStackText(e.target.value)}
            placeholder="React، TypeScript، Node.js"
          />
        </div>

        <div className="form-row">
          <label htmlFor="project-notes">ملاحظات</label>
          <textarea
            id="project-notes"
            value={input.notes}
            onChange={(e) => setInput({ ...input, notes: e.target.value })}
            rows={2}
          />
        </div>

        {submitError && <p className="form-error form-error-global">{submitError}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'جارٍ الحفظ…' : project ? 'حفظ التعديلات' : 'إنشاء المشروع'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
