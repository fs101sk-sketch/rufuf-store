import { useState } from 'react'
import { Modal } from '../../../core/ui/Modal'
import { validateContactInput } from '../validation'
import { CONTACT_TYPE_LABELS } from '../types'
import type { ContactInput, ContactRow } from '../types'

const EMPTY_INPUT: ContactInput = {
  name: '',
  company: '',
  email: '',
  phone: '',
  type: 'lead',
  notes: '',
}

function toInput(contact: ContactRow): ContactInput {
  return {
    name: contact.name,
    company: contact.company,
    email: contact.email,
    phone: contact.phone,
    type: contact.type,
    notes: contact.notes,
  }
}

export function ContactForm({
  contact,
  onSubmit,
  onClose,
}: {
  contact?: ContactRow
  onSubmit: (input: ContactInput) => Promise<void>
  onClose: () => void
}) {
  const [input, setInput] = useState<ContactInput>(contact ? toInput(contact) : EMPTY_INPUT)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = validateContactInput(input)
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
      setSubmitError(err instanceof Error ? err.message : 'تعذر حفظ جهة الاتصال.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={contact ? 'تعديل جهة الاتصال' : 'جهة اتصال جديدة'} onClose={onClose} wide>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="contact-name">الاسم *</label>
          <input
            id="contact-name"
            value={input.name}
            onChange={(e) => setInput({ ...input, name: e.target.value })}
            aria-invalid={Boolean(errors.name)}
            autoFocus
          />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>

        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="contact-company">الشركة</label>
            <input
              id="contact-company"
              value={input.company}
              onChange={(e) => setInput({ ...input, company: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label htmlFor="contact-type">النوع</label>
            <select
              id="contact-type"
              value={input.type}
              onChange={(e) => setInput({ ...input, type: e.target.value as ContactInput['type'] })}
            >
              {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="contact-email">البريد الإلكتروني</label>
            <input
              id="contact-email"
              value={input.email}
              onChange={(e) => setInput({ ...input, email: e.target.value })}
              placeholder="name@example.com"
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>
          <div className="form-row">
            <label htmlFor="contact-phone">الهاتف</label>
            <input
              id="contact-phone"
              value={input.phone}
              onChange={(e) => setInput({ ...input, phone: e.target.value })}
              placeholder="05xxxxxxxx"
            />
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="contact-notes">ملاحظات</label>
          <textarea
            id="contact-notes"
            value={input.notes}
            onChange={(e) => setInput({ ...input, notes: e.target.value })}
            rows={3}
          />
        </div>

        {submitError && <p className="form-error form-error-global">{submitError}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'جارٍ الحفظ…' : contact ? 'حفظ التعديلات' : 'إنشاء جهة الاتصال'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
