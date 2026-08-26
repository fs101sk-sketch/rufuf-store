import type { EventInput } from './types'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export function validateEventInput(input: EventInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (!input.title.trim()) {
    errors.title = 'عنوان الحدث مطلوب.'
  } else if (input.title.trim().length > 200) {
    errors.title = 'العنوان طويل جدًا (الحد الأقصى 200 حرف).'
  }

  if (!input.start_at) {
    errors.start_at = 'تاريخ البدء مطلوب.'
  } else if (Number.isNaN(new Date(input.start_at).getTime())) {
    errors.start_at = 'تاريخ البدء غير صالح.'
  }

  if (input.end_at) {
    const end = new Date(input.end_at)
    if (Number.isNaN(end.getTime())) {
      errors.end_at = 'تاريخ الانتهاء غير صالح.'
    } else if (!errors.start_at && end.getTime() < new Date(input.start_at).getTime()) {
      errors.end_at = 'تاريخ الانتهاء يجب ألا يسبق تاريخ البدء.'
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
