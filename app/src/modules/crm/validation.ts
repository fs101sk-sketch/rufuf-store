import type { ContactInput, DealInput } from './types'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function validateContactInput(input: ContactInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (!input.name.trim()) {
    errors.name = 'الاسم مطلوب.'
  } else if (input.name.trim().length > 200) {
    errors.name = 'الاسم طويل جدًا (الحد الأقصى 200 حرف).'
  }

  if (input.email.trim() && !isValidEmail(input.email.trim())) {
    errors.email = 'البريد الإلكتروني غير صالح.'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateDealInput(input: DealInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (!input.title.trim()) {
    errors.title = 'عنوان الصفقة مطلوب.'
  } else if (input.title.trim().length > 300) {
    errors.title = 'العنوان طويل جدًا (الحد الأقصى 300 حرف).'
  }

  if (!Number.isFinite(input.value)) {
    errors.value = 'القيمة غير صالحة.'
  } else if (input.value < 0) {
    errors.value = 'القيمة يجب ألا تكون سالبة.'
  }

  if (input.expected_close_date) {
    const d = new Date(input.expected_close_date)
    if (Number.isNaN(d.getTime())) {
      errors.expected_close_date = 'تاريخ الإغلاق المتوقع غير صالح.'
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
