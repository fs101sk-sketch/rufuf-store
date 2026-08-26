import { useState } from 'react'
import { Modal } from '../../../core/ui/Modal'
import { validateDealInput } from '../validation'
import { DEAL_STAGE_LABELS, DEAL_STAGE_ORDER } from '../types'
import type { DealInput, DealRow } from '../types'

const EMPTY_INPUT: DealInput = {
  title: '',
  value: 0,
  stage: 'new',
  expected_close_date: null,
  notes: '',
}

function toInput(deal: DealRow): DealInput {
  return {
    title: deal.title,
    value: deal.value,
    stage: deal.stage,
    expected_close_date: deal.expected_close_date,
    notes: deal.notes,
  }
}

export function DealForm({
  deal,
  onSubmit,
  onClose,
}: {
  deal?: DealRow
  onSubmit: (input: DealInput) => Promise<void>
  onClose: () => void
}) {
  const [input, setInput] = useState<DealInput>(deal ? toInput(deal) : EMPTY_INPUT)
  const [valueText, setValueText] = useState(deal ? String(deal.value) : '0')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const finalInput: DealInput = { ...input, value: Number(valueText) }
    const result = validateDealInput(finalInput)
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
      setSubmitError(err instanceof Error ? err.message : 'تعذر حفظ الصفقة.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={deal ? 'تعديل الصفقة' : 'صفقة جديدة'} onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="deal-title">عنوان الصفقة *</label>
          <input
            id="deal-title"
            value={input.title}
            onChange={(e) => setInput({ ...input, title: e.target.value })}
            aria-invalid={Boolean(errors.title)}
            autoFocus
          />
          {errors.title && <span className="form-error">{errors.title}</span>}
        </div>

        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="deal-value">القيمة (ر.س)</label>
            <input
              id="deal-value"
              type="number"
              min="0"
              step="1"
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
              aria-invalid={Boolean(errors.value)}
            />
            {errors.value && <span className="form-error">{errors.value}</span>}
          </div>
          <div className="form-row">
            <label htmlFor="deal-stage">المرحلة</label>
            <select
              id="deal-stage"
              value={input.stage}
              onChange={(e) => setInput({ ...input, stage: e.target.value as DealInput['stage'] })}
            >
              {DEAL_STAGE_ORDER.map((stage) => (
                <option key={stage} value={stage}>
                  {DEAL_STAGE_LABELS[stage]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="deal-close-date">تاريخ الإغلاق المتوقع</label>
            <input
              id="deal-close-date"
              type="date"
              value={input.expected_close_date ? input.expected_close_date.slice(0, 10) : ''}
              onChange={(e) =>
                setInput({
                  ...input,
                  expected_close_date: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
              aria-invalid={Boolean(errors.expected_close_date)}
            />
            {errors.expected_close_date && <span className="form-error">{errors.expected_close_date}</span>}
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="deal-notes">ملاحظات</label>
          <textarea
            id="deal-notes"
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
            {saving ? 'جارٍ الحفظ…' : deal ? 'حفظ التعديلات' : 'إضافة الصفقة'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
