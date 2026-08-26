import type { TransactionInput } from './types'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export function validateTransactionInput(input: TransactionInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (!Number.isFinite(input.amount)) {
    errors.amount = 'المبلغ غير صالح.'
  } else if (input.amount <= 0) {
    errors.amount = 'المبلغ يجب أن يكون أكبر من صفر.'
  }

  if (!input.category.trim()) {
    errors.category = 'الفئة مطلوبة.'
  }

  if (!input.date) {
    errors.date = 'التاريخ مطلوب.'
  } else {
    const d = new Date(input.date)
    if (Number.isNaN(d.getTime())) {
      errors.date = 'التاريخ غير صالح.'
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
