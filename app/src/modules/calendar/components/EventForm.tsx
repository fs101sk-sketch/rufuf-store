import { useState } from 'react'
import { Modal } from '../../../core/ui/Modal'
import { validateEventInput } from '../validation'
import { useProjects } from '../../projects/hooks'
import { useContacts } from '../../crm/hooks'
import type { EventInput, EventRow } from '../types'

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function defaultStart(): string {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d.toISOString()
}

function emptyInput(): EventInput {
  return {
    title: '',
    description: '',
    start_at: defaultStart(),
    end_at: null,
    all_day: false,
    location: '',
    project_id: null,
    contact_id: null,
  }
}

function toInput(event: EventRow): EventInput {
  return {
    title: event.title,
    description: event.description,
    start_at: event.start_at,
    end_at: event.end_at,
    all_day: event.all_day,
    location: event.location,
    project_id: event.project_id,
    contact_id: event.contact_id,
  }
}

export function EventForm({
  event,
  initialDate,
  onSubmit,
  onClose,
}: {
  event?: EventRow
  initialDate?: Date
  onSubmit: (input: EventInput) => Promise<void>
  onClose: () => void
}) {
  const [input, setInput] = useState<EventInput>(() => {
    if (event) return toInput(event)
    if (initialDate) {
      const d = new Date(initialDate)
      d.setHours(new Date().getHours() + 1, 0, 0, 0)
      return { ...emptyInput(), start_at: d.toISOString() }
    }
    return emptyInput()
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const projects = useProjects()
  const contacts = useContacts()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = validateEventInput(input)
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
      setSubmitError(err instanceof Error ? err.message : 'تعذر حفظ الحدث.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={event ? 'تعديل الحدث' : 'حدث جديد'} onClose={onClose} wide>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="event-title">العنوان *</label>
          <input
            id="event-title"
            value={input.title}
            onChange={(e) => setInput({ ...input, title: e.target.value })}
            aria-invalid={Boolean(errors.title)}
            autoFocus
          />
          {errors.title && <span className="form-error">{errors.title}</span>}
        </div>

        <div className="form-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={input.all_day}
              onChange={(e) => setInput({ ...input, all_day: e.target.checked })}
            />
            طوال اليوم
          </label>
        </div>

        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="event-start">
              {input.all_day ? 'التاريخ *' : 'يبدأ في *'}
            </label>
            <input
              id="event-start"
              type={input.all_day ? 'date' : 'datetime-local'}
              value={input.all_day ? input.start_at.slice(0, 10) : toLocalInputValue(input.start_at)}
              onChange={(e) =>
                setInput({
                  ...input,
                  start_at: e.target.value ? new Date(e.target.value).toISOString() : input.start_at,
                })
              }
              aria-invalid={Boolean(errors.start_at)}
            />
            {errors.start_at && <span className="form-error">{errors.start_at}</span>}
          </div>
          {!input.all_day && (
            <div className="form-row">
              <label htmlFor="event-end">ينتهي في</label>
              <input
                id="event-end"
                type="datetime-local"
                value={input.end_at ? toLocalInputValue(input.end_at) : ''}
                onChange={(e) =>
                  setInput({ ...input, end_at: e.target.value ? new Date(e.target.value).toISOString() : null })
                }
                aria-invalid={Boolean(errors.end_at)}
              />
              {errors.end_at && <span className="form-error">{errors.end_at}</span>}
            </div>
          )}
          <div className="form-row">
            <label htmlFor="event-location">الموقع</label>
            <input
              id="event-location"
              value={input.location}
              onChange={(e) => setInput({ ...input, location: e.target.value })}
              placeholder="مكتب، رابط اجتماع…"
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="event-project">مشروع مرتبط (اختياري)</label>
            <select
              id="event-project"
              value={input.project_id ?? ''}
              onChange={(e) => setInput({ ...input, project_id: e.target.value || null })}
            >
              <option value="">بلا</option>
              {(projects ?? [])
                .filter((p) => !p.deleted_at)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="event-contact">جهة اتصال مرتبطة (اختياري)</label>
            <select
              id="event-contact"
              value={input.contact_id ?? ''}
              onChange={(e) => setInput({ ...input, contact_id: e.target.value || null })}
            >
              <option value="">بلا</option>
              {(contacts ?? [])
                .filter((c) => !c.deleted_at)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="event-description">ملاحظات</label>
          <textarea
            id="event-description"
            value={input.description}
            onChange={(e) => setInput({ ...input, description: e.target.value })}
            rows={2}
          />
        </div>

        {submitError && <p className="form-error form-error-global">{submitError}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'جارٍ الحفظ…' : event ? 'حفظ التعديلات' : 'إضافة الحدث'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
