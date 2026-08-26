import { useState } from 'react'
import { Modal } from '../../../core/ui/Modal'
import { validateTransactionInput } from '../validation'
import { useProjects } from '../../projects/hooks'
import { useContacts } from '../../crm/hooks'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, TRANSACTION_TYPE_LABELS } from '../types'
import type { TransactionInput, TransactionRow } from '../types'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY_INPUT: TransactionInput = {
  type: 'income',
  amount: 0,
  category: '',
  description: '',
  date: todayIso(),
  project_id: null,
  contact_id: null,
}

function toInput(row: TransactionRow): TransactionInput {
  return {
    type: row.type,
    amount: row.amount,
    category: row.category,
    description: row.description,
    date: row.date.slice(0, 10),
    project_id: row.project_id,
    contact_id: row.contact_id,
  }
}

export function TransactionForm({
  transaction,
  onSubmit,
  onClose,
}: {
  transaction?: TransactionRow
  onSubmit: (input: TransactionInput) => Promise<void>
  onClose: () => void
}) {
  const [input, setInput] = useState<TransactionInput>(transaction ? toInput(transaction) : EMPTY_INPUT)
  const [amountText, setAmountText] = useState(transaction ? String(transaction.amount) : '0')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const projects = useProjects()
  const contacts = useContacts()

  const categoryOptions = input.type === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const finalInput: TransactionInput = {
      ...input,
      amount: Number(amountText),
      date: input.date ? new Date(input.date).toISOString() : '',
    }
    const result = validateTransactionInput(finalInput)
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
      setSubmitError(err instanceof Error ? err.message : 'تعذر حفظ الحركة المالية.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={transaction ? 'تعديل الحركة المالية' : 'حركة مالية جديدة'} onClose={onClose} wide>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="tx-type">النوع</label>
            <select
              id="tx-type"
              value={input.type}
              onChange={(e) => setInput({ ...input, type: e.target.value as TransactionInput['type'], category: '' })}
            >
              {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="tx-amount">المبلغ (ر.س) *</label>
            <input
              id="tx-amount"
              type="number"
              min="0"
              step="0.01"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              aria-invalid={Boolean(errors.amount)}
              autoFocus
            />
            {errors.amount && <span className="form-error">{errors.amount}</span>}
          </div>
          <div className="form-row">
            <label htmlFor="tx-date">التاريخ *</label>
            <input
              id="tx-date"
              type="date"
              value={input.date}
              onChange={(e) => setInput({ ...input, date: e.target.value })}
              aria-invalid={Boolean(errors.date)}
            />
            {errors.date && <span className="form-error">{errors.date}</span>}
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="tx-category">الفئة *</label>
          <input
            id="tx-category"
            list="tx-category-options"
            value={input.category}
            onChange={(e) => setInput({ ...input, category: e.target.value })}
            aria-invalid={Boolean(errors.category)}
          />
          <datalist id="tx-category-options">
            {categoryOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {errors.category && <span className="form-error">{errors.category}</span>}
        </div>

        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="tx-project">مشروع مرتبط (اختياري)</label>
            <select
              id="tx-project"
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
            <label htmlFor="tx-contact">جهة اتصال مرتبطة (اختياري)</label>
            <select
              id="tx-contact"
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
          <label htmlFor="tx-description">وصف</label>
          <textarea
            id="tx-description"
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
            {saving ? 'جارٍ الحفظ…' : transaction ? 'حفظ التعديلات' : 'إضافة الحركة'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
